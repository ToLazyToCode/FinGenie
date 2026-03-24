/**
 * FinGenie Design Tokens
 * Design DNA: Fintech + AI Companion + Soft Gamification
 * - Rounded cards
 * - Purple gradient accents
 * - Clean white background
 * - Friendly but premium
 */

export const tokens = {
  colors: {
    primary: '#AD46FF',
    primaryLight: '#DAB2FF',
    primaryDark: '#8A3BDF',
    secondary: '#C084FC',
    accent: '#F0D9FF',
    background: '#F6F3FF',
    backgroundSecondary: '#EDE9FE',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textOnPrimary: '#FFFFFF',
    border: '#E2E8F0',
    success: '#22C55E',
    income: '#22C55E',
    expense: '#EF4444',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    headerLabel: '#A1A1AA',
  },
  gradients: {
    primary: ['#AD46FF', '#DAB2FF'],
    primaryToAccent: ['#AD46FF', '#C084FC'],
    balanceCard: ['#AD46FF', '#DAB2FF'],
    soft: ['#F6F3FF', '#EDE9FE'],
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  // Backward-compatible alias used by some screens/components.
  radii: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  typography: {
    fontSizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
    },
    fontWeights: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },
  shadows: {
    sm: {
      shadowColor: 'rgba(173,70,255,0.18)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
    md: {
      shadowColor: 'rgba(173,70,255,0.25)',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 12,
    },
  },
} as const;

export type ThemeTokens = typeof tokens;
