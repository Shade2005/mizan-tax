// ============================================================================
// Mizan (ميزان) - Home Dashboard Screen
// The Central Command Hub for UAE Tax Intelligence & Compliance
// ============================================================================

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { HeroTaxCard } from '../../src/components/HeroTaxCard';
import { PenaltyShieldCard } from '../../src/components/PenaltyShieldCard';
import { QuickActionRow } from '../../src/components/QuickActionRow';
import { TaxOpportunityCard } from '../../src/components/TaxOpportunityCard';

export default function HomeScreen() {
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.burgundy}
            colors={[colors.brand.burgundy]}
          />
        }
      >
        {/* Top Header & Bilingual Toggle */}
        <ScreenHeader />

        {/* Hero Tax Liability Card */}
        <HeroTaxCard
          corporateTaxAmount={45000}
          netVatPayable={8500}
          revenue={1200000}
          expenses={700000}
          isSbrEligible={true}
        />

        {/* Compliance Penalty Shield */}
        <PenaltyShieldCard
          daysRemaining={14}
          deadlineDate="31 July"
          penaltyAmount="10,000"
        />

        {/* Quick Action Navigation Grid */}
        <QuickActionRow
          onScanLicence={() => router.push('/scan')}
          onScanReceipt={() => router.push('/expenses/scan')}
          onNewInvoice={() => router.push('/invoices/new')}
          onAskAi={() => router.push('/learn/chat')}
        />

        {/* Legitimate Tax Opportunities Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t.home.topOpportunities}
          </Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAllText}>{t.home.viewAll}</Text>
          </TouchableOpacity>
        </View>

        <TaxOpportunityCard
          title={t.home.sbrTitle}
          legalReference="Art. 21 Law No. 47/2022 & MD 73/2023"
          description={t.home.sbrDesc}
          savingsBadgeText={t.home.sbrSavings}
        />

        <TaxOpportunityCard
          title={t.home.rcmTitle}
          legalReference="Art. 48 & Box 10 FTA Return 201"
          description={t.home.rcmDesc}
          savingsBadgeText={t.home.rcmSavings}
        />

        {/* Upcoming Deadlines Widget */}
        <View style={styles.deadlinesCard}>
          <View style={[styles.deadlineHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.deadlineTitle}>📅 {t.home.upcomingDeadlines}</Text>
          </View>

          <View style={[styles.deadlinesList, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.deadlineItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.deadlineBullet} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deadlineItemTitle}>{t.home.vatReturnQuarterly}</Text>
                <Text style={styles.deadlineItemDate}>{t.home.vatReturnDueDate}</Text>
              </View>
            </View>

            <View style={[styles.deadlineItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.deadlineBullet, { backgroundColor: colors.semantic.info }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deadlineItemTitle}>{t.home.tradeLicenceRenewal}</Text>
                <Text style={styles.deadlineItemDate}>{t.home.tradeLicenceDueDate}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.section,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  deadlinesCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  deadlineHeader: {
    marginBottom: spacing.md,
  },
  deadlineTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  deadlinesList: {
    gap: spacing.md,
  },
  deadlineItem: {
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
  },
  deadlineBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.burgundy,
    marginTop: 5,
  },
  deadlineItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  deadlineItemDate: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
});
