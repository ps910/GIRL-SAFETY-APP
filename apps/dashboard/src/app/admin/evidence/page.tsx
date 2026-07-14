'use client';

/**
 * Admin — Evidence Vault Viewer
 */

export default function EvidencePage() {
  return (
    <div>
      <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3>Evidence Vault</h3>
          <p style={{ fontSize: 13, marginTop: 4 }}>Encrypted evidence files uploaded during SOS events</p>
        </div>
        <span className="badge badge-primary">🔒 End-to-end encrypted</span>
      </div>

      <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input type="text" placeholder="Search by case ID or user..." style={{ flex: 2 }} />
        <select style={{ flex: 1 }}><option>All Types</option><option>Audio</option><option>Video</option><option>Photo</option></select>
        <button className="btn btn-primary btn-sm">Search</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {[
          { id: 'EV-001', type: 'Audio', case: 'SOS-481', size: '2.4 MB', duration: '3:24', date: 'Today, 9:12 PM', icon: '🎙️' },
          { id: 'EV-002', type: 'Photo', case: 'SOS-480', size: '1.8 MB', duration: null, date: 'Today, 8:57 PM', icon: '📷' },
          { id: 'EV-003', type: 'Audio', case: 'SOS-480', size: '5.1 MB', duration: '7:12', date: 'Today, 8:55 PM', icon: '🎙️' },
          { id: 'EV-004', type: 'Video', case: 'SOS-480', size: '12.3 MB', duration: '0:45', date: 'Today, 8:54 PM', icon: '🎬' },
          { id: 'EV-005', type: 'Photo', case: 'SOS-478', size: '3.2 MB', duration: null, date: 'Today, 7:30 PM', icon: '📷' },
          { id: 'EV-006', type: 'Audio', case: 'SOS-475', size: '1.1 MB', duration: '1:38', date: 'Yesterday', icon: '🎙️' },
        ].map(ev => (
          <div key={ev.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{ev.icon}</div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{ev.id}</div>
                <div style={{ fontSize: 12, color: 'var(--text-hint)' }}>{ev.type} · {ev.size}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 4 }}>Case: {ev.case}</div>
            {ev.duration && <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 4 }}>Duration: {ev.duration}</div>}
            <div style={{ fontSize: 12, color: 'var(--text-hint)', marginBottom: 12 }}>{ev.date}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>🔒 Decrypt & View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
