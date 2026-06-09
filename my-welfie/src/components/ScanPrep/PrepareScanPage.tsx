import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobileLayout } from '../../hooks/useLayoutBreakpoint';
import PageContainer from '../../layout/PageContainer';
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
  const isMobile = useIsMobileLayout();

  return (
    <PageContainer variant="narrow">
      <h1 style={{ fontSize: isMobile ? 28 : 32, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
        {SCAN_PREP_TITLE}
      </h1>
      <p style={{ fontSize: 16, color: '#64748b', margin: '0 0 28px', lineHeight: 1.5 }}>
        {SCAN_PREP_SUBTITLE}
      </p>

      <section style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        padding: isMobile ? '18px 16px' : '22px 24px',
        marginBottom: 24,
      }}>
        <h2 style={{
          fontSize: 14, fontWeight: 700, color: TEAL_DARK, margin: '0 0 12px',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Quick checklist
        </h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#334155', fontSize: 15, lineHeight: 1.6 }}>
          {SCAN_PREP_QUICK_CHECKLIST.map((item) => (
            <li key={item} style={{ marginBottom: 8 }}>{item}</li>
          ))}
        </ul>
      </section>

      {SCAN_PREP_SECTIONS.map((section) => (
        <section
          key={section.id}
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: isMobile ? '18px 16px' : '22px 24px',
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
            {section.title}
          </h2>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#334155', fontSize: 14, lineHeight: 1.6 }}>
            {section.items.map((item) => (
              <li key={item} style={{ marginBottom: 8 }}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, margin: '24px 0 28px' }}>
        {SCAN_PREP_DISCLAIMER}
      </p>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12 }}>
        <button
          type="button"
          onClick={() => navigate('/camera')}
          style={{
            flex: 1,
            padding: '14px 20px',
            border: 'none',
            borderRadius: 12,
            background: TEAL,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          I&apos;m ready — start scan
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{
            flex: 1,
            padding: '14px 20px',
            border: '1.5px solid #e2e8f0',
            borderRadius: 12,
            background: '#fff',
            color: '#0f172a',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Back to dashboard
        </button>
      </div>
    </PageContainer>
  );
};

export default PrepareScanPage;
