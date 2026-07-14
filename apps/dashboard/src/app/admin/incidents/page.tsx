'use client';

/**
 * Admin — Incident Reports
 */

const MOCK_INCIDENTS = [
  { id: 'IR-342', user: 'Meera R.', title: 'Harassment near bus stop', severity: 'HIGH', status: 'investigating', location: 'Majestic Bus Stand', date: '2024-07-14', evidence: 2 },
  { id: 'IR-341', user: 'Priya S.', title: 'Stalking incident', severity: 'CRITICAL', status: 'under_review', location: 'MG Road Metro', date: '2024-07-13', evidence: 3 },
  { id: 'IR-340', user: 'Divya P.', title: 'Unsafe area report', severity: 'MEDIUM', status: 'submitted', location: 'Electronic City Phase 2', date: '2024-07-13', evidence: 0 },
  { id: 'IR-339', user: 'Sneha M.', title: 'Street harassment', severity: 'HIGH', status: 'resolved', location: 'Indiranagar 100ft Road', date: '2024-07-12', evidence: 1 },
];

const SEVERITY_BADGE: Record<string, string> = { CRITICAL: 'badge-danger', HIGH: 'badge-warning', MEDIUM: 'badge-info', LOW: 'badge-primary' };
const STATUS_BADGE: Record<string, string> = { submitted: 'badge-info', under_review: 'badge-primary', investigating: 'badge-warning', resolved: 'badge-success', closed: 'badge-info' };

export default function IncidentsPage() {
  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>🚨</div><div className="stat-value">2</div><div className="stat-label">Critical</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--warning-muted)', color: 'var(--warning)' }}>⚠️</div><div className="stat-value">5</div><div className="stat-label">Under Review</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>🔍</div><div className="stat-value">3</div><div className="stat-label">Investigating</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>✅</div><div className="stat-value">47</div><div className="stat-label">Resolved</div></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>ID</th><th>Title</th><th>User</th><th>Location</th><th>Severity</th><th>Status</th><th>Evidence</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {MOCK_INCIDENTS.map(inc => (
              <tr key={inc.id}>
                <td style={{ fontWeight: 600, color: 'var(--text)' }}>{inc.id}</td>
                <td style={{ fontWeight: 500, color: 'var(--text)' }}>{inc.title}</td>
                <td>{inc.user}</td>
                <td>{inc.location}</td>
                <td><span className={`badge ${SEVERITY_BADGE[inc.severity]}`}>{inc.severity}</span></td>
                <td><span className={`badge ${STATUS_BADGE[inc.status]}`}>{inc.status.replace('_', ' ')}</span></td>
                <td>{inc.evidence}</td>
                <td style={{ fontSize: 13 }}>{inc.date}</td>
                <td><button className="btn btn-ghost btn-sm">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
