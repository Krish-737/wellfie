import React from 'react';
import type { MetricBadge } from '../../content/metricSpec';

const BADGE_STYLES: Record<MetricBadge['kind'], string> = {
  research: 'text-violet-800 bg-violet-50 border-violet-200/80',
  mobile_only: 'text-slate-600 bg-slate-100 border-slate-200/80',
};

const MetricDisclaimerBadges: React.FC<{ badges: MetricBadge[]; className?: string }> = ({
  badges,
  className = '',
}) => {
  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((badge) => (
        <span
          key={badge.kind}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold leading-tight ${BADGE_STYLES[badge.kind]}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
};

export default MetricDisclaimerBadges;
