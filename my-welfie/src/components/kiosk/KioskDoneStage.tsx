// src/components/kiosk/KioskDoneStage.tsx
import React from 'react';

interface KioskDoneStageProps {
  onReset: () => void;
}

const KioskDoneStage: React.FC<KioskDoneStageProps> = ({ onReset }) => {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #020c1b 0%, #041e3a 60%, #031427 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 40, textAlign: 'center',
    }}>
      <div style={{ fontSize: 80, marginBottom: 24 }}>🎉</div>
      <h1 style={{ color: '#fff', fontSize: 34, fontWeight: 800, margin: '0 0 12px' }}>Thank you!</h1>
      <p style={{ color: '#94a3b8', fontSize: 16, margin: '0 0 36px', lineHeight: 1.7 }}>
        Your health report is on its way to your inbox.<br />
        This screen resets automatically in a few seconds.
      </p>
      <button
        onClick={onReset}
        style={{
          padding: '14px 40px', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.08)', color: '#fff',
          fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >Reset Now</button>
    </div>
  );
};

export default KioskDoneStage;
