import React from 'react';
import { useMediaPredicate } from 'react-media-hook';

const steps = [
  { num: '01', icon: 'shopping_cart', title: 'Purchase Scan Pack', desc: 'Select a plan that fits your health routine and unlock instant scanning credits.' },
  { num: '02', icon: 'face',          title: 'Position Your Face',  desc: 'Simply hold your device at eye level. Our AI guides you for perfect alignment.' },
  { num: '03', icon: 'query_stats',   title: 'AI Analyzes Vitals',  desc: 'Our engine detects sub-threshold blood flow changes using PPG technology.' },
  { num: '04', icon: 'receipt_long',  title: 'Get Your Results',    desc: 'Receive a detailed wellness report with actionable bio-optimization tips.' },
];

const HowItWorksSection_v2: React.FC = () => {
  const isMobile = useMediaPredicate('(max-width: 768px)');

  return (
    <section id="how-it-works" style={{ background: '#0b1c30', padding: isMobile ? '64px 20px' : '80px 64px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* Header row */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          marginBottom: 64,
          gap: 24,
        }}>
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#4edea3', textTransform: 'uppercase' as const }}>
              The Process
            </p>
            <h2 style={{ margin: 0, fontSize: isMobile ? 28 : 36, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
              Four Steps to Precision
            </h2>
          </div>
          <p style={{ maxWidth: 320, fontSize: 16, color: '#bbcabf', lineHeight: 1.6, margin: 0 }}>
            From initiation to insight in less than a minute. Our streamlined flow prioritizes your time.
          </p>
        </div>

        {/* Steps */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
          gap: isMobile ? 40 : 32,
        }}>
          {steps.map((step) => (
            <div key={step.num} style={{ position: 'relative', paddingTop: 48 }}
              onMouseEnter={e => {
                const icon = (e.currentTarget as HTMLDivElement).querySelector('.step-icon-wrap') as HTMLElement;
                if (icon) { icon.style.background = '#4edea3'; }
                const matIcon = (e.currentTarget as HTMLDivElement).querySelector('.step-mat-icon') as HTMLElement;
                if (matIcon) { matIcon.style.color = '#003824'; }
              }}
              onMouseLeave={e => {
                const icon = (e.currentTarget as HTMLDivElement).querySelector('.step-icon-wrap') as HTMLElement;
                if (icon) { icon.style.background = 'rgba(78,222,163,0.1)'; }
                const matIcon = (e.currentTarget as HTMLDivElement).querySelector('.step-mat-icon') as HTMLElement;
                if (matIcon) { matIcon.style.color = '#4edea3'; }
              }}
            >
              {/* Ghost number */}
              <div style={{
                position: 'absolute', top: -8, left: 0,
                fontSize: 64, fontWeight: 900,
                color: 'rgba(255,255,255,0.04)',
                lineHeight: 1,
                userSelect: 'none' as const,
                fontFamily: "'Manrope', sans-serif",
              }}>
                {step.num}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Icon box */}
                <div className="step-icon-wrap" style={{
                  width: 48, height: 48,
                  background: 'rgba(78,222,163,0.1)',
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.25s',
                }}>
                  <span className="material-symbols-outlined step-mat-icon" style={{ color: '#4edea3', fontSize: 24, transition: 'color 0.25s' }}>
                    {step.icon}
                  </span>
                </div>

                <h4 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#ffffff' }}>{step.title}</h4>
                <p style={{ margin: 0, fontSize: 16, color: '#bbcabf', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection_v2;
