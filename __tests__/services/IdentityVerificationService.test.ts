/**
 * IdentityVerificationService — Unit Tests
 * ═══════════════════════════════════════════════════════════
 *
 * Tests verification flows:
 *  - Default profile state
 *  - Challenge generation
 *  - Liveness completion
 *  - Phone verification
 *  - Verification gate logic
 *  - Rate limiting
 *  - Community flagging
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('mock_sha256_hash')),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('../../src/utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

import IdentityVerificationService from '../../src/services/IdentityVerificationService';

describe('IdentityVerificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  // ── Test 1: Default profile ────────────────────────────────
  it('should create a default unverified profile on init', async () => {
    const profile = await IdentityVerificationService.init();

    expect(profile.status).toBe('unverified');
    expect(profile.phoneVerified).toBe(false);
    expect(profile.livenessCompleted).toBe(false);
    expect(profile.flagCount).toBe(0);
  });

  // ── Test 2: Challenge generation ───────────────────────────
  it('should generate exactly 3 random challenges', () => {
    const challenges = IdentityVerificationService.generateChallenges();

    expect(challenges).toHaveLength(3);
    challenges.forEach(c => {
      expect(['turn_left', 'turn_right', 'blink', 'smile', 'nod']).toContain(c);
    });
  });

  it('should return readable instructions for each challenge', () => {
    const challenges = IdentityVerificationService.generateChallenges();

    challenges.forEach(c => {
      const instruction = IdentityVerificationService.getChallengeInstruction(c);
      expect(instruction).toBeTruthy();
      expect(typeof instruction).toBe('string');
      expect(instruction.length).toBeGreaterThan(5);
    });
  });

  // ── Test 3: Liveness completion — success ──────────────────
  it('should mark profile as verified when liveness passes + phone verified', async () => {
    await IdentityVerificationService.init();
    await IdentityVerificationService.markPhoneVerified();

    const result = await IdentityVerificationService.completeLiveness('file:///selfie.jpg', 3);

    expect(result.success).toBe(true);
    expect(result.challengesPassed).toBe(3);
    expect(IdentityVerificationService.isVerified()).toBe(true);
  });

  // ── Test 4: Liveness completion — failure ──────────────────
  it('should reject liveness if not all challenges passed', async () => {
    await IdentityVerificationService.init();

    const result = await IdentityVerificationService.completeLiveness('file:///selfie.jpg', 2);

    expect(result.success).toBe(false);
    expect(result.error).toContain('2/3');
    expect(IdentityVerificationService.isVerified()).toBe(false);
  });

  // ── Test 5: Phone verification ─────────────────────────────
  it('should mark phone as verified', async () => {
    await IdentityVerificationService.init();
    await IdentityVerificationService.markPhoneVerified();

    expect(IdentityVerificationService.isPhoneVerified()).toBe(true);
  });

  // ── Test 6: Verification gate — basic features ─────────────
  it('should allow basic features with phone verification only', async () => {
    await IdentityVerificationService.init();
    await IdentityVerificationService.markPhoneVerified();

    const gate = await IdentityVerificationService.checkGate('basic');
    expect(gate.allowed).toBe(true);
    expect(gate.requiredActions).toHaveLength(0);
  });

  // ── Test 7: Verification gate — companion blocked ──────────
  it('should block companion features without full verification', async () => {
    await IdentityVerificationService.init();

    const gate = await IdentityVerificationService.checkGate('companion');
    expect(gate.allowed).toBe(false);
    expect(gate.requiredActions).toContain('phone_verification');
    expect(gate.requiredActions).toContain('liveness_check');
  });

  // ── Test 8: Community flagging → auto-suspend ──────────────
  it('should auto-suspend after 3 flags', async () => {
    await IdentityVerificationService.init();

    await IdentityVerificationService.recordFlag();
    await IdentityVerificationService.recordFlag();
    expect(IdentityVerificationService.getStatus()).not.toBe('rejected');

    await IdentityVerificationService.recordFlag();
    expect(IdentityVerificationService.getStatus()).toBe('rejected');

    const gate = await IdentityVerificationService.checkGate('companion');
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toContain('suspended');
  });

  // ── Test 9: Rate limiting ──────────────────────────────────
  it('should allow liveness attempts up to the daily limit', async () => {
    const check = await IdentityVerificationService.canAttemptLiveness();
    expect(check.allowed).toBe(true);
    expect(check.remainingAttempts).toBe(5);
  });
});
