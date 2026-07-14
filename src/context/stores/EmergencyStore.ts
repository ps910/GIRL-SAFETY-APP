import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import BackgroundLocationService from '../../services/BackgroundLocationService';
import LiveLocationSharingService from '../../services/LiveLocationSharingService';
import NotificationService from '../../services/NotificationService';
import OfflineLocationService from '../../services/OfflineLocationService';
import SafetyAIService from '../../services/SafetyAIService';
import Logger from '../../utils/logger';
import NetworkMonitor from '../../services/NetworkMonitor';
import { AlertsDB, AlertEventsDB } from '../../services/Database';
import {
  startLiveLocationTracking,
  stopLiveLocationTracking,
  sendLiveLocationUpdate,
  sendSOSToContacts,
  makePhoneCall,
} from '../../utils/helpers';
import type { LocationData, EmergencyContact, EmergencySettings } from '../../types';

export const STORAGE_KEYS = {
  SOS_HISTORY: '@girl_safety_sos_history',
} as const;

export interface SOSHistoryEntry {
  id: string;
  timestamp: string;
  location: LocationData | null;
  type: string;
}

export interface SOSDeliveryStatus {
  state: 'idle' | 'sending' | 'sent' | 'unconfirmed' | 'failed';
  message: string;
  contactCount: number;
  method?: string;
  updatedAt?: string;
}

const INITIAL_SOS_DELIVERY_STATUS: SOSDeliveryStatus = {
  state: 'idle',
  message: 'No SOS alert in progress.',
  contactCount: 0,
};

export function useEmergencyStore() {
  const [isSOSActive, setIsSOSActive] = useState<boolean>(false);
  const [sosHistory, setSOSHistory] = useState<SOSHistoryEntry[]>([]);
  const [liveLocation, setLiveLocation] = useState<LocationData | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState<boolean>(false);
  const [liveShareSession, setLiveShareSession] = useState<any>(null);
  const [isLiveSharing, setIsLiveSharing] = useState<boolean>(false);
  const [sosDeliveryStatus, setSosDeliveryStatus] = useState<SOSDeliveryStatus>(INITIAL_SOS_DELIVERY_STATUS);

  const lastSOSTriggerRef = useRef<number>(0);
  const SOS_COOLDOWN_MS = 60000;

  const locationWatcherRef = useRef<any>(null);
  const locationUpdateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLocationSentRef = useRef<LocationData | null>(null);

  const loadEmergencyHistory = useCallback(async () => {
    try {
      const historyData = await AsyncStorage.getItem(STORAGE_KEYS.SOS_HISTORY);
      if (historyData) {
        setSOSHistory(JSON.parse(historyData));
      }
    } catch (error) {
      Logger.error('[EmergencyStore] Error loading history:', error);
    }
  }, []);

  const triggerSOS = useCallback(async (
    currentLocation: LocationData | null,
    setCurrentLocation: (loc: LocationData | null) => void,
    emergencyContacts: EmergencyContact[],
    sosMessage: string,
    settings: EmergencySettings,
    setSirenActive: (active: boolean) => void,
    setIsRecording: (recording: boolean) => void
  ): Promise<void> => {
    const now = Date.now();
    if (isSOSActive) {
      Logger.log('[EmergencyStore] Already active — ignoring trigger');
      return;
    }
    if (now - lastSOSTriggerRef.current < SOS_COOLDOWN_MS) {
      const remaining = Math.ceil((SOS_COOLDOWN_MS - (now - lastSOSTriggerRef.current)) / 1000);
      Alert.alert('SOS Cooldown', `Please wait ${remaining}s before triggering SOS again.`);
      return;
    }

    setIsSOSActive(true);

    // Fetch high-accuracy location with timeout fallback
    let finalLocation = currentLocation;
    try {
      const freshLocation = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Location timeout')), 4500))
      ]) as any;
      if (freshLocation?.coords) {
        finalLocation = {
          coords: {
            latitude: freshLocation.coords.latitude,
            longitude: freshLocation.coords.longitude,
            altitude: freshLocation.coords.altitude,
            accuracy: freshLocation.coords.accuracy,
            altitudeAccuracy: freshLocation.coords.altitudeAccuracy,
            heading: freshLocation.coords.heading,
            speed: freshLocation.coords.speed,
          },
          timestamp: freshLocation.timestamp,
        };
        setCurrentLocation(finalLocation);
      }
    } catch (e) {
      Logger.log('[EmergencyStore] Position grab timeout/error — fallback to last known');
      if (!finalLocation) {
        const lastKnown = await OfflineLocationService.getLastKnown();
        if (lastKnown) {
          finalLocation = {
            coords: {
              latitude: lastKnown.latitude,
              longitude: lastKnown.longitude,
              accuracy: lastKnown.accuracy,
              altitude: null,
              heading: null,
              speed: null,
            },
            timestamp: lastKnown.timestamp || Date.now(),
          };
        }
      }
    }

    const alertId = Date.now().toString();
    const shareToken = 'token_' + Math.random().toString(36).substr(2, 9);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const entry: SOSHistoryEntry = {
      id: alertId,
      timestamp: new Date().toISOString(),
      location: finalLocation,
      type: 'SOS',
    };
    setSOSHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 50);
      AsyncStorage.setItem(STORAGE_KEYS.SOS_HISTORY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    try {
      await BackgroundLocationService.activateSOSMode();
      Logger.log('[EmergencyStore] Background location SOS mode activated');
    } catch (e) {
      Logger.error('[EmergencyStore] Background location SOS mode error:', e);
    }

    // Write alert event and record locally
    try {
      await AlertsDB.add({
        id: alertId,
        status: 'pending',
        deliveryAttempts: 1,
        shareToken,
        expiresAt,
        acknowledged: false,
        respondedTo: false,
        latitude: finalLocation?.coords?.latitude,
        longitude: finalLocation?.coords?.longitude,
        accuracy: finalLocation?.coords?.accuracy,
      } as any);

      await AlertEventsDB.add({
        alertId,
        event: 'created',
        timestamp: new Date().toISOString(),
        details: 'SOS alert initiated via trigger',
      });
    } catch (e) {
      Logger.error('[EmergencyStore] Local DB insert failed:', e);
    }

    const isOnline = NetworkMonitor.isOnline();
    let liveShareUrl: string | undefined;

    if (isOnline) {
      try {
        if (settings.liveLocationSharing) {
          const session = await LiveLocationSharingService.startSession({
            userName: 'SafeHer User',
            ttlMinutes: 60,
            purpose: 'SOS Emergency',
          });
          if (session?.success && session.shareUrl) {
            setLiveShareSession(session);
            setIsLiveSharing(true);
            liveShareUrl = session.shareUrl;
            Logger.log('[EmergencyStore] Live sharing started:', session.shareUrl);
          }
        }
      } catch (e) {
        Logger.error('[EmergencyStore] Live sharing error:', e);
      }
    }

    const trackingUrl = `https://safeher-dashboard.vercel.app/alert/${shareToken}`;
    const alertMessage = liveShareUrl
      ? `${sosMessage}\n\nLive tracking link: ${liveShareUrl}`
      : `${sosMessage}\n\nLive tracking link: ${trackingUrl}`;

    setSosDeliveryStatus({
      state: 'sending',
      message: `Alerting ${emergencyContacts.length} guardian${emergencyContacts.length === 1 ? '' : 's'}...`,
      contactCount: emergencyContacts.length,
      updatedAt: new Date().toISOString(),
    });

    // Step 6: Native Share sheet pre-fill
    try {
      await Share.share({
        message: alertMessage,
        url: liveShareUrl || trackingUrl,
        title: 'SafeHer SOS Alert',
      });
    } catch (e) {
      Logger.error('[EmergencyStore] Native share sheet launch error:', e);
    }

    const deliveryLocation = finalLocation || undefined;

    if (!isOnline) {
      try {
        // Optimistic Outbox queueing for background retry
        const outboxData = await AsyncStorage.getItem('@safeher_sos_outbox');
        const outboxList = outboxData ? JSON.parse(outboxData) : [];
        outboxList.push({
          id: alertId,
          location: finalLocation,
          message: sosMessage,
          contacts: emergencyContacts,
          attempts: 1,
          status: 'pending',
        });
        await AsyncStorage.setItem('@safeher_sos_outbox', JSON.stringify(outboxList));

        await sendSOSToContacts(emergencyContacts, alertMessage, deliveryLocation);
        setSosDeliveryStatus({
          state: 'sent',
          message: 'Offline Mode: Alerts sent to guardians via SMS.',
          contactCount: emergencyContacts.length,
          method: 'sms_fallback',
          updatedAt: new Date().toISOString(),
        });

        await AlertEventsDB.add({
          alertId,
          event: 'contact_notified',
          timestamp: new Date().toISOString(),
          details: 'SOS fallback SMS launched',
        });
      } catch (e) {
        Logger.error('[EmergencyStore] Offline SMS trigger error:', e);
        setSosDeliveryStatus({
          state: 'failed',
          message: 'Alert delivery failed. Call 112 immediately.',
          contactCount: emergencyContacts.length,
          method: 'sms_failed',
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      try {
        const [smsAttempt, pushAttempt] = await Promise.allSettled([
          sendSOSToContacts(emergencyContacts, alertMessage, deliveryLocation),
          settings.pushNotifications
            ? NotificationService.sendSOSPushToContacts(emergencyContacts, alertMessage, deliveryLocation)
            : Promise.resolve({ success: false, sent: 0, total: emergencyContacts.length, reason: 'disabled' }),
        ]);

        const smsResult = smsAttempt.status === 'fulfilled' ? smsAttempt.value : null;
        const pushResult = pushAttempt.status === 'fulfilled' ? pushAttempt.value : null;
        const confirmedSms = smsResult?.method === 'sms' && smsResult?.result === 'sent';
        const attemptedSms =
          !!smsResult?.success || smsResult?.method === 'sms_intent' || smsResult?.method === 'individual_sms';
        const attemptedPush = !!(pushResult?.success && (pushResult.sent || 0) > 0);
        const nextDeliveryStatus: SOSDeliveryStatus = confirmedSms || attemptedPush
          ? {
              state: 'sent',
              message: confirmedSms
                ? `SMS confirmed for ${smsResult?.contactCount || emergencyContacts.length} guardian${emergencyContacts.length === 1 ? '' : 's'}.`
                : `Push alert sent to ${pushResult?.sent || 0} guardian${(pushResult?.sent || 0) === 1 ? '' : 's'}.`,
              contactCount: emergencyContacts.length,
              method: confirmedSms ? smsResult?.method : 'push',
              updatedAt: new Date().toISOString(),
            }
          : attemptedSms
            ? {
                state: 'unconfirmed',
                message: 'Guardian alert was opened, but delivery is not confirmed. Call emergency services if unsafe.',
                contactCount: emergencyContacts.length,
                method: smsResult?.method,
                updatedAt: new Date().toISOString(),
              }
            : {
                state: 'failed',
                message: 'No guardian delivery was confirmed. Call emergency services now.',
                contactCount: emergencyContacts.length,
                method: smsResult?.method || pushResult?.reason || 'none',
                updatedAt: new Date().toISOString(),
              };

        setSosDeliveryStatus(nextDeliveryStatus);

        // Update DB alert status
        await AlertsDB.add({
          id: alertId,
          status: nextDeliveryStatus.state === 'failed' ? 'failed' : 'delivered',
          acknowledged: false,
          respondedTo: false,
        } as any);

        await AlertEventsDB.add({
          alertId,
          event: nextDeliveryStatus.state === 'failed' ? 'failed' : 'contact_notified',
          timestamp: new Date().toISOString(),
          details: `SOS alert delivered status: ${nextDeliveryStatus.message}`,
        });

        if (nextDeliveryStatus.state === 'failed') {
          Alert.alert(
            'SOS Alerts Not Confirmed',
            'Emergency mode is active, but SafeHer could not confirm contact delivery. Call emergency services directly now.',
            [{ text: 'OK', style: 'destructive' }],
          );
        }
      } catch (e) {
        Logger.error('[EmergencyStore] Contact delivery error:', e);
        setSosDeliveryStatus({
          state: 'failed',
          message: 'Guardian alert failed. Call emergency services now.',
          contactCount: emergencyContacts.length,
          method: 'error',
          updatedAt: new Date().toISOString(),
        });
      }

      try {
        await NotificationService.sendSOSActiveNotification(deliveryLocation);
      } catch (e) {
        Logger.error('[EmergencyStore] Push notification error:', e);
      }
    }

    try {
      const subscription = await startLiveLocationTracking((newLocation: LocationData) => {
        setLiveLocation(newLocation);
        setCurrentLocation(newLocation);
        lastLocationSentRef.current = newLocation;
        if (LiveLocationSharingService.isSharing()) {
          LiveLocationSharingService.updateLocation(newLocation).catch(() => {});
        }
      });
      if (subscription) {
        locationWatcherRef.current = subscription;
        setIsLiveTracking(true);
        Logger.log('[EmergencyStore] Live location tracking started');
      }
    } catch (e) {
      Logger.error('[EmergencyStore] Failed to start live tracking:', e);
    }

    try {
      const sosResult = await OfflineLocationService.shareSOSLocation(
        currentLocation as any, emergencyContacts, sosMessage
      );
      if (sosResult?.alertId) {
        await OfflineLocationService.startLiveSOSBroadcast(sosResult.alertId);
      }
    } catch (e) {
      Logger.error('[EmergencyStore] Failed to start nearby broadcast:', e);
    }

    try {
      const aiResult = await SafetyAIService.activateSOSServices(settings);
      if (aiResult.siren) setSirenActive(true);
      if (aiResult.recording) setIsRecording(true);
    } catch (e) {
      Logger.error('[EmergencyStore] AI services activation error:', e);
    }

    if (settings.autoCallPolice) {
      try {
        setTimeout(() => makePhoneCall('112'), 3000);
      } catch (e) {
        Logger.error('[EmergencyStore] Auto call police error:', e);
      }
    }

    locationUpdateTimerRef.current = setInterval(async () => {
      if (lastLocationSentRef.current && emergencyContacts.length > 0) {
        await sendLiveLocationUpdate(emergencyContacts, lastLocationSentRef.current);
      }
    }, 2 * 60 * 1000);

    lastSOSTriggerRef.current = Date.now();
  }, [isSOSActive, sosHistory]);

  const processSosOutbox = useCallback(async () => {
    if (!NetworkMonitor.isOnline()) return;
    try {
      const outboxData = await AsyncStorage.getItem('@safeher_sos_outbox');
      if (!outboxData) return;
      const outboxList = JSON.parse(outboxData);
      if (outboxList.length === 0) return;

      const remainingItems: any[] = [];
      for (const item of outboxList) {
        try {
          const trackingUrl = `https://safeher-dashboard.vercel.app/alert/${item.id}`;
          const alertMessage = `${item.message}\n\nLive tracking link: ${trackingUrl}`;
          await sendSOSToContacts(item.contacts, alertMessage, item.location);
          
          await AlertsDB.add({
            id: item.id,
            status: 'delivered',
            acknowledged: false,
            respondedTo: false,
          } as any);

          await AlertEventsDB.add({
            alertId: item.id,
            event: 'contact_notified',
            timestamp: new Date().toISOString(),
            details: 'Outbox message delivered successfully via retry',
          });
        } catch (e) {
          item.attempts += 1;
          if (item.attempts < 5) {
            remainingItems.push(item);
          } else {
            await AlertEventsDB.add({
              alertId: item.id,
              event: 'failed',
              timestamp: new Date().toISOString(),
              details: `Outbox retry failed: max attempts reached: ${e}`,
            });
          }
        }
      }
      await AsyncStorage.setItem('@safeher_sos_outbox', JSON.stringify(remainingItems));
    } catch (e) {
      Logger.error('[EmergencyStore] Outbox processing error:', e);
    }
  }, []);

  useEffect(() => {
    const outboxInterval = setInterval(() => {
      processSosOutbox();
    }, 30000);
    return () => clearInterval(outboxInterval);
  }, [processSosOutbox]);

  const cancelSOS = useCallback(async (
    settings: EmergencySettings,
    setSirenActive: (active: boolean) => void,
    setIsRecording: (recording: boolean) => void
  ): Promise<void> => {
    setIsSOSActive(false);
    setSirenActive(false);
    setIsRecording(false);
    setSosDeliveryStatus(INITIAL_SOS_DELIVERY_STATUS);
    lastSOSTriggerRef.current = 0;

    try {
      await SafetyAIService.deactivateSOSServices();
    } catch (e) {
      Logger.error('[EmergencyStore] AI deactivation error:', e);
    }

    try {
      await BackgroundLocationService.deactivateSOSMode();
    } catch (e) {
      Logger.error('[EmergencyStore] Background location deactivation error:', e);
    }

    try {
      if (isLiveSharing) {
        await LiveLocationSharingService.endSession();
        setLiveShareSession(null);
        setIsLiveSharing(false);
      }
    } catch (e) {
      Logger.error('[EmergencyStore] Live sharing stop error:', e);
    }

    if (locationWatcherRef.current) {
      stopLiveLocationTracking(locationWatcherRef.current);
      locationWatcherRef.current = null;
      setIsLiveTracking(false);
    }

    OfflineLocationService.stopLiveSOSBroadcast();

    if (locationUpdateTimerRef.current) {
      clearInterval(locationUpdateTimerRef.current);
      locationUpdateTimerRef.current = null;
    }

    lastLocationSentRef.current = null;
    setLiveLocation(null);

    if (settings.shakeToSOS) {
      SafetyAIService.startShakeDetection(() => triggerSOS(
        null, () => {}, [], '', settings, setSirenActive, setIsRecording
      ));
    }
    if (settings.screamDetection) {
      SafetyAIService.startScreamDetection(() => {}, -20);
    }
  }, [isLiveSharing, triggerSOS]);

  return {
    isSOSActive,
    sosHistory,
    liveLocation,
    isLiveTracking,
    liveShareSession,
    isLiveSharing,
    sosDeliveryStatus,
    loadEmergencyHistory,
    triggerSOS,
    cancelSOS,
  };
}
