// ============================================================================
// Mizan (ميزان) — ScreenSection
// Subtle, staggered section entrance wrapper for primary screen content
// Automatically respects system Reduce Motion preference
// ============================================================================

import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { entryExitPresets, getStaggerDelay } from './presets';
import { useReduceMotionPreference } from './useReduceMotionPreference';

export interface ScreenSectionProps {
  /**
   * Positional index in the visual hierarchy (0-based) for staggered entrance timing
   */
  index?: number;
  /**
   * Explicit entrance delay in ms. Overrides index calculation if provided.
   */
  delay?: number;
  /**
   * Custom style applied to the container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Section content
   */
  children?: React.ReactNode;
}

export const ScreenSection: React.FC<ScreenSectionProps> = ({
  index = 0,
  delay,
  style,
  children,
}) => {
  const isReducedMotion = useReduceMotionPreference();

  if (isReducedMotion) {
    return <View style={style}>{children}</View>;
  }

  const calculatedDelay = delay !== undefined ? delay : getStaggerDelay(index);

  return (
    <Animated.View
      entering={entryExitPresets.fadeInUp.delay(calculatedDelay)}
      style={style}
    >
      {children}
    </Animated.View>
  );
};
