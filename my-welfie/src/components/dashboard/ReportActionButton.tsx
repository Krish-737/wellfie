import React from 'react';
import { colors, typography } from '../../style/tokens';
import '../../styles/reportActionButton.css';

export const reportActionStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  color: colors.tealDark,
  borderRadius: 999,
  padding: '12px 16px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: typography.fontFamily,
  border: 'none',
};

interface ReportActionButtonProps {
  children: React.ReactNode;
  onClick?(): void;
  disabled?: boolean;
  style?: React.CSSProperties;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}

const ReportActionButton: React.FC<ReportActionButtonProps> = ({
  children,
  onClick,
  disabled = false,
  style,
  type = 'button',
  ariaLabel,
}) => (
  <button
    type={type}
    className="report-action-btn"
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    style={{
      ...reportActionStyle,
      ...style,
      cursor: disabled ? 'wait' : 'pointer',
    }}
  >
    {children}
  </button>
);

export default ReportActionButton;
