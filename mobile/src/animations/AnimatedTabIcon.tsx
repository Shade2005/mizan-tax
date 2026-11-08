// ============================================================================
// Mizan (ميزان) — AnimatedTabIcon
// Smooth active icon scale transitions with glowing pill indicator
// ============================================================================

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import { motionSprings } from './easings';
import { motionDurations } from './motionTokens';
import { useReduceMotionPreference } from './useReduceMotionPreference';

export interface AnimatedTabIconProps {
  nameOutline: keyof typeof Ionicons.glyphMap;
  nameFilled: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  size?: number;
}

export const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({
  nameOutline,
  nameFilled,
  focused,
  color,
  size = 22,
}) => {
  const isReducedMotion = useReduceMotionPreference();
  const iconScale = useSharedValue<number>(focused ? 1.06 : 1.0);
  const indicatorWidth = useSharedValue<number>(focused ? 18 : 0);
  const indicatorOpacity = useSharedValue<number>(focused ? 1 : 0);

  useEffect(() => {
    if (isReducedMotion) {
      iconScale.value = focused ? 1.06 : 1.0;
      indicatorWidth.value = focused ? 18 : 0;
      indicatorOpacity.value = focused ? 1 : 0;
      return;
    }

    if (focused) {
      iconScale.value = withSpring(1.06, motionSprings.snappy);
      indicatorWidth.value = withSpring(18, motionSprings.snappy);
      indicatorOpacity.value = withTiming(1, { duration: motionDurations.tab });
    } else {
      iconScale.value = withSpring(1.0, motionSprings.snappy);
      indicatorWidth.value = withSpring(0, motionSprings.snappy);
      indicatorOpacity.value = withTiming(0, { duration: motionDurations.microSlow });
    }
  }, [focused, isReducedMotion, iconScale, indicatorWidth, indicatorOpacity]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: iconScale.value }],
    };
  });

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      width: indicatorWidth.value,
      opacity: indicatorOpacity.value,
    };
  });

  return (
    <View style={styles.container}>
      {/* Top micro-indicator pill */}
      <Animated.View style={[styles.indicator, animatedIndicatorStyle]} />

      {/* Animated icon with subtle spring scaling */}
      <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
        <Ionicons
          name={focused ? nameFilled : nameOutline}
          size={size}
          color={color}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: -6,
    height: 3,
    backgroundColor: colors.brand.primary,
    borderRadius: 2,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
