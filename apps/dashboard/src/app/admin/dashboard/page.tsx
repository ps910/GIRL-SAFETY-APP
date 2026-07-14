'use client';

import { useState, useEffect } from 'react';

/**
 * Admin Dashboard — overview with live KPIs, SOS feed, journeys, and quick actions
 */

interface StatCard {
  label: string;
  value: string;
  icon: string;
  change?: string;
  changeType?: 'positive' | 'negative';
  color: string;
}

const MOCK_STATS: StatCard[] = [
  { label: 'Active SOS Cases', value: '3', icon: '🔴', change: '+1 last hour', changeType: 'negative', color: 'var(--danger)' },
  { label: 'Total Users', value: '12,437', icon: '👥', change: '+126 this week', changeType: 'positive', color: 'var(--primary)' },
  { label: 'Active Journeys', value: '47', icon: '🗺️', change: '5 overdue', changeType: 'negative', color: 'var(--teal)' },
  { label: 'Available Officers', value: '8', icon: '🚔', change: '12 total', changeType: 'positive', color: 'var(--success)' },
];

const MOCK_SOS_FEED = [
  { id: 'SOS-482', time: '2 min ago', user: 'User ****3821', location: 'MG Road, Bangalore', status: 'ACTIVE' },
  { id: 'SOS-481', time: '8 min ago', user: 'User ****7654', location: 'Koramangala, Bangalore', status: 'RESPONDING' },
  { id: 'SOS-480', time: '23 min ago', user: 'User ****1209', location: 'Indiranagar, Bangalore', status: 'RESPONDING' },
  { id: 'SOS-479', time: '1 hr ago', user: 'User ****8901', location: 'HSR Layout, Bangalore', status: 'RESOLVED' },
  { id: 'SOS-478', time: '2 hr ago', user: 'User ****4567', location: 'Whitefield, Bangalore', status: 'RESOLVED' },
];

const MOCK_OVERDUE_JOURNEYS = [
  { user: 'User ****2345', destination: 'Home', overdueBy: '15 min', startTime: '8:30 PM' },
  { user: 'User ****6789', destination: 'Office', overdueBy: '7 min', startTime: '9:15 PM' },
  { user: 'User ****0123', destination: 'College', overdueBy: '3 min', startTime: '9:45 PM' },
];

export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      {/* Stats Grid */}
      <div className="stats-grid">
        {MOCK_STATS.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon" style={{ background: `${stat.color}1F`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            {stat.change && (
              <div className={`stat-change ${stat.changeType}`}>
                {stat.changeType === 'positive' ? '↑' : '⚠️'} {stat.change}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid-2">
        {/* Live SOS Feed */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3>Live SOS Feed</h3>
              <p style={{ fontSize: 13, marginTop: 4 }}>Real-time emergency events</p>
            </div>
            <span className="badge badge-danger">
              <span className="status-dot active pulse" /> {MOCK_SOS_FEED.filter(s => s.status === 'ACTIVE').length} Active
            </span>
          </div>

          <div className="live-feed">
            {MOCK_SOS_FEED.map((sos) => (
              <div key={sos.id} className="feed-item">
                <StatusBadge status={sos.status} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{sos.id}</span>
                    <span className="time">{sos.time}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 2 }}>
                    {sos.user} · {sos.location}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm">View</button>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Journeys + Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3>Overdue Journeys</h3>
                <p style={{ fontSize: 13, marginTop: 4 }}>Users who haven't arrived on time</p>
              </div>
              <span className="badge badge-warning">
                ⚠️ {MOCK_OVERDUE_JOURNEYS.length}
              </span>
            </div>

            <div className="live-feed">
              {MOCK_OVERDUE_JOURNEYS.map((j) => (
                <div key={j.user} className="feed-item">
                  <span style={{ color: 'var(--warning)', fontSize: 16 }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                      {j.user} → {j.destination}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                      Overdue by {j.overdueBy} · Started {j.startTime}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm">Check</button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-primary" style={{ width: '100%' }}>
                📋 View All Active Cases
              </button>
              <button className="btn btn-ghost" style={{ width: '100%' }}>
                👥 Manage Officers
              </button>
              <button className="btn btn-ghost" style={{ width: '100%' }}>
                📊 Export Analytics Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Recent SOS Activity</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Time</th>
              <th>User</th>
              <th>Location</th>
              <th>Status</th>
              <th>Officer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_SOS_FEED.map((sos) => (
              <tr key={sos.id}>
                <td style={{ fontWeight: 600, color: 'var(--text)' }}>{sos.id}</td>
                <td>{sos.time}</td>
                <td>{sos.user}</td>
                <td>{sos.location}</td>
                <td><StatusBadge status={sos.status} /></td>
                <td>{sos.status === 'RESPONDING' ? 'Officer Sharma' : sos.status === 'RESOLVED' ? 'Officer Patel' : '—'}</td>
                <td>
                  <button className="btn btn-ghost btn-sm">
                    {sos.status === 'ACTIVE' ? 'Assign' : 'Details'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { class: string; label: string }> = {
    ACTIVE: { class: 'badge-danger', label: 'Active' },
    RESPONDING: { class: 'badge-warning', label: 'Responding' },
    RESOLVED: { class: 'badge-success', label: 'Resolved' },
    CANCELLED: { class: 'badge-info', label: 'Cancelled' },
  };
  const badge = map[status] || { class: 'badge-info', label: status };
  return <span className={`badge ${badge.class}`}>{badge.label}</span>;
}
