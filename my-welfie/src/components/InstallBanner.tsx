import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const Banner = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: #0f172a;
  color: #fff;
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  display: flex;
  align-items: center;
  gap: 14px;
  font-family: 'Hanken Grotesk', 'Segoe UI', sans-serif;
  box-shadow: 0 -4px 24px rgba(0,0,0,0.3);
  animation: slideUp 0.35s ease-out;

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;

const Icon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 2px;
`;

const Subtitle = styled.div`
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
`;

const InstallButton = styled.button`
  background: #14b8a6;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.15s;

  &:hover { background: #0f766e; }
`;

const DismissButton = styled.button`
  background: transparent;
  color: #64748b;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  padding: 2px 0;
  text-align: center;

  &:hover { color: #94a3b8; }
`;

const isIOSSafari = (): boolean => {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);
};

const isStandalone = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
};

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isIOSSafari() && !isStandalone()) {
      const dismissed = localStorage.getItem('welfie-install-dismissed');
      if (!dismissed) setVisible(true);
    }
  }, []);

  const handleInstall = () => {
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('welfie-install-dismissed', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Banner>
      <Icon>W</Icon>
      <Content>
        <Title>Install Welfie</Title>
        <Subtitle>
          Tap the Share button <span style={{ fontSize: 15 }}>⎋</span> then scroll down and tap{' '}
          <strong>Add to Home Screen</strong>.
        </Subtitle>
      </Content>
      <Actions>
        <InstallButton onClick={handleInstall}>Got it</InstallButton>
        <DismissButton onClick={handleDismiss}>Don't show again</DismissButton>
      </Actions>
    </Banner>
  );
}
