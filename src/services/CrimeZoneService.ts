/**
 * CrimeZoneService — Safety Zone Classification
 * ═══════════════════════════════════════════════════════════
 *
 * Classifies geographic areas as Red (high risk), Yellow (moderate), Green (low/none)
 * based on historical SOS incident density.
 *
 * Data flow:
 *  1. Cloud Function `recalculateZones` clusters SOS events every 6h
 *  2. Zones stored in RTDB `crime_zones/` with geohash for fast lookup
 *  3. Mobile app caches zones locally, refreshes every 24h
 *  4. BackgroundLocationService calls `getZoneForLocation()` on each update
 *  5. If zone = Red → auto-alert guardians, heighten sensitivity
 *
 * Zone classification:
 *  - Red:    5+ incidents within 500m radius in last 90 days
 *  - Yellow: 2-4 incidents within 500m radius in last 90 days
 *  - Green:  0-1 incidents (default)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '../utils/logger';

// ── Types ────────────────────────────────────────────────────────
export type ZoneType = 'red' | 'yellow' | 'green';

export interface CrimeZone {
  id: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  type: ZoneType;
  incidentCount: number;
  lastIncidentAt: string;
  lastUpdated: string;
  /** Geohash prefix for fast proximity queries */
  geohash: string;
}

export interface ZoneCheckResult {
  zone: ZoneType;
  zoneId?: string;
  distance?: number; // meters from zone center
  incidentCount?: number;
  changed: boolean; // true if zone changed from last check
}

export interface ZoneAlertConfig {
  red: {
    sosCountdown: number;    // seconds (default: 3)
    voiceTrigger: boolean;   // auto-enable
    shakeSOS: boolean;       // auto-enable
    trackingInterval: number; // ms (default: 5000)
    notifyGuardians: boolean;
  };
  yellow: {
    sosCountdown: number;    // seconds (default: 5)
    voiceTrigger: boolean;
    shakeSOS: boolean;
    trackingInterval: number; // ms (default: 15000)
    notifyGuardians: boolean;
  };
  green: {
    sosCountdown: number;    // seconds (default: 5)
    voiceTrigger: boolean;
    shakeSOS: boolean;
    trackingInterval: number; // ms (default: 30000)
    notifyGuardians: boolean;
  };
}

// ── Constants ────────────────────────────────────────────────────
const STORAGE_KEYS = {
  ZONES_CACHE: '@safeher_crime_zones_cache',
  ZONES_CACHE_TIME: '@safeher_crime_zones_cache_time',
  CURRENT_ZONE: '@safeher_current_zone',
} as const;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const DEFAULT_ALERT_CONFIG: ZoneAlertConfig = {
  red: {
    sosCountdown: 3,
    voiceTrigger: true,
    shakeSOS: true,
    trackingInterval: 5000,
    notifyGuardians: true,
  },
  yellow: {
    sosCountdown: 5,
    voiceTrigger: false,
    shakeSOS: true,
    trackingInterval: 15000,
    notifyGuardians: false,
  },
  green: {
    sosCountdown: 5,
    voiceTrigger: false,
    shakeSOS: false,
    trackingInterval: 30000,
    notifyGuardians: false,
  },
};

// ── Geohash utilities (lightweight, no deps) ─────────────────────
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function encodeGeohash(lat: number, lng: number, precision: number = 6): string {
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = '';
  let isLng = true;
  let bit = 0;
  let ch = 0;

  while (hash.length < precision) {
    if (isLng) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) { ch |= (1 << (4 - bit)); minLng = mid; }
      else { maxLng = mid; }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) { ch |= (1 << (4 - bit)); minLat = mid; }
      else { maxLat = mid; }
    }
    isLng = !isLng;
    bit++;
    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── State ────────────────────────────────────────────────────────
let _cachedZones: CrimeZone[] = [];
let _currentZone: ZoneType = 'green';
let _currentZoneId: string | null = null;
let _db: any = null;

const getDB = async () => {
  if (_db) return _db;
  try {
    const { getDatabase, ref, get, onValue } = await import('firebase/database');
    const { getApp } = await import('firebase/app');
    const app = getApp();
    _db = { getDatabase, ref, get, onValue, app };
    return _db;
  } catch (e) {
    Logger.error('[CrimeZone] Firebase import error:', e);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════

const CrimeZoneService = {
  /**
   * Initialize: load cached zones from storage, refresh from server if stale.
   */
  async init(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.ZONES_CACHE);
      const cacheTime = await AsyncStorage.getItem(STORAGE_KEYS.ZONES_CACHE_TIME);
      const savedZone = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_ZONE);

      if (cached) {
        _cachedZones = JSON.parse(cached);
      }
      if (savedZone) {
        const parsed = JSON.parse(savedZone);
        _currentZone = parsed.type || 'green';
        _currentZoneId = parsed.id || null;
      }

      // Refresh if cache is stale
      const cacheAge = cacheTime ? Date.now() - parseInt(cacheTime, 10) : Infinity;
      if (cacheAge > CACHE_TTL_MS) {
        await this.refreshZones();
      }

      Logger.log(`[CrimeZone] Initialized with ${_cachedZones.length} cached zones`);
    } catch (e) {
      Logger.error('[CrimeZone] Init error:', e);
    }
  },

  /**
   * Refresh zones from Firebase RTDB.
   */
  async refreshZones(): Promise<void> {
    try {
      const db = await getDB();
      if (!db) return;

      const { getDatabase, ref, get } = db;
      const database = getDatabase(db.app);
      const zonesRef = ref(database, 'crime_zones');
      const snapshot = await get(zonesRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        _cachedZones = Object.entries(data).map(([id, zone]: [string, any]) => ({
          id,
          centerLat: zone.centerLat,
          centerLng: zone.centerLng,
          radiusMeters: zone.radiusMeters || 500,
          type: zone.type as ZoneType,
          incidentCount: zone.incidentCount || 0,
          lastIncidentAt: zone.lastIncidentAt || '',
          lastUpdated: zone.lastUpdated || '',
          geohash: zone.geohash || encodeGeohash(zone.centerLat, zone.centerLng),
        }));

        await AsyncStorage.setItem(STORAGE_KEYS.ZONES_CACHE, JSON.stringify(_cachedZones));
        await AsyncStorage.setItem(STORAGE_KEYS.ZONES_CACHE_TIME, Date.now().toString());
        Logger.log(`[CrimeZone] Refreshed ${_cachedZones.length} zones from server`);
      }
    } catch (e) {
      Logger.error('[CrimeZone] Refresh error:', e);
    }
  },

  /**
   * Check what zone a location falls in.
   * Returns the most severe zone (red > yellow > green) if multiple overlap.
   */
  getZoneForLocation(lat: number, lng: number): ZoneCheckResult {
    let worstZone: ZoneType = 'green';
    let matchedZone: CrimeZone | null = null;
    let closestDist = Infinity;

    for (const zone of _cachedZones) {
      const dist = haversineDistance(lat, lng, zone.centerLat, zone.centerLng);
      if (dist <= zone.radiusMeters) {
        const severity = zone.type === 'red' ? 3 : zone.type === 'yellow' ? 2 : 1;
        const currentSeverity = worstZone === 'red' ? 3 : worstZone === 'yellow' ? 2 : 1;

        if (severity > currentSeverity || (severity === currentSeverity && dist < closestDist)) {
          worstZone = zone.type;
          matchedZone = zone;
          closestDist = dist;
        }
      }
    }

    const changed = worstZone !== _currentZone;
    _currentZone = worstZone;
    _currentZoneId = matchedZone?.id || null;

    // Persist current zone
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_ZONE, JSON.stringify({
      type: worstZone,
      id: matchedZone?.id || null,
    })).catch(() => {});

    return {
      zone: worstZone,
      zoneId: matchedZone?.id,
      distance: matchedZone ? closestDist : undefined,
      incidentCount: matchedZone?.incidentCount,
      changed,
    };
  },

  /**
   * Get alert configuration for a zone type.
   */
  getAlertConfig(zone: ZoneType): ZoneAlertConfig[ZoneType] {
    return DEFAULT_ALERT_CONFIG[zone];
  },

  /**
   * Write current zone to RTDB for Cloud Function monitoring.
   */
  async publishCurrentZone(uid: string, lat: number, lng: number): Promise<void> {
    try {
      const db = await getDB();
      if (!db) return;

      const { getDatabase, ref } = db;
      const { update } = await import('firebase/database');
      const database = getDatabase(db.app);
      const userZoneRef = ref(database, `users/${uid}/current_zone`);
      await update(userZoneRef, {
        type: _currentZone,
        zoneId: _currentZoneId,
        lat,
        lng,
        updatedAt: Date.now(),
        geohash: encodeGeohash(lat, lng),
      });
    } catch (e) {
      Logger.error('[CrimeZone] Publish zone error:', e);
    }
  },

  /**
   * Get all cached zones for map display.
   */
  getCachedZones(): CrimeZone[] {
    return [..._cachedZones];
  },

  /**
   * Get current zone type.
   */
  getCurrentZone(): ZoneType {
    return _currentZone;
  },

  /**
   * Get zones near a location (for map rendering).
   */
  getZonesNear(lat: number, lng: number, radiusKm: number = 10): CrimeZone[] {
    return _cachedZones.filter(zone => {
      const dist = haversineDistance(lat, lng, zone.centerLat, zone.centerLng);
      return dist <= radiusKm * 1000;
    });
  },

  /**
   * Encode a geohash for a lat/lng (exposed for other services).
   */
  encodeGeohash,

  /**
   * Calculate distance between two coordinates in meters.
   */
  haversineDistance,
};

export default CrimeZoneService;
