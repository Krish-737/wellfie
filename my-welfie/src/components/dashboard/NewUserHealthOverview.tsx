import React from 'react';
import { Video } from 'lucide-react';
import { colors, typography } from '../../style/tokens';

interface NewUserHealthOverviewProps {
  isMobile: boolean;
  isWelcome?: boolean;
  onStartScan?(): void;
  onBuyScans?(): void;
}

const NewUserHealthOverview: React.FC<NewUserHealthOverviewProps> = ({
  isMobile,
  isWelcome = false,
  onStartScan,
  onBuyScans,
}) => {
  const canScan = Boolean(onStartScan);

  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 14,
        padding: isMobile ? '22px 18px' : '28px 26px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
        fontFamily: typography.fontFamily,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -32,
          right: -32,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20, 184, 166, 0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <p style={{ margin: '0 0 8px', ...typography.eyebrow }}>
        Get started
      </p>

      <h3
        style={{
          margin: '0 0 10px',
          fontSize: isMobile ? 24 : 28,
          ...typography.headline,
        }}
      >
        {isWelcome ? 'Welcome to MyWellfie' : 'Your first scan is ready'}
      </h3>

      <p
        style={{
          margin: '0 0 8px',
          fontSize: isMobile ? 14 : 15,
          lineHeight: 1.55,
          maxWidth: 440,
          ...typography.body,
        }}
      >
        Get a clinical-grade biometric assessment in under 60 seconds — heart rate, HRV, stress, and more.
      </p>

      {isWelcome && (
        <p
          style={{
            margin: '0 0 20px',
            fontSize: 13,
            lineHeight: 1.5,
            color: colors.tealDark,
            fontWeight: 600,
            fontFamily: typography.fontFamily,
          }}
        >
          Your first scan is on us. Open the Guide tab to prepare, then start below.
        </p>
      )}

      {!isWelcome && <div style={{ marginBottom: 20 }} />}

      {canScan ? (
        <button
          type="button"
          onClick={onStartScan}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: colors.tealDark,
            color: '#ffffff',
            border: 'none',
            borderRadius: 12,
            padding: isMobile ? '14px 18px' : '15px 20px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: typography.fontFamily,
            boxShadow: '0 4px 14px rgba(13, 148, 136, 0.25)',
          }}
        >
          <Video size={18} strokeWidth={2.2} />
          Start Your First Scan
        </button>
      ) : (
        <button
          type="button"
          onClick={onBuyScans}
          style={{
            width: '100%',
            background: '#0f172a',
            color: '#ffffff',
            border: 'none',
            borderRadius: 12,
            padding: isMobile ? '14px 18px' : '15px 20px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: typography.fontFamily,
          }}
        >
          Buy Scan Pack
        </button>
      )}

      {canScan && (
        <p
          style={{
            margin: '14px 0 0',
            fontSize: 12,
            color: '#94a3b8',
            textAlign: 'center',
            fontFamily: typography.fontFamily,
          }}
        >
          Tip: Open the Guide tab to prepare for your scan.
        </p>
      )}
    </section>
  );
};

export default NewUserHealthOverview;
