'use client';

import { useState } from 'react';

/**
 * Police — Historical Case Database
 * All past SOS cases with full timeline, filters, area statistics,
 * and external data import (CSV).
 */

interface CaseRecord {
  id: string;
  userId: string;
  area: string;
  zoneType: 'red' | 'yellow' | 'green';
  type: 'sos' | 'journey_overdue' | 'incident_report';
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'assigned' | 'responding' | 'resolved' | 'closed';
  triggeredAt: string;
  resolvedAt?: string;
  responseTime?: string;
  officer?: string;
  guardians: number;
  evidence: number;
  description: string;
  lat: number;
  lng: number;
}

const MOCK_CASES: CaseRecord[] = [
  { id: 'SOS-482', userId: '****3821', area: 'MG Road', zoneType: 'red', type: 'sos', severity: 'critical', status: 'resolved', triggeredAt: '2026-07-17 21:18', resolvedAt: '2026-07-17 21:32', responseTime: '4m', officer: 'Sharma', guardians: 3, evidence: 2, description: 'SOS triggered near metro station. Audio evidence captured.', lat: 12.9716, lng: 77.5946 },
  { id: 'SOS-481', userId: '****7654', area: 'Koramangala', zoneType: 'red', type: 'sos', severity: 'high', status: 'resolved', triggeredAt: '2026-07-17 21:10', resolvedAt: '2026-07-17 21:28', responseTime: '8m', officer: 'Sharma', guardians: 2, evidence: 1, description: 'SOS active. User sharing live location.', lat: 12.9352, lng: 77.6245 },
  { id: 'SOS-479', userId: '****8901', area: 'HSR Layout', zoneType: 'yellow', type: 'sos', severity: 'medium', status: 'closed', triggeredAt: '2026-07-17 20:20', resolvedAt: '2026-07-17 20:45', responseTime: '8m', officer: 'Patel', guardians: 1, evidence: 0, description: 'SOS triggered. User confirmed safe after check-in.', lat: 12.9116, lng: 77.6389 },
  { id: 'JRN-115', userId: '****2345', area: 'Indiranagar', zoneType: 'yellow', type: 'journey_overdue', severity: 'medium', status: 'resolved', triggeredAt: '2026-07-17 20:30', resolvedAt: '2026-07-17 20:50', responseTime: '5m', officer: 'Kumar', guardians: 2, evidence: 0, description: 'Journey overdue by 15 minutes. User checked in safely.', lat: 12.9719, lng: 77.6412 },
  { id: 'SOS-475', userId: '****4567', area: 'Majestic', zoneType: 'red', type: 'sos', severity: 'critical', status: 'closed', triggeredAt: '2026-07-16 23:45', resolvedAt: '2026-07-17 00:02', responseTime: '6m', officer: 'Singh', guardians: 3, evidence: 3, description: 'SOS near bus stand. Multiple evidence items. Police escorted user.', lat: 12.9767, lng: 77.5713 },
  { id: 'INC-089', userId: '****6789', area: 'Whitefield', zoneType: 'green', type: 'incident_report', severity: 'low', status: 'closed', triggeredAt: '2026-07-16 18:00', resolvedAt: '2026-07-16 18:30', responseTime: '12m', officer: 'Reddy', guardians: 0, evidence: 1, description: 'Incident report filed — suspicious activity near office.', lat: 12.9698, lng: 77.7500 },
  { id: 'SOS-470', userId: '****1234', area: 'Electronic City', zoneType: 'yellow', type: 'sos', severity: 'high', status: 'closed', triggeredAt: '2026-07-15 22:30', resolvedAt: '2026-07-15 22:48', responseTime: '7m', officer: 'Sharma', guardians: 2, evidence: 1, description: 'SOS triggered on highway. User reached safe location.', lat: 12.8440, lng: 77.6765 },
  { id: 'SOS-465', userId: '****9012', area: 'MG Road', zoneType: 'red', type: 'sos', severity: 'critical', status: 'closed', triggeredAt: '2026-07-14 21:15', resolvedAt: '2026-07-14 21:25', responseTime: '3m', officer: 'Patel', guardians: 4, evidence: 2, description: 'SOS triggered with voice. Fast police response.', lat: 12.9720, lng: 77.5950 },
];

const SEVERITY_COLORS: Record<string, { bg: string; text: string; cls: string }> = {
  critical: { bg: 'var(--danger-muted)', text: 'var(--danger)', cls: 'badge-danger' },
  high: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', cls: 'badge-warning' },
  medium: { bg: 'var(--primary-muted)', text: 'var(--primary)', cls: 'badge-primary' },
  low: { bg: 'var(--success-muted)', text: 'var(--success)', cls: 'badge-success' },
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'badge-info' },
  assigned: { label: 'Assigned', cls: 'badge-primary' },
  responding: { label: 'Responding', cls: 'badge-warning' },
  resolved: { label: 'Resolved', cls: 'badge-success' },
  closed: { label: 'Closed', cls: 'badge-info' },
};

const TYPE_ICONS: Record<string, string> = {
  sos: '🚨',
  journey_overdue: '⏰',
  incident_report: '📝',
};

export default function PoliceDatabasePage() {
  const [cases] = useState(MOCK_CASES);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  const areas = [...new Set(cases.map(c => c.area))];
  const filtered = cases.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (severityFilter !== 'all' && c.severity !== severityFilter) return false;
    if (areaFilter !== 'all' && c.area !== areaFilter) return false;
    return true;
  });

  // Area statistics
  const areaStats = areas.map(area => {
    const areaCases = cases.filter(c => c.area === area);
    const avgResponseMs = areaCases.filter(c => c.responseTime).length > 0
      ? areaCases.reduce((s, c) => s + parseInt(c.responseTime || '0', 10), 0) / areaCases.length
      : 0;
    return {
      area,
      total: areaCases.length,
      critical: areaCases.filter(c => c.severity === 'critical').length,
      avgResponse: `${avgResponseMs.toFixed(0)}m`,
      zoneType: areaCases[0]?.zoneType || 'green',
    };
  }).sort((a, b) => b.total - a.total);

  return (
    <div>
      {/* Summary Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--danger-muted)', color: 'var(--danger)', fontSize: 18 }}>📋</div>
          <div className="stat-value">{cases.length}</div>
          <div className="stat-label">Total Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: 18 }}>🔴</div>
          <div className="stat-value">{cases.filter(c => c.severity === 'critical').length}</div>
          <div className="stat-label">Critical</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-muted)', color: 'var(--success)', fontSize: 18 }}>✅</div>
          <div className="stat-value">{cases.filter(c => c.status === 'resolved' || c.status === 'closed').length}</div>
          <div className="stat-label">Resolved</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(20,184,166,0.15)', color: 'var(--teal)', fontSize: 18 }}>⏱️</div>
          <div className="stat-value">{(cases.reduce((s, c) => s + parseInt(c.responseTime || '0', 10), 0) / cases.length).toFixed(1)}m</div>
          <div className="stat-label">Avg Response</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Area Breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>📊 Area-wise Breakdown</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, color: 'var(--text-hint)', fontWeight: 700, letterSpacing: 1 }}>AREA</th>
                <th style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, color: 'var(--text-hint)', fontWeight: 700 }}>ZONE</th>
                <th style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, color: 'var(--text-hint)', fontWeight: 700 }}>CASES</th>
                <th style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, color: 'var(--text-hint)', fontWeight: 700 }}>CRITICAL</th>
                <th style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, color: 'var(--text-hint)', fontWeight: 700 }}>AVG RESP</th>
              </tr>
            </thead>
            <tbody>
              {areaStats.map(a => (
                <tr key={a.area} style={{ borderBottom: '1px solid var(--border)' }} onClick={() => setAreaFilter(areaFilter === a.area ? 'all' : a.area)}>
                  <td style={{ padding: '10px 0', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>{a.area}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 12 }}>
                      {a.zoneType === 'red' ? '🔴' : a.zoneType === 'yellow' ? '🟡' : '🟢'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{a.total}</td>
                  <td style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: a.critical > 0 ? 'var(--danger)' : 'var(--text-hint)' }}>{a.critical}</td>
                  <td style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-sub)' }}>{a.avgResponse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Filters */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>🔍 Filters</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-hint)', letterSpacing: 1 }}>STATUS</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {['all', 'pending', 'assigned', 'responding', 'resolved', 'closed'].map(s => (
                <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setStatusFilter(s)} style={{ fontSize: 11 }}>{s === 'all' ? 'All' : STATUS_MAP[s]?.label || s}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-hint)', letterSpacing: 1 }}>SEVERITY</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                <button key={s} className={`btn btn-sm ${severityFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setSeverityFilter(s)} style={{ fontSize: 11 }}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-hint)', letterSpacing: 1 }}>AREA</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <button className={`btn btn-sm ${areaFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setAreaFilter('all')} style={{ fontSize: 11 }}>All</button>
              {areas.map(a => (
                <button key={a} className={`btn btn-sm ${areaFilter === a ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setAreaFilter(a)} style={{ fontSize: 11 }}>{a}</button>
              ))}
            </div>
          </div>

          {/* Export */}
          <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>📄 Export CSV</button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>📊 Export PDF</button>
          </div>
        </div>
      </div>

      {/* Case List */}
      <h3 style={{ marginBottom: 16 }}>
        📁 Case Records
        <span className="badge badge-info" style={{ marginLeft: 8 }}>{filtered.length}</span>
      </h3>

      {filtered.map(c => {
        const sev = SEVERITY_COLORS[c.severity];
        const stat = STATUS_MAP[c.status];
        const isExpanded = expandedCase === c.id;
        return (
          <div key={c.id} className="card" style={{ marginBottom: 12, borderLeft: `4px solid ${sev.text}`, cursor: 'pointer' }}
            onClick={() => setExpandedCase(isExpanded ? null : c.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{TYPE_ICONS[c.type]}</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700 }}>{c.id}</span>
                  <span className={`badge ${sev.cls}`} style={{ fontSize: 10 }}>{c.severity.toUpperCase()}</span>
                  <span className={`badge ${stat.cls}`} style={{ fontSize: 10 }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                  {c.area} • User {c.userId} • {c.triggeredAt}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {c.responseTime && (
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--teal)' }}>{c.responseTime}</div>
                )}
                <div style={{ fontSize: 10, color: 'var(--text-hint)' }}>response</div>
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12, lineHeight: 1.5 }}>{c.description}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{c.guardians}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-hint)' }}>Guardians</div>
                  </div>
                  <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{c.evidence}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-hint)' }}>Evidence</div>
                  </div>
                  <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{c.officer || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-hint)' }}>Officer</div>
                  </div>
                  <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)', fontFamily: 'monospace' }}>
                      {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-hint)' }}>Location</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Import */}
      <div className="card" style={{ marginTop: 16, borderStyle: 'dashed', borderColor: 'var(--border)', textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🗄️</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Merge External Database</div>
        <div style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 6 }}>
          Import existing police records (CSV) to correlate with SafeHer SOS data
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>Upload Police Records CSV</button>
      </div>
    </div>
  );
}
