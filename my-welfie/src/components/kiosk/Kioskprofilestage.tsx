// src/components/kiosk/KioskProfileStage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Kiosk profile form — visually polished for all display sizes.
// Refined for high-accuracy layout on tablets, laptops, and large kiosk screens.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ArrowRight, ShieldPlus, User } from 'lucide-react';
import logoSrc from '../../assets/mywellfie-logo.png';
import media from '../../style/media';

// ── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  TEAL: '#14b8a6',
  TEAL_DARK: '#0f766e',
  TEAL_FOCUS: 'rgba(15,118,110,0.12)',
  SLATE900: '#0f172a',
  SLATE500: '#64748b',
  SLATE400: '#94a3b8',
  SLATE200: '#e2e8f0',
  SLATE100: '#f1f5f9',
  RED600: '#dc2626',
  RED300: '#fca5a5',
  RED50: '#fffafa',
  WHITE: '#ffffff',
  GREEN600: '#16a34a',
  GREEN50: '#f0fdf4',
  GREEN200: '#bbf7d0',
};

const FONT = "'Hanken Grotesk','Segoe UI',sans-serif";

// ── Styled Components ────────────────────────────────────────────────────────

const PageWrapper = styled.div`
  min-height: 100dvh;
  background: ${COLORS.WHITE};
  display: flex;
  flex-direction: column;
  font-family: ${FONT};
`;

const Header = styled.header`
  background: ${COLORS.WHITE};
  border-bottom: 1px solid ${COLORS.SLATE200};
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
`;

const ContentArea = styled.main`
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

const FormContainer = styled.div`
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  padding: 32px 24px 80px;
  
  ${media.tablet`
    padding: 48px 40px 100px;
  `}
`;

const IconCircle = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${COLORS.SLATE100};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 800;
  color: ${COLORS.SLATE900};
  margin: 0 0 12px;
  letter-spacing: -0.02em;
  line-height: 1.15;
  
  ${media.tablet`
    font-size: 40px;
  `}
`;

const Description = styled.p`
  font-size: 16px;
  color: ${COLORS.SLATE500};
  line-height: 1.6;
  margin: 0 0 16px;
  max-width: 520px;
`;

const List = styled.ul`
  margin: 0 0 32px;
  padding: 0;
  list-style: none;
  font-size: 14px;
  color: ${COLORS.SLATE400};
  line-height: 1.8;
`;

const ListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 10px;
  
  &::before {
    content: "●";
    color: ${COLORS.TEAL_DARK};
    font-size: 8px;
  }
`;

const SectionLabel = styled.p`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${COLORS.SLATE400};
  margin-bottom: 12px;
`;

const Input = styled.input<{ hasError?: boolean }>`
  width: 100%;
  box-sizing: border-box;
  padding: 16px 14px;
  font-size: 16px;
  font-weight: 600;
  border: 1.5px solid ${p => p.hasError ? COLORS.RED300 : 'transparent'};
  border-radius: 14px;
  outline: none;
  background: ${p => p.hasError ? COLORS.RED50 : COLORS.SLATE100};
  color: ${COLORS.SLATE900};
  font-family: ${FONT};
  transition: all 0.2s ease;

  &:focus {
    border-color: ${p => p.hasError ? COLORS.RED300 : COLORS.TEAL_DARK};
    box-shadow: ${p => p.hasError ? 'none' : `0 0 0 4px ${COLORS.TEAL_FOCUS}`};
    background: ${p => p.hasError ? COLORS.RED50 : COLORS.WHITE};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 16px 44px 16px 16px;
  font-size: 16px;
  font-weight: 600;
  border: 1.5px solid transparent;
  border-radius: 14px;
  outline: none;
  box-sizing: border-box;
  color: ${COLORS.SLATE900};
  font-family: ${FONT};
  background: ${COLORS.SLATE100} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 16px center;
  cursor: pointer;
  appearance: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: ${COLORS.TEAL_DARK};
    background-color: ${COLORS.WHITE};
  }
`;

const ErrorText = styled.p`
  font-size: 13px;
  color: ${COLORS.RED600};
  margin-top: 8px;
  font-weight: 500;
`;

const HintText = styled.p`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${COLORS.SLATE400};
  margin-top: 8px;
`;

const PrimaryButton = styled.button<{ disabled?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px 0;
  font-size: 17px;
  font-weight: 700;
  color: ${COLORS.WHITE};
  background: ${p => p.disabled ? COLORS.SLATE400 : COLORS.TEAL_DARK};
  border: none;
  border-radius: 16px;
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  font-family: ${FONT};
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.15);

  &:hover:not(:disabled) {
    background: ${COLORS.TEAL};
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(15, 118, 110, 0.2);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const GhostButton = styled.button`
  width: 100%;
  margin-top: 16px;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  color: ${COLORS.SLATE500};
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: ${FONT};
  border-radius: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.SLATE100};
    color: ${COLORS.SLATE900};
  }
`;

// ── Types ────────────────────────────────────────────────────────────────────
export type KioskSex      = 'male' | 'female' | 'unspecified';
export type KioskSmoking  = 'non_smoker' | 'smoker' | 'unspecified';
export type UnitSystem    = 'metric' | 'imperial';

export interface KioskProfileData {
  guest_name?:    string;
  email?:         string;
  sex?:           KioskSex;
  date_of_birth?: string;
  height_cm?:     number;
  weight_kg?:     number;
  smoking_status?: KioskSmoking;
}

interface Props {
  sessionEmail?: string | null;
  onContinue: (data: KioskProfileData) => void;
  onSkip: () => void;
  saving?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseDob(raw: string): Date | null {
  let m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}`);
  return isNaN(d.getTime()) ? null : d;
}

function ageFrom(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
  ) age--;
  return age;
}

const lbsToKg = (lbs: number) => lbs * 0.453592;
const ftInToCm = (ft: number, inch: number) => (ft * 30.48) + (inch * 2.54);

// ── Sub-components ──────────────────────────────────────────────────────────

const SexCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const SexOptionButton = styled.button<{ active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 8px;
  min-height: 100px;
  border-radius: 18px;
  border: 2px solid ${p => p.active ? COLORS.TEAL_DARK : COLORS.SLATE200};
  background: ${p => p.active ? 'rgba(15, 118, 110, 0.05)' : COLORS.WHITE};
  color: ${p => p.active ? COLORS.TEAL_DARK : COLORS.SLATE900};
  cursor: pointer;
  font-family: ${FONT};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${p => p.active ? COLORS.TEAL_DARK : COLORS.SLATE400};
    transform: translateY(-2px);
  }

  span {
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
  }
`;

function SexCards({ value, onChange }: { value: KioskSex | null; onChange: (v: KioskSex) => void }) {
  const options: { value: KioskSex; label: string; icon: any }[] = [
    {
      value: 'male', label: 'Male',
      icon: (active: boolean) => (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none"
          stroke={active ? COLORS.TEAL_DARK : COLORS.SLATE500} strokeWidth="2.5" strokeLinecap="round">
          <circle cx="10" cy="14" r="5" />
          <path d="M15 9l5-5M20 4h-5M20 4v5" />
        </svg>
      ),
    },
    {
      value: 'female', label: 'Female',
      icon: (active: boolean) => (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none"
          stroke={active ? COLORS.TEAL_DARK : COLORS.SLATE500} strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="9" r="5" />
          <path d="M12 14v7M9 18h6" />
        </svg>
      ),
    },
    {
      value: 'unspecified', label: 'Prefer not',
      icon: (active: boolean) => <User size={24} color={active ? COLORS.TEAL_DARK : COLORS.SLATE500} strokeWidth={2.5} />,
    },
  ];

  return (
    <SexCardGrid>
      {options.map(({ value: opt, label, icon }) => {
        const active = value === opt;
        return (
          <SexOptionButton key={opt} type="button" active={active} onClick={() => onChange(opt)}>
            {icon(active)}
            <span>
              {label === 'Prefer not' ? <>Prefer not<br/>to say</> : label}
            </span>
          </SexOptionButton>
        );
      })}
    </SexCardGrid>
  );
}

const SuffixInputWrapper = styled.div<{ focused: boolean; hasError?: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  background: ${p => p.hasError ? COLORS.RED50 : p.focused ? COLORS.WHITE : COLORS.SLATE100};
  border-radius: 14px;
  border: 1.5px solid ${p => p.hasError ? COLORS.RED300 : p.focused ? COLORS.TEAL_DARK : 'transparent'};
  box-shadow: ${p => p.focused && !p.hasError ? `0 0 0 4px ${COLORS.TEAL_FOCUS}` : 'none'};
  overflow: hidden;
  transition: all 0.2s ease;

  input {
    flex: 1;
    min-width: 0;
    padding: 16px 14px;
    font-size: 16px;
    font-weight: 600;
    border: none;
    outline: none;
    background: transparent;
    color: ${COLORS.SLATE900};
    font-family: ${FONT};
  }

  span {
    padding: 0 16px 0 4px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: ${COLORS.SLATE400};
    flex-shrink: 0;
  }
`;

function SuffixInput({
  value, onChange, onBlur, suffix, placeholder, hasError, type = 'number', inputMode,
}: {
  value: string; onChange: (v: string) => void; onBlur?: () => void;
  suffix: string; placeholder?: string; hasError?: boolean;
  type?: string; inputMode?: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <SuffixInputWrapper focused={focused} hasError={hasError}>
      <input
        type={type} inputMode={inputMode} value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur?.(); }}
        placeholder={placeholder}
      />
      <span>{suffix}</span>
    </SuffixInputWrapper>
  );
}

const ToggleContainer = styled.div`
  display: inline-flex;
  background: ${COLORS.SLATE100};
  padding: 5px;
  border-radius: 12px;
  margin-bottom: 20px;
`;

const ToggleButton = styled.button<{ active: boolean }>`
  padding: 8px 20px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
  text-transform: capitalize;
  border: none;
  cursor: pointer;
  font-family: ${FONT};
  background: ${p => p.active ? COLORS.WHITE : 'transparent'};
  color: ${p => p.active ? COLORS.TEAL_DARK : COLORS.SLATE500};
  box-shadow: ${p => p.active ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: ${p => p.active ? COLORS.TEAL_DARK : COLORS.SLATE900};
  }
`;

function UnitToggle({ value, onChange }: { value: UnitSystem; onChange: (v: UnitSystem) => void }) {
  return (
    <ToggleContainer>
      {(['metric', 'imperial'] as UnitSystem[]).map(sys => (
        <ToggleButton key={sys} type="button" active={value === sys} onClick={() => onChange(sys)}>
          {sys}
        </ToggleButton>
      ))}
    </ToggleContainer>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function KioskProfileStage({ sessionEmail, onContinue, onSkip, saving = false }: Props) {
  const [guestName,     setGuestName]     = useState('');
  const [email,         setEmail]         = useState(sessionEmail || '');
  const [sex,           setSex]           = useState<KioskSex | null>(null);
  const [dob,           setDob]           = useState('');
  const [unitSystem,    setUnitSystem]    = useState<UnitSystem>('metric');
  
  const [heightCm,      setHeightCm]      = useState('');
  const [weightKg,      setWeightKg]      = useState('');
  const [heightFt,      setHeightFt]      = useState('');
  const [heightIn,      setHeightIn]      = useState('');
  const [weightLbs,     setWeightLbs]     = useState('');

  const [smoking,       setSmoking]       = useState<KioskSmoking>('unspecified');
  const [submitted,     setSubmitted]     = useState(false);

  const dobParsed  = useMemo(() => parseDob(dob), [dob]);
  const dobAge     = useMemo(() => dobParsed ? ageFrom(dobParsed) : null, [dobParsed]);
  const dobError   = useMemo(() => {
    if (!dob.trim()) return null;
    if (!dobParsed) return 'Enter a valid date of birth';
    if (dobAge !== null && (dobAge < 18 || dobAge > 110)) return 'Age must be between 18 and 110 years';
    return null;
  }, [dob, dobParsed, dobAge]);

  const heightError = useMemo(() => {
    if (unitSystem === 'metric') {
      if (!heightCm.trim()) return null;
      const h = parseFloat(heightCm);
      if (isNaN(h) || h < 50 || h > 250) return 'Height must be between 50 and 250 cm';
    } else {
      if (!heightFt.trim() && !heightIn.trim()) return null;
      const ft = parseInt(heightFt) || 0;
      const inc = parseInt(heightIn) || 0;
      const totalCm = ftInToCm(ft, inc);
      if (totalCm < 50 || totalCm > 250) return 'Height must be between 1\'8" and 8\'2"';
    }
    return null;
  }, [unitSystem, heightCm, heightFt, heightIn]);

  const weightError = useMemo(() => {
    if (unitSystem === 'metric') {
      if (!weightKg.trim()) return null;
      const w = parseFloat(weightKg);
      if (isNaN(w) || w < 20 || w > 300) return 'Weight must be between 20 and 300 kg';
    } else {
      if (!weightLbs.trim()) return null;
      const lbs = parseFloat(weightLbs);
      const kg = lbsToKg(lbs);
      if (kg < 20 || kg > 300) return 'Weight must be between 44 and 660 lbs';
    }
    return null;
  }, [unitSystem, weightKg, weightLbs]);

  const hasErrors = !!(dobError || heightError || weightError);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;

    const data: KioskProfileData = {};
    if (guestName.trim())  data.guest_name    = guestName.trim();
    if (email.trim())      data.email         = email.trim();
    if (sex)               data.sex           = sex;
    if (dob.trim() && !dobError) {
      data.date_of_birth = dob.trim();
    }

    if (unitSystem === 'metric') {
      if (heightCm.trim()) data.height_cm = parseFloat(heightCm);
      if (weightKg.trim()) data.weight_kg = parseFloat(weightKg);
    } else {
      if (heightFt.trim() || heightIn.trim()) {
        data.height_cm = Math.round(ftInToCm(parseInt(heightFt) || 0, parseInt(heightIn) || 0));
      }
      if (weightLbs.trim()) {
        data.weight_kg = Math.round(lbsToKg(parseFloat(weightLbs)) * 10) / 10;
      }
    }
    if (smoking !== 'unspecified') data.smoking_status = smoking;

    onContinue(data);
  }

  return (
    <PageWrapper>
      <Header>
        <img src={logoSrc} alt="MyWellfie" style={{ height: 40, objectFit: 'contain' }} />
        <div style={{
          fontSize: 14, fontWeight: 700, color: COLORS.GREEN600,
          background: COLORS.GREEN50, border: `1px solid ${COLORS.GREEN200}`,
          borderRadius: 24, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6
        }}>
          <span>✓</span> Payment confirmed
        </div>
      </Header>

      <ContentArea>
        <FormContainer>
          <IconCircle>
            <ShieldPlus size={36} color={COLORS.TEAL_DARK} strokeWidth={2.2} />
          </IconCircle>

          <Title>Health profile</Title>
          <Description>
            A few details help us calculate Heart Age and cardiovascular risk more accurately during your scan.
          </Description>
          
          <List>
            <ListItem>All fields are optional</ListItem>
            <ListItem>Used only to personalise your scan results</ListItem>
          </List>

          <form onSubmit={handleSubmit} noValidate>
            
            {/* ── Name ── */}
            <div style={{ marginBottom: 32 }}>
              <SectionLabel>Your name</SectionLabel>
              <Input
                type="text" value={guestName} onChange={e => setGuestName(e.target.value)}
                placeholder="e.g. Alex"
              />
            </div>

            {/* ── Email ── */}
            <div style={{ marginBottom: 32 }}>
              <SectionLabel>Email address</SectionLabel>
              <Input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <HintText style={{ color: COLORS.SLATE400, textTransform: 'none', fontSize: 13, marginTop: 8 }}>
                We'll email your full PDF report here after the scan
              </HintText>
            </div>

            {/* ── Sex ── */}
            <div style={{ marginBottom: 32 }}>
              <SectionLabel>Sex at birth</SectionLabel>
              <SexCards value={sex} onChange={setSex} />
            </div>

            {/* ── DOB ── */}
            <div style={{ marginBottom: 32 }}>
              <SectionLabel>Date of birth</SectionLabel>
              <Input
                type="date" value={dob}
                onChange={e => setDob(e.target.value)}
                hasError={!!(submitted && dobError)}
                min={new Date(new Date().setFullYear(new Date().getFullYear() - 110)).toISOString().slice(0, 10)}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0, 10)}
              />
              {submitted && dobError ? (
                <ErrorText>{dobError}</ErrorText>
              ) : (
                <HintText style={{ textTransform: 'none' }}>
                  {dobAge !== null && !dobError ? `Age detected: ${dobAge} years` : `Age 18–110 years`}
                </HintText>
              )}
            </div>

            {/* ── Body measurements ── */}
            <div style={{ marginBottom: 32 }}>
              <SectionLabel>Body measurements</SectionLabel>
              <UnitToggle value={unitSystem} onChange={setUnitSystem} />
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
              }}>
                {unitSystem === 'metric' ? (
                  <>
                    <div>
                      <SuffixInput
                        value={heightCm} onChange={setHeightCm}
                        suffix="CM" placeholder="172" type="number" inputMode="decimal"
                        hasError={!!(submitted && heightError)}
                      />
                      {submitted && heightError ? <ErrorText>{heightError}</ErrorText> : <HintText>Range: 50–250 CM</HintText>}
                    </div>
                    <div>
                      <SuffixInput
                        value={weightKg} onChange={setWeightKg}
                        suffix="KG" placeholder="70" type="number" inputMode="decimal"
                        hasError={!!(submitted && weightError)}
                      />
                      {submitted && weightError ? <ErrorText>{weightError}</ErrorText> : <HintText>Range: 20–300 KG</HintText>}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <SuffixInput
                          value={heightFt} onChange={setHeightFt}
                          suffix="FT" placeholder="5" type="number" inputMode="numeric"
                          hasError={!!(submitted && heightError)}
                        />
                        <SuffixInput
                          value={heightIn} onChange={setHeightIn}
                          suffix="IN" placeholder="8" type="number" inputMode="numeric"
                          hasError={!!(submitted && heightError)}
                        />
                      </div>
                      {submitted && heightError && <ErrorText>{heightError}</ErrorText>}
                    </div>
                    <div>
                      <SuffixInput
                        value={weightLbs} onChange={setWeightLbs}
                        suffix="LBS" placeholder="155" type="number" inputMode="decimal"
                        hasError={!!(submitted && weightError)}
                      />
                      {submitted && weightError ? <ErrorText>{weightError}</ErrorText> : <HintText>Range: 44–660 LBS</HintText>}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Smoking ── */}
            <div style={{ marginBottom: 40 }}>
              <SectionLabel>Smoking status</SectionLabel>
              <Select value={smoking} onChange={e => setSmoking(e.target.value as KioskSmoking)}>
                <option value="unspecified">Prefer not to say</option>
                <option value="non_smoker">Never / non-smoker</option>
                <option value="smoker">Current smoker</option>
              </Select>
            </div>

            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Saving details…' : 'Save and continue'}
              {!saving && <ArrowRight size={20} strokeWidth={2.5} />}
            </PrimaryButton>

            <GhostButton type="button" onClick={onSkip} disabled={saving}>
              Skip — go straight to scan
            </GhostButton>
          </form>

          <footer style={{ marginTop: 48, borderTop: `1px solid ${COLORS.SLATE100}`, paddingTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: COLORS.SLATE400, lineHeight: 1.6 }}>
              © 2024 MyWellfie. All health data is securely encrypted<br/>and processed in compliance with HIPAA standards.
            </p>
          </footer>
        </FormContainer>
      </ContentArea>
    </PageWrapper>
  );
}
