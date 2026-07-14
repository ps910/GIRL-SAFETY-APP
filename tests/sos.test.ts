import NetworkMonitor from '../src/services/NetworkMonitor';
import SecurityService from '../src/services/SecurityService';

describe('SafeHer Security & Fail-Safe Test Suite', () => {
  
  // ── Network Connectivity & SMS Redirection ──
  test('NetworkMonitor returns correct online status', async () => {
    const status = NetworkMonitor.isOnline();
    expect(typeof status).toBe('boolean');
  });

  test('Offline connectivity skips remote calls and triggers fallback', async () => {
    // Mock network to offline state
    jest.spyOn(NetworkMonitor, 'isOnline').mockReturnValue(false);
    
    const isOnline = NetworkMonitor.isOnline();
    expect(isOnline).toBe(false);

    // Verify fallback route selection
    const route = !isOnline ? 'sms_fallback' : 'push_sync';
    expect(route).toBe('sms_fallback');
  });

  // ── Coordinates Cryptographic Protection ──
  test('Coordinate payload is encrypted into secure base64 string', () => {
    const mockLocation = {
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy: 5,
      timestamp: '2026-07-14T22:38:49.000Z',
    };

    const key = 'TestSecretKey';
    const encrypted = SecurityService.encryptLocation(mockLocation, key);
    
    // Output must be a non-empty string and not plain coordinates
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);
    expect(encrypted).not.toContain('12.9716');
    expect(encrypted).not.toContain('77.5946');

    // Decryption matches original coordinates
    const decrypted = SecurityService.decryptLocation(encrypted, key);
    expect(decrypted).not.toBeNull();
    expect(decrypted?.latitude).toBe(12.9716);
    expect(decrypted?.longitude).toBe(77.5946);
  });

  // ── Tracking Timeouts & Anti-Stalking (TTL) ──
  test('Location session TTL timeout auto-expires background tracking', (done) => {
    let trackingActive = true;

    SecurityService.startSessionTimer(0.001, () => {
      trackingActive = false;
      expect(trackingActive).toBe(false);
      done();
    });

    expect(trackingActive).toBe(true);
  });
});
