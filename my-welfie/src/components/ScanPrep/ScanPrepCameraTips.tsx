import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SCAN_PREP_QUICK_CHECKLIST } from '../../content/scanPrepGuide';

const TEAL_DARK = '#0f766e';

const ScanPrepCameraTips: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      width: '100%', maxWidth: 420, borderRadius: 12, border: '1px solid #e2e8f0',
      background: '#f8fafc', overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
          Prepare for accurate results
        </span>
        <span style={{ color: '#94a3b8', fontSize: 14, transform: expanded ? 'rotate(180deg)' : 'none' }}>
          ▾
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 12px' }}>
          <ul style={{
            margin: '0 0 10px', paddingLeft: 18, color: '#64748b', fontSize: 12, lineHeight: 1.55,
          }}>
            {SCAN_PREP_QUICK_CHECKLIST.map((item) => (
              <li key={item} style={{ marginBottom: 6 }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ padding: expanded ? '0 14px 12px' : '0 14px 12px', marginTop: expanded ? 0 : -4 }}>
        <Link
          to="/prepare-scan"
          style={{ fontSize: 12, fontWeight: 600, color: TEAL_DARK, textDecoration: 'none' }}
        >
          View full preparation guide →
        </Link>
      </div>
    </div>
  );
};

export default ScanPrepCameraTips;
