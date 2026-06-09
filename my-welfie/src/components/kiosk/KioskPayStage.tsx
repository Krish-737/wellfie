// src/components/kiosk/KioskPayStage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Kiosk PayStage (The "Attract Mode")
// Designed for large kiosk displays with a premium, high-fidelity aesthetic.
// Guides users through the Scan -> Pay -> Measure flow.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import styled, { keyframes } from 'styled-components';
import logoSrc from '../../assets/mywellfie-logo.png';
import { Smartphone, CreditCard, ScanFace, CheckCircle2 } from 'lucide-react';
import media from '../../style/media';

// ── Animations ───────────────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.4); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 30px rgba(20, 184, 166, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(20, 184, 166, 0); }
`;

const floating = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
`;

// ── Styled Components ────────────────────────────────────────────────────────

const PageWrapper = styled.div`
  position: relative;
  min-height: 100dvh;
  background: #ffffff;
  overflow-y: auto;
  overflow-x: hidden;
  color: #0f172a;
  font-family: 'Hanken Grotesk', 'Segoe UI', sans-serif;
`;

const BackgroundBlob = styled.div`
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  pointer-events: none;
  z-index: 0;
`;

const BlobTopRight = styled(BackgroundBlob)`
  top: -100px;
  right: -100px;
  background: #f0fdfa;
  mix-blend-mode: multiply;
`;

const BlobBottomLeft = styled(BackgroundBlob)`
  bottom: -100px;
  left: -100px;
  background: #eff6ff;
  mix-blend-mode: multiply;
`;

const InnerContainer = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 80px 32px 128px;
  position: relative;
  z-index: 10;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 60px;

  ${media.tablet`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 80px;
  `}
`;

const LeftSide = styled.div`
  text-align: center;
  flex: 1;

  ${media.tablet`
    text-align: left;
    max-width: 540px;
  `}
`;

const Logo = styled.img`
  height: 56px;
  margin-bottom: 24px;
`;

const Headline = styled.h1`
  font-size: 42px;
  font-weight: 800;
  margin: 0 0 24px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #0f172a;
  
  span {
    background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  ${media.tablet`
    font-size: 56px;
  `}
`;

const SubHeadline = styled.p`
  font-size: 18px;
  color: #64748b;
  margin: 0 0 40px;
  line-height: 1.6;
  font-weight: 500;
`;

const QRCard = styled.div`
  background: #ffffff;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  border: 1px solid #e2e8f0;
  position: relative;
  animation: float 4s ease-in-out infinite;
  width: 100%;
  max-width: 360px;

  ${media.tablet`
    padding: 48px;
    max-width: 420px;
  `}
`;

const QRFrame = styled.div`
  padding: 16px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
`;

const QRImage = styled.img`
  width: 240px;
  height: 240px;
  display: block;
  border-radius: 12px;

  ${media.wide`
    width: 280px;
    height: 280px;
  `}
`;

const QRLoader = styled.div`
  width: 240px;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 16px;

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e2e8f0;
    border-top-color: #14b8a6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`;

const StepsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: center;
  margin: 32px 0;
  width: 100%;

  ${media.tablet`
    justify-content: flex-start;
    gap: 32px;
  `}
`;

const StepItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex: 1;
  
  .icon-box {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #f0fdfa;
    border: 1px solid #99f6e4;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #14b8a6;
  }

  span {
    color: #64748b;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const StepDivider = styled.div`
  width: 40px;
  height: 2px;
  background: linear-gradient(to right, #e2e8f0, transparent);

  ${media.tablet`
    width: 48px;
  `}
`;

const StatusPill = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  border-radius: 100px;
  backdrop-filter: blur(8px);
  margin-top: 24px;

  .dot {
    width: 10px;
    height: 10px;
    background: #14b8a6;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  
  span {
    color: #0d9488;
    font-size: 14px;
    font-weight: 600;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;

// ── Component ────────────────────────────────────────────────────────────────

interface KioskPayStageProps {
  qrDataUrl: string | null;
  stage: 'idle' | 'waiting_pay';
}

const KioskPayStage: React.FC<KioskPayStageProps> = ({ qrDataUrl, stage }) => {
  const features = [
    { icon: '✓', text: 'No App Required' },
    { icon: '✓', text: 'HIPAA Compliant' },
    { icon: '✓', text: 'Instant PDF Report' },
    { icon: '✓', text: 'AI Analysis' },
  ];

  return (
    <PageWrapper>
      <BlobTopRight />
      <BlobBottomLeft />

      <InnerContainer>
        <MainContent>
          <LeftSide>
            <Logo src={logoSrc} alt="MyWellfie" />
            <Headline>
              Clinical Vitals.<br />
              <span>In 90 Seconds.</span>
            </Headline>
            <SubHeadline>
              Experience the future of health screening. Access 34+ biometric 
              markers including BP, Stress, and Heart Age using clinical-grade 
              facial hemodynamic analysis.
            </SubHeadline>
            
            <StepsRow>
              <StepItem>
                <div className="icon-box"><Smartphone size={20} strokeWidth={2.5} /></div>
                <span>1. Scan</span>
              </StepItem>
              <StepDivider />
              <StepItem>
                <div className="icon-box"><CreditCard size={20} strokeWidth={2.5} /></div>
                <span>2. Pay</span>
              </StepItem>
              <StepDivider />
              <StepItem>
                <div className="icon-box"><ScanFace size={20} strokeWidth={2.5} /></div>
                <span>3. Measure</span>
              </StepItem>
            </StepsRow>
          </LeftSide>

          <QRCard>
            <QRFrame>
              {qrDataUrl ? (
                <QRImage src={qrDataUrl} alt="Scan to start" />
              ) : (
                <QRLoader>
                  <div className="spinner" />
                </QRLoader>
              )}
            </QRFrame>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 700 }}>
                Scan to Get Started
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                Secure scan via your smartphone
              </p>
            </div>

            {stage === 'waiting_pay' && qrDataUrl && (
              <StatusPill>
                <div className="dot" />
                <span>Awaiting payment confirmation...</span>
              </StatusPill>
            )}
          </QRCard>
        </MainContent>

        {/* Features Section - similar to footer on LandingPage */}
        <div style={{
          marginTop: 64,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 16,
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#64748b',
              fontSize: 15,
              fontWeight: 600,
              padding: '8px 16px',
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}>
              <span style={{ color: '#14b8a6' }}>{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </InnerContainer>
    </PageWrapper>
  );
};

export default KioskPayStage;
