// ============================================================================
// Mizan (ميزان) — AnimatedFade
// Smooth opacity transition utility that safely disables pointer interaction when hidden
// ============================================================================

import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { motionDurations, motionOpacities } from './motionTokens';
import { motionEasings } from './easings';
import { useReduceMotionPreference } from './useReduceMotionPreference';

export interface AnimatedFadeProps {
  /**
   * Whether the element is visible
   */
  visible: boolean;
  /**
   * Duration in ms for fade in / out. Defaults to motionDurations.tab (200ms)
   */
  duration?: number;
  /**
   * Style applied to the animated view
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Child components
   */
  children?: React.ReactNode;
}

export const AnimatedFade: React.FC<AnimatedFadeProps> = ({
  visible,
  duration = motionDurations.tab,
  style,
  children,
}) => {
  const isReducedMotion = useReduceMotionPreference();
  const opacity = useSharedValue(visible ? motionOpacities.solid : motionOpacities.transparent);

  useEffect(() => {
    const target = visible ? motionOpacities.solid : motionOpacities.transparent;
    if (isReducedMotion) {
      opacity.value = target;
    } else {
      opacity.value = withTiming(target, {
        duration,
        easing: visible ? motionEasings.decelerate : motionEasings.accelerate,
      });
    }
  }, [visible, duration, isReducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
};
