// ============================================================================
// Mizan (ميزان) - Expense Review & Decision 17/2026 VAT Classifier Screen
// Explains exact VAT recoverability & Corporate Tax deductibility
// ============================================================================

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';

export default function ExpenseReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isRTL } = useLocale();

  const [category, setCategory] = useState<string>(
    (params.category as string) || 'DUTY_TRAVEL'
  );

  const merchantName = (params.merchantName as string) || 'Emirates Airline';
  const trn = (params.trn as string) || '100234567800003';
  const invoiceDate = (params.invoiceDate as string) || '02 Nov 2026';
  const amountAED = Number(params.amountAED) || 5250.0;
  const vatAED = Number(params.vatAED) || 250.0;
  const netAmount = amountAED - vatAED;

  const isDutyTravel = category === 'DUTY_TRAVEL';
  const isEntertainment = category === 'CLIENT_ENTERTAINMENT';
  const isRcm = category === 'REVERSE_CHARGE_SAAS';

  const handlePostToLedger = () => {
    Alert.alert(
      'Journal Entry Posted',
      `Balanced double-entry journal created for ${merchantName}.\nVAT Return Box 9/10 updated.`,
      [{ text: 'OK', onPress: () => router.replace('/(tabs)/books') }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.screenTitle}>{isRTL ? 'مراجعة المصروف والضريبة' : 'Review & Classify Expense'}</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Merchant & Amount Card */}
        <View style={[styles.card, shadows.card]}>
          <View style={styles.merchantHeader}>
            <View style={styles.merchantIconBadge}>
              <Text style={{ fontSize: 22 }}>{isDutyTravel ? '✈️' : isEntertainment ? '🍽️' : '☁️'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.merchantName}>{merchantName}</Text>
              <Text style={styles.merchantMeta}>Date: {invoiceDate} • TRN: {trn}</Text>
            </View>
            <View style={styles.trnBadge}>
              <Text style={styles.trnBadgeText}>{trn.startsWith('100') ? '✓ Valid TRN' : 'Foreign SaaS'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.amountGrid}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Net Amount</Text>
              <Text style={styles.amountVal}>AED {netAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>VAT (5%)</Text>
              <Text style={[styles.amountVal, { color: colors.brand.burgundy }]}>
                AED {vatAED.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Total Bill</Text>
              <Text style={styles.amountTotal}>AED {amountAED.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>
        </View>

        {/* Category Classification Selector */}
        <Text style={styles.sectionHeading}>Statutory Classification Category</Text>
        <View style={styles.categoryRow}>
          <TouchableOpacity
            style={[styles.catBtn, isDutyTravel && styles.catBtnActive]}
            onPress={() => setCategory('DUTY_TRAVEL')}
          >
            <Text style={[styles.catBtnText, isDutyTravel && styles.catBtnTextActive]}>Duty Travel (Dec 17)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.catBtn, isEntertainment && styles.catBtnActive]}
            onPress={() => setCategory('CLIENT_ENTERTAINMENT')}
          >
            <Text style={[styles.catBtnText, isEntertainment && styles.catBtnTextActive]}>Entertainment (Art 53)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.catBtn, isRcm && styles.catBtnActive]}
            onPress={() => setCategory('REVERSE_CHARGE_SAAS')}
          >
            <Text style={[styles.catBtnText, isRcm && styles.catBtnTextActive]}>Foreign SaaS (RCM)</Text>
          </TouchableOpacity>
        </View>

        {/* Statutory Tax Impact Explanation Box */}
        {isDutyTravel && (
          <View style={[styles.verdictCard, { borderColor: colors.semantic.success }, shadows.card]}>
            <View style={styles.verdictTopRow}>
              <View style={[styles.statusPill, { backgroundColor: colors.semantic.successBg }]}>
                <Text style={[styles.statusPillText, { color: '#007A70' }]}>✓ 100% Fully Recoverable Input VAT</Text>
              </View>
              <Text style={styles.lawTag}>Decision No. 17 of 2026</Text>
            </View>
            <Text style={styles.verdictHeadline}>Employee Business Travel & Duty Performance</Text>
            <Text style={styles.verdictDesc}>
              Under the new FTA Decision No. 17 of 2026, employee business travel and transport mandated by employment policy or required for duties is strictly 100% recoverable in VAT Return Box 9.
            </Text>
            <View style={styles.ctImpactRow}>
              <Text style={styles.ctImpactLabel}>Corporate Tax Impact:</Text>
              <Text style={styles.ctImpactValue}>100% Tax Deductible (Art. 28)</Text>
            </View>
          </View>
        )}

        {isEntertainment && (
          <View style={[styles.verdictCard, { borderColor: colors.semantic.risk }, shadows.card]}>
            <View style={styles.verdictTopRow}>
              <View style={[styles.statusPill, { backgroundColor: colors.semantic.riskBg }]}>
                <Text style={[styles.statusPillText, { color: colors.semantic.risk }]}>✕ 0% Blocked Input VAT</Text>
              </View>
              <Text style={styles.lawTag}>Art. 53(1)(a) & Art. 32 CT</Text>
            </View>
            <Text style={styles.verdictHeadline}>Client Entertainment & Hospitality Restriction</Text>
            <Text style={styles.verdictDesc}>
              Under Article 53(1)(a) of the VAT Executive Regulations, input VAT on entertainment and hospitality provided to clients or non-employees cannot be recovered.
            </Text>
            <View style={styles.ctImpactRow}>
              <Text style={styles.ctImpactLabel}>Corporate Tax Impact:</Text>
              <Text style={[styles.ctImpactValue, { color: colors.semantic.risk }]}>50% Disallowed Addback (Art. 32)</Text>
            </View>
          </View>
        )}

        {isRcm && (
          <View style={[styles.verdictCard, { borderColor: colors.brand.cyan }, shadows.card]}>
            <View style={styles.verdictTopRow}>
              <View style={[styles.statusPill, { backgroundColor: '#E0FAF7' }]}>
                <Text style={[styles.statusPillText, { color: '#008C82' }]}>⚡ Reverse Charge Mechanism (RCM)</Text>
              </View>
              <Text style={styles.lawTag}>Art. 48 & Box 3 / Box 10</Text>
            </View>
            <Text style={styles.verdictHeadline}>Cross-Border B2B Imported Services</Text>
            <Text style={styles.verdictDesc}>
              Purchases from foreign digital providers (AWS, Google, Slack) trigger RCM. Deemed 5% VAT is reported in Box 3 (Output) and simultaneously recovered in Box 10 (Input). Net cash impact is AED 0.
            </Text>
            <View style={styles.ctImpactRow}>
              <Text style={styles.ctImpactLabel}>Corporate Tax Impact:</Text>
              <Text style={styles.ctImpactValue}>100% Tax Deductible SaaS</Text>
            </View>
          </View>
        )}

        {/* Double-Entry Journal Preview */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.cardHeader}>Automated Double-Entry Journal Posting</Text>
          <View style={styles.journalLine}>
            <Text style={styles.journalAccount}>Debit: Operating Expense ({merchantName})</Text>
            <Text style={styles.journalAmount}>AED {netAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.journalLine}>
            <Text style={styles.journalAccount}>
              {isDutyTravel ? 'Debit: 1150 Input VAT Recoverable' : isEntertainment ? 'Debit: Non-Recoverable VAT Expense' : 'Debit: RCM Input Tax (Box 10)'}
            </Text>
            <Text style={styles.journalAmount}>AED {vatAED.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.journalLine}>
            <Text style={styles.journalAccount}>Credit: 2010 Accounts Payable / Bank</Text>
            <Text style={styles.journalAmount}>AED {amountAED.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        {/* Bottom CTA Button */}
        <TouchableOpacity style={[styles.postButton, shadows.pillButton]} activeOpacity={0.85} onPress={handlePostToLedger}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.neutral.white} style={{ marginRight: 6 }} />
          <Text style={styles.postButtonText}>Post to Double-Entry Ledger →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.canvas },
  topBar: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  screenTitle: { fontSize: 18, fontWeight: '700', color: colors.neutral.textPrimary },
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  merchantHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  merchantIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.blushSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand.blushAlt,
  },
  merchantName: { fontSize: 16, fontWeight: '700', color: colors.neutral.textPrimary },
  merchantMeta: { fontSize: 11, color: colors.neutral.textSecondary, marginTop: 2 },
  trnBadge: {
    backgroundColor: colors.semantic.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  trnBadgeText: { fontSize: 10, fontWeight: '700', color: '#007A70' },
  divider: { height: 1, backgroundColor: colors.neutral.border, marginVertical: spacing.md },
  amountGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  amountItem: { flex: 1 },
  amountLabel: { fontSize: 11, color: colors.neutral.textSecondary, marginBottom: 2 },
  amountVal: { fontSize: 14, fontWeight: '700', color: colors.neutral.textPrimary },
  amountTotal: { fontSize: 15, fontWeight: '800', color: colors.brand.burgundy },
  sectionHeading: { fontSize: 15, fontWeight: '700', color: colors.neutral.textPrimary, marginBottom: spacing.sm },
  categoryRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  catBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: radii.md,
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    alignItems: 'center',
  },
  catBtnActive: { backgroundColor: colors.brand.burgundy, borderColor: colors.brand.burgundy },
  catBtnText: { fontSize: 11, fontWeight: '700', color: colors.neutral.textSecondary, textAlign: 'center' },
  catBtnTextActive: { color: colors.neutral.white },
  verdictCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
  },
  verdictTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  statusPill: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs, borderRadius: radii.pill },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  lawTag: { fontSize: 10, fontWeight: '700', color: colors.neutral.textSecondary },
  verdictHeadline: { fontSize: 15, fontWeight: '700', color: colors.neutral.textPrimary, marginBottom: spacing.xs },
  verdictDesc: { fontSize: 12, lineHeight: 18, color: colors.neutral.textSecondary, marginBottom: spacing.md },
  ctImpactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.brand.blushSoft,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
  },
  ctImpactLabel: { fontSize: 12, fontWeight: '600', color: colors.brand.burgundy },
  ctImpactValue: { fontSize: 12, fontWeight: '700', color: colors.brand.burgundy },
  cardHeader: { fontSize: 14, fontWeight: '700', color: colors.neutral.textPrimary, marginBottom: spacing.sm },
  journalLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  journalAccount: { fontSize: 12, color: colors.neutral.textSecondary },
  journalAmount: { fontSize: 12, fontWeight: '700', color: colors.neutral.textPrimary },
  postButton: {
    backgroundColor: colors.brand.burgundy,
    borderRadius: radii.pill,
    paddingVertical: spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonText: { color: colors.neutral.white, fontSize: 15, fontWeight: '700' },
});
