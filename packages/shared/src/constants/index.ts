/**
 * SafeHer Shared Constants
 * ═══════════════════════════════════════════════════════════
 * Storage keys, role definitions, and status enums shared
 * across mobile app, dashboard, and cloud functions.
 */

// ── Storage Keys (AsyncStorage / SecureStore) ──────────────

export const STORAGE_KEYS = {
  // Emergency data (encrypted)
  CONTACTS: '@safeher_contacts',
  SETTINGS: '@safeher_settings',
  SOS_MESSAGE: '@safeher_sos_message',
  SOS_HISTORY: '@safeher_sos_history',

  // Journey data
  JOURNEY: '@safeher_journey',
  JOURNEY_BREADCRUMBS: '@safeher_journey_breadcrumbs',
  JOURNEY_HISTORY: '@safeher_journey_history',

  // Auth data
  PIN_HASH: '@safeher_pin_hash',
  PIN_SALT: '@safeher_pin_salt',
  DURESS_HASH: '@safeher_duress_hash',
  DURESS_SALT: '@safeher_duress_salt',
  PIN_FAILS: '@safeher_pin_fails',
  PIN_LOCKED_UNTIL: '@safeher_pin_locked_until',
  PROFILE: '@safeher_profile',
  ONBOARDED: '@safeher_onboarded',
  BIOMETRIC: '@safeher_biometric',
  AUTH_METHOD: '@safeher_auth_method',
  SOCIAL_DATA: '@safeher_social_data',
  PROFILE_COMPLETE: '@safeher_profile_complete',

  // App state
  STEALTH: '@safeher_stealth',
  ONBOARDING_COMPLETE: '@safeher_onboarding_complete',
  SECURITY_SETUP_COMPLETE: '@safeher_security_setup_complete',
} as const;

// ── Firebase RTDB Paths ────────────────────────────────────

export const DB_PATHS = {
  // User data
  USERS: 'users',
  USER_SOS_EVENTS: (uid: string) => `users/${uid}/sos_events`,
  USER_PROFILE: (uid: string) => `users/${uid}/profile`,
  USER_JOURNEYS: (uid: string) => `users/${uid}/journeys`,
  USER_CONTACT_TOKENS: (uid: string) => `users/${uid}/contact_push_tokens`,

  // Admin data
  ADMIN: 'admin',
  ADMIN_ACTIVE_SOS: 'admin/active_sos',
  ADMIN_SOS_LOG: 'admin/sos_log',
  ADMIN_ACTIVE_JOURNEYS: 'admin/active_journeys',
  ADMIN_OVERDUE_JOURNEYS: 'admin/overdue_journeys',
  ADMIN_DEVICES: 'admin/devices',
  ADMIN_STATISTICS: 'admin/statistics',
  ADMIN_RATE_LIMITS: 'admin/rate_limits',

  // Police & cases
  POLICE_DEPARTMENTS: 'police_departments',
  OFFICERS: 'officers',
  CASE_ASSIGNMENTS: 'case_assignments',
  CASE_RESPONSES: 'case_responses',

  // Live tracking
  LIVE_TRACKING: 'live_tracking',

  // Incidents
  INCIDENTS: 'incidents',
} as const;

// ── User Roles ─────────────────────────────────────────────

export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  POLICE: 'police',
  GUARDIAN: 'guardian',
} as const;

// ── SOS Configuration ──────────────────────────────────────

export const SOS_CONFIG = {
  COOLDOWN_MS: 60_000,
  COUNTDOWN_DEFAULT: 5,
  LOCATION_UPDATE_INTERVAL_MS: 2 * 60 * 1000,
  MAX_HISTORY_ENTRIES: 50,
  LIVE_SHARE_TTL_MINUTES: 60,
} as const;

// ── Journey Configuration ──────────────────────────────────

export const JOURNEY_CONFIG = {
  BREADCRUMB_INTERVAL_MS: 5_000,
  BREADCRUMB_DISTANCE_M: 3,
  OVERDUE_CHECK_INTERVAL_MS: 15_000,
  MAX_HISTORY_ENTRIES: 20,
  PERSIST_EVERY_N_BREADCRUMBS: 10,
} as const;

// ── PIN Configuration ──────────────────────────────────────

export const PIN_CONFIG = {
  MIN_LENGTH: 4,
  MAX_LENGTH: 8,
  HASH_ROUNDS: 10_000,
  LOCK_AFTER_FAILS: 5,
  LOCK_DURATION_MS: 5 * 60 * 1000,
  PEPPER: 'safeher-pin-v1',
} as const;

// ── Emergency Helplines ────────────────────────────────────

export const HELPLINES = {
  INDIA: {
    POLICE: '100',
    WOMEN: '1091',
    AMBULANCE: '108',
    FIRE: '101',
    EMERGENCY: '112',
    CHILD: '1098',
    CYBER_CRIME: '1930',
  },
  US: {
    EMERGENCY: '911',
    DOMESTIC_VIOLENCE: '1-800-799-7233',
  },
} as const;

// ── Default Values ─────────────────────────────────────────

export const DEFAULT_SOS_MESSAGE =
  'EMERGENCY: I am in danger and need immediate help. Please track my location and contact authorities now. Sent from SafeHer.';

export const DEFAULT_EMERGENCY_SETTINGS = {
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
} as const;
