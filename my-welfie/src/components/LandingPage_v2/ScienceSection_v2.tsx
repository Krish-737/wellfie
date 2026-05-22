import React from 'react';
import { useMediaPredicate } from 'react-media-hook';

const SCIENCE_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA2wJOjr-iU84otyrG4yA5Q54ca8NuKFi-Z-K627EDbNhMloQwpaAy4ZGUMqekzvVFeiSNGFbyZaQTfYX6M1aT6ok97Kbo-8OebJOULFvcmscY-6-6OqIddOBVdVdMXBX4qA7ltn8b4XsndxCNQ-TRfZWekugmPS4QXAC4y7fgwkPJc92IALK_wVb23DsJdEnEbdTzt-wd7hxrdpCmFxIEw9ICQ0HwXo1r1oiMo3q3hln5lZnekFnFEQ4OJpL0fXb_t5KYzd7KsQElU';

const checks = [
  'Medical-grade signal processing',
  'Ambient light compensation algorithms',
  'Secure, encrypted on-device processing',
];

const ScienceSection_v2: React.FC = () => {
  const isMobile = useMediaPredicate('(max-width: 768px)');

  return (
    <section style={{ padding: isMobile ? '64px 20px' : '80px 64px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{
        background: 'rgba(30,41,59,0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(78,222,163,0.4)',
        boxShadow: 'inset 0 0 15px rgba(78,222,163,0.1)',
        borderRadius: 48,
        padding: isMobile ? 32 : 64,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 40 : 80,
        alignItems: 'center',
      }}>
        {/* Text side */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h2 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
            The Science of <span style={{ color: '#4edea3' }}>PPG</span>
          </h2>
          <p style={{ fontSize: 18, color: '#bbcabf', lineHeight: 1.6, margin: 0 }}>
            Photoplethysmography (PPG) is an optical technique that detects blood volume changes
            in the microvascular bed of tissue. MyWellfie leverages the high-resolution sensors
            in modern devices to capture these fluctuations from your face—providing
            clinical-grade accuracy without physical contact.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {checks.map(item => (
              <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#ffffff', fontSize: 16, fontWeight: 500 }}>
                <span className="material-symbols-outlined" style={{ color: '#4edea3', fontSize: 22, flexShrink: 0 }}>check_circle</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Video/image side */}
        <div style={{ flex: 1, width: '100%' }}>
          <div style={{
            position: 'relative',
            aspectRatio: '16/9',
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}>
            <img
              src={SCIENCE_IMG}
              alt="PPG Technology visualization"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Play overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(3,20,39,0.2)',
              backdropFilter: 'blur(2px)',
            }}>
              <div style={{
                width: 72, height: 72,
                borderRadius: '50%',
                background: 'rgba(78,222,163,0.2)',
                border: '1px solid rgba(78,222,163,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s, background 0.2s',
                animation: 'pulse-ring 2s ease-in-out infinite',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(78,222,163,0.35)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(78,222,163,0.2)'; }}
              >
                <span className="material-symbols-outlined" style={{ color: '#4edea3', fontSize: 40, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(78,222,163,0.3); }
          50% { box-shadow: 0 0 0 12px rgba(78,222,163,0); }
        }
      `}</style>
    </section>
  );
};

export default ScienceSection_v2;
