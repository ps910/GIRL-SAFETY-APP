/**
 * SafeHer Onboarding
 *
 * First-run goal: make a new user confident in under 60 seconds.
 * The flow asks only for what improves the core safety promise.
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
import { T } from '../components/ui';

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
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <View style={styles.topBar}>
        <View style={styles.brandMark}>
          <Ionicons name="shield-checkmark" size={22} color={T.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>SafeHer</Text>
          <Text style={styles.progress}>{progress}</Text>
        </View>
        {step > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={back} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={T.text} />
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
                  placeholderTextColor={T.textHint}
                  style={styles.input}
                  autoCapitalize="words"
                  accessibilityLabel="Guardian name"
                />
                <TextInput
                  value={guardianPhone}
                  onChangeText={setGuardianPhone}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={T.textHint}
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
        {step === 0 && <PrimaryAction label="Set up protection" onPress={next} />}
        {step === 1 && (
          <>
            <PrimaryAction label="Allow location" onPress={requestLocation} />
            <SecondaryAction label="I'll review later" onPress={next} />
          </>
        )}
        {step === 2 && <PrimaryAction label={existingGuardianCount > 0 ? 'Continue' : 'Save guardian'} onPress={saveGuardian} loading={savingGuardian} />}
        {step === 3 && <PrimaryAction label={drillDone ? 'Continue' : 'Run SOS rehearsal'} onPress={drillDone ? next : runSOSDrill} />}
        {step === 4 && <PrimaryAction label="Enter SafeHer" onPress={finish} />}
      </View>
    </KeyboardAvoidingView>
  );
}

function StepShell({ icon, eyebrow, title, body, children }) {
  return (
    <View>
      <View style={styles.heroIcon}>
        <Ionicons name={icon} size={38} color={T.primary} />
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
        <Ionicons name={icon} size={17} color={T.text} />
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
      <View style={[styles.rowIcon, granted && { backgroundColor: `${T.success}1F` }]}>
        <Ionicons name={granted ? 'checkmark-circle' : 'location'} size={18} color={granted ? T.success : T.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      <Text style={[styles.permissionStatus, granted && { color: T.success }]}>
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

function PrimaryAction({ label, onPress, loading }) {
  return (
    <TouchableOpacity style={styles.primaryAction} onPress={onPress} activeOpacity={0.88} disabled={loading}>
      <Text style={styles.primaryActionText}>{loading ? 'Saving...' : label}</Text>
      {!loading && <Ionicons name="arrow-forward" size={18} color={T.white} />}
    </TouchableOpacity>
  );
}

function SecondaryAction({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.secondaryAction} onPress={onPress} activeOpacity={0.78}>
      <Text style={styles.secondaryActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.primary,
    marginRight: 12,
  },
  brand: { color: T.text, fontSize: 22, fontWeight: '900' },
  progress: { color: T.textSub, fontSize: 12, fontWeight: '700', marginTop: 2 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 22,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: T.primary, borderRadius: 999 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  heroIcon: {
    width: 82,
    height: 82,
    borderRadius: 24,
    backgroundColor: T.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  eyebrow: { color: T.primary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: T.text, fontSize: 32, lineHeight: 38, fontWeight: '900', marginTop: 10 },
  body: { color: T.textSub, fontSize: 15, lineHeight: 23, marginTop: 14 },
  stepDetails: { marginTop: 26 },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surface,
    marginRight: 12,
  },
  rowTitle: { color: T.text, fontSize: 14, fontWeight: '900' },
  rowBody: { color: T.textSub, fontSize: 12, lineHeight: 17, marginTop: 3 },
  permissionBox: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.card,
    borderRadius: 18,
    padding: 14,
  },
  permissionGranted: { borderColor: 'rgba(16,185,129,0.35)' },
  permissionStatus: { color: T.warning, fontSize: 12, fontWeight: '900' },
  form: { gap: 12 },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.card,
    color: T.text,
    fontSize: 15,
    paddingHorizontal: 16,
  },
  drillButton: {
    height: 174,
    borderRadius: 87,
    backgroundColor: T.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  drillButtonDone: { backgroundColor: T.success },
  drillText: { color: T.white, fontSize: 21, fontWeight: '900' },
  drillSub: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '800', marginTop: 7 },
  readyGrid: { flexDirection: 'row', gap: 10 },
  readyItem: {
    flex: 1,
    minHeight: 84,
    borderRadius: 17,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    justifyContent: 'center',
  },
  readyValue: { color: T.text, fontSize: 15, fontWeight: '900' },
  readyLabel: { color: T.textSub, fontSize: 11, fontWeight: '800', marginTop: 6 },
  actions: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 42 : 24, gap: 10 },
  primaryAction: {
    minHeight: 56,
    borderRadius: 17,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryActionText: { color: T.white, fontSize: 16, fontWeight: '900' },
  secondaryAction: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { color: T.textSub, fontSize: 14, fontWeight: '800' },
});
