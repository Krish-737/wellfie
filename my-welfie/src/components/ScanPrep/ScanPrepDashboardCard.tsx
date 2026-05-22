import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SCAN_PREP_QUICK_CHECKLIST, SCAN_PREP_TITLE } from '../../content/scanPrepGuide';

const TEAL = '#14b8a6';
const TEAL_DARK = '#0f766e';

interface ScanPrepDashboardCardProps {
  defaultExpanded?: boolean;
}

const ScanPrepDashboardCard: React.FC<ScanPrepDashboardCardProps> = ({
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div style={{
      background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      marginBottom: 20, overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 10, background: '#f0fdfa',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            ✓
          </span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{SCAN_PREP_TITLE}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              Get accurate results with a quick setup checklist
            </div>
          </div>
        </div>
        <span style={{ color: '#94a3b8', fontSize: 18, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          ▾
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f1f5f9' }}>
          <ul style={{
            margin: '16px 0', paddingLeft: 20, color: '#475569', fontSize: 14, lineHeight: 1.6,
          }}>
            {SCAN_PREP_QUICK_CHECKLIST.map((item) => (
              <li key={item} style={{ marginBottom: 8 }}>{item}</li>
            ))}
          </ul>
          <Link
            to="/prepare-scan"
            style={{
              display: 'inline-block', fontSize: 14, fontWeight: 600, color: TEAL_DARK,
              textDecoration: 'none',
            }}
          >
            View full preparation guide →
          </Link>
        </div>
      )}

      {!expanded && (
        <div style={{ padding: '0 20px 16px' }}>
          <Link
            to="/prepare-scan"
            style={{ fontSize: 13, fontWeight: 600, color: TEAL, textDecoration: 'none' }}
          >
            View preparation guide →
          </Link>
        </div>
      )}
    </div>
  );
};

export default ScanPrepDashboardCard;
