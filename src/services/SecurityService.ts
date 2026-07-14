import Logger from '../utils/logger';

export interface EncryptedLocationInput {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: number | string;
}

/**
 * SecurityService — Handles mock coordinate encryption and session tracking timeouts (TTL)
 */
class SecurityServiceClass {
  private activeSessionTimer: ReturnType<typeof setTimeout> | null = null;
  private trackingExpirationCallback: (() => void) | null = null;

  /**
   * Mock-encrypt coordinates using a base64 XOR layout.
   * Ensures GPS data is not stored/transmitted as plaintext.
   */
  public encryptLocation(location: EncryptedLocationInput, secretKey: string = 'SafeHerSecretKey2026'): string {
    try {
      const dataStr = JSON.stringify({
        lat: location.latitude,
        lng: location.longitude,
        acc: location.accuracy,
        time: location.timestamp || new Date().toISOString(),
      });

      // Simple XOR encryption for mock representation
      let result = '';
      for (let i = 0; i < dataStr.length; i++) {
        const charCode = dataStr.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length);
        result += String.fromCharCode(charCode);
      }

      // Safe base64 encoding
      return this.btoa(result);
    } catch (e) {
      Logger.error('[SecurityService] Encryption error:', e);
      return '';
    }
  }

  /**
   * Decrypt coordinates
   */
  public decryptLocation(encryptedStr: string, secretKey: string = 'SafeHerSecretKey2026'): EncryptedLocationInput | null {
    try {
      const encryptedData = this.atob(encryptedStr);
      let decrypted = '';
      for (let i = 0; i < encryptedData.length; i++) {
        const charCode = encryptedData.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length);
        decrypted += String.fromCharCode(charCode);
      }

      const parsed = JSON.parse(decrypted);
      return {
        latitude: parsed.lat,
        longitude: parsed.lng,
        accuracy: parsed.acc,
        timestamp: parsed.time,
      };
    } catch (e) {
      Logger.error('[SecurityService] Decryption error:', e);
      return null;
    }
  }

  /**
   * Start session tracking timer (TTL)
   * Ceases background location tracking after the duration (default 60 mins) to prevent stalking.
   */
  public startSessionTimer(durationMinutes: number, onExpired: () => void) {
    this.stopSessionTimer();
    this.trackingExpirationCallback = onExpired;
    const ms = durationMinutes * 60 * 1000;

    Logger.log(`[SecurityService] Starting location session TTL: ${durationMinutes} minutes`);
    this.activeSessionTimer = setTimeout(() => {
      Logger.log('[SecurityService] Location session TTL expired — stopping trackers');
      if (this.trackingExpirationCallback) {
        this.trackingExpirationCallback();
      }
    }, ms);
  }

  public stopSessionTimer() {
    if (this.activeSessionTimer) {
      clearTimeout(this.activeSessionTimer);
      this.activeSessionTimer = null;
    }
    this.trackingExpirationCallback = null;
  }

  // Base64 helper definitions for pure JS environment
  private btoa(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    for (let block = 0, charCode, i = 0, map = chars; str.charAt(i | 0) || (map = '=', i % 1); output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
      charCode = str.charCodeAt(i += 3/4);
      if (charCode > 0xFF) {
        throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
  }

  private atob(input: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const str = input.replace(/=+$/, '');
    let output = '';
    if (str.length % 4 === 1) {
      throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (let bc = 0, bs = 0, r_i = 0, charCode; charCode = str.charAt(r_i++); ~charCode && (bs = bc % 4 ? bs * 64 + charCode : charCode, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
      charCode = chars.indexOf(charCode);
    }
    return output;
  }
}

const SecurityService = new SecurityServiceClass();
export default SecurityService;
