/**
 * HomeScreen — SafeHer Command Center (Midnight Indigo)
 *
 * Product model:
 * - SOS is always unmistakable.
 * - The rest of the screen answers one question: what should I do now?
 * - Secondary tools exist, but they do not compete with the emergency path.
 *
 * Design: Midnight Indigo palette, Space Grotesk headings, DM Sans body.
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '../utils/logger';
import { getLocalEmergencyNumbers, makePhoneCall, vibrateEmergency } from '../utils/helpers';
import { SOSButton, ProtectionTile, ContextCard, StatusDot, Pill, FloatingOrb, T } from '../components/ui';
import { colors, spacing, radius } from '@safeher/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SOS_COUNTDOWN_DEFAULT = 5;

const SECONDARY_TOOLS = [
  { icon: 'call', label: 'Fake call', route: 'FakeCall', description: 'Create an exit excuse.', color: colors.accent },
  { icon: 'medkit', label: 'Nearby help', route: 'NearbyHelp', description: 'Hospitals, police and safe places.', color: colors.teal },
  { icon: 'lock-closed', label: 'Evidence vault', route: 'EvidenceVault', description: 'Store protected recordings.', color: colors.info },
  { icon: 'document-text', label: 'Report incident', route: 'IncidentReport', description: 'Create a structured record.', color: colors.warning },
  { icon: 'eye-off', label: 'Hidden camera scan', route: 'HiddenCamera', description: 'Check risky rooms discreetly.', color: colors.orange },
  { icon: 'shield-half', label: 'Self defense', route: 'SelfDefense', description: 'Short, practical guidance.', color: colors.success },
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

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
  }, [fadeIn]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentLocation(loc);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const checkNightAutoArm = async () => {
      const currentHour = new Date().getHours();
      if (currentHour >= 20 || currentHour < 6) {
        try {
          const settingsData = await AsyncStorage.getItem('@girl_safety_settings');
          if (settingsData) {
            const parsed = JSON.parse(settingsData);
            if (!parsed.shakeToSOS) {
              parsed.shakeToSOS = true;
              await AsyncStorage.setItem('@girl_safety_settings', JSON.stringify(parsed));
              Logger.log('[Auto-Arm] Night auto-arm activated shakeToSOS setting');
            }
          }
        } catch (e) {
          Logger.error('[Auto-Arm] Night auto-arm settings update error:', e);
        }
      }
    };
    checkNightAutoArm();
  }, []);

  useEffect(() => {
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

  // ── Context-aware state machine ──
  const homeState = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const isNight = hour >= 19 || hour < 5;
    const isMorning = hour >= 5 && hour < 12;
    const isEvening = hour >= 17 && hour < 19;
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
        accentColor: colors.danger,
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
        accentColor: colors.danger,
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
        accentColor: colors.teal,
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
        accentColor: colors.warning,
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
        accentColor: colors.warning,
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
        accentColor: colors.success,
      };
    }

    const greeting = isMorning ? 'Good morning' : isEvening ? 'Good evening' : 'Protected';
    const message = isMorning ? 'SafeHer is ready for your day.' : 'You are protected.';

    return {
      tone: 'safe',
      eyebrow: greeting,
      title: message,
      body: `${emergencyContacts.length} guardian${emergencyContacts.length === 1 ? '' : 's'} ready. Start a journey when you travel, or press SOS if you need help.`,
      cta: 'Start Safe Journey',
      action: () => navigation.navigate('Journey'),
      icon: 'shield-checkmark',
      accentColor: colors.primary,
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

  // ── Protection status tiles ──
  const statusItems = useMemo(() => {
    const timeSinceCheckIn = Math.max(0, Math.floor((Date.now() - lastCheckIn.getTime()) / 60000));
    return [
      {
        label: 'Guardians',
        value: emergencyContacts.length > 0 ? `${emergencyContacts.length} ready` : 'Add now',
        icon: 'people',
        color: emergencyContacts.length > 0 ? colors.success : colors.warning,
        active: emergencyContacts.length > 0,
      },
      {
        label: 'Location',
        value: currentLocation ? 'Verified' : 'Waiting',
        icon: 'location',
        color: currentLocation ? colors.info : colors.warning,
        active: !!currentLocation,
      },
      {
        label: 'Check-in',
        value: settings.inactivitySOSEnabled ? `${timeSinceCheckIn}m ago` : 'Optional',
        icon: 'checkmark-circle',
        color: checkInOverdue ? colors.danger : colors.success,
        active: !checkInOverdue,
      },
    ];
  }, [checkInOverdue, currentLocation, emergencyContacts.length, lastCheckIn, settings.inactivitySOSEnabled]);

  // ── Emergency feature pills ──
  const emergencyPills = [
    settings.shakeToSOS && { icon: 'phone-portrait', label: 'Shake SOS', active: true },
    settings.sirenEnabled && { icon: 'volume-high', label: sirenActive ? 'Siren on' : 'Siren ready', active: sirenActive },
    settings.autoRecordAudio && { icon: 'mic', label: isRecording ? 'Recording' : 'Evidence', active: isRecording },
    settings.screamDetection && { icon: 'ear', label: isScreamDetecting ? 'Listening' : 'Sound AI', active: isScreamDetecting },
    isLiveTracking && { icon: 'navigate', label: 'Live tracking', active: true },
  ].filter(Boolean);

  if (stealthMode) return <StealthCalculator onTriggerSOS={executeFullSOS} />;

  return (
    <View style={[styles.root, isSOSActive && styles.rootDanger]}>
      <StatusBar barStyle="light-content" backgroundColor={isSOSActive ? '#0F0A0C' : colors.bg} />

      {/* Subtle background orbs */}
      <FloatingOrb size={200} color={colors.primary} startX={-60} startY={80} duration={12000} />
      <FloatingOrb size={160} color={colors.accent} startX={SCREEN_WIDTH - 100} startY={300} duration={15000} />

      <Animated.ScrollView
        style={{ opacity: fadeIn }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.brandMark}>
            <Ionicons name="shield-checkmark" size={22} color={colors.white} />
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
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* ── Context Card ── */}
        <View style={[styles.contextCard, styles[`context_${homeState.tone}`]]}>
          <View style={styles.contextTop}>
            <View style={[styles.contextIcon, { backgroundColor: `${homeState.accentColor}1F` }]}>
              <Ionicons name={homeState.icon} size={22} color={homeState.accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <StatusDot color={homeState.accentColor} pulse={homeState.tone === 'danger'} size={6} />
                <Text style={[styles.contextEyebrow, { color: homeState.accentColor }]}>{homeState.eyebrow}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.contextTitle}>{homeState.title}</Text>
          <Text style={styles.contextBody}>{homeState.body}</Text>
          <TouchableOpacity
            style={[
              styles.contextAction,
              { backgroundColor: homeState.tone === 'danger' ? colors.danger : colors.primary },
            ]}
            onPress={homeState.action}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={homeState.cta}
          >
            <Text style={styles.contextActionText}>{homeState.cta}</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* ── SOS Panel ── */}
        <View style={[styles.sosPanel, isSOSActive && styles.sosPanelActive]}>
          <Text style={styles.panelLabel}>Emergency</Text>
          <View style={styles.sosStage}>
            {countdown !== null ? (
              <View style={styles.countdownWrap} accessibilityLabel={`SOS activates in ${countdown} seconds`}>
                <Text style={styles.countdownLabel}>SOS activating in</Text>
                <Text style={styles.countdownNumber}>{countdown}</Text>
                <TouchableOpacity style={styles.cancelCountdown} onPress={cancelCountdown} accessibilityLabel="Cancel SOS">
                  <Ionicons name="close" size={16} color={colors.text} />
                  <Text style={styles.cancelCountdownText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : isSOSActive ? (
              <SOSButton onPress={stopSOS} isActive={true} />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <SOSButton onPress={startSOSCountdown} isActive={false} />
                <Text style={styles.sosHint}>Tap countdown · Hold instant</Text>
              </View>
            )}
          </View>

          {emergencyPills.length > 0 && (
            <View style={styles.pillRow}>
              {emergencyPills.map((pill) => (
                <Pill
                  key={pill.label}
                  icon={pill.icon}
                  label={pill.label}
                  color={pill.active ? colors.primary : colors.textSub}
                  active={pill.active}
                />
              ))}
            </View>
          )}

          {/* SOS Delivery Status (visible during/after SOS) */}
          {isSOSActive && sosDeliveryStatus && sosDeliveryStatus.state !== 'idle' && (
            <View style={styles.deliveryStatus}>
              <StatusDot
                color={
                  sosDeliveryStatus.state === 'sent' ? colors.success
                  : sosDeliveryStatus.state === 'sending' ? colors.warning
                  : sosDeliveryStatus.state === 'failed' ? colors.danger
                  : colors.warning
                }
                pulse={sosDeliveryStatus.state === 'sending'}
                size={8}
              />
              <Text style={styles.deliveryText}>{sosDeliveryStatus.message}</Text>
            </View>
          )}
        </View>

        {/* ── Protection Status Grid ── */}
        <View style={styles.statusGrid}>
          {statusItems.map((item) => (
            <ProtectionTile
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              color={item.color}
              active={item.active}
            />
          ))}
        </View>

        {/* ── Guardian Promise Card ── */}
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
          <TouchableOpacity style={styles.guardianNavBtn} onPress={() => navigation.navigate('Guardians')}>
            <Ionicons name="people" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* ── Emergency Helplines ── */}
        <View style={styles.helpRow}>
          <EmergencyDial
            label="Emergency"
            number={emergencyNumbers.police}
            icon="call"
            color={colors.danger}
            onPress={() => makePhoneCall(emergencyNumbers.police)}
          />
          <EmergencyDial
            label="Women help"
            number={emergencyNumbers.womenHelpline}
            icon="woman"
            color={colors.info}
            onPress={() => makePhoneCall(emergencyNumbers.womenHelpline)}
          />
        </View>

        {/* ── More Safety Tools ── */}
        <Pressable style={styles.toolsHeader} onPress={() => setToolsOpen((value) => !value)}>
          <View>
            <Text style={styles.sectionTitle}>More safety tools</Text>
            <Text style={styles.toolsHint}>Kept one level deeper to keep emergencies simple.</Text>
          </View>
          <View style={styles.toolsChevron}>
            <Ionicons name={toolsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSub} />
          </View>
        </Pressable>

        {toolsOpen && (
          <View style={styles.toolsList}>
            {SECONDARY_TOOLS.map((tool, index) => (
              <TouchableOpacity
                key={tool.route}
                style={[styles.toolRow, index === SECONDARY_TOOLS.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => navigation.navigate(tool.route)}
                activeOpacity={0.82}
                accessibilityLabel={tool.label}
              >
                <View style={[styles.toolIcon, { backgroundColor: `${tool.color}1F` }]}>
                  <Ionicons name={tool.icon} size={18} color={tool.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toolTitle}>{tool.label}</Text>
                  <Text style={styles.toolDescription}>{tool.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textHint} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </Animated.ScrollView>
    </View>
  );
}

// ── Emergency Dial Button ──────────────────────────────────
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
      <View style={[styles.dialCallIcon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name="call" size={14} color={color} />
      </View>
    </TouchableOpacity>
  );
}

// ── Stealth Calculator Mode ────────────────────────────────
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
              <Text style={[styles.calcButtonText, /[/*\-+]/.test(button) && { color: colors.primary }]}>{button}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Styles — Midnight Indigo ───────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  rootDanger: { backgroundColor: '#0F0A0C' },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 56 : 34,
    paddingBottom: 98,
  },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  brand: { color: colors.text, fontSize: 23, fontWeight: '800', letterSpacing: -0.3 },
  brandSub: { color: colors.textSub, fontSize: 12, fontWeight: '500', marginTop: 2 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Context Card
  contextCard: {
    borderRadius: radius.xl,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  context_safe: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.20)',
  },
  context_warning: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderColor: 'rgba(245, 158, 11, 0.22)',
  },
  context_danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.30)',
  },
  contextTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  contextIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  contextTitle: { color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  contextBody: { color: colors.textSub, fontSize: 14, lineHeight: 21, marginTop: 8 },
  contextAction: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contextActionText: { color: colors.white, fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  // SOS Panel
  sosPanel: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sosPanelActive: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  panelLabel: {
    color: colors.textSub,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  sosStage: {
    minHeight: Math.min(260, SCREEN_WIDTH * 0.65),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosHint: {
    color: colors.textHint,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 16,
    letterSpacing: 0.2,
  },
  countdownWrap: { alignItems: 'center', justifyContent: 'center' },
  countdownLabel: { color: colors.textSub, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  countdownNumber: { color: colors.white, fontSize: 86, fontWeight: '800', marginVertical: 4 },
  cancelCountdown: {
    minHeight: 46,
    paddingHorizontal: 22,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cancelCountdownText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },

  // Delivery status
  deliveryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  deliveryText: { color: colors.textSub, fontSize: 13, fontWeight: '500', flex: 1 },

  // Protection status
  statusGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },

  // Guardian card
  guardianCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.textSub,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  guardianTitle: { color: colors.text, fontSize: 17, lineHeight: 22, fontWeight: '700', marginTop: 7 },
  guardianBody: { color: colors.textSub, fontSize: 13, lineHeight: 19, marginTop: 6 },
  guardianNavBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginLeft: 12,
  },

  // Emergency dial
  helpRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
    minHeight: 72,
  },
  dialIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  dialLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  dialNumber: { color: colors.textSub, fontSize: 11, marginTop: 3, fontWeight: '500' },
  dialCallIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  // Tools section
  toolsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toolsHint: { color: colors.textHint, fontSize: 12, marginTop: 4 },
  toolsChevron: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsList: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: 8,
  },
  toolRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toolTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  toolDescription: { color: colors.textSub, fontSize: 12, marginTop: 3 },

  // Stealth calculator
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
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 22,
    marginBottom: 14,
  },
  calcText: { color: colors.white, fontSize: 56, fontWeight: '300' },
  calcRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  calcButton: {
    flex: 1,
    aspectRatio: 1.1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcOperator: { backgroundColor: colors.card },
  calcEqual: { backgroundColor: colors.primary },
  calcClear: { backgroundColor: colors.textHint },
  calcButtonText: { color: colors.white, fontSize: 28, fontWeight: '500' },
});
