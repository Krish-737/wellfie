import React from 'react';
import styled from 'styled-components';
import { FlexSpace } from './shared/FlexSpace';

const Box = styled(FlexSpace)`
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-height: 40px;
`;

const Title = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  align-items: center;
  color: #01061b;
  font-size: 14px;
  font-weight: 700;
  line-height: 16px;
`;

const Value = styled.div`
  font-size: 14px;
  color: #01061b;
  font-weight: 700;
`;

const Confidence = styled.div<{ $level?: string }>`
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ $level }) =>
    $level === 'Low' ? '#dc2626' : $level === 'Medium' ? '#b45309' : '#64748b'};
`;

const ValueWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  gap: 2px;
`;

interface StatsBoxProps {
  title: string;
  value?: string;
  confidence?: string;
}

const StatsBox: React.FC<StatsBoxProps> = ({ title, value, confidence }) => (
  <Box>
    <Title>{title}</Title>
    <ValueWrapper>
      {value != null && value !== '' && <Value>{value}</Value>}
      {confidence && <Confidence $level={confidence}>{confidence}</Confidence>}
    </ValueWrapper>
  </Box>
);

export default StatsBox;
