'use client';

/**
 * Police — My Cases
 * Cases assigned to the current officer with status tracking
 */

const MOCK_CASES = [
  {
    id: 'SOS-481',
    priority: 'HIGH',
    user: 'User ****7654',
    location: 'Koramangala 5th Block, Bangalore',
    assignedAt: '9:12 PM',
    status: 'EN_ROUTE',
    guardians: 2,
    evidence: 1,
    lastUpdate: '2 min ago',
    timeline: [
      { time: '9:12 PM', event: 'Case assigned to you', type: 'assign' },
      { time: '9:13 PM', event: 'Status updated to En Route', type: 'update' },
      { time: '9:15 PM', event: 'User location updated', type: 'location' },
    ],
  },
  {
    id: 'SOS-479',
    priority: 'MEDIUM',
    user: 'User ****8901',
    location: 'HSR Layout Sector 2, Bangalore',
    assignedAt: '8:20 PM',
    status: 'RESOLVED',
    guardians: 1,
    evidence: 0,
    lastUpdate: '45 min ago',
    timeline: [
      { time: '8:20 PM', event: 'Case assigned to you', type: 'assign' },
      { time: '8:28 PM', event: 'Arrived at location', type: 'arrive' },
      { time: '8:45 PM', event: 'Case resolved — user confirmed safe', type: 'resolve' },
    ],
  },
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pending', cls: 'badge-info' },
  ASSIGNED: { label: 'Assigned', cls: 'badge-primary' },
  EN_ROUTE: { label: 'En Route', cls: 'badge-warning' },
  ON_SCENE: { label: 'On Scene', cls: 'badge-primary' },
  RESOLVED: { label: 'Resolved', cls: 'badge-success' },
};

export default function PoliceCasesPage() {
  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--teal)', boxShadow: '0 4px 12px rgba(20,184,166,0.25)' }}>All Cases</button>
        <button className="btn btn-ghost btn-sm">Active</button>
        <button className="btn btn-ghost btn-sm">Resolved</button>
      </div>

      {/* Case List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {MOCK_CASES.map((c) => (
          <div key={c.id} className="card" style={{ padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              {/* Left accent bar */}
              <div style={{
                width: 4,
                borderRadius: '18px 0 0 18px',
                background: c.status === 'RESOLVED' ? 'var(--success)' : c.priority === 'HIGH' ? 'var(--danger)' : 'var(--warning)',
              }} />

              <div style={{ flex: 1, padding: 24 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{c.id}</span>
                      <span className={`badge ${STATUS_MAP[c.status]?.cls || 'badge-info'}`}>
                        {STATUS_MAP[c.status]?.label || c.status}
                      </span>
                      <span className={`badge ${c.priority === 'HIGH' ? 'badge-danger' : 'badge-warning'}`}>
                        {c.priority}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-hint)' }}>
                      Assigned at {c.assignedAt} · Updated {c.lastUpdate}
                    </span>
                  </div>
                  {c.status !== 'RESOLVED' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-danger btn-sm">Update Status</button>
                      <button className="btn btn-ghost btn-sm">📍 Navigate</button>
                    </div>
                  )}
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-hint)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 }}>User</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{c.user}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-hint)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 }}>Location</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{c.location}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-hint)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 }}>Details</div>
                    <div style={{ fontSize: 14, color: 'var(--text-sub)' }}>
                      {c.guardians} guardians · {c.evidence} evidence
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-hint)', textTransform: 'uppercase' as const, letterSpacing: 1.2, marginBottom: 12 }}>Timeline</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {c.timeline.map((t, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '8px 12px', borderRadius: 8,
                        background: 'var(--surface)',
                      }}>
                        <span style={{ fontSize: 14 }}>
                          {t.type === 'assign' ? '📋' : t.type === 'update' ? '🔄' : t.type === 'location' ? '📍' : t.type === 'arrive' ? '🏁' : '✅'}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{t.event}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>{t.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
