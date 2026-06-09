import React from 'react';
import { statusChipClasses } from '../../content/metricInterpretations';
import type { MetricBadge } from '../../content/metricSpec';
import MetricDisclaimerBadges from './MetricDisclaimerBadges';

export type HealthMetricCardVariant = 'default' | 'compact';

export interface HealthMetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  statusLabel: string;
  statusColor: string;
  interpretation: string;
  accentColor?: string;
  variant?: HealthMetricCardVariant;
  hideInterpretation?: boolean;
  missingReason?: string | null;
  confidenceLabel?: string | null;
  disclaimerBadges?: MetricBadge[];
  onClick?(): void;
  className?: string;
}

const HealthMetricCard: React.FC<HealthMetricCardProps> = ({
  icon,
  label,
  value,
  statusLabel,
  statusColor,
  interpretation,
  accentColor = '#0f766e',
  variant = 'default',
  hideInterpretation = false,
  missingReason = null,
  confidenceLabel = null,
  disclaimerBadges = [],
  onClick,
  className = '',
}) => {
  const isCompact = variant === 'compact';
  const hasValue = value !== '—';
  const interactive = Boolean(onClick);
  const chipClasses = statusChipClasses(statusColor);

  const baseClasses = [
    'health-metric-card group w-full text-left',
    'rounded-2xl border border-slate-200/90 bg-white',
    'shadow-metric transition-all duration-200 ease-out',
    isCompact ? 'p-3' : 'p-3.5 sm:p-4',
    interactive
      ? 'cursor-pointer hover:-translate-y-0.5 hover:border-teal-200/90 hover:shadow-metric-hover active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 focus-visible:ring-offset-2'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <div className={`flex items-start justify-between gap-2 ${isCompact ? 'mb-2.5' : 'mb-3'}`}>
        <div
          className={`flex shrink-0 items-center justify-center rounded-xl ${isCompact ? 'h-8 w-8' : 'h-9 w-9 sm:h-10 sm:w-10'}`}
          style={{ backgroundColor: `${accentColor}14` }}
        >
          {icon}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {statusLabel !== '—' && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold leading-tight sm:text-[11px] sm:px-2.5 sm:py-1 ${chipClasses}`}
            >
              {statusLabel}
            </span>
          )}
          {confidenceLabel && confidenceLabel !== 'Unknown' && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold leading-tight sm:text-[11px] sm:px-2.5 sm:py-1 ${
                confidenceLabel === 'High'
                  ? 'text-teal-800 bg-teal-50 border-teal-200/80'
                  : confidenceLabel === 'Medium'
                    ? 'text-amber-800 bg-amber-50 border-amber-200/80'
                    : 'text-red-700 bg-red-50 border-red-200/80'
              }`}
              title="SDK confidence level"
            >
              {confidenceLabel} conf.
            </span>
          )}
        </div>
      </div>

      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400 sm:text-[11px]">
        {label}
      </p>

      <MetricDisclaimerBadges badges={disclaimerBadges} className="mb-2" />

      <p
        className={`truncate font-extrabold leading-tight ${
          hasValue ? 'text-slate-900' : 'text-slate-300'
        } ${isCompact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'}`}
      >
        {value}
      </p>

      {!hasValue && missingReason && (
        <p className="mt-1 text-[11px] font-medium leading-snug text-slate-400 sm:text-xs">
          {missingReason}
        </p>
      )}

      {!hideInterpretation && (
        <p
          className={`mt-2 line-clamp-2 leading-relaxed text-slate-500 ${
            isCompact ? 'text-[11px]' : 'text-xs sm:text-[13px]'
          }`}
        >
          {interpretation}
        </p>
      )}

      {interactive && !hideInterpretation && (
        <p className="mt-2 text-[10px] font-medium text-slate-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:text-[11px]">
          Tap for details
        </p>
      )}
    </>
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={baseClasses} aria-label={`${label}: ${value}`}>
        {content}
      </button>
    );
  }

  return <article className={baseClasses}>{content}</article>;
};

export default HealthMetricCard;
