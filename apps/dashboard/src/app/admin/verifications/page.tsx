'use client';

import { useState } from 'react';

/**
 * Admin — User Verification Queue
 * Review pending identity verification requests.
 * Side-by-side: selfie + declared info. Approve/Reject/Request more info.
 */

interface VerificationRequest {
  id: string;
  userId: string;
  name: string;
  phone: string;
  gender: string;
  selfieUrl: string;
  livenessScore: number;
  challengesPassed: number;
  totalChallenges: number;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'more_info';
  idType?: string;
  idVerified?: boolean;
  communityVouches: number;
  flags: number;
}

const MOCK_REQUESTS: VerificationRequest[] = [
  { id: 'VER-001', userId: '****3821', name: 'Priya S.', phone: '+91 ****3821', gender: 'Woman', selfieUrl: '', livenessScore: 0.95, challengesPassed: 4, totalChallenges: 4, submittedAt: '2026-07-17 14:30', status: 'pending', idType: 'Aadhaar', idVerified: true, communityVouches: 0, flags: 0 },
  { id: 'VER-002', userId: '****7654', name: 'Ananya K.', phone: '+91 ****7654', gender: 'Woman', selfieUrl: '', livenessScore: 0.88, challengesPassed: 3, totalChallenges: 4, submittedAt: '2026-07-17 13:15', status: 'pending', communityVouches: 1, flags: 0 },
  { id: 'VER-003', userId: '****9012', name: 'Sneha R.', phone: '+91 ****9012', gender: 'Woman', selfieUrl: '', livenessScore: 0.72, challengesPassed: 2, totalChallenges: 4, submittedAt: '2026-07-17 11:00', status: 'pending', communityVouches: 0, flags: 1 },
  { id: 'VER-004', userId: '****4567', name: 'Meera D.', phone: '+91 ****4567', gender: 'Non-binary', selfieUrl: '', livenessScore: 0.91, challengesPassed: 4, totalChallenges: 4, submittedAt: '2026-07-16 22:00', status: 'approved', idType: 'Aadhaar', idVerified: true, communityVouches: 2, flags: 0 },
  { id: 'VER-005', userId: '****1111', name: 'Unknown', phone: '+91 ****1111', gender: 'Woman', selfieUrl: '', livenessScore: 0.45, challengesPassed: 1, totalChallenges: 4, submittedAt: '2026-07-16 20:00', status: 'rejected', communityVouches: 0, flags: 3 },
];

const STATUS_STYLE: Record<string, { cls: string; label: string }> = {
  pending: { cls: 'badge-warning', label: 'Pending Review' },
  approved: { cls: 'badge-success', label: 'Approved' },
  rejected: { cls: 'badge-danger', label: 'Rejected' },
  more_info: { cls: 'badge-info', label: 'More Info Needed' },
};

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [filter, setFilter] = useState<string>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const selected = requests.find(r => r.id === selectedId);

  const handleAction = (id: string, action: 'approved' | 'rejected' | 'more_info') => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" onClick={() => setFilter('pending')} style={{ cursor: 'pointer', border: filter === 'pending' ? '2px solid var(--warning)' : undefined }}>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontSize: 18 }}>⏳</div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card" onClick={() => setFilter('approved')} style={{ cursor: 'pointer', border: filter === 'approved' ? '2px solid var(--success)' : undefined }}>
          <div className="stat-icon" style={{ background: 'var(--success-muted)', color: 'var(--success)', fontSize: 18 }}>✅</div>
          <div className="stat-value">{approvedCount}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card" onClick={() => setFilter('rejected')} style={{ cursor: 'pointer', border: filter === 'rejected' ? '2px solid var(--danger)' : undefined }}>
          <div className="stat-icon" style={{ background: 'var(--danger-muted)', color: 'var(--danger)', fontSize: 18 }}>❌</div>
          <div className="stat-value">{rejectedCount}</div>
          <div className="stat-label">Rejected</div>
        </div>
        <div className="stat-card" onClick={() => setFilter('all')} style={{ cursor: 'pointer', border: filter === 'all' ? '2px solid var(--teal)' : undefined }}>
          <div className="stat-icon" style={{ background: 'rgba(20,184,166,0.15)', color: 'var(--teal)', fontSize: 18 }}>👥</div>
          <div className="stat-value">{requests.length}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Left: Request List */}
        <div>
          <h3 style={{ marginBottom: 16 }}>
            📋 Verification Queue
            <span className="badge badge-warning" style={{ marginLeft: 8 }}>{filtered.length}</span>
          </h3>

          {filtered.map(req => {
            const st = STATUS_STYLE[req.status];
            const isSelected = selectedId === req.id;
            return (
              <div key={req.id} className="card"
                onClick={() => setSelectedId(req.id)}
                style={{
                  marginBottom: 10,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--teal)' : undefined,
                  borderLeft: `4px solid ${req.flags > 0 ? 'var(--danger)' : req.livenessScore >= 0.85 ? 'var(--success)' : 'var(--warning)'}`,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 18,
                        background: 'var(--surface)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 800, color: 'var(--text-sub)',
                      }}>
                        {req.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{req.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-hint)' }}>{req.phone}</div>
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${st.cls}`} style={{ fontSize: 10 }}>{st.label}</span>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                    🎭 Gender: <strong>{req.gender}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: req.livenessScore >= 0.85 ? 'var(--success)' : 'var(--warning)' }}>
                    📷 Liveness: <strong>{(req.livenessScore * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                    ✋ Challenges: {req.challengesPassed}/{req.totalChallenges}
                  </div>
                  {req.flags > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--danger)' }}>
                      🚩 {req.flags} flag(s)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Detail Panel */}
        <div>
          {selected ? (
            <div className="card" style={{ position: 'sticky', top: 16 }}>
              <h3 style={{ marginBottom: 20 }}>🔍 Review: {selected.name}</h3>

              {/* Selfie Placeholder */}
              <div style={{
                width: '100%', height: 200, borderRadius: 12,
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48 }}>👤</div>
                  <div style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 8 }}>Liveness Selfie</div>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-hint)', fontWeight: 700, letterSpacing: 1 }}>GENDER</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>{selected.gender}</div>
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-hint)', fontWeight: 700, letterSpacing: 1 }}>LIVENESS</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: selected.livenessScore >= 0.85 ? 'var(--success)' : 'var(--warning)', marginTop: 4 }}>
                    {(selected.livenessScore * 100).toFixed(0)}%
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-hint)', fontWeight: 700, letterSpacing: 1 }}>ID TYPE</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
                    {selected.idType || 'None'}
                    {selected.idVerified && <span style={{ color: 'var(--success)', marginLeft: 6 }}>✓</span>}
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-hint)', fontWeight: 700, letterSpacing: 1 }}>VOUCHES</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>{selected.communityVouches}</div>
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-hint)', fontWeight: 700, letterSpacing: 1 }}>CHALLENGES</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>{selected.challengesPassed}/{selected.totalChallenges}</div>
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-hint)', fontWeight: 700, letterSpacing: 1 }}>FLAGS</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: selected.flags > 0 ? 'var(--danger)' : 'var(--text)', marginTop: 4 }}>
                    {selected.flags} {selected.flags > 0 ? '🚩' : ''}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {selected.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm" style={{ flex: 1, background: 'var(--success)', color: '#fff', border: 'none', fontWeight: 700 }}
                    onClick={() => handleAction(selected.id, 'approved')}>✅ Approve</button>
                  <button className="btn btn-sm" style={{ flex: 1, background: 'var(--danger)', color: '#fff', border: 'none', fontWeight: 700 }}
                    onClick={() => handleAction(selected.id, 'rejected')}>❌ Reject</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                    onClick={() => handleAction(selected.id, 'more_info')}>📝 Request Info</button>
                </div>
              )}

              <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 16 }}>
                Submitted: {selected.submittedAt} • ID: {selected.id}
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-hint)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👈</div>
              <div style={{ fontSize: 14 }}>Select a verification request to review</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
