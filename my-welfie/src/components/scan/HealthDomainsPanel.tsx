import React, { useMemo, useState } from 'react';
import {
  getDomainHeadlineIndicators,
  getDomainIndicators,
  HEALTH_DOMAINS,
  type HealthDomainDef,
} from '../../content/healthDomains';
import type { ScanResult } from '../../content/scanIndicators';
import { typography } from '../../style/tokens';
import { domainTabColor } from '../../utils/metricDisplay';
import DomainTabBar from './DomainTabBar';
import FeaturedMetricCard from './FeaturedMetricCard';

const LIMITED_DOMAIN_IDS = ['cardiovascular', 'respiratory'] as const;

const HealthDomainsPanel: React.FC<{
  scan: ScanResult;
  scanHistory?: ScanResult[];
  isMobile: boolean;
  allowExpand?: boolean;
  onMetricClick(id: string): void;
}> = ({ scan, scanHistory = [], allowExpand = true, onMetricClick }) => {
  const domains = useMemo<readonly HealthDomainDef[]>(
    () => (allowExpand
      ? HEALTH_DOMAINS
      : HEALTH_DOMAINS.filter((d) => (LIMITED_DOMAIN_IDS as readonly string[]).includes(d.id))),
    [allowExpand],
  );

  const [activeDomainId, setActiveDomainId] = useState<string>(domains[0]?.id ?? 'cardiovascular');
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  const activeDomain = domains.find((d) => d.id === activeDomainId) ?? domains[0];

  const visibleMetrics = useMemo(() => {
    if (!activeDomain) return [];
    return showAllMetrics
      ? getDomainIndicators(activeDomain)
      : getDomainHeadlineIndicators(activeDomain);
  }, [activeDomain, showAllMetrics]);

  const allMetricsCount = activeDomain ? getDomainIndicators(activeDomain).length : 0;
  const headlineCount = activeDomain ? getDomainHeadlineIndicators(activeDomain).length : 0;
  const extraCount = Math.max(0, allMetricsCount - headlineCount);

  const handleTabSelect = (domainId: string) => {
    setActiveDomainId(domainId);
    setShowAllMetrics(false);
  };

  if (!activeDomain) return null;

  const accentColor = domainTabColor(activeDomain.id, activeDomain.color);

  return (
    <div style={{ marginBottom: 16, fontFamily: typography.fontFamily }}>
      <DomainTabBar
        domains={domains}
        activeDomainId={activeDomain.id}
        onSelect={handleTabSelect}
      />

      <div className="flex flex-col gap-3">
        {visibleMetrics.map((indicator) => (
          <FeaturedMetricCard
            key={indicator.id}
            indicator={indicator}
            scan={scan}
            scanHistory={scanHistory}
            accentColor={accentColor}
            onClick={() => onMetricClick(indicator.id)}
          />
        ))}
      </div>

      {!showAllMetrics && extraCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAllMetrics(true)}
          style={{
            marginTop: 12,
            padding: 0,
            background: 'none',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            color: accentColor,
            cursor: 'pointer',
            fontFamily: typography.fontFamily,
          }}
        >
          +{extraCount} more metric{extraCount === 1 ? '' : 's'}
        </button>
      )}

      {showAllMetrics && extraCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAllMetrics(false)}
          style={{
            marginTop: 12,
            padding: 0,
            background: 'none',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            color: '#64748b',
            cursor: 'pointer',
            fontFamily: typography.fontFamily,
          }}
        >
          Show fewer metrics
        </button>
      )}

      {!allowExpand && (
        <p style={{
          margin: '12px 0 0',
          fontSize: 12,
          color: '#94a3b8',
          textAlign: 'center',
        }}>
          Enable health indicators in profile to view all domains.
        </p>
      )}
    </div>
  );
};

export default HealthDomainsPanel;
