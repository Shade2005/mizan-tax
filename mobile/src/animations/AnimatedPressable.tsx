// ============================================================================
// Mizan (ميزان) — AnimatedPressable
// Tactile, spring-driven press scale feedback with optional haptics
// Runs 100% on the UI thread without triggering React component re-renders
// ============================================================================

import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { motionScales } from './motionTokens';
import { motionSprings } from './easings';
import { useReduceMotionPreference } from './useReduceMotionPreference';

export interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  /**
   * Scale factor on active press. Defaults to buttonPress (0.97).
   */
  activeScale?: number;
  /**
   * Trigger light haptic feedback on press down. Defaults to true.
   */
  enableHaptics?: boolean;
  /**
   * Style applied to the animated wrapper container.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Children elements.
   */
  children?: React.ReactNode;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  activeScale = motionScales.buttonPress,
  enableHaptics = true,
  style,
  onPressIn,
  onPressOut,
  children,
  disabled,
  ...rest
}) => {
  const isReducedMotion = useReduceMotionPreference();
  const scale = useSharedValue<number>(motionScales.normal);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return;

    if (enableHaptics) {
      // Haptics run asynchronously and never block UI gestures
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    if (!isReducedMotion) {
      scale.value = withSpring(activeScale, motionSprings.press);
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (!isReducedMotion) {
      scale.value = withSpring(motionScales.normal, motionSprings.press);
    }
    onPressOut?.(e);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...rest}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
