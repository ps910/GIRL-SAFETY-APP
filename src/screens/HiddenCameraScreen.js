/**
 * HiddenCameraScreen v7.0 — IR + magnetic detector (Dark Luxury)
 *
 * Uses phone camera to scan for IR reflections (red dots in dark) and
 * magnetometer to detect magnetic disturbances near suspected hidden devices.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Magnetometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  Screen, Header, Card, SectionTitle, PrimaryBtn, GhostBtn,
  Pill, T,
} from '../components/ui';

export default function HiddenCameraScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState('ir'); // 'ir' | 'magnetic' | 'tips'
  const [magnetic, setMagnetic] = useState({ x: 0, y: 0, z: 0, magnitude: 0 });
  const [baseline, setBaseline] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const subRef = useRef(null);

  // Load scan history
  useEffect(() => {
    AsyncStorage.getItem('@safeher_scan_history').then(raw => {
      if (raw) setScanHistory(JSON.parse(raw));
    }).catch(() => {});
  }, []);

  const saveScanResult = async (type, result) => {
    const entry = {
      type,
      result,
      timestamp: new Date().toISOString(),
    };
    const updated = [entry, ...scanHistory].slice(0, 20);
    setScanHistory(updated);
    await AsyncStorage.setItem('@safeher_scan_history', JSON.stringify(updated));
  };

  useEffect(() => () => { if (subRef.current) subRef.current.remove(); }, []);

  const startMagneticScan = () => {
    if (subRef.current) return;
    Magnetometer.setUpdateInterval(200);
    let baseSum = 0;
    let baseCount = 0;
    let baselineSet = false;

    subRef.current = Magnetometer.addListener((data) => {
      const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      setMagnetic({ ...data, magnitude });
      if (!baselineSet && baseCount < 25) {
        baseSum += magnitude; baseCount++;
        if (baseCount === 25) {
          setBaseline(baseSum / 25);
          baselineSet = true;
        }
      }
    });
  };

  const stopMagneticScan = () => {
    if (subRef.current) { subRef.current.remove(); subRef.current = null; }
    setBaseline(null);
  };

  useEffect(() => {
    if (mode === 'magnetic') startMagneticScan();
    else stopMagneticScan();
    return stopMagneticScan;
  }, [mode]);

  const deviation = baseline ? Math.abs(magnetic.magnitude - baseline) : 0;
  const alert = deviation > 30;
  useEffect(() => {
    if (alert && mode === 'magnetic') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [alert, mode]);

  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 36 }}>
        <Header title="Hidden Camera Detector" subtitle="Scan rooms for surveillance devices" onBack={() => navigation.goBack()} />

        {/* Mode switch */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'ir' && styles.modeBtnActive]}
            onPress={() => setMode('ir')}
          >
            <Ionicons name="eye" size={16} color={mode === 'ir' ? T.primary : T.textSub} />
            <Text style={[styles.modeText, mode === 'ir' && { color: T.primary }]}>IR Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'magnetic' && styles.modeBtnActive]}
            onPress={() => setMode('magnetic')}
          >
            <Ionicons name="magnet" size={16} color={mode === 'magnetic' ? T.primary : T.textSub} />
            <Text style={[styles.modeText, mode === 'magnetic' && { color: T.primary }]}>Magnetic</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'tips' && styles.modeBtnActive]}
            onPress={() => setMode('tips')}
          >
            <Ionicons name="bulb" size={16} color={mode === 'tips' ? T.primary : T.textSub} />
            <Text style={[styles.modeText, mode === 'tips' && { color: T.primary }]}>Guide</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* IR camera mode */}
      {mode === 'ir' && (
        <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 30 }}>
          {!permission?.granted ? (
            <Card style={{ flex: 1, justifyContent: 'center' }}>
              <View style={{ alignItems: 'center', padding: 16 }}>
                <Ionicons name="camera-outline" size={56} color={T.primary} />
                <Text style={styles.permTitle}>Camera permission needed</Text>
                <Text style={styles.permSub}>We use the camera to scan for IR LED reflections from hidden cameras.</Text>
                <PrimaryBtn icon="camera" onPress={requestPermission} style={{ marginTop: 18, paddingHorizontal: 32 }}>
                  Grant Permission
                </PrimaryBtn>
              </View>
            </Card>
          ) : (
            <View style={styles.cameraWrap}>
              <CameraView style={{ flex: 1 }} facing="back" />
              <View style={styles.overlay}>
                <View style={styles.crosshair}>
                  <View style={[styles.crossLine, { width: 2, height: 24 }]} />
                  <View style={[styles.crossLine, { width: 24, height: 2, position: 'absolute' }]} />
                </View>
              </View>
            </View>
          )}

          <Card style={{ marginTop: 12 }}>
            <Text style={styles.tipTitle}>📋 How to scan</Text>
            <Text style={styles.tip}>1. Turn off room lights — make it as dark as possible.</Text>
            <Text style={styles.tip}>2. Slowly pan the camera around the room.</Text>
            <Text style={styles.tip}>3. Look for tiny RED or PURPLE dots — those are IR LEDs.</Text>
            <Text style={styles.tip}>4. Common hiding spots: smoke detectors, alarm clocks, picture frames, vents, plug sockets.</Text>
          </Card>
        </View>
      )}

      {/* Magnetic mode */}
      {mode === 'magnetic' && (
        <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 30 }}>
          <Card style={{ alignItems: 'center', padding: 24 }}>
            <View style={[styles.gauge, { backgroundColor: alert ? `${T.danger}22` : T.primaryGlow }]}>
              <Ionicons name="magnet" size={56} color={alert ? T.danger : T.primary} />
            </View>
            <Text style={[styles.magnitude, { color: alert ? T.danger : T.text }]}>
              {magnetic.magnitude.toFixed(1)} µT
            </Text>
            <Text style={styles.magSub}>
              {baseline === null ? 'Calibrating baseline…' : alert ? '⚠️ Suspicious magnetic field' : 'Normal range'}
            </Text>
            {baseline !== null && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Pill icon="analytics" label={`Baseline ${baseline.toFixed(0)}`} active />
                <Pill icon="trending-up" label={`Δ ${deviation.toFixed(1)}`} active color={alert ? T.danger : T.success} />
              </View>
            )}
          </Card>

          <Card>
            <Text style={styles.tipTitle}>🧲 How magnetic detection works</Text>
            <Text style={styles.tip}>1. Hold the phone close to suspected objects.</Text>
            <Text style={styles.tip}>2. Cameras and microphones contain ferromagnetic parts — they distort Earth's magnetic field locally.</Text>
            <Text style={styles.tip}>3. A reading 30+ µT above baseline is suspicious.</Text>
            <Text style={styles.tip}>4. Move to a different area to recalibrate the baseline.</Text>
          </Card>
        </View>
      )}

      {/* Tips & Guide mode */}
      {mode === 'tips' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 30 }}>
          <Card>
            <Text style={styles.tipTitle}>🔍 Room Sweep Guide</Text>
            <Text style={styles.tip}>Follow this systematic checklist when entering hotel rooms, Airbnbs, or changing rooms:</Text>
          </Card>

          <SectionTitle>Common Hiding Spots</SectionTitle>
          {[
            { icon: '🚿', spot: 'Shower head & bathroom vents', desc: 'Waterproof cameras often placed in shower fixtures' },
            { icon: '🔌', spot: 'USB chargers & power strips', desc: 'Camera chips disguised as regular chargers are very common' },
            { icon: '💨', spot: 'Smoke detectors & sprinklers', desc: 'Has a lens? It might be a camera. Real detectors don\'t.' },
            { icon: '🪞', spot: 'Mirrors (two-way test)', desc: 'Touch mirror with finger — if gap between finger and reflection, it\'s real' },
            { icon: '⏰', spot: 'Alarm clocks & digital displays', desc: 'Turn off lights and look for tiny LED glow' },
            { icon: '🖼️', spot: 'Picture frames & wall decor', desc: 'Look for tiny holes — pinhole cameras are ~1mm' },
            { icon: '🔥', spot: 'Air purifiers & heaters', desc: 'Grills and vents provide perfect cover for lenses' },
            { icon: '💡', spot: 'Light fixtures & lamps', desc: 'Check inside lampshades and around bulb bases' },
          ].map((item, i) => (
            <Card key={i} style={{ marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: T.white, fontSize: 13, fontWeight: '700' }}>{item.spot}</Text>
                  <Text style={{ color: T.textSub, fontSize: 11, marginTop: 2 }}>{item.desc}</Text>
                </View>
              </View>
            </Card>
          ))}

          <SectionTitle>Suspicious WiFi Names</SectionTitle>
          <Card>
            <Text style={styles.tip}>Many spy cameras create WiFi hotspots. Look for these in your WiFi settings:</Text>
            {['IPCAM_*', 'P2P_CAM*', 'CAMERA_*', 'ESP_*', 'HIKVISION_*', 'HK_CAM*', 'V380_*', 'YI_HOME*', 'MIPC_*', 'CloudSee*'].map((name, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Ionicons name="wifi" size={12} color={T.warning} />
                <Text style={{ color: T.warning, fontSize: 12, fontFamily: 'monospace', fontWeight: '700' }}>{name}</Text>
              </View>
            ))}
            <Text style={[styles.tip, { marginTop: 10, color: T.textHint }]}>Note: WiFi scanning requires Android. On iOS, manually check WiFi settings.</Text>
          </Card>

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <>
              <SectionTitle>Scan History ({scanHistory.length})</SectionTitle>
              {scanHistory.slice(0, 5).map((entry, i) => (
                <Card key={i} style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={entry.type === 'ir' ? 'eye' : 'magnet'} size={14} color={T.primary} />
                    <Text style={{ color: T.textSub, fontSize: 11, flex: 1 }}>
                      {entry.type.toUpperCase()} — {entry.result}
                    </Text>
                    <Text style={{ color: T.textHint, fontSize: 10 }}>
                      {new Date(entry.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </Text>
                  </View>
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.border,
  },
  modeBtnActive: { backgroundColor: T.primaryGlow, borderColor: T.borderActive },
  modeText: { color: T.textSub, fontWeight: '800', fontSize: 13 },

  permTitle: { color: T.white, fontSize: 18, fontWeight: '900', marginTop: 14 },
  permSub:   { color: T.textSub, fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 19 },

  cameraWrap: { flex: 1, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  crosshair: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, borderColor: T.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  crossLine: { backgroundColor: T.primary },

  gauge: {
    width: 130, height: 130, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  magnitude: { fontSize: 36, fontWeight: '900', letterSpacing: 0.5 },
  magSub: { color: T.textSub, fontSize: 13, marginTop: 6 },

  tipTitle: { color: T.white, fontSize: 14, fontWeight: '800', marginBottom: 8 },
  tip:      { color: T.textSub, fontSize: 12, marginTop: 6, lineHeight: 18 },
});
