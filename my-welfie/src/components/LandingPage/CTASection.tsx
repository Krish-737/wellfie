import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaPredicate } from 'react-media-hook';
import { useAuth } from '../../context/AuthContext';

const CTASection: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const isMobile = useMediaPredicate('(max-width: 640px)');

  const s: Record<string, React.CSSProperties> = {
    section: { padding: isMobile ? '64px 16px' : '96px 24px', background: '#ffffff' },
    inner:   { maxWidth: 896, margin: '0 auto', textAlign: 'center' },
    h2:      { fontSize: isMobile ? 26 : 36, fontWeight: 700, color: '#0f172a', marginBottom: 20 },
    subtitle:{ color: '#64748b', fontSize: isMobile ? 16 : 18, marginBottom: 36, lineHeight: 1.6 },
    btn:     { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '14px 28px' : '20px 40px', fontSize: isMobile ? 16 : 18, fontWeight: 700, color: '#ffffff', background: '#14b8a6', border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '0 10px 25px rgba(20,184,166,0.25)', transition: 'background 0.2s, transform 0.2s', gap: 8 },
  };

  const handleClick = () => navigate(token ? '/dashboard' : '/login');

  return (
    <section style={s.section}>
      <div style={s.inner}>
        <h2 style={s.h2}>Ready to Take Control of Your Health?</h2>
        <p style={s.subtitle}>
          Join thousands of users monitoring their wellness with My Wellfie - your personal health companion
        </p>
        <button
          style={s.btn}
          onClick={handleClick}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#0d9488';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#14b8a6';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Start Your Journey&nbsp;
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </button>
      </div>
    </section>
  );
};

export default CTASection;
