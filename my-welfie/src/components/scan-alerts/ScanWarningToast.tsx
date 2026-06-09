import React from 'react';
import { ResolvedAlert } from '../../alerts/alertTypes';
import AlertSupportCode from './AlertSupportCode';

interface ScanWarningToastProps {
  alert: ResolvedAlert;
  onAction: (type: ResolvedAlert['actions'][0]['type']) => void;
}

const ScanWarningToast: React.FC<ScanWarningToastProps> = ({ alert, onAction }) => (
  <div style={{
    position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5,
    background: 'rgba(15, 23, 42, 0.92)', color: '#fff',
    padding: '14px 16px 12px', boxSizing: 'border-box',
  }}>
    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{alert.title}</div>
    <div style={{ fontSize: 13, lineHeight: 1.45, color: '#cbd5e1', marginBottom: 8 }}>
      {alert.message}
    </div>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      {alert.actions.map((action) => (
        <button
          key={action.type}
          type="button"
          onClick={() => onAction(action.type)}
          style={{
            background: action.type === 'dismiss' ? 'transparent' : 'rgba(20, 184, 166, 0.25)',
            border: action.type === 'dismiss' ? 'none' : '1px solid rgba(20, 184, 166, 0.5)',
            color: action.type === 'dismiss' ? '#94a3b8' : '#5eead4',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 10px',
            borderRadius: 6, fontFamily: 'inherit',
          }}
        >
          {action.label}
        </button>
      ))}
      <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>
        Ref. {alert.code}
      </span>
    </div>
  </div>
);

export default ScanWarningToast;
