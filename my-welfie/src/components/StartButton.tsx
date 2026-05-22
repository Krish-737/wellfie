import React from 'react';
import styled from 'styled-components';
import Stop from '../assets/stop.svg';
import media from '../style/media';
import Spinner from './Spinner';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const MeasureButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(15, 23, 42);
  color: #ffffff;
  border: none;
  border-radius: 14px;
  padding: 14px 36px;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.35);
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
  font-family: inherit;
  ${media.tablet`
    padding: 16px 44px;
    font-size: 16px;
    border-radius: 16px;
  `}
  &:hover {
    background: rgb(30, 41, 59);
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(15, 23, 42, 0.45);
  }
  &:active {
    transform: translateY(0);
  }
`;

const StopButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fee2e2;
  border: 2px solid #fca5a5;
  border-radius: 50%;
  cursor: pointer;
  width: 58px;
  height: 58px;
  padding: 0;
  transition: background 0.15s;
  ${media.tablet`
    width: 72px;
    height: 72px;
  `}
  &:hover {
    background: #fecaca;
  }
`;

const StopIcon = styled.img`
  width: 28px;
  height: 28px;
  ${media.tablet`
    width: 32px;
    height: 32px;
  `}
`;

export interface IStartButton {
  isLoading;
  onClick: () => void;
  isMeasuring: boolean;
}

const StartButton = ({ isLoading, onClick, isMeasuring }: IStartButton) => {
  return (
    <Container>
      {isLoading ? (
        <Spinner />
      ) : isMeasuring ? (
        <StopButton onClick={onClick} title="Stop scan">
          <StopIcon src={Stop} />
        </StopButton>
      ) : (
        <MeasureButton onClick={onClick}>
          Measure Now
        </MeasureButton>
      )}
    </Container>
  );
};

export default StartButton;
