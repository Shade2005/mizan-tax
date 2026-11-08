// ============================================================================
// Mizan (ميزان) — AnimatedFinancialNumber
// Authoritative financial value animator adhering strictly to UAE fintech precision
// Features brief decelerating transitions (240ms), tabular digits, and zero layout shift
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { useReduceMotionPreference } from './useReduceMotionPreference';
import { motionDurations } from './motionTokens';

export interface AnimatedFinancialNumberProps {
  /**
   * Authoritative financial value (e.g. 45000, 14.50, -500)
   */
  value: number;
  /**
   * Currency prefix (defaults to 'AED')
   */
  currency?: string;
  /**
   * Optional prefix before the currency/amount
   */
  prefix?: string;
  /**
   * Optional suffix after the amount
   */
  suffix?: string;
  /**
   * Decimal places (e.g. 0 for rounded integers, 2 for invoices and VAT)
   */
  decimals?: number;
  /**
   * Duration in ms. Kept intentionally brief (default 240ms) to ensure accuracy
   */
  duration?: number;
  /**
   * Custom text style
   */
  style?: StyleProp<TextStyle>;
  /**
   * Alias for style
   */
  textStyle?: StyleProp<TextStyle>;
}

export const AnimatedFinancialNumber: React.FC<AnimatedFinancialNumberProps> = ({
  value,
  currency = 'AED',
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = motionDurations.cardCollapse, // 240ms brief transition
  style,
  textStyle,
}) => {
  const isReducedMotion = useReduceMotionPreference();
  const [displayValue, setDisplayValue] = useState<number>(value);

  const startValRef = useRef<number>(value);
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const resolvedStyle = textStyle || style;

  useEffect(() => {
    // If Reduce Motion is active or duration is 0, display authoritative target immediately
    if (isReducedMotion || duration <= 0) {
      setDisplayValue(value);
      return;
    }

    startValRef.current = displayValue;
    startTimeRef.current = Date.now();

    const update = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Decelerating cubic curve for immediate visual grounding
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startValRef.current + (value - startValRef.current) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(update);
      } else {
        // Enforce authoritative terminal value on completion
        setDisplayValue(value);
      }
    };

    animFrameRef.current = requestAnimationFrame(update);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [value, duration, isReducedMotion]);

  // Format stable numeric string
  const formatAmount = (num: number): string => {
    const isNegative = num < 0;
    const absVal = Math.abs(num);

    const formattedNum = absVal.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    const currPart = currency ? `${currency} ` : '';
    const sign = isNegative ? '-' : '';

    return `${sign}${currPart}${formattedNum}`;
  };

  return (
    <Text style={[{ fontVariant: ['tabular-nums'] }, resolvedStyle]}>
      {prefix}{formatAmount(displayValue)}{suffix}
    </Text>
  );
};
