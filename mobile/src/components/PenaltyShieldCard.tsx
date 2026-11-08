// ============================================================================
// Mizan (ميزان) - Compliance Penalty Shield Card Component
// Staggered Corporate Tax Registration Countdown (FTA Decision No. 3 of 2024)
// Alerts user to avert the statutory AED 10,000 late penalty
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, spacing } from '../theme/tokens';
import { useLocale } from '../context/LocaleContext';

interface PenaltyShieldCardProps {
  daysRemaining?: number;
  deadlineDate?: string;
  penaltyAmount?: string;
  onPressFiling?: () => void;
}

export const PenaltyShieldCard: React.FC<PenaltyShieldCardProps> = ({
  daysRemaining = 14,
  deadlineDate = '31 July',
  penaltyAmount = '10,000',
  onPressFiling,
}) => {
  const { t, isRTL } = useLocale();

  return (
    <View style={[styles.card, shadows.card]}>
      {/* Header Pill */}
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.alertPill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="warning-outline" size={13} color={colors.semantic.risk} style={isRTL ? { marginLeft: 4 } : { marginRight: 4 }} />
          <Text style={styles.alertPillText}>{t.home.penaltyAmountRisk}</Text>
        </View>
        <View style={styles.daysBadge}>
          <Text style={styles.daysBadgeText}>{t.home.daysRemaining}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t.home.penaltyShieldTitle}
      </Text>

      {/* Description */}
      <Text style={[styles.description, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t.home.penaltyShieldDesc}
      </Text>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.actionButton, shadows.pillButton]}
        activeOpacity={0.85}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPressFiling?.();
        }}
      >
        <View style={[styles.actionButtonContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.actionButtonText}>
            {t.home.startAssistedFiling}
          </Text>
          <Ionicons
            name={isRTL ? 'arrow-back' : 'arrow-forward'}
            size={15}
            color={colors.neutral.white}
            style={isRTL ? { marginRight: 6 } : { marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.brand.blushSoft,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.brand.blushAlt,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  alertPill: {
    backgroundColor: colors.semantic.riskBg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  alertPillText: {
    color: colors.semantic.risk,
    fontSize: 11,
    fontWeight: '700',
  },
  daysBadge: {
    backgroundColor: 'rgba(74, 0, 31, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  daysBadgeText: {
    color: colors.brand.burgundy,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.burgundy,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.neutral.textSecondary,
    marginBottom: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.brand.burgundy,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
