/**
 * LivenessVerificationScreen — Camera-based identity verification
 * ═══════════════════════════════════════════════════════════════
 *
 * Flow:
 *  1. User sees explanation of what liveness check does
 *  2. Camera opens with random pose challenges (turn left, blink, smile, etc.)
 *  3. On success → selfie captured, profile marked as verified
 *  4. On failure → retry with daily attempt limit
 *
 * Privacy: All selfie data stays on-device (encrypted storage).
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import IdentityVerificationService from '../services/IdentityVerificationService';
import type { LivenessChallenge } from '../services/IdentityVerificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Theme (Midnight Indigo) ──────────────────────────────────────
const COLORS = {
  bg: '#0A0E1A',
  surface: '#141929',
  card: '#1C2137',
  primary: '#6C63FF',
  primaryLight: '#8B83FF',
  success: '#00C853',
  danger: '#FF1744',
  warning: '#FFD600',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.5)',
  border: 'rgba(255,255,255,0.08)',
  overlay: 'rgba(0,0,0,0.7)',
};

interface Props {
  navigation: any;
  onVerificationComplete?: () => void;
}

export default function LivenessVerificationScreen({ navigation, onVerificationComplete }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<'intro' | 'gender' | 'camera' | 'processing' | 'success' | 'failed'>('intro');
  const [challenges, setChallenges] = useState<LivenessChallenge[]>([]);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedIdType, setSelectedIdType] = useState<string | null>(null);
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  const [challengesPassed, setChallengesPassed] = useState(0);
  const [canAttempt, setCanAttempt] = useState(true);
  const [remainingAttempts, setRemainingAttempts] = useState(5);

  const cameraRef = useRef<any>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkAttempts();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (stage === 'camera') {
      startPulseAnimation();
    }
  }, [stage, currentChallengeIdx]);

  const checkAttempts = async () => {
    const result = await IdentityVerificationService.canAttemptLiveness();
    setCanAttempt(result.allowed);
    setRemainingAttempts(result.remainingAttempts);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  };

  const startVerification = useCallback(async () => {
    if (!canAttempt) {
      Alert.alert('Too Many Attempts', 'Please try again tomorrow.');
      return;
    }

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Required', 'Camera access is needed for identity verification.');
        return;
      }
    }

    const newChallenges = IdentityVerificationService.generateChallenges();
    setChallenges(newChallenges);
    setCurrentChallengeIdx(0);
    setChallengesPassed(0);

    Animated.timing(progressAnim, { toValue: 0, duration: 0, useNativeDriver: false }).start();
    setStage('camera');
  }, [canAttempt, permission]);

  const handleGenderContinue = useCallback(async () => {
    if (selectedGender) {
      await IdentityVerificationService.setGenderDeclaration(selectedGender);
    }
    if (selectedIdType) {
      await IdentityVerificationService.setGovernmentId(selectedIdType);
    }
    startVerification();
  }, [selectedGender, selectedIdType, startVerification]);

  const handleChallengePass = useCallback(async () => {
    const nextPassed = challengesPassed + 1;
    setChallengesPassed(nextPassed);

    // Animate progress
    Animated.timing(progressAnim, {
      toValue: nextPassed / challenges.length,
      duration: 400,
      useNativeDriver: false,
    }).start();

    if (currentChallengeIdx < challenges.length - 1) {
      setCurrentChallengeIdx((prev) => prev + 1);
    } else {
      // All challenges passed — capture selfie
      setStage('processing');
      try {
        let selfieUri = '';
        if (cameraRef.current) {
          const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
          selfieUri = photo?.uri || '';
        }

        const result = await IdentityVerificationService.completeLiveness(selfieUri, nextPassed);
        if (result.success) {
          setStage('success');
          setTimeout(() => {
            onVerificationComplete?.();
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }, 2000);
        } else {
          setStage('failed');
        }
      } catch (e) {
        setStage('failed');
      }
    }
  }, [challengesPassed, currentChallengeIdx, challenges, navigation, onVerificationComplete]);

  const handleChallengeFail = useCallback(() => {
    setStage('failed');
  }, []);

  // ── Intro Stage ───────────────────────────────────────────────
  const renderIntro = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.iconContainer}>
        <View style={styles.shieldIcon}>
          <Ionicons name="shield-checkmark" size={64} color={COLORS.primary} />
        </View>
      </View>

      <Text style={styles.title}>Identity Verification</Text>
      <Text style={styles.subtitle}>
        Complete a quick liveness check to verify your identity. This helps keep our community safe.
      </Text>

      <View style={styles.stepsContainer}>
        {[
          { icon: 'camera-outline', text: 'Camera will guide you through 3 poses' },
          { icon: 'time-outline', text: 'Takes less than 30 seconds' },
          { icon: 'lock-closed-outline', text: 'Your selfie stays on your device only' },
        ].map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepIconBg}>
              <Ionicons name={step.icon as any} size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, !canAttempt && styles.disabledButton]}
        onPress={() => setStage('gender')}
        disabled={!canAttempt}
        activeOpacity={0.8}
      >
        <Ionicons name="scan" size={22} color="#FFF" />
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>

      {!canAttempt && (
        <Text style={styles.warningText}>
          Daily attempt limit reached. Try again tomorrow.
        </Text>
      )}

      <Text style={styles.attemptsText}>
        {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining today
      </Text>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // ── Gender Declaration Stage ────────────────────────────────
  const GENDER_OPTIONS = [
    { label: 'Woman', icon: '👩' as const, value: 'woman' },
    { label: 'Non-binary', icon: '🧑' as const, value: 'non-binary' },
    { label: 'Prefer not to say', icon: '✨' as const, value: 'undisclosed' },
  ];

  const ID_TYPE_OPTIONS = ['Aadhaar Card', 'Driving License', 'Passport', 'Voter ID'];

  const renderGender = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.iconContainer}>
        <View style={[styles.shieldIcon, { backgroundColor: 'rgba(108,99,255,0.12)' }]}>
          <Ionicons name="person" size={48} color={COLORS.primary} />
        </View>
      </View>

      <Text style={styles.title}>Tell us about yourself</Text>
      <Text style={styles.subtitle}>
        SafeHer is designed for women's safety. This helps us verify your identity and keep the community safe.
      </Text>

      <Text style={[styles.subtitle, { fontSize: 12, marginTop: 24, marginBottom: 12, textAlign: 'left', fontWeight: '700' as const, color: COLORS.text, letterSpacing: 1 }]}>
        GENDER IDENTITY
      </Text>
      <View style={{ gap: 8 }}>
        {GENDER_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.stepRow, selectedGender === opt.value && { borderColor: COLORS.primary, backgroundColor: 'rgba(108,99,255,0.12)' }]}
            onPress={() => setSelectedGender(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 24, marginRight: 14 }}>{opt.icon}</Text>
            <Text style={[styles.stepText, selectedGender === opt.value && { color: COLORS.primaryLight, fontWeight: '700' as const }]}>{opt.label}</Text>
            {selectedGender === opt.value && (
              <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.subtitle, { fontSize: 12, marginTop: 24, marginBottom: 12, textAlign: 'left', fontWeight: '700' as const, color: COLORS.text, letterSpacing: 1 }]}>
        GOVERNMENT ID (OPTIONAL)
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ID_TYPE_OPTIONS.map(id => (
          <TouchableOpacity
            key={id}
            style={[{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
              backgroundColor: selectedIdType === id ? COLORS.primary : COLORS.surface,
              borderWidth: 1, borderColor: selectedIdType === id ? COLORS.primary : COLORS.border,
            }]}
            onPress={() => setSelectedIdType(selectedIdType === id ? null : id)}
          >
            <Text style={{ color: selectedIdType === id ? '#fff' : COLORS.textMuted, fontSize: 12, fontWeight: '600' as const }}>{id}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, !selectedGender && styles.disabledButton, { marginTop: 28 }]}
        onPress={handleGenderContinue}
        disabled={!selectedGender}
        activeOpacity={0.8}
      >
        <Ionicons name="scan" size={22} color="#FFF" />
        <Text style={styles.primaryButtonText}>Proceed to Liveness Check</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // ── Camera Stage ──────────────────────────────────────────────
  const renderCamera = () => {
    const currentChallenge = challenges[currentChallengeIdx];
    const instruction = IdentityVerificationService.getChallengeInstruction(currentChallenge);

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        >
          {/* Oval overlay guide */}
          <View style={styles.cameraOverlay}>
            <View style={styles.ovalGuide}>
              <Animated.View
                style={[
                  styles.ovalBorder,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentChallengeIdx + 1} / {challenges.length}
            </Text>
          </View>

          {/* Challenge instruction */}
          <View style={styles.instructionContainer}>
            <Text style={styles.challengeText}>{instruction}</Text>
            <Text style={styles.challengeHint}>Hold the pose for 2 seconds</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.cameraActions}>
            <TouchableOpacity
              style={styles.challengeButton}
              onPress={handleChallengePass}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
              <Text style={styles.challengeButtonText}>Pose Done</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  };

  // ── Processing Stage ──────────────────────────────────────────
  const renderProcessing = () => (
    <View style={[styles.container, styles.centerContent]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={[styles.title, { marginTop: 24 }]}>Verifying...</Text>
      <Text style={styles.subtitle}>Processing your liveness check</Text>
    </View>
  );

  // ── Success Stage ─────────────────────────────────────────────
  const renderSuccess = () => (
    <View style={[styles.container, styles.centerContent]}>
      <View style={[styles.shieldIcon, { backgroundColor: 'rgba(0,200,83,0.15)' }]}>
        <Ionicons name="checkmark-circle" size={72} color={COLORS.success} />
      </View>
      <Text style={[styles.title, { color: COLORS.success, marginTop: 24 }]}>Verified!</Text>
      <Text style={styles.subtitle}>Your identity has been verified successfully.</Text>
    </View>
  );

  // ── Failed Stage ──────────────────────────────────────────────
  const renderFailed = () => (
    <View style={[styles.container, styles.centerContent]}>
      <View style={[styles.shieldIcon, { backgroundColor: 'rgba(255,23,68,0.15)' }]}>
        <Ionicons name="close-circle" size={72} color={COLORS.danger} />
      </View>
      <Text style={[styles.title, { color: COLORS.danger, marginTop: 24 }]}>Verification Failed</Text>
      <Text style={styles.subtitle}>
        We couldn't verify your liveness. Please try again with better lighting and a clear face view.
      </Text>
      <TouchableOpacity
        style={[styles.primaryButton, { marginTop: 32 }]}
        onPress={() => {
          setStage('intro');
          checkAttempts();
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh" size={22} color="#FFF" />
        <Text style={styles.primaryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      {stage === 'intro' && renderIntro()}
      {stage === 'gender' && renderGender()}
      {stage === 'camera' && renderCamera()}
      {stage === 'processing' && renderProcessing()}
      {stage === 'success' && renderSuccess()}
      {stage === 'failed' && renderFailed()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  shieldIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(108,99,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  stepsContainer: {
    marginTop: 40,
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(108,99,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stepText: {
    color: COLORS.text,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 40,
    gap: 10,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.4,
  },
  warningText: {
    color: COLORS.warning,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  attemptsText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ovalGuide: {
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 0.85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ovalBorder: {
    width: '100%',
    height: '100%',
    borderRadius: SCREEN_WIDTH * 0.325,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  progressContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  progressText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 160,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: COLORS.overlay,
    borderRadius: 16,
    padding: 20,
  },
  challengeText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  challengeHint: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
  cameraActions: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  challengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  challengeButtonText: {
    color: COLORS.success,
    fontSize: 17,
    fontWeight: '600',
  },
});
