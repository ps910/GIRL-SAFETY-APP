'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Police Case Response Center — respond to a specific SOS case
 */
export default function RespondCasePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: caseId } = use(params);
  const [status, setStatus] = useState<'assigned' | 'en_route' | 'on_scene' | 'resolved'>('assigned');
  const [notes, setNotes] = useState('');
  const [timeline, setTimeline] = useState([
    { time: '9:12 PM', event: 'SOS Alert Triggered by User', type: 'alert' },
    { time: '9:13 PM', event: 'Case SOS-482 assigned to you', type: 'assign' },
  ]);

  const updateStatus = (nextStatus: typeof status) => {
    setStatus(nextStatus);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let label = '';
    if (nextStatus === 'en_route') label = 'Officer dispatched and en route';
    else if (nextStatus === 'on_scene') label = 'Officer arrived on scene';
    else if (nextStatus === 'resolved') label = 'Case marked resolved';

    setTimeline(prev => [...prev, { time, event: label, type: 'update' }]);
  };

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    updateStatus('resolved');
    setTimeout(() => {
      router.push('/police/dashboard');
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="grid-2">
        {/* Case Info */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>🚨 Case Details: {caseId}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <InfoItem label="Victim Name" value="Priya Sharma" />
            <InfoItem label="Phone Number" value="+91 98765 43210" />
            <InfoItem label="Emergency Contacts" value="Mother (****9876), Friend (****1234)" />
            <InfoItem label="Location" value="MG Road Metro Station Entrance, Bangalore" />
            <InfoItem label="Medical Info" value="Blood Group: O+, Asthma" />
          </div>
        </div>

        {/* Dispatch Action Panel */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>⚡ Response Actions</h3>

          {status !== 'resolved' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-hint)', textTransform: 'uppercase' as const, letterSpacing: 1.2, marginBottom: 8 }}>Current Status</div>
                <span className={`badge ${status === 'assigned' ? 'badge-primary' : status === 'en_route' ? 'badge-warning' : 'badge-danger'}`}>
                  ● {status.toUpperCase().replace('_', ' ')}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1, borderColor: 'var(--warning)', color: 'var(--warning)' }}
                  onClick={() => updateStatus('en_route')}
                  disabled={status !== 'assigned'}
                >
                  🚀 Dispatch / En Route
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1, borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  onClick={() => updateStatus('on_scene')}
                  disabled={status !== 'en_route'}
                >
                  🏁 Arrived on Scene
                </button>
              </div>

              <form onSubmit={handleResolve} style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>Resolution Notes</label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe the outcome, condition of the victim, actions taken..."
                    style={{ width: '100%', marginTop: 8 }}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16, background: 'var(--success)' }}>
                  ✅ Resolve Case
                </button>
              </form>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
              <h3>Case Resolved Successfully</h3>
              <p style={{ fontSize: 13, marginTop: 8 }}>This emergency event is closed. Returning to dashboard...</p>
            </div>
          )}
        </div>
      </div>

      {/* Case Timeline */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Timeline of Events</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {timeline.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', borderRadius: 10, background: 'var(--surface)' }}>
              <span style={{ fontSize: 14 }}>
                {item.type === 'alert' ? '🚨' : item.type === 'assign' ? '📋' : '🔄'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{item.event}</span>
              <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-hint)', textTransform: 'uppercase' as const, letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>{value}</div>
    </div>
  );
}
