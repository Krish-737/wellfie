import React, { useMemo } from 'react';
import type { ScanResult } from '../../content/scanIndicators';
import { formatScanHeadline } from '../../utils/formatScanTime';
import { getScanAnalysisStatus } from '../../utils/scanAnalysisStatus';
import { typography } from '../../style/tokens';

interface LatestScanAnalysisCardProps {
  scan: ScanResult;
  isMobile: boolean;
}

const LatestScanAnalysisCard: React.FC<LatestScanAnalysisCardProps> = ({ scan, isMobile }) => {
  const status = useMemo(() => getScanAnalysisStatus(scan), [scan]);
  const headline = formatScanHeadline(scan.scanned_at);

  return (
    <section
      style={{
        borderRadius: 14,
        padding: isMobile ? '18px 16px' : '22px 22px',
        marginBottom: 16,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
        fontFamily: typography.fontFamily,
      }}
    >
      <p style={{ margin: '0 0 8px', ...typography.eyebrow }}>
        Latest scan analysis
      </p>

      <h3
        style={{
          margin: '0 0 8px',
          fontSize: isMobile ? 22 : 26,
          ...typography.headline,
        }}
      >
        {headline}
      </h3>

      <p
        style={{
          margin: '0 0 16px',
          fontSize: isMobile ? 14 : 15,
          maxWidth: 420,
          ...typography.body,
        }}
      >
        Clinical grade biometric assessment complete.
      </p>

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 999,
          padding: '6px 12px',
          background: status.background,
          color: status.textColor,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontFamily: typography.fontFamily,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: status.dotColor,
            flexShrink: 0,
          }}
        />
        {status.label}
      </span>
    </section>
  );
};

export default LatestScanAnalysisCard;
