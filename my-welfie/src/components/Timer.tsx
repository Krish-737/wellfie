import React from 'react';
import styled from 'styled-components';
import { useTimer } from '../hooks';

const Wrapper = styled.div`
  width: 100%;
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ScanLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
`;

const PctLabel = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #0653f4;
`;

const BarTrack = styled.div`
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
`;

const BarFill = styled.div<{ pct: number }>`
  height: 100%;
  width: ${({ pct }) => pct}%;
  background: linear-gradient(90deg, #14b8a6, #0891b2);
  border-radius: 999px;
  transition: width 0.9s linear;
`;

const Timer = ({ started, durationSeconds }) => {
  const seconds = useTimer(started, durationSeconds);
  const pct = started ? Math.min(100, Math.round((seconds / durationSeconds) * 100)) : 0;

  return (
    <Wrapper>
      <LabelRow>
        <ScanLabel>Scan Progress</ScanLabel>
        <PctLabel>{pct}%</PctLabel>
      </LabelRow>
      <BarTrack>
        <BarFill pct={pct} />
      </BarTrack>
    </Wrapper>
  );
};

export default Timer;
