// ============================================================================
// Mizan (ميزان) — AnimatedSwitch
// High-precision, fluid spring-driven toggle switch for fintech settings
// Features smooth track color interpolation, micro-haptics, and accessible state
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

export interface AnimatedSwitchProps {
  /**
   * Current boolean state of the switch
   */
  value: boolean;
  /**
   * Callback fired when user toggles the switch
   */
  onValueChange?: (newValue: boolean) => void;
  /**
   * Whether the switch is disabled
   */
  disabled?: boolean;
  /**
   * Optional custom track colors
   */
  trackColor?: {
    false?: string;
    true?: string;
  };
  /**
   * Optional custom thumb color (defaults to #FFFFFF)
   */
  thumbColor?: string;
  /**
   * Custom style for outer switch container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Accessibility label for screen readers
   */
  accessibilityLabel?: string;
}

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 22;
const THUMB_MARGIN = 3;
const TRANSLATE_OFF = THUMB_MARGIN;
const TRANSLATE_ON = TRACK_WIDTH - THUMB_SIZE - THUMB_MARGIN; // 23

export const AnimatedSwitch: React.FC<AnimatedSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  trackColor = {
    false: colors.neutral.border,
    true: colors.brand.primary,
  },
  thumbColor = '#FFFFFF',
  style,
  accessibilityLabel,
}) => {
  const isReducedMotion = useReduceMotionPreference();
  const progress = useSharedValue<number>(value ? 1 : 0);

  const inactiveColor = trackColor.false || colors.neutral.border;
  const activeColor = trackColor.true || colors.brand.primary;

  useEffect(() => {
    const target = value ? 1 : 0;
    if (isReducedMotion) {
      progress.value = target;
    } else {
      progress.value = withSpring(target, motionSprings.snappy);
    }
  }, [value, isReducedMotion, progress]);

  const animatedTrackStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [inactiveColor, activeColor]
    );

    return {
      backgroundColor,
    };
  });

  const animatedThumbStyle = useAnimatedStyle(() => {
    const translateX = TRANSLATE_OFF + progress.value * (TRANSLATE_ON - TRANSLATE_OFF);

    return {
      transform: [{ translateX }],
    };
  });

  const handlePress = () => {
    if (disabled || !onValueChange) return;

    // Trigger selective micro-haptic feedback on toggle
    Haptics.selectionAsync().catch(() => {});

    onValueChange(!value);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.touchTarget,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Animated.View style={[styles.track, animatedTrackStyle]}>
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: thumbColor },
            animatedThumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  touchTarget: {
    minWidth: 48,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  disabled: {
    opacity: 0.5,
  },
});
