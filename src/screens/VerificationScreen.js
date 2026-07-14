import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Screen, Header, Card, Input, Label, PrimaryBtn, T } from '../components/ui';

export default function VerificationScreen() {
  const navigation = useNavigation();
  const { userProfile, updateProfile } = useAuth();

  const [mode, setMode] = useState(null); // 'student' | 'verified_female' | null
  const [loading, setLoading] = useState(false);

  // Student Tier Form Fields
  const [collegeEmail, setCollegeEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [expectedOtp, setExpectedOtp] = useState('');

  // Verified Female Tier Form Fields
  const [idNumber, setIdNumber] = useState('');
  const [idType, setIdType] = useState('aadhaar'); // aadhaar, passport, license
  const [selfieAttached, setSelfieAttached] = useState(false);
  const [idDocumentAttached, setIdDocumentAttached] = useState(false);

  const startStudentVerification = () => {
    if (!collegeEmail.endsWith('.edu') && !collegeEmail.includes('edu.')) {
      Alert.alert('Invalid Email', 'Please enter a valid institution or college email (.edu).');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setExpectedOtp(code);
      setOtpSent(true);
      Alert.alert('OTP Sent', `A verification code has been sent to ${collegeEmail}. (For prototype use: ${code})`);
    }, 1500);
  };

  const confirmStudentVerification = async () => {
    if (otpCode !== expectedOtp) {
      Alert.alert('Incorrect OTP', 'The code you entered does not match.');
      return;
    }
    setLoading(true);
    try {
      const updated = {
        ...userProfile,
        trustLevel: 'student',
        collegeEmail,
        verificationStatus: 'approved',
      };
      await updateProfile(updated);
      await AsyncStorage.setItem('@safeher_kyc_status', 'student');
      setLoading(false);
      Alert.alert('Verified', 'Your student status has been verified successfully!', [
        { text: 'Great', onPress: () => navigation.goBack() },
      ]);
    } catch {
      setLoading(false);
      Alert.alert('Error', 'Verification failed. Please try again.');
    }
  };

  const submitFemaleVerification = async () => {
    if (!idNumber) {
      Alert.alert('ID Missing', 'Please enter your document ID number.');
      return;
    }
    if (!idDocumentAttached || !selfieAttached) {
      Alert.alert('Attachments Missing', 'Please take/attach both your ID document and a selfie.');
      return;
    }

    setLoading(true);
    try {
      const updated = {
        ...userProfile,
        trustLevel: 'unverified',
        verificationStatus: 'pending',
        genderDeclared: 'female',
        idDocumentUrl: `mock_docs/${idType}_${idNumber}.jpg`,
        selfieUrl: `mock_docs/selfie_${Date.now()}.jpg`,
      };
      await updateProfile(updated);
      await AsyncStorage.setItem('@safeher_kyc_status', 'pending');
      setLoading(false);
      Alert.alert(
        'Submission Received',
        'Your profile has been submitted for manual admin verification. This process typically takes 12–24 hours.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch {
      setLoading(false);
      Alert.alert('Error', 'Failed to submit documents.');
    }
  };

  return (
    <Screen>
      <Header title="Safety Verification" subtitle="Upgrade your trust tier badges" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {mode === null && (
          <View style={{ gap: 16, marginTop: 12 }}>
            <Text style={styles.introText}>
              Suraksha enforces a strict trust circle. Get verified to unlock community features and signal safety status.
            </Text>

            {/* Option 1: Student Verification */}
            <Card style={styles.optionCard}>
              <View style={styles.optionHeader}>
                <Ionicons name="school" size={32} color={T.warning} />
                <Text style={styles.optionTitle}>Student Verification</Text>
              </View>
              <Text style={styles.optionDesc}>
                Auto-unlock basic peer companion requests by verifying your college/institution email domain.
              </Text>
              <TouchableOpacity style={styles.optionBtn} onPress={() => setMode('student')}>
                <Text style={styles.optionBtnText}>Verify student (.edu)</Text>
              </TouchableOpacity>
            </Card>

            {/* Option 2: Verified Female Verification */}
            <Card style={styles.optionCard}>
              <View style={styles.optionHeader}>
                <Ionicons name="shield-checkmark" size={32} color="#10B981" />
                <Text style={styles.optionTitle}>Verified Female</Text>
              </View>
              <Text style={styles.optionDesc}>
                Highest safety badge. ID verification + matching selfie checks. Reviewed manually by SafeHer admins.
              </Text>
              <TouchableOpacity style={[styles.optionBtn, { backgroundColor: '#10B981' }]} onPress={() => setMode('verified_female')}>
                <Text style={styles.optionBtnText}>Verify ID + Selfie</Text>
              </TouchableOpacity>
            </Card>
          </View>
        )}

        {mode === 'student' && (
          <Card style={{ gap: 14, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => setMode(null)}>
                <Ionicons name="arrow-back" size={20} color={T.textSub} />
              </TouchableOpacity>
              <Text style={styles.formTitle}>Student Verification</Text>
            </View>

            {!otpSent ? (
              <View style={{ gap: 12 }}>
                <Label>College Email Address</Label>
                <Input
                  value={collegeEmail}
                  onChangeText={setCollegeEmail}
                  placeholder="name@university.edu"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <PrimaryBtn loading={loading} onPress={startStudentVerification} style={{ marginTop: 8 }}>
                  Send Verification OTP
                </PrimaryBtn>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={{ color: T.textSub, fontSize: 13 }}>
                  We have sent a verification code to {collegeEmail}. Please input it below.
                </Text>
                <Label>Enter 6-Digit OTP</Label>
                <Input
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <PrimaryBtn loading={loading} onPress={confirmStudentVerification} style={{ marginTop: 8 }}>
                  Confirm Verification Code
                </PrimaryBtn>
              </View>
            )}
          </Card>
        )}

        {mode === 'verified_female' && (
          <Card style={{ gap: 14, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => setMode(null)}>
                <Ionicons name="arrow-back" size={20} color={T.textSub} />
              </TouchableOpacity>
              <Text style={styles.formTitle}>Verified Female Identity</Text>
            </View>

            <Label>Select Identification Type</Label>
            <View style={styles.idSelection}>
              {['aadhaar', 'passport', 'license'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.idSelectBtn, idType === t && styles.idSelectBtnActive]}
                  onPress={() => setIdType(t)}
                >
                  <Text style={[styles.idSelectText, idType === t && styles.idSelectTextActive]}>
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label>Document ID Number</Label>
            <Input
              value={idNumber}
              onChangeText={setIdNumber}
              placeholder="Enter document reference number"
              autoCapitalize="characters"
            />

            <Label>Attach ID Document Photo</Label>
            <TouchableOpacity
              style={[styles.attachmentBox, idDocumentAttached && styles.attachmentBoxActive]}
              onPress={() => {
                setIdDocumentAttached(true);
                Alert.alert('ID Captured', 'Mock document scanner captured successfully.');
              }}
            >
              <Ionicons name={idDocumentAttached ? 'checkmark-circle' : 'camera-outline'} size={24} color={idDocumentAttached ? '#10B981' : T.textSub} />
              <Text style={[styles.attachmentText, idDocumentAttached && { color: '#10B981' }]}>
                {idDocumentAttached ? 'ID Document Captured' : 'Capture ID Document'}
              </Text>
            </TouchableOpacity>

            <Label>Attach Verification Selfie</Label>
            <TouchableOpacity
              style={[styles.attachmentBox, selfieAttached && styles.attachmentBoxActive]}
              onPress={() => {
                setSelfieAttached(true);
                Alert.alert('Selfie Captured', 'Mock selfie captured successfully.');
              }}
            >
              <Ionicons name={selfieAttached ? 'checkmark-circle' : 'person-add-outline'} size={24} color={selfieAttached ? '#10B981' : T.textSub} />
              <Text style={[styles.attachmentText, selfieAttached && { color: '#10B981' }]}>
                {selfieAttached ? 'Verification Selfie Captured' : 'Take Selfie'}
              </Text>
            </TouchableOpacity>

            <PrimaryBtn loading={loading} onPress={submitFemaleVerification} style={{ marginTop: 8 }}>
              Submit for Admin Approval
            </PrimaryBtn>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  introText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: T.textSub,
    lineHeight: 20,
    marginBottom: 8,
  },
  optionCard: {
    padding: 20,
    gap: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 18,
    fontWeight: '700',
    color: T.white,
  },
  optionDesc: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: T.textSub,
    lineHeight: 18,
  },
  optionBtn: {
    backgroundColor: T.warning,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  optionBtnText: {
    fontFamily: 'Space Grotesk',
    fontSize: 14,
    fontWeight: '700',
    color: T.white,
  },
  formTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 18,
    fontWeight: '700',
    color: T.white,
  },
  idSelection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  idSelectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  idSelectBtnActive: {
    borderColor: T.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  idSelectText: {
    fontFamily: 'Space Grotesk',
    fontSize: 12,
    fontWeight: '700',
    color: T.textSub,
  },
  idSelectTextActive: {
    color: T.white,
  },
  attachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 60,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.01)',
    marginBottom: 8,
  },
  attachmentBoxActive: {
    borderColor: '#10B981',
    borderStyle: 'solid',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  attachmentText: {
    fontFamily: 'Space Grotesk',
    fontSize: 13,
    color: T.textSub,
    fontWeight: '600',
  },
});
