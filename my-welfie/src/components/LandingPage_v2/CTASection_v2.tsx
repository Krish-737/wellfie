import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaPredicate } from 'react-media-hook';
import { useAuth } from '../../context/AuthContext';

const CTASection_v2: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const isMobile = useMediaPredicate('(max-width: 640px)');

  const handleClick = () => navigate(token ? '/camera' : '/login');

  return (
    <section style={{ padding: isMobile ? '48px 20px 80px' : '64px 64px 96px' }}>
      <div style={{
        maxWidth: 896,
        margin: '0 auto',
        background: 'linear-gradient(to top, rgba(78,222,163,0.1), transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(78,222,163,0.2)',
        borderRadius: 48,
        padding: isMobile ? '48px 28px' : '64px 80px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}>
        <h2 style={{
          fontSize: isMobile ? 32 : 52,
          fontWeight: 800,
          color: '#ffffff',
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}>
          Ready for your first scan?
        </h2>
        <p style={{
          fontSize: isMobile ? 16 : 18,
          color: '#bbcabf',
          lineHeight: 1.6,
          maxWidth: 560,
          margin: 0,
        }}>
          Join thousands of high-performers who trust MyWellfie for their daily wellness monitoring.
        </p>
        <div style={{ paddingTop: 8 }}>
          <button
            onClick={handleClick}
            style={{
              background: '#4edea3',
              color: '#003824',
              border: 'none',
              borderRadius: 16,
              padding: isMobile ? '16px 36px' : '20px 56px',
              fontSize: isMobile ? 18 : 22,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 25px -5px rgba(78,222,163,0.4)',
              transition: 'transform 0.2s, opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Get Started Instantly
          </button>
        </div>
      </div>
    </section>
  );
};

export default CTASection_v2;
