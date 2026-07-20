/**
 * SafeHer — Firebase Cloud Functions (v2 API)
 * ═══════════════════════════════════════════════════════════
 *
 * Server-side emergency logic that runs reliably even when
 * the user's phone is offline, dead, or compromised.
 *
 * Functions:
 *  1. onSOSTriggered     — When SOS is written to RTDB, fan out alerts
 *  2. checkOverdueJourneys — Cron: every 5 min, indexed query
 *  3. sendEmergencyPush  — Auth+AppCheck-gated, rate-limited
 *  4. cleanupOldAlerts   — Cron: daily, remove resolved alerts > 30 days
 *  5. onNewDevice        — Track active devices for admin dashboard
 *
 * Deploy: cd functions && npm run deploy
 */
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.database();

// ── Types ────────────────────────────────────────────────────────
interface SOSEvent {
  _deviceId?: string;
  _platform?: string;
  _syncedAt?: string;
  _priority?: string;
  _uid?: string;
  latitude?: number;
  longitude?: number;
  message?: string;
  contactsNotified?: number;
  status?: string;
  type?: string;
}

interface JourneyRecord {
  destination: string;
  expectedAt: number; // epoch ms (replaces ISO string)
  status: string;
  contacts?: Array<{ name: string; phone: string; pushToken?: string }>;
  deviceId: string;
  ownerUid: string;
  alertedAt?: number;
}

// ── Helpers ──────────────────────────────────────────────────────
const isValidLatLng = (lat: unknown, lng: unknown): lat is number =>
  typeof lat === "number" && typeof lng === "number" &&
  lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_PER_WINDOW = 10;

async function checkRateLimit(uid: string, kind: string): Promise<boolean> {
  const ref = db.ref(`admin/rate_limits/${uid}/${kind}`);
  const result = await ref.transaction((current: { count: number; windowStart: number } | null) => {
    const now = Date.now();
    if (!current || now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
      return { count: 1, windowStart: now };
    }
    if (current.count >= RATE_LIMIT_MAX_PER_WINDOW) return; // abort transaction
    return { count: current.count + 1, windowStart: current.windowStart };
  });
  return result.committed;
}

// ═══════════════════════════════════════════════════════════════════
// 1. SOS TRIGGERED — fan out alerts to admin + contacts
// ═══════════════════════════════════════════════════════════════════
export const onSOSTriggered = functions.database
  .ref("/users/{uid}/sos_events/{eventId}")
  .onCreate(async (snapshot: any, context: any) => {
    const sosData = snapshot.val() as SOSEvent;
    const { uid, eventId } = context.params;

    // Validation
    if (sosData.latitude !== undefined &&
        !isValidLatLng(sosData.latitude, sosData.longitude)) {
      functions.logger.warn("Invalid SOS coordinates rejected", { uid, eventId });
      await snapshot.ref.remove();
      return null;
    }

    functions.logger.warn("🚨 SOS TRIGGERED", {
      uid, eventId,
      latitude: sosData.latitude,
      longitude: sosData.longitude,
      platform: sosData._platform,
    });

    // Server is the only writer for admin/active_sos (rules require admin token);
    // we mirror an admin-trusted copy here.
    await db.ref(`admin/active_sos/${eventId}`).set({
      _uid: uid,
      _deviceId: sosData._deviceId,
      _platform: sosData._platform,
      _syncedAt: sosData._syncedAt,
      latitude: sosData.latitude,
      longitude: sosData.longitude,
      status: "ACTIVE",
      needsResponse: true,
      serverReceivedAt: admin.database.ServerValue.TIMESTAMP,
    });

    // Atomic counter
    await db.ref("admin/statistics/total_sos_events")
      .transaction((current: number | null) => (current || 0) + 1);

    // Audit log
    await db.ref(`admin/sos_log/${eventId}`).set({
      uid,
      triggeredAt: sosData._syncedAt,
      serverReceivedAt: new Date().toISOString(),
      latitude: sosData.latitude,
      longitude: sosData.longitude,
    });

    return null;
  });

// ═══════════════════════════════════════════════════════════════════
// 2. CHECK OVERDUE JOURNEYS — runs every 5 min, indexed query
// ═══════════════════════════════════════════════════════════════════
//
// REQUIRES: an `admin/active_journeys` index keyed by journeyId,
// each entry carrying { ownerUid, expectedAt, deviceId }.
// Clients write to this index when they start/end a journey.
//
// This avoids loading every user's payload and scales linearly with
// the number of *active* journeys, not total users.
// ═══════════════════════════════════════════════════════════════════
export const checkOverdueJourneys = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async () => {
    const now = Date.now();

    const overdueSnap = await db.ref("admin/active_journeys")
      .orderByChild("expectedAt")
      .endAt(now)
      .limitToFirst(500)
      .once("value");

    if (!overdueSnap.exists()) return null;

    const promises: Promise<unknown>[] = [];

    overdueSnap.forEach((child: any) => {
      const journey = child.val() as JourneyRecord;
      const journeyId = child.key!;
      if (journey.status !== "active") return false;
      if (journey.alertedAt && now - journey.alertedAt < 10 * 60 * 1000) return false; // 10-min dedupe

      const overdueByMin = Math.round((now - journey.expectedAt) / 60000);
      functions.logger.warn("⏰ JOURNEY OVERDUE", {
        uid: journey.ownerUid, journeyId, destination: journey.destination, overdueByMin,
      });

      promises.push(
        db.ref(`users/${journey.ownerUid}/journeys/${journeyId}/status`).set("overdue"),
        db.ref(`admin/active_journeys/${journeyId}/alertedAt`).set(now),
        db.ref(`admin/overdue_journeys/${journeyId}`).set({
          uid: journey.ownerUid,
          destination: journey.destination,
          expectedAt: journey.expectedAt,
          overdueByMinutes: overdueByMin,
          detectedAt: now,
        }),
      );

      if (journey.contacts) {
        for (const contact of journey.contacts) {
          if (!contact.pushToken) continue;
          promises.push(
            admin.messaging().send({
              token: contact.pushToken,
              notification: {
                title: "⚠️ Journey Overdue Alert",
                body: `A SafeHer user hasn't arrived at "${journey.destination}" on time. Please check on them.`,
              },
              data: { type: "JOURNEY_OVERDUE", journeyId, uid: journey.ownerUid },
              android: {
                priority: "high",
                notification: { channelId: "sos_channel", priority: "max", sound: "default" },
              },
            }).catch((e: unknown) => functions.logger.error("Push send failed", e)),
          );
        }
      }
      return false;
    });

    await Promise.allSettled(promises);
    return null;
  });

// ═══════════════════════════════════════════════════════════════════
// 3. SEND EMERGENCY PUSH — auth-gated, App Check enforced, rate-limited
// ═══════════════════════════════════════════════════════════════════
export const sendEmergencyPush = functions
  .runWith({ enforceAppCheck: true })
  .https.onCall(async (data: any, context: any) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Sign in required.");
    }
    const uid = context.auth.uid;

    const { tokens, title, body, payload } = (data ?? {}) as {
      tokens?: unknown;
      title?: unknown;
      body?: unknown;
      payload?: Record<string, string>;
    };

    if (!Array.isArray(tokens) || tokens.length === 0 || tokens.length > 20) {
      throw new functions.https.HttpsError("invalid-argument", "Provide 1-20 push tokens.");
    }
    if (typeof title !== "string" || title.length > 120) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid title.");
    }
    if (typeof body !== "string" || body.length > 500) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid body.");
    }

    const allowed = await checkRateLimit(uid, "push");
    if (!allowed) {
      throw new functions.https.HttpsError("resource-exhausted", "Rate limit exceeded.");
    }

    // Verify each token belongs to a contact registered under this uid.
    const tokensSnap = await db.ref(`users/${uid}/contact_push_tokens`).once("value");
    const allowedTokens = new Set<string>();
    if (tokensSnap.exists()) {
      const obj = tokensSnap.val() as Record<string, string>;
      Object.values(obj).forEach((t) => { if (typeof t === "string") allowedTokens.add(t); });
    }

    const validTokens = (tokens as unknown[])
      .filter((t): t is string => typeof t === "string" && allowedTokens.has(t));

    if (validTokens.length === 0) {
      throw new functions.https.HttpsError("permission-denied", "No tokens are registered for this user.");
    }

    const results = { sent: 0, failed: 0, errors: [] as string[] };
    await Promise.all(validTokens.map(async (token) => {
      try {
        await admin.messaging().send({
          token,
          notification: { title, body },
          data: payload || {},
          android: {
            priority: "high",
            notification: {
              channelId: "sos_channel",
              priority: "max",
              sound: "default",
              defaultVibrateTimings: false,
              vibrateTimingsMillis: [0, 500, 200, 500],
            },
          },
          apns: {
            payload: { aps: { sound: "default", badge: 1, "content-available": 1 } },
            headers: { "apns-priority": "10" },
          },
        });
        results.sent++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(e?.message ?? "unknown");
      }
    }));

    return results;
  });

// ═══════════════════════════════════════════════════════════════════
// 4. CLEANUP OLD ALERTS — runs daily at 3 AM IST
// ═══════════════════════════════════════════════════════════════════
export const cleanupOldAlerts = functions.pubsub
  .schedule("every day 03:00")
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const cutoffIso = new Date(cutoff).toISOString();

    // Page through resolved active_sos
    const oldSosSnap = await db.ref("admin/active_sos")
      .orderByChild("resolvedAt")
      .endAt(cutoffIso)
      .limitToFirst(1000)
      .once("value");
    const sosUpdates: Record<string, null> = {};
    oldSosSnap.forEach((c: any) => {
      const v = c.val() as { status?: string };
      if (v.status === "RESOLVED") sosUpdates[`admin/active_sos/${c.key}`] = null;
      return false;
    });
    if (Object.keys(sosUpdates).length > 0) {
      await db.ref().update(sosUpdates);
      functions.logger.info(`Cleaned ${Object.keys(sosUpdates).length} resolved alerts`);
    }

    // Old overdue journeys
    const oldJourneysSnap = await db.ref("admin/overdue_journeys")
      .orderByChild("detectedAt")
      .endAt(cutoff)
      .limitToFirst(1000)
      .once("value");
    const journeyUpdates: Record<string, null> = {};
    oldJourneysSnap.forEach((c: any) => {
      journeyUpdates[`admin/overdue_journeys/${c.key}`] = null;
      return false;
    });
    if (Object.keys(journeyUpdates).length > 0) {
      await db.ref().update(journeyUpdates);
      functions.logger.info(`Cleaned ${Object.keys(journeyUpdates).length} overdue journeys`);
    }

    // Expire stale live_tracking sessions
    const liveSnap = await db.ref("live_tracking")
      .orderByChild("expiresAt")
      .endAt(Date.now())
      .limitToFirst(1000)
      .once("value");
    const liveUpdates: Record<string, null> = {};
    liveSnap.forEach((c: any) => { liveUpdates[`live_tracking/${c.key}`] = null; return false; });
    if (Object.keys(liveUpdates).length > 0) {
      await db.ref().update(liveUpdates);
      functions.logger.info(`Cleaned ${Object.keys(liveUpdates).length} expired live sessions`);
    }

    return null;
  });

// ═══════════════════════════════════════════════════════════════════
// 5. DEVICE REGISTRATION — track active devices for admin
// ═══════════════════════════════════════════════════════════════════
export const onNewDevice = functions.database
  .ref("/admin/devices/{uid}")
  .onWrite(async (change: any) => {
    return null;
  });

// ═══════════════════════════════════════════════════════════════════
// 6. ON CASE ASSIGNED — notify assigned officer
// ═══════════════════════════════════════════════════════════════════
export const onCaseAssigned = functions.database
  .ref("/case_assignments/{caseId}")
  .onCreate(async (snapshot: any, context: any) => {
    const data = snapshot.val();
    const { caseId } = context.params;
    if (!data || !data.officerId) return null;

    // Fetch officer's push token
    const officerSnap = await db.ref(`officers/${data.officerId}`).once("value");
    if (!officerSnap.exists()) return null;

    const officer = officerSnap.val();
    if (!officer.pushToken) return null;

    // Send push notification to officer
    await admin.messaging().send({
      token: officer.pushToken,
      notification: {
        title: "🚨 Emergency Case Assigned",
        body: `You have been assigned to Case ${caseId}. Respond immediately.`,
      },
      data: { type: "CASE_ASSIGNED", caseId, sosEventId: data.sosEventId },
      android: {
        priority: "high",
        notification: { channelId: "sos_channel", priority: "max", sound: "default" },
      },
    }).catch((e: unknown) => functions.logger.error("Officer push failed", e));

    return null;
  });

// ═══════════════════════════════════════════════════════════════════
// 7. ON CASE RESPONSE UPDATE — notify user & sync status
// ═══════════════════════════════════════════════════════════════════
export const onCaseResponseUpdate = functions.database
  .ref("/case_responses/{caseId}")
  .onWrite(async (change: any, context: any) => {
    const { caseId } = context.params;
    if (!change.after.exists()) return null;

    const data = change.after.val();
    const status = data.status; // EN_ROUTE, ON_SCENE, RESOLVED, etc.

    // Get case assignment details
    const assignSnap = await db.ref(`case_assignments/${caseId}`).once("value");
    if (!assignSnap.exists()) return null;

    const assignment = assignSnap.val();
    const sosEventId = assignment.sosEventId;

    // Find victim's UID by searching active_sos
    const sosSnap = await db.ref(`admin/active_sos/${sosEventId}`).once("value");
    if (!sosSnap.exists()) return null;

    const sosEvent = sosSnap.val();
    const uid = sosEvent._uid;

    const promises: Promise<unknown>[] = [
      // Sync status to active_sos
      db.ref(`admin/active_sos/${sosEventId}/status`).set(status),
      // Sync status to user's local events list
      db.ref(`users/${uid}/sos_events/${sosEventId}/status`).set(status),
    ];

    if (status === "RESOLVED") {
      promises.push(
        db.ref(`admin/active_sos/${sosEventId}/resolvedAt`).set(new Date().toISOString()),
        db.ref(`admin/active_sos/${sosEventId}/status`).set("RESOLVED"),
        db.ref(`users/${uid}/sos_events/${sosEventId}/status`).set("RESOLVED")
      );
    }

    await Promise.allSettled(promises);
    return null;
  });

// ═══════════════════════════════════════════════════════════════════
// 8. GENERATE ANALYTICS — hourly scheduled stats
// ═══════════════════════════════════════════════════════════════════
export const generateAnalytics = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async () => {
    const [usersSnap, casesSnap, journeysSnap, officersSnap] = await Promise.all([
      db.ref("users").once("value"),
      db.ref("admin/sos_log").once("value"),
      db.ref("admin/active_journeys").once("value"),
      db.ref("officers").once("value"),
    ]);

    const totalUsers = usersSnap.numChildren();
    const totalSOS = casesSnap.numChildren();
    const activeJourneys = journeysSnap.numChildren();
    const totalOfficers = officersSnap.numChildren();

    // Update admin analytics statistics node
    await db.ref("admin/statistics").update({
      totalUsers,
      totalSOSEvents: totalSOS,
      activeJourneys,
      totalOfficers,
      lastGeneratedAt: admin.database.ServerValue.TIMESTAMP,
    });

    return null;
  });

// ═══════════════════════════════════════════════════════════════════
// 9. ASSIGN CASE TO NEAREST OFFICER — callable dispatch tool
// ═══════════════════════════════════════════════════════════════════
export const assignCaseToNearestOfficer = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Admin auth required.");
  }

  const { sosEventId } = data as { sosEventId: string };
  if (!sosEventId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing sosEventId.");
  }

  // Fetch SOS location
  const sosSnap = await db.ref(`admin/active_sos/${sosEventId}`).once("value");
  if (!sosSnap.exists()) {
    throw new functions.https.HttpsError("not-found", "Case not found.");
  }
  const sos = sosSnap.val();
  if (sos.latitude === undefined || sos.longitude === undefined) {
    throw new functions.https.HttpsError("failed-precondition", "Case missing location coordinates.");
  }

  // Fetch available officers
  const officersSnap = await db.ref("officers").once("value");
  if (!officersSnap.exists()) {
    throw new functions.https.HttpsError("not-found", "No officers registered.");
  }

  let nearestOfficerId: string | null = null;
  let minDistance = Infinity;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const dist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  officersSnap.forEach((child: any) => {
    const o = child.val();
    if (o.status === "available" && o.location) {
      const d = dist(sos.latitude, sos.longitude, o.location.latitude, o.location.longitude);
      if (d < minDistance) {
        minDistance = d;
        nearestOfficerId = child.key;
      }
    }
    return false;
  });

  if (!nearestOfficerId) {
    throw new functions.https.HttpsError("unavailable", "No available officers nearby.");
  }

  const caseId = `case_${Date.now()}`;
  await db.ref(`case_assignments/${caseId}`).set({
    sosEventId,
    officerId: nearestOfficerId,
    status: "assigned",
    assignedAt: new Date().toISOString(),
    assignedBy: context.auth.uid,
  });

  return { success: true, caseId, officerId: nearestOfficerId, distanceKm: minDistance };
});

// ═══════════════════════════════════════════════════════════════════
// 6. SOS DELIVERY CONFIRMATION
//    When a guardian's device ACKs the push, write confirmation back
//    to the user's SOS event so the client-side pipeline can detect it.
// ═══════════════════════════════════════════════════════════════════
exports.confirmSOSDelivery = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { sosId, targetUid } = data;
  if (!sosId || typeof sosId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "sosId is required.");
  }
  if (!targetUid || typeof targetUid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "targetUid is required.");
  }

  // Validate sosId format to prevent injection
  if (!/^sos_[a-z0-9_]+$/.test(sosId)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid sosId format.");
  }

  // Write delivery confirmation to the target user's SOS event
  const confirmRef = db.ref(`users/${targetUid}/sos_events/${sosId}/delivery_confirmations/${context.auth.uid}`);
  await confirmRef.set({
    confirmedBy: context.auth.uid,
    confirmedAt: new Date().toISOString(),
    method: data.method || "push",
  });

  // Also write a summary flag for easy polling
  await db.ref(`users/${targetUid}/sos_events/${sosId}/delivery_confirmed`).set(true);

  functions.logger.info(`SOS delivery confirmed: ${sosId} by ${context.auth.uid} for user ${targetUid}`);

  return { success: true, sosId, confirmedAt: new Date().toISOString() };
});

// ═══════════════════════════════════════════════════════════════════
// 7. EXPIRE LIVE TRACKING SESSIONS (Location Privacy)
//    Cron: runs every minute. Hard-deletes sessions past expiresAt.
//    Prevents indefinite location tracking even if client fails to stop.
// ═══════════════════════════════════════════════════════════════════
exports.expireLiveSessions = functions.pubsub.schedule("every 1 minutes").onRun(async () => {
  const now = Date.now();

  try {
    const sessionsRef = db.ref("live_tracking");
    const snapshot = await sessionsRef.orderByChild("expiresAt").endAt(now).once("value");

    if (!snapshot.exists()) return null;

    const updates: Record<string, null> = {};
    let expiredCount = 0;

    snapshot.forEach((child: any) => {
      const session = child.val();
      if (session.isActive && session.expiresAt <= now) {
        updates[`live_tracking/${child.key}`] = null;
        expiredCount++;
      }
      return false;
    });

    if (expiredCount > 0) {
      await db.ref().update(updates);
      functions.logger.info(`Expired ${expiredCount} live tracking session(s)`);
    }

    return null;
  } catch (error) {
    functions.logger.error("expireLiveSessions error:", error);
    return null;
  }
});

// ═══════════════════════════════════════════════════════════════════
// CRIME ZONE CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════

/**
 * recalculateZones — Cron (every 6 hours)
 * Queries all SOS events from the last 90 days, clusters them geographically
 * (500m radius), and auto-classifies zones as Red/Yellow/Green.
 *
 * Red:    5+ incidents within 500m radius
 * Yellow: 2-4 incidents within 500m radius
 * Green:  0-1 incidents (default)
 */
exports.recalculateZones = functions.pubsub
  .schedule("every 6 hours")
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

    try {
      // Fetch all SOS events from last 90 days
      const sosRef = db.ref("sos_events");
      const snapshot = await sosRef.orderByChild("_syncedAt").startAt(new Date(ninetyDaysAgo).toISOString()).once("value");

      if (!snapshot.exists()) {
        functions.logger.info("recalculateZones: No SOS events in last 90 days");
        return null;
      }

      // Collect all SOS locations
      const locations: Array<{ lat: number; lng: number; timestamp: string }> = [];
      snapshot.forEach((child: any) => {
        const event = child.val();
        if (isValidLatLng(event.latitude, event.longitude)) {
          locations.push({
            lat: event.latitude,
            lng: event.longitude,
            timestamp: event._syncedAt || "",
          });
        }
        return false;
      });

      if (locations.length === 0) return null;

      // Simple clustering: group by 500m proximity
      const CLUSTER_RADIUS_M = 500;
      const clusters: Array<{ centerLat: number; centerLng: number; count: number; lastIncident: string }> = [];

      for (const loc of locations) {
        let foundCluster = false;
        for (const cluster of clusters) {
          const dist = haversineDistanceFn(loc.lat, loc.lng, cluster.centerLat, cluster.centerLng);
          if (dist <= CLUSTER_RADIUS_M) {
            cluster.count++;
            if (loc.timestamp > cluster.lastIncident) cluster.lastIncident = loc.timestamp;
            // Update center as running average
            cluster.centerLat = (cluster.centerLat * (cluster.count - 1) + loc.lat) / cluster.count;
            cluster.centerLng = (cluster.centerLng * (cluster.count - 1) + loc.lng) / cluster.count;
            foundCluster = true;
            break;
          }
        }
        if (!foundCluster) {
          clusters.push({ centerLat: loc.lat, centerLng: loc.lng, count: 1, lastIncident: loc.timestamp });
        }
      }

      // Write zones to RTDB
      const zonesUpdate: Record<string, any> = {};
      for (let i = 0; i < clusters.length; i++) {
        const c = clusters[i];
        const type = c.count >= 5 ? "red" : c.count >= 2 ? "yellow" : "green";
        const zoneId = `zone_${i}_${encodeGeohashFn(c.centerLat, c.centerLng, 5)}`;
        zonesUpdate[zoneId] = {
          centerLat: c.centerLat,
          centerLng: c.centerLng,
          radiusMeters: CLUSTER_RADIUS_M,
          type,
          incidentCount: c.count,
          lastIncidentAt: c.lastIncident,
          lastUpdated: new Date().toISOString(),
          geohash: encodeGeohashFn(c.centerLat, c.centerLng, 6),
        };
      }

      await db.ref("crime_zones").set(zonesUpdate);
      functions.logger.info(`recalculateZones: Classified ${clusters.length} zones (${locations.length} events)`);
      return null;
    } catch (error) {
      functions.logger.error("recalculateZones error:", error);
      return null;
    }
  });

/**
 * onZoneEntry — RTDB trigger
 * When a user's current_zone changes to 'red', push notification to all guardians.
 */
exports.onZoneEntry = functions.database
  .ref("users/{uid}/current_zone/type")
  .onWrite(async (change, context) => {
    const newZone = change.after.val();
    const oldZone = change.before.val();
    const uid = context.params.uid;

    // Only alert on zone escalation to red
    if (newZone !== "red" || oldZone === "red") return null;

    try {
      // Get user's guardian contacts
      const userRef = db.ref(`users/${uid}`);
      const userSnap = await userRef.once("value");
      if (!userSnap.exists()) return null;

      const userData = userSnap.val();
      const contacts = userData.emergencyContacts || [];
      const userName = userData.displayName || "SafeHer User";

      // Get zone location
      const zoneData = (await db.ref(`users/${uid}/current_zone`).once("value")).val();
      const lat = zoneData?.lat || 0;
      const lng = zoneData?.lng || 0;

      // Send push to guardians
      const tokens: string[] = [];
      for (const contact of contacts) {
        if (contact.pushToken) tokens.push(contact.pushToken);
      }

      if (tokens.length > 0) {
        const message = {
          notification: {
            title: "⚠️ High-Risk Area Alert",
            body: `${userName} has entered a high-risk area. Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          },
          data: {
            type: "zone_alert",
            zone: "red",
            uid,
            lat: String(lat),
            lng: String(lng),
          },
        };

        const sendResults = await Promise.allSettled(
          tokens.map(token => admin.messaging().send({ ...message, token })),
        );

        const sent = sendResults.filter(r => r.status === "fulfilled").length;
        functions.logger.info(`onZoneEntry: Sent ${sent}/${tokens.length} guardian alerts for ${uid}`);
      }

      return null;
    } catch (error) {
      functions.logger.error("onZoneEntry error:", error);
      return null;
    }
  });

// ═══════════════════════════════════════════════════════════════════
// COMMUNITY SOS BROADCAST
// ═══════════════════════════════════════════════════════════════════

/**
 * broadcastCommunityAlert — RTDB trigger
 * When a new community_alert is created, find nearby users via geohash
 * prefix matching and send them push notifications.
 */
exports.broadcastCommunityAlert = functions.database
  .ref("community_alerts/{alertId}")
  .onCreate(async (snapshot, context) => {
    const alert = snapshot.val();
    const alertId = context.params.alertId;

    if (!alert || !alert.geohash || !alert.isActive) return null;

    try {
      // Get all users with location data
      const usersRef = db.ref("users");
      const usersSnap = await usersRef.once("value");
      if (!usersSnap.exists()) return null;

      const geohashPrefix = alert.geohash.substring(0, 4); // ~20km precision
      const tokens: string[] = [];
      let matchCount = 0;

      usersSnap.forEach((child: any) => {
        const user = child.val();
        const uid = child.key;

        // Skip the victim
        if (uid === alert.victimUid) return false;

        // Check geohash proximity
        const userZone = user.current_zone;
        if (userZone?.geohash?.startsWith(geohashPrefix)) {
          // Refined check: calculate actual distance
          if (userZone.lat && userZone.lng) {
            const dist = haversineDistanceFn(
              alert.latitude, alert.longitude,
              userZone.lat, userZone.lng,
            );
            if (dist <= 3000) { // 3km radius
              if (user.fcmToken) {
                tokens.push(user.fcmToken);
                matchCount++;
              }
            }
          }
        }
        return false;
      });

      if (tokens.length > 0) {
        const distText = "nearby";
        const message = {
          notification: {
            title: "🚨 Someone Nearby Needs Help!",
            body: `${alert.victimName || "Someone"} triggered SOS ${distText}. Tap to see how you can help.`,
          },
          data: {
            type: "community_sos",
            alertId,
            latitude: String(alert.latitude),
            longitude: String(alert.longitude),
            victimName: alert.victimName || "Someone",
          },
          android: {
            priority: "high" as const,
            notification: {
              channelId: "sos_alerts",
              priority: "max" as const,
              sound: "sos_alert",
            },
          },
        };

        // Send in batches of 100
        for (let i = 0; i < tokens.length; i += 100) {
          const batch = tokens.slice(i, i + 100);
          await Promise.allSettled(
            batch.map(token => admin.messaging().send({ ...message, token })),
          );
        }

        functions.logger.info(`broadcastCommunityAlert: Notified ${matchCount} nearby users for alert ${alertId}`);
      } else {
        functions.logger.info(`broadcastCommunityAlert: No nearby users found for alert ${alertId}`);
      }

      return null;
    } catch (error) {
      functions.logger.error("broadcastCommunityAlert error:", error);
      return null;
    }
  });

/**
 * expireCommunityAlerts — Cron (every 5 minutes)
 * Cleans up community alerts that have expired (>30 min old).
 */
exports.expireCommunityAlerts = functions.pubsub
  .schedule("every 5 minutes")
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const now = Date.now();

    try {
      const alertsRef = db.ref("community_alerts");
      const snapshot = await alertsRef.orderByChild("expiresAt").endAt(now).once("value");

      if (!snapshot.exists()) return null;

      const updates: Record<string, any> = {};
      let expiredCount = 0;

      snapshot.forEach((child: any) => {
        const alert = child.val();
        if (alert.isActive && alert.expiresAt <= now) {
          updates[`community_alerts/${child.key}/isActive`] = false;
          updates[`community_alerts/${child.key}/resolvedAt`] = now;
          expiredCount++;
        }
        return false;
      });

      if (expiredCount > 0) {
        await db.ref().update(updates);
        functions.logger.info(`expireCommunityAlerts: Expired ${expiredCount} alert(s)`);
      }

      return null;
    } catch (error) {
      functions.logger.error("expireCommunityAlerts error:", error);
      return null;
    }
  });

// ── Utility functions for Cloud Functions ────────────────────────
function haversineDistanceFn(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const BASE32_CHARS = "0123456789bcdefghjkmnpqrstuvwxyz";

function encodeGeohashFn(lat: number, lng: number, precision: number = 6): string {
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = "";
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
      hash += BASE32_CHARS[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}
