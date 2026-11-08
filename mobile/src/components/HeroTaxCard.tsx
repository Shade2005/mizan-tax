// ============================================================================
// Mizan (ميزان) - Hero Tax Liability Card Component
// Deep Burgundy Multi-Layer Card with Animated Counters & SBR Relief Meter
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '../theme/tokens';
import { useLocale } from '../context/LocaleContext';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { AnimatedProgressBar } from '../animations';

interface HeroTaxCardProps {
  corporateTaxAmount: number;
  netVatPayable: number;
  revenue: number;
  expenses: number;
  isSbrEligible?: boolean;
  taxRegime?: string;
  onPressDetails?: () => void;
}

const SBR_THRESHOLD = 3000000; // Statutory AED 3M SBR cap (Art. 21 Law No. 47/2022)

export const HeroTaxCard: React.FC<HeroTaxCardProps> = ({
  corporateTaxAmount = 45000,
  netVatPayable = 8500,
  revenue = 1200000,
  expenses = 700000,
  isSbrEligible = true,
  taxRegime,
}) => {
  const { t, isRTL } = useLocale();

  // Animated counters for smooth fintech number presentation
  const animatedCt = useAnimatedNumber(corporateTaxAmount, 900);
  const animatedVat = useAnimatedNumber(netVatPayable, 850);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-US');
  };

  const formatShort = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return val.toString();
  };

  const sbrPercent = Math.min(Math.round((revenue / SBR_THRESHOLD) * 100), 100);

  return (
    <View style={[styles.cardContainer, shadows.heroCard]}>
      {/* Visual Depth Accent: Subtle Cyan Ambient Glow in Corner */}
      <View style={styles.cyanGlowOrb} />
      <View style={styles.burgundyDepthOrb} />

      {/* Top Banner Tag */}
      <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.businessBadge}>
          <Text style={styles.businessBadgeText}>{taxRegime || 'Mainland LLC • Dubai'}</Text>
        </View>
        <Text style={styles.dateText}>MONDAY, 4 NOVEMBER</Text>
      </View>

      {/* Main Metric Title */}
      <Text style={[styles.metricLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t.home.estimatedTaxLiability}
      </Text>

      {/* Main Metric Value with Animated Counter */}
      <View style={[styles.amountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.currencyPrefix}>{t.common.currency}</Text>
        <Text style={styles.primaryAmount}>{formatCurrency(animatedCt)}</Text>
      </View>

      <Text style={[styles.captionSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t.home.basedOnRecords}
      </Text>

      {/* SBR 0% Relief Progress Meter */}
      {isSbrEligible && (
        <View style={styles.sbrMeterContainer}>
          <View style={[styles.sbrMeterHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.sbrHeaderLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="shield-checkmark" size={13} color={colors.brand.cyan} />
              <Text style={styles.sbrMeterTitle}>SBR THRESHOLD (AED 3M)</Text>
            </View>
            <Text style={styles.sbrMeterPercent}>
              {sbrPercent}% used ({t.common.currency} {formatShort(revenue)})
            </Text>
          </View>

          {/* Progress Track */}
          <View style={{ marginVertical: 6 }}>
            <AnimatedProgressBar
              progress={sbrPercent}
              height={4}
              trackColor="rgba(255,255,255,0.12)"
              barColor={colors.brand.cyan}
            />
          </View>

          <View style={[styles.sbrMeterFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.sbrSubtext}>
              {isRTL ? 'مؤهل للإعفاء بنسبة 0% تحت المادة 21' : 'Eligible for 0% Corporate Tax under Art. 21'}
            </Text>
            <View style={styles.sbrActivePill}>
              <Text style={styles.sbrActivePillText}>0% CT</Text>
            </View>
          </View>
        </View>
      )}

      {/* Secondary Metrics Split Box */}
      <View style={[styles.splitMetricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.metricSubBox}>
          <Text style={styles.subBoxLabel}>{t.home.corporateTaxLabel}</Text>
          <Text style={styles.subBoxValue}>
            {t.common.currency} {formatCurrency(animatedCt)}
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
            {t.common.currency} {formatCurrency(animatedVat)}
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
    backgroundColor: colors.brand.burgundyDark,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    position: 'relative',
  },
  cyanGlowOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  burgundyDepthOrb: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.brand.burgundy,
    opacity: 0.8,
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
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
    marginBottom: spacing.md,
  },
  sbrMeterContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.22)',
  },
  sbrMeterHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  sbrHeaderLeft: {
    alignItems: 'center',
    gap: 4,
  },
  sbrMeterTitle: {
    color: colors.brand.cyan,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  sbrMeterPercent: {
    color: colors.neutral.white,
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.brand.cyan,
    borderRadius: 3,
  },
  sbrMeterFooter: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  sbrSubtext: {
    color: colors.brand.blushAlt,
    fontSize: 10,
    fontWeight: '500',
    flex: 1,
  },
  sbrActivePill: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand.cyan,
  },
  sbrActivePillText: {
    color: colors.brand.cyan,
    fontSize: 9,
    fontWeight: '800',
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
