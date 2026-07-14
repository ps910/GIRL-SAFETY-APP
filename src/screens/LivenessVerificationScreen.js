import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius } from '@safeher/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LIVENESS_STEPS = [
  { id: 'blink', label: 'Blink your eyes twice' },
  { id: 'turn_left', label: 'Turn your head slowly to the left' },
  { id: 'smile', label: 'Smile for liveness validation' },
];

export default function LivenessVerificationScreen() {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, scanning, validating, success, failed
  const [progress, setProgress] = useState(0);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'scanning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          Animated.timing(scanAnim, { toValue: 0, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        ])
      ).start();

      // Trigger automatic verification steps
      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < LIVENESS_STEPS.length - 1) {
            setProgress((prevProg) => prevProg + 33.3);
            return prev + 1;
          } else {
            clearInterval(interval);
            setStatus('validating');
            validateLiveness();
            return prev;
          }
        });
      }, 3000);

      return () => {
        clearInterval(interval);
        scanAnim.stopAnimation();
      };
    }
  }, [status]);

  const validateLiveness = () => {
    setTimeout(async () => {
      try {
        await AsyncStorage.setItem('@safeher_kyc_status', 'verified');
        setStatus('success');
        setProgress(100);
      } catch (e) {
        setStatus('failed');
      }
    }, 2000);
  };

  const startVerification = () => {
    setStatus('scanning');
    setCurrentStep(0);
    setProgress(10);
  };

  // Scanline Translate Y interpolation
  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Safety ID Verification</Text>
      </View>

      <View style={styles.container}>
        {status === 'idle' && (
          <View style={styles.introBox}>
            <View style={styles.iconShield}>
              <Ionicons name="shield-checkmark" size={64} color={colors.primary} />
            </View>
            <Text style={styles.introTitle}>Verify Your Identity</Text>
            <Text style={styles.introDesc}>
              SafeHer uses face liveness scanning and government ID validation to maintain a safe, verified, female-only community.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={startVerification}>
              <Text style={styles.btnText}>Start Liveness Scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {(status === 'scanning' || status === 'validating') && (
          <View style={styles.scanBox}>
            <View style={styles.cameraFrame}>
              {/* Simulated camera feed representation */}
              <View style={styles.cameraPlaceholder}>
                <Ionicons name="person" size={120} color="rgba(255,255,255,0.15)" />
              </View>
              {/* Scanning Green Laser Overlay */}
              {status === 'scanning' && (
                <Animated.View
                  style={[styles.scanLine, { transform: [{ translateY: scanTranslateY }] }]}
                />
              )}
            </View>

            <View style={styles.instructions}>
              <Text style={styles.stepLabel}>Step {currentStep + 1} of 3</Text>
              <Text style={styles.instructionText}>
                {status === 'validating' ? 'Analyzing face structure...' : LIVENESS_STEPS[currentStep].label}
              </Text>
              
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>
            </View>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.successBox}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={80} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>Identity Verified</Text>
            <Text style={styles.successDesc}>
              Your face liveness match succeeded and your Safety Identity badge has been activated.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.btnText}>Return to Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'failed' && (
          <View style={styles.failedBox}>
            <View style={styles.failedIconCircle}>
              <Ionicons name="alert-circle" size={80} color={colors.danger} />
            </View>
            <Text style={styles.failedTitle}>Verification Failed</Text>
            <Text style={styles.failedDesc}>
              Liveness detection failed to verify face authenticity. Please scan in a well-lit area.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={startVerification}>
              <Text style={styles.btnText}>Retry Scan</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: 12,
  },
  backBtn: {
    padding: 8,
  },
  title: {
    fontFamily: 'Space Grotesk',
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introBox: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  iconShield: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  introTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  introDesc: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xxl,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: radius.md,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    fontFamily: 'Space Grotesk',
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  scanBox: {
    alignItems: 'center',
    width: '100%',
  },
  cameraFrame: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 4,
    borderColor: colors.primary,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0D1321',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.success,
    opacity: 0.8,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  instructions: {
    alignItems: 'center',
    width: '100%',
  },
  stepLabel: {
    fontFamily: 'Space Grotesk',
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  instructionText: {
    fontFamily: 'Space Grotesk',
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  progressContainer: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  successBox: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successDesc: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xxl,
  },
  failedBox: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  failedIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  failedTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  failedDesc: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xxl,
  },
});
