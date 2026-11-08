// ============================================================================
// Mizan (ميزان) — AnimatedSlide
// Fluid spatial entrance and exit transitions with automatic pointer-event management
// ============================================================================

import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { motionDurations, motionOpacities } from './motionTokens';
import { motionEasings, motionSprings } from './easings';
import { useReduceMotionPreference } from './useReduceMotionPreference';

export type SlideDirection = 'up' | 'down' | 'left' | 'right';

export interface AnimatedSlideProps {
  /**
   * Whether the element is visible
   */
  visible: boolean;
  /**
   * Direction from which the element enters
   * - 'up': enters from below moving up
   * - 'down': enters from above moving down
   * - 'left': enters from right moving left
   * - 'right': enters from left moving right
   */
  direction?: SlideDirection;
  /**
   * Pixel displacement distance. Defaults to 24 (subtle fintech shift).
   */
  offset?: number;
  /**
   * Duration in ms for timing transitions. Defaults to motionDurations.cardExpand (280ms)
   */
  duration?: number;
  /**
   * Use spring kinematics instead of timing. Defaults to false.
   */
  useSpringMotion?: boolean;
  /**
   * Custom style
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Child content
   */
  children?: React.ReactNode;
}

export const AnimatedSlide: React.FC<AnimatedSlideProps> = ({
  visible,
  direction = 'up',
  offset = 24,
  duration = motionDurations.cardExpand,
  useSpringMotion = false,
  style,
  children,
}) => {
  const isReducedMotion = useReduceMotionPreference();

  const getDisplacement = () => {
    switch (direction) {
      case 'up':
        return offset;
      case 'down':
        return -offset;
      case 'left':
        return offset;
      case 'right':
        return -offset;
    }
  };

  const isVertical = direction === 'up' || direction === 'down';
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    const target = visible ? 1 : 0;
    if (isReducedMotion) {
      progress.value = target;
    } else if (useSpringMotion) {
      progress.value = withSpring(target, motionSprings.subtle);
    } else {
      progress.value = withTiming(target, {
        duration,
        easing: visible ? motionEasings.decelerate : motionEasings.accelerate,
      });
    }
  }, [visible, duration, useSpringMotion, isReducedMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = progress.value;
    const shift = (1 - progress.value) * getDisplacement();

    return {
      opacity,
      transform: [
        isVertical ? { translateY: shift } : { translateX: shift },
      ],
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
