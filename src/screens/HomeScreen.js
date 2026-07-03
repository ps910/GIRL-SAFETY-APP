/**
 * HomeScreen - SafeHer command center
 *
 * Product model:
 * - SOS is always unmistakable.
 * - The rest of the screen answers one question: what should I do now?
 * - Secondary tools exist, but they do not compete with the emergency path.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Vibration,
  Alert,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useEmergency } from '../context/EmergencyContext';
import { getLocalEmergencyNumbers, makePhoneCall, vibrateEmergency } from '../utils/helpers';
import { T } from '../components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SOS_COUNTDOWN_DEFAULT = 5;

const SECONDARY_TOOLS = [
  { icon: 'call', label: 'Fake call', route: 'FakeCall', description: 'Create an exit excuse.' },
  { icon: 'medkit', label: 'Nearby help', route: 'NearbyHelp', description: 'Hospitals, police and safe places.' },
  { icon: 'lock-closed', label: 'Evidence vault', route: 'EvidenceVault', description: 'Store protected recordings.' },
  { icon: 'document-text', label: 'Report incident', route: 'IncidentReport', description: 'Create a structured record.' },
  { icon: 'eye-off', label: 'Hidden camera scan', route: 'HiddenCamera', description: 'Check risky rooms discreetly.' },
  { icon: 'shield-half', label: 'Self defense', route: 'SelfDefense', description: 'Short, practical guidance.' },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const emergencyNumbers = useMemo(() => getLocalEmergencyNumbers(), []);
  const {
    emergencyContacts,
    settings,
    isSOSActive,
    triggerSOS,
    cancelSOS,
    currentLocation,
    setCurrentLocation,
    sirenActive,
    isRecording,
    stealthMode,
    checkIn,
    isLiveTracking,
    isBackgroundTracking,
    checkInOverdue,
    lastCheckIn,
    activeJourney,
    journeyOverdue,
    isScreamDetecting,
    isLiveSharing,
    sosDeliveryStatus,
    completeJourney,
  } = useEmergency();

  const [countdown, setCountdown] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const countdownRef = useRef(null);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const sosPulse = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulse, { toValue: 1.035, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(sosPulse, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 1900, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    ).start();
  }, [fadeIn, ring, sosPulse]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentLocation(loc);
      } catch {}
    })();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [setCurrentLocation]);

  useEffect(() => {
    if (checkInOverdue && settings.inactivitySOSEnabled && !isSOSActive) {
      Alert.alert(
        'Check in',
        'SafeHer has not heard from you recently. Are you safe?',
        [
          { text: 'I am safe', onPress: checkIn },
          { text: 'Send SOS', style: 'destructive', onPress: () => executeFullSOS() },
        ],
        { cancelable: false },
      );
    }
  }, [checkInOverdue, settings.inactivitySOSEnabled, isSOSActive, checkIn]);

  useEffect(() => {
    if (journeyOverdue && activeJourney && !isSOSActive) {
      Alert.alert(
        'Journey overdue',
        `You have not arrived at ${activeJourney.destination}.`,
        [
          { text: 'I arrived', onPress: completeJourney },
          { text: 'Send SOS', style: 'destructive', onPress: () => executeFullSOS() },
        ],
      );
    }
  }, [journeyOverdue, activeJourney, isSOSActive, completeJourney]);

  const executeFullSOS = useCallback(() => {
    Vibration.vibrate([0, 900, 180, 900, 180, 900], true);
    triggerSOS();
  }, [triggerSOS]);

  const startSOSCountdown = useCallback(() => {
    if (isSOSActive || countdown !== null) return;
    const secs = settings.countdownSeconds || SOS_COUNTDOWN_DEFAULT;
    setCountdown(secs);
    vibrateEmergency();

    let remaining = secs;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setCountdown(null);
        executeFullSOS();
      } else {
        setCountdown(remaining);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }, 1000);
  }, [countdown, executeFullSOS, isSOSActive, settings.countdownSeconds]);

  const cancelCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const stopSOS = useCallback(() => {
    Vibration.cancel();
    cancelSOS();
  }, [cancelSOS]);

  const homeState = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const isNight = hour >= 19 || hour < 5;
    const isMorning = hour >= 5 && hour < 12;
    const guardianActive = isLiveSharing || isBackgroundTracking;
    const hasGuardians = emergencyContacts.length > 0;
    const highRiskHeuristic = isNight && !activeJourney && !guardianActive;

    if (isSOSActive) {
      return {
        tone: 'danger',
        eyebrow: 'Emergency mode',
        title: 'Help is being coordinated.',
        body: sosDeliveryStatus?.message || 'SafeHer is alerting your guardians, recording evidence and sharing live location.',
        cta: 'Stop SOS',
        action: stopSOS,
        icon: 'warning',
      };
    }

    if (journeyOverdue && activeJourney) {
      return {
        tone: 'danger',
        eyebrow: 'Journey overdue',
        title: 'You have not arrived yet.',
        body: 'Confirm you are safe or send SOS now. Your guardians need a clear signal.',
        cta: 'I arrived safely',
        action: completeJourney,
        icon: 'time',
      };
    }

    if (activeJourney) {
      const eta = new Date(activeJourney.expectedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        tone: 'safe',
        eyebrow: 'Safe Journey active',
        title: `We are with you until ${activeJourney.destination}.`,
        body: `ETA ${eta}. Your route is being watched and your guardians can be alerted if you are late.`,
        cta: 'I arrived safely',
        action: completeJourney,
        icon: 'navigate',
      };
    }

    if (!hasGuardians) {
      return {
        tone: 'warning',
        eyebrow: 'Setup needed',
        title: 'Add one guardian before tonight.',
        body: 'SOS works best when a real person already knows they are trusted by you.',
        cta: 'Add guardians',
        action: () => navigation.navigate('Guardians'),
        icon: 'people',
      };
    }

    if (highRiskHeuristic) {
      return {
        tone: 'warning',
        eyebrow: 'After sunset',
        title: 'Start a Safe Journey before you travel.',
        body: 'SafeHer will watch your ETA and make it easy to alert guardians if something changes.',
        cta: 'Start Safe Journey',
        action: () => navigation.navigate('Journey'),
        icon: 'moon',
      };
    }

    if (guardianActive) {
      return {
        tone: 'safe',
        eyebrow: 'Guardian active',
        title: 'Your location protection is on.',
        body: `${emergencyContacts.length} guardian${emergencyContacts.length === 1 ? '' : 's'} ready. Background location is available if SOS starts.`,
        cta: 'View guardians',
        action: () => navigation.navigate('Guardians'),
        icon: 'shield-checkmark',
      };
    }

    return {
      tone: 'safe',
      eyebrow: isMorning ? 'Good morning' : 'Protected',
      title: isMorning ? 'SafeHer is ready for your day.' : 'You are protected.',
      body: `${emergencyContacts.length} guardian${emergencyContacts.length === 1 ? '' : 's'} ready. Start a journey when you travel, or press SOS if you need help.`,
      cta: 'Start Safe Journey',
      action: () => navigation.navigate('Journey'),
      icon: 'shield-checkmark',
    };
  }, [
    activeJourney,
    completeJourney,
    emergencyContacts.length,
    isBackgroundTracking,
    isLiveSharing,
    isSOSActive,
    journeyOverdue,
    navigation,
    sosDeliveryStatus?.message,
    stopSOS,
  ]);

  const statusItems = useMemo(() => {
    const timeSinceCheckIn = Math.max(0, Math.floor((Date.now() - lastCheckIn.getTime()) / 60000));
    return [
      {
        label: 'Guardians',
        value: emergencyContacts.length > 0 ? `${emergencyContacts.length} ready` : 'Add now',
        icon: 'people',
        color: emergencyContacts.length > 0 ? T.success : T.warning,
      },
      {
        label: 'Location',
        value: currentLocation ? 'Verified' : 'Waiting',
        icon: 'location',
        color: currentLocation ? T.blue : T.warning,
      },
      {
        label: 'Check-in',
        value: settings.inactivitySOSEnabled ? `${timeSinceCheckIn}m ago` : 'Optional',
        icon: 'checkmark-circle',
        color: checkInOverdue ? T.danger : T.success,
      },
    ];
  }, [checkInOverdue, currentLocation, emergencyContacts.length, lastCheckIn, settings.inactivitySOSEnabled]);

  const emergencyPills = [
    settings.shakeToSOS && { icon: 'phone-portrait', label: 'Shake SOS', active: true },
    settings.sirenEnabled && { icon: 'volume-high', label: sirenActive ? 'Siren on' : 'Siren ready', active: sirenActive },
    settings.autoRecordAudio && { icon: 'mic', label: isRecording ? 'Recording' : 'Evidence', active: isRecording },
    settings.screamDetection && { icon: 'ear', label: isScreamDetecting ? 'Listening' : 'Sound AI', active: isScreamDetecting },
    isLiveTracking && { icon: 'navigate', label: 'Live tracking', active: true },
  ].filter(Boolean);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.38] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.65, 1], outputRange: [0.34, 0.12, 0] });

  if (stealthMode) return <StealthCalculator onTriggerSOS={executeFullSOS} />;

  return (
    <View style={[styles.root, isSOSActive && styles.rootDanger]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <Animated.ScrollView
        style={{ opacity: fadeIn }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brandMark}>
            <Ionicons name="shield-checkmark" size={22} color={T.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>SafeHer</Text>
            <Text style={styles.brandSub}>Personal safety companion</Text>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Open settings"
          >
            <Ionicons name="settings-outline" size={20} color={T.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.contextCard, styles[`context_${homeState.tone}`]]}>
          <View style={styles.contextTop}>
            <View style={[styles.contextIcon, styles[`contextIcon_${homeState.tone}`]]}>
              <Ionicons name={homeState.icon} size={22} color={styles[`tone_${homeState.tone}`].color} />
            </View>
            <Text style={[styles.contextEyebrow, styles[`tone_${homeState.tone}`]]}>{homeState.eyebrow}</Text>
          </View>
          <Text style={styles.contextTitle}>{homeState.title}</Text>
          <Text style={styles.contextBody}>{homeState.body}</Text>
          <TouchableOpacity
            style={[styles.contextAction, homeState.tone === 'danger' && styles.contextActionDanger]}
            onPress={homeState.action}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={homeState.cta}
          >
            <Text style={styles.contextActionText}>{homeState.cta}</Text>
            <Ionicons name="arrow-forward" size={17} color={T.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.sosPanel}>
          <Text style={styles.panelLabel}>Emergency</Text>
          <View style={styles.sosStage}>
            {countdown !== null ? (
              <View style={styles.countdownWrap} accessibilityLabel={`SOS activates in ${countdown} seconds`}>
                <Text style={styles.countdownLabel}>SOS activating in</Text>
                <Text style={styles.countdownNumber}>{countdown}</Text>
                <TouchableOpacity style={styles.cancelCountdown} onPress={cancelCountdown} accessibilityLabel="Cancel SOS">
                  <Ionicons name="close" size={16} color={T.text} />
                  <Text style={styles.cancelCountdownText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : isSOSActive ? (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopSOS}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Stop SOS"
              >
                <Ionicons name="stop-circle" size={48} color={T.white} />
                <Text style={styles.stopButtonText}>SOS ACTIVE</Text>
                <Text style={styles.stopButtonSub}>Tap when you are safe</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.sosButtonWrap}>
                <Animated.View style={[styles.sosRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
                <Animated.View style={{ transform: [{ scale: sosPulse }] }}>
                  <TouchableOpacity
                    style={styles.sosButton}
                    onPress={startSOSCountdown}
                    onLongPress={executeFullSOS}
                    delayLongPress={450}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel="SOS. Tap to start countdown. Hold to trigger immediately."
                  >
                    <Text style={styles.sosText}>SOS</Text>
                    <Text style={styles.sosSub}>Tap countdown. Hold instant.</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            )}
          </View>

          {emergencyPills.length > 0 && (
            <View style={styles.pillRow}>
              {emergencyPills.map((pill) => (
                <View key={pill.label} style={[styles.safetyPill, pill.active && styles.safetyPillActive]}>
                  <Ionicons name={pill.icon} size={12} color={pill.active ? T.white : T.textSub} />
                  <Text style={[styles.safetyPillText, pill.active && { color: T.white }]}>{pill.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.statusGrid}>
          {statusItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.statusTile}
              onPress={item.label === 'Guardians' ? () => navigation.navigate('Guardians') : undefined}
              activeOpacity={0.82}
              accessibilityLabel={`${item.label}: ${item.value}`}
            >
              <View style={[styles.statusIcon, { backgroundColor: `${item.color}1F` }]}>
                <Ionicons name={item.icon} size={17} color={item.color} />
              </View>
              <Text style={styles.statusValue}>{item.value}</Text>
              <Text style={styles.statusLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.guardianCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Guardian promise</Text>
            <Text style={styles.guardianTitle}>
              {emergencyContacts.length > 0
                ? 'Your trusted people are one tap away.'
                : 'No trusted people are connected yet.'}
            </Text>
            <Text style={styles.guardianBody}>
              {emergencyContacts.length > 0
                ? 'SOS sends location, evidence status and live updates without making you choose features.'
                : 'Add at least one person so SafeHer can do more than make noise during a crisis.'}
            </Text>
          </View>
          <TouchableOpacity style={styles.smallIconButton} onPress={() => navigation.navigate('Guardians')}>
            <Ionicons name="people" size={20} color={T.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.helpRow}>
          <EmergencyDial
            label="Emergency"
            number={emergencyNumbers.police}
            icon="call"
            color={T.danger}
            onPress={() => makePhoneCall(emergencyNumbers.police)}
          />
          <EmergencyDial
            label="Women help"
            number={emergencyNumbers.womenHelpline}
            icon="woman"
            color={T.blue}
            onPress={() => makePhoneCall(emergencyNumbers.womenHelpline)}
          />
        </View>

        <Pressable style={styles.toolsHeader} onPress={() => setToolsOpen((value) => !value)}>
          <View>
            <Text style={styles.sectionTitle}>More safety tools</Text>
            <Text style={styles.toolsHint}>Kept one level deeper to keep emergencies simple.</Text>
          </View>
          <Ionicons name={toolsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={T.textSub} />
        </Pressable>

        {toolsOpen && (
          <View style={styles.toolsList}>
            {SECONDARY_TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.route}
                style={styles.toolRow}
                onPress={() => navigation.navigate(tool.route)}
                activeOpacity={0.82}
                accessibilityLabel={tool.label}
              >
                <View style={styles.toolIcon}>
                  <Ionicons name={tool.icon} size={18} color={T.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toolTitle}>{tool.label}</Text>
                  <Text style={styles.toolDescription}>{tool.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={T.textHint} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

function EmergencyDial({ label, number, icon, color, onPress }) {
  return (
    <TouchableOpacity style={styles.dialButton} onPress={onPress} activeOpacity={0.82} accessibilityLabel={`Call ${label}`}>
      <View style={[styles.dialIcon, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.dialLabel}>{label}</Text>
        <Text style={styles.dialNumber}>{number}</Text>
      </View>
    </TouchableOpacity>
  );
}

function StealthCalculator({ onTriggerSOS }) {
  const secretCode = '112';
  const [display, setDisplay] = useState('0');
  const [secret, setSecret] = useState('');

  const safeEval = (expr) => {
    try {
      if (!/^[0-9+\-*/().% ]+$/.test(expr)) return 'Error';
      const result = new Function(`return (${expr})`)();
      if (!Number.isFinite(result)) return 'Error';
      return String(result);
    } catch {
      return 'Error';
    }
  };

  const press = (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value === 'C') {
      setDisplay('0');
      setSecret('');
      return;
    }
    if (value === '=') {
      if (secret === secretCode) {
        setDisplay('HELP');
        onTriggerSOS();
        return;
      }
      setDisplay(safeEval(display));
      setSecret('');
      return;
    }
    setDisplay(display === '0' || display === 'Error' || display === 'HELP' ? value : display + value);
    setSecret(/[0-9]/.test(value) ? secret + value : '');
  };

  const rows = [['7', '8', '9', '/'], ['4', '5', '6', '*'], ['1', '2', '3', '-'], ['C', '0', '=', '+']];

  return (
    <View style={styles.calc}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.calcDisplay}>
        <Text style={styles.calcText} numberOfLines={1}>{display}</Text>
      </View>
      {rows.map((row) => (
        <View key={row.join('')} style={styles.calcRow}>
          {row.map((button) => (
            <TouchableOpacity
              key={button}
              style={[
                styles.calcButton,
                /[/*\-+]/.test(button) && styles.calcOperator,
                button === '=' && styles.calcEqual,
                button === 'C' && styles.calcClear,
              ]}
              onPress={() => press(button)}
              activeOpacity={0.72}
            >
              <Text style={[styles.calcButtonText, /[/*\-+]/.test(button) && { color: T.primary }]}>{button}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  rootDanger: { backgroundColor: '#16070A' },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 34,
    paddingBottom: 98,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  brand: { color: T.text, fontSize: 23, fontWeight: '900' },
  brandSub: { color: T.textSub, fontSize: 12, fontWeight: '600', marginTop: 2 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  context_safe: { backgroundColor: 'rgba(16,185,129,0.09)', borderColor: 'rgba(16,185,129,0.24)' },
  context_warning: { backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.28)' },
  context_danger: { backgroundColor: 'rgba(225,29,72,0.12)', borderColor: 'rgba(225,29,72,0.35)' },
  contextTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  contextIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  contextIcon_safe: { backgroundColor: 'rgba(16,185,129,0.15)' },
  contextIcon_warning: { backgroundColor: 'rgba(245,158,11,0.15)' },
  contextIcon_danger: { backgroundColor: 'rgba(225,29,72,0.18)' },
  tone_safe: { color: T.success },
  tone_warning: { color: T.warning },
  tone_danger: { color: T.danger },
  contextEyebrow: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  contextTitle: { color: T.text, fontSize: 24, lineHeight: 30, fontWeight: '900' },
  contextBody: { color: T.textSub, fontSize: 14, lineHeight: 21, marginTop: 8 },
  contextAction: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: T.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contextActionDanger: { backgroundColor: T.danger },
  contextActionText: { color: T.white, fontSize: 15, fontWeight: '900' },
  sosPanel: {
    backgroundColor: T.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 16,
  },
  panelLabel: {
    color: T.textSub,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sosStage: {
    height: Math.min(248, SCREEN_WIDTH * 0.62),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButtonWrap: { alignItems: 'center', justifyContent: 'center' },
  sosRing: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 3,
    borderColor: T.danger,
  },
  sosButton: {
    width: 184,
    height: 184,
    borderRadius: 92,
    backgroundColor: T.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.danger,
    shadowOpacity: 0.42,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  sosText: { color: T.white, fontSize: 44, fontWeight: '900' },
  sosSub: { color: 'rgba(255,255,255,0.82)', fontSize: 11, fontWeight: '700', marginTop: 8 },
  countdownWrap: { alignItems: 'center', justifyContent: 'center' },
  countdownLabel: { color: T.textSub, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  countdownNumber: { color: T.white, fontSize: 86, fontWeight: '900', marginVertical: 4 },
  cancelCountdown: {
    minHeight: 46,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cancelCountdownText: { color: T.text, fontSize: 14, fontWeight: '800' },
  stopButton: {
    width: 184,
    height: 184,
    borderRadius: 92,
    backgroundColor: T.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  stopButtonText: { color: T.white, fontSize: 18, fontWeight: '900', marginTop: 8 },
  stopButtonSub: { color: 'rgba(255,255,255,0.76)', fontSize: 11, marginTop: 5, fontWeight: '700' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  safetyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  safetyPillActive: { backgroundColor: T.primary, borderColor: T.primary },
  safetyPillText: { color: T.textSub, fontSize: 11, fontWeight: '800' },
  statusGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statusTile: {
    flex: 1,
    minHeight: 104,
    borderRadius: 18,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
  },
  statusIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statusValue: { color: T.text, fontSize: 14, fontWeight: '900' },
  statusLabel: { color: T.textSub, fontSize: 11, fontWeight: '700', marginTop: 4 },
  guardianCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 16,
  },
  sectionTitle: { color: T.textSub, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  guardianTitle: { color: T.text, fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 7 },
  guardianBody: { color: T.textSub, fontSize: 13, lineHeight: 19, marginTop: 6 },
  smallIconButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.primary,
    marginLeft: 12,
  },
  helpRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 17,
    padding: 12,
    minHeight: 72,
  },
  dialIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  dialLabel: { color: T.text, fontSize: 13, fontWeight: '900' },
  dialNumber: { color: T.textSub, fontSize: 11, marginTop: 3, fontWeight: '700' },
  toolsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toolsHint: { color: T.textHint, fontSize: 12, marginTop: 4 },
  toolsList: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 18,
    overflow: 'hidden',
  },
  toolRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  toolIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surface,
    marginRight: 12,
  },
  toolTitle: { color: T.text, fontSize: 14, fontWeight: '900' },
  toolDescription: { color: T.textSub, fontSize: 12, marginTop: 3 },
  calc: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingHorizontal: 12,
  },
  calcDisplay: {
    minHeight: 104,
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: '#0A0A0A',
    borderRadius: 14,
    padding: 22,
    marginBottom: 14,
  },
  calcText: { color: T.white, fontSize: 56, fontWeight: '300' },
  calcRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  calcButton: {
    flex: 1,
    aspectRatio: 1.1,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcOperator: { backgroundColor: '#2C2C2E' },
  calcEqual: { backgroundColor: T.primary },
  calcClear: { backgroundColor: '#A6A6A6' },
  calcButtonText: { color: T.white, fontSize: 28, fontWeight: '500' },
});
