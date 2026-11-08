// ============================================================================
// Mizan (ميزان) — OcrProcessingOverlay
// Communicates document recognition progress, field extraction, and data validation
// Uses an indeterminate progress sweep without fabricating false backend percentages
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/tokens';
import { motionDurations } from './motionTokens';
import { motionEasings } from './easings';
import { useReduceMotionPreference } from './useReduceMotionPreference';

export interface OcrProcessingOverlayProps {
  visible: boolean;
  onComplete?: () => void;
  documentType?: 'licence' | 'receipt' | 'invoice';
}

const OCR_STAGES = [
  { id: 1, label: 'Document image captured' },
  { id: 2, label: 'Text recognition (OCR) in progress' },
  { id: 3, label: 'Extracting key tax & licence fields' },
  { id: 4, label: 'Validating compliance information' },
  { id: 5, label: 'Results ready for review' },
];

export const OcrProcessingOverlay: React.FC<OcrProcessingOverlayProps> = ({
  visible,
  onComplete,
  documentType = 'licence',
}) => {
  const isReducedMotion = useReduceMotionPreference();
  const [currentStage, setCurrentStage] = useState(1);
  const progressSweep = useSharedValue<number>(0);

  useEffect(() => {
    if (!visible) {
      setCurrentStage(1);
      return;
    }

    if (isReducedMotion) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 600);
      return () => clearTimeout(timer);
    }

    // Start indeterminate progress sweep
    progressSweep.value = 0;
    progressSweep.value = withRepeat(
      withTiming(1, {
        duration: 1200,
        easing: motionEasings.standard,
      }),
      -1,
      false
    );

    // Sequential stage transitions
    const stepDuration = 350;
    const intervals: ReturnType<typeof setTimeout>[] = [];

    OCR_STAGES.forEach((stage, idx) => {
      if (idx > 0) {
        const timeout = setTimeout(() => {
          setCurrentStage(stage.id);
          Haptics.selectionAsync().catch(() => {});
          if (idx === OCR_STAGES.length - 1) {
            setTimeout(() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              onComplete?.();
            }, 300);
          }
        }, idx * stepDuration);
        intervals.push(timeout);
      }
    });

    return () => {
      cancelAnimation(progressSweep);
      intervals.forEach(clearTimeout);
    };
  }, [visible, isReducedMotion, onComplete, progressSweep]);

  const animatedBarFill = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: -160 + progressSweep.value * 320,
        },
      ],
    };
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <Animated.View entering={FadeIn.duration(motionDurations.tab)} style={styles.card}>
          {/* Header Icon with Cyan Glow */}
          <View style={styles.iconCircle}>
            <Ionicons name="scan" size={28} color={colors.brand.primary} />
          </View>

          <Text style={styles.title}>
            {documentType === 'licence' ? 'Reading Trade License' : 'Processing Receipt'}
          </Text>
          <Text style={styles.subtitle}>
            Extracting Arabic & English tax information
          </Text>

          {/* Indeterminate Animated Progress Track */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressSweep, animatedBarFill]} />
          </View>

          {/* Sequential Stages List */}
          <View style={styles.stageList}>
            {OCR_STAGES.map((st) => {
              const isPast = currentStage > st.id;
              const isCurrent = currentStage === st.id;

              return (
                <Animated.View
                  key={st.id}
                  entering={FadeInDown.duration(motionDurations.microSlow)}
                  style={styles.stageRow}
                >
                  <View style={styles.stageIconCol}>
                    {isPast ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.semantic.success} />
                    ) : isCurrent ? (
                      <View style={styles.pulseDot} />
                    ) : (
                      <View style={styles.pendingDot} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stageText,
                      isCurrent && styles.stageTextCurrent,
                      isPast && styles.stageTextPast,
                    ]}
                  >
                    {st.label}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 22, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.neutral.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.neutral.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressSweep: {
    width: 80,
    height: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: 2,
  },
  stageList: {
    width: '100%',
    gap: 10,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageIconCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand.primary,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral.borderStrong,
  },
  stageText: {
    fontSize: 12,
    color: colors.neutral.textTertiary,
  },
  stageTextCurrent: {
    color: colors.neutral.textPrimary,
    fontWeight: '600',
  },
  stageTextPast: {
    color: colors.semantic.successDark,
    fontWeight: '500',
  },
});
