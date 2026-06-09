import React from 'react';
import { useMediaPredicate } from 'react-media-hook';

const BG_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAdxsPukzYRKfqCqK6qSNJ1tqMERxVwsW5YXdIIBZ8ka0-fLHnfog2cujVS8LMrfCwICq32ugfysN8M4vrzCnt2RNinBIJBC_25GlbkosM7AFTU08OkrnSfmmO2FN5v1gfqR3m0w64znuthuh-1fZz-p7-7tEh1i2LboXxIUGLYFcP8-8zI0icjZrjJ-hOdwVZ9kUkcApvEL5m4_WhK-9bBmaycX-SAcpTUDwnJhMqorvqB1oRR6rjTyCdlNCN07lUCCDQ0M2gSx0tu';

const glass: React.CSSProperties = {
  background: 'rgba(30,41,59,0.7)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const FeaturesSection_v2: React.FC = () => {
  const isMobile = useMediaPredicate('(max-width: 768px)');

  return (
    <section style={{ padding: isMobile ? '64px 20px' : '80px 64px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <h2 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 700, color: '#ffffff', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
          Advanced Wellness Diagnostics
        </h2>
        <p style={{ fontSize: 16, color: '#bbcabf', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
          Comprehensive health monitoring powered by proprietary AI models trained on millions of clinical data points.
        </p>
      </div>

      {/* Bento grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)', gap: 24 }}>

        {/* Heart Health — 8 cols */}
        <div style={{
          ...glass,
          gridColumn: isMobile ? '1' : 'span 8',
          borderRadius: 32,
          padding: isMobile ? 28 : 40,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 220,
          cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
          onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(78,222,163,0.3)')}
          onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)')}
        >
          <div>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#4edea3', display: 'block', marginBottom: 16 }}>favorite</span>
            <h3 style={{ fontSize: 22, fontWeight: 600, color: '#ffffff', margin: '0 0 12px' }}>Comprehensive Heart Health</h3>
            <p style={{ fontSize: 16, color: '#bbcabf', maxWidth: 480, lineHeight: 1.6, margin: 0 }}>
              Real-time Heart Rate Variability (HRV) and BPM analysis to monitor cardiac stress levels and recovery patterns.
            </p>
          </div>
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['BPM', 'HRV'].map(tag => (
                <span key={tag} style={{ padding: '3px 12px', background: 'rgba(78,222,163,0.15)', color: '#4edea3', fontSize: 12, fontWeight: 700, borderRadius: 9999 }}>{tag}</span>
              ))}
            </div>
            <span className="material-symbols-outlined" style={{ color: '#bbcabf', fontSize: 24 }}>arrow_forward</span>
          </div>
        </div>

        {/* Vital Signs — 4 cols */}
        <div style={{ ...glass, gridColumn: isMobile ? '1' : 'span 4', borderRadius: 32, padding: isMobile ? 28 : 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#b4c5ff', display: 'block' }}>respiratory_rate</span>
          <h3 style={{ fontSize: 22, fontWeight: 600, color: '#ffffff', margin: 0 }}>Vital Signs</h3>
          <p style={{ fontSize: 16, color: '#bbcabf', lineHeight: 1.6, margin: 0 }}>
            Instant oxygen saturation (SpO2) and respiration rate monitoring without wearable devices.
          </p>
        </div>

        {/* Stress Indices — 4 cols */}
        <div style={{ ...glass, gridColumn: isMobile ? '1' : 'span 4', borderRadius: 32, padding: isMobile ? 28 : 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#4edea3', display: 'block' }}>psychology</span>
          <h3 style={{ fontSize: 22, fontWeight: 600, color: '#ffffff', margin: 0 }}>Stress Indices</h3>
          <p style={{ fontSize: 16, color: '#bbcabf', lineHeight: 1.6, margin: 0 }}>
            Quantify your nervous system balance to optimize daily performance and mental clarity.
          </p>
        </div>

        {/* Anytime Anywhere — 8 cols */}
        <div style={{
          ...glass,
          gridColumn: isMobile ? '1' : 'span 8',
          borderRadius: 32,
          padding: isMobile ? 28 : 40,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: 32,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background image at low opacity */}
          <img
            src={BG_IMG}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, pointerEvents: 'none' }}
          />
          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <h3 style={{ fontSize: 22, fontWeight: 600, color: '#ffffff', margin: '0 0 12px' }}>Anytime, Anywhere</h3>
            <p style={{ fontSize: 16, color: '#bbcabf', lineHeight: 1.6, margin: 0 }}>
              No hardware. No friction. Just you and your smartphone. Health monitoring that fits your lifestyle, whether in the office or on the go.
            </p>
          </div>
          <div style={{ flex: isMobile ? 'none' : 1, display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 160, height: 160, borderRadius: '50%',
              border: '4px solid rgba(78,222,163,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 25px -5px rgba(78,222,163,0.3)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 64, color: '#4edea3', fontVariationSettings: "'FILL' 1" }}>language</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection_v2;
