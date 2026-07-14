'use client';

import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import Link from 'next/link';

const firebaseConfig = {
  apiKey:            "AIzaSyBAVga_tZD7cs2NmB0SKbrAjjdYid_osOU",
  authDomain:        "safeher-app-242a1.firebaseapp.com",
  databaseURL:       "https://safeher-app-242a1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "safeher-app-242a1",
  storageBucket:     "safeher-app-242a1.firebasestorage.app",
  messagingSenderId: "684405408737",
  appId:             "1:684405408737:web:236fc2dadc5151c9cac8a0",
  measurementId:     "G-XVCHZK88WL",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

interface PendingVerification {
  uid: string;
  fullName: string;
  phone: string;
  idType: string;
  idNumber: string;
  selfieUrl?: string;
  idDocumentUrl?: string;
  genderDeclared?: string;
  timestamp: string;
}

export default function VerificationsPage() {
  const [requests, setRequests] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to users who have pending verifications
    const usersRef = ref(db, 'users');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      setLoading(false);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const pendingList: PendingVerification[] = [];
        
        Object.keys(usersData).forEach((uid) => {
          const userObj = usersData[uid];
          const profile = userObj.profile;
          if (profile && profile.verificationStatus === 'pending') {
            pendingList.push({
              uid,
              fullName: profile.fullName || 'Anonymous User',
              phone: profile.phone || 'N/A',
              idType: profile.idType || 'Aadhaar',
              idNumber: profile.idNumber || 'N/A',
              selfieUrl: profile.selfieUrl,
              idDocumentUrl: profile.idDocumentUrl,
              genderDeclared: profile.genderDeclared || 'Female',
              timestamp: profile.updatedAt || new Date().toISOString(),
            });
          }
        });
        
        setRequests(pendingList);
      } else {
        setRequests([]);
      }
    });

    return () => {
      // Unsubscribe is handled by firebase onValue internally if returning off, but in web SDK it returns a clean unsubscribe function!
      unsubscribe();
    };
  }, []);

  const handleAction = async (uid: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      const updates: Record<string, any> = {};
      updates[`users/${uid}/profile/verificationStatus`] = status;
      updates[`users/${uid}/profile/trustLevel`] = status === 'approved' ? 'verified_female' : 'unverified';
      if (notes) {
        updates[`users/${uid}/profile/verificationNotes`] = notes;
      }
      
      await update(ref(db), updates);
      alert(`User profile ${status === 'approved' ? 'approved' : 'rejected'} successfully.`);
    } catch (e) {
      alert('Error updating verification status.');
    }
  };

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>🛡️ SafeHer</div>
        <nav style={styles.nav}>
          <Link href="/admin/dashboard" style={styles.navLink}>📊 General Overview</Link>
          <Link href="/admin/verifications" style={{ ...styles.navLink, ...styles.navLinkActive }}>👤 ID Verifications</Link>
          <Link href="/police/dashboard" style={styles.navLink}>🚔 Police Control</Link>
        </nav>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <h1 style={styles.title}>KYC Verification Reviews</h1>
        <p style={styles.subtitle}>Review ID documents and matching selfies for Verified Female badge tier.</p>

        {loading ? (
          <div style={styles.spinner}>Loading pending verifications...</div>
        ) : requests.length === 0 ? (
          <div style={styles.emptyBox}>
            <p style={{ margin: 0, fontSize: 15, color: '#94A3B8' }}>🎉 All caught up! No pending verifications in the queue.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {requests.map((req) => (
              <div key={req.uid} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.name}>{req.fullName}</h3>
                    <p style={styles.meta}>{req.phone} | Declared: {req.genderDeclared}</p>
                  </div>
                  <span style={styles.time}>{new Date(req.timestamp).toLocaleDateString()}</span>
                </div>

                <div style={styles.docDetails}>
                  <div style={styles.docItem}>
                    <strong>ID Type:</strong> {req.idType.toUpperCase()}
                  </div>
                  <div style={styles.docItem}>
                    <strong>ID Number:</strong> {req.idNumber}
                  </div>
                </div>

                {/* Simulated Side-by-Side Verification Photos */}
                <div style={styles.photoContainer}>
                  <div style={styles.photoBox}>
                    <span style={styles.photoLabel}>ID DOCUMENT PHOTO</span>
                    <div style={styles.photoMock}>
                      📄 Aadhaar Card Scan
                      <br />
                      <span style={{ fontSize: 10, color: '#64748B' }}>{req.idNumber}</span>
                    </div>
                  </div>
                  <div style={styles.photoBox}>
                    <span style={styles.photoLabel}>SELFIE PHOTO</span>
                    <div style={styles.photoMock}>
                      📸 Selfie Capture
                      <br />
                      <span style={{ fontSize: 10, color: '#64748B' }}>Liveness verified</span>
                    </div>
                  </div>
                </div>

                <div style={styles.actionRow}>
                  <button
                    onClick={() => handleAction(req.uid, 'rejected', 'Documents do not match.')}
                    style={styles.rejectBtn}
                  >
                    Reject Verification
                  </button>
                  <button
                    onClick={() => handleAction(req.uid, 'approved')}
                    style={styles.approveBtn}
                  >
                    Approve Badge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    background: '#0D1321',
    color: '#F1F5F9',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  sidebar: {
    width: 260,
    background: '#0A0E1A',
    borderRight: '1px solid rgba(99, 102, 241, 0.12)',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
  },
  logo: {
    fontSize: 22,
    fontWeight: 700,
    color: '#6366F1',
    letterSpacing: -0.5,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  navLink: {
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 14,
    color: '#94A3B8',
    textDecoration: 'none',
    fontWeight: 600,
    transition: 'all 150ms ease',
  },
  navLinkActive: {
    background: 'rgba(99, 102, 241, 0.12)',
    color: '#818CF8',
  },
  main: {
    flex: 1,
    padding: 40,
    overflowY: 'auto' as const,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    margin: 0,
    marginTop: 6,
    marginBottom: 32,
  },
  spinner: {
    color: '#94A3B8',
    padding: 40,
  },
  emptyBox: {
    background: '#131A2E',
    border: '1px solid rgba(99, 102, 241, 0.12)',
    borderRadius: 16,
    padding: 32,
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(460, 1fr))',
    gap: 24,
  },
  card: {
    background: '#131A2E',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: 20,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
  },
  meta: {
    fontSize: 13,
    color: '#94A3B8',
    margin: 0,
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    color: '#64748B',
  },
  docDetails: {
    display: 'flex',
    gap: 16,
    background: 'rgba(255,255,255,0.02)',
    padding: '10px 14px',
    borderRadius: 8,
  },
  docItem: {
    fontSize: 13,
    color: '#94A3B8',
  },
  photoContainer: {
    display: 'flex',
    gap: 12,
  },
  photoBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  photoLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  photoMock: {
    height: 120,
    borderRadius: 10,
    background: 'rgba(99, 102, 241, 0.03)',
    border: '1px dashed rgba(99, 102, 241, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    gap: 4,
  },
  actionRow: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  },
  rejectBtn: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid rgba(239, 68, 68, 0.2)',
    background: 'rgba(239, 68, 68, 0.08)',
    color: '#EF4444',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  approveBtn: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 10,
    border: 'none',
    background: '#10B981',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
    transition: 'all 150ms ease',
  },
};
