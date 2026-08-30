/**
 * InvestIQ — "Electric Green × Deep Purple" Design System
 *
 * Philosophy:
 * ─ True near-black backgrounds with a cool blue undertone (never flat #000)
 * ─ Electric green as the primary accent — growth, positive, the brand color
 * ─ Deep purple reserved for secondary/learning moments (AI Tutor, knowledge)
 * ─ Gold reserved strictly for premium/achievement moments
 * ─ Generous whitespace, shadow-depth over border-depth
 * ─ Typography that is large, confident, and editorial
 *
 * Palette inspired by: Robinhood, Stripe, Linear, Coinbase, Revolut, Cash App
 */

export const colors = {
  dark: {
    // ── Backgrounds (layered depth system) ──────────────────────
    background:       '#0A0A0F',   // Near-black, cool undertone — the deepest layer
    backgroundAlt:    '#0D0D14',   // Subtle section groups
    surface:          '#13131A',   // Cards — elevated surface
    surfaceElevated:  '#1A1A24',   // Active states, modals, highlights
    surfaceMuted:     '#0F0F16',   // Chip backgrounds, muted areas

    // ── Text Hierarchy ───────────────────────────────────────────
    textPrimary:   '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.6)',
    textTertiary:  'rgba(255,255,255,0.35)',

    // ── Electric Green — The Primary Accent ───────────────────────
    // Growth, positive, the emotional core of the brand
    primary:     '#00D084',
    primaryDim:  '#00B873',
    primaryGlow: 'rgba(0,208,132,0.12)',

    // ── Gold — Premium Only ──────────────────────────────────────
    gold:        '#F5A623',
    goldDim:     '#D9911A',
    goldGlow:    'rgba(245,166,35,0.12)',

    // ── Semantic ─────────────────────────────────────────────────
    success:     '#00D084',        // Same as primary — gains ARE the brand color
    successDim:  '#00B873',
    successGlow: 'rgba(0,208,132,0.12)',

    danger:      '#FF4D6A',        // Losses
    dangerDim:   '#E8394F',
    dangerGlow:  'rgba(255,77,106,0.12)',

    warning:     '#F5A623',
    warningGlow: 'rgba(245,166,35,0.12)',

    info:        '#38BDF8',
    infoGlow:    '#38BDF81A',

    // ── Deep Purple — Secondary Accent (learning, AI, depth) ──────
    secondary:     '#6C47FF',
    secondaryDim:  '#5934E0',
    secondaryGlow: 'rgba(108,71,255,0.12)',

    // ── Structure ────────────────────────────────────────────────
    border:       'rgba(255,255,255,0.06)',
    borderStrong: 'rgba(255,255,255,0.12)',

    overlay:  'rgba(10, 10, 15, 0.93)',
    shimmer:  'rgba(255,255,255,0.06)',

    // ── Glass — surgical use only: floating cards, modals, tab bar ─
    glass:       'rgba(255,255,255,0.05)',
    glassBorder: 'rgba(255,255,255,0.08)',

    // ── Gradients ────────────────────────────────────────────────
    heroGradient:    ['#0A0A2E', '#003D1F'],   // portfolio hero — power & growth
    learnGradient:   ['#1A0A3E', '#2D1B69'],   // lesson hero — knowledge & depth
    tutorGradient:   ['#0A1628', '#0A2818'],   // AI tutor — intelligence & calm
    cardGradient:    ['#13131A', '#0D0D14'],
    successGradient: ['#003D2A', '#001F15'],
  },

  light: {
    background:       '#F8F9FC',
    backgroundAlt:    '#EEF0FA',
    surface:          '#FFFFFF',
    surfaceElevated:  '#F2F4FF',
    surfaceMuted:     '#E8ECF8',

    textPrimary:   '#0F0F14',
    textSecondary: '#64748B',
    textTertiary:  '#94A3B8',

    primary:     '#00A86B',        // Deeper green for light-mode contrast
    primaryDim:  '#00915C',
    primaryGlow: 'rgba(0,168,107,0.10)',

    gold:        '#D9911A',
    goldDim:     '#B4790F',
    goldGlow:    'rgba(217,145,26,0.10)',

    success:     '#00A86B',
    successDim:  '#00915C',
    successGlow: 'rgba(0,168,107,0.10)',

    danger:      '#DC2626',
    dangerDim:   '#B91C1C',
    dangerGlow:  '#DC262614',

    warning:     '#D9911A',
    warningGlow: 'rgba(217,145,26,0.10)',

    info:        '#0284C7',
    infoGlow:    '#0284C714',

    secondary:     '#6C47FF',
    secondaryDim:  '#5934E0',
    secondaryGlow: 'rgba(108,71,255,0.10)',

    border:       '#E2E8F0',
    borderStrong: '#CBD5E1',

    overlay:  'rgba(15, 15, 20, 0.55)',
    shimmer:  '#E2E8F0',

    glass:       'rgba(15,15,20,0.04)',
    glassBorder: 'rgba(15,15,20,0.08)',

    heroGradient:    ['#FFFFFF', '#F0F2FF'],
    learnGradient:   ['#F5F2FF', '#EDE7FF'],
    tutorGradient:   ['#F0FAF7', '#E7F5F0'],
    cardGradient:    ['#FFFFFF', '#F8F9FC'],
    successGradient: ['#D1FAE5', '#ECFDF5'],
  },
};

export const typography = {
  displayLarge:  { fontSize: 56, fontWeight: '800' as const, letterSpacing: -2.5, lineHeight: 64 },
  displayMedium: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -1.6, lineHeight: 48 },
  h1: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -1,   lineHeight: 40 },
  h2: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.6, lineHeight: 34 },
  h3: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.4, lineHeight: 28 },
  h4: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2, lineHeight: 24 },
  bodyLarge: { fontSize: 17, fontWeight: '400' as const, lineHeight: 28 },
  body:      { fontSize: 15, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 20 },
  label:      { fontSize: 14, fontWeight: '600' as const, letterSpacing: 0.1,  lineHeight: 20 },
  labelSmall: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.3,  lineHeight: 16 },
  caption:    { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1.2,  lineHeight: 14, textTransform: 'uppercase' as const },
  number:     { fontSize: 42, fontWeight: '800' as const, letterSpacing: -2,   lineHeight: 50 },
  numberSm:   { fontSize: 28, fontWeight: '700' as const, letterSpacing: -1,   lineHeight: 34 },
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48, massive: 64,
};

export const radius = {
  xs: 6, sm: 10, md: 14, lg: 20, xl: 24, xxl: 32, full: 999, pill: 999,
};

export const shadows = {
  dark: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2  }, shadowOpacity: 0.5,  shadowRadius: 8,  elevation: 2 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 8  }, shadowOpacity: 0.6,  shadowRadius: 20, elevation: 6 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.7,  shadowRadius: 36, elevation: 12 },
    glow: (c: string) => ({ shadowColor: c, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 24, elevation: 6 }),
    violet: { shadowColor: '#818CF8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 8 },
  },
  light: {
    sm: { shadowColor: '#1E293B', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,  elevation: 1 },
    md: { shadowColor: '#1E293B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 4 },
    lg: { shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 8 },
    glow: (c: string) => ({ shadowColor: c, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.30, shadowRadius: 16, elevation: 4 }),
    violet: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.20, shadowRadius: 16, elevation: 6 },
  },
};

export const animation = {
  duration: { fast: 100, base: 220, slow: 380, slowest: 580 },
  spring: {
    press:   { tension: 360, friction: 20 },
    bounce:  { tension: 180, friction: 10 },
    settle:  { tension: 280, friction: 26 },
    snappy:  { tension: 420, friction: 22 },
    slide:   { damping: 18,  stiffness: 200, mass: 1 },
  },
};

export type Theme = {
  colors: typeof colors.dark;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows.dark;
  animation: typeof animation;
  mode: 'dark' | 'light';
};

export const darkTheme: Theme  = { colors: colors.dark,  typography, spacing, radius, shadows: shadows.dark,  animation, mode: 'dark'  };
export const lightTheme: Theme = { colors: colors.light, typography, spacing, radius, shadows: shadows.light, animation, mode: 'light' };
