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
  width: 250px;
  height: 250px;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.6;
  pointer-events: none;
  z-index: 0;

  ${media.tablet`
    width: 320px;
    height: 320px;
    filter: blur(70px);
  `}

  ${media.wide`
    width: 400px;
    height: 400px;
    filter: blur(80px);
  `}
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
  padding: 40px 20px 64px;
  position: relative;
  z-index: 10;

  ${media.tablet`
    padding: 60px 32px 96px;
  `}

  ${media.wide`
    padding: 80px 32px 128px;
  `}
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;

  ${media.tablet`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 60px;
  `}

  ${media.wide`
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
  height: 40px;
  margin-bottom: 20px;

  ${media.tablet`
    height: 48px;
    margin-bottom: 24px;
  `}

  ${media.wide`
    height: 56px;
  `}
`;

const Headline = styled.h1`
  font-size: 32px;
  font-weight: 800;
  margin: 0 0 16px;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #0f172a;
  
  span {
    background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  ${media.tablet`
    font-size: 42px;
    margin: 0 0 24px;
  `}

  ${media.wide`
    font-size: 56px;
  `}
`;

const SubHeadline = styled.p`
  font-size: 15px;
  color: #64748b;
  margin: 0 0 24px;
  line-height: 1.6;
  font-weight: 500;

  ${media.tablet`
    font-size: 16px;
    margin: 0 0 32px;
  `}

  ${media.wide`
    font-size: 18px;
    margin: 0 0 40px;
  `}
`;

const QRCard = styled.div`
  background: #ffffff;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  border: 1px solid #e2e8f0;
  position: relative;
  animation: float 4s ease-in-out infinite;
  width: 100%;
  max-width: 320px;

  ${media.tablet`
    border-radius: 24px;
    padding: 36px;
    gap: 24px;
    max-width: 380px;
  `}

  ${media.wide`
    padding: 48px;
    max-width: 420px;
  `}
`;

const QRFrame = styled.div`
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;

  ${media.tablet`
    padding: 14px;
    border-radius: 14px;
  `}

  ${media.wide`
    padding: 16px;
    border-radius: 16px;
  `}
`;

const QRImage = styled.img`
  width: 180px;
  height: 180px;
  display: block;
  border-radius: 8px;

  ${media.tablet`
    width: 220px;
    height: 220px;
    border-radius: 10px;
  `}

  ${media.wide`
    width: 280px;
    height: 280px;
    border-radius: 12px;
  `}
`;

const QRLoader = styled.div`
  width: 180px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 12px;

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #e2e8f0;
    border-top-color: #14b8a6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  ${media.tablet`
    width: 220px;
    height: 220px;
    border-radius: 14px;

    .spinner {
      width: 42px;
      height: 42px;
    }
  `}

  ${media.wide`
    width: 280px;
    height: 280px;
    border-radius: 16px;

    .spinner {
      width: 48px;
      height: 48px;
      border-width: 4px;
    }
  `}

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`;

const StepsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
  margin: 24px 0;
  width: 100%;

  ${media.tablet`
    gap: 20px;
    justify-content: flex-start;
    margin: 28px 0;
  `}

  ${media.wide`
    gap: 32px;
    margin: 32px 0;
  `}
`;

const StepItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  
  .icon-box {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: #f0fdfa;
    border: 1px solid #99f6e4;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #14b8a6;
  }

  span {
    color: #64748b;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  ${media.tablet`
    .icon-box {
      width: 44px;
      height: 44px;
      border-radius: 11px;
    }
    span { font-size: 12px; }
  `}

  ${media.wide`
    gap: 12px;
    .icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
    }
    span { font-size: 13px; }
  `}
`;

const StepDivider = styled.div`
  width: 24px;
  height: 2px;
  background: linear-gradient(to right, #e2e8f0, transparent);

  ${media.tablet`
    width: 32px;
  `}

  ${media.wide`
    width: 48px;
  `}
`;

const StatusPill = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  border-radius: 100px;
  backdrop-filter: blur(8px);
  margin-top: 20px;

  .dot {
    width: 8px;
    height: 8px;
    background: #14b8a6;
    border-radius: 50%;
    animation: pulse 2s infinite;
    flex-shrink: 0;
  }
  
  span {
    color: #0d9488;
    font-size: 13px;
    font-weight: 600;
  }

  ${media.tablet`
    gap: 12px;
    padding: 12px 24px;
    margin-top: 24px;
    .dot { width: 10px; height: 10px; }
    span { font-size: 14px; }
  `}
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;

// ── Component ────────────────────────────────────────────────────────────────

interface KioskPayStageProps {
  qrDataUrl: string | null;
  stage: 'idle' | 'waiting_pay';
  sessionId: string | null;
  onSimulatePayment?: () => void;
}

const KioskPayStage: React.FC<KioskPayStageProps> = ({ qrDataUrl, stage, sessionId, onSimulatePayment }) => {
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
              <span>In 50 Seconds.</span>
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
              <p style={{ margin: 0, fontSize: 15, color: '#0f172a', fontWeight: 700 }}>
                Scan to Get Started
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                Secure scan via your smartphone
              </p>
            </div>

            {stage === 'waiting_pay' && qrDataUrl && (
              <StatusPill>
                <div className="dot" />
                <span>Awaiting payment confirmation...</span>
              </StatusPill>
            )}

            {sessionId && onSimulatePayment && (
              <button
                onClick={onSimulatePayment}
                style={{
                  marginTop: 16,
                  width: '100%',
                  padding: '10px 20px',
                  borderRadius: 12,
                  border: '2px dashed #fbbf24',
                  background: '#fffbeb',
                  color: '#b45309',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >
                Simulate Payment (Dev Only)
              </button>
            )}
          </QRCard>
        </MainContent>

        {/* Features Section - similar to footer on LandingPage */}
        <div style={{
          marginTop: 40,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 10,
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#64748b',
              fontSize: 13,
              fontWeight: 600,
              padding: '6px 12px',
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
