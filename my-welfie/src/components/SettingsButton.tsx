import settings from '../assets/settings-hamburger.svg';
import React from 'react';
import styled from 'styled-components';

const Img = styled.img<{ disable: boolean }>`
  height: 18px;
  width: 24px;
  margin: 0;
  padding: 10px 8px;
  visibility: ${({ disable }) => disable && 'hidden'};
  cursor: ${({ disable }) => (disable ? 'default' : 'pointer')};
`;

const SettingsButton = ({ onClick, disable }) => {
  return (
    <Img
      id="settingsButton"
      disable={disable}
      src={settings}
      onClick={onClick}
    />
  );
};

export default SettingsButton;
