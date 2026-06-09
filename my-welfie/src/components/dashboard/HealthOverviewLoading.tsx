import React from 'react';

interface HealthOverviewLoadingProps {
  isMobile: boolean;
}

const pulse: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
  backgroundSize: '200% 100%',
  animation: 'healthOverviewShimmer 1.4s ease infinite',
  borderRadius: 8,
};

const HealthOverviewLoading: React.FC<HealthOverviewLoadingProps> = ({ isMobile }) => (
  <>
    <style>
      {`
        @keyframes healthOverviewShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}
    </style>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          borderRadius: 14,
          padding: isMobile ? '18px 16px' : '22px 22px',
          border: '1px solid #e2e8f0',
          background: '#fff',
        }}
      >
        <div style={{ ...pulse, width: 140, height: 12, marginBottom: 12 }} />
        <div style={{ ...pulse, width: isMobile ? '70%' : 220, height: 28, marginBottom: 10 }} />
        <div style={{ ...pulse, width: '90%', maxWidth: 360, height: 14, marginBottom: 16 }} />
        <div style={{ ...pulse, width: 130, height: 28, borderRadius: 999 }} />
      </div>
      <div
        style={{
          borderRadius: 16,
          padding: isMobile ? '20px 16px' : '24px 20px',
          border: '1px solid #e2e8f0',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ ...pulse, width: 160, height: 12, marginBottom: 20 }} />
        <div style={{ ...pulse, width: isMobile ? 168 : 184, height: isMobile ? 168 : 184, borderRadius: '50%' }} />
        <div style={{ ...pulse, width: '100%', height: 48, marginTop: 22, borderRadius: 12 }} />
      </div>
    </div>
  </>
);

export default HealthOverviewLoading;
