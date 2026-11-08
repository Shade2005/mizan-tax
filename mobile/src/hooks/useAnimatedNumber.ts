import { useState, useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Smoothly animates a numeric value from its previous value to a target value
 * using an ease-out cubic curve via requestAnimationFrame.
 *
 * Automatically respects the system Reduce Motion preference:
 * If Reduce Motion is enabled, the target value is rendered immediately
 * without intermediate interpolated figures.
 */
export function useAnimatedNumber(target: number, duration: number = 800): number {
  const [displayValue, setDisplayValue] = useState<number>(target);
  const startTimeRef = useRef<number>(0);
  const startValRef = useRef<number>(target);
  const animFrameRef = useRef<number | null>(null);
  const isReducedMotionRef = useRef<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // Check system Reduce Motion setting
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!isMounted) return;
        isReducedMotionRef.current = enabled;
        if (enabled) {
          setDisplayValue(target);
        }
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (!isMounted) return;
        isReducedMotionRef.current = enabled;
        if (enabled) {
          setDisplayValue(target);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [target]);

  useEffect(() => {
    if (isReducedMotionRef.current || duration <= 0) {
      setDisplayValue(target);
      return;
    }

    startValRef.current = displayValue;
    startTimeRef.current = Date.now();

    const update = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic curve for natural decelerating stop
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValRef.current + (target - startValRef.current) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(update);
      }
    };

    animFrameRef.current = requestAnimationFrame(update);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [target, duration]);

  return displayValue;
}
