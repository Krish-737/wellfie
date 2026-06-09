import React from 'react';
import styled from 'styled-components';
import StatsBox from './StatsBox';
import { Flex } from './shared/Flex';
import { isMobile } from '@biosensesignal/web-sdk';
import { sdkConfidenceLabel } from '../utils/vitalsMetadata';
import type { DisplayVitalSign } from '../types';

export type BloodPressureValue = {
  systolic: number;
  diastolic: number;
};

const Wrapper = styled(Flex)`
  display: flex;
  position: absolute;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 3px;
  padding: 13px 50px;
  bottom: 30px;
  box-sizing: border-box;
`;

const BoxesWrapper = styled(Flex)`
  gap: 30px;
`;

interface IStats {
  vitalSigns: {
    pulseRate: DisplayVitalSign<number>;
    respirationRate: DisplayVitalSign<number>;
    stress: DisplayVitalSign<number>;
    hrvSdnn: DisplayVitalSign<number>;
    spo2: DisplayVitalSign<number>;
    bloodPressure: DisplayVitalSign<BloodPressureValue>;
  };
}

function formatLiveValue<T>(
  vital: DisplayVitalSign<T>,
  format: (v: T) => string,
): { value: string; confidence?: string } {
  if (!vital.isEnabled) {
    return { value: 'N/A' };
  }
  if (vital.value == null) {
    return { value: '—' };
  }
  const conf = sdkConfidenceLabel(vital.confidenceLevel);
  return {
    value: format(vital.value),
    confidence: conf && conf !== 'Unknown' ? conf : undefined,
  };
}

const Stats = ({ vitalSigns }: IStats) => {
  const bp = vitalSigns.bloodPressure;
  const bpDisplay = formatLiveValue(bp, (v) =>
    v?.systolic && v?.diastolic ? `${v.systolic}/${v.diastolic}` : '—',
  );

  return (
    <Wrapper>
      <BoxesWrapper>
        <StatsBox
          title="PR"
          {...formatLiveValue(vitalSigns.pulseRate, (v) => String(Math.round(v)))}
        />
        <StatsBox
          title="RR"
          {...formatLiveValue(vitalSigns.respirationRate, (v) => String(Math.round(v)))}
        />
        <StatsBox
          title="SL"
          {...formatLiveValue(vitalSigns.stress, (v) => String(v))}
        />
        <StatsBox
          title="SDNN"
          {...formatLiveValue(vitalSigns.hrvSdnn, (v) => String(Math.round(v)))}
        />
        {isMobile() && (
          <StatsBox title="BP" value={bpDisplay.value} confidence={bpDisplay.confidence} />
        )}
      </BoxesWrapper>
    </Wrapper>
  );
};

export default Stats;
