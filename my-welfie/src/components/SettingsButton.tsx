import React from 'react';
import styled from 'styled-components';
import { Menu } from 'lucide-react';

const Button = styled.button`
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
  flex-shrink: 0;

  &:hover {
    background: #f1f5f9;
    color: #14b8a6;
  }
`;

const SettingsButton = ({ onClick }) => {
  return (
    <Button
      type="button"
      id="settingsButton"
      onClick={onClick}
      title="Settings menu"
      aria-label="Settings menu"
    >
      <Menu size={20} strokeWidth={2} />
    </Button>
  );
};

export default SettingsButton;
