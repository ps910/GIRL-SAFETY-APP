/**
 * SafeHer Shared Types
 * ═══════════════════════════════════════════════════════════
 * Canonical type definitions shared between mobile app,
 * web dashboard, and cloud functions.
 */

// ── User & Auth ────────────────────────────────────────────

export type AuthMethod =
  | 'google'
  | 'apple'
  | 'phone'
  | 'email'
  | 'pin'
  | 'biometric'
  | 'unknown';

export type UserRole = 'user' | 'admin' | 'police' | 'guardian';

export interface UserProfile {
  uid?: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  profilePicUri: string | null;
  bloodGroup: string;
  allergies: string;
  medicalConditions: string;
  medications: string;
  homeAddress: string;
  workAddress: string;
  collegeAddress: string;
  vehicleDetails: string;
  role?: UserRole;
  createdAt?: string;
  lastActive?: string;
}

// ── Emergency Contacts / Guardians ─────────────────────────

export type GuardianStatus =
  | 'added'
  | 'invited'
  | 'accepted'
  | 'verified'
  | 'active';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  tier: number;
  relationship?: string;
  status?: GuardianStatus;
  pushToken?: string;
  email?: string;
  profilePicUri?: string;
  invitedAt?: string;
  verifiedAt?: string;
  createdAt: string;
}

// ── Location ───────────────────────────────────────────────

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp?: string;
}

// ── SOS ────────────────────────────────────────────────────

export type SOSStatus = 'ACTIVE' | 'RESPONDING' | 'RESOLVED' | 'CANCELLED';

export type SOSDeliveryState =
  | 'idle'
  | 'sending'
  | 'sent'
  | 'unconfirmed'
  | 'failed';

export interface SOSEvent {
  id: string;
  uid: string;
  deviceId?: string;
  platform?: string;
  syncedAt: string;
  latitude?: number;
  longitude?: number;
  message?: string;
  contactsNotified?: number;
  status: SOSStatus;
  type: string;
  serverReceivedAt?: number;
  resolvedAt?: string;
  resolvedBy?: string;
  assignedOfficerId?: string;
}

export interface SOSDeliveryStatus {
  state: SOSDeliveryState;
  message: string;
  contactCount: number;
  method?: string;
  updatedAt?: string;
}

// ── Journey ────────────────────────────────────────────────

export type JourneyStatus = 'active' | 'completed' | 'overdue' | 'cancelled';

export interface Breadcrumb {
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number;
  altitude: number;
  timestamp: string;
  moving: boolean;
  distFromPrev: number;
}

export interface JourneyStats {
  distance: number;
  avgSpeed: number;
  maxSpeed: number;
}

export interface ActiveJourney {
  id?: string;
  active: boolean;
  destination: string;
  startTime: string;
  startLocation: LocationData | null;
  expectedArrival: string;
  minutesToArrive: number;
  ownerUid?: string;
  deviceId?: string;
}

export interface CompletedJourney extends ActiveJourney {
  completedAt: string;
  endLocation: LocationData | null;
  breadcrumbs: Breadcrumb[];
  stats: JourneyStats;
  status: JourneyStatus;
}

// ── Incident Reporting ─────────────────────────────────────

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'submitted' | 'under_review' | 'investigating' | 'resolved' | 'closed';

export interface IncidentReport {
  id: string;
  uid: string;
  title: string;
  description: string;
  location?: LocationData;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category?: string;
  evidenceIds?: string[];
  createdAt: string;
  updatedAt?: string;
  assignedOfficerId?: string;
}

// ── Police & Case Management ───────────────────────────────

export type OfficerStatus = 'available' | 'busy' | 'off_duty';

export interface PoliceDepartment {
  id: string;
  name: string;
  jurisdiction: string;
  address: string;
  phone: string;
  email?: string;
  location?: LocationData;
  createdAt: string;
}

export interface PoliceOfficer {
  id: string;
  uid: string;
  name: string;
  badge: string;
  rank: string;
  departmentId: string;
  phone: string;
  email: string;
  status: OfficerStatus;
  pushToken?: string;
  location?: LocationData;
  activeCaseCount: number;
  createdAt: string;
}

export type CaseStatus =
  | 'pending'
  | 'assigned'
  | 'dispatched'
  | 'en_route'
  | 'on_scene'
  | 'resolved'
  | 'closed';

export type CasePriority = 'low' | 'medium' | 'high' | 'critical';

export interface CaseAssignment {
  id: string;
  sosEventId: string;
  officerId: string;
  departmentId: string;
  status: CaseStatus;
  priority: CasePriority;
  assignedAt: string;
  assignedBy: string;
  respondedAt?: string;
  resolvedAt?: string;
  notes?: string;
}

export interface CaseResponse {
  id: string;
  caseId: string;
  officerId: string;
  action: string;
  status: CaseStatus;
  notes: string;
  location?: LocationData;
  timestamp: string;
}

// ── Evidence ───────────────────────────────────────────────

export type EvidenceType = 'audio' | 'video' | 'photo' | 'document';

export interface EvidenceMetadata {
  id: string;
  uid: string;
  type: EvidenceType;
  filename: string;
  size: number;
  encrypted: boolean;
  sosEventId?: string;
  createdAt: string;
  expiresAt?: string;
}

// ── Live Sharing ───────────────────────────────────────────

export interface LiveShareSession {
  sessionId: string;
  ownerUid: string;
  shareUrl?: string;
  isActive: boolean;
  expiresAt: number;
  purpose?: string;
  createdAt: string;
}

// ── Emergency Settings ─────────────────────────────────────

export interface EmergencySettings {
  shakeToSOS: boolean;
  autoLocationShare: boolean;
  sirenEnabled: boolean;
  countdownSeconds: number;
  autoCallPolice: boolean;
  autoRecordAudio: boolean;
  offlineSOS: boolean;
  hiddenMode: boolean;
  voiceActivation: boolean;
  inactivitySOSEnabled: boolean;
  inactivityTimeout: number;
  screamDetection: boolean;
  screamThreshold: number;
  autoPhotoCapture: boolean;
  journeyAlerts: boolean;
  panicWipeEnabled: boolean;
  backgroundLocationEnabled: boolean;
  persistentSOSNotification: boolean;
  volumeButtonSOS: boolean;
  liveLocationSharing: boolean;
  pushNotifications: boolean;
  countryOverride: string | null;
}

// ── Analytics (Dashboard) ──────────────────────────────────

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalSOSEvents: number;
  activeSOSCases: number;
  totalJourneys: number;
  activeJourneys: number;
  overdueJourneys: number;
  totalDevices: number;
  avgResponseTimeMs: number;
  totalOfficers: number;
  availableOfficers: number;
}

export interface SOSAnalytics {
  daily: { date: string; count: number }[];
  hourly: { hour: number; count: number }[];
  byStatus: Record<SOSStatus, number>;
  avgResponseTimeMs: number;
  heatmapPoints: { lat: number; lng: number; weight: number }[];
}

// ── Notifications ──────────────────────────────────────────

export type NotificationType =
  | 'sos_triggered'
  | 'sos_resolved'
  | 'journey_overdue'
  | 'case_assigned'
  | 'case_response'
  | 'guardian_invite'
  | 'check_in_reminder';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: string;
}
