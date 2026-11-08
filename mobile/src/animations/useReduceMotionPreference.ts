// ============================================================================
// Mizan (ميزان) — Accessibility & Reduced Motion Hook
// Observes system Reduce Motion preference and provides adaptive fallbacks
// ============================================================================

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * Hook to detect whether the user has enabled "Reduce Motion" in system settings.
 * Synchronizes Reanimated's internal state with React Native's AccessibilityInfo.
 */
export function useReduceMotionPreference(): boolean {
  const reanimatedReducedMotion = useReducedMotion();
  const [rnReducedMotion, setRnReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setRnReducedMotion(enabled);
      })
      .catch(() => {
        // Fallback gracefully to false
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (isMounted) setRnReducedMotion(enabled);
      }
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return reanimatedReducedMotion || rnReducedMotion;
}

/**
 * Returns 0 duration if reduce motion is active, else returns requested duration.
 */
export function getAccessibleDuration(duration: number, isReducedMotion: boolean): number {
  return isReducedMotion ? 0 : duration;
}
