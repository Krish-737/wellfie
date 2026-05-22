import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMediaPredicate } from 'react-media-hook';
import {
  SCAN_PREP_DISCLAIMER,
  SCAN_PREP_QUICK_CHECKLIST,
  SCAN_PREP_SECTIONS,
  SCAN_PREP_SUBTITLE,
  SCAN_PREP_TITLE,
} from '../../content/scanPrepGuide';

const TEAL = '#14b8a6';
const TEAL_DARK = '#0f766e';

const PrepareScanPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMediaPredicate('(max-width: 640px)');

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: isMobile ? '14px 16px' : '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', color: TEAL_DARK, fontSize: 14,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
          }}
        >
          ← Back
        </button>
        <Link
          to="/dashboard"
          style={{ fontSize: 14, fontWeight: 600, color: '#64748b', textDecoration: 'none' }}
        >
          Dashboard
        </Link>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: isMobile ? '24px 16px 48px' : '32px 24px 64px' }}>
        <h1 style={{ fontSize: isMobile ? 28 : 32, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
          {SCAN_PREP_TITLE}
        </h1>
        <p style={{ fontSize: 16, color: '#64748b', margin: '0 0 28px', lineHeight: 1.5 }}>
          {SCAN_PREP_SUBTITLE}
        </p>

        <section style={{
          background: '#ecfeff', border: '1px solid #99f6e4', borderRadius: 16,
          padding: isMobile ? '18px 16px' : '22px 24px', marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: TEAL_DARK, margin: '0 0 14px' }}>
            Quick checklist
          </h2>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#0f172a', fontSize: 14, lineHeight: 1.65 }}>
            {SCAN_PREP_QUICK_CHECKLIST.map((item) => (
              <li key={item} style={{ marginBottom: 8 }}>{item}</li>
            ))}
          </ul>
        </section>

        {SCAN_PREP_SECTIONS.map((section) => (
          <section
            key={section.id}
            style={{
              background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
              padding: isMobile ? '20px 16px' : '24px 28px', marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>
              {section.title}
            </h2>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 14, lineHeight: 1.65 }}>
              {section.items.map((item) => (
                <li key={item} style={{ marginBottom: 8 }}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <p style={{
          fontSize: 12, color: '#94a3b8', lineHeight: 1.6, margin: '24px 0 32px',
          borderTop: '1px solid #e2e8f0', paddingTop: 20,
        }}>
          {SCAN_PREP_DISCLAIMER}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate('/camera')}
            style={{
              background: TEAL, color: '#fff', border: 'none', borderRadius: 12,
              padding: '13px 22px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(20,184,166,0.35)',
            }}
          >
            I&apos;m ready — Start Scan
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#fff', color: '#0f172a', border: '1.5px solid #e2e8f0',
              borderRadius: 12, padding: '13px 22px', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
};

export default PrepareScanPage;
