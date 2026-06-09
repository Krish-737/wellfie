import React from 'react';
import { type IndicatorDef, type ScanResult } from '../../content/scanIndicators';
import IndicatorMetricCard from '../health/IndicatorMetricCard';

export type MetricTileVariant = 'primary' | 'compact';

const MetricTile: React.FC<{
  indicator: IndicatorDef;
  scan: ScanResult;
  variant?: MetricTileVariant;
  hideHint?: boolean;
  onClick?(): void;
}> = ({ indicator, scan, variant = 'compact', hideHint = false, onClick }) => (
  <IndicatorMetricCard
    indicator={indicator}
    scan={scan}
    variant={variant === 'primary' ? 'default' : 'compact'}
    hideInterpretation={hideHint}
    onClick={onClick}
  />
);

export default MetricTile;
