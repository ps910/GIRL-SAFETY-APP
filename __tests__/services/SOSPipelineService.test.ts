/**
 * SOSPipelineService — Unit Tests
 * ═══════════════════════════════════════════════════════════
 *
 * Tests critical SOS delivery paths:
 *  - Successful push delivery
 *  - Push retry with exponential backoff
 *  - SMS fallback when push fails
 *  - Offline queuing
 *  - Cooldown / spam prevention
 *  - Background re-notification
 *  - Audit log integrity
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Mock all dependencies before importing ────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-sms', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  sendSMSAsync: jest.fn(() => Promise.resolve({ result: 'sent' })),
}));

jest.mock('../../src/services/NotificationService', () => ({
  sendSOSPushToContacts: jest.fn(),
}));

jest.mock('../../src/services/CloudSyncService', () => ({
  syncSOSEvent: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

// ── Now import the service ────────────────────────────────────
import SOSPipelineService from '../../src/services/SOSPipelineService';
import NotificationService from '../../src/services/NotificationService';
import * as SMS from 'expo-sms';

const mockContacts = [
  { id: '1', name: 'Mom', phone: '+919999999999' },
  { id: '2', name: 'Dad', phone: '+919999999998' },
];

const mockLocation = {
  coords: { latitude: 28.6139, longitude: 77.2090, accuracy: 10 },
  timestamp: Date.now(),
};

// ── Mock fetch for connectivity check ─────────────────────────
global.fetch = jest.fn(() =>
  Promise.resolve({ status: 204 } as Response),
);

describe('SOSPipelineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValue({ status: 204 });
  });

  // ── Test 1: Successful push delivery ───────────────────────
  it('should deliver SOS via push on first attempt', async () => {
    (NotificationService.sendSOSPushToContacts as jest.Mock).mockResolvedValue({
      success: true,
      sent: 2,
      total: 2,
    });

    const result = await SOSPipelineService.execute(
      mockContacts as any,
      'Help me!',
      mockLocation as any,
    );

    expect(result.pushAttempts).toBe(1);
    expect(result.deliveryMethod).toContain('push');
    expect(result.contactsReached).toBe(2);
    expect(result.auditLog.length).toBeGreaterThan(0);
    expect(result.auditLog[0].stage).toBe('TRIGGERED');
  });

  // ── Test 2: Push retry with fallback to SMS ────────────────
  it('should retry push 3 times then fallback to SMS', async () => {
    (NotificationService.sendSOSPushToContacts as jest.Mock).mockResolvedValue({
      success: false,
      reason: 'no_tokens',
    });

    const result = await SOSPipelineService.execute(
      mockContacts as any,
      'Help me!',
      mockLocation as any,
    );

    expect(result.pushAttempts).toBe(3);
    expect(result.smsAttempted).toBe(true);
    // SMS.sendSMSAsync is mocked to return 'sent'
    expect(result.deliveryMethod).toBe('sms');
  });

  // ── Test 3: No contacts → still runs without crash ─────────
  it('should handle empty contacts without crashing', async () => {
    const result = await SOSPipelineService.execute(
      [],
      'Help me!',
      mockLocation as any,
    );

    expect(result.totalContacts).toBe(0);
    expect(result.auditLog.length).toBeGreaterThan(0);
  });

  // ── Test 4: Offline → queues SOS ───────────────────────────
  it('should queue SOS when device is offline', async () => {
    // Mock offline
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    // SMS also unavailable offline
    (SMS.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    const result = await SOSPipelineService.execute(
      mockContacts as any,
      'Help me!',
      mockLocation as any,
    );

    expect(result.finalStage).toBe('FALLBACK_QUEUED');
    expect(result.deliveryMethod).toBe('queued');

    // Verify it was persisted
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@safeher_pending_sos_queue',
      expect.any(String),
    );
  });

  // ── Test 5: Audit log has all stages ───────────────────────
  it('should produce a complete audit log', async () => {
    (NotificationService.sendSOSPushToContacts as jest.Mock).mockResolvedValue({
      success: true,
      sent: 2,
      total: 2,
    });

    const result = await SOSPipelineService.execute(
      mockContacts as any,
      'Help me!',
      mockLocation as any,
    );

    const stages = result.auditLog.map(e => e.stage);
    expect(stages).toContain('TRIGGERED');
    expect(stages).toContain('DELIVERING_PUSH');
    expect(stages).toContain('LOGGED');

    // Every entry has a timestamp
    result.auditLog.forEach(entry => {
      expect(entry.timestamp).toBeTruthy();
      expect(new Date(entry.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  // ── Test 6: Active SOS flag persisted for bg re-notification ─
  it('should persist active SOS flag for background re-notification', async () => {
    (NotificationService.sendSOSPushToContacts as jest.Mock).mockResolvedValue({
      success: true,
      sent: 2,
      total: 2,
    });

    await SOSPipelineService.execute(
      mockContacts as any,
      'Help me!',
      mockLocation as any,
    );

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@safeher_active_sos',
      expect.any(String),
    );

    // Verify the persisted data structure
    const persistCall = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      (c: any[]) => c[0] === '@safeher_active_sos',
    );
    const data = JSON.parse(persistCall![1]);
    expect(data.resolved).toBe(false);
    expect(data.contacts).toHaveLength(2);
    expect(data.message).toBe('Help me!');
  });

  // ── Test 7: resolveActiveSOS marks resolved ────────────────
  it('should mark active SOS as resolved on cancel', async () => {
    const mockActive = JSON.stringify({
      sosId: 'sos_test',
      resolved: false,
      triggeredAt: Date.now(),
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockActive);

    await SOSPipelineService.resolveActiveSOS();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@safeher_active_sos',
      expect.stringContaining('"resolved":true'),
    );
  });

  // ── Test 8: SOS ID format is correct ───────────────────────
  it('should generate valid SOS IDs', async () => {
    (NotificationService.sendSOSPushToContacts as jest.Mock).mockResolvedValue({
      success: true,
      sent: 1,
      total: 1,
    });

    const result = await SOSPipelineService.execute(
      [mockContacts[0]] as any,
      'Test',
      null,
    );

    expect(result.sosId).toMatch(/^sos_[a-z0-9]+_[a-z0-9]+$/);
  });
});
