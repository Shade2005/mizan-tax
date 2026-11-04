// ============================================================================
// Mizan (ميزان) - Hero Tax Liability Card Component
// Deep Burgundy Gradient Card with Animated Counters & SBR Relief Status
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, shadows, spacing } from '../theme/tokens';
import { useLocale } from '../context/LocaleContext';

interface HeroTaxCardProps {
  corporateTaxAmount: number;
  netVatPayable: number;
  revenue: number;
  expenses: number;
  isSbrEligible?: boolean;
  onPressDetails?: () => void;
}

export const HeroTaxCard: React.FC<HeroTaxCardProps> = ({
  corporateTaxAmount = 45000,
  netVatPayable = 8500,
  revenue = 1200000,
  expenses = 700000,
  isSbrEligible = true,
  onPressDetails,
}) => {
  const { t, isRTL } = useLocale();

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-US');
  };

  const formatShort = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return val.toString();
  };

  return (
    <View style={[styles.cardContainer, shadows.heroCard]}>
      {/* Top Banner Tag */}
      <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.businessBadge}>
          <Text style={styles.businessBadgeText}>Mainland LLC • Dubai</Text>
        </View>
        <Text style={styles.dateText}>MONDAY, 4 NOVEMBER</Text>
      </View>

      {/* Main Metric Title */}
      <Text style={[styles.metricLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t.home.estimatedTaxLiability}
      </Text>

      {/* Main Metric Value */}
      <View style={[styles.amountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.currencyPrefix}>{t.common.currency}</Text>
        <Text style={styles.primaryAmount}>{formatCurrency(corporateTaxAmount)}</Text>
      </View>

      <Text style={[styles.captionSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t.home.basedOnRecords}
      </Text>

      {/* Secondary Metrics Split Box */}
      <View style={[styles.splitMetricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.metricSubBox}>
          <Text style={styles.subBoxLabel}>{t.home.corporateTaxLabel}</Text>
          <Text style={styles.subBoxValue}>
            {t.common.currency} {formatCurrency(corporateTaxAmount)}
          </Text>
          {isSbrEligible && (
            <View style={styles.sbrPill}>
              <Text style={styles.sbrPillText}>{t.home.sbrStatusTag}</Text>
            </View>
          )}
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricSubBox}>
          <Text style={styles.subBoxLabel}>{t.home.netVatPayableLabel}</Text>
          <Text style={styles.subBoxValue}>
            {t.common.currency} {formatCurrency(netVatPayable)}
          </Text>
          <View style={styles.vatDuePill}>
            <Text style={styles.vatDuePillText}>Due 28 Aug</Text>
          </View>
        </View>
      </View>

      {/* Bottom Financial Overview Bar */}
      <View style={[styles.footerBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.footerStatItem}>
          <Text style={styles.footerStatLabel}>{t.home.revenueStat}</Text>
          <Text style={styles.footerStatValue}>
            {t.common.currency} {formatShort(revenue)}
          </Text>
        </View>

        <View style={styles.footerStatItem}>
          <Text style={styles.footerStatLabel}>{t.home.expensesStat}</Text>
          <Text style={styles.footerStatValue}>
            {t.common.currency} {formatShort(expenses)}
          </Text>
        </View>

        <View style={styles.footerStatItem}>
          <Text style={styles.footerStatLabel}>{t.home.taxSavingsFound}</Text>
          <Text style={[styles.footerStatValue, { color: colors.brand.cyan }]}>
            {t.home.opportunitiesCount}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.brand.burgundy,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand.burgundyLight,
  },
  topRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  businessBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  businessBadgeText: {
    color: colors.neutral.white,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  dateText: {
    color: colors.brand.blushAlt,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  metricLabel: {
    color: colors.brand.blush,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  amountRow: {
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  currencyPrefix: {
    color: colors.brand.cyan,
    fontSize: 20,
    fontWeight: '700',
    marginRight: spacing.xs + 2,
  },
  primaryAmount: {
    color: colors.neutral.white,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  captionSubtitle: {
    color: colors.brand.blushAlt,
    fontSize: 12,
    marginBottom: spacing.lg,
  },
  splitMetricsRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: radii.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  metricSubBox: {
    flex: 1,
    alignItems: 'flex-start',
  },
  metricDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: spacing.sm,
  },
  subBoxLabel: {
    color: colors.brand.blush,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  subBoxValue: {
    color: colors.neutral.white,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  sbrPill: {
    backgroundColor: 'rgba(0, 229, 255, 0.18)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  sbrPillText: {
    color: colors.brand.cyan,
    fontSize: 10,
    fontWeight: '700',
  },
  vatDuePill: {
    backgroundColor: 'rgba(255, 180, 193, 0.22)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  vatDuePillText: {
    color: colors.brand.blushAlt,
    fontSize: 10,
    fontWeight: '700',
  },
  footerBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: spacing.md,
    justifyContent: 'space-between',
  },
  footerStatItem: {
    alignItems: 'flex-start',
  },
  footerStatLabel: {
    color: colors.brand.blushAlt,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  footerStatValue: {
    color: colors.neutral.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
