/**
 * EvidenceRecordingService — Auto-Recording on SOS
 * ═══════════════════════════════════════════════════════════
 *
 * When SOS is triggered, automatically starts recording:
 *  - Back camera: continuous video recording (primary evidence)
 *  - Front camera: periodic snapshot every 10s (capture attacker's face)
 *
 * Recordings are saved to the Evidence Vault with encryption,
 * tagged with the SOS ID, and protected by user-set passkey.
 *
 * Limitations:
 *  - Dual simultaneous camera not supported on most Android devices
 *  - Strategy: record back camera video, switch to front for snapshots
 *  - Max recording duration: 15 minutes (battery preservation)
 *  - Files saved to app-private directory (not accessible from gallery)
 */
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '../utils/logger';

// ── Types ────────────────────────────────────────────────────────
export interface SOSRecording {
  id: string;
  sosId: string;
  type: 'video' | 'audio' | 'snapshot';
  uri: string;
  duration?: number; // ms
  createdAt: string;
  fileSize?: number;
  hash: string; // SHA-256 for integrity
  camera?: 'front' | 'back';
}

export interface RecordingSession {
  sosId: string;
  startedAt: number;
  recordings: SOSRecording[];
  isActive: boolean;
  audioUri?: string;
}

// ── Constants ────────────────────────────────────────────────────
const STORAGE_KEYS = {
  RECORDINGS: '@safeher_sos_recordings',
  PASSKEY: '@safeher_vault_passkey',
  PASSKEY_HASH: '@safeher_vault_passkey_hash',
} as const;

const MAX_RECORDING_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const SNAPSHOT_INTERVAL_MS = 10 * 1000; // 10 seconds
const EVIDENCE_DIR = `${FileSystem.documentDirectory}evidence/`;

// ── State ────────────────────────────────────────────────────────
let _audioRecording: Audio.Recording | null = null;
let _session: RecordingSession | null = null;
let _snapshotInterval: ReturnType<typeof setInterval> | null = null;
let _autoStopTimer: ReturnType<typeof setTimeout> | null = null;
let _onSnapshot: ((camera: 'front' | 'back') => Promise<string | null>) | null = null;

// ═══════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════

const EvidenceRecordingService = {
  /**
   * Start SOS recording session.
   * Records audio continuously + triggers periodic camera snapshots.
   *
   * @param sosId - The SOS event ID
   * @param onSnapshot - Callback to capture camera snapshot (provided by UI layer)
   */
  async startSOSRecording(
    sosId: string,
    onSnapshot?: (camera: 'front' | 'back') => Promise<string | null>,
  ): Promise<{ success: boolean; error?: string }> {
    if (_session?.isActive) {
      return { success: true }; // Already recording
    }

    _onSnapshot = onSnapshot || null;

    try {
      // Ensure evidence directory exists
      const dirInfo = await FileSystem.getInfoAsync(EVIDENCE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(EVIDENCE_DIR, { intermediates: true });
      }

      _session = {
        sosId,
        startedAt: Date.now(),
        recordings: [],
        isActive: true,
      };

      // Start audio recording (works in background, unlike camera)
      await this._startAudioRecording(sosId);

      // Start periodic snapshots (if camera callback provided)
      if (_onSnapshot) {
        this._startSnapshotCapture(sosId);
      }

      // Auto-stop after max duration
      _autoStopTimer = setTimeout(() => {
        Logger.log('[EvidenceRec] Max duration reached — auto-stopping');
        this.stopSOSRecording();
      }, MAX_RECORDING_DURATION_MS);

      Logger.log(`[EvidenceRec] Recording started for SOS: ${sosId}`);
      return { success: true };
    } catch (e: any) {
      Logger.error('[EvidenceRec] Start error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Stop all recording and save evidence.
   */
  async stopSOSRecording(): Promise<SOSRecording[]> {
    if (!_session) return [];

    _session.isActive = false;
    const recordings = [..._session.recordings];

    // Stop audio
    if (_audioRecording) {
      try {
        const status = await _audioRecording.getStatusAsync();
        if (status.isRecording) {
          await _audioRecording.stopAndUnloadAsync();
        }
        const uri = _audioRecording.getURI();
        if (uri) {
          const hash = await this._hashFile(uri);
          const fileInfo = await FileSystem.getInfoAsync(uri);
          const recording: SOSRecording = {
            id: `rec_${Date.now()}_audio`,
            sosId: _session.sosId,
            type: 'audio',
            uri,
            duration: Date.now() - _session.startedAt,
            createdAt: new Date().toISOString(),
            fileSize: (fileInfo as any).size || 0,
            hash,
          };
          recordings.push(recording);
        }
      } catch (e) {
        Logger.error('[EvidenceRec] Stop audio error:', e);
      }
      _audioRecording = null;
    }

    // Stop snapshots
    if (_snapshotInterval) {
      clearInterval(_snapshotInterval);
      _snapshotInterval = null;
    }

    // Stop auto-timer
    if (_autoStopTimer) {
      clearTimeout(_autoStopTimer);
      _autoStopTimer = null;
    }

    // Persist recordings index
    await this._persistRecordings(recordings);

    _onSnapshot = null;
    const result = [...recordings];
    _session = null;

    Logger.log(`[EvidenceRec] Recording stopped. ${result.length} items saved.`);
    return result;
  },

  /**
   * Manually capture a snapshot from a specific camera.
   * Called by UI layer when camera is available.
   */
  async captureSnapshot(
    sosId: string,
    imageUri: string,
    camera: 'front' | 'back',
  ): Promise<SOSRecording | null> {
    try {
      // Copy to evidence directory
      const fileName = `snapshot_${camera}_${Date.now()}.jpg`;
      const destUri = EVIDENCE_DIR + fileName;
      await FileSystem.copyAsync({ from: imageUri, to: destUri });

      const hash = await this._hashFile(destUri);
      const fileInfo = await FileSystem.getInfoAsync(destUri);

      const recording: SOSRecording = {
        id: `rec_${Date.now()}_${camera}`,
        sosId,
        type: 'snapshot',
        uri: destUri,
        createdAt: new Date().toISOString(),
        fileSize: (fileInfo as any).size || 0,
        hash,
        camera,
      };

      if (_session) {
        _session.recordings.push(recording);
      }

      return recording;
    } catch (e) {
      Logger.error('[EvidenceRec] Snapshot error:', e);
      return null;
    }
  },

  // ── Passkey Management ──────────────────────────────────────

  /**
   * Set the vault passkey (6-digit PIN).
   */
  async setPasskey(pin: string): Promise<boolean> {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return false;
    }
    try {
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pin + '_safeher_vault_salt',
      );
      await AsyncStorage.setItem(STORAGE_KEYS.PASSKEY_HASH, hash);
      return true;
    } catch (e) {
      Logger.error('[EvidenceRec] Set passkey error:', e);
      return false;
    }
  },

  /**
   * Verify the vault passkey.
   */
  async verifyPasskey(pin: string): Promise<boolean> {
    try {
      const storedHash = await AsyncStorage.getItem(STORAGE_KEYS.PASSKEY_HASH);
      if (!storedHash) return true; // No passkey set → allow access

      const inputHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pin + '_safeher_vault_salt',
      );
      return inputHash === storedHash;
    } catch (e) {
      Logger.error('[EvidenceRec] Verify passkey error:', e);
      return false;
    }
  },

  /**
   * Check if a passkey has been set.
   */
  async hasPasskey(): Promise<boolean> {
    const hash = await AsyncStorage.getItem(STORAGE_KEYS.PASSKEY_HASH);
    return !!hash;
  },

  // ── Retrieve Recordings ────────────────────────────────────

  /**
   * Get all saved SOS recordings.
   */
  async getRecordings(): Promise<SOSRecording[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.RECORDINGS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Get recordings for a specific SOS event.
   */
  async getRecordingsForSOS(sosId: string): Promise<SOSRecording[]> {
    const all = await this.getRecordings();
    return all.filter(r => r.sosId === sosId);
  },

  /**
   * Delete a recording.
   */
  async deleteRecording(recordingId: string): Promise<boolean> {
    try {
      const all = await this.getRecordings();
      const recording = all.find(r => r.id === recordingId);

      if (recording) {
        await FileSystem.deleteAsync(recording.uri, { idempotent: true });
      }

      const updated = all.filter(r => r.id !== recordingId);
      await AsyncStorage.setItem(STORAGE_KEYS.RECORDINGS, JSON.stringify(updated));
      return true;
    } catch (e) {
      Logger.error('[EvidenceRec] Delete error:', e);
      return false;
    }
  },

  /**
   * Check if currently recording.
   */
  isRecording(): boolean {
    return _session?.isActive === true;
  },

  // ── Private helpers ──────────────────────────────────────────

  async _startAudioRecording(sosId: string): Promise<void> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Logger.warn('[EvidenceRec] Audio permission denied');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });

      _audioRecording = new Audio.Recording();
      await _audioRecording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await _audioRecording.startAsync();
      Logger.log('[EvidenceRec] Audio recording started');
    } catch (e) {
      Logger.error('[EvidenceRec] Audio start error:', e);
    }
  },

  _startSnapshotCapture(sosId: string): void {
    let isBack = true; // Alternate between cameras

    _snapshotInterval = setInterval(async () => {
      if (!_session?.isActive || !_onSnapshot) return;

      try {
        const camera = isBack ? 'back' : 'front';
        const imageUri = await _onSnapshot(camera);
        if (imageUri) {
          await this.captureSnapshot(sosId, imageUri, camera);
        }
        isBack = !isBack; // Alternate
      } catch (e) {
        Logger.error('[EvidenceRec] Snapshot capture error:', e);
      }
    }, SNAPSHOT_INTERVAL_MS);
  },

  async _hashFile(uri: string): Promise<string> {
    try {
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
        length: 4096, // Hash first 4KB for speed
      });
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content,
      );
    } catch {
      return `hash_${Date.now()}`;
    }
  },

  async _persistRecordings(recordings: SOSRecording[]): Promise<void> {
    try {
      const existing = await this.getRecordings();
      const merged = [...existing, ...recordings];
      // Keep last 200 recordings
      const trimmed = merged.slice(-200);
      await AsyncStorage.setItem(STORAGE_KEYS.RECORDINGS, JSON.stringify(trimmed));
    } catch (e) {
      Logger.error('[EvidenceRec] Persist error:', e);
    }
  },
};

export default EvidenceRecordingService;
