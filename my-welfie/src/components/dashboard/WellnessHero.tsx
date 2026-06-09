import React from 'react';
import { Info, Video } from 'lucide-react';
import {
  getIndicatorById,
  MISSING_VALUE,
  WELLNESS_INDICATOR_ID,
  type ScanResult,
} from '../../content/scanIndicators';
import {
  getWellnessIndexOnTenScale,
  wellnessLevelLabel,
  wellnessLevelRingPercent,
  WELLNESS_SCORE_OUT_OF,
} from '../../utils/wellnessScore';
import { colors, typography } from '../../style/tokens';

const VITALITY_GRADIENT = {
  start: '#2dd4bf',
  end: '#0d9488',
} as const;

const VITALITY_RING_GRADIENT_ID = 'vitality-ring-gradient';

const STATUS_GREEN = '#10b981';

function vitalityStatusLabelFromLevel(level?: number | null): string {
  const label = wellnessLevelLabel(level);
  if (label === '—') return '—';
  return label.toUpperCase();
}

const ScoreRing: React.FC<{ score: number | null; size: number; gradientId: string }> = ({
  score,
  size,
  gradientId,
}) => {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = score != null ? Math.min(100, Math.max(0, score)) / 100 : 0;
  const offset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={VITALITY_GRADIENT.start} />
          <stop offset="100%" stopColor={VITALITY_GRADIENT.end} />
        </linearGradient>
      </defs>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={stroke}
      />
      {score != null && (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      )}
    </svg>
  );
};

interface WellnessHeroProps {
  scan: ScanResult;
  isMobile: boolean;
  onScoreClick?(): void;
  onStartScan?(): void;
}

const WellnessHero: React.FC<WellnessHeroProps> = ({
  scan,
  isMobile,
  onScoreClick,
  onStartScan,
}) => {
  const wellness = getIndicatorById(WELLNESS_INDICATOR_ID);
  const status = wellness?.getStatus(scan);

  const scoreOnTen = getWellnessIndexOnTenScale(scan.wellness_index);
  const hasScore = scoreOnTen != null;
  const scoreNumerator = hasScore
    ? (Number.isInteger(scoreOnTen) ? String(scoreOnTen) : scoreOnTen.toFixed(1))
    : null;
  const statusLabel = vitalityStatusLabelFromLevel(scan.wellness_level);
  const ringFill = wellnessLevelRingPercent(scan.wellness_level);
  const ringSize = isMobile ? 168 : 184;

  const statusColor =
    status && status.label !== '—' && scan.wellness_level === 1
      ? status.color
      : hasScore
        ? STATUS_GREEN
        : '#94a3b8';

  return (
    <section
      style={{
        borderRadius: 16,
        padding: isMobile ? '20px 18px 18px' : '24px 24px 20px',
        marginBottom: 20,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
        fontFamily: typography.fontFamily,
      }}
    >
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <p
          style={{
            margin: 0,
            textAlign: 'center',
            ...typography.eyebrow,
          }}
        >
          Current Wellness Score
        </p>
        {onScoreClick && (
          <button
            type="button"
            onClick={onScoreClick}
            aria-label="Wellness score details"
            style={{
              position: 'absolute',
              top: -2,
              right: 0,
              width: 28,
              height: 28,
              padding: 0,
              border: 'none',
              borderRadius: '50%',
              background: '#f1f5f9',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: typography.fontFamily,
            }}
          >
            <Info size={14} strokeWidth={2.2} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
        <div
          style={{
            position: 'relative',
            width: ringSize,
            height: ringSize,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ScoreRing score={ringFill} size={ringSize} gradientId={VITALITY_RING_GRADIENT_ID} />
          </div>
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: 2,
                fontFamily: typography.fontFamily,
              }}
            >
              <span
                style={{
                  fontSize: isMobile ? 52 : 56,
                  fontWeight: 800,
                  color: hasScore ? colors.slate900 : '#cbd5e1',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                {hasScore ? scoreNumerator : MISSING_VALUE}
              </span>
              {hasScore && (
                <span
                  style={{
                    fontSize: isMobile ? 22 : 24,
                    fontWeight: 700,
                    color: '#64748b',
                    letterSpacing: '-0.02em',
                  }}
                >
                  /{WELLNESS_SCORE_OUT_OF}
                </span>
              )}
            </div>
            {hasScore && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: statusColor,
                  textTransform: 'uppercase',
                  fontFamily: typography.fontFamily,
                }}
              >
                {statusLabel}
              </div>
            )}
          </div>
        </div>
      </div>

      {onStartScan && (
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
          Start New Scan
        </button>
      )}
    </section>
  );
};

export default WellnessHero;
