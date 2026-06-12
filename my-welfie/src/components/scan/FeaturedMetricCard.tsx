import React, { useMemo } from 'react';
import { getMetricInterpretation } from '../../content/metricInterpretations';
import { MISSING_VALUE, type IndicatorDef, type ScanResult } from '../../content/scanIndicators';
import {
  formatMetricStatusBadge,
  placeholderTrendBars,
  splitMetricValue,
  statusBadgeChipClasses,
} from '../../utils/metricDisplay';
import MetricRangeBar from './MetricRangeBar';
import {
  getIndicatorConfidence,
  getIndicatorMissingReason,
} from '../../utils/metricAvailability';
import { getMetricBadges } from '../../content/metricSpec';
import { useCardiovascularContextV2, useRecoveryContextV2 } from '../../config/featureFlags';
import RangeFeaturedMetricCard from './RangeFeaturedMetricCard';
import { buildSparklineBars, trendMetricIdForIndicator } from '../../utils/metricTrend';
import { typography } from '../../style/tokens';
import IndicatorIcon from './IndicatorIcon';
import MetricDisclaimerBadges from '../health/MetricDisclaimerBadges';

interface FeaturedMetricCardProps {
  indicator: IndicatorDef;
  scan: ScanResult;
  scanHistory?: ScanResult[];
  accentColor: string;
  onClick?(): void;
}

const FeaturedMetricCard: React.FC<FeaturedMetricCardProps> = ({
  indicator,
  scan,
  scanHistory = [],
  accentColor,
  onClick,
}) => {
  const useRecoveryContext = useRecoveryContextV2(indicator.id, indicator.category);
  const useCardioContext = useCardiovascularContextV2(indicator.id, indicator.category);

  if (useRecoveryContext) {
    return (
      <RangeFeaturedMetricCard
        indicator={indicator}
        scan={scan}
        scanHistory={scanHistory}
        accentColor={accentColor}
        domain="recovery"
        onClick={onClick}
      />
    );
  }

  if (useCardioContext) {
    return (
      <RangeFeaturedMetricCard
        indicator={indicator}
        scan={scan}
        scanHistory={scanHistory}
        accentColor={accentColor}
        domain="cardiovascular"
        onClick={onClick}
      />
    );
  }

  const rawValue = indicator.getValue(scan);
  const status = indicator.getStatus(scan);
  const interpretation = getMetricInterpretation(indicator, scan);
  const { primary, unit } = splitMetricValue(rawValue);
  const badgeLabel = formatMetricStatusBadge(status.label, status.color);
  const chipClasses = statusBadgeChipClasses(status.color);
  const trendMetricId = trendMetricIdForIndicator(indicator.id);
  const trendBars = useMemo(() => {
    if (trendMetricId && scanHistory.length > 0) {
      return buildSparklineBars(scanHistory, trendMetricId);
    }
    return placeholderTrendBars();
  }, [trendMetricId, scanHistory]);
  const hasValue = rawValue !== MISSING_VALUE;
  const missingReason = !hasValue ? getIndicatorMissingReason(indicator.id, scan) : null;
  const confidenceLabel = getIndicatorConfidence(indicator.id, scan);
  const disclaimerBadges = getMetricBadges(indicator.id, scan);
  const interactive = Boolean(onClick);

  const Wrapper = interactive ? 'button' : 'article';

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
      <div
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-1"
        style={{ backgroundColor: accentColor }}
      />

      <div className="px-4 py-4 pl-5 sm:px-5 sm:py-5 sm:pl-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${accentColor}14` }}
          >
            <IndicatorIcon id={indicator.id} color={accentColor} size={20} />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {badgeLabel !== '—' && (
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${chipClasses}`}
              >
                {badgeLabel}
              </span>
            )}
            {confidenceLabel && confidenceLabel !== 'Unknown' && (
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  confidenceLabel === 'High'
                    ? 'text-teal-800 bg-teal-50 border-teal-200/80'
                    : confidenceLabel === 'Medium'
                      ? 'text-amber-800 bg-amber-50 border-amber-200/80'
                      : 'text-red-700 bg-red-50 border-red-200/80'
                }`}
              >
                {confidenceLabel}
              </span>
            )}
          </div>
        </div>

        <p
          className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400"
          style={{ fontFamily: typography.fontFamily }}
        >
          {indicator.label}
        </p>

        <MetricDisclaimerBadges badges={disclaimerBadges} className="mb-2" />

        <div className="mb-4 flex items-baseline gap-2">
          <span
            className={`text-3xl font-extrabold leading-none sm:text-4xl ${
              hasValue ? 'text-slate-900' : 'text-slate-300'
            }`}
            style={{ fontFamily: typography.fontFamily, letterSpacing: '-0.02em' }}
          >
            {primary}
          </span>
          {unit && (
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              {unit}
            </span>
          )}
        </div>

        {!hasValue && missingReason && (
          <p
            className="mb-3 text-[12px] font-medium leading-snug text-slate-400"
            style={{ fontFamily: typography.fontFamily }}
          >
            {missingReason}
          </p>
        )}

        {/* <div className="mb-3 flex h-3 items-end gap-1.5" aria-hidden>
          {trendBars.map((bar, i) => (
            <div
              key={i}
              className="rounded-full transition-colors"
              style={{
                width: 12,
                height: Math.max(4, (bar.heightPct / 100) * 12),
                backgroundColor: bar.active ? accentColor : `${accentColor}28`,
                opacity: bar.active ? 1 : 0.85,
              }}
            />
          ))}
        </div> */}

        {/* Sparkline bars — hidden for metrics that have a richer widget */}
        {!['spo2', 'hba1c', 'normalized_stress_index', 'hemoglobin',
            'stress_level', 'wellness_level',
            'ascvd', 'bp_risk', 'glucose_risk', 'cholesterol_risk',
            'pns', 'sns'].includes(indicator.id) && (
          <div className="mb-3 flex h-3 items-end gap-1.5" aria-hidden>
            {trendBars.map((bar, i) => (
              <div
                key={i}
                className="rounded-full transition-colors"
                style={{
                  width: 12,
                  height: Math.max(4, (bar.heightPct / 100) * 12),
                  backgroundColor: bar.active ? accentColor : `${accentColor}28`,
                  opacity: bar.active ? 1 : 0.85,
                }}
              />
            ))}
          </div>
        )}

        {/* Rich per-metric widget for non-range cards */}
        {['spo2', 'hba1c', 'normalized_stress_index', 'hemoglobin',
          'stress_level', 'wellness_level',
          'ascvd', 'bp_risk', 'glucose_risk', 'cholesterol_risk',
          'pns', 'sns'].includes(indicator.id) && (
          <div className="mb-3">
            <MetricRangeBar
              value={(() => {
                // For percentage metrics pass the raw number; for enums pass null (enumValue handles it)
                if (indicator.id === 'spo2') return scan.oxygen_saturation ?? null;
                if (indicator.id === 'hba1c') return scan.hemoglobin_a1c ?? null;
                if (indicator.id === 'normalized_stress_index') return scan.normalized_stress_index ?? null;
                if (indicator.id === 'hemoglobin') return scan.hemoglobin ?? null;
                return null;
              })()}
              scaleMin={(() => {
                if (indicator.id === 'spo2') return 88;
                if (indicator.id === 'hba1c') return 4;
                if (indicator.id === 'normalized_stress_index') return 0;
                if (indicator.id === 'hemoglobin') return 8;
                return 0;
              })()}
              scaleMax={(() => {
                if (indicator.id === 'spo2') return 100;
                if (indicator.id === 'hba1c') return 9;
                if (indicator.id === 'normalized_stress_index') return 100;
                if (indicator.id === 'hemoglobin') return 20;
                return 10;
              })()}
              accentColor={accentColor}
              statusColor={status.color}
              variant="default"
              metricId={indicator.id}
              enumValue={(() => {
                if (indicator.id === 'stress_level') return scan.stress_level ?? null;
                if (indicator.id === 'wellness_level') return scan.wellness_level ?? null;
                if (indicator.id === 'ascvd') return scan.ascvd_risk_level ?? null;
                if (indicator.id === 'bp_risk') return scan.high_blood_pressure_risk ?? null;
                if (indicator.id === 'glucose_risk') return scan.high_fasting_glucose_risk ?? null;
                if (indicator.id === 'cholesterol_risk') return scan.high_total_cholesterol_risk ?? null;
                if (indicator.id === 'pns') return scan.pns_zone ?? null;
                if (indicator.id === 'sns') return scan.sns_zone ?? null;
                return null;
              })()}
            />
          </div>
        )}

        <p
          className="text-[13px] leading-relaxed text-slate-500"
          style={{ fontFamily: typography.fontFamily, fontWeight: 500 }}
        >
          {interpretation}
        </p>
      </div>
    </Wrapper>
  );
};

export default FeaturedMetricCard;
