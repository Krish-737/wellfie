import React from 'react';
import { getDomainScoreStyle, type DomainScore } from '../../content/healthDomains';

const DomainScoreBadge: React.FC<{
  score: DomainScore;
  accentColor: string;
  compact?: boolean;
}> = ({ score, accentColor, compact = false }) => {
  const style = getDomainScoreStyle(score.tier, accentColor);

  return (
    <span
      style={{
        fontSize: compact ? 10 : 11,
        fontWeight: 700,
        borderRadius: 999,
        padding: compact ? '3px 8px' : '4px 10px',
        color: style.color,
        background: style.background,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {score.label}
    </span>
  );
};

export default DomainScoreBadge;
