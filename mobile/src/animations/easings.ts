// ============================================================================
// Mizan (ميزان) — Easing Curves & Spring Configurations
// Premium fintech: Fluid, precise, decelerating, strictly controlled overshoot
// ============================================================================

import { Easing, WithSpringConfig } from 'react-native-reanimated';

/**
 * Standard Bézier timing functions.
 * - standard: Balanced acceleration and deceleration for intra-screen layout shifts
 * - decelerate: Strong deceleration for entering elements (draws immediate focus)
 * - accelerate: Gentle acceleration for exiting elements (clean departure)
 * - sharp: Swift, direct state switch for toggles, badges, and segmented controls
 */
export const motionEasings = {
  // Standard natural curve (Cubic 0.2, 0, 0, 1)
  standard: Easing.bezier(0.2, 0, 0, 1),

  // Decelerate / Ease-Out (Cubic 0, 0, 0.2, 1)
  decelerate: Easing.bezier(0.0, 0.0, 0.2, 1.0),

  // Accelerate / Ease-In (Cubic 0.4, 0, 1, 1)
  accelerate: Easing.bezier(0.4, 0.0, 1.0, 1.0),

  // Sharp (Cubic 0.4, 0, 0.6, 1)
  sharp: Easing.bezier(0.4, 0.0, 0.6, 1.0),

  // Linear (for continuous progress sweeps or lasers)
  linear: Easing.linear,
};

/**
 * Spring configurations.
 * Formulated to completely avoid juvenile bouncy oscillations while retaining
 * organic physical inertia and immediate response.
 */
export const motionSprings: Record<string, WithSpringConfig> = {
  /**
   * Fast, crisp spring for touch press states and quick recoveries.
   * Overshoot clamped to guarantee no oscillation.
   */
  press: {
    damping: 22,
    stiffness: 340,
    mass: 0.6,
    overshootClamping: true,
    energyThreshold: 0.001,
  },

  /**
   * Snappy spring for toggle switches, checkboxes, and segmented pills.
   */
  snappy: {
    damping: 26,
    stiffness: 280,
    mass: 0.8,
    overshootClamping: true,
    energyThreshold: 0.001,
  },

  /**
   * Gentle, elegant settling for cards, expanded panels, and layout shifts.
   * Minimal overshoot (<2%) with rapid settling.
   */
  subtle: {
    damping: 28,
    stiffness: 220,
    mass: 1.0,
    overshootClamping: false,
    energyThreshold: 0.001,
  },

  /**
   * Heavy, stable spring for bottom sheets, dialog modals, and drawer gestures.
   */
  sheet: {
    damping: 34,
    stiffness: 240,
    mass: 1.1,
    overshootClamping: false,
    energyThreshold: 0.001,
  },
};
