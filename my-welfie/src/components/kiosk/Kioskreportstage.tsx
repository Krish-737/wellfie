// src/components/kiosk/Kioskreportstage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Kiosk report — REPLICATES the Dashboard "Health Overview" UI.
// Optimized for Kiosk with mandatory email collection and top-placed action.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useState } from 'react';
import { RefreshCw, CheckCircle, Mail, Send } from 'lucide-react';
import logoSrc from '../../assets/mywellfie-logo.png';
import LatestScanSummary from '../scan/LatestScanSummary';
import { type ScanResult } from '../../content/scanIndicators';
import { kioskPdfUrl } from '../../api/kioskApi';
import styled from 'styled-components';
import media from '../../style/media';

const COLORS = {
  TEAL_DARK: '#0f766e',
  TEAL: '#14b8a6',
  TEAL_FOCUS: 'rgba(15,118,110,0.12)',
  SLATE900: '#0f172a',
  SLATE500: '#64748b',
  SLATE400: '#94a3b8',
  SLATE100: '#f1f5f9',
  WHITE: '#ffffff',
  BG: '#f8fafc',
  GREEN600: '#16a34a',
};

const FONT = "'Hanken Grotesk','Segoe UI',sans-serif";

const PageWrapper = styled.div`
  min-height: 100dvh;
  background: ${COLORS.BG};
  font-family: ${FONT};
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  position: sticky;
  top: 0;
  z-index: 100;
  background: ${COLORS.WHITE};
  border-bottom: 1px solid #e2e8f0;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
`;

const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 16px 80px;
  
  ${media.tablet`
    padding: 32px 24px 100px;
  `}
`;

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;

const HeroCard = styled.div`
  background: linear-gradient(135deg, ${COLORS.TEAL_DARK} 0%, #0e9488 100%);
  border-radius: 24px;
  padding: 32px;
  color: ${COLORS.WHITE};
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(15,118,110,0.2);
`;

const EmailActionCard = styled.div`
  background: ${COLORS.WHITE};
  border-radius: 24px;
  padding: 28px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
  border: 1px solid #e2e8f0;
`;

const EmailInputWrapper = styled.div<{ focused: boolean }>`
  display: flex;
  align-items: center;
  background: ${p => p.focused ? COLORS.WHITE : COLORS.SLATE100};
  border: 2px solid ${p => p.focused ? COLORS.TEAL_DARK : 'transparent'};
  border-radius: 16px;
  padding: 4px 4px 4px 16px;
  transition: all 0.2s ease;
  box-shadow: ${p => p.focused ? `0 0 0 4px ${COLORS.TEAL_FOCUS}` : 'none'};

  input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    padding: 12px 0;
    font-size: 17px;
    font-weight: 600;
    font-family: ${FONT};
    color: ${COLORS.SLATE900};
    
    &::placeholder { color: ${COLORS.SLATE400}; }
  }
`;

const SendButton = styled.button`
  background: ${COLORS.TEAL_DARK};
  color: ${COLORS.WHITE};
  border: none;
  border-radius: 12px;
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
  font-family: ${FONT};

  &:hover:not(:disabled) {
    background: ${COLORS.TEAL};
    transform: translateY(-1px);
  }
  &:disabled {
    background: ${COLORS.SLATE400};
    cursor: not-allowed;
  }
`;

const StatusMsg = styled.div<{ isError?: boolean }>`
  margin-top: 14px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${p => p.isError ? '#fef2f2' : '#f0fdf4'};
  color: ${p => p.isError ? '#dc2626' : COLORS.GREEN600};
  border: 1px solid ${p => p.isError ? '#fecaca' : '#bbf7d0'};
`;

interface Props {
  scanResult:    any;
  sessionId:     string;
  sessionEmail?: string | null;
  guestName?:    string | null;
  onSendEmail:   (email: string) => Promise<void>;
  onDone:        () => void;
}

export default function KioskReportStage({ 
  scanResult, 
  sessionId,
  sessionEmail, 
  guestName, 
  onSendEmail, 
  onDone 
}: Props) {
  const [emailInput, setEmailInput] = useState(sessionEmail || '');
  const [isFocused, setIsFocused]   = useState(false);
  const [emailing, setEmailing]     = useState(false);
  const [emailMsg, setEmailMsg]     = useState<{ text: string, isError?: boolean } | null>(null);

  const handleSendEmail = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const target = emailInput.trim();
    if (!target) {
      setEmailMsg({ text: 'Please enter an email address to receive your report.', isError: true });
      return;
    }
    
    setEmailing(true);
    setEmailMsg(null);
    try {
      await onSendEmail(target);
      setEmailMsg({ text: `Success! Full report sent to ${target}` });
    } catch (e: any) {
      setEmailMsg({ text: e.message || 'Failed to send report. Please try again.', isError: true });
    } finally {
      setEmailing(false);
    }
  }, [emailInput, onSendEmail]);

  const firstName = guestName ? guestName.split(' ')[0] : 'there';

  return (
    <PageWrapper>
      <Header>
        <img src={logoSrc} alt="MyWellfie" style={{ height: 40, objectFit: 'contain' }} />
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#16a34a',
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 24, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6
        }}>
          <CheckCircle size={16} /> Scan Complete
        </div>
      </Header>

      <ScrollArea>
        <Container>
          <HeroCard>
            <p style={{ fontSize: 15, fontWeight: 600, opacity: 0.9, margin: '0 0 8px' }}>
              Your personalized health analysis
            </p>
            <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px', lineHeight: 1.15 }}>
              Great job, {firstName}!
            </h1>
            <p style={{ fontSize: 16, opacity: 0.85, lineHeight: 1.6, maxWidth: '540px' }}>
              We've processed 34 unique health indicators from your scan. Enter your email below to get your full clinical-grade health analysis sent instantly.
            </p>
          </HeroCard>

          {/* ── TOP ACTION: Email Collection ── */}
          <EmailActionCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.TEAL_FOCUS, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={22} color={COLORS.TEAL_DARK} strokeWidth={2.2} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: COLORS.SLATE900, margin: 0 }}>Get Your Digital Report</h3>
                <p style={{ fontSize: 13, color: COLORS.SLATE500, margin: '2px 0 0' }}>Includes all vitals, AI insights and PDF summary</p>
              </div>
            </div>

            <form onSubmit={handleSendEmail}>
              <EmailInputWrapper focused={isFocused}>
                <input 
                  type="email"
                  placeholder="Enter your email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
                <SendButton type="submit" disabled={emailing}>
                  {emailing ? 'Sending...' : 'Send Report'}
                  {!emailing && <Send size={16} strokeWidth={2.5} />}
                </SendButton>
              </EmailInputWrapper>
            </form>

            {emailMsg && (
              <StatusMsg isError={emailMsg.isError}>
                {emailMsg.isError ? '⚠️' : '✅'} {emailMsg.text}
              </StatusMsg>
            )}
          </EmailActionCard>

          {/* ── Replicated Dashboard UI ── */}
          <div style={{ 
            background: '#fff', 
            borderRadius: 24, 
            padding: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            marginBottom: 32
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.SLATE900, margin: '0 0 24px' }}>
              Health Overview
            </h2>
            
            <LatestScanSummary
              scan={scanResult as ScanResult}
              isMobile={false}
              allowExpand={true}
              // Hide internal buttons since we have the primary action at the top
              onEmailLatest={() => {}} 
              emailingLatest={false}
              emailMsg={null}
            />
          </div>

          <div style={{ textAlign: 'center', padding: '0 0 40px' }}>
            <button
              onClick={onDone}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '18px 48px', borderRadius: 18, border: 'none',
                background: COLORS.SLATE900, color: '#fff',
                fontSize: 18, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s', boxShadow: '0 10px 25px rgba(15,23,42,0.2)'
              }}
            >
              <RefreshCw size={20} />
              Clear & Start Over
            </button>
            <p style={{ marginTop: 20, fontSize: 14, color: COLORS.SLATE500 }}>
              The screen will automatically reset for the next user in 10 seconds.
            </p>
          </div>

          <footer style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: COLORS.SLATE400, lineHeight: 1.6 }}>
              © 2024 MyWellfie · Smart Scans. Health Insights. · Clinical Precision meets Lifestyle.<br/>
              All health data is encrypted and processed in compliance with HIPAA standards.
            </p>
          </footer>
        </Container>
      </ScrollArea>
    </PageWrapper>
  );
}
