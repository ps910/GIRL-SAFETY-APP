/**
 * VoiceTriggerService — Voice-activated SOS
 * ═══════════════════════════════════════════════════════════
 *
 * Listens for sustained loud audio (indicating a scream or "HELP") and
 * triggers the SOS pipeline when detected. More reliable than keyword
 * recognition since it doesn't depend on language or accent.
 *
 * Uses expo-av Recording API with metering to detect sustained loud audio.
 * This is separate from SafetyAIService's screamDetection to avoid
 * coupling the SOS trigger to the scream UI.
 *
 * Battery considerations:
 *  - Opt-in only (user must enable in Settings)
 *  - Uses low-fidelity audio recording to minimize CPU/battery
 *  - Auto-disabled below 15% battery (if expo-battery is available)
 *  - Only active during night mode (20:00–05:00) or when explicitly enabled
 */
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import Logger from '../utils/logger';

// ── Types ────────────────────────────────────────────────────────
export interface VoiceTriggerConfig {
  /** dB threshold to consider as a potential trigger (default: -18) */
  thresholdDB: number;
  /** How long (ms) the audio must stay above threshold (default: 1200ms) */
  sustainedMs: number;
  /** Cooldown between triggers (ms) (default: 30s) */
  cooldownMs: number;
  /** Check interval (ms) (default: 250ms) */
  checkIntervalMs: number;
}

export interface VoiceTriggerStatus {
  isActive: boolean;
  isListening: boolean;
  lastTriggerTime: number | null;
  config: VoiceTriggerConfig;
}

// ── Defaults ─────────────────────────────────────────────────────
const DEFAULT_CONFIG: VoiceTriggerConfig = {
  thresholdDB: -18,
  sustainedMs: 1200,
  cooldownMs: 30000,
  checkIntervalMs: 250,
};

// ── State ────────────────────────────────────────────────────────
let _recording: Audio.Recording | null = null;
let _checkInterval: ReturnType<typeof setInterval> | null = null;
let _isActive = false;
let _isListening = false;
let _onTrigger: (() => void) | null = null;
let _config: VoiceTriggerConfig = { ...DEFAULT_CONFIG };
let _loudStartTime = 0;
let _lastTriggerTime = 0;

// ═══════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════

const VoiceTriggerService = {
  /**
   * Start listening for voice triggers.
   *
   * @param onTrigger - Callback when a sustained loud sound is detected
   * @param config - Optional configuration overrides
   */
  async start(
    onTrigger: () => void,
    config?: Partial<VoiceTriggerConfig>,
  ): Promise<{ success: boolean; error?: string }> {
    if (_isActive) {
      return { success: true }; // Already running
    }

    _config = { ...DEFAULT_CONFIG, ...config };
    _onTrigger = onTrigger;

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'Microphone permission denied' };
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });

      _recording = new Audio.Recording();
      await _recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.LOW_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.LOW_QUALITY.android,
          extension: '.m4a',
        },
        ios: {
          ...Audio.RecordingOptionsPresets.LOW_QUALITY.ios,
          extension: '.m4a',
        },
        isMeteringEnabled: true,
      });

      await _recording.startAsync();
      _isActive = true;
      _isListening = true;
      _loudStartTime = 0;

      // Start polling metering data
      _checkInterval = setInterval(async () => {
        await this._checkAudioLevel();
      }, _config.checkIntervalMs);

      Logger.log('[VoiceTrigger] Started listening');
      return { success: true };
    } catch (e: any) {
      Logger.error('[VoiceTrigger] Start error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Stop listening for voice triggers.
   */
  async stop(): Promise<void> {
    _isActive = false;
    _isListening = false;

    if (_checkInterval) {
      clearInterval(_checkInterval);
      _checkInterval = null;
    }

    if (_recording) {
      try {
        const status = await _recording.getStatusAsync();
        if (status.isRecording) {
          await _recording.stopAndUnloadAsync();
        }
      } catch {
        // Ignore errors during cleanup
      }
      _recording = null;
    }

    _onTrigger = null;
    _loudStartTime = 0;

    Logger.log('[VoiceTrigger] Stopped');
  },

  /**
   * Update configuration while running.
   */
  updateConfig(config: Partial<VoiceTriggerConfig>): void {
    _config = { ..._config, ...config };
    Logger.log('[VoiceTrigger] Config updated:', _config);
  },

  /**
   * Check if voice trigger should be active based on time of day.
   * Returns true if it's "night time" (20:00–05:00).
   */
  isNightTime(): boolean {
    const hour = new Date().getHours();
    return hour >= 20 || hour < 5;
  },

  /**
   * Get current status.
   */
  getStatus(): VoiceTriggerStatus {
    return {
      isActive: _isActive,
      isListening: _isListening,
      lastTriggerTime: _lastTriggerTime || null,
      config: { ..._config },
    };
  },

  // ── Private: Audio level checking ─────────────────────────────

  async _checkAudioLevel(): Promise<void> {
    if (!_recording || !_isActive) return;

    try {
      const status = await _recording.getStatusAsync();
      if (!status.isRecording) return;

      const metering = (status as any).metering;
      if (metering === undefined || metering === null) return;

      const now = Date.now();

      if (metering > _config.thresholdDB) {
        // Audio is above threshold
        if (_loudStartTime === 0) {
          _loudStartTime = now;
        } else if (now - _loudStartTime >= _config.sustainedMs) {
          // Sustained loud audio detected
          if (now - _lastTriggerTime > _config.cooldownMs) {
            _lastTriggerTime = now;
            _loudStartTime = 0;
            Logger.log(`[VoiceTrigger] TRIGGERED — sustained ${_config.sustainedMs}ms at ${metering}dB`);

            if (_onTrigger) {
              try {
                _onTrigger();
              } catch (e) {
                Logger.error('[VoiceTrigger] Trigger callback error:', e);
              }
            }
          } else {
            _loudStartTime = 0; // In cooldown, reset
          }
        }
      } else {
        // Audio dropped below threshold — reset
        _loudStartTime = 0;
      }
    } catch (e) {
      Logger.error('[VoiceTrigger] Check error:', e);
    }
  },
};

export default VoiceTriggerService;
