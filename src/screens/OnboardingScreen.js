/**
 * OnboardingScreen — SafeHer Onboarding Flow (Midnight Indigo)
 *
 * First-run goal: make a new user confident in under 60 seconds.
 * The flow asks only for what improves the core safety promise.
 *
 * Design: Midnight Indigo color scheme, Space Grotesk headings, DM Sans body text.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useEmergency } from '../context/EmergencyContext';
import { colors, spacing, radius, typography } from '@safeher/shared';
import { PrimaryBtn, GhostBtn, FloatingOrb, StatusDot } from '../components/ui';

const ONBOARD_KEY = '@gs_onboarded';

export const isOnboardingComplete = async () => {
  try {
    const value = await AsyncStorage.getItem(ONBOARD_KEY);
    return value === 'true';
  } catch {
    return false;
  }
};

const STEPS = [
  'Promise',
  'Location',
  'Guardians',
  'SOS Drill',
  'Protected',
];

export default function OnboardingScreen({ onComplete }) {
  const { emergencyContacts, addContact } = useEmergency();
  const [step, setStep] = useState(0);
  const [locationStatus, setLocationStatus] = useState('unknown');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [savingGuardian, setSavingGuardian] = useState(false);
  const [drillDone, setDrillDone] = useState(false);

  const existingGuardianCount = emergencyContacts.length;
  const progress = useMemo(() => `${step + 1} of ${STEPS.length}`, [step]);

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARD_KEY, 'true');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete?.();
  };

  const next = () => {
    Haptics.selectionAsync();
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const back = () => {
    Haptics.selectionAsync();
    setStep((value) => Math.max(value - 1, 0));
  };

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationStatus(status);
    if (status === 'granted') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      next();
    } else {
      Alert.alert(
        'Location is the core of SOS',
        'SafeHer can still open, but emergency contacts will not know where to find you until location is allowed.',
      );
    }
  };

  const saveGuardian = async () => {
    if (existingGuardianCount > 0) {
      next();
      return;
    }
    const cleanPhone = guardianPhone.replace(/[^0-9+]/g, '');
    if (!guardianName.trim()) {
      Alert.alert('Guardian name needed', 'Add one trusted person who can act quickly.');
      return;
    }
    if (cleanPhone.length < 7) {
      Alert.alert('Phone number needed', 'Use a complete phone number with country code if possible.');
      return;
    }
    setSavingGuardian(true);
    try {
      await addContact({
        name: guardianName.trim(),
        phone: guardianPhone.trim(),
        relationship: 'Guardian',
        tier: 1,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      next();
    } catch (error) {
      Alert.alert('Could not save guardian', error?.message || 'Try again in a moment.');
    } finally {
      setSavingGuardian(false);
    }
  };

  const runSOSDrill = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDrillDone(true);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <FloatingOrb size={200} color={colors.primary} startX={-40} startY={100} duration={14000} />

      <View style={styles.topBar}>
        <View style={styles.brandMark}>
          <Ionicons name="shield-checkmark" size={22} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>SafeHer</Text>
          <Text style={styles.progress}>{progress}</Text>
        </View>
        {step > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={back} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>

      <View style={styles.content}>
        {step === 0 && (
          <StepShell
            icon="shield"
            eyebrow="The promise"
            title="If something goes wrong, SafeHer knows what to do."
            body="One emergency action can alert your guardians, share location, start evidence capture and keep tracking until you are safe."
          >
            <TrustRow icon="eye-off" title="No feature hunting" body="SOS stays obvious. Extra tools stay out of the way." />
            <TrustRow icon="lock-closed" title="Private by default" body="Guardian and emergency data is kept protected on this device." />
            <TrustRow icon="people" title="Human backup" body="SafeHer works best when your trusted people are set up now." />
          </StepShell>
        )}

        {step === 1 && (
          <StepShell
            icon="location"
            eyebrow="Permission"
            title="Location is only useful when it reaches the right people."
            body="SafeHer asks for location so SOS and Safe Journey can show guardians where you are. It is not a social feed."
          >
            <PermissionBox
              status={locationStatus}
              title="Location"
              body="Needed for live SOS links, journey ETA checks and emergency context."
            />
          </StepShell>
        )}

        {step === 2 && (
          <StepShell
            icon="people"
            eyebrow="Guardians"
            title={existingGuardianCount > 0 ? 'Your guardians are ready.' : 'Add one person who should know first.'}
            body={existingGuardianCount > 0
              ? `${existingGuardianCount} trusted contact${existingGuardianCount === 1 ? '' : 's'} already connected.`
              : 'In a real emergency, the app should not ask who to contact. Decide now, calmly.'}
          >
            {existingGuardianCount === 0 ? (
              <View style={styles.form}>
                <TextInput
                  value={guardianName}
                  onChangeText={setGuardianName}
                  placeholder="Guardian name"
                  placeholderTextColor={colors.textHint}
                  style={styles.input}
                  autoCapitalize="words"
                  accessibilityLabel="Guardian name"
                />
                <TextInput
                  value={guardianPhone}
                  onChangeText={setGuardianPhone}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.textHint}
                  style={styles.input}
                  keyboardType="phone-pad"
                  accessibilityLabel="Guardian phone number"
                />
              </View>
            ) : (
              <TrustRow icon="checkmark-circle" title="Guardian connected" body="SOS can now alert a real trusted person." />
            )}
          </StepShell>
        )}

        {step === 3 && (
          <StepShell
            icon="alert-circle"
            eyebrow="SOS drill"
            title="Practice once so there is nothing to learn later."
            body="This rehearsal does not send alerts. It teaches your hands what to do before a stressful moment."
          >
            <TouchableOpacity
              style={[styles.drillButton, drillDone && styles.drillButtonDone]}
              onPress={runSOSDrill}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Run SOS practice"
            >
              <Text style={styles.drillText}>{drillDone ? 'SOS rehearsal complete' : 'Hold in real emergencies'}</Text>
              <Text style={styles.drillSub}>{drillDone ? 'You know the motion now.' : 'Tap to practice safely.'}</Text>
            </TouchableOpacity>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell
            icon="checkmark-circle"
            eyebrow="Ready"
            title="You are now protected."
            body="Your first SafeHer setup is complete. The home screen will keep SOS first, suggest Safe Journey at the right time and keep guardians close."
          >
            <View style={styles.readyGrid}>
              <ReadyItem label="SOS" value="Ready" />
              <ReadyItem label="Location" value={locationStatus === 'granted' ? 'Verified' : 'Review later'} />
              <ReadyItem label="Guardians" value={`${Math.max(1, existingGuardianCount)} set`} />
            </View>
          </StepShell>
        )}
      </View>

      <View style={styles.actions}>
        {step === 0 && <PrimaryBtn onPress={next}>Set up protection</PrimaryBtn>}
        {step === 1 && (
          <>
            <PrimaryBtn onPress={requestLocation}>Allow location</PrimaryBtn>
            <GhostBtn onPress={next} color={colors.textSub}>I'll review later</GhostBtn>
          </>
        )}
        {step === 2 && (
          <PrimaryBtn onPress={saveGuardian} loading={savingGuardian}>
            {existingGuardianCount > 0 ? 'Continue' : 'Save guardian'}
          </PrimaryBtn>
        )}
        {step === 3 && (
          <PrimaryBtn onPress={drillDone ? next : runSOSDrill}>
            {drillDone ? 'Continue' : 'Run SOS rehearsal'}
          </PrimaryBtn>
        )}
        {step === 4 && <PrimaryBtn onPress={finish}>Enter SafeHer</PrimaryBtn>}
      </View>
    </KeyboardAvoidingView>
  );
}

function StepShell({ icon, eyebrow, title, body, children }) {
  return (
    <View>
      <View style={styles.heroIcon}>
        <Ionicons name={icon} size={38} color={colors.primary} />
      </View>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.stepDetails}>{children}</View>
    </View>
  );
}

function TrustRow({ icon, title, body }) {
  return (
    <View style={styles.trustRow}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={17} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
    </View>
  );
}

function PermissionBox({ status, title, body }) {
  const granted = status === 'granted';
  return (
    <View style={[styles.permissionBox, granted && styles.permissionGranted]}>
      <View style={[styles.rowIcon, granted && { backgroundColor: `${colors.success}1F` }]}>
        <Ionicons name={granted ? 'checkmark-circle' : 'location'} size={18} color={granted ? colors.success : colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      <Text style={[styles.permissionStatus, granted && { color: colors.success }]}>
        {granted ? 'Allowed' : 'Needed'}
      </Text>
    </View>
  );
}

function ReadyItem({ label, value }) {
  return (
    <View style={styles.readyItem}>
      <Text style={styles.readyValue}>{value}</Text>
      <Text style={styles.readyLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 58 : 34,
    paddingBottom: 14,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginRight: 12,
  },
  brand: { color: colors.text, fontSize: 22, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' },
  progress: { color: colors.textSub, fontSize: 12, fontWeight: '700', marginTop: 2 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 22,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 999 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  heroIcon: {
    width: 82,
    height: 82,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '700', marginTop: 10, fontFamily: 'SpaceGrotesk-Bold' },
  body: { color: colors.textSub, fontSize: 15, lineHeight: 23, marginTop: 14 },
  stepDetails: { marginTop: 26 },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginRight: 12,
  },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rowBody: { color: colors.textSub, fontSize: 12, lineHeight: 17, marginTop: 3 },
  permissionBox: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
  },
  permissionGranted: { borderColor: 'rgba(16,185,129,0.35)' },
  permissionStatus: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  form: { gap: 12 },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 16,
  },
  drillButton: {
    height: 174,
    borderRadius: 87,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  drillButtonDone: { backgroundColor: colors.success },
  drillText: { color: colors.white, fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' },
  drillSub: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '600', marginTop: 7 },
  readyGrid: { flexDirection: 'row', gap: 10 },
  readyItem: {
    flex: 1,
    minHeight: 84,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    justifyContent: 'center',
  },
  readyValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  readyLabel: { color: colors.textSub, fontSize: 11, fontWeight: '600', marginTop: 6 },
  actions: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 42 : 24, gap: 10 },
});
