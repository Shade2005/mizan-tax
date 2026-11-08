// ============================================================================
// Mizan (ميزان) — AnimatedTabButton
// Tactile spring press feedback with micro-haptics for bottom navigation tabs
// ============================================================================

import React from 'react';
import {
  Pressable,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  StyleSheet,
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

export interface AnimatedTabButtonProps {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  accessibilityState?: { selected?: boolean };
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedTabButton: React.FC<AnimatedTabButtonProps> = ({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
  style,
}) => {
  const isReducedMotion = useReduceMotionPreference();
  const scale = useSharedValue<number>(motionScales.normal);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    // Micro-haptic tactile feedback for tab selection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (!isReducedMotion) {
      scale.value = withSpring(motionScales.buttonPress, motionSprings.press);
    }
  };

  const handlePressOut = () => {
    if (!isReducedMotion) {
      scale.value = withSpring(motionScales.normal, motionSprings.press);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.tabButton, style]}
    >
      <Animated.View style={[styles.innerContainer, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
