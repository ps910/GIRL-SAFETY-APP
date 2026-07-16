import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundLocationService from '../../services/BackgroundLocationService';
import LiveLocationSharingService from '../../services/LiveLocationSharingService';
import NotificationService from '../../services/NotificationService';
import OfflineLocationService from '../../services/OfflineLocationService';
import SafetyAIService from '../../services/SafetyAIService';
import SOSPipelineService from '../../services/SOSPipelineService';
import Logger from '../../utils/logger';
import {
  startLiveLocationTracking,
  stopLiveLocationTracking,
  sendLiveLocationUpdate,
  makePhoneCall,
} from '../../utils/helpers';
import type { LocationData, EmergencyContact, EmergencySettings } from '../../types';
import type { SOSPipelineResult } from '../../services/SOSPipelineService';

export const STORAGE_KEYS = {
  SOS_HISTORY: '@girl_safety_sos_history',
} as const;

export interface SOSHistoryEntry {
  id: string;
  timestamp: string;
  location: LocationData | null;
  type: string;
  pipelineResult?: SOSPipelineResult;
}

export interface SOSDeliveryStatus {
  state: 'idle' | 'sending' | 'sent' | 'unconfirmed' | 'failed';
  message: string;
  contactCount: number;
  method?: string;
  updatedAt?: string;
  sosId?: string;
  auditLogLength?: number;
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

    // ── 1. Background location SOS mode ──────────────────────
    try {
      await BackgroundLocationService.activateSOSMode();
      Logger.log('[EmergencyStore] Background location SOS mode activated');
    } catch (e) {
      Logger.error('[EmergencyStore] Background location SOS mode error:', e);
    }

    // ── 2. Start live sharing session ────────────────────────
    let liveShareUrl: string | undefined;
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

    // ── 3. PIPELINE: Reliable delivery (retry + SMS fallback) ──
    setSosDeliveryStatus({
      state: 'sending',
      message: `Alerting ${emergencyContacts.length} guardian${emergencyContacts.length === 1 ? '' : 's'}...`,
      contactCount: emergencyContacts.length,
      updatedAt: new Date().toISOString(),
    });

    let pipelineResult: SOSPipelineResult | null = null;
    try {
      pipelineResult = await SOSPipelineService.execute(
        emergencyContacts,
        sosMessage,
        currentLocation,
        liveShareUrl,
      );

      // Map pipeline result → delivery status
      const statusMap: Record<string, SOSDeliveryStatus> = {
        DELIVERED: {
          state: 'sent',
          message: `SOS ${pipelineResult.deliveryMethod === 'push' ? 'push' : pipelineResult.deliveryMethod === 'sms' ? 'SMS' : 'alerts'} delivered to ${pipelineResult.contactsReached}/${pipelineResult.totalContacts} guardians.`,
          contactCount: pipelineResult.totalContacts,
          method: pipelineResult.deliveryMethod,
          updatedAt: new Date().toISOString(),
          sosId: pipelineResult.sosId,
          auditLogLength: pipelineResult.auditLog.length,
        },
        FALLBACK_QUEUED: {
          state: 'unconfirmed',
          message: 'Device offline. SOS queued — will auto-send when connection resumes. Call emergency services now.',
          contactCount: pipelineResult.totalContacts,
          method: 'queued',
          updatedAt: new Date().toISOString(),
          sosId: pipelineResult.sosId,
        },
        FAILED: {
          state: 'failed',
          message: `SOS delivery failed after ${pipelineResult.pushAttempts} push attempt(s) and SMS fallback. Call emergency services directly.`,
          contactCount: pipelineResult.totalContacts,
          method: 'none',
          updatedAt: new Date().toISOString(),
          sosId: pipelineResult.sosId,
          auditLogLength: pipelineResult.auditLog.length,
        },
      };

      const nextStatus = statusMap[pipelineResult.finalStage] || statusMap.FAILED!;
      setSosDeliveryStatus(nextStatus);

      if (nextStatus.state === 'failed') {
        Alert.alert(
          'SOS Alerts Not Confirmed',
          `Emergency mode is active, but SafeHer could not confirm contact delivery after ${pipelineResult.pushAttempts} retries. Call emergency services directly now.`,
          [{ text: 'OK', style: 'destructive' }],
        );
      }
    } catch (e) {
      Logger.error('[EmergencyStore] Pipeline execution error:', e);
      setSosDeliveryStatus({
        state: 'failed',
        message: 'Guardian alert pipeline failed. Call emergency services now.',
        contactCount: emergencyContacts.length,
        method: 'error',
        updatedAt: new Date().toISOString(),
      });
    }

    // ── 4. Record SOS history ────────────────────────────────
    const entry: SOSHistoryEntry = {
      id: pipelineResult?.sosId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      location: currentLocation,
      type: 'SOS',
      pipelineResult: pipelineResult || undefined,
    };
    setSOSHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 50);
      AsyncStorage.setItem(STORAGE_KEYS.SOS_HISTORY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // ── 5. Local notification ────────────────────────────────
    try {
      await NotificationService.sendSOSActiveNotification(
        currentLocation ? { coords: currentLocation.coords } : undefined,
      );
    } catch (e) {
      Logger.error('[EmergencyStore] Push notification error:', e);
    }

    // ── 6. Start live location tracking ──────────────────────
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

    // ── 7. Nearby user broadcast ─────────────────────────────
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

    // ── 8. AI services (siren, recording, photo) ─────────────
    try {
      const aiResult = await SafetyAIService.activateSOSServices(settings);
      if (aiResult.siren) setSirenActive(true);
      if (aiResult.recording) setIsRecording(true);
    } catch (e) {
      Logger.error('[EmergencyStore] AI services activation error:', e);
    }

    // ── 9. Auto-call police ──────────────────────────────────
    if (settings.autoCallPolice) {
      try {
        setTimeout(() => makePhoneCall('112'), 3000);
      } catch (e) {
        Logger.error('[EmergencyStore] Auto call police error:', e);
      }
    }

    // ── 10. Periodic location updates to guardians ───────────
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

    // Mark the SOS pipeline as resolved (prevents background re-notification)
    try {
      await SOSPipelineService.resolveActiveSOS();
    } catch (e) {
      Logger.error('[EmergencyStore] Pipeline resolve error:', e);
    }

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
