/**
 * SafeHer — Midnight Indigo Design Tokens
 * ═══════════════════════════════════════════════════════════
 * Unified design tokens for mobile (React Native) and web (CSS).
 * Typography: Space Grotesk (headings) + DM Sans (body).
 */

// ── Color Palette ──────────────────────────────────────────

export const colors = {
  // Backgrounds
  bg:             '#0A0E1A',
  bgElevated:     '#111728',
  bgGradientStart: '#0D1321',
  bgGradientEnd:  '#1A2342',
  bgOverlay:      'rgba(10, 14, 26, 0.85)',

  // Surfaces
  surface:        'rgba(99, 102, 241, 0.06)',
  surfaceHover:   'rgba(99, 102, 241, 0.12)',
  surfaceActive:  'rgba(99, 102, 241, 0.18)',

  // Cards
  card:           '#131A2E',
  cardElevated:   '#182040',
  cardHover:      '#1C2650',

  // Borders
  border:         'rgba(99, 102, 241, 0.15)',
  borderActive:   'rgba(129, 140, 248, 0.5)',
  borderSubtle:   'rgba(99, 102, 241, 0.08)',

  // Primary — Indigo
  primary:        '#6366F1',
  primaryLight:   '#818CF8',
  primaryDark:    '#4F46E5',
  primaryGlow:    'rgba(99, 102, 241, 0.25)',
  primaryMuted:   'rgba(99, 102, 241, 0.15)',

  // Accent — Purple
  accent:         '#8B5CF6',
  accentLight:    '#A78BFA',
  accentGlow:     'rgba(139, 92, 246, 0.25)',

  // Semantic
  danger:         '#EF4444',
  dangerDark:     '#DC2626',
  dangerGlow:     'rgba(239, 68, 68, 0.3)',
  dangerMuted:    'rgba(239, 68, 68, 0.15)',

  success:        '#10B981',
  successDark:    '#059669',
  successGlow:    'rgba(16, 185, 129, 0.25)',
  successMuted:   'rgba(16, 185, 129, 0.15)',

  warning:        '#F59E0B',
  warningDark:    '#D97706',
  warningGlow:    'rgba(245, 158, 11, 0.25)',
  warningMuted:   'rgba(245, 158, 11, 0.15)',

  info:           '#3B82F6',
  infoDark:       '#2563EB',
  infoGlow:       'rgba(59, 130, 246, 0.25)',
  infoMuted:      'rgba(59, 130, 246, 0.15)',

  teal:           '#14B8A6',
  tealGlow:       'rgba(20, 184, 166, 0.25)',

  orange:         '#F97316',
  orangeGlow:     'rgba(249, 115, 22, 0.25)',

  // Text
  white:          '#FFFFFF',
  text:           '#F1F5F9',
  textSub:        '#94A3B8',
  textHint:       '#64748B',
  textDisabled:   '#475569',

  // Special
  black:          '#000000',
  transparent:    'transparent',
} as const;

// ── Typography ─────────────────────────────────────────────

export const fonts = {
  heading: 'SpaceGrotesk',
  headingWeights: {
    semibold: 'SpaceGrotesk-SemiBold',
    bold: 'SpaceGrotesk-Bold',
    medium: 'SpaceGrotesk-Medium',
  },
  body: 'DMSans',
  bodyWeights: {
    regular: 'DMSans-Regular',
    medium: 'DMSans-Medium',
    semibold: 'DMSans-SemiBold',
    bold: 'DMSans-Bold',
  },
} as const;

export const typography = {
  display:    { fontFamily: fonts.heading, fontSize: 32, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.5 },
  title:      { fontFamily: fonts.heading, fontSize: 24, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.3 },
  heading:    { fontFamily: fonts.heading, fontSize: 20, fontWeight: '600' as const, lineHeight: 28, letterSpacing: -0.2 },
  subheading: { fontFamily: fonts.heading, fontSize: 16, fontWeight: '600' as const, lineHeight: 24, letterSpacing: 0 },
  body:       { fontFamily: fonts.body,    fontSize: 15, fontWeight: '400' as const, lineHeight: 22, letterSpacing: 0 },
  bodyMedium: { fontFamily: fonts.body,    fontSize: 15, fontWeight: '500' as const, lineHeight: 22, letterSpacing: 0 },
  bodySmall:  { fontFamily: fonts.body,    fontSize: 13, fontWeight: '400' as const, lineHeight: 18, letterSpacing: 0 },
  caption:    { fontFamily: fonts.body,    fontSize: 11, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.3 },
  button:     { fontFamily: fonts.heading, fontSize: 15, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0.2 },
  tabLabel:   { fontFamily: fonts.body,    fontSize: 11, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.2 },
} as const;

// ── Spacing ────────────────────────────────────────────────

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

// ── Border Radius ──────────────────────────────────────────

export const radius = {
  xs:     6,
  sm:     10,
  md:     14,
  lg:     18,
  xl:     22,
  '2xl':  28,
  full:   999,
} as const;

// ── Shadows (React Native) ────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  }),
  dangerGlow: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  primaryGlow: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;

// ── Sizes ──────────────────────────────────────────────────

export const sizes = {
  // Buttons
  sosButton: 184,
  primaryButtonHeight: 56,
  secondaryButtonHeight: 48,
  iconButtonSize: 44,

  // Touch targets (WCAG)
  minTouchTarget: 44,

  // Tab bar
  tabBarHeight: 70,
  tabBarHeightIOS: 88,

  // Icons
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 32,

  // Status indicators
  statusDot: 8,
  statusDotLg: 12,
} as const;

// ── Animations ─────────────────────────────────────────────

export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: { tension: 200, friction: 20 },
  sos: {
    pulseMinScale: 0.95,
    pulseMaxScale: 1.05,
    pulseInterval: 1500,
    glowMinOpacity: 0.3,
    glowMaxOpacity: 0.7,
  },
  button: {
    pressScale: 0.96,
  },
} as const;

// ── Web-specific CSS custom properties (for Next.js) ──────

export const cssVariables = `
:root {
  /* Backgrounds */
  --bg: ${colors.bg};
  --bg-elevated: ${colors.bgElevated};
  --bg-gradient-start: ${colors.bgGradientStart};
  --bg-gradient-end: ${colors.bgGradientEnd};
  --bg-overlay: ${colors.bgOverlay};

  /* Surfaces */
  --surface: ${colors.surface};
  --surface-hover: ${colors.surfaceHover};
  --surface-active: ${colors.surfaceActive};

  /* Cards */
  --card: ${colors.card};
  --card-elevated: ${colors.cardElevated};
  --card-hover: ${colors.cardHover};

  /* Borders */
  --border: ${colors.border};
  --border-active: ${colors.borderActive};
  --border-subtle: ${colors.borderSubtle};

  /* Primary */
  --primary: ${colors.primary};
  --primary-light: ${colors.primaryLight};
  --primary-dark: ${colors.primaryDark};
  --primary-glow: ${colors.primaryGlow};
  --primary-muted: ${colors.primaryMuted};

  /* Accent */
  --accent: ${colors.accent};
  --accent-light: ${colors.accentLight};

  /* Semantic */
  --danger: ${colors.danger};
  --danger-dark: ${colors.dangerDark};
  --danger-glow: ${colors.dangerGlow};
  --danger-muted: ${colors.dangerMuted};
  --success: ${colors.success};
  --success-muted: ${colors.successMuted};
  --warning: ${colors.warning};
  --warning-muted: ${colors.warningMuted};
  --info: ${colors.info};
  --info-muted: ${colors.infoMuted};
  --teal: ${colors.teal};

  /* Text */
  --text: ${colors.text};
  --text-sub: ${colors.textSub};
  --text-hint: ${colors.textHint};
  --text-disabled: ${colors.textDisabled};

  /* Spacing */
  --space-xs: ${spacing.xs}px;
  --space-sm: ${spacing.sm}px;
  --space-md: ${spacing.md}px;
  --space-lg: ${spacing.lg}px;
  --space-xl: ${spacing.xl}px;
  --space-2xl: ${spacing['2xl']}px;
  --space-3xl: ${spacing['3xl']}px;

  /* Radius */
  --radius-xs: ${radius.xs}px;
  --radius-sm: ${radius.sm}px;
  --radius-md: ${radius.md}px;
  --radius-lg: ${radius.lg}px;
  --radius-xl: ${radius.xl}px;
  --radius-full: ${radius.full}px;

  /* Typography */
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'DM Sans', sans-serif;

  /* Transitions */
  --transition-fast: ${animation.fast}ms ease;
  --transition-normal: ${animation.normal}ms ease;
  --transition-slow: ${animation.slow}ms ease;
}
`;
