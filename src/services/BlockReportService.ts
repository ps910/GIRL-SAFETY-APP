/**
 * BlockReportService — User blocking & community reporting
 * ═══════════════════════════════════════════════════════════
 *
 * Provides:
 *  1. Block user — prevents blocked users from seeing your shared data
 *  2. Report user — submits report to admin queue with reason & evidence
 *  3. Local block list — cached for fast UI filtering
 *  4. Report categories — harassment, impersonation, suspicious, etc.
 *
 * Data flow:
 *  - Blocks: written to `users/{uid}/blocked/{targetUid}` (RTDB)
 *  - Reports: written to `admin/reports/{reportId}` (RTDB)
 *  - Local cache: AsyncStorage for offline access
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  remove,
  push,
  Database as FirebaseDB,
} from 'firebase/database';
import { getAuth } from 'firebase/auth';
import Logger from '../utils/logger';
import '../config/firebase';

// ── Types ────────────────────────────────────────────────────────
export type ReportReason =
  | 'harassment'
  | 'impersonation'
  | 'suspicious_behavior'
  | 'inappropriate_content'
  | 'spam'
  | 'safety_concern'
  | 'other';

export interface BlockedUser {
  uid: string;
  blockedAt: string;
  reason?: string;
}

export interface UserReport {
  id?: string;
  reporterUid: string;
  targetUid: string;
  reason: ReportReason;
  description: string;
  evidence?: string[]; // URIs or text references
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface BlockReportStats {
  totalBlocked: number;
  totalReportsFiled: number;
  pendingReports: number;
}

// ── Storage Keys ─────────────────────────────────────────────────
const STORAGE_KEYS = {
  BLOCKED_LIST: '@safeher_blocked_users',
  MY_REPORTS: '@safeher_my_reports',
} as const;

// ── Report Reason Labels ─────────────────────────────────────────
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: 'Harassment or bullying',
  impersonation: 'Impersonation or fake profile',
  suspicious_behavior: 'Suspicious behavior',
  inappropriate_content: 'Inappropriate content',
  spam: 'Spam or scam',
  safety_concern: 'Safety concern',
  other: 'Other',
};

// ═══════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════

class BlockReportServiceClass {
  private _blockedList: Map<string, BlockedUser> = new Map();
  private _db: FirebaseDB | null = null;

  // ── Initialize ────────────────────────────────────────────────

  async init(): Promise<void> {
    try {
      // Load local cache
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.BLOCKED_LIST);
      if (raw) {
        const list: BlockedUser[] = JSON.parse(raw);
        this._blockedList.clear();
        list.forEach((b) => this._blockedList.set(b.uid, b));
      }

      // Connect to Firebase RTDB
      const apps = getApps();
      if (apps.length > 0) {
        this._db = getDatabase(apps[0]);
      }
    } catch (e) {
      Logger.error('[BlockReport] Init error:', e);
    }
  }

  // ── Block User ────────────────────────────────────────────────

  async blockUser(targetUid: string, reason?: string): Promise<boolean> {
    const myUid = this._getMyUid();
    if (!myUid) {
      Logger.error('[BlockReport] Cannot block — not authenticated');
      return false;
    }

    if (targetUid === myUid) {
      Logger.warn('[BlockReport] Cannot block yourself');
      return false;
    }

    const blockData: BlockedUser = {
      uid: targetUid,
      blockedAt: new Date().toISOString(),
      reason,
    };

    try {
      // Write to RTDB
      if (this._db) {
        const blockRef = ref(this._db, `users/${myUid}/blocked/${targetUid}`);
        await set(blockRef, blockData);
      }

      // Update local cache
      this._blockedList.set(targetUid, blockData);
      await this._saveBlockedList();

      Logger.log(`[BlockReport] Blocked user: ${targetUid}`);
      return true;
    } catch (e) {
      Logger.error('[BlockReport] Block error:', e);
      return false;
    }
  }

  async unblockUser(targetUid: string): Promise<boolean> {
    const myUid = this._getMyUid();
    if (!myUid) return false;

    try {
      if (this._db) {
        const blockRef = ref(this._db, `users/${myUid}/blocked/${targetUid}`);
        await remove(blockRef);
      }

      this._blockedList.delete(targetUid);
      await this._saveBlockedList();

      Logger.log(`[BlockReport] Unblocked user: ${targetUid}`);
      return true;
    } catch (e) {
      Logger.error('[BlockReport] Unblock error:', e);
      return false;
    }
  }

  isBlocked(targetUid: string): boolean {
    return this._blockedList.has(targetUid);
  }

  getBlockedList(): BlockedUser[] {
    return Array.from(this._blockedList.values());
  }

  // ── Report User ───────────────────────────────────────────────

  async reportUser(
    targetUid: string,
    reason: ReportReason,
    description: string,
    evidence?: string[],
  ): Promise<{ success: boolean; reportId?: string; error?: string }> {
    const myUid = this._getMyUid();
    if (!myUid) {
      return { success: false, error: 'Not authenticated' };
    }

    if (targetUid === myUid) {
      return { success: false, error: 'Cannot report yourself' };
    }

    // Validate description length
    if (!description || description.trim().length < 10) {
      return { success: false, error: 'Please provide a description (at least 10 characters)' };
    }

    if (description.length > 2000) {
      return { success: false, error: 'Description too long (max 2000 characters)' };
    }

    const report: UserReport = {
      reporterUid: myUid,
      targetUid,
      reason,
      description: description.trim(),
      evidence: evidence || [],
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      let reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      if (this._db) {
        const reportsRef = ref(this._db, 'admin/reports');
        const newRef = push(reportsRef);
        reportId = newRef.key || reportId;
        report.id = reportId;
        await set(newRef, report);
      }

      // Cache locally
      await this._cacheMyReport(report);

      Logger.log(`[BlockReport] Report filed: ${reportId} against ${targetUid}`);

      // Auto-block after report
      await this.blockUser(targetUid, `Reported: ${reason}`);

      return { success: true, reportId };
    } catch (e: any) {
      Logger.error('[BlockReport] Report error:', e);
      return { success: false, error: e.message || 'Failed to submit report' };
    }
  }

  async getMyReports(): Promise<UserReport[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.MY_REPORTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // ── Stats ─────────────────────────────────────────────────────

  async getStats(): Promise<BlockReportStats> {
    const reports = await this.getMyReports();
    return {
      totalBlocked: this._blockedList.size,
      totalReportsFiled: reports.length,
      pendingReports: reports.filter((r) => r.status === 'pending').length,
    };
  }

  // ── Utility ───────────────────────────────────────────────────

  /**
   * Filter a list of users, removing any that are blocked.
   * Useful for filtering companion lists, nearby users, etc.
   */
  filterBlocked<T extends { uid?: string; id?: string }>(users: T[]): T[] {
    return users.filter((u) => {
      const uid = u.uid || u.id || '';
      return !this._blockedList.has(uid);
    });
  }

  // ── Private ───────────────────────────────────────────────────

  private _getMyUid(): string | null {
    try {
      const apps = getApps();
      if (apps.length === 0) return null;
      const auth = getAuth(apps[0]);
      return auth.currentUser?.uid || null;
    } catch {
      return null;
    }
  }

  private async _saveBlockedList(): Promise<void> {
    try {
      const list = Array.from(this._blockedList.values());
      await AsyncStorage.setItem(STORAGE_KEYS.BLOCKED_LIST, JSON.stringify(list));
    } catch (e) {
      Logger.error('[BlockReport] Save blocked list error:', e);
    }
  }

  private async _cacheMyReport(report: UserReport): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.MY_REPORTS);
      const reports: UserReport[] = raw ? JSON.parse(raw) : [];
      reports.unshift(report);
      // Keep last 50 reports
      if (reports.length > 50) reports.length = 50;
      await AsyncStorage.setItem(STORAGE_KEYS.MY_REPORTS, JSON.stringify(reports));
    } catch (e) {
      Logger.error('[BlockReport] Cache report error:', e);
    }
  }
}

const BlockReportService = new BlockReportServiceClass();
export default BlockReportService;
