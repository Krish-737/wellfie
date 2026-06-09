import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMetricInterpretation } from '../../content/metricInterpretations';
import { MISSING_VALUE, type IndicatorDef, type ScanResult } from '../../content/scanIndicators';
import {
  formatMetricStatusBadge,
  splitMetricValue,
  statusBadgeChipClasses,
} from '../../utils/metricDisplay';
import {
  getIndicatorConfidence,
  getIndicatorMissingReason,
} from '../../utils/metricAvailability';
import { getMetricBadges } from '../../content/metricSpec';
import { buildCardioFeaturedView } from '../../utils/cardiovascularMetricContext';
import { buildRecoveryFeaturedView } from '../../utils/recoveryMetricContext';
import type { RangeFeaturedMetricView } from '../../utils/rangeFeaturedMetricView';
import { typography } from '../../style/tokens';
import MetricDisclaimerBadges from '../health/MetricDisclaimerBadges';
import MetricRangeBar from './MetricRangeBar';

interface RangeFeaturedMetricCardProps {
  indicator: IndicatorDef;
  scan: ScanResult;
  scanHistory: ScanResult[];
  accentColor: string;
  domain: 'recovery' | 'cardiovascular';
  onClick?(): void;
}

const RangeFeaturedMetricCard: React.FC<RangeFeaturedMetricCardProps> = ({
  indicator,
  scan,
  scanHistory,
  accentColor,
  domain,
  onClick,
}) => {
  const { user } = useAuth();
  const rawValue = indicator.getValue(scan);
  const status = indicator.getStatus(scan);
  const interpretation = getMetricInterpretation(indicator, scan);
  const { primary, unit } = splitMetricValue(rawValue);
  const badgeLabel = formatMetricStatusBadge(status.label, status.color);
  const chipClasses = statusBadgeChipClasses(status.color);
  const hasValue = rawValue !== MISSING_VALUE;
  const missingReason = !hasValue ? getIndicatorMissingReason(indicator.id, scan) : null;
  const confidenceLabel = getIndicatorConfidence(indicator.id, scan);
  const disclaimerBadges = getMetricBadges(indicator.id, scan);
  const interactive = Boolean(onClick);

  const view = useMemo((): RangeFeaturedMetricView | null => {
    if (!hasValue) return null;
    if (domain === 'recovery') {
      return buildRecoveryFeaturedView(indicator.id, scan, scanHistory);
    }
    return buildCardioFeaturedView(indicator.id, scan, scanHistory, user?.age ?? null);
  }, [domain, indicator.id, scan, scanHistory, hasValue, user?.age]);

  const Wrapper = interactive ? 'button' : 'article';
  const deltaColor = (improved?: boolean) => (improved ? accentColor : '#b45309');

  return (
    <Wrapper
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className={[
        'health-metric-card relative w-full overflow-hidden text-left',
        'rounded-2xl border border-slate-200/90 bg-white shadow-metric',
        interactive
          ? 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-metric-hover active:scale-[0.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 focus-visible:ring-offset-2'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ fontFamily: typography.fontFamily }}
      aria-label={interactive ? `${indicator.label}: ${rawValue}` : undefined}
    >
      <div style={{ padding: '18px 20px 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: '#0f172a',
              textTransform: 'uppercase',
            }}
          >
            {indicator.label}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            {badgeLabel !== '—' && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${chipClasses}`}
              >
                {badgeLabel}
              </span>
            )}
            {view?.compactDeltaText && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: deltaColor(view.deltaImproved),
                }}
              >
                {view.compactDeltaText}
              </span>
            )}
            {view?.compactExtraText && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: deltaColor(view.extraImproved),
                }}
              >
                {view.compactExtraText}
              </span>
            )}
            {confidenceLabel && confidenceLabel !== 'Unknown' && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                }}
              >
                {confidenceLabel} conf.
              </span>
            )}
          </div>
        </div>

        <MetricDisclaimerBadges badges={disclaimerBadges} className="mb-2" />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
          <span
            style={{
              fontSize: 36,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: hasValue ? '#0f172a' : '#cbd5e1',
              fontFamily: typography.fontFamily,
            }}
          >
            {primary}
          </span>
          {unit && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#94a3b8',
                textTransform: 'uppercase',
              }}
            >
              {unit}
            </span>
          )}
        </div>

        {!hasValue && missingReason && (
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
            {missingReason}
          </p>
        )}

        {view && (
          <div style={{ marginBottom: 14 }}>
            <MetricRangeBar
              value={view.value}
              scaleMin={view.scaleMin}
              scaleMax={view.scaleMax}
              optimalMin={view.optimalMin}
              optimalMax={view.optimalMax}
              accentColor={accentColor}
              statusColor={status.color}
              variant="featured"
              targetDisplay={view.targetDisplay ?? undefined}
              scaleLeftLabel={view.scaleLeftLabel}
              scaleRightLabel={view.scaleRightLabel}
            />
          </div>
        )}

        <p
          style={{
            margin: '0 0 14px',
            fontSize: 13,
            lineHeight: 1.5,
            color: '#64748b',
            fontWeight: 500,
          }}
        >
          {interpretation}
        </p>

        {interactive && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 12,
              borderTop: '1px solid #f1f5f9',
              fontSize: 12,
              fontWeight: 600,
              color: '#94a3b8',
            }}
          >
            <span>Tap for details</span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
          </div>
        )}
      </div>
    </Wrapper>
  );
};

export default RangeFeaturedMetricCard;
