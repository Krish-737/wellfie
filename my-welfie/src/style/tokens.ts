/** Shared layout and design tokens — single source for breakpoints and spacing. */
export const bp = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export const layout = {
  maxContent: 1200,
  maxNarrow: 720,
  maxForm: 560,
  headerMobile: 56,
  headerDesktop: 72,
  bottomNav: 56,
  /** Vertical space to reserve above bottom nav on mobile */
  bottomNavReserved: 56,
  pagePaddingMobile: 16,
  pagePaddingDesktop: 32,
  touchMin: 44,
} as const;

export const colors = {
  teal: '#14b8a6',
  tealDark: '#0f766e',
  slate900: '#0f172a',
  slate500: '#64748b',
  slate200: '#e2e8f0',
  pageBg: '#f8fafc',
  white: '#ffffff',
} as const;

/**
 * App font stack — single switch point.
 * Revert steps: see docs/FONT_REVERT.md
 */
export const fonts = {
  primary: "'Hanken Grotesk', 'Segoe UI', sans-serif",
  legacyRubik: 'Rubik, Segoe UI, sans-serif',
} as const;

/** Dashboard card typography — uses active app font. */
export const typography = {
  fontFamily: fonts.primary,
  eyebrow: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#94a3b8',
  },
  headline: {
    fontWeight: 800,
    color: colors.slate900,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  body: {
    fontWeight: 500,
    color: colors.slate500,
    lineHeight: 1.5,
  },
} as const;

export const mediaQuery = {
  mobile: `(max-width: ${bp.md - 1}px)`,
  tablet: `(min-width: ${bp.md}px) and (max-width: ${bp.lg - 1}px)`,
  desktop: `(min-width: ${bp.lg}px)`,
  tabletUp: `(min-width: ${bp.md}px)`,
  desktopUp: `(min-width: ${bp.lg}px)`,
} as const;
