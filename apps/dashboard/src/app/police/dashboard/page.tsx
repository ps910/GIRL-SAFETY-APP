'use client';

/**
 * Police Dashboard — Active cases overview, priority cases, and dispatch
 */

const MOCK_STATS = [
  { label: 'Assigned to Me', value: '2', icon: '📋', color: 'var(--teal)' },
  { label: 'Pending Cases', value: '5', icon: '⏳', color: 'var(--warning)' },
  { label: 'Resolved Today', value: '3', icon: '✅', color: 'var(--success)' },
  { label: 'Avg. Response', value: '4.2m', icon: '⏱️', color: 'var(--primary)' },
];

const PRIORITY_CASES = [
  {
    id: 'SOS-482',
    priority: 'CRITICAL',
    user: 'User ****3821',
    location: 'MG Road, Bangalore',
    time: '2 min ago',
    description: 'SOS triggered. 3 guardians notified. Audio evidence recording.',
    status: 'PENDING',
  },
  {
    id: 'SOS-481',
    priority: 'HIGH',
    user: 'User ****7654',
    location: 'Koramangala, Bangalore',
    time: '8 min ago',
    description: 'SOS active. User sharing live location. 2 guardians notified.',
    status: 'ASSIGNED',
  },
];

const RECENT_ACTIVITY = [
  { time: '21:18', event: 'New SOS case SOS-482 received — MG Road area', type: 'alert' },
  { time: '21:15', event: 'Case SOS-481 assigned to you', type: 'assign' },
  { time: '21:10', event: 'User ****7654 location updated — Koramangala', type: 'update' },
  { time: '20:45', event: 'Case SOS-479 resolved successfully', type: 'resolve' },
  { time: '20:30', event: 'Journey overdue alert for User ****2345', type: 'alert' },
];

export default function PoliceDashboard() {
  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        {MOCK_STATS.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon" style={{ background: `${stat.color}1F`, color: stat.color, fontSize: 18 }}>
              {stat.icon}
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Priority Cases */}
        <div>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            🚨 Priority Cases
            <span className="badge badge-danger">{PRIORITY_CASES.length}</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {PRIORITY_CASES.map((c) => (
              <div key={c.id} className="card" style={{ borderLeft: `4px solid ${c.priority === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>{c.id}</span>
                      <span className={`badge ${c.priority === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                        {c.priority}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>{c.time}</span>
                  </div>
                  <span className={`badge ${c.status === 'PENDING' ? 'badge-info' : 'badge-primary'}`}>
                    {c.status}
                  </span>
                </div>

                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  {c.user} · {c.location}
                </div>
                <p style={{ fontSize: 13, marginBottom: 16 }}>{c.description}</p>

                <div style={{ display: 'flex', gap: 8 }}>
                  {c.status === 'PENDING' ? (
                    <button className="btn btn-danger" style={{ flex: 1 }}>🚔 Respond Now</button>
                  ) : (
                    <button className="btn btn-primary" style={{ flex: 1 }}>📍 Navigate to User</button>
                  )}
                  <button className="btn btn-ghost">View Details</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed + Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Recent Activity</h3>
            <div className="live-feed">
              {RECENT_ACTIVITY.map((a, i) => (
                <div key={i} className="feed-item">
                  <span style={{
                    fontSize: 14,
                    minWidth: 24,
                    textAlign: 'center',
                  }}>
                    {a.type === 'alert' ? '🔴' : a.type === 'assign' ? '📋' : a.type === 'resolve' ? '✅' : '📍'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{a.event}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>{a.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-primary" style={{ width: '100%', background: 'var(--teal)', boxShadow: '0 4px 12px rgba(20,184,166,0.25)' }}>
                📋 View All My Cases
              </button>
              <button className="btn btn-ghost" style={{ width: '100%' }}>
                🗺️ Open Live Map
              </button>
              <button className="btn btn-ghost" style={{ width: '100%' }}>
                📊 Response Time Report
              </button>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="card" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            border: '1px solid rgba(20, 184, 166, 0.25)',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Duty Status</div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>You are currently on duty</div>
            </div>
            <div style={{
              padding: '8px 16px', borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)',
              fontWeight: 600, fontSize: 13,
            }}>
              ● Available
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
