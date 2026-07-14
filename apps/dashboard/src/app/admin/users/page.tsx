'use client';

/**
 * Admin — User Management
 * Search, filter, and manage all registered SafeHer users
 */

const MOCK_USERS = [
  { uid: 'u001', name: 'Priya Sharma', email: 'priya@example.com', phone: '****3821', guardians: 3, sosCount: 2, journeys: 12, lastActive: '2 min ago', status: 'active' },
  { uid: 'u002', name: 'Ananya Kumar', email: 'ananya@example.com', phone: '****7654', guardians: 2, sosCount: 1, journeys: 8, lastActive: '15 min ago', status: 'active' },
  { uid: 'u003', name: 'Meera Reddy', email: 'meera@example.com', phone: '****1209', guardians: 4, sosCount: 5, journeys: 34, lastActive: '1 hr ago', status: 'active' },
  { uid: 'u004', name: 'Divya Patel', email: 'divya@example.com', phone: '****8901', guardians: 1, sosCount: 0, journeys: 3, lastActive: '3 hr ago', status: 'active' },
  { uid: 'u005', name: 'Sneha Mishra', email: 'sneha@example.com', phone: '****4567', guardians: 2, sosCount: 1, journeys: 15, lastActive: '1 day ago', status: 'inactive' },
  { uid: 'u006', name: 'Riya Joshi', email: 'riya@example.com', phone: '****2345', guardians: 0, sosCount: 0, journeys: 0, lastActive: '3 days ago', status: 'inactive' },
];

export default function UsersPage() {
  return (
    <div>
      {/* Summary Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>👥</div>
          <div className="stat-value">12,437</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>✅</div>
          <div className="stat-value">8,291</div>
          <div className="stat-label">Active (30 days)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warning-muted)', color: 'var(--warning)' }}>⚠️</div>
          <div className="stat-value">1,432</div>
          <div className="stat-label">No Guardians</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--info-muted)', color: 'var(--info)' }}>📱</div>
          <div className="stat-value">9,847</div>
          <div className="stat-label">Push Enabled</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input type="text" placeholder="Search by name, email, or phone..." style={{ flex: 2 }} />
        <select style={{ flex: 1 }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select style={{ flex: 1 }}>
          <option value="all">Guardian Status</option>
          <option value="with">Has Guardians</option>
          <option value="without">No Guardians</option>
        </select>
        <button className="btn btn-primary btn-sm">Search</button>
      </div>

      {/* User Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Phone</th>
              <th>Guardians</th>
              <th>SOS Count</th>
              <th>Journeys</th>
              <th>Last Active</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_USERS.map((user) => (
              <tr key={user.uid}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 2 }}>{user.email}</div>
                </td>
                <td>{user.phone}</td>
                <td>
                  <span style={{ color: user.guardians === 0 ? 'var(--warning)' : 'var(--text)' }}>
                    {user.guardians === 0 ? '⚠️ None' : user.guardians}
                  </span>
                </td>
                <td>
                  <span style={{ color: user.sosCount > 3 ? 'var(--danger)' : 'var(--text-sub)' }}>
                    {user.sosCount}
                  </span>
                </td>
                <td>{user.journeys}</td>
                <td style={{ fontSize: 13 }}>{user.lastActive}</td>
                <td>
                  <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-info'}`}>
                    {user.status}
                  </span>
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
        <button className="btn btn-ghost btn-sm">← Previous</button>
        <button className="btn btn-primary btn-sm">1</button>
        <button className="btn btn-ghost btn-sm">2</button>
        <button className="btn btn-ghost btn-sm">3</button>
        <button className="btn btn-ghost btn-sm">Next →</button>
      </div>
    </div>
  );
}
