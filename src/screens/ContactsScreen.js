/**
 * Guardians screen
 *
 * Product framing: these are not "contacts" in a utility list. They are the
 * people SafeHer trusts first when the user cannot think through choices.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEmergency } from '../context/EmergencyContext';
import {
  Screen,
  Header,
  Card,
  SectionTitle,
  PrimaryBtn,
  GhostBtn,
  Input,
  Label,
  EmptyState,
  Stat,
  Pill,
  T,
} from '../components/ui';

export default function ContactsScreen() {
  const { emergencyContacts, addContact, removeContact, updateContact } = useEmergency();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [tier, setTier] = useState(1);
  const [saving, setSaving] = useState(false);

  const primaryGuardians = useMemo(
    () => emergencyContacts.filter((contact) => (contact.tier || 1) === 1),
    [emergencyContacts],
  );
  const backupGuardians = useMemo(
    () => emergencyContacts.filter((contact) => (contact.tier || 1) === 2),
    [emergencyContacts],
  );

  const openAdd = () => {
    setEditing(null);
    setName('');
    setPhone('');
    setRelation('');
    setTier(1);
    setModalVisible(true);
  };

  const openEdit = (contact) => {
    setEditing(contact);
    setName(contact.name || '');
    setPhone(contact.phone || '');
    setRelation(contact.relationship || '');
    setTier(contact.tier || 1);
    setModalVisible(true);
  };

  const validate = () => {
    if (!name.trim()) return 'Please enter a guardian name.';
    if (!phone.trim()) return 'Please enter a phone number.';
    const cleaned = phone.replace(/[^0-9+]/g, '');
    if (cleaned.length < 7) return 'Phone number is too short.';
    if (!cleaned.startsWith('+') && cleaned.length < 10) {
      return 'Use international format (+91...) or a complete local number.';
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Check guardian details', error);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        relationship: relation.trim() || 'Guardian',
        tier,
      };
      if (editing) await updateContact(editing.id, payload);
      else await addContact(payload);
      setModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('Could not save guardian', err?.message || 'Try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (contact) => {
    Alert.alert(
      'Remove guardian',
      `Remove ${contact.name} from your SOS guardian list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeContact(contact.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ],
    );
  };

  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => Alert.alert('Call unavailable', 'Cannot place a call from this device.'));
  };

  const renderGuardian = (contact) => (
    <Card key={contact.id} padded={false}>
      <TouchableOpacity
        style={styles.guardianRow}
        onPress={() => openEdit(contact)}
        activeOpacity={0.78}
        accessibilityLabel={`Edit guardian ${contact.name}`}
      >
        <View style={[styles.avatar, { backgroundColor: contact.tier === 2 ? `${T.info}22` : T.primaryGlow }]}>
          <Text style={styles.avatarText}>{(contact.name || '?').trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.guardianInfo}>
          <View style={styles.guardianNameRow}>
            <Text style={styles.guardianName} numberOfLines={1}>{contact.name}</Text>
            {contact.tier === 1 && <Pill icon="star" label="Primary" color={T.primary} active />}
          </View>
          <Text style={styles.guardianPhone}>{contact.phone}</Text>
          <Text style={styles.guardianRelation}>{contact.relationship || 'Guardian'}</Text>
        </View>
        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={() => handleCall(contact.phone)}
          accessibilityLabel={`Call ${contact.name}`}
          hitSlop={8}
        >
          <Ionicons name="call" size={18} color={T.success} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionIconBtn, { marginLeft: 6 }]}
          onPress={() => handleDelete(contact)}
          accessibilityLabel={`Remove ${contact.name}`}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={18} color={T.danger} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Card>
  );

  return (
    <Screen>
      <Header
        title="Guardians"
        subtitle="Trusted people SafeHer alerts first"
        right={
          <TouchableOpacity style={styles.addIcon} onPress={openAdd} accessibilityLabel="Add guardian">
            <Ionicons name="add" size={22} color={T.white} />
          </TouchableOpacity>
        }
      />

      <View style={styles.statsRow}>
        <Stat icon="people" label="Total" value={emergencyContacts.length} color={T.primary} />
        <Stat icon="star" label="Primary" value={primaryGuardians.length} color={T.warning} />
        <Stat icon="shield" label="Backup" value={backupGuardians.length} color={T.info} />
      </View>

      <Card>
        <View style={styles.promiseRow}>
          <View style={styles.promiseIcon}>
            <Ionicons name="shield-checkmark" size={20} color={T.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.promiseTitle}>Guardian promise</Text>
            <Text style={styles.promiseText}>
              SOS should never ask who to notify. SafeHer alerts this trusted circle automatically.
            </Text>
          </View>
        </View>
      </Card>

      {emergencyContacts.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No guardians yet"
          subtitle="Add one trusted person before relying on SOS. In an emergency, SafeHer should not ask who to contact."
          action={<PrimaryBtn icon="add" onPress={openAdd}>Add First Guardian</PrimaryBtn>}
        />
      ) : (
        <>
          {primaryGuardians.length > 0 && (
            <>
              <SectionTitle>Primary guardians</SectionTitle>
              {primaryGuardians.map(renderGuardian)}
            </>
          )}
          {backupGuardians.length > 0 && (
            <>
              <SectionTitle>Backup guardians</SectionTitle>
              {backupGuardians.map(renderGuardian)}
            </>
          )}
          <PrimaryBtn icon="person-add" onPress={openAdd} style={{ marginTop: 8 }}>
            Add Another Guardian
          </PrimaryBtn>
        </>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editing ? 'Edit Guardian' : 'Add Guardian'}</Text>

            <Label>Full Name</Label>
            <Input value={name} onChangeText={setName} placeholder="Priya Sharma" autoCapitalize="words" />

            <Label>Phone Number (with country code)</Label>
            <Input value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />

            <Label>Relationship</Label>
            <Input value={relation} onChangeText={setRelation} placeholder="Mother, friend, partner" />

            <Label>Alert Priority</Label>
            <View style={styles.tierRow}>
              <TouchableOpacity
                style={[styles.tierBtn, tier === 1 && { backgroundColor: T.primaryGlow, borderColor: T.primary }]}
                onPress={() => setTier(1)}
              >
                <Ionicons name="star" size={14} color={tier === 1 ? T.primary : T.textSub} />
                <Text style={[styles.tierBtnText, tier === 1 && { color: T.white }]}>Primary</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tierBtn, tier === 2 && { backgroundColor: `${T.info}22`, borderColor: T.info }]}
                onPress={() => setTier(2)}
              >
                <Ionicons name="shield" size={14} color={tier === 2 ? T.info : T.textSub} />
                <Text style={[styles.tierBtnText, tier === 2 && { color: T.white }]}>Backup</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <GhostBtn onPress={() => setModalVisible(false)} color={T.textSub}>Cancel</GhostBtn>
              </View>
              <View style={{ flex: 2 }}>
                <PrimaryBtn icon="checkmark" loading={saving} onPress={handleSave}>
                  {editing ? 'Save Changes' : 'Add Guardian'}
                </PrimaryBtn>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: T.primary,
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  promiseRow: { flexDirection: 'row', alignItems: 'center' },
  promiseIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: `${T.success}1F`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  promiseTitle: { color: T.text, fontSize: 15, fontWeight: '900' },
  promiseText: { color: T.textSub, fontSize: 12, lineHeight: 18, marginTop: 3 },
  guardianRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: T.white, fontSize: 20, fontWeight: '900' },
  guardianInfo: { flex: 1, marginLeft: 12, minWidth: 0 },
  guardianNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guardianName: { color: T.white, fontSize: 15, fontWeight: '900', flexShrink: 1 },
  guardianPhone: { color: T.textSub, fontSize: 12, marginTop: 3 },
  guardianRelation: { color: T.textHint, fontSize: 11, marginTop: 2 },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: T.bgElevated,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalTitle: { color: T.white, fontSize: 22, fontWeight: '900', marginBottom: 14 },
  tierRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tierBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
  },
  tierBtnText: { color: T.textSub, fontWeight: '800', fontSize: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
});
