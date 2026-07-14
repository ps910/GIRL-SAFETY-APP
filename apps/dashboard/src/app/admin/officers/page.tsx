'use client';

/**
 * Admin — Officer Management
 * Add, manage, and monitor police officers across departments
 */

const MOCK_OFFICERS = [
  { id: 'off-001', name: 'Officer Sharma', badge: 'KA-2847', rank: 'Sub Inspector', dept: 'Koramangala PS', phone: '****5678', status: 'available', activeCases: 1 },
  { id: 'off-002', name: 'Officer Patel', badge: 'KA-3921', rank: 'Inspector', dept: 'MG Road PS', phone: '****9012', status: 'busy', activeCases: 2 },
  { id: 'off-003', name: 'Officer Reddy', badge: 'KA-1456', rank: 'Sub Inspector', dept: 'Indiranagar PS', phone: '****3456', status: 'available', activeCases: 0 },
  { id: 'off-004', name: 'Officer Joshi', badge: 'KA-7834', rank: 'Inspector', dept: 'HSR Layout PS', phone: '****7890', status: 'off_duty', activeCases: 0 },
  { id: 'off-005', name: 'Officer Das', badge: 'KA-5612', rank: 'Sub Inspector', dept: 'Whitefield PS', phone: '****2345', status: 'available', activeCases: 1 },
];

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  available: { label: 'Available', cls: 'badge-success', dot: 'var(--success)' },
  busy: { label: 'Busy', cls: 'badge-warning', dot: 'var(--warning)' },
  off_duty: { label: 'Off Duty', cls: 'badge-info', dot: 'var(--text-hint)' },
};

export default function OfficersPage() {
  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(20,184,166,0.15)', color: 'var(--teal)' }}>🚔</div>
          <div className="stat-value">12</div>
          <div className="stat-label">Total Officers</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>✅</div>
          <div className="stat-value">8</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warning-muted)', color: 'var(--warning)' }}>⏳</div>
          <div className="stat-value">3</div>
          <div className="stat-label">On Active Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--info-muted)', color: 'var(--info)' }}>🏢</div>
          <div className="stat-value">5</div>
          <div className="stat-label">Departments</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" placeholder="Search officers..." style={{ width: 300 }} />
          <select><option value="all">All Status</option><option value="available">Available</option><option value="busy">Busy</option><option value="off_duty">Off Duty</option></select>
        </div>
        <button className="btn btn-primary">+ Add Officer</button>
      </div>

      {/* Officer Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Officer</th>
              <th>Badge</th>
              <th>Department</th>
              <th>Rank</th>
              <th>Status</th>
              <th>Active Cases</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_OFFICERS.map((officer) => {
              const status = STATUS_CONFIG[officer.status];
              return (
                <tr key={officer.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'rgba(20,184,166,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                      }}>🚔</div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{officer.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-hint)' }}>{officer.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--text)' }}>{officer.badge}</td>
                  <td>{officer.dept}</td>
                  <td>{officer.rank}</td>
                  <td>
                    <span className={`badge ${status.cls}`}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: status.dot, display: 'inline-block' }} />
                      {status.label}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: officer.activeCases > 0 ? 'var(--warning)' : 'var(--text-sub)' }}>
                    {officer.activeCases}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm">Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>Remove</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
