import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Sheet = styled.div`
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 28px 24px calc(28px + env(safe-area-inset-bottom, 0px));
  width: 100%;
  max-width: 420px;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.18);
  animation: sheetUp 0.35s ease;
  box-sizing: border-box;

  @keyframes sheetUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;

const AppRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
`;

const AppIcon = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
`;

const AppInfo = styled.div``;

const AppName = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
`;

const AppDesc = styled.div`
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
`;

const Description = styled.p`
  font-size: 14px;
  color: #334155;
  line-height: 1.5;
  margin: 0 0 20px;
`;

const Steps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
`;

const Step = styled.div`
  font-size: 14px;
  color: #0f172a;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    background: #14b8a6;
    border-radius: 50%;
    flex-shrink: 0;
  }
`;

const ShareIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #e2e8f0;
  font-size: 16px;
  font-weight: 700;
  color: #475569;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const InstallBtn = styled.button`
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: #0f766e;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;

  &:hover { background: #14b8a6; }
`;

const DismissBtn = styled.button`
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;

  &:hover { color: #0f172a; background: #f1f5f9; }
`;

interface InstallBannerProps {
  visible: boolean;
  onClose: () => void;
}

export default function InstallBanner({ visible, onClose }: InstallBannerProps) {
  const deferredPrompt = useRef<any>(null);
  const [mode, setMode] = useState<'ios' | 'chrome' | null>(null);

  useEffect(() => {
    if (!visible) { setMode(null); return; }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      if (mode === null) setMode('chrome');
    };
    window.addEventListener('beforeinstallprompt', handler);

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;

    if (isIOS && !isStandalone) {
      setMode('ios');
    } else if (deferredPrompt.current) {
      setMode('chrome');
    } else if (!('serviceWorker' in navigator)) {
      setMode(null);
    } else {
      setMode(null);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleChromeInstall = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const result = await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    if (result.outcome === 'accepted') onClose();
  };

  if (!visible || !mode) return null;

  if (mode === 'chrome') {
    return (
      <Overlay onClick={onClose}>
        <Sheet onClick={(e) => e.stopPropagation()}>
          <AppRow>
            <AppIcon>W</AppIcon>
            <AppInfo>
              <AppName>Welfie</AppName>
              <AppDesc>AI-powered health scanning</AppDesc>
            </AppInfo>
          </AppRow>
          <Description>
            Install Welfie on your device for quick access to health scans and insights.
          </Description>
          <Actions>
            <InstallBtn onClick={handleChromeInstall}>Install</InstallBtn>
            <DismissBtn onClick={onClose}>Not now</DismissBtn>
          </Actions>
        </Sheet>
      </Overlay>
    );
  }

  return (
    <Overlay onClick={onClose}>
      <Sheet onClick={(e) => e.stopPropagation()}>
        <AppRow>
          <AppIcon>W</AppIcon>
          <AppInfo>
            <AppName>Welfie</AppName>
            <AppDesc>AI-powered health scanning</AppDesc>
          </AppInfo>
        </AppRow>
        <Description>
          Tap the <ShareIcon>⎋</ShareIcon> Share button below, then scroll down and tap{' '}
          <strong>Add to Home Screen</strong>.
        </Description>
        <Steps>
          <Step>Tap Share <ShareIcon>⎋</ShareIcon></Step>
          <Step>Scroll down and tap <strong>Add to Home Screen</strong></Step>
          <Step>Tap <strong>Add</strong> in the top-right corner</Step>
        </Steps>
        <Actions>
          <DismissBtn onClick={onClose}>Got it</DismissBtn>
        </Actions>
      </Sheet>
    </Overlay>
  );
}
