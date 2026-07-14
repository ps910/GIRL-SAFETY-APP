/**
 * SafeHer Emergency Context (Redesigned)
 * ═══════════════════════════════════════════════════════════
 * Refactored to delegate business logic to clean domain stores:
 * SettingsStore, GuardianStore, JourneyStore, EmergencyStore.
 * Maintains 100% backward compatibility with all 17 screens.
 */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import SafetyAIService from '../services/SafetyAIService';
import BackgroundLocationService from '../services/BackgroundLocationService';
import NotificationService from '../services/NotificationService';
import LiveLocationSharingService from '../services/LiveLocationSharingService';
import EncryptedStorageService from '../services/EncryptedStorageService';
import Logger from '../utils/logger';

import { useSettingsStore } from './stores/SettingsStore';
import { useGuardianStore } from './stores/GuardianStore';
import { useJourneyStore } from './stores/JourneyStore';
import { useEmergencyStore } from './stores/EmergencyStore';

import type { EmergencySettings, EmergencyContact, LocationData } from '../types';
import type { SOSHistoryEntry, SOSDeliveryStatus } from './stores/EmergencyStore';
import type { Breadcrumb, JourneyStats, ActiveJourney, CompletedJourney, JourneyShareData } from './stores/JourneyStore';

// ── Types ──────────────────────────────────────────────────────

interface LiveShareSession {
  shareUrl?: string;
  [key: string]: any;
}

interface LiveShareOptions {
  userName?: string;
  ttlMinutes?: number;
  purpose?: string;
}

interface EmergencyContextValue {
  emergencyContacts: EmergencyContact[];
  settings: EmergencySettings;
  sosMessage: string;
  isSOSActive: boolean;
  currentLocation: LocationData | null;
  stealthMode: boolean;
  isTracking: boolean;
  isRecording: boolean;
  sirenActive: boolean;
  sosHistory: SOSHistoryEntry[];
  lastCheckIn: Date;
  checkInOverdue: boolean;
  activeJourney: ActiveJourney | null;
  journeyOverdue: boolean;
  isScreamDetecting: boolean;
  liveLocation: LocationData | null;
  isLiveTracking: boolean;
  journeyBreadcrumbs: Breadcrumb[];
  isDeviceMoving: boolean;
  journeyStats: JourneyStats;
  journeyHistory: CompletedJourney[];
  isBackgroundTracking: boolean;
  liveShareSession: LiveShareSession | null;
  isLiveSharing: boolean;
  pushToken: string | null;
  sosDeliveryStatus: SOSDeliveryStatus;
  aiServiceStatus: Record<string, any>;
  setCurrentLocation: React.Dispatch<React.SetStateAction<LocationData | null>>;
  setIsTracking: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  setSirenActive: React.Dispatch<React.SetStateAction<boolean>>;
  setIsScreamDetecting: React.Dispatch<React.SetStateAction<boolean>>;
  addContact: (contact: Partial<EmergencyContact>) => Promise<EmergencyContact>;
  removeContact: (contactId: string) => Promise<void>;
  updateContact: (contactId: string, updates: Partial<EmergencyContact>) => Promise<void>;
  getContactsByTier: (tier: number) => EmergencyContact[];
  saveContacts: (contacts: EmergencyContact[]) => Promise<void>;
  updateSettings: (newSettings: Partial<EmergencySettings>) => Promise<void>;
  updateSOSMessage: (message: string) => Promise<void>;
  toggleStealthMode: () => Promise<void>;
  triggerSOS: () => Promise<void>;
  cancelSOS: () => Promise<void>;
  checkIn: () => void;
  startJourney: (destination: string, minutesToArrive: number) => Promise<ActiveJourney>;
  completeJourney: () => Promise<void>;
  extendJourney: (extraMinutes: number) => Promise<void>;
  getJourneyShareData: () => JourneyShareData | null;
  startLiveLocationSharing: (options?: LiveShareOptions) => Promise<LiveShareSession | null>;
  stopLiveLocationSharing: () => Promise<void>;
}

const EmergencyContext = createContext<EmergencyContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  SOS_MESSAGE: '@girl_safety_sos_message',
} as const;

const DEFAULT_SOS_MESSAGE =
  'EMERGENCY: I am in danger and need immediate help. Please track my location and contact authorities now. Sent from SafeHer.';

export const EmergencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isBackgroundTracking, setIsBackgroundTracking] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [sirenActive, setSirenActive] = useState<boolean>(false);
  const [isScreamDetecting, setIsScreamDetecting] = useState<boolean>(false);
  const [lastCheckIn, setLastCheckIn] = useState<Date>(new Date());
  const [checkInOverdue, setCheckInOverdue] = useState<boolean>(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [aiServiceStatus, setAiServiceStatus] = useState<Record<string, any>>({});
  const [sosMessage, setSosMessage] = useState<string>(DEFAULT_SOS_MESSAGE);

  // Instantiating Domain Stores
  const {
    settings,
    stealthMode,
    loadSettings,
    updateSettings,
    toggleStealthMode,
  } = useSettingsStore(setIsBackgroundTracking);

  const {
    emergencyContacts,
    loadContacts,
    saveContacts,
    addContact,
    updateContact,
    removeContact,
    getContactsByTier,
  } = useGuardianStore();

  const {
    activeJourney,
    journeyOverdue,
    setJourneyOverdue,
    journeyBreadcrumbs,
    isDeviceMoving,
    journeyStats,
    journeyHistory,
    loadJourneyData,
    startJourney,
    completeJourney,
    extendJourney,
    getJourneyShareData,
    stopBreadcrumbTracking,
  } = useJourneyStore(currentLocation, setCurrentLocation);

  const {
    isSOSActive,
    sosHistory,
    liveLocation,
    isLiveTracking,
    liveShareSession,
    isLiveSharing,
    sosDeliveryStatus,
    loadEmergencyHistory,
    triggerSOS: storeTriggerSOS,
    cancelSOS: storeCancelSOS,
  } = useEmergencyStore();

  const inactivityRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const journeyRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Unified init loading ──
  useEffect(() => {
    const init = async () => {
      await EncryptedStorageService.migrateToEncrypted();

      const [loadedSettings, loadedContacts] = await Promise.all([
        loadSettings(),
        loadContacts(),
        loadJourneyData(),
        loadEmergencyHistory(),
      ]);

      const savedMessage = await EncryptedStorageService.getItem(STORAGE_KEYS.SOS_MESSAGE);
      if (savedMessage) {
        setSosMessage(savedMessage);
      }

      // Initialize notifications
      const notifResult = await NotificationService.initialize({
        onSOSTrigger: () => triggerSOS(),
      });
      if (notifResult.pushToken) setPushToken(notifResult.pushToken);

      if (loadedSettings.persistentSOSNotification) {
        await NotificationService.showPersistentSOSNotification();
      }

      if (loadedSettings.backgroundLocationEnabled) {
        await BackgroundLocationService.startTracking({
          sosMode: false,
          onLocation: (locations: LocationData[]) => {
            if (locations?.length > 0) {
              const latest = locations[locations.length - 1];
              setCurrentLocation(latest);
              if (LiveLocationSharingService.isSharing()) {
                LiveLocationSharingService.updateLocation(latest).catch(() => {});
              }
            }
          },
        });
        setIsBackgroundTracking(true);
      }
    };

    init();

    const unsub = SafetyAIService.addListener((event: { type: string }) => {
      setAiServiceStatus(SafetyAIService.getStatus());
      if (event.type === 'scream_detected') {
        Alert.alert(
          '🔊 Loud Sound Detected!',
          'A scream or loud sound was detected. Do you need help?',
          [
            { text: "I'm OK", style: 'cancel' },
            { text: '🆘 SEND SOS', style: 'destructive', onPress: () => triggerSOS() },
          ],
          { cancelable: true }
        );
      }
    });

    return () => {
      unsub();
      SafetyAIService.cleanup();
    };
  }, []);

  // ── Start/stop AI sensors based on settings ──
  useEffect(() => {
    if (settings.shakeToSOS && !isSOSActive) {
      SafetyAIService.startShakeDetection(() => {
        triggerSOS();
      });
    } else {
      SafetyAIService.stopShakeDetection();
    }

    if (settings.screamDetection && !isSOSActive) {
      SafetyAIService.startScreamDetection(
        () => {},
        -20 + (settings.screamThreshold ? (settings.screamThreshold - 80) * 0.5 : 0)
      );
    } else {
      SafetyAIService.stopScreamDetection();
    }

    setAiServiceStatus(SafetyAIService.getStatus());
  }, [settings.shakeToSOS, settings.screamDetection, isSOSActive]);

  // ── Inactivity Monitor ──
  useEffect(() => {
    if (inactivityRef.current) clearInterval(inactivityRef.current);

    if (settings.inactivitySOSEnabled && !isSOSActive) {
      let warnedOnce = false;
      let escalationFired = false;
      inactivityRef.current = setInterval(async () => {
        const elapsed = (Date.now() - lastCheckIn.getTime()) / 1000 / 60;
        if (elapsed < settings.inactivityTimeout) {
          warnedOnce = false;
          escalationFired = false;
          return;
        }

        if (!warnedOnce) {
          setCheckInOverdue(true);
          warnedOnce = true;
          try {
            await NotificationService.showCheckInReminder(Math.round(elapsed));
          } catch {}
          Alert.alert(
            '⏱️ Check-In Overdue!',
            `You haven't checked in for ${Math.round(elapsed)} minutes. Tap below to confirm you're safe.`,
            [
              { text: "I'm Safe ✓", onPress: () => { checkIn(); warnedOnce = false; escalationFired = false; } },
              { text: '🆘 Send SOS', style: 'destructive', onPress: () => triggerSOS() },
            ],
            { cancelable: false },
          );
        }

        if (warnedOnce && !escalationFired && elapsed >= settings.inactivityTimeout + 10) {
          escalationFired = true;
          try {
            await NotificationService.showCheckInReminder(Math.round(elapsed));
          } catch {}
        }
      }, 30000);
    }

    return () => {
      if (inactivityRef.current) clearInterval(inactivityRef.current);
    };
  }, [settings.inactivitySOSEnabled, settings.inactivityTimeout, lastCheckIn, isSOSActive]);

  // ── Journey Monitor ──
  useEffect(() => {
    if (journeyRef.current) clearInterval(journeyRef.current);

    if (activeJourney && !journeyOverdue) {
      journeyRef.current = setInterval(() => {
        const eta = new Date(activeJourney.expectedArrival).getTime();
        if (Date.now() > eta) {
          setJourneyOverdue(true);
        }
      }, 15000);
    }

    return () => {
      if (journeyRef.current) clearInterval(journeyRef.current);
    };
  }, [activeJourney, journeyOverdue]);

  const updateSOSMessage = async (message: string): Promise<void> => {
    try {
      await EncryptedStorageService.setItem(STORAGE_KEYS.SOS_MESSAGE, message);
      setSosMessage(message);
    } catch (error) {
      Logger.error('Error saving SOS message:', error);
    }
  };

  const triggerSOS = useCallback(async () => {
    await storeTriggerSOS(
      currentLocation,
      setCurrentLocation,
      emergencyContacts,
      sosMessage,
      settings,
      setSirenActive,
      setIsRecording
    );
  }, [storeTriggerSOS, currentLocation, emergencyContacts, sosMessage, settings]);

  const cancelSOS = useCallback(async () => {
    await storeCancelSOS(
      settings,
      setSirenActive,
      setIsRecording
    );
  }, [storeCancelSOS, settings]);

  const checkIn = (): void => {
    setLastCheckIn(new Date());
    setCheckInOverdue(false);
  };

  // ── Live Location Sharing (manual start/stop outside SOS) ──
  const startLiveLocationSharing = async (options: LiveShareOptions = {}): Promise<LiveShareSession | null> => {
    try {
      const session = await LiveLocationSharingService.startSession({
        userName: options.userName || 'SafeHer User',
        ttlMinutes: options.ttlMinutes || 30,
        purpose: options.purpose || 'Location Sharing',
      });
      return session;
    } catch (e) {
      Logger.error('[LiveShare] Start error:', e);
    }
    return null;
  };

  const stopLiveLocationSharing = async (): Promise<void> => {
    try {
      await LiveLocationSharingService.endSession();
    } catch (e) {
      Logger.error('[LiveShare] Stop error:', e);
    }
  };

  const value: EmergencyContextValue = {
    emergencyContacts,
    settings,
    sosMessage,
    isSOSActive,
    currentLocation,
    stealthMode,
    isTracking,
    isRecording,
    sirenActive,
    sosHistory,
    lastCheckIn,
    checkInOverdue,
    activeJourney,
    journeyOverdue,
    isScreamDetecting,
    liveLocation,
    isLiveTracking,
    journeyBreadcrumbs,
    isDeviceMoving,
    journeyStats,
    journeyHistory,
    isBackgroundTracking,
    liveShareSession,
    isLiveSharing,
    pushToken,
    sosDeliveryStatus,
    aiServiceStatus,
    setCurrentLocation,
    setIsTracking,
    setIsRecording,
    setSirenActive,
    setIsScreamDetecting,
    addContact,
    removeContact,
    updateContact,
    getContactsByTier,
    saveContacts,
    updateSettings,
    updateSOSMessage,
    toggleStealthMode,
    triggerSOS,
    cancelSOS,
    checkIn,
    startJourney,
    completeJourney,
    extendJourney,
    getJourneyShareData,
    startLiveLocationSharing,
    stopLiveLocationSharing,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
};

export const useEmergency = (): EmergencyContextValue => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within EmergencyProvider');
  }
  return context;
};

export default EmergencyContext;
