import React from 'react';
import { clampPct } from '../../utils/cardiovascularMetricContext';
import { typography } from '../../style/tokens';

interface MetricRangeBarProps {
  value: number | null;
  scaleMin: number;
  scaleMax: number;
  optimalMin?: number;
  optimalMax?: number;
  accentColor: string;
  statusColor?: string;
  /** Featured card layout: semantic scale labels + centered target below bar */
  variant?: 'default' | 'featured' | 'recovery';
  targetDisplay?: string;
  scaleLeftLabel?: string;
  scaleRightLabel?: string;
}

const TRACK_HEIGHT = 8;
const RECOVERY_TRACK_HEIGHT = 10;
const MARKER_SIZE = 14;

const MetricRangeBar: React.FC<MetricRangeBarProps> = ({
  value,
  scaleMin,
  scaleMax,
  optimalMin,
  optimalMax,
  accentColor,
  statusColor = accentColor,
  variant = 'default',
  targetDisplay,
  scaleLeftLabel,
  scaleRightLabel,
}) => {
  const isFeatured = variant === 'featured' || variant === 'recovery';
  const trackHeight = isFeatured ? RECOVERY_TRACK_HEIGHT : TRACK_HEIGHT;

  const optimalLeft =
    optimalMin != null ? clampPct(optimalMin, scaleMin, scaleMax) : null;
  const optimalWidth =
    optimalMin != null && optimalMax != null
      ? clampPct(optimalMax, scaleMin, scaleMax) - clampPct(optimalMin, scaleMin, scaleMax)
      : null;
  const markerPct = value != null ? clampPct(value, scaleMin, scaleMax) : null;

  return (
    <div style={{ fontFamily: typography.fontFamily }} aria-hidden>
      <div
        style={{
          position: 'relative',
          height: trackHeight,
          width: '100%',
          overflow: 'visible',
          borderRadius: 9999,
          backgroundColor: '#e2e8f0',
        }}
      >
        {optimalLeft != null && optimalWidth != null && optimalWidth > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${optimalLeft}%`,
              width: `${optimalWidth}%`,
              borderRadius: 9999,
              backgroundColor: isFeatured ? `${accentColor}55` : `${accentColor}33`,
            }}
          />
        )}
        {markerPct != null && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${markerPct}%`,
              width: MARKER_SIZE,
              height: MARKER_SIZE,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.18)',
              backgroundColor: statusColor,
              zIndex: 2,
            }}
          />
        )}
      </div>

      {isFeatured && targetDisplay && (
        <p
          style={{
            margin: '8px 0 0',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: accentColor,
            fontFamily: typography.fontFamily,
            lineHeight: 1.2,
          }}
        >
          TARGET: {targetDisplay}
        </p>
      )}

      <div
        style={{
          marginTop: isFeatured && targetDisplay ? 4 : 6,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: '#94a3b8',
          fontFamily: typography.fontFamily,
        }}
      >
        <span>{isFeatured ? scaleLeftLabel : scaleMin}</span>
        <span>{isFeatured ? scaleRightLabel : scaleMax}</span>
      </div>
    </div>
  );
};

export default MetricRangeBar;
