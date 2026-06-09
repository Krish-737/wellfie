import React from 'react';
import type { HealthDomainDef } from '../../content/healthDomains';
import { typography } from '../../style/tokens';
import { domainTabColor } from '../../utils/metricDisplay';

interface DomainTabBarProps {
  domains: readonly HealthDomainDef[];
  activeDomainId: string;
  onSelect(domainId: string): void;
}

const DomainTabBar: React.FC<DomainTabBarProps> = ({ domains, activeDomainId, onSelect }) => (
  <div
    style={{
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      marginBottom: 14,
      paddingBottom: 2,
      fontFamily: typography.fontFamily,
    }}
  >
    {domains.map((domain) => {
      const isActive = domain.id === activeDomainId;
      const activeColor = domainTabColor(domain.id, domain.color);

      return (
        <button
          key={domain.id}
          type="button"
          onClick={() => onSelect(domain.id)}
          style={{
            flexShrink: 0,
            border: 'none',
            borderRadius: 999,
            padding: '10px 16px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: typography.fontFamily,
            transition: 'background 0.15s ease, color 0.15s ease',
            background: isActive ? activeColor : '#f1f5f9',
            color: isActive ? '#ffffff' : '#64748b',
            boxShadow: isActive ? `0 2px 8px ${activeColor}40` : 'none',
          }}
        >
          {domain.title}
        </button>
      );
    })}
  </div>
);

export default DomainTabBar;
