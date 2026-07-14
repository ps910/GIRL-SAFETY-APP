import { useState, useCallback } from 'react';
import EncryptedStorageService from '../../services/EncryptedStorageService';
import Logger from '../../utils/logger';
import type { EmergencyContact } from '../../types';

export const STORAGE_KEYS = {
  CONTACTS: '@girl_safety_contacts',
} as const;

export function useGuardianStore() {
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

  const loadContacts = useCallback(async () => {
    try {
      const contactsData = await EncryptedStorageService.getItem(STORAGE_KEYS.CONTACTS);
      if (contactsData) {
        const parsed = JSON.parse(contactsData);
        setEmergencyContacts(parsed);
        return parsed;
      }
      return [];
    } catch (error) {
      Logger.error('[GuardianStore] Error loading contacts:', error);
      return [];
    }
  }, []);

  const saveContacts = useCallback(async (contacts: EmergencyContact[]) => {
    try {
      await EncryptedStorageService.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
      setEmergencyContacts(contacts);
    } catch (error) {
      Logger.error('[GuardianStore] Error saving contacts:', error);
    }
  }, []);

  const addContact = useCallback(async (contact: Partial<EmergencyContact>): Promise<EmergencyContact> => {
    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: contact.name || '',
      phone: contact.phone || '',
      tier: contact.tier || 1,
      relationship: contact.relationship || 'Guardian',
      status: contact.status || 'added',
      createdAt: new Date().toISOString(),
      ...contact,
    } as EmergencyContact;

    setEmergencyContacts((prev) => {
      const updated = [...prev, newContact];
      saveContacts(updated).catch(() => {});
      return updated;
    });
    return newContact;
  }, [saveContacts]);

  const updateContact = useCallback(async (contactId: string, updates: Partial<EmergencyContact>) => {
    setEmergencyContacts((prev) => {
      const updated = prev.map((c) => (c.id === contactId ? { ...c, ...updates } : c));
      saveContacts(updated).catch(() => {});
      return updated;
    });
  }, [saveContacts]);

  const removeContact = useCallback(async (contactId: string) => {
    setEmergencyContacts((prev) => {
      const updated = prev.filter((c) => c.id !== contactId);
      saveContacts(updated).catch(() => {});
      return updated;
    });
  }, [saveContacts]);

  const getContactsByTier = useCallback((tier: number) => {
    return emergencyContacts.filter((c) => (c.tier || 1) === tier);
  }, [emergencyContacts]);

  return {
    emergencyContacts,
    loadContacts,
    saveContacts,
    addContact,
    updateContact,
    removeContact,
    getContactsByTier,
  };
}
