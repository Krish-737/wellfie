import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaPredicate } from 'react-media-hook';
import { useAuth } from '../../context/AuthContext';
import womanImg from '../../assets/50a9a4d05_Womanselfie.jpg';
import manImg from '../../assets/83148efc6_Manselfie.jpg';

const HERO_IMAGES = [womanImg, manImg];
const SLIDE_INTERVAL = 4000;

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const isMobile = useMediaPredicate('(max-width: 640px)');
  const isTablet = useMediaPredicate('(max-width: 1024px)');

  const [activeIdx, setActiveIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActiveIdx(prev => (prev + 1) % HERO_IMAGES.length);
        setFading(false);
      }, 600);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const handleGetStarted = () => {
    navigate(token ? '/dashboard' : '/login');
  };

  const s: Record<string, React.CSSProperties> = {
    section: {
      position: 'relative',
      paddingTop: isMobile ? 48 : 80,
      paddingBottom: isMobile ? 64 : 128,
      overflow: 'hidden',
      background: '#ffffff',
    },
    inner: {
      maxWidth: 1280,
      margin: '0 auto',
      padding: '0 16px',
    },
    flex: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
    },
    imageWrap: {
      position: 'relative',
      width: '100%',
      maxWidth: isMobile ? 320 : 512,
      marginBottom: isMobile ? 32 : 48,
    },
    imageInner: {
      position: 'relative',
      zIndex: 10,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
    },
    heroImg: {
      width: '100%',
      height: isMobile ? 320 : 480,
      objectFit: 'cover',
      objectPosition: 'top center',
      display: 'block',
      transition: 'opacity 0.6s ease-in-out',
      opacity: fading ? 0 : 1,
    },
    blob1: {
      position: 'absolute',
      top: -40,
      right: -40,
      width: 256,
      height: 256,
      borderRadius: '50%',
      background: '#f0fdfa',
      filter: 'blur(40px)',
      opacity: 0.7,
      mixBlendMode: 'multiply',
    },
    blob2: {
      position: 'absolute',
      bottom: -40,
      left: -40,
      width: 256,
      height: 256,
      borderRadius: '50%',
      background: '#eff6ff',
      filter: 'blur(40px)',
      opacity: 0.7,
      mixBlendMode: 'multiply',
    },
    h1: {
      fontSize: isMobile ? 32 : isTablet ? 44 : 56,
      fontWeight: 800,
      color: '#0f172a',
      letterSpacing: '-1px',
      marginBottom: isMobile ? 16 : 24,
      lineHeight: 1.1,
    },
    subtitle: {
      maxWidth: 672,
      fontSize: isMobile ? 16 : 20,
      color: '#64748b',
      marginBottom: isMobile ? 28 : 40,
      lineHeight: 1.6,
    },
    btnRow: {
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap' as const,
      justifyContent: 'center',
    },
    primaryBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '13px 24px' : '16px 32px',
      fontSize: isMobile ? 15 : 16,
      fontWeight: 600,
      color: '#ffffff',
      background: '#14b8a6',
      border: 'none',
      borderRadius: 10,
      cursor: 'pointer',
      transition: 'background 0.2s',
    },
    secondaryBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '13px 24px' : '16px 32px',
      fontSize: isMobile ? 15 : 16,
      fontWeight: 600,
      color: '#334155',
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
      transition: 'background 0.2s',
    },
  };

  return (
    <header style={s.section}>
      <div style={s.inner}>
        <div style={s.flex}>
          <div style={s.imageWrap}>
            <div style={s.imageInner}>
              <img
                src={HERO_IMAGES[activeIdx]}
                alt="User scanning vitals with MyWellfie"
                style={s.heroImg}
              />
              {/* Dot indicators */}
              <div style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 6, zIndex: 20,
              }}>
                {HERO_IMAGES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setFading(true); setTimeout(() => { setActiveIdx(i); setFading(false); }, 600); }}
                    style={{
                      width: i === activeIdx ? 20 : 8,
                      height: 8,
                      borderRadius: 4,
                      background: i === activeIdx ? '#14b8a6' : 'rgba(255,255,255,0.5)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'width 0.3s, background 0.3s',
                    }}
                    aria-label={`Show image ${i + 1}`}
                  />
                ))}
              </div>
            </div>
            <div style={s.blob1} />
            <div style={s.blob2} />
          </div>

          <h1 style={s.h1}>My Wellfie: Smart Health Scans</h1>
          <p style={s.subtitle}>
            Wellfie monitors your vital signs using just your smartphone camera. No wearables,
            no hassle - just science-backed health tracking with My Wellfie.
          </p>

          <div style={s.btnRow}>
            <button
              style={s.primaryBtn}
              onClick={handleGetStarted}
              onMouseEnter={e => (e.currentTarget.style.background = '#0d9488')}
              onMouseLeave={e => (e.currentTarget.style.background = '#14b8a6')}
            >
              Get Started&nbsp;
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
            <button
              style={s.secondaryBtn}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
            >
              Learn More
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
