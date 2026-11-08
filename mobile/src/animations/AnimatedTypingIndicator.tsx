// ============================================================================
// Mizan (ميزان) — AnimatedTypingIndicator
// Subtle three-dot pulsating wave for Mizan AI advisory queries
// Runs 100% on the UI thread without blocking touch interactions
// ============================================================================

import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import { colors } from '../theme/tokens';
import { useReduceMotionPreference } from './useReduceMotionPreference';

export interface AnimatedTypingIndicatorProps {
  dotSize?: number;
  dotColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedTypingIndicator: React.FC<AnimatedTypingIndicatorProps> = ({
  dotSize = 7,
  dotColor = colors.brand.primary,
  style,
}) => {
  const isReducedMotion = useReduceMotionPreference();

  const dot1 = useSharedValue<number>(0);
  const dot2 = useSharedValue<number>(0);
  const dot3 = useSharedValue<number>(0);

  useEffect(() => {
    if (isReducedMotion) return;

    const animateDot = (sv: any, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-5, { duration: 280 }),
            withTiming(0, { duration: 280 })
          ),
          -1,
          true
        )
      );
    };

    animateDot(dot1, 0);
    animateDot(dot2, 140);
    animateDot(dot3, 280);

    return () => {
      cancelAnimation(dot1);
      cancelAnimation(dot2);
      cancelAnimation(dot3);
    };
  }, [isReducedMotion, dot1, dot2, dot3]);

  const styleDot1 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1.value }],
  }));

  const styleDot2 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2.value }],
  }));

  const styleDot3 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3.value }],
  }));

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: dotColor },
          styleDot1,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: dotColor },
          styleDot2,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: dotColor },
          styleDot3,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: {
    opacity: 0.85,
  },
});
