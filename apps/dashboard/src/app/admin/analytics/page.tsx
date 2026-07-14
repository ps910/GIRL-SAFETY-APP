'use client';

/**
 * Admin — Analytics Dashboard
 * SOS frequency, response times, heatmap data, user growth
 */

export default function AnalyticsPage() {
  return (
    <div>
      {/* Summary Stats */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>🔴</div>
          <div className="stat-value">142</div>
          <div className="stat-label">SOS This Month</div>
          <div className="stat-change negative">↑ 12% from last month</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>⏱️</div>
          <div className="stat-value">4.2m</div>
          <div className="stat-label">Avg Response Time</div>
          <div className="stat-change positive">↓ 18% improvement</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>👥</div>
          <div className="stat-value">94%</div>
          <div className="stat-label">Resolution Rate</div>
          <div className="stat-change positive">↑ 3% from last month</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(20,184,166,0.15)', color: 'var(--teal)' }}>🗺️</div>
          <div className="stat-value">1,247</div>
          <div className="stat-label">Journeys This Month</div>
          <div className="stat-change positive">↑ 28% growth</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 32 }}>
        {/* SOS Frequency Chart (placeholder) */}
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>SOS Events — Last 7 Days</h3>
          <p style={{ fontSize: 13, marginBottom: 24 }}>Daily SOS trigger count</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, padding: '0 16px' }}>
            {[18, 12, 22, 8, 15, 28, 20].map((val, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-sub)' }}>{val}</span>
                <div style={{
                  width: '100%',
                  height: `${(val / 30) * 180}px`,
                  background: `linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%)`,
                  borderRadius: '6px 6px 0 0',
                  minHeight: 8,
                }} />
                <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Distribution */}
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>SOS by Time of Day</h3>
          <p style={{ fontSize: 13, marginBottom: 24 }}>When do SOS events happen most?</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 200, padding: '0 8px' }}>
            {[2, 1, 1, 0, 0, 1, 3, 5, 4, 3, 2, 2, 3, 4, 3, 5, 6, 8, 12, 18, 22, 15, 8, 4].map((val, i) => (
              <div key={i} style={{
                flex: 1,
                height: `${(val / 24) * 180}px`,
                background: val > 15 ? 'var(--danger)' : val > 8 ? 'var(--warning)' : 'var(--primary)',
                borderRadius: '4px 4px 0 0',
                minHeight: 2,
                opacity: 0.8,
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 8px' }}>
            <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>12 AM</span>
            <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>6 AM</span>
            <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>12 PM</span>
            <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>6 PM</span>
            <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>11 PM</span>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-sub)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--danger)' }} /> Peak hours
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-sub)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--warning)' }} /> Elevated
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-sub)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--primary)' }} /> Normal
            </div>
          </div>
        </div>
      </div>

      {/* Top Locations */}
      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 16 }}>Top SOS Locations</h3>
        <table className="data-table">
          <thead>
            <tr><th>Location</th><th>SOS Count</th><th>Avg Response</th><th>Risk Level</th></tr>
          </thead>
          <tbody>
            {[
              { loc: 'MG Road, Bangalore', count: 28, response: '3.8m', risk: 'HIGH' },
              { loc: 'Koramangala, Bangalore', count: 22, response: '4.1m', risk: 'HIGH' },
              { loc: 'Electronic City, Bangalore', count: 18, response: '5.2m', risk: 'MEDIUM' },
              { loc: 'Whitefield, Bangalore', count: 15, response: '4.8m', risk: 'MEDIUM' },
              { loc: 'HSR Layout, Bangalore', count: 12, response: '3.5m', risk: 'MODERATE' },
            ].map(row => (
              <tr key={row.loc}>
                <td style={{ fontWeight: 600, color: 'var(--text)' }}>{row.loc}</td>
                <td>{row.count}</td>
                <td>{row.response}</td>
                <td>
                  <span className={`badge ${row.risk === 'HIGH' ? 'badge-danger' : row.risk === 'MEDIUM' ? 'badge-warning' : 'badge-info'}`}>
                    {row.risk}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="btn btn-ghost">📋 Export CSV</button>
        <button className="btn btn-primary">📊 Full Report</button>
      </div>
    </div>
  );
}
