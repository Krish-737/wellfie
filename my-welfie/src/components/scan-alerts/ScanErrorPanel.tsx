import React from 'react';
import { ResolvedAlert } from '../../alerts/alertTypes';
import AlertSupportCode from './AlertSupportCode';

interface ScanErrorPanelProps {
  alert: ResolvedAlert;
  onAction: (type: ResolvedAlert['actions'][0]['type']) => void;
}

const ScanErrorPanel: React.FC<ScanErrorPanelProps> = ({ alert, onAction }) => (
  <div style={{
    width: '100%', maxWidth: 440, padding: '18px 20px', borderRadius: 14,
    background: '#fef2f2', border: '1px solid #fecaca', boxSizing: 'border-box',
  }}>
    <div style={{ fontSize: 16, fontWeight: 800, color: '#991b1b', marginBottom: 8 }}>
      {alert.title}
    </div>
    <p style={{ fontSize: 14, color: '#7f1d1d', lineHeight: 1.55, margin: '0 0 16px' }}>
      {alert.message}
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {alert.actions.map((action, idx) => (
        <button
          key={action.type}
          type="button"
          onClick={() => onAction(action.type)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: idx === 0 ? 700 : 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            border: idx === 0 ? 'none' : '1.5px solid #e2e8f0',
            background: idx === 0 ? '#14b8a6' : '#ffffff',
            color: idx === 0 ? '#ffffff' : '#0f172a',
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
    <AlertSupportCode code={alert.code} />
    <p style={{ fontSize: 11, color: '#94a3b8', margin: '10px 0 0', lineHeight: 1.4 }}>
      Results are wellness indicators, not a medical diagnosis.
    </p>
  </div>
);

export default ScanErrorPanel;
