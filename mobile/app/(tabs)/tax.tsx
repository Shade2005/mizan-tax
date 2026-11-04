// ============================================================================
// Mizan (ميزان) - Tax Intelligence Hub
// Corporate Tax Assessment & VAT 201 Return Workspace
// ============================================================================

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';

export default function TaxScreen() {
  const { t, isRTL } = useLocale();
  const [activeSegment, setActiveSegment] = useState<'ct' | 'vat'>('ct');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.title}>{t.tax.title}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>✓ {t.tax.likelyCompliant}</Text>
          </View>
        </View>

        {/* CT vs VAT Segment Control */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeSegment === 'ct' && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveSegment('ct')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'ct' && styles.segmentTextActive,
              ]}
            >
              {t.tax.ctTab}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeSegment === 'vat' && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveSegment('vat')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'vat' && styles.segmentTextActive,
              ]}
            >
              {t.tax.vatTab}
            </Text>
          </TouchableOpacity>
        </View>

        {activeSegment === 'ct' ? (
          /* CORPORATE TAX CONTENT */
          <View style={styles.tabContent}>
            {/* Taxable Income Summary Box */}
            <View style={[styles.summaryCard, shadows.card]}>
              <Text style={[styles.cardSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t.tax.taxableIncome} (FY 2026)
              </Text>
              <Text style={[styles.mainFigure, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t.common.currency} 500,000
              </Text>
              <View style={styles.divider} />

              <View style={[styles.dataRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.dataLabel}>{t.tax.exemptThreshold}</Text>
                <Text style={styles.dataValue}>{t.common.currency} 0.00</Text>
              </View>

              <View style={[styles.dataRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.dataLabel}>{t.tax.statutoryRate}</Text>
                <Text style={styles.dataValueHighlight}>
                  {t.common.currency} 11,250
                </Text>
              </View>
            </View>

            {/* Small Business Relief Card */}
            <View style={[styles.sbrBanner, shadows.card]}>
              <View style={styles.sbrHeaderRow}>
                <Text style={styles.sbrTitle}>Small Business Relief Status</Text>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Eligible</Text>
                </View>
              </View>
              <Text style={styles.sbrText}>
                Revenue of AED 1.2M is below the AED 3,000,000 threshold. By electing Small Business Relief under Article 21, taxable income is reduced to AED 0.
              </Text>
            </View>

            {/* PDF Export Button */}
            <TouchableOpacity style={[styles.downloadButton, shadows.pillButton]} activeOpacity={0.85}>
              <Text style={styles.downloadButtonText}>📥 {t.tax.exportHealthReport}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* VAT 201 RETURN CONTENT */
          <View style={styles.tabContent}>
            <View style={[styles.summaryCard, shadows.card]}>
              <Text style={[styles.cardSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                VAT 201 Return (Q2 2026)
              </Text>
              <Text style={[styles.mainFigure, { textAlign: isRTL ? 'right' : 'left', color: colors.brand.burgundy }]}>
                {t.common.currency} 8,500
              </Text>
              <Text style={[styles.vatNote, { textAlign: isRTL ? 'right' : 'left' }]}>
                Net VAT Payable to FTA
              </Text>
              <View style={styles.divider} />

              <View style={[styles.dataRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.dataLabel}>Box 1: Standard Supplies (5%)</Text>
                <Text style={styles.dataValue}>{t.common.currency} 12,000</Text>
              </View>
              <View style={[styles.dataRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.dataLabel}>Box 3: Reverse Charge (RCM)</Text>
                <Text style={styles.dataValue}>{t.common.currency} 1,000</Text>
              </View>
              <View style={[styles.dataRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.dataLabel}>Box 9: Recoverable Input VAT</Text>
                <Text style={styles.dataValue}>{t.common.currency} -4,500</Text>
              </View>
            </View>
          </View>
        )}
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
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  statusBadge: {
    backgroundColor: colors.semantic.successBg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 193, 0.3)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#008C82',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.brand.blushSoft,
    borderRadius: radii.pill,
    padding: 4,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand.blushAlt,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  segmentButtonActive: {
    backgroundColor: colors.brand.burgundy,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  segmentTextActive: {
    color: colors.neutral.white,
  },
  tabContent: {
    paddingHorizontal: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
    marginBottom: spacing.xs,
  },
  mainFigure: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
  },
  vatNote: {
    fontSize: 12,
    color: colors.semantic.risk,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.border,
    marginBottom: spacing.md,
  },
  dataRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dataLabel: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  dataValueHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  sbrBanner: {
    backgroundColor: colors.brand.blushSoft,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.brand.blushAlt,
  },
  sbrHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sbrTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  activePill: {
    backgroundColor: colors.brand.burgundy,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  activePillText: {
    color: colors.neutral.white,
    fontSize: 10,
    fontWeight: '700',
  },
  sbrText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.neutral.textSecondary,
  },
  downloadButton: {
    backgroundColor: colors.brand.burgundy,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
