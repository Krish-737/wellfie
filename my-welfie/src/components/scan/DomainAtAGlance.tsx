import React, { useMemo } from 'react';
import {
  computeDomainScore,
  HEALTH_DOMAINS,
  getDomainScoreStyle,
  type HealthDomainDef,
} from '../../content/healthDomains';
import type { ScanResult } from '../../content/scanIndicators';

const DomainAtAGlance: React.FC<{
  scan: ScanResult;
  isMobile: boolean;
  domains?: readonly HealthDomainDef[];
  onDomainClick?(domainId: string): void;
}> = ({ scan, isMobile, domains = HEALTH_DOMAINS, onDomainClick }) => {
  const entries = useMemo(
    () => domains.map((domain) => ({
      domain,
      score: computeDomainScore(domain, scan),
    })),
    [domains, scan],
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)',
        gap: 8,
        marginBottom: 14,
      }}
    >
      {entries.map(({ domain, score }) => {
        const chipStyle = getDomainScoreStyle(score.tier, domain.color);
        const clickable = Boolean(onDomainClick);

        return (
          <button
            key={domain.id}
            type="button"
            onClick={clickable ? () => onDomainClick?.(domain.id) : undefined}
            disabled={!clickable}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
              padding: isMobile ? '10px 10px' : '10px 12px',
              borderRadius: 12,
              border: `1px solid ${chipStyle.border}`,
              background: chipStyle.background,
              cursor: clickable ? 'pointer' : 'default',
              fontFamily: 'inherit',
              textAlign: 'left',
              minHeight: 44,
            }}
          >
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: domain.color,
            }}>
              {domain.title}
            </span>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: chipStyle.color,
              lineHeight: 1.2,
            }}>
              {score.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default DomainAtAGlance;
