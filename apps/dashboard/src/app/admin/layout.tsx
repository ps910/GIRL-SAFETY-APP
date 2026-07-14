'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '📊', href: '/admin/dashboard' },
  { label: 'Live SOS', icon: '🔴', href: '/admin/sos' },
  { label: 'Users', icon: '👥', href: '/admin/users' },
  { label: 'Journeys', icon: '🗺️', href: '/admin/journeys' },
  { label: 'Incidents', icon: '📋', href: '/admin/incidents' },
  { label: 'Analytics', icon: '📈', href: '/admin/analytics' },
  { label: 'Officers', icon: '🚔', href: '/admin/officers' },
  { label: 'Evidence', icon: '🔒', href: '/admin/evidence' },
  { label: 'Settings', icon: '⚙️', href: '/admin/settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🛡</div>
          <div>
            <h2>SafeHer</h2>
            <span>Admin Console</span>
          </div>
        </div>

        <div className="sidebar-section-label">Navigation</div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
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
            <h1>{NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label || 'Dashboard'}</h1>
            <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="topbar-right">
            <div className="role-indicator admin">
              <span>🛡</span> Admin
            </div>
            <button className="btn btn-ghost btn-sm">
              🔔 Notifications
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
