import React, { useMemo } from 'react';
import {
  computeDomainScore,
  getDomainHeadlineIndicators,
  getDomainIndicators,
  type HealthDomainDef,
} from '../../content/healthDomains';
import type { ScanResult } from '../../content/scanIndicators';
import DomainScoreBadge from './DomainScoreBadge';
import MetricTile from './MetricTile';

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const HealthDomainCard: React.FC<{
  domain: HealthDomainDef;
  scan: ScanResult;
  isMobile: boolean;
  expanded: boolean;
  onToggle(): void;
  onMetricClick(id: string): void;
}> = ({ domain, scan, isMobile, expanded, onToggle, onMetricClick }) => {
  const score = useMemo(() => computeDomainScore(domain, scan), [domain, scan]);
  const allMetrics = useMemo(() => getDomainIndicators(domain), [domain]);
  const headlines = useMemo(() => getDomainHeadlineIndicators(domain), [domain]);
  const hiddenCount = Math.max(0, allMetrics.length - headlines.length);
  const visibleMetrics = expanded ? allMetrics : headlines;

  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderLeft: `3px solid ${domain.color}`,
        borderRadius: 14,
        padding: isMobile ? '12px 12px 14px' : '14px 16px 16px',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: 0,
          marginBottom: 12,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          minHeight: 44,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: domain.color,
            flexShrink: 0,
          }} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '0.02em',
              lineHeight: 1.2,
            }}>
              {domain.title}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {allMetrics.length} metric{allMetrics.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <DomainScoreBadge score={score} accentColor={domain.color} />
          <span style={{ color: '#94a3b8', display: 'flex' }}>
            {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </span>
        </div>
      </button>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
        {visibleMetrics.map((ind) => (
          <MetricTile
            key={ind.id}
            indicator={ind}
            scan={scan}
            variant="compact"
            hideHint={!expanded}
            onClick={() => onMetricClick(ind.id)}
          />
        ))}
      </div>

      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          onClick={onToggle}
          style={{
            marginTop: 10,
            padding: 0,
            background: 'none',
            border: 'none',
            fontSize: 12,
            fontWeight: 600,
            color: domain.color,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          +{hiddenCount} more metric{hiddenCount === 1 ? '' : 's'}
        </button>
      )}
    </section>
  );
};

export default HealthDomainCard;
