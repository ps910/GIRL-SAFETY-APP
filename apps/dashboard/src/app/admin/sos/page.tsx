'use client';

/**
 * Admin — Live SOS Cases Feed
 * Real-time view of all SOS events with filtering and case management
 */

const MOCK_SOS_CASES = [
  { id: 'SOS-482', time: '2024-07-14T21:18:00Z', user: 'Priya S.', phone: '****3821', location: 'MG Road, Bangalore', lat: 12.9716, lng: 77.5946, status: 'ACTIVE', guardians: 3, evidenceCount: 2 },
  { id: 'SOS-481', time: '2024-07-14T21:12:00Z', user: 'Ananya K.', phone: '****7654', location: 'Koramangala, Bangalore', lat: 12.9352, lng: 77.6245, status: 'RESPONDING', guardians: 2, evidenceCount: 1, officer: 'Officer Sharma' },
  { id: 'SOS-480', time: '2024-07-14T20:57:00Z', user: 'Meera R.', phone: '****1209', location: 'Indiranagar, Bangalore', lat: 12.9784, lng: 77.6408, status: 'RESPONDING', guardians: 4, evidenceCount: 3, officer: 'Officer Reddy' },
  { id: 'SOS-479', time: '2024-07-14T20:20:00Z', user: 'Divya P.', phone: '****8901', location: 'HSR Layout, Bangalore', lat: 12.9116, lng: 77.6389, status: 'RESOLVED', guardians: 1, evidenceCount: 0, officer: 'Officer Patel' },
  { id: 'SOS-478', time: '2024-07-14T19:30:00Z', user: 'Sneha M.', phone: '****4567', location: 'Whitefield, Bangalore', lat: 12.9698, lng: 77.7500, status: 'RESOLVED', guardians: 2, evidenceCount: 1, officer: 'Officer Joshi' },
];

export default function SOSPage() {
  return (
    <div>
      {/* Summary Bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <SummaryPill label="Active" count={1} color="var(--danger)" />
        <SummaryPill label="Responding" count={2} color="var(--warning)" />
        <SummaryPill label="Resolved Today" count={2} color="var(--success)" />
        <SummaryPill label="Total (24h)" count={5} color="var(--primary)" />
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <select style={{ flex: 1 }}>
          <option value="all">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="RESPONDING">Responding</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <input type="text" placeholder="Search user, location, or case ID..." style={{ flex: 2 }} />
        <button className="btn btn-primary btn-sm">Search</button>
      </div>

      {/* Case Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {MOCK_SOS_CASES.map((sos) => (
          <div key={sos.id} className="card" style={{ padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              {/* Status Indicator */}
              <div style={{
                width: 4,
                borderRadius: '18px 0 0 18px',
                background: sos.status === 'ACTIVE' ? 'var(--danger)' : sos.status === 'RESPONDING' ? 'var(--warning)' : 'var(--success)',
              }} />

              <div style={{ flex: 1, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{sos.id}</span>
                      <StatusBadge status={sos.status} />
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-hint)' }}>
                      {new Date(sos.time).toLocaleTimeString()} · {timeSince(sos.time)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {sos.status === 'ACTIVE' && <button className="btn btn-danger btn-sm">🚔 Assign Officer</button>}
                    <button className="btn btn-ghost btn-sm">View Details</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                  <InfoBlock label="User" value={sos.user} sub={sos.phone} />
                  <InfoBlock label="Location" value={sos.location} sub={`${sos.lat.toFixed(4)}, ${sos.lng.toFixed(4)}`} />
                  <InfoBlock label="Guardians" value={`${sos.guardians} notified`} sub={`${sos.evidenceCount} evidence files`} />
                  <InfoBlock label="Assigned" value={sos.officer || 'Unassigned'} sub={sos.officer ? 'In progress' : 'Needs dispatch'} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 16px', borderRadius: 10,
      background: `${color}12`, border: `1px solid ${color}30`,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: color, display: 'inline-block' }} />
      <span style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'var(--font-heading)' }}>{count}</span>
      <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{label}</span>
    </div>
  );
}

function InfoBlock({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-hint)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    ACTIVE: { cls: 'badge-danger', label: 'ACTIVE' },
    RESPONDING: { cls: 'badge-warning', label: 'RESPONDING' },
    RESOLVED: { cls: 'badge-success', label: 'RESOLVED' },
  };
  const b = map[status] || { cls: 'badge-info', label: status };
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}
