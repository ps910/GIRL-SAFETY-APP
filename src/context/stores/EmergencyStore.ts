import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundLocationService from '../../services/BackgroundLocationService';
import LiveLocationSharingService from '../../services/LiveLocationSharingService';
import NotificationService from '../../services/NotificationService';
import OfflineLocationService from '../../services/OfflineLocationService';
import SafetyAIService from '../../services/SafetyAIService';
import Logger from '../../utils/logger';
import NetworkMonitor from '../../services/NetworkMonitor';
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
    const entry: SOSHistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      location: currentLocation,
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

    const alertMessage = liveShareUrl
      ? `${sosMessage}\n\nLive tracking link: ${liveShareUrl}`
      : sosMessage;

    setSosDeliveryStatus({
      state: 'sending',
      message: `Alerting ${emergencyContacts.length} guardian${emergencyContacts.length === 1 ? '' : 's'}...`,
      contactCount: emergencyContacts.length,
      updatedAt: new Date().toISOString(),
    });

    const deliveryLocation = currentLocation || undefined;

    if (!isOnline) {
      try {
        await sendSOSToContacts(emergencyContacts, alertMessage, deliveryLocation);
        setSosDeliveryStatus({
          state: 'sent',
          message: 'Offline Mode: Alerts sent to guardians via SMS.',
          contactCount: emergencyContacts.length,
          method: 'sms_fallback',
          updatedAt: new Date().toISOString(),
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
