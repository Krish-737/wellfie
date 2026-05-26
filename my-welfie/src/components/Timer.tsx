import React from 'react';
import styled from 'styled-components';
import { useTimer } from '../hooks';

const Wrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const LabelRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
`;

const ScanLabel = styled.div`
  width: 100%;
  text-align: center;

  font-size: 14px;
  font-weight: 700;
  color: #14b8a6;

  display: flex;
  justify-content: center;
  align-items: center;

  line-height: 1.4;
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

const MESSAGES = [
  'Measuring blood pressure...',
  'Analyzing pulse rate...',
  'Calculating stress levels...',
  'Checking oxygen saturation...',
  'Processing wellness index...',
  'Detecting heart rate variability...',
  'Finalizing health insights...',
];

const Timer = ({ started, durationSeconds }) => {
  const seconds = useTimer(started, durationSeconds);
  const pct = started ? Math.min(100, Math.round((seconds / durationSeconds) * 100)) : 0;
  
  const [msgIdx, setMsgIdx] = React.useState(0);

  React.useEffect(() => {
    if (!started) {
      setMsgIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setMsgIdx(prev => (prev + 1) % MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [started]);

  return (
    <Wrapper>
      <LabelRow>
        <ScanLabel>
          {started ? MESSAGES[msgIdx] : 'Ready to scan'}
        </ScanLabel>
      </LabelRow>
      <BarTrack>
        <BarFill pct={pct} />
      </BarTrack>
    </Wrapper>
  );
};

export default Timer;
