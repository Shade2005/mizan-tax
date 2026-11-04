// ============================================================================
// Mizan (ميزان) - Mobile Design Tokens
// Brand Identity: Deep Burgundy, Warm Blush, Vibrant Cyan, Pearl Canvas
// ============================================================================

export const colors = {
  brand: {
    burgundy: '#4A001F',
    burgundyDark: '#360016',
    burgundyLight: '#6D0B2C',
    cyan: '#00E5FF',
    cyanMuted: '#00D1C1',
    blush: '#FFE4E8',
    blushSoft: '#FFF5F7',
    blushAlt: '#FFC6D1',
  },
  semantic: {
    success: '#00D1C1',
    successBg: '#E0FAF7',
    warning: '#FFB4C1',
    warningBg: '#FFF0F3',
    risk: '#FF6B6B',
    riskBg: '#FFEBEB',
    info: '#A7C7FF',
    infoBg: '#EDF4FF',
  },
  neutral: {
    canvas: '#FCF8F9',
    surface: '#FFFFFF',
    surfaceSubdued: '#F8F2F4',
    border: '#EFE7E9',
    borderStrong: '#DBCDD1',
    textPrimary: '#1C0D12',
    textSecondary: '#6E5D63',
    textTertiary: '#A89CA1',
    white: '#FFFFFF',
    black: '#000000',
  },
  scanner: {
    laserBeam: '#00E5FF',
    reticleBorder: 'rgba(0, 229, 255, 0.65)',
    overlayDark: 'rgba(28, 13, 18, 0.65)',
  }
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#4A001F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  heroCard: {
    shadowColor: '#4A001F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  pillButton: {
    shadowColor: '#4A001F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  cyanGlow: {
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  }
} as const;
