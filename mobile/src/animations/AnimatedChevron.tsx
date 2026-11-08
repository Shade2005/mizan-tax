// ============================================================================
// Mizan (ميزان) — AnimatedChevron
// Smooth rotational chevron indicator for accordions, dropdowns, and cards
// ============================================================================

import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import { motionSprings } from './easings';
import { useReduceMotionPreference } from './useReduceMotionPreference';

export interface AnimatedChevronProps {
  /**
   * Whether the parent section or card is expanded
   */
  expanded: boolean;
  /**
   * Icon size in pixels (defaults to 18)
   */
  size?: number;
  /**
   * Icon color (defaults to neutral textSecondary)
   */
  color?: string;
  /**
   * Custom container style
   */
  style?: StyleProp<ViewStyle>;
}

export const AnimatedChevron: React.FC<AnimatedChevronProps> = ({
  expanded,
  size = 18,
  color = colors.neutral.textSecondary,
  style,
}) => {
  const isReducedMotion = useReduceMotionPreference();
  const rotation = useSharedValue<number>(expanded ? 180 : 0);

  useEffect(() => {
    const target = expanded ? 180 : 0;
    if (isReducedMotion) {
      rotation.value = target;
    } else {
      rotation.value = withSpring(target, motionSprings.snappy);
    }
  }, [expanded, isReducedMotion, rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Ionicons name="chevron-down" size={size} color={color} />
    </Animated.View>
  );
};
