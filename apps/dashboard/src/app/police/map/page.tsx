'use client';

import { useState } from 'react';

/**
 * Police Portal — Live Map of active SOS cases
 */
export default function PoliceMapPage() {
  const [activeCases, setActiveCases] = useState([
    { id: 'SOS-482', user: 'Priya S.', location: 'MG Road, Bangalore', lat: 12.9716, lng: 77.5946, status: 'ACTIVE', time: '2m ago' },
    { id: 'SOS-481', user: 'Ananya K.', location: 'Koramangala, Bangalore', lat: 12.9352, lng: 77.6245, status: 'RESPONDING', time: '8m ago', officer: 'Officer Sharma (You)' },
  ]);

  return (
    <div>
      <div className="card" style={{ padding: 0, height: '70vh', position: 'relative', overflow: 'hidden', border: '1px solid rgba(20, 184, 166, 0.25)' }}>
        {/* Mock Map Canvas */}
        <div style={{
          width: '100%', height: '100%',
          background: 'radial-gradient(circle, #1a2342 0%, #0d1321 100%)',
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Grid background lines to mimic a real map layout */}
          <div style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.1, backgroundImage: 'linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          {/* User/SOS Pins */}
          {activeCases.map(c => (
            <div
              key={c.id}
              style={{
                position: 'absolute',
                left: `${(c.lng - 77.58) * 1000}%`,
                top: `${(13.00 - c.lat) * 1000}%`,
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                zIndex: 10,
              }}
            >
              {/* Pulsing ring */}
              <div style={{
                position: 'absolute', width: 44, height: 44, borderRadius: 22,
                backgroundColor: c.status === 'ACTIVE' ? 'var(--danger-glow)' : 'var(--warning-muted)',
                transform: 'translate(-33%, -33%)',
                animation: 'pulse 1.8s infinite',
              }} />

              {/* Marker pin */}
              <div style={{
                width: 14, height: 14, borderRadius: 7,
                backgroundColor: c.status === 'ACTIVE' ? 'var(--danger)' : 'var(--warning)',
                border: '2px solid white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }} />

              {/* Tooltip Label */}
              <div style={{
                position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                backgroundColor: 'var(--card-elevated)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '6px 12px', whiteSpace: 'nowrap',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{c.id} ({c.user})</div>
                <div style={{ fontSize: 10, color: 'var(--text-hint)', marginTop: 2 }}>{c.location}</div>
              </div>
            </div>
          ))}

          {/* Map Controls */}
          <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'var(--card-elevated)', border: '1px solid var(--border)', fontSize: 18, color: 'var(--text)' }}>+</button>
            <button style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'var(--card-elevated)', border: '1px solid var(--border)', fontSize: 18, color: 'var(--text)' }}>-</button>
          </div>

          <div style={{ position: 'absolute', bottom: 20, left: 20, backgroundColor: 'var(--card-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sub)' }}>Jurisdiction</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#14B8A6', marginTop: 4 }}>Bangalore Central</div>
          </div>
        </div>
      </div>
    </div>
  );
}
