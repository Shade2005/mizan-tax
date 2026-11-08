// ============================================================================
// Mizan (ميزان) — AnimatedRadio
// Tactile, spring-animated radio button for single-choice selectors
// ============================================================================

import React, { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/tokens';
import { motionSprings } from './easings';
import { useReduceMotionPreference } from './useReduceMotionPreference';

export interface AnimatedRadioProps {
  selected: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const AnimatedRadio: React.FC<AnimatedRadioProps> = ({
  selected,
  onSelect,
  disabled = false,
  size = 20,
  style,
  accessibilityLabel,
}) => {
  const isReducedMotion = useReduceMotionPreference();
  const progress = useSharedValue<number>(selected ? 1 : 0);
  const dotScale = useSharedValue<number>(selected ? 1 : 0);

  useEffect(() => {
    const target = selected ? 1 : 0;
    if (isReducedMotion) {
      progress.value = target;
      dotScale.value = target;
    } else {
      progress.value = withSpring(target, motionSprings.snappy);
      dotScale.value = withSpring(target, motionSprings.snappy);
    }
  }, [selected, isReducedMotion, progress, dotScale]);

  const animatedRingStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      [colors.neutral.borderStrong, colors.brand.primary]
    );

    return {
      borderColor,
    };
  });

  const animatedDotStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: dotScale.value }],
      opacity: progress.value,
    };
  });

  const handlePress = () => {
    if (disabled || !onSelect) return;
    Haptics.selectionAsync().catch(() => {});
    onSelect();
  };

  const innerDotSize = Math.round(size * 0.5);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.touchTarget,
        { width: size + 8, height: size + 8 },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2 },
          animatedRingStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.dot,
            {
              width: innerDotSize,
              height: innerDotSize,
              borderRadius: innerDotSize / 2,
              backgroundColor: colors.brand.primary,
            },
            animatedDotStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  touchTarget: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dot: {},
  disabled: {
    opacity: 0.5,
  },
});
