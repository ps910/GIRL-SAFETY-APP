'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';

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

// Initialize Firebase once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

export default function PublicAlertPage() {
  const { token } = useParams() as { token: string };
  const [alert, setAlert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!token) return;

    const alertRef = ref(db, `public_alerts/${token}`);
    
    onValue(alertRef, (snapshot) => {
      setLoading(false);
      if (snapshot.exists()) {
        const val = snapshot.val();
        setAlert(val);
        
        // Expiration check
        const expiry = new Date(val.expiresAt).getTime();
        if (Date.now() > expiry) {
          setExpired(true);
        } else {
          setExpired(false);
        }
      } else {
        setAlert(null);
      }
    }, (err) => {
      setLoading(false);
      setAlert(null);
    });

    return () => {
      off(alertRef);
    };
  }, [token]);

  return (
    <div style={styles.page}>
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>🛡️</div>
          <div>
            <h1 style={styles.title}>Suraksha / SafeHer Alert</h1>
            <p style={styles.subtitle}>Emergency Public Tracking Link</p>
          </div>
        </div>

        {loading ? (
          <div style={styles.card}>
            <div style={styles.spinner}>Loading tracking status...</div>
          </div>
        ) : expired ? (
          <div style={styles.card}>
            <div style={{ ...styles.badge, backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }}>
              ⚠️ Session Expired
            </div>
            <p style={styles.desc}>
              This safety tracking session has expired automatically to protect the user's location privacy (max 2h active alert window exceeded).
            </p>
          </div>
        ) : alert ? (
          <div style={styles.card}>
            <div style={styles.alertHeader}>
              <span style={{
                ...styles.badge,
                backgroundColor: alert.status === 'ACTIVE' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: alert.status === 'ACTIVE' ? '#EF4444' : '#10B981',
              }}>
                🚨 {alert.status || 'ACTIVE'}
              </span>
              <span style={styles.time}>Last ping: {new Date(alert.timestamp).toLocaleTimeString()}</span>
            </div>

            <h2 style={styles.cardTitle}>Live Location Feed</h2>

            <div style={styles.mapMock}>
              {/* Custom SVG Compass Tracker Representation */}
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="4 4" />
                <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill="rgba(99, 102, 241, 0.2)" />
              </svg>
              <div style={styles.coordBox}>
                <span style={styles.coordLabel}>Latitude:</span> {alert.latitude?.toFixed(6) || 'Updating...'}
                <br />
                <span style={styles.coordLabel}>Longitude:</span> {alert.longitude?.toFixed(6) || 'Updating...'}
                <br />
                <span style={styles.coordLabel}>GPS Accuracy:</span> ±{alert.accuracy?.toFixed(1) || '0'}m
              </div>
            </div>

            <p style={styles.safetyInfo}>
              🔒 Active tracking is shared securely with verified emergency contacts and emergency responders.
            </p>
          </div>
        ) : (
          <div style={styles.card}>
            <div style={{ ...styles.badge, backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }}>
              ❌ Alert Not Found
            </div>
            <p style={styles.desc}>
              The alert link is either invalid, has been manually resolved by the user, or expired.
            </p>
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
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(145deg, #0D1321 0%, #0A0E1A 50%, #1A2342 100%)',
    position: 'relative',
    overflow: 'hidden',
    color: '#F1F5F9',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  bgOrb1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'rgba(99, 102, 241, 0.06)',
    top: -100,
    left: -100,
    filter: 'blur(80px)',
  },
  bgOrb2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.05)',
    bottom: -80,
    right: -80,
    filter: 'blur(80px)',
  },
  container: {
    width: '100%',
    maxWidth: 480,
    padding: 24,
    position: 'relative',
    zIndex: 1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: '#6366F1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    margin: 0,
    marginTop: 2,
  },
  card: {
    background: '#131A2E',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: 22,
    padding: 24,
    gap: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  spinner: {
    color: '#94A3B8',
    textAlign: 'center',
    padding: 20,
  },
  badge: {
    padding: '6px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    width: 'fit-content',
    textTransform: 'uppercase',
  },
  desc: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 1.6,
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
    color: '#64748B',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    margin: 0,
  },
  mapMock: {
    height: 180,
    borderRadius: 16,
    background: 'rgba(99, 102, 241, 0.04)',
    border: '1px dashed rgba(99, 102, 241, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 16,
  },
  coordBox: {
    fontSize: 13,
    lineHeight: 1.8,
    color: '#F1F5F9',
  },
  coordLabel: {
    color: '#64748B',
    fontWeight: 600,
  },
  safetyInfo: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    margin: 0,
  },
};
