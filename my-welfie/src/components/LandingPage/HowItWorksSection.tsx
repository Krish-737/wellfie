import React from 'react';
import { useMediaPredicate } from 'react-media-hook';
import step1Img from '../../assets/step1.png';
import step2Img from '../../assets/step2.png';
import step3Img from '../../assets/step3.png';
import step4Img from '../../assets/step4.png';

const STEP_IMAGES = [step1Img, step2Img, step3Img, step4Img];

const steps = [
  { num: 1, title: 'Purchase a Scan Pack', desc: 'Choose the pack that fits your wellness journey' },
  { num: 2, title: 'Position Your Face', desc: 'Use your phone camera in a well-lit environment' },
  { num: 3, title: 'AI Analyzes Your Vitals', desc: 'Our advanced PPG technology reads your biometrics' },
  { num: 4, title: 'Get Your Results', desc: 'View detailed insights and track your health over time' },
];

const HowItWorksSection: React.FC = () => {
  const isMobile = useMediaPredicate('(max-width: 640px)');
  const isTablet = useMediaPredicate('(max-width: 1024px)');

  const cols = isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';

  const s: Record<string, React.CSSProperties> = {
    section: {
      padding: isMobile ? '64px 16px' : '96px 24px',
      background: '#f8fafc',
    },
    inner: {
      maxWidth: 1280,
      margin: '0 auto',
    },
    h2: {
      fontSize: isMobile ? 26 : 36,
      fontWeight: 700,
      color: '#0f172a',
      textAlign: 'center',
      marginBottom: isMobile ? 40 : 80,
    },
    relative: {
      position: 'relative',
    },
    // Connector line — only shown on full desktop (4 cols)
    connectorLine: {
      position: 'absolute',
      top: 24,
      left: 0,
      right: 0,
      height: 2,
      background: '#e2e8f0',
      zIndex: 0,
      display: isTablet ? 'none' : 'block',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: cols,
      gap: isMobile ? 40 : 48,
      position: 'relative',
      zIndex: 1,
    },
    stepCol: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 16,
    },
    stepDot: {
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: '#14b8a6',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: 18,
      marginBottom: isMobile ? 0 : 24,
      boxShadow: '0 4px 14px rgba(20,184,166,0.4)',
      zIndex: 10,
      flexShrink: 0,
    },
    stepTitle: {
      fontSize: isMobile ? 16 : 20,
      fontWeight: 700,
      color: '#0f172a',
      marginBottom: 6,
    },
    stepDesc: {
      color: '#64748b',
      fontSize: 14,
      marginBottom: isMobile ? 0 : 24,
      lineHeight: 1.55,
    },
    phoneFrame: {
      width: '100%',
      maxWidth: isMobile ? 140 : 180,
      border: '4px solid #e2e8f0',
      borderRadius: 20,
      overflow: 'hidden',
      aspectRatio: '9/16',
      background: '#f1f5f9',
      flexShrink: 0,
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    },
    phoneImg: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: 'top center',
      display: 'block',
    },
  };

  return (
    <section style={s.section}>
      <div style={s.inner}>
        <h2 style={s.h2}>How It Works</h2>
        <div style={s.relative}>
          <div style={s.connectorLine} />
          <div style={s.grid}>
            {steps.map((step, i) => (
              <div key={i} style={s.stepCol}>
                {/* Phone image at the top */}
                <div style={s.phoneFrame}>
                  <img src={STEP_IMAGES[i]} alt={`Step ${step.num}: ${step.title}`} style={s.phoneImg} />
                </div>
                {/* Step number + copy below */}
                <div style={s.stepDot}>{step.num}</div>
                <div>
                  <h3 style={s.stepTitle}>{step.title}</h3>
                  <p style={s.stepDesc}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
