'use client';

import { useState } from 'react';

/**
 * Police — Crime Zone Heatmap
 * Visualizes Red/Yellow/Green safety zones with area crime statistics.
 * Allows manual zone override and historical crime data import.
 */

interface CrimeZone {
  id: string;
  area: string;
  type: 'red' | 'yellow' | 'green';
  incidentCount: number;
  lastIncident: string;
  lat: number;
  lng: number;
  radius: number;
}

const MOCK_ZONES: CrimeZone[] = [
  { id: 'Z001', area: 'MG Road', type: 'red', incidentCount: 12, lastIncident: '2h ago', lat: 12.9716, lng: 77.5946, radius: 500 },
  { id: 'Z002', area: 'Koramangala 5th Block', type: 'red', incidentCount: 8, lastIncident: '1d ago', lat: 12.9352, lng: 77.6245, radius: 500 },
  { id: 'Z003', area: 'HSR Layout Sector 2', type: 'yellow', incidentCount: 4, lastIncident: '3d ago', lat: 12.9116, lng: 77.6389, radius: 500 },
  { id: 'Z004', area: 'Indiranagar 100ft Road', type: 'yellow', incidentCount: 3, lastIncident: '5d ago', lat: 12.9719, lng: 77.6412, radius: 500 },
  { id: 'Z005', area: 'Whitefield', type: 'green', incidentCount: 1, lastIncident: '30d ago', lat: 12.9698, lng: 77.7500, radius: 500 },
  { id: 'Z006', area: 'Jayanagar 4th Block', type: 'green', incidentCount: 0, lastIncident: 'Never', lat: 12.9250, lng: 77.5838, radius: 500 },
  { id: 'Z007', area: 'Electronic City', type: 'yellow', incidentCount: 2, lastIncident: '7d ago', lat: 12.8440, lng: 77.6765, radius: 500 },
  { id: 'Z008', area: 'Majestic Bus Stand', type: 'red', incidentCount: 15, lastIncident: '6h ago', lat: 12.9767, lng: 77.5713, radius: 500 },
];

const ZONE_COLORS = {
  red: { bg: 'rgba(239,68,68,0.15)', border: '#EF4444', text: '#EF4444', label: 'High Risk' },
  yellow: { bg: 'rgba(245,158,11,0.15)', border: '#F59E0B', text: '#F59E0B', label: 'Moderate' },
  green: { bg: 'rgba(34,197,94,0.15)', border: '#22C55E', text: '#22C55E', label: 'Low/Safe' },
};

export default function PoliceZonesPage() {
  const [zones, setZones] = useState(MOCK_ZONES);
  const [filter, setFilter] = useState<'all' | 'red' | 'yellow' | 'green'>('all');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const filtered = filter === 'all' ? zones : zones.filter(z => z.type === filter);
  const counts = {
    red: zones.filter(z => z.type === 'red').length,
    yellow: zones.filter(z => z.type === 'yellow').length,
    green: zones.filter(z => z.type === 'green').length,
  };

  const handleOverride = (zoneId: string, newType: 'red' | 'yellow' | 'green') => {
    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, type: newType } : z));
  };

  return (
    <div>
      {/* Zone Summary Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" onClick={() => setFilter('red')} style={{ cursor: 'pointer', border: filter === 'red' ? '2px solid #EF4444' : undefined }}>
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: 18 }}>🔴</div>
          <div className="stat-value">{counts.red}</div>
          <div className="stat-label">Red Zones</div>
        </div>
        <div className="stat-card" onClick={() => setFilter('yellow')} style={{ cursor: 'pointer', border: filter === 'yellow' ? '2px solid #F59E0B' : undefined }}>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontSize: 18 }}>🟡</div>
          <div className="stat-value">{counts.yellow}</div>
          <div className="stat-label">Yellow Zones</div>
        </div>
        <div className="stat-card" onClick={() => setFilter('green')} style={{ cursor: 'pointer', border: filter === 'green' ? '2px solid #22C55E' : undefined }}>
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', fontSize: 18 }}>🟢</div>
          <div className="stat-value">{counts.green}</div>
          <div className="stat-label">Green Zones</div>
        </div>
        <div className="stat-card" onClick={() => setFilter('all')} style={{ cursor: 'pointer', border: filter === 'all' ? '2px solid var(--teal)' : undefined }}>
          <div className="stat-icon" style={{ background: 'rgba(20,184,166,0.15)', color: 'var(--teal)', fontSize: 18 }}>📊</div>
          <div className="stat-value">{zones.length}</div>
          <div className="stat-label">Total Zones</div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="card" style={{ padding: 0, height: '50vh', position: 'relative', overflow: 'hidden', border: '1px solid rgba(20,184,166,0.25)', marginBottom: 24 }}>
        <div style={{
          width: '100%', height: '100%',
          background: 'radial-gradient(circle, #1a2342 0%, #0d1321 100%)',
          position: 'relative',
        }}>
          {/* Grid overlay */}
          <div style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.08, backgroundImage: 'linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          {/* Zone circles */}
          {filtered.map(zone => {
            const colors = ZONE_COLORS[zone.type];
            const x = ((zone.lng - 77.55) / 0.25) * 100;
            const y = ((13.00 - zone.lat) / 0.20) * 100;
            return (
              <div
                key={zone.id}
                onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
                style={{
                  position: 'absolute',
                  left: `${Math.max(5, Math.min(90, x))}%`,
                  top: `${Math.max(5, Math.min(90, y))}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  zIndex: zone.id === selectedZone ? 20 : 10,
                }}
              >
                {/* Zone pulse */}
                <div style={{
                  width: 60, height: 60, borderRadius: 30,
                  backgroundColor: colors.bg,
                  border: `2px solid ${colors.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: zone.type === 'red' ? 'pulse 2s infinite' : undefined,
                  boxShadow: `0 0 20px ${colors.bg}`,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: colors.text }}>
                    {zone.incidentCount}
                  </span>
                </div>

                {/* Tooltip */}
                {selectedZone === zone.id && (
                  <div style={{
                    position: 'absolute', top: 65, left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: 'var(--card-elevated)', border: `1px solid ${colors.border}`,
                    borderRadius: 10, padding: '10px 16px', whiteSpace: 'nowrap',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 30,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{zone.area}</div>
                    <div style={{ fontSize: 11, color: colors.text, marginTop: 4, fontWeight: 600 }}>
                      {colors.label} • {zone.incidentCount} incidents
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-hint)', marginTop: 2 }}>
                      Last incident: {zone.lastIncident}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                      {(['red', 'yellow', 'green'] as const).map(t => (
                        <button
                          key={t}
                          onClick={(e) => { e.stopPropagation(); handleOverride(zone.id, t); }}
                          className="btn btn-sm"
                          style={{
                            fontSize: 10, padding: '3px 8px',
                            backgroundColor: zone.type === t ? ZONE_COLORS[t].border : 'transparent',
                            color: zone.type === t ? '#fff' : ZONE_COLORS[t].text,
                            border: `1px solid ${ZONE_COLORS[t].border}`,
                            borderRadius: 6,
                          }}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Legend */}
          <div style={{ position: 'absolute', bottom: 16, left: 16, backgroundColor: 'var(--card-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-hint)', marginBottom: 6, letterSpacing: 1 }}>LEGEND</div>
            {(['red', 'yellow', 'green'] as const).map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ZONE_COLORS[t].border }} />
                <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>{ZONE_COLORS[t].label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone List */}
      <h3 style={{ marginBottom: 16 }}>
        📍 Zone Details
        <span className="badge badge-info" style={{ marginLeft: 8 }}>{filtered.length}</span>
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {filtered.map(zone => {
          const colors = ZONE_COLORS[zone.type];
          return (
            <div key={zone.id} className="card" style={{ borderLeft: `4px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{zone.area}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 2 }}>Zone {zone.id}</div>
                </div>
                <span className={`badge ${zone.type === 'red' ? 'badge-danger' : zone.type === 'yellow' ? 'badge-warning' : 'badge-success'}`}>
                  {colors.label}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: colors.text }}>{zone.incidentCount}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-hint)' }}>Incidents (90d)</div>
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)' }}>{zone.lastIncident}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-hint)' }}>Last Incident</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-hint)', marginTop: 8, fontFamily: 'monospace' }}>
                📍 {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)} • {zone.radius}m radius
              </div>
            </div>
          );
        })}
      </div>

      {/* Import Section */}
      <div className="card" style={{ marginTop: 24, borderStyle: 'dashed', borderColor: 'var(--border)', textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📥</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Import Historical Crime Data</div>
        <div style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 6 }}>
          Upload CSV with columns: area, latitude, longitude, incident_type, date, severity
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
          Upload CSV
        </button>
      </div>
    </div>
  );
}
