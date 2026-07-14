'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Login page — entry point for Admin and Police users
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'police'>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // TODO: Implement Firebase Auth sign-in
    // For now, route based on role selection
    setTimeout(() => {
      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/police/dashboard');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />

      <div style={styles.container}>
        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.brandIcon}>🛡</div>
          <h1 style={styles.brandTitle}>SafeHer</h1>
          <p style={styles.brandSub}>Safety Operations Dashboard</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={styles.form}>
          {/* Role Selector */}
          <div style={styles.roleSelector}>
            <button
              type="button"
              onClick={() => setRole('admin')}
              style={{
                ...styles.roleBtn,
                ...(role === 'admin' ? styles.roleBtnActive : {}),
              }}
            >
              <span>🛡</span> Admin
            </button>
            <button
              type="button"
              onClick={() => setRole('police')}
              style={{
                ...styles.roleBtn,
                ...(role === 'police' ? styles.roleBtnPolice : {}),
              }}
            >
              <span>🚔</span> Police
            </button>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@safeher.app"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? 'Signing in...' : `Sign in as ${role === 'admin' ? 'Admin' : 'Officer'}`}
          </button>

          <p style={styles.footer}>
            SafeHer v8.0 — Midnight Indigo
          </p>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(145deg, #0D1321 0%, #0A0E1A 50%, #1A2342 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  bgOrb1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'rgba(99, 102, 241, 0.06)',
    top: -100,
    left: -100,
    filter: 'blur(60px)',
  },
  bgOrb2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.05)',
    bottom: -80,
    right: -80,
    filter: 'blur(60px)',
  },
  container: {
    width: '100%',
    maxWidth: 420,
    padding: 32,
    position: 'relative',
    zIndex: 1,
  },
  brand: {
    textAlign: 'center',
    marginBottom: 40,
  },
  brandIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    background: '#6366F1',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    marginBottom: 16,
    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35)',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#F1F5F9',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  form: {
    background: '#131A2E',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: 22,
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  roleSelector: {
    display: 'flex',
    gap: 8,
  },
  roleBtn: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid rgba(99, 102, 241, 0.15)',
    background: 'rgba(99, 102, 241, 0.06)',
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'Space Grotesk', sans-serif",
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 150ms ease',
  },
  roleBtnActive: {
    background: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(129, 140, 248, 0.5)',
    color: '#818CF8',
  },
  roleBtnPolice: {
    background: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.4)',
    color: '#14B8A6',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: '#94A3B8',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  input: {
    padding: '13px 16px',
    borderRadius: 14,
    border: '1px solid rgba(99, 102, 241, 0.15)',
    background: 'rgba(99, 102, 241, 0.06)',
    color: '#F1F5F9',
    fontSize: 15,
    outline: 'none',
  },
  error: {
    padding: '10px 14px',
    borderRadius: 10,
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#EF4444',
    fontSize: 13,
    fontWeight: 500,
  },
  submitBtn: {
    padding: '14px 20px',
    borderRadius: 14,
    background: '#6366F1',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "'Space Grotesk', sans-serif",
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
    letterSpacing: 0.2,
    transition: 'all 150ms ease',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#64748B',
  },
};
