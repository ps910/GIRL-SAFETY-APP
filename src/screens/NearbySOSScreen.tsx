/**
 * NearbySOSScreen — Community Helper Response
 * ═══════════════════════════════════════════════════════════
 *
 * Shown when a nearby SOS alert is detected (within 2-3km).
 * Displays victim's live location, distance, direction,
 * and allows the helper to respond.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Vibration, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import ProximitySOSService from '../services/ProximitySOSService';
import CrimeZoneService from '../services/CrimeZoneService';
import { makePhoneCall } from '../utils/helpers';
import {
  Screen, Header, Card, SectionTitle, PrimaryBtn, GhostBtn,
  Stat, Pill, T,
} from '../components/ui';

export default function NearbySOSScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const params = (route.params as any) || {};
  const alertId = params.alertId || '';
  const victimName = params.victimName || 'Someone';
  const initialDistance = params.distanceMeters || 0;
  const direction = params.direction || '';
  const message = params.message || 'SOS Emergency';
  const victimLat = params.latitude || 0;
  const victimLng = params.longitude || 0;

  const [isResponding, setIsResponding] = useState(false);
  const [distance, setDistance] = useState(initialDistance);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [liveVictimLoc, setLiveVictimLoc] = useState({ lat: victimLat, lng: victimLng });
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing animation for urgency
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    Vibration.vibrate([0, 400, 200, 400]);
    return () => pulse.stop();
  }, []);

  // Track my location
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
        (loc) => {
          setMyLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          if (victimLat && victimLng) {
            const d = CrimeZoneService.haversineDistance(
              loc.coords.latitude, loc.coords.longitude,
              liveVictimLoc.lat, liveVictimLoc.lng,
            );
            setDistance(Math.round(d));
          }

          // Update helper location if responding
          if (isResponding && alertId && user?.uid) {
            ProximitySOSService.updateHelperLocation(
              alertId, user.uid,
              loc.coords.latitude, loc.coords.longitude,
            );
          }
        },
      );
    })();
    return () => { sub?.remove(); };
  }, [isResponding, alertId, liveVictimLoc]);

  const handleRespond = async () => {
    if (!user?.uid || !myLocation) {
      Alert.alert('Location needed', 'We need your location to help coordinate the response.');
      return;
    }

    setIsResponding(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await ProximitySOSService.respondToAlert(
      alertId,
      user.uid,
      user.displayName || 'Helper',
      myLocation.lat,
      myLocation.lng,
    );

    Alert.alert(
      '🙏 Thank you!',
      'The person in distress can now see that you are on your way. Stay safe and call police if needed.',
    );
  };

  const handleCallPolice = () => {
    makePhoneCall('112');
  };

  const distanceText = distance < 1000
    ? `${distance}m away`
    : `${(distance / 1000).toFixed(1)}km away`;

  const directionEmoji: Record<string, string> = {
    N: '⬆️', NE: '↗️', E: '➡️', SE: '↘️',
    S: '⬇️', SW: '↙️', W: '⬅️', NW: '↖️',
  };

  return (
    <Screen>
      <Header
        title="🚨 Nearby SOS"
        subtitle="Someone needs help"
        onBack={() => navigation.goBack()}
      />

      {/* ── Alert Banner ───────────────────────────────────────── */}
      <Animated.View style={[styles.alertBanner, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.alertIcon}>
          <Ionicons name="warning" size={32} color="#fff" />
        </View>
        <Text style={styles.alertTitle}>DISTRESS SIGNAL</Text>
        <Text style={styles.alertSubtitle}>
          {victimName} triggered SOS nearby
        </Text>
      </Animated.View>

      {/* ── Distance + Direction ────────────────────────────────── */}
      <Card>
        <View style={styles.distanceRow}>
          <View style={styles.distanceBlock}>
            <Text style={styles.distanceValue}>{distanceText}</Text>
            <Text style={styles.distanceLabel}>Distance</Text>
          </View>
          <View style={styles.distanceBlock}>
            <Text style={styles.directionValue}>
              {directionEmoji[direction] || '📍'} {direction}
            </Text>
            <Text style={styles.distanceLabel}>Direction</Text>
          </View>
        </View>
      </Card>

      {/* ── Message ────────────────────────────────────────────── */}
      <Card style={styles.messageCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Ionicons name="chatbubble-ellipses" size={16} color={T.danger} />
          <Text style={styles.messageLabel}>Distress Message</Text>
        </View>
        <Text style={styles.messageText}>{message}</Text>
      </Card>

      {/* ── Victim Location ────────────────────────────────────── */}
      <Card>
        <SectionTitle>Victim Location (Live)</SectionTitle>
        <View style={styles.coordRow}>
          <Ionicons name="location" size={16} color={T.danger} />
          <Text style={styles.coordText}>
            {liveVictimLoc.lat.toFixed(6)}, {liveVictimLoc.lng.toFixed(6)}
          </Text>
        </View>
        <Pill color={T.danger} style={{ marginTop: 8 }}>
          Location updates every 5 seconds
        </Pill>
      </Card>

      {/* ── Actions ────────────────────────────────────────────── */}
      <View style={{ marginTop: 8 }}>
        {!isResponding ? (
          <>
            <PrimaryBtn
              icon="hand-right"
              onPress={handleRespond}
              style={styles.respondBtn}
            >
              I'm On My Way
            </PrimaryBtn>
            <GhostBtn icon="call" onPress={handleCallPolice} style={{ marginTop: 10 }}>
              Call Police (112)
            </GhostBtn>
          </>
        ) : (
          <Card style={styles.respondingCard}>
            <Ionicons name="checkmark-circle" size={28} color={T.success} />
            <Text style={styles.respondingText}>
              You're responding — your location is being shared with the victim.
            </Text>
            <Text style={styles.respondingHint}>
              Stay safe. If the situation looks dangerous, call police immediately.
            </Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  alertBanner: {
    backgroundColor: T.danger,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    color: '#fff', fontSize: 22, fontWeight: '900',
    letterSpacing: 2,
  },
  alertSubtitle: {
    color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 6,
    fontWeight: '600',
  },

  distanceRow: { flexDirection: 'row' },
  distanceBlock: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  distanceValue: { color: T.white, fontSize: 24, fontWeight: '900' },
  directionValue: { color: T.teal, fontSize: 22, fontWeight: '900' },
  distanceLabel: { color: T.textHint, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 },

  messageCard: { borderLeftWidth: 3, borderLeftColor: T.danger },
  messageLabel: { color: T.danger, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  messageText: { color: T.white, fontSize: 14, fontWeight: '600', lineHeight: 20 },

  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coordText: { color: T.textSub, fontSize: 12, fontFamily: 'monospace' },

  respondBtn: { backgroundColor: T.success },
  respondingCard: {
    alignItems: 'center', borderWidth: 1.5,
    borderColor: `${T.success}44`, padding: 20,
  },
  respondingText: {
    color: T.success, fontSize: 14, fontWeight: '700',
    textAlign: 'center', marginTop: 10,
  },
  respondingHint: {
    color: T.textHint, fontSize: 11, textAlign: 'center', marginTop: 8,
  },
});
