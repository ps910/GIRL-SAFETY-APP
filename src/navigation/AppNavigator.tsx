/**
 * SafeHer Navigator — Midnight Indigo Edition
 *
 * Goal-based primary navigation:
 * Home -> immediate protection & SOS
 * Journey -> planned travel & history
 * Guardians -> trusted people network
 * Profile -> safety identity, privacy & account
 *
 * Secondary tools remain in the stack so the first screen never feels like
 * a toolbox during an emergency.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { useEmergency } from '../context/EmergencyContext';
import { colors, radius, spacing } from '@safeher/shared';

import type { RootStackParamList, TabParamList } from '../types';

import HomeScreen from '../screens/HomeScreen';
import ContactsScreen from '../screens/ContactsScreen';
import FakeCallScreen from '../screens/FakeCallScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SelfDefenseScreen from '../screens/SelfDefenseScreen';
import NearbyHelpScreen from '../screens/NearbyHelpScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EvidenceVaultScreen from '../screens/EvidenceVaultScreen';
import GuardianModeScreen from '../screens/GuardianModeScreen';
import JourneyTrackerScreen from '../screens/JourneyTrackerScreen';
import IncidentReportScreen from '../screens/IncidentReportScreen';
import HiddenCameraScreen from '../screens/HiddenCameraScreen';
import LivenessVerificationScreen from '../screens/LivenessVerificationScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['shield-checkmark', 'shield-checkmark-outline'],
  Journey: ['navigate', 'navigate-outline'],
  Guardians: ['people', 'people-outline'],
  ProfileTab: ['person-circle', 'person-circle-outline'],
};

function CustomTabIcon({
  name,
  focused,
  color,
}: {
  name: keyof TabParamList;
  focused: boolean;
  color: string;
}) {
  const [active, inactive] = TAB_ICONS[name];
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={focused ? active : inactive} size={focused ? 22 : 20} color={color} />
    </View>
  );
}

function TabNavigator(): React.JSX.Element {
  const { isSOSActive, stealthMode } = useEmergency();
  const homeLabel = stealthMode ? 'Calculator' : 'Home';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => (
          <CustomTabIcon name={route.name as keyof TabParamList} focused={focused} color={color} />
        ),
        tabBarActiveTintColor: isSOSActive ? colors.danger : colors.primary,
        tabBarInactiveTintColor: colors.textHint,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
          elevation: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.36,
          shadowRadius: 14,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
          letterSpacing: 0.2,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: homeLabel }} />
      <Tab.Screen name="Journey" component={JourneyTrackerScreen} options={{ tabBarLabel: 'Journey' }} />
      <Tab.Screen name="Guardians" component={ContactsScreen} options={{ tabBarLabel: 'Guardians' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="FakeCall" component={FakeCallScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SelfDefense" component={SelfDefenseScreen} />
      <Stack.Screen name="NearbyHelp" component={NearbyHelpScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EvidenceVault" component={EvidenceVaultScreen} />
      <Stack.Screen name="GuardianMode" component={GuardianModeScreen} />
      <Stack.Screen name="JourneyTracker" component={JourneyTrackerScreen} />
      <Stack.Screen name="IncidentReport" component={IncidentReportScreen} />
      <Stack.Screen name="HiddenCamera" component={HiddenCameraScreen} />
      <Stack.Screen
        name="LivenessVerification"
        component={LivenessVerificationScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primaryMuted,
  },
});
