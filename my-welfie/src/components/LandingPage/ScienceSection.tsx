import React from 'react';
import { useMediaPredicate } from 'react-media-hook';

const ScienceSection: React.FC = () => {
  const isMobile = useMediaPredicate('(max-width: 640px)');

  const s: Record<string, React.CSSProperties> = {
    section: { padding: isMobile ? '64px 16px' : '96px 24px', background: '#ffffff' },
    inner:   { maxWidth: 960, margin: '0 auto' },
    header:  { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: isMobile ? 40 : 64 },
    iconBox: { width: 64, height: 64, background: '#ccfbf1', color: '#0d9488', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    h2:      { fontSize: isMobile ? 26 : 36, fontWeight: 700, color: '#0f172a', marginBottom: 16, textAlign: 'center' },
    subtitle:{ color: '#64748b', textAlign: 'center', fontSize: 15 },
    card:    { background: '#ffffff', border: '1px solid #f1f5f9', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', borderRadius: 24, padding: isMobile ? '28px 20px' : '48px' },
    space:   { display: 'flex', flexDirection: 'column', gap: 40 },
    blockTitle: { display: 'flex', alignItems: 'center', fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#0f172a', marginBottom: 12, gap: 8 },
    blockText:  { color: '#475569', lineHeight: 1.7, fontSize: 15 },
    statsGrid:  { display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? 16 : 32, paddingTop: 32, borderTop: '1px solid #f1f5f9' },
    stat:       { textAlign: 'center' },
    statValue:  { fontSize: isMobile ? 28 : 40, fontWeight: 700, color: '#14b8a6', marginBottom: 4, lineHeight: 1 },
    statLabel:  { fontSize: 11, fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' },
  };

  return (
    <section style={s.section}>
      <div style={s.inner}>
        <div style={s.header}>
          <div style={s.iconBox}>
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
          <h2 style={s.h2}>The Science: PPG Technology</h2>
          <p style={s.subtitle}>
            Powered by Photoplethysmography (PPG) - Medical-grade technology in your pocket
          </p>
        </div>

        <div style={s.card}>
          <div style={s.space}>
            <div>
              <h4 style={s.blockTitle}>
                <svg width="24" height="24" fill="none" stroke="#14b8a6" viewBox="0 0 24 24">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                What is PPG?
              </h4>
              <p style={s.blockText}>
                Photoplethysmography (PPG) is a clinically validated, non-invasive optical technique that
                detects blood volume changes in the microvascular bed of tissue. When light from your
                smartphone camera illuminates your skin, it's partially absorbed by blood vessels. By
                analyzing these subtle changes in light absorption, our AI can extract vital health metrics.
              </p>
            </div>

            <div>
              <h4 style={s.blockTitle}>
                <svg width="24" height="24" fill="none" stroke="#14b8a6" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                Clinically Validated
              </h4>
              <p style={s.blockText}>
                PPG technology has been used in medical devices for decades and is the same principle used
                in hospital pulse oximeters. My Wellfie leverages advanced computer vision and AI algorithms
                to deliver accurate health measurements from your smartphone - no additional hardware
                required. Wellfie makes professional health monitoring accessible to everyone.
              </p>
            </div>

            <div style={s.statsGrid}>
              <div style={s.stat}>
                <div style={s.statValue}>98%+</div>
                <div style={s.statLabel}>Accuracy Rate</div>
              </div>
              <div style={s.stat}>
                <div style={s.statValue}>60 sec</div>
                <div style={s.statLabel}>Scan Duration</div>
              </div>
              <div style={s.stat}>
                <div style={s.statValue}>10+</div>
                <div style={s.statLabel}>Health Metrics</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScienceSection;
