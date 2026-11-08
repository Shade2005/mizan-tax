// ============================================================================
// Mizan (ميزان) — AnimatedTextInput
// Responsive input component featuring fluid focus border transition & clear button
// Completely preserves React Native TextInput value handling & numeric formats
// ============================================================================

import React, { useState } from 'react';
import {
  TextInput,
  TextInputProps,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import { motionDurations } from './motionTokens';
import { motionEasings } from './easings';
import { useReduceMotionPreference } from './useReduceMotionPreference';

export interface AnimatedTextInputProps extends TextInputProps {
  /**
   * Container style wrapping the input
   */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Whether to show a clear button when text is present
   */
  showClearButton?: boolean;
  /**
   * Callback when clear button is pressed
   */
  onClear?: () => void;
}

export const AnimatedTextInput: React.FC<AnimatedTextInputProps> = ({
  containerStyle,
  style,
  value,
  showClearButton = false,
  onClear,
  onFocus,
  onBlur,
  ...rest
}) => {
  const isReducedMotion = useReduceMotionPreference();
  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue<number>(0);

  const handleFocus: TextInputProps['onFocus'] = (e) => {
    setIsFocused(true);
    if (isReducedMotion) {
      focusProgress.value = 1;
    } else {
      focusProgress.value = withTiming(1, {
        duration: motionDurations.toggle,
        easing: motionEasings.decelerate,
      });
    }
    onFocus?.(e);
  };

  const handleBlur: TextInputProps['onBlur'] = (e) => {
    setIsFocused(false);
    if (isReducedMotion) {
      focusProgress.value = 0;
    } else {
      focusProgress.value = withTiming(0, {
        duration: motionDurations.toggle,
        easing: motionEasings.accelerate,
      });
    }
    onBlur?.(e);
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.neutral.border, colors.brand.primary]
    );

    return {
      borderColor,
    };
  });

  const hasValue = Boolean(value && value.length > 0);

  return (
    <Animated.View style={[styles.container, animatedContainerStyle, containerStyle]}>
      <TextInput
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[styles.input, style]}
        placeholderTextColor={colors.neutral.textTertiary}
        {...rest}
      />
      {showClearButton && hasValue && (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear input"
        >
          <Ionicons name="close-circle" size={18} color={colors.neutral.textTertiary} />
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: colors.neutral.textPrimary,
  },
  clearBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
