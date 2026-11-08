// ============================================================================
// Mizan (ميزان) — AnimatedExpandable
// Fluid accordion and card expansion utility powered by layout transitions
// ============================================================================

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { layoutPresets } from './presets';
import { motionDurations } from './motionTokens';
import { motionEasings } from './easings';
import { useReduceMotionPreference } from './useReduceMotionPreference';

export interface AnimatedExpandableProps {
  /**
   * Whether the expandable section is expanded
   */
  isExpanded: boolean;
  /**
   * Style applied to container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Inner expandable content
   */
  children?: React.ReactNode;
}

export const AnimatedExpandable: React.FC<AnimatedExpandableProps> = ({
  isExpanded,
  style,
  children,
}) => {
  const isReducedMotion = useReduceMotionPreference();

  if (!isExpanded) {
    return null;
  }

  return (
    <Animated.View
      layout={isReducedMotion ? undefined : layoutPresets.spring}
      entering={
        isReducedMotion
          ? undefined
          : FadeIn.duration(motionDurations.cardExpand).easing(motionEasings.decelerate)
      }
      exiting={
        isReducedMotion
          ? undefined
          : FadeOut.duration(motionDurations.microSlow).easing(motionEasings.accelerate)
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
};
