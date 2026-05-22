
import React from 'react';
import styled from 'styled-components';
import { Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import SettingsButton from './SettingsButton';
import { Flex } from './shared/Flex';
import media from '../style/media';

const Wrapper = styled(Flex)`
  width: 100%;
  justify-content: space-between;
  align-items: center;
  min-height: 72px;
  padding: 0 16px;
  box-sizing: border-box;
  z-index: 10;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  ${media.tablet`
    min-height: 80px;
    padding: 0 24px;
  `}
`;

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  border-radius: 8px;
  transition: all 0.2s;
  &:hover {
    background: #f1f5f9;
    color: #14b8a6;
  }
`;

const TopBar = ({ onSettingsClick, isMeasuring }) => {
  const navigate = useNavigate();

  return (
    <Wrapper>
      <Logo />
      <ActionButtons>
        {!isMeasuring && (
          <IconButton onClick={() => navigate('/prepare-scan')} title="Preparation Guide">
            <Info size={20} />
          </IconButton>
        )}
        <SettingsButton disable={isMeasuring} onClick={onSettingsClick} />
      </ActionButtons>
    </Wrapper>
  );
};

export default TopBar;
