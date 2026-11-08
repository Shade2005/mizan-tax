// ============================================================================
// Mizan (ميزان) - Tax Opportunity Card Component
// Displays Legitimate Statutory Savings with Official Article Citations
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '../theme/tokens';
import { useLocale } from '../context/LocaleContext';

interface TaxOpportunityCardProps {
  title: string;
  legalReference: string;
  description: string;
  savingsBadgeText: string;
  onPress?: () => void;
}

export const TaxOpportunityCard: React.FC<TaxOpportunityCardProps> = ({
  title,
  legalReference,
  description,
  savingsBadgeText,
  onPress,
}) => {
  const { isRTL } = useLocale();

  return (
    <TouchableOpacity
      style={[styles.card, shadows.card]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.legalTag}>
          <Text style={styles.legalTagText}>{legalReference}</Text>
        </View>
        <View style={styles.savingsPill}>
          <Text style={styles.savingsPillText}>{savingsBadgeText}</Text>
        </View>
      </View>

      <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
        {title}
      </Text>

      <Text style={[styles.description, { textAlign: isRTL ? 'right' : 'left' }]}>
        {description}
      </Text>

      <View style={[styles.bottomRow, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: isRTL ? 'flex-start' : 'flex-end' }]}>
        <Text style={styles.actionPrompt}>
          {isRTL ? 'مراجعة الفرصة والمطالبة' : 'Review & Claim Opportunity'}
        </Text>
        <Ionicons
          name={isRTL ? 'arrow-back' : 'arrow-forward'}
          size={14}
          color={colors.brand.burgundy}
          style={isRTL ? { marginRight: 4 } : { marginLeft: 4 }}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  topRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  legalTag: {
    backgroundColor: colors.semantic.infoBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 1,
    borderRadius: radii.sm,
  },
  legalTagText: {
    color: '#1B4D8C',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  savingsPill: {
    backgroundColor: colors.semantic.successBg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 193, 0.3)',
  },
  savingsPillText: {
    color: '#008C82',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.neutral.textSecondary,
    marginBottom: spacing.md,
  },
  bottomRow: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
    paddingTop: spacing.sm,
    justifyContent: 'flex-end',
  },
  actionPrompt: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
});
