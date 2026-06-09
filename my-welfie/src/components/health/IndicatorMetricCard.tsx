import React from 'react';
import { getMetricInterpretation } from '../../content/metricInterpretations';
import { MISSING_VALUE, type IndicatorDef, type ScanResult } from '../../content/scanIndicators';
import {
  getIndicatorConfidence,
  getIndicatorMissingReason,
} from '../../utils/metricAvailability';
import { getMetricBadges } from '../../content/metricSpec';
import IndicatorIcon from '../scan/IndicatorIcon';
import HealthMetricCard, { type HealthMetricCardVariant } from './HealthMetricCard';

/** Bridges scan indicator definitions to the premium HealthMetricCard. */
const IndicatorMetricCard: React.FC<{
  indicator: IndicatorDef;
  scan: ScanResult;
  variant?: HealthMetricCardVariant;
  hideInterpretation?: boolean;
  onClick?(): void;
}> = ({ indicator, scan, variant = 'default', hideInterpretation = false, onClick }) => {
  const value = indicator.getValue(scan);
  const status = indicator.getStatus(scan);
  const interpretation = getMetricInterpretation(indicator, scan);
  const missingReason = value === MISSING_VALUE ? getIndicatorMissingReason(indicator.id, scan) : null;
  const confidenceLabel = getIndicatorConfidence(indicator.id, scan);
  const disclaimerBadges = getMetricBadges(indicator.id, scan);
  const isCompact = variant === 'compact';

  return (
    <HealthMetricCard
      icon={
        <IndicatorIcon
          id={indicator.id}
          color={indicator.catColor}
          size={isCompact ? 17 : 20}
        />
      }
      label={indicator.label}
      value={value}
      statusLabel={status.label}
      statusColor={status.color}
      interpretation={interpretation}
      accentColor={indicator.catColor}
      variant={variant}
      hideInterpretation={hideInterpretation}
      missingReason={missingReason}
      confidenceLabel={confidenceLabel}
      disclaimerBadges={disclaimerBadges}
      onClick={onClick}
    />
  );
};

export default IndicatorMetricCard;
