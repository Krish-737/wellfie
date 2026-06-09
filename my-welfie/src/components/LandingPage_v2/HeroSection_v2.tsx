import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaPredicate } from 'react-media-hook';
import { useAuth } from '../../context/AuthContext';

const HERO_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA6r8VO_UrWFrEpVT4MPQiNJWOybio37_riTqoHYLaugE-znAUlMuGt3R-knHAojn7dtRsA2P9FhbNEws3G1TW2qrAKUwP0iRWWk6q3dBTsGm5qje6SGhBVJ_QK6zFYTKhp9MDPK-FUcKeuDOuXsrX3PFRr1H2KsCg7gLomxvRiLvRp1LDxpqROiXlJfFdhB8MZjp_atIp2Vr5bz8KvNi91WqFyS9I8pVdi1NPgno_rO1OveMHSclIFoiEp4lElfrsidzm6y355';

const HeroSection_v2: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const isMobile = useMediaPredicate('(max-width: 768px)');

  const handleGetStarted = () => navigate(token ? '/camera' : '/login');

  return (
    <section style={{
      position: 'relative',
      minHeight: isMobile ? 'auto' : '90vh',
      display: 'flex',
      alignItems: 'center',
      padding: isMobile ? '48px 20px 64px' : '80px 64px',
      overflow: 'hidden',
    }}>
      {/* Background glow blobs */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 500, height: 500, borderRadius: '50%', background: 'rgba(78,222,163,0.08)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(180,197,255,0.06)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? 48 : 64,
        alignItems: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Left — copy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px',
            background: 'rgba(78,222,163,0.1)',
            border: '1px solid rgba(78,222,163,0.2)',
            borderRadius: 9999,
            width: 'fit-content',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4edea3', fontVariationSettings: "'FILL' 1" }}>verified</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#4edea3', textTransform: 'uppercase' as const }}>
              Clinical Grade AI Vital Analysis
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: isMobile ? 36 : 56,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            margin: 0,
          }}>
            The Future of Health{' '}
            <br />
            <span style={{ color: '#4edea3' }}>Starts with a Glance.</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: isMobile ? 16 : 18,
            lineHeight: 1.6,
            color: '#bbcabf',
            maxWidth: 520,
            margin: 0,
          }}>
            MyWellfie transforms your smartphone into a high-precision medical scanner.
            Using advanced face-scanning technology, measure your vitals in 30 seconds
            with surgical accuracy.
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, paddingTop: 8 }}>
            <button
              onClick={handleGetStarted}
              style={{
                background: '#4edea3', color: '#003824',
                border: 'none', borderRadius: 12,
                padding: '16px 40px',
                fontSize: 18, fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 25px -5px rgba(78,222,163,0.4)',
                transition: 'transform 0.2s, opacity 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Start Your First Scan
            </button>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: 'rgba(30,41,59,0.7)',
                backdropFilter: 'blur(16px)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: '16px 40px',
                fontSize: 18, fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(30,41,59,0.7)')}
            >
              View Technology
            </button>
          </div>
        </div>

        {/* Right — scan visualization card */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 256, height: 256, borderRadius: '50%', background: 'rgba(78,222,163,0.2)', filter: 'blur(100px)', pointerEvents: 'none' }} />
          <div style={{
            background: 'rgba(30,41,59,0.7)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(78,222,163,0.4)',
            boxShadow: 'inset 0 0 15px rgba(78,222,163,0.1)',
            borderRadius: 40,
            padding: 16,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <img
              src={HERO_IMG}
              alt="AI Face Scan Visualization"
              style={{ width: '100%', height: isMobile ? 320 : 480, objectFit: 'cover', borderRadius: 24, display: 'block' }}
            />

            {/* Gradient overlay */}
            <div style={{
              position: 'absolute', bottom: 0, left: 16, right: 16,
              height: '50%',
              background: 'linear-gradient(to top, rgba(3,20,39,0.85), transparent)',
              borderRadius: '0 0 24px 24px',
              pointerEvents: 'none',
            }} />

            {/* Live Analysis badge */}
            <div style={{
              position: 'absolute', bottom: 28, left: 28, right: 28,
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#4edea3', textTransform: 'uppercase' as const }}>Live Analysis</p>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 600, color: '#ffffff' }}>Analyzing Blood Flow...</p>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                {[32, 48, 24].map((h, i) => (
                  <div key={i} style={{
                    width: 8, height: h, background: '#4edea3', borderRadius: 4,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </section>
  );
};

export default HeroSection_v2;
