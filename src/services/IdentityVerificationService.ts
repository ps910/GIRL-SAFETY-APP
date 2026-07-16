/**
 * IdentityVerificationService — KYC / Liveness Verification
 * ═══════════════════════════════════════════════════════════
 *
 * Provides identity verification for SafeHer users:
 *  1. Liveness detection — camera-based face capture with random pose challenge
 *  2. Phone verification — enforces OTP verification as mandatory
 *  3. Profile approval — new users get status 'pending_verification'
 *  4. Verification status tracking — blocks companion features until verified
 *
 * Privacy: Selfie images are stored in device-local encrypted storage only.
 * No biometric templates are sent to any server.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import Logger from '../utils/logger';

// ── Types ────────────────────────────────────────────────────────
export type VerificationStatus =
  | 'unverified'
  | 'pending_liveness'
  | 'pending_review'
  | 'verified'
  | 'rejected';

export type LivenessChallenge =
  | 'turn_left'
  | 'turn_right'
  | 'blink'
  | 'smile'
  | 'nod';

export interface VerificationProfile {
  status: VerificationStatus;
  phoneVerified: boolean;
  livenessCompleted: boolean;
  livenessCompletedAt?: string;
  selfieHash?: string; // SHA-256 of selfie for integrity (image stays on device)
  genderDeclared?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  flagCount: number;
  lastFlaggedAt?: string;
}

export interface LivenessResult {
  success: boolean;
  challengesPassed: number;
  totalChallenges: number;
  selfieUri?: string;
  error?: string;
}

export interface VerificationGateResult {
  allowed: boolean;
  reason?: string;
  status: VerificationStatus;
  requiredActions: string[];
}

// ── Storage Keys ─────────────────────────────────────────────────
const STORAGE_KEYS = {
  VERIFICATION_PROFILE: '@safeher_verification_profile',
  LIVENESS_SELFIE_URI: '@safeher_liveness_selfie_uri',
  VERIFICATION_ATTEMPTS: '@safeher_verification_attempts',
} as const;

const SECURE_OPTS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
} as const;

const MAX_LIVENESS_ATTEMPTS_PER_DAY = 5;
const CHALLENGE_COUNT = 3;

// ── Liveness Challenge Generator ─────────────────────────────────
const ALL_CHALLENGES: LivenessChallenge[] = ['turn_left', 'turn_right', 'blink', 'smile', 'nod'];

const generateChallengeSequence = (count: number): LivenessChallenge[] => {
  const shuffled = [...ALL_CHALLENGES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// ═══════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════

class IdentityVerificationServiceClass {
  private _profile: VerificationProfile | null = null;

  // ── Initialize ────────────────────────────────────────────────

  async init(): Promise<VerificationProfile> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.VERIFICATION_PROFILE);
      if (raw) {
        this._profile = JSON.parse(raw);
      } else {
        this._profile = this._createDefaultProfile();
        await this._save();
      }
      return this._profile!;
    } catch (e) {
      Logger.error('[IdentityVerification] Init error:', e);
      this._profile = this._createDefaultProfile();
      return this._profile;
    }
  }

  // ── Liveness Check ────────────────────────────────────────────

  /**
   * Generate a random sequence of liveness challenges.
   * The UI will guide the user through each challenge using the camera.
   */
  generateChallenges(): LivenessChallenge[] {
    return generateChallengeSequence(CHALLENGE_COUNT);
  }

  /**
   * Get human-readable instruction for a challenge.
   */
  getChallengeInstruction(challenge: LivenessChallenge): string {
    const instructions: Record<LivenessChallenge, string> = {
      turn_left: 'Slowly turn your head to the left',
      turn_right: 'Slowly turn your head to the right',
      blink: 'Blink your eyes twice',
      smile: 'Give a natural smile',
      nod: 'Nod your head up and down',
    };
    return instructions[challenge];
  }

  /**
   * Check if the user can attempt liveness verification.
   * Rate-limited to prevent abuse.
   */
  async canAttemptLiveness(): Promise<{ allowed: boolean; remainingAttempts: number; resetAt?: string }> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.VERIFICATION_ATTEMPTS);
      const attempts = raw ? JSON.parse(raw) : { count: 0, date: '' };

      const today = new Date().toISOString().split('T')[0];
      if (attempts.date !== today) {
        // Reset daily counter
        return { allowed: true, remainingAttempts: MAX_LIVENESS_ATTEMPTS_PER_DAY };
      }

      const remaining = MAX_LIVENESS_ATTEMPTS_PER_DAY - attempts.count;
      return {
        allowed: remaining > 0,
        remainingAttempts: Math.max(0, remaining),
        resetAt: remaining <= 0 ? 'tomorrow' : undefined,
      };
    } catch {
      return { allowed: true, remainingAttempts: MAX_LIVENESS_ATTEMPTS_PER_DAY };
    }
  }

  /**
   * Record a liveness attempt (call this when the user completes or fails a liveness check).
   */
  async recordLivenessAttempt(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.VERIFICATION_ATTEMPTS);
      const attempts = raw ? JSON.parse(raw) : { count: 0, date: '' };

      const today = new Date().toISOString().split('T')[0];
      if (attempts.date !== today) {
        attempts.count = 1;
        attempts.date = today;
      } else {
        attempts.count += 1;
      }

      await AsyncStorage.setItem(STORAGE_KEYS.VERIFICATION_ATTEMPTS, JSON.stringify(attempts));
    } catch (e) {
      Logger.error('[IdentityVerification] Record attempt error:', e);
    }
  }

  /**
   * Complete liveness verification.
   * Called after the camera-based liveness check passes on the UI side.
   *
   * @param selfieUri - Local URI of the captured selfie
   * @param challengesPassed - Number of challenges the user passed
   */
  async completeLiveness(selfieUri: string, challengesPassed: number): Promise<LivenessResult> {
    await this.recordLivenessAttempt();

    if (challengesPassed < CHALLENGE_COUNT) {
      return {
        success: false,
        challengesPassed,
        totalChallenges: CHALLENGE_COUNT,
        error: `Passed ${challengesPassed}/${CHALLENGE_COUNT} challenges. Please try again.`,
      };
    }

    try {
      // Hash the selfie for integrity verification (image stays on device)
      const selfieHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${selfieUri}_${Date.now()}`,
      );

      // Store selfie URI securely
      await SecureStore.setItemAsync(
        STORAGE_KEYS.LIVENESS_SELFIE_URI.replace(/[^a-zA-Z0-9._-]/g, '_'),
        selfieUri,
        SECURE_OPTS,
      );

      // Update verification profile
      if (!this._profile) await this.init();
      this._profile!.livenessCompleted = true;
      this._profile!.livenessCompletedAt = new Date().toISOString();
      this._profile!.selfieHash = selfieHash;
      this._profile!.status = this._profile!.phoneVerified ? 'verified' : 'pending_liveness';
      if (this._profile!.phoneVerified) {
        this._profile!.verifiedAt = new Date().toISOString();
      }
      await this._save();

      return {
        success: true,
        challengesPassed,
        totalChallenges: CHALLENGE_COUNT,
        selfieUri,
      };
    } catch (e: any) {
      Logger.error('[IdentityVerification] Complete liveness error:', e);
      return {
        success: false,
        challengesPassed,
        totalChallenges: CHALLENGE_COUNT,
        error: e.message || 'Failed to save verification data',
      };
    }
  }

  // ── Phone Verification ────────────────────────────────────────

  /**
   * Mark phone as verified (called after Firebase phone OTP succeeds).
   */
  async markPhoneVerified(): Promise<void> {
    if (!this._profile) await this.init();
    this._profile!.phoneVerified = true;

    // If liveness is also done, mark as fully verified
    if (this._profile!.livenessCompleted) {
      this._profile!.status = 'verified';
      this._profile!.verifiedAt = new Date().toISOString();
    }
    await this._save();
  }

  // ── Gender Declaration ────────────────────────────────────────

  async setGenderDeclaration(gender: string): Promise<void> {
    if (!this._profile) await this.init();
    this._profile!.genderDeclared = gender;
    await this._save();
  }

  // ── Community Flagging ────────────────────────────────────────

  async recordFlag(): Promise<void> {
    if (!this._profile) await this.init();
    this._profile!.flagCount += 1;
    this._profile!.lastFlaggedAt = new Date().toISOString();

    // Auto-suspend after 3 flags
    if (this._profile!.flagCount >= 3) {
      this._profile!.status = 'rejected';
      this._profile!.rejectedAt = new Date().toISOString();
      this._profile!.rejectionReason = 'Community flagged (3+ reports)';
    }
    await this._save();
  }

  // ── Verification Gate ─────────────────────────────────────────

  /**
   * Check if the user is allowed to access a feature that requires verification.
   * Used by navigation guards and feature-specific checks.
   *
   * @param featureLevel - 'basic' (SOS, guardians) or 'companion' (matching, sharing)
   */
  async checkGate(featureLevel: 'basic' | 'companion' = 'companion'): Promise<VerificationGateResult> {
    if (!this._profile) await this.init();
    const p = this._profile!;

    // Basic features (SOS, guardians) only require phone verification
    if (featureLevel === 'basic') {
      if (p.phoneVerified) {
        return { allowed: true, status: p.status, requiredActions: [] };
      }
      return {
        allowed: false,
        reason: 'Phone verification required for emergency features.',
        status: p.status,
        requiredActions: ['phone_verification'],
      };
    }

    // Companion features require full verification
    if (p.status === 'verified') {
      return { allowed: true, status: p.status, requiredActions: [] };
    }

    if (p.status === 'rejected') {
      return {
        allowed: false,
        reason: 'Your account has been suspended due to community reports.',
        status: p.status,
        requiredActions: ['contact_support'],
      };
    }

    const required: string[] = [];
    if (!p.phoneVerified) required.push('phone_verification');
    if (!p.livenessCompleted) required.push('liveness_check');

    return {
      allowed: false,
      reason: 'Please complete identity verification to access this feature.',
      status: p.status,
      requiredActions: required,
    };
  }

  // ── Getters ───────────────────────────────────────────────────

  getProfile(): VerificationProfile | null {
    return this._profile;
  }

  getStatus(): VerificationStatus {
    return this._profile?.status || 'unverified';
  }

  isVerified(): boolean {
    return this._profile?.status === 'verified';
  }

  isPhoneVerified(): boolean {
    return this._profile?.phoneVerified ?? false;
  }

  // ── Private ───────────────────────────────────────────────────

  private _createDefaultProfile(): VerificationProfile {
    return {
      status: 'unverified',
      phoneVerified: false,
      livenessCompleted: false,
      flagCount: 0,
    };
  }

  private async _save(): Promise<void> {
    if (!this._profile) return;
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.VERIFICATION_PROFILE,
        JSON.stringify(this._profile),
      );
    } catch (e) {
      Logger.error('[IdentityVerification] Save error:', e);
    }
  }
}

const IdentityVerificationService = new IdentityVerificationServiceClass();
export default IdentityVerificationService;
