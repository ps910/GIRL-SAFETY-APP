'use client';

/**
 * Admin — Journey Monitoring
 * Track all active, overdue, and completed journeys
 */

const MOCK_JOURNEYS = [
  { id: 'J-1201', user: 'Priya S.', destination: 'Home', startTime: '8:30 PM', eta: '9:15 PM', status: 'overdue', overdueBy: '15 min', guardians: 3 },
  { id: 'J-1200', user: 'Ananya K.', destination: 'Office', startTime: '9:15 PM', eta: '9:45 PM', status: 'overdue', overdueBy: '7 min', guardians: 2 },
  { id: 'J-1199', user: 'Meera R.', destination: 'College', startTime: '9:45 PM', eta: '10:05 PM', status: 'active', overdueBy: null, guardians: 4 },
  { id: 'J-1198', user: 'Divya P.', destination: 'Friend\'s house', startTime: '7:00 PM', eta: '7:30 PM', status: 'completed', overdueBy: null, guardians: 1 },
  { id: 'J-1197', user: 'Sneha M.', destination: 'Mall', startTime: '6:00 PM', eta: '6:45 PM', status: 'completed', overdueBy: null, guardians: 2 },
];

export default function JourneysPage() {
  const overdue = MOCK_JOURNEYS.filter(j => j.status === 'overdue');
  const active = MOCK_JOURNEYS.filter(j => j.status === 'active');
  const completed = MOCK_JOURNEYS.filter(j => j.status === 'completed');

  return (
    <div>
      {/* Summary */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>⚠️</div>
          <div className="stat-value">{overdue.length}</div>
          <div className="stat-label">Overdue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(20,184,166,0.15)', color: 'var(--teal)' }}>🗺️</div>
          <div className="stat-value">{active.length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>✅</div>
          <div className="stat-value">{completed.length}</div>
          <div className="stat-label">Completed Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>📊</div>
          <div className="stat-value">47</div>
          <div className="stat-label">Total Today</div>
        </div>
      </div>

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 16, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚠️ Overdue Journeys
            <span className="badge badge-danger">{overdue.length}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {overdue.map(j => (
              <JourneyCard key={j.id} journey={j} />
            ))}
          </div>
        </div>
      )}

      {/* Active */}
      <h3 style={{ marginBottom: 16 }}>Active Journeys</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {active.map(j => <JourneyCard key={j.id} journey={j} />)}
      </div>

      {/* Completed */}
      <h3 style={{ marginBottom: 16, color: 'var(--text-sub)' }}>Completed Today</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>ID</th><th>User</th><th>Destination</th><th>Duration</th><th>Guardians</th></tr></thead>
          <tbody>
            {completed.map(j => (
              <tr key={j.id}>
                <td style={{ fontWeight: 600, color: 'var(--text)' }}>{j.id}</td>
                <td>{j.user}</td>
                <td>{j.destination}</td>
                <td>{j.startTime} → {j.eta}</td>
                <td>{j.guardians}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JourneyCard({ journey }: { journey: any }) {
  const isOverdue = journey.status === 'overdue';
  return (
    <div className="card" style={{
      borderLeft: `4px solid ${isOverdue ? 'var(--danger)' : 'var(--teal)'}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{journey.user}</span>
          <span>→</span>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{journey.destination}</span>
          <span className={`badge ${isOverdue ? 'badge-danger' : 'badge-info'}`}>
            {isOverdue ? `${journey.overdueBy} overdue` : 'Active'}
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>
          Started {journey.startTime} · ETA {journey.eta} · {journey.guardians} guardians
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {isOverdue && <button className="btn btn-danger btn-sm">Contact User</button>}
        <button className="btn btn-ghost btn-sm">View</button>
      </div>
    </div>
  );
}
