// ============================================================================
// Mizan (ميزان) — Motion System Design Tokens
// Calibrated for high-precision, subtle, premium fintech UX
// ============================================================================

/**
 * Standard duration tokens in milliseconds.
 * All values align with established human perception and interaction scales:
 * - Micro interactions: 100–140ms (instant feedback, hover, press recovery)
 * - Toggle and checkbox: 160–220ms (responsive state switch)
 * - Tabs and small transitions: 180–240ms (fluid segmented switch)
 * - Card expansion: 240–300ms (clear, controlled dimensional change)
 * - Bottom sheets: 280–350ms (substantial spatial displacement)
 * - Screen transitions: 250–320ms (stack navigation cadence)
 */
export const motionDurations = {
  // Micro interactions (100–140ms)
  microFast: 100,
  micro: 120,
  microSlow: 140,

  // Toggle & checkbox (160–220ms)
  toggle: 180,
  checkbox: 200,

  // Tabs & segmented transitions (180–240ms)
  tab: 200,
  smallTransition: 220,

  // Card expansion & collapse (240–300ms)
  cardExpand: 280,
  cardCollapse: 240,

  // Bottom sheets & large overlays (280–350ms)
  bottomSheetEnter: 320,
  bottomSheetExit: 280,

  // Screen transitions (250–320ms)
  screenEnter: 280,
  screenExit: 250,

  // Stagger base interval for list/card sequences
  staggerDelay: 45,
} as const;

export type MotionDurationKey = keyof typeof motionDurations;

/**
 * Scale factors for tactile touch feedback.
 * Kept intentionally subtle (0.97–0.985) to avoid excessive "toy-like" bounce.
 */
export const motionScales = {
  // Primary buttons and large tap targets
  buttonPress: 0.97,

  // Dense list items and table rows
  rowPress: 0.985,

  // Cards and elevated panels
  cardPress: 0.98,

  // Small icon buttons and chips
  iconPress: 0.94,

  // Rest state
  normal: 1.0,
} as const;

/**
 * Opacity steps for state transitions
 */
export const motionOpacities = {
  transparent: 0,
  dimmed: 0.5,
  subtle: 0.7,
  solid: 1.0,
} as const;
