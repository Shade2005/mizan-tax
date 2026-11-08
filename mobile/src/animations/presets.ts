// ============================================================================
// Mizan (ميزان) — Animation Presets
// Preconfigured, typed layout transitions & entry/exit animation builders
// ============================================================================

import {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInUp,
  SlideInDown,
  SlideOutDown,
  SlideOutUp,
  LinearTransition,
  withTiming,
  withSpring,
  WithTimingConfig,
  WithSpringConfig,
  AnimatableValue,
} from 'react-native-reanimated';
import { motionDurations } from './motionTokens';
import { motionEasings, motionSprings } from './easings';

/**
 * Standard layout transition presets for smoothly animating size & position changes
 */
export const layoutPresets = {
  /**
   * Subtle spring layout transition for accordions, card expansions, and reordered lists
   */
  spring: LinearTransition.springify()
    .damping(motionSprings.subtle.damping as number)
    .stiffness(motionSprings.subtle.stiffness as number)
    .mass(motionSprings.subtle.mass as number),

  /**
   * Snappy spring layout for small switches, segmented controls, or filter chips
   */
  snappy: LinearTransition.springify()
    .damping(motionSprings.snappy.damping as number)
    .stiffness(motionSprings.snappy.stiffness as number)
    .mass(motionSprings.snappy.mass as number),

  /**
   * Smooth cubic timing transition for predictable card resize
   */
  smooth: LinearTransition.duration(motionDurations.cardExpand).easing(motionEasings.standard),
};

/**
 * Layout entrance and exit animation builders
 */
export const entryExitPresets = {
  // Fade in / out
  fadeIn: FadeIn.duration(motionDurations.tab).easing(motionEasings.decelerate),
  fadeOut: FadeOut.duration(motionDurations.micro).easing(motionEasings.accelerate),
  fadeInFast: FadeIn.duration(motionDurations.microSlow).easing(motionEasings.decelerate),
  fadeOutFast: FadeOut.duration(motionDurations.microFast).easing(motionEasings.accelerate),

  // Subtle directional fades for card & screen hierarchy entrances (12-14px displacement)
  fadeInDown: FadeInDown.duration(motionDurations.cardExpand).easing(motionEasings.decelerate),
  fadeInUp: FadeInUp.duration(motionDurations.cardExpand).easing(motionEasings.decelerate),

  // Slide In / Out (for cards, banner notifications, snackbars)
  slideInDown: SlideInDown.duration(motionDurations.cardExpand).easing(motionEasings.decelerate),
  slideOutUp: SlideOutUp.duration(motionDurations.cardCollapse).easing(motionEasings.accelerate),
  slideInUp: SlideInUp.duration(motionDurations.cardExpand).easing(motionEasings.decelerate),
  slideOutDown: SlideOutDown.duration(motionDurations.cardCollapse).easing(motionEasings.accelerate),

  // Bottom Sheets & full screen overlays
  bottomSheetEnter: SlideInDown.duration(motionDurations.bottomSheetEnter).easing(motionEasings.decelerate),
  bottomSheetExit: SlideOutDown.duration(motionDurations.bottomSheetExit).easing(motionEasings.accelerate),
};

/**
 * Utility to calculate deterministic staggered delay for lists
 * @param index - Index in the collection
 * @param baseDelay - Base milliseconds per index (defaults to 45ms)
 * @param maxDelay - Clamped maximum delay to prevent sluggish long lists (defaults to 300ms)
 */
export function getStaggerDelay(index: number, baseDelay = motionDurations.staggerDelay, maxDelay = 300): number {
  return Math.min(index * baseDelay, maxDelay);
}

/**
 * Type-safe helper for Reanimated withTiming using standard motion tokens
 */
export function animateTiming<T extends AnimatableValue>(
  toValue: T,
  duration = motionDurations.tab,
  easing = motionEasings.standard,
  callback?: (finished?: boolean) => void
) {
  'worklet';
  const config: WithTimingConfig = {
    duration,
    easing,
  };
  return withTiming(toValue, config, callback);
}

/**
 * Type-safe helper for Reanimated withSpring using predefined motion springs
 */
export function animateSpring<T extends AnimatableValue>(
  toValue: T,
  preset: keyof typeof motionSprings = 'subtle',
  callback?: (finished?: boolean) => void
) {
  'worklet';
  const config: WithSpringConfig = motionSprings[preset] || motionSprings.subtle;
  return withSpring(toValue, config, callback);
}
