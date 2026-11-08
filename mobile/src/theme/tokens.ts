// ============================================================================
// Mizan (ميزان) - Mobile Design Tokens
// Modern Identity: UAE Desert Orange, Dark Charcoal, Warm Pearl & Emerald
// Backward compatible with legacy color accessors
// ============================================================================

export const colors = {
  brand: {
    primary: '#F95700',        // Signature Vibrant Desert Orange
    primaryDark: '#D64600',    // Pressed/Hover state
    primaryLight: '#FF7733',   // Light accent
    primaryMuted: '#FFF3ED',   // Soft peach background container
    secondary: '#FF8844',
    darkHero: '#18191B',       // Charcoal/Obsidian dark card background
    darkHeroElevated: '#242528',
    glow: 'rgba(249, 87, 0, 0.35)',

    // Backward-compatibility aliases for existing components
    burgundy: '#F95700',
    burgundyDark: '#D64600',
    burgundyLight: '#FF7733',
    cyan: '#F95700',
    cyanMuted: '#10B981',
    blush: '#FFF3ED',
    blushSoft: '#FAF9F7',
    blushAlt: '#FED7AA',
  },
  semantic: {
    success: '#10B981',        // Emerald Compliant green
    successDark: '#059669',
    successBg: '#ECFDF5',
    successBorder: '#A7F3D0',
    warning: '#F59E0B',        // Amber alert
    warningBg: '#FEF3C7',
    warningBorder: '#FDE68A',
    risk: '#EF4444',           // Coral Red risk
    riskBg: '#FEF2F2',
    riskBorder: '#FECACA',
    info: '#3B82F6',           // Blue info
    infoBg: '#EFF6FF',
    infoBorder: '#BFDBFE',
  },
  neutral: {
    canvas: '#F7F6F4',         // Warm Pearl / Clean off-white background
    surface: '#FFFFFF',        // Pure white card container
    surfaceRaised: '#FFFFFF',
    surfaceSubdued: '#FAF9F7',
    border: '#EAE6E1',         // Subtle warm divider/border
    borderStrong: '#D7D2CB',
    textPrimary: '#141416',    // High contrast black
    textSecondary: '#666562',  // Muted grey metadata
    textTertiary: '#9E9C98',   // Placeholder/Inactive grey
    white: '#FFFFFF',
    black: '#000000',
  },
  scanner: {
    laserBeam: '#F95700',
    reticleBorder: '#F95700',
    overlayDark: 'rgba(18, 18, 20, 0.70)',
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
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 9999,
  full: 9999,
} as const;

export const typography = {
  fontFamily: {
    en: {
      regular: 'System',
      medium: 'System',
      semiBold: 'System',
      bold: 'System',
    },
    ar: {
      regular: 'Cairo, Noto Sans Arabic, System',
      medium: 'Cairo, Noto Sans Arabic, System',
      semiBold: 'Cairo, Noto Sans Arabic, System',
      bold: 'Cairo, Noto Sans Arabic, System',
    },
  },
  fontSize: {
    caption: 11,
    bodySm: 12,
    body: 14,
    bodyLg: 16,
    subheading: 18,
    heading: 22,
    display: 28,
    hero: 34,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  heroCard: {
    shadowColor: '#F95700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 7,
  },
  pillButton: {
    shadowColor: '#F95700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  orangeGlow: {
    shadowColor: '#F95700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 12,
    elevation: 5,
  },
  cyanGlow: {
    shadowColor: '#F95700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 12,
    elevation: 5,
  }
} as const;
