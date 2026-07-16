import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorageService from '../../services/EncryptedStorageService';
import BackgroundLocationService from '../../services/BackgroundLocationService';
import NotificationService from '../../services/NotificationService';
import Logger from '../../utils/logger';
import type { EmergencySettings } from '../../types';

export const STORAGE_KEYS = {
  SETTINGS: '@girl_safety_settings',
  STEALTH: '@girl_safety_stealth',
} as const;

export const DEFAULT_SETTINGS: EmergencySettings = {
  shakeToSOS: true,
  autoLocationShare: true,
  sirenEnabled: true,
  countdownSeconds: 5,
  autoCallPolice: false,
  autoRecordAudio: true,
  offlineSOS: true,
  hiddenMode: false,
  voiceActivation: false,
  inactivitySOSEnabled: false,
  inactivityTimeout: 30,
  screamDetection: false,
  screamThreshold: 80,
  autoPhotoCapture: true,
  journeyAlerts: true,
  panicWipeEnabled: false,
  backgroundLocationEnabled: true,
  persistentSOSNotification: true,
  volumeButtonSOS: true,
  liveLocationSharing: true,
  pushNotifications: true,
  countryOverride: null,
};

export function useSettingsStore(setIsBackgroundTracking: (v: boolean) => void) {
  const [settings, setSettings] = useState<EmergencySettings>(DEFAULT_SETTINGS);
  const [stealthMode, setStealthMode] = useState<boolean>(false);

  const loadSettings = useCallback(async () => {
    try {
      const settingsData = await EncryptedStorageService.getItem(STORAGE_KEYS.SETTINGS);
      const stealthData = await AsyncStorage.getItem(STORAGE_KEYS.STEALTH);

      if (settingsData) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(settingsData) });
      }
      if (stealthData) {
        setStealthMode(JSON.parse(stealthData));
      }

      const loadedSettings = settingsData
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsData) }
        : DEFAULT_SETTINGS;

      if (loadedSettings.persistentSOSNotification) {
        await NotificationService.showPersistentSOSNotification();
      }

      if (loadedSettings.backgroundLocationEnabled) {
        setIsBackgroundTracking(true);
      }
      return loadedSettings;
    } catch (error) {
      Logger.error('[SettingsStore] Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }, [setIsBackgroundTracking]);

  const updateSettings = useCallback(async (newSettings: Partial<EmergencySettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      EncryptedStorageService.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated)).catch((err) => {
        Logger.error('[SettingsStore] Error saving settings:', err);
      });

      if ('backgroundLocationEnabled' in newSettings) {
        if (newSettings.backgroundLocationEnabled) {
          BackgroundLocationService.startTracking({ sosMode: false }).catch(() => {});
          setIsBackgroundTracking(true);
        } else {
          BackgroundLocationService.stopTracking().catch(() => {});
          setIsBackgroundTracking(false);
        }
      }
      if ('persistentSOSNotification' in newSettings) {
        if (newSettings.persistentSOSNotification) {
          NotificationService.showPersistentSOSNotification().catch(() => {});
        }
      }
      return updated;
    });
  }, [setIsBackgroundTracking]);

  const toggleStealthMode = useCallback(async () => {
    setStealthMode((prev) => {
      const newVal = !prev;
      AsyncStorage.setItem(STORAGE_KEYS.STEALTH, JSON.stringify(newVal)).catch((err) => {
        Logger.error('[SettingsStore] Error saving stealth mode:', err);
      });
      return newVal;
    });
  }, []);

  return {
    settings,
    stealthMode,
    loadSettings,
    updateSettings,
    toggleStealthMode,
  };
}
