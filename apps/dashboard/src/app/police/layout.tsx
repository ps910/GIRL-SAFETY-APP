'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '📊', href: '/police/dashboard' },
  { label: 'My Cases', icon: '📋', href: '/police/cases' },
  { label: 'Live Map', icon: '🗺️', href: '/police/map' },
  { label: 'Crime Zones', icon: '🔴', href: '/police/zones' },
  { label: 'Case Database', icon: '🗄️', href: '/police/database' },
  { label: 'Respond', icon: '🚨', href: '/police/respond' },
];

export default function PoliceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="dashboard-layout">
      {/* Sidebar — Police variant */}
      <aside className="sidebar" style={{ borderRightColor: 'rgba(20, 184, 166, 0.15)' }}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon" style={{ background: '#14B8A6', boxShadow: '0 4px 12px rgba(20, 184, 166, 0.35)' }}>🚔</div>
          <div>
            <h2>SafeHer</h2>
            <span style={{ color: '#14B8A6' }}>Police Portal</span>
          </div>
        </div>

        <div className="sidebar-section-label">Operations</div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              style={pathname === item.href ? { background: 'rgba(20, 184, 166, 0.12)', color: '#14B8A6' } : {}}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'rgba(20, 184, 166, 0.06)', border: '1px solid rgba(20, 184, 166, 0.15)',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-hint)', textTransform: 'uppercase' as const, letterSpacing: 1 }}>On Duty</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#14B8A6', marginTop: 4 }}>Officer Sharma</div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>Badge: KA-2847</div>
          </div>

          <Link href="/" className="sidebar-link" style={{ color: 'var(--danger)' }}>
            <span className="icon">🚪</span>
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <h1>{NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label || 'Police Dashboard'}</h1>
            <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="topbar-right">
            <div className="role-indicator police">
              <span>🚔</span> Police Officer
            </div>
            <button className="btn btn-ghost btn-sm">
              🔔 Alerts
            </button>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
