// ============================================================================
// Mizan (ميزان) — AnimatedCheckbox
// Tactile, spring-animated checkbox for batch selections and checklists
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/tokens';
import { motionSprings } from './easings';
import { useReduceMotionPreference } from './useReduceMotionPreference';

export interface AnimatedCheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const AnimatedCheckbox: React.FC<AnimatedCheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 22,
  style,
  accessibilityLabel,
}) => {
  const isReducedMotion = useReduceMotionPreference();
  const progress = useSharedValue<number>(checked ? 1 : 0);
  const iconScale = useSharedValue<number>(checked ? 1 : 0);

  useEffect(() => {
    const target = checked ? 1 : 0;
    if (isReducedMotion) {
      progress.value = target;
      iconScale.value = target;
    } else {
      progress.value = withSpring(target, motionSprings.snappy);
      iconScale.value = withSpring(target, motionSprings.snappy);
    }
  }, [checked, isReducedMotion, progress, iconScale]);

  const animatedBoxStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(0,0,0,0)', colors.brand.primary]
    );

    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      [colors.neutral.borderStrong, colors.brand.primary]
    );

    return {
      backgroundColor,
      borderColor,
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: iconScale.value }],
      opacity: progress.value,
    };
  });

  const handlePress = () => {
    if (disabled || !onChange) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(!checked);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.touchTarget,
        { width: size + 10, height: size + 10 },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.box,
          { width: size, height: size, borderRadius: 6 },
          animatedBoxStyle,
        ]}
      >
        <Animated.View style={animatedIconStyle}>
          <Ionicons name="checkmark" size={Math.round(size * 0.72)} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  touchTarget: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
