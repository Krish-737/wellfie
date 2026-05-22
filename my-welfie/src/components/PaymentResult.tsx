import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaPredicate } from 'react-media-hook';
import { useAuth } from '../context/AuthContext';

// ── Shared styles ─────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: 24,
  },
  card: {
    maxWidth: 440,
    width: '100%',
    background: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.10)',
    padding: '48px 40px',
    textAlign: 'center',
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 12,
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 32,
    lineHeight: 1.6,
  },
  primaryBtn: {
    display: 'inline-block',
    padding: '13px 28px',
    fontSize: 15,
    fontWeight: 600,
    color: '#ffffff',
    background: '#14b8a6',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background 0.2s',
    marginRight: 12,
  },
  secondaryBtn: {
    display: 'inline-block',
    padding: '13px 28px',
    fontSize: 15,
    fontWeight: 600,
    color: '#334155',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background 0.2s',
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
    gap: 12,
  },
};

// ── Success page ──────────────────────────────────────────────────────────────

export const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { refreshEntitlement, scansRemaining } = useAuth();
  const isMobile = useMediaPredicate('(max-width: 640px)');

  // Refresh the scan count as soon as this page loads so the navbar updates
  useEffect(() => {
    refreshEntitlement();
  }, []);

  const pageStyle = { ...s.page, padding: isMobile ? 12 : 24 };
  const cardStyle = {
    ...s.card,
    padding: isMobile ? '30px 20px' : '48px 40px',
  };

  return (
    <div style={{ ...pageStyle, background: 'linear-gradient(135deg, #f0fdfa 0%, #eff6ff 100%)' }}>
      <div style={cardStyle}>
        {/* Green checkmark */}
        <div style={{ ...s.icon, background: '#dcfce7' }}>
          <svg width="32" height="32" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          </svg>
        </div>

        <h1 style={s.title}>Payment Successful!</h1>
        <p style={s.subtitle}>
          Your scan pack has been added to your account.
          {scansRemaining >= 0 && (
            <> You now have <strong style={{ color: '#0d9488' }}>{scansRemaining} scan{scansRemaining !== 1 ? 's' : ''}</strong> remaining.</>
          )}
        </p>

        <div style={s.btnRow}>
          <button
            style={s.primaryBtn}
            onClick={() => navigate('/camera')}
            onMouseEnter={e => (e.currentTarget.style.background = '#0d9488')}
            onMouseLeave={e => (e.currentTarget.style.background = '#14b8a6')}
          >
            Start Scanning
          </button>
          <button
            style={s.secondaryBtn}
            onClick={() => navigate('/')}
            onMouseEnter={e => (e.currentTarget.style.background = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f1f5f9')}
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Cancelled page ────────────────────────────────────────────────────────────

export const PaymentCancelled: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMediaPredicate('(max-width: 640px)');
  const pageStyle = { ...s.page, padding: isMobile ? 12 : 24 };
  const cardStyle = {
    ...s.card,
    padding: isMobile ? '30px 20px' : '48px 40px',
  };

  return (
    <div style={{ ...pageStyle, background: '#fafafa' }}>
      <div style={cardStyle}>
        {/* Orange X */}
        <div style={{ ...s.icon, background: '#fff7ed' }}>
          <svg width="32" height="32" fill="none" stroke="#ea580c" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          </svg>
        </div>

        <h1 style={s.title}>Payment Cancelled</h1>
        <p style={s.subtitle}>
          No charge was made. You can go back and choose a plan whenever you're ready.
        </p>

        <div style={s.btnRow}>
          <button
            style={s.primaryBtn}
            onClick={() => navigate('/#pricing')}
            onMouseEnter={e => (e.currentTarget.style.background = '#0d9488')}
            onMouseLeave={e => (e.currentTarget.style.background = '#14b8a6')}
          >
            View Plans
          </button>
          <button
            style={s.secondaryBtn}
            onClick={() => navigate('/')}
            onMouseEnter={e => (e.currentTarget.style.background = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f1f5f9')}
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};
