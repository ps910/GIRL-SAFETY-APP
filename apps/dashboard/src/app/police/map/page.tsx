'use client';

import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';

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

interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'sos' | 'police' | 'hospital' | 'danger_report';
  details?: string;
}

export default function PoliceMapPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([
    { id: 'SOS-482', name: 'Priya Sharma (SOS)', lat: 12.9716, lng: 77.5946, type: 'sos', details: 'Critical alert: Shake trigger active' },
    { id: 'SOS-481', name: 'Ananya Rao (Responding)', lat: 12.9352, lng: 77.6245, type: 'sos', details: 'Assigned Officer: Sharma' },
  ]);

  const [loadingOSM, setLoadingOSM] = useState(false);
  const [showPolice, setShowPolice] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showDangerReports, setShowDangerReports] = useState(true);

  // 1. Fetch real-time active cases and danger reports from Firebase
  useEffect(() => {
    // Listen to incident reports for danger overlay
    const incidentsRef = ref(db, 'incident_reports');
    const unsubscribeIncidents = onValue(incidentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const dangerMarkers: MapMarker[] = Object.keys(data).map((key) => {
          const report = data[key];
          return {
            id: key,
            name: report.title || 'Community Danger Alert',
            lat: report.latitude || 12.96 + Math.random() * 0.04,
            lng: report.longitude || 77.58 + Math.random() * 0.04,
            type: 'danger_report',
            details: report.description || 'Public caution report.',
          };
        });
        setMarkers((prev) => [
          ...prev.filter((m) => m.type !== 'danger_report'),
          ...dangerMarkers,
        ]);
      }
    });

    return () => {
      unsubscribeIncidents();
    };
  }, []);

  // 2. Fetch Police and Hospitals from Overpass OpenStreetMap API
  const fetchNearbyAmenities = async () => {
    setLoadingOSM(true);
    try {
      // Overpass query for police stations and hospitals within 10km of central Bangalore (12.9716, 77.5946)
      const query = `[out:json];(node(around:10000,12.9716,77.5946)[amenity=police];node(around:10000,12.9716,77.5946)[amenity=hospital];);out;`;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data?.elements) {
        const osmMarkers: MapMarker[] = data.elements.map((el: any) => {
          const isHospital = el.tags?.amenity === 'hospital';
          return {
            id: `OSM-${el.id}`,
            name: el.tags?.name || (isHospital ? 'Hospital Station' : 'Police Station'),
            lat: el.lat,
            lng: el.lon,
            type: isHospital ? 'hospital' : 'police',
            details: el.tags?.['addr:street'] || 'OSM Verified Coordinate',
          };
        });

        setMarkers((prev) => [
          ...prev.filter((m) => m.type !== 'police' && m.type !== 'hospital'),
          ...osmMarkers,
        ]);
      }
    } catch (e) {
      console.error('Error fetching OpenStreetMap data:', e);
    } finally {
      setLoadingOSM(false);
    }
  };

  useEffect(() => {
    fetchNearbyAmenities();
  }, []);

  const filteredMarkers = markers.filter((m) => {
    if (m.type === 'sos') return true;
    if (m.type === 'police' && !showPolice) return false;
    if (m.type === 'hospital' && !showHospitals) return false;
    if (m.type === 'danger_report' && !showDangerReports) return false;
    return true;
  });

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Suraksha Control Map</h1>
          <p style={styles.subtitle}>Unified Incident Map with OpenStreetMap Infrastructure & Danger Feeds</p>
        </div>
        <button
          onClick={fetchNearbyAmenities}
          style={styles.refreshBtn}
          disabled={loadingOSM}
        >
          {loadingOSM ? 'Fetching OSM...' : '🔄 Sync OSM Facilities'}
        </button>
      </div>

      {/* Map filters */}
      <div style={styles.filterBar}>
        <span style={styles.filterTitle}>Layer Filters:</span>
        <label style={styles.filterLabel}>
          <input
            type="checkbox"
            checked={showPolice}
            onChange={(e) => setShowPolice(e.target.checked)}
          />
          🚔 Police Stations
        </label>
        <label style={styles.filterLabel}>
          <input
            type="checkbox"
            checked={showHospitals}
            onChange={(e) => setShowHospitals(e.target.checked)}
          />
          🏥 Hospitals
        </label>
        <label style={styles.filterLabel}>
          <input
            type="checkbox"
            checked={showDangerReports}
            onChange={(e) => setShowDangerReports(e.target.checked)}
          />
          ⚠️ Danger Overlay
        </label>
      </div>

      <div style={styles.mapContainer}>
        {/* Mock Map Canvas */}
        <div style={styles.mapCanvas}>
          <div style={styles.mapGrid} />

          {filteredMarkers.map((m) => {
            // Map coordinates relative projection matching Bangalore Central
            const leftOffset = 50 + (m.lng - 77.5946) * 1500;
            const topOffset = 50 - (m.lat - 12.9716) * 1500;

            const iconMap = {
              sos: '🚨',
              police: '🚔',
              hospital: '🏥',
              danger_report: '⚠️',
            };

            const colors = {
              sos: '#EF4444',
              police: '#3B82F6',
              hospital: '#10B981',
              danger_report: '#F59E0B',
            };

            return (
              <div
                key={m.id}
                style={{
                  ...styles.pinWrapper,
                  left: `${leftOffset}%`,
                  top: `${topOffset}%`,
                }}
              >
                {/* Ping glow ring for active SOS */}
                {m.type === 'sos' && (
                  <div style={styles.glowRing} />
                )}

                {/* Marker Center */}
                <div style={{
                  ...styles.pinDot,
                  backgroundColor: colors[m.type],
                  boxShadow: `0 0 12px ${colors[m.type]}`,
                }}>
                  {iconMap[m.type]}
                </div>

                {/* Info Card */}
                <div style={styles.pinTooltip}>
                  <div style={styles.tooltipName}>{m.name}</div>
                  <div style={styles.tooltipMeta}>{m.details || m.id}</div>
                </div>
              </div>
            );
          })}

          <div style={styles.jurisdictionBox}>
            <div style={styles.jurisdictionTitle}>OSM Integration Active</div>
            <div style={styles.jurisdictionDetail}>Bangalore Central District</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    background: '#0D1321',
    minHeight: '100vh',
    color: '#F1F5F9',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    margin: 0,
    marginTop: 4,
  },
  refreshBtn: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid rgba(99, 102, 241, 0.25)',
    background: 'rgba(99, 102, 241, 0.08)',
    color: '#818CF8',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    background: '#131A2E',
    border: '1px solid rgba(255,255,255,0.05)',
    padding: '12px 20px',
    borderRadius: 12,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#94A3B8',
  },
  filterLabel: {
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
  },
  mapContainer: {
    flex: 1,
    height: '65vh',
    borderRadius: 18,
    border: '1px solid rgba(99, 102, 241, 0.15)',
    overflow: 'hidden',
    position: 'relative',
  },
  mapCanvas: {
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle, #161D33 0%, #0A0E1A 100%)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGrid: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.05,
    backgroundImage: 'linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)',
    backgroundSize: '30px 30px',
  },
  pinWrapper: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    cursor: 'pointer',
    zIndex: 10,
  },
  glowRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    transform: 'translate(-30%, -30%)',
    animation: 'pulse 1.8s infinite',
  },
  pinDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    color: '#FFFFFF',
    border: '2px solid #FFFFFF',
  },
  pinTooltip: {
    position: 'absolute',
    top: 28,
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#131A2E',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: '6px 10px',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
  },
  tooltipName: {
    fontSize: 11,
    fontWeight: 700,
    color: '#F1F5F9',
  },
  tooltipMeta: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  jurisdictionBox: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#131A2E',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: '10px 14px',
  },
  jurisdictionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  jurisdictionDetail: {
    fontSize: 13,
    fontWeight: 600,
    color: '#818CF8',
    marginTop: 2,
  },
};
