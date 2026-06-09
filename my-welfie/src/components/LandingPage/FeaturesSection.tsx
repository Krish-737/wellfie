import React from 'react';
import { useMediaPredicate } from 'react-media-hook';

interface Feature {
  iconPath: string;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
}

const features: Feature[] = [
  {
    iconPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    iconBg: '#eff6ff',
    iconColor: '#3b82f6',
    title: 'Heart Health',
    desc: 'Monitor heart rate, HRV, and cardiovascular wellness',
  },
  {
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
    iconBg: '#f0fdfa',
    iconColor: '#14b8a6',
    title: 'Vital Signs',
    desc: 'Track blood pressure, oxygen levels, and respiratory rate',
  },
  {
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    iconBg: '#eef2ff',
    iconColor: '#6366f1',
    title: 'Stress & Wellness',
    desc: 'Measure stress levels and overall wellness score',
  },
  {
    iconPath: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
    iconBg: '#fff7ed',
    iconColor: '#f97316',
    title: 'Anytime, Anywhere',
    desc: 'No wearables needed - just your smartphone camera',
  },
];

const FeaturesSection: React.FC = () => {
  const isMobile = useMediaPredicate('(max-width: 640px)');
  const isTablet = useMediaPredicate('(max-width: 1024px)');

  const cols = isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';

  const s: Record<string, React.CSSProperties> = {
    section: {
      padding: isMobile ? '64px 16px' : '96px 24px',
      background: '#ffffff',
    },
    inner: {
      maxWidth: 1280,
      margin: '0 auto',
    },
    header: {
      textAlign: 'center',
      marginBottom: isMobile ? 40 : 64,
    },
    h2: {
      fontSize: isMobile ? 26 : 36,
      fontWeight: 700,
      color: '#0f172a',
      marginBottom: 16,
    },
    link: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      color: '#0d9488',
      fontWeight: 500,
      textDecoration: 'none',
      fontSize: 15,
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: cols,
      gap: isMobile ? 16 : 32,
    },
    card: {
      padding: isMobile ? 20 : 32,
      border: '1px solid #f1f5f9',
      borderRadius: 16,
      transition: 'box-shadow 0.3s',
      cursor: 'default',
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: '#0f172a',
      marginBottom: 10,
    },
    cardDesc: {
      color: '#64748b',
      lineHeight: 1.6,
      fontSize: 14,
    },
  };

  return (
    <section style={s.section}>
      <div style={s.inner}>
        <div style={s.header}>
          <h2 style={s.h2}>My Wellfie: Your Health, Simplified</h2>
          <a href="#" style={s.link}>
            Learn More About Health Indicators
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </a>
        </div>
        <div style={s.grid}>
          {features.map((f, i) => (
            <div
              key={i}
              style={s.card}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ ...s.iconWrap, background: f.iconBg }}>
                <svg width="24" height="24" fill="none" stroke={f.iconColor} viewBox="0 0 24 24">
                  <path d={f.iconPath} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <h3 style={s.cardTitle}>{f.title}</h3>
              <p style={s.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
