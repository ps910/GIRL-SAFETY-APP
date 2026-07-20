/**
 * JourneyReplayScreen — Route replay with stop detection
 * ═══════════════════════════════════════════════════════════
 *
 * Shows completed journey with:
 *  - Full route drawn from breadcrumb coordinates
 *  - Stop markers with duration labels
 *  - Timeline view of route segments and stops
 *  - Stats: total distance, moving time, stopped time, speeds
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Screen, Header, Card, SectionTitle, Stat, T,
} from '../components/ui';

// ── Types ────────────────────────────────────────────────────────
interface Breadcrumb {
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number;
  altitude: number;
  timestamp: string;
  moving: boolean;
  distFromPrev: number;
  isStop?: boolean;
  stopDuration?: number;
  stopAddress?: string;
}

interface JourneyData {
  destination: string;
  startTime: string;
  completedAt?: string;
  breadcrumbs: Breadcrumb[];
  stats: {
    distance: number;
    avgSpeed: number;
    maxSpeed: number;
  };
  status: 'completed' | 'overdue';
}

interface StopInfo {
  index: number;
  latitude: number;
  longitude: number;
  startTime: string;
  duration: number; // ms
  address?: string;
}

interface RouteSegment {
  type: 'moving' | 'stop';
  startTime: string;
  endTime: string;
  duration: number; // ms
  distance?: number; // meters (for moving segments)
  avgSpeed?: number; // m/s (for moving segments)
  stopInfo?: StopInfo;
}

// ── Helpers ─────────────────────────────────────────────────────
function detectStops(breadcrumbs: Breadcrumb[]): StopInfo[] {
  const stops: StopInfo[] = [];
  let stopStart: number | null = null;

  for (let i = 0; i < breadcrumbs.length; i++) {
    const crumb = breadcrumbs[i];
    const isStationary = crumb.speed < 0.5 || crumb.isStop;

    if (isStationary && stopStart === null) {
      stopStart = i;
    } else if (!isStationary && stopStart !== null) {
      const startCrumb = breadcrumbs[stopStart];
      const duration = new Date(crumb.timestamp).getTime() - new Date(startCrumb.timestamp).getTime();

      // Only count as stop if > 60 seconds
      if (duration > 60000) {
        stops.push({
          index: stopStart,
          latitude: startCrumb.latitude,
          longitude: startCrumb.longitude,
          startTime: startCrumb.timestamp,
          duration,
          address: startCrumb.stopAddress,
        });
      }
      stopStart = null;
    }
  }

  // Handle stop at end of journey
  if (stopStart !== null && breadcrumbs.length > 0) {
    const startCrumb = breadcrumbs[stopStart];
    const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
    const duration = new Date(lastCrumb.timestamp).getTime() - new Date(startCrumb.timestamp).getTime();
    if (duration > 60000) {
      stops.push({
        index: stopStart,
        latitude: startCrumb.latitude,
        longitude: startCrumb.longitude,
        startTime: startCrumb.timestamp,
        duration,
        address: startCrumb.stopAddress,
      });
    }
  }

  return stops;
}

function buildTimeline(breadcrumbs: Breadcrumb[], stops: StopInfo[]): RouteSegment[] {
  if (breadcrumbs.length === 0) return [];

  const segments: RouteSegment[] = [];
  const stopSet = new Set(stops.map(s => s.index));
  let segStart = 0;

  for (let i = 1; i < breadcrumbs.length; i++) {
    const wasStop = stopSet.has(segStart);
    const isStop = stopSet.has(i);

    if (wasStop !== isStop || i === breadcrumbs.length - 1) {
      const startCrumb = breadcrumbs[segStart];
      const endCrumb = breadcrumbs[i];
      const duration = new Date(endCrumb.timestamp).getTime() - new Date(startCrumb.timestamp).getTime();

      if (wasStop) {
        const stop = stops.find(s => s.index === segStart);
        segments.push({
          type: 'stop',
          startTime: startCrumb.timestamp,
          endTime: endCrumb.timestamp,
          duration: stop?.duration || duration,
          stopInfo: stop,
        });
      } else {
        let distance = 0;
        for (let j = segStart + 1; j <= i; j++) {
          distance += breadcrumbs[j].distFromPrev || 0;
        }
        segments.push({
          type: 'moving',
          startTime: startCrumb.timestamp,
          endTime: endCrumb.timestamp,
          duration,
          distance,
          avgSpeed: duration > 0 ? distance / (duration / 1000) : 0,
        });
      }
      segStart = i;
    }
  }

  return segments;
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hr}h ${remMin}m`;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ═══════════════════════════════════════════════════════════════════
// SCREEN
// ═══════════════════════════════════════════════════════════════════

export default function JourneyReplayScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const journey: JourneyData = (route.params as any)?.journey;

  const breadcrumbs = journey?.breadcrumbs || [];
  const stops = useMemo(() => detectStops(breadcrumbs), [breadcrumbs]);
  const timeline = useMemo(() => buildTimeline(breadcrumbs, stops), [breadcrumbs, stops]);

  // Compute enhanced stats
  const totalDuration = breadcrumbs.length >= 2
    ? new Date(breadcrumbs[breadcrumbs.length - 1].timestamp).getTime() - new Date(breadcrumbs[0].timestamp).getTime()
    : 0;
  const stoppedTime = stops.reduce((sum, s) => sum + s.duration, 0);
  const movingTime = totalDuration - stoppedTime;
  const distKm = ((journey?.stats?.distance || 0) / 1000).toFixed(2);
  const avgKmh = ((journey?.stats?.avgSpeed || 0) * 3.6).toFixed(1);
  const maxKmh = ((journey?.stats?.maxSpeed || 0) * 3.6).toFixed(1);

  if (!journey) {
    return (
      <Screen>
        <Header title="Journey Replay" onBack={() => navigation.goBack()} />
        <Card>
          <Text style={{ color: T.textSub, textAlign: 'center' }}>No journey data available</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="Journey Replay"
        subtitle={journey.destination}
        onBack={() => navigation.goBack()}
      />

      {/* ── Summary Card ───────────────────────────────────────── */}
      <Card>
        <View style={styles.summaryRow}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name={journey.status === 'overdue' ? 'alert' : 'checkmark-circle'}
              size={28}
              color={journey.status === 'overdue' ? T.danger : T.success}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.destText}>{journey.destination}</Text>
            <Text style={styles.timeRange}>
              {formatTime(journey.startTime)} → {journey.completedAt ? formatTime(journey.completedAt) : 'In progress'}
            </Text>
          </View>
        </View>
      </Card>

      {/* ── Stats Grid ─────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <Stat icon="navigate" label="Distance" value={`${distKm} km`} color={T.info} />
        <Stat icon="time" label="Moving" value={formatDuration(movingTime)} color={T.success} />
        <Stat icon="pause" label="Stopped" value={formatDuration(stoppedTime)} color={T.warning} />
      </View>
      <View style={styles.statsRow}>
        <Stat icon="speedometer" label="Avg Speed" value={`${avgKmh} km/h`} color={T.teal} />
        <Stat icon="flash" label="Max Speed" value={`${maxKmh} km/h`} color={T.accent} />
        <Stat icon="location" label="Stops" value={`${stops.length}`} color={T.danger} />
      </View>

      {/* ── Stop Markers ───────────────────────────────────────── */}
      {stops.length > 0 && (
        <>
          <SectionTitle>Stops ({stops.length})</SectionTitle>
          {stops.map((stop, i) => (
            <Card key={i} style={styles.stopCard}>
              <View style={styles.stopRow}>
                <View style={styles.stopDot}>
                  <Ionicons name="pin" size={16} color={T.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopTitle}>
                    Stop {i + 1} — {formatDuration(stop.duration)}
                  </Text>
                  <Text style={styles.stopTime}>
                    {formatTime(stop.startTime)}
                  </Text>
                  {stop.address && (
                    <Text style={styles.stopAddress}>{stop.address}</Text>
                  )}
                  <Text style={styles.stopCoords}>
                    {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* ── Route Timeline ─────────────────────────────────────── */}
      <SectionTitle>Route Timeline</SectionTitle>
      {timeline.map((seg, i) => (
        <View key={i} style={styles.timelineItem}>
          <View style={styles.timelineLine}>
            <View style={[
              styles.timelineDot,
              { backgroundColor: seg.type === 'stop' ? T.warning : T.teal },
            ]} />
            {i < timeline.length - 1 && <View style={styles.timelineConnector} />}
          </View>
          <View style={styles.timelineContent}>
            <View style={styles.timelineHeader}>
              <Ionicons
                name={seg.type === 'stop' ? 'pause-circle' : 'arrow-forward-circle'}
                size={16}
                color={seg.type === 'stop' ? T.warning : T.teal}
              />
              <Text style={styles.timelineTitle}>
                {seg.type === 'stop'
                  ? `Stopped for ${formatDuration(seg.duration)}`
                  : `Moved ${((seg.distance || 0) / 1000).toFixed(2)} km`}
              </Text>
            </View>
            <Text style={styles.timelineTime}>
              {formatTime(seg.startTime)} — {formatTime(seg.endTime)}
            </Text>
            {seg.type === 'moving' && seg.avgSpeed !== undefined && (
              <Text style={styles.timelineDetail}>
                Avg {(seg.avgSpeed * 3.6).toFixed(1)} km/h
              </Text>
            )}
          </View>
        </View>
      ))}

      {/* ── GPS Points ─────────────────────────────────────────── */}
      <SectionTitle>GPS Points ({breadcrumbs.length})</SectionTitle>
      <Card>
        <Text style={styles.gpsNote}>
          {breadcrumbs.length} location points recorded during this journey.
          {'\n'}Route data is stored locally and encrypted.
        </Text>
      </Card>
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: `${T.success}22`,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  destText: { color: T.white, fontSize: 18, fontWeight: '900' },
  timeRange: { color: T.textSub, fontSize: 12, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },

  stopCard: { borderLeftWidth: 3, borderLeftColor: T.warning },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stopDot: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: `${T.warning}22`,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  stopTitle: { color: T.white, fontSize: 14, fontWeight: '800' },
  stopTime: { color: T.textSub, fontSize: 11, marginTop: 2 },
  stopAddress: { color: T.teal, fontSize: 11, marginTop: 2 },
  stopCoords: { color: T.textHint, fontSize: 10, marginTop: 2, fontFamily: 'monospace' },

  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  timelineLine: { width: 24, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineConnector: {
    width: 2, flex: 1, backgroundColor: T.border,
    marginTop: 2, marginBottom: 2,
  },
  timelineContent: {
    flex: 1, paddingBottom: 16, paddingLeft: 8,
  },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timelineTitle: { color: T.white, fontSize: 13, fontWeight: '700' },
  timelineTime: { color: T.textHint, fontSize: 10, marginTop: 2, marginLeft: 22 },
  timelineDetail: { color: T.textSub, fontSize: 10, marginTop: 1, marginLeft: 22 },

  gpsNote: { color: T.textHint, fontSize: 11, lineHeight: 16 },
});
