/**
 * ProximitySOSService — Community SOS Broadcast
 * ═══════════════════════════════════════════════════════════
 *
 * When an SOS is triggered, broadcasts the distress signal to all SafeHer
 * users within a 2-3km radius. Victim's location is continuously shared
 * with nearby helpers who respond.
 *
 * Data flow:
 *  1. SOS triggers → write to `community_alerts/{alertId}` with geohash
 *  2. Cloud Function finds nearby users via geohash prefix match
 *  3. Push notifications sent to users within 3km
 *  4. Helpers see NearbySOSScreen with live victim location
 *  5. Helper taps "I'm on my way" → writes to `community_alerts/{alertId}/helpers/{uid}`
 *  6. Victim sees approaching helpers on their map
 *  7. Alert auto-expires after 30 minutes
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '../utils/logger';
import CrimeZoneService from './CrimeZoneService';

// ── Types ────────────────────────────────────────────────────────
export interface CommunityAlert {
  id: string;
  victimUid: string;
  victimName: string; // First name only for privacy
  message: string;
  latitude: number;
  longitude: number;
  geohash: string;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
  sosId: string;
  liveLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: number;
  };
  helpers?: Record<string, HelperResponse>;
}

export interface HelperResponse {
  uid: string;
  name: string;
  latitude: number;
  longitude: number;
  respondedAt: number;
  status: 'responding' | 'arrived' | 'cancelled';
  distanceMeters: number;
}

export interface NearbyAlertNotification {
  alertId: string;
  victimName: string;
  distanceMeters: number;
  direction: string; // N, NE, E, SE, S, SW, W, NW
  message: string;
  latitude: number;
  longitude: number;
}

// ── Constants ────────────────────────────────────────────────────
const STORAGE_KEYS = {
  USER_LOCATION: '@safeher_user_location_for_proximity',
  ACTIVE_RESPONSES: '@safeher_active_helper_responses',
} as const;

const PROXIMITY_RADIUS_METERS = 3000; // 3km
const ALERT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const LOCATION_UPDATE_INTERVAL_MS = 5000; // 5s during active SOS

// ── State ────────────────────────────────────────────────────────
let _db: any = null;
let _locationUpdateInterval: ReturnType<typeof setInterval> | null = null;
let _alertListener: (() => void) | null = null;
let _onNearbyAlert: ((alert: NearbyAlertNotification) => void) | null = null;

const getDB = async () => {
  if (_db) return _db;
  try {
    const mod = await import('firebase/database');
    const { getApp } = await import('firebase/app');
    const app = getApp();
    _db = { ...mod, app };
    return _db;
  } catch (e) {
    Logger.error('[ProximitySOS] Firebase import error:', e);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════

const ProximitySOSService = {
  /**
   * Broadcast an SOS alert to nearby users.
   * Called from SOSPipelineService after initial delivery.
   */
  async broadcastAlert(
    sosId: string,
    victimUid: string,
    victimName: string,
    message: string,
    latitude: number,
    longitude: number,
  ): Promise<{ success: boolean; alertId?: string; error?: string }> {
    try {
      const db = await getDB();
      if (!db) return { success: false, error: 'No database connection' };

      const { getDatabase, ref, set, push } = db;
      const database = getDatabase(db.app);

      const alertsRef = ref(database, 'community_alerts');
      const newAlertRef = push(alertsRef);
      const alertId = newAlertRef.key;

      const alert: CommunityAlert = {
        id: alertId,
        victimUid,
        victimName: victimName.split(' ')[0] || 'User', // First name only
        message,
        latitude,
        longitude,
        geohash: CrimeZoneService.encodeGeohash(latitude, longitude, 5),
        createdAt: Date.now(),
        expiresAt: Date.now() + ALERT_TTL_MS,
        isActive: true,
        sosId,
        liveLocation: {
          latitude,
          longitude,
          timestamp: Date.now(),
        },
      };

      await set(newAlertRef, alert);
      Logger.log(`[ProximitySOS] Alert broadcast: ${alertId} at geohash ${alert.geohash}`);

      // Start continuous location updates for victim
      this._startVictimLocationUpdates(alertId, victimUid, database, ref);

      return { success: true, alertId };
    } catch (e: any) {
      Logger.error('[ProximitySOS] Broadcast error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Respond to a nearby SOS as a helper.
   */
  async respondToAlert(
    alertId: string,
    helperUid: string,
    helperName: string,
    helperLat: number,
    helperLng: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDB();
      if (!db) return { success: false, error: 'No database connection' };

      const { getDatabase, ref, set } = db;
      const database = getDatabase(db.app);

      // Get victim location to calculate distance
      const { get } = db;
      const alertRef = ref(database, `community_alerts/${alertId}`);
      const alertSnap = await get(alertRef);
      if (!alertSnap.exists()) return { success: false, error: 'Alert not found' };

      const alertData = alertSnap.val();
      const distance = CrimeZoneService.haversineDistance(
        helperLat, helperLng,
        alertData.latitude, alertData.longitude,
      );

      const helperRef = ref(database, `community_alerts/${alertId}/helpers/${helperUid}`);
      const response: HelperResponse = {
        uid: helperUid,
        name: helperName.split(' ')[0] || 'Helper',
        latitude: helperLat,
        longitude: helperLng,
        respondedAt: Date.now(),
        status: 'responding',
        distanceMeters: Math.round(distance),
      };

      await set(helperRef, response);

      // Persist locally
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_RESPONSES, JSON.stringify({
        alertId,
        respondedAt: Date.now(),
      }));

      Logger.log(`[ProximitySOS] Helper ${helperUid} responding to ${alertId} (${Math.round(distance)}m away)`);
      return { success: true };
    } catch (e: any) {
      Logger.error('[ProximitySOS] Respond error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Update helper's live location while responding.
   */
  async updateHelperLocation(
    alertId: string,
    helperUid: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    try {
      const db = await getDB();
      if (!db) return;

      const { getDatabase, ref } = db;
      const { update } = await import('firebase/database');
      const database = getDatabase(db.app);
      const helperRef = ref(database, `community_alerts/${alertId}/helpers/${helperUid}`);
      await update(helperRef, {
        latitude: lat,
        longitude: lng,
        lastUpdate: Date.now(),
      });
    } catch (e) {
      Logger.error('[ProximitySOS] Helper location update error:', e);
    }
  },

  /**
   * Cancel the community alert (when SOS is resolved).
   */
  async cancelAlert(alertId: string): Promise<void> {
    try {
      const db = await getDB();
      if (!db) return;

      const { getDatabase, ref } = db;
      const { update } = await import('firebase/database');
      const database = getDatabase(db.app);
      const alertRef = ref(database, `community_alerts/${alertId}`);
      await update(alertRef, { isActive: false, resolvedAt: Date.now() });

      this._stopVictimLocationUpdates();
      Logger.log(`[ProximitySOS] Alert cancelled: ${alertId}`);
    } catch (e) {
      Logger.error('[ProximitySOS] Cancel error:', e);
    }
  },

  /**
   * Start listening for nearby SOS alerts.
   * Called on app startup / foreground.
   */
  async startListening(
    userLat: number,
    userLng: number,
    onAlert: (alert: NearbyAlertNotification) => void,
  ): Promise<void> {
    _onNearbyAlert = onAlert;

    try {
      const db = await getDB();
      if (!db) return;

      const { getDatabase, ref, onValue } = db;
      const database = getDatabase(db.app);

      // Listen to community_alerts node
      const alertsRef = ref(database, 'community_alerts');
      const unsubscribe = onValue(alertsRef, (snapshot: any) => {
        if (!snapshot.exists()) return;

        const alerts = snapshot.val();
        const now = Date.now();

        Object.entries(alerts).forEach(([id, alert]: [string, any]) => {
          if (!alert.isActive || alert.expiresAt < now) return;

          const distance = CrimeZoneService.haversineDistance(
            userLat, userLng,
            alert.latitude, alert.longitude,
          );

          if (distance <= PROXIMITY_RADIUS_METERS) {
            const direction = this._getDirection(userLat, userLng, alert.latitude, alert.longitude);

            _onNearbyAlert?.({
              alertId: id,
              victimName: alert.victimName || 'Someone',
              distanceMeters: Math.round(distance),
              direction,
              message: alert.message || 'SOS Emergency',
              latitude: alert.latitude,
              longitude: alert.longitude,
            });
          }
        });
      });

      _alertListener = unsubscribe;
      Logger.log('[ProximitySOS] Started listening for nearby alerts');
    } catch (e) {
      Logger.error('[ProximitySOS] Start listening error:', e);
    }
  },

  /**
   * Stop listening for alerts.
   */
  stopListening(): void {
    if (_alertListener) {
      _alertListener();
      _alertListener = null;
    }
    _onNearbyAlert = null;
    Logger.log('[ProximitySOS] Stopped listening');
  },

  /**
   * Check if there are any active nearby alerts (one-time check).
   */
  async checkNearbyAlerts(
    userLat: number,
    userLng: number,
  ): Promise<NearbyAlertNotification[]> {
    try {
      const db = await getDB();
      if (!db) return [];

      const { getDatabase, ref, get } = db;
      const database = getDatabase(db.app);
      const alertsRef = ref(database, 'community_alerts');
      const snapshot = await get(alertsRef);

      if (!snapshot.exists()) return [];

      const alerts = snapshot.val();
      const now = Date.now();
      const nearby: NearbyAlertNotification[] = [];

      Object.entries(alerts).forEach(([id, alert]: [string, any]) => {
        if (!alert.isActive || alert.expiresAt < now) return;

        const distance = CrimeZoneService.haversineDistance(
          userLat, userLng,
          alert.latitude, alert.longitude,
        );

        if (distance <= PROXIMITY_RADIUS_METERS) {
          nearby.push({
            alertId: id,
            victimName: alert.victimName || 'Someone',
            distanceMeters: Math.round(distance),
            direction: this._getDirection(userLat, userLng, alert.latitude, alert.longitude),
            message: alert.message || 'SOS Emergency',
            latitude: alert.latitude,
            longitude: alert.longitude,
          });
        }
      });

      return nearby.sort((a, b) => a.distanceMeters - b.distanceMeters);
    } catch (e) {
      Logger.error('[ProximitySOS] Check nearby error:', e);
      return [];
    }
  },

  // ── Private helpers ──────────────────────────────────────────

  _startVictimLocationUpdates(
    alertId: string,
    _victimUid: string,
    database: any,
    ref: any,
  ): void {
    this._stopVictimLocationUpdates();

    _locationUpdateInterval = setInterval(async () => {
      try {
        const { getCurrentPositionAsync, Accuracy } = await import('expo-location');
        const loc = await getCurrentPositionAsync({ accuracy: Accuracy.High });

        const { update } = await import('firebase/database');
        const liveRef = ref(database, `community_alerts/${alertId}/liveLocation`);
        await update(liveRef, {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          timestamp: Date.now(),
        });
      } catch (e) {
        Logger.error('[ProximitySOS] Victim location update error:', e);
      }
    }, LOCATION_UPDATE_INTERVAL_MS);
  },

  _stopVictimLocationUpdates(): void {
    if (_locationUpdateInterval) {
      clearInterval(_locationUpdateInterval);
      _locationUpdateInterval = null;
    }
  },

  _getDirection(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
    const dLat = toLat - fromLat;
    const dLng = toLng - fromLng;
    const angle = Math.atan2(dLng, dLat) * 180 / Math.PI;

    if (angle >= -22.5 && angle < 22.5) return 'N';
    if (angle >= 22.5 && angle < 67.5) return 'NE';
    if (angle >= 67.5 && angle < 112.5) return 'E';
    if (angle >= 112.5 && angle < 157.5) return 'SE';
    if (angle >= 157.5 || angle < -157.5) return 'S';
    if (angle >= -157.5 && angle < -112.5) return 'SW';
    if (angle >= -112.5 && angle < -67.5) return 'W';
    return 'NW';
  },
};

export default ProximitySOSService;
