// ============================================================================
// Mizan (ميزان) - Upgraded Books & Double-Entry Ledger Screen
// Real-time P&L, Sales Invoices, Decision 17/2026 Expenses & General Ledger
// ============================================================================

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';

export default function BooksScreen() {
  const router = useRouter();
  const { t, isRTL } = useLocale();

  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses' | 'ledger'>('invoices');

  const invoices = [
    {
      id: 'INV-2026-0014',
      customer: 'Dubai Media City FZ-LLC',
      date: '02 Nov 2026',
      amount: '10,500.00',
      vat: '500.00',
      status: 'ISSUED',
      currency: 'AED',
    },
    {
      id: 'INV-2026-0013',
      customer: 'Emirates Global Aluminium',
      date: '28 Oct 2026',
      amount: '31,500.00',
      vat: '1,500.00',
      status: 'PAID',
      currency: 'AED',
    },
    {
      id: 'INV-2026-0012',
      customer: 'Riyadh Tech Partners',
      date: '20 Oct 2026',
      amount: '25,000.00',
      vat: '0.00',
      status: 'PAID',
      currency: 'SAR',
    },
  ];

  const expenses = [
    {
      id: 'EXP-101',
      merchant: 'Emirates Airline (Business Travel)',
      date: '02 Nov 2026',
      total: '5,250.00',
      vat: '250.00',
      tag: '100% Recoverable (Dec 17)',
      tagColor: '#007A70',
      tagBg: '#E0FAF7',
    },
    {
      id: 'EXP-102',
      merchant: 'Zuma DIFC (Client Dinner)',
      date: '01 Nov 2026',
      total: '1,260.00',
      vat: '60.00',
      tag: 'Blocked VAT (Art 53)',
      tagColor: colors.semantic.risk,
      tagBg: colors.semantic.riskBg,
    },
    {
      id: 'EXP-103',
      merchant: 'Amazon Web Services (Cloud SaaS)',
      date: '28 Oct 2026',
      total: '1,836.25',
      vat: '91.81',
      tag: 'RCM Neutral (Box 3 & 10)',
      tagColor: '#008C82',
      tagBg: '#E0FAF7',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.title}>{t.tabs.books}</Text>

        <View style={styles.headerButtonsRow}>
          <TouchableOpacity
            style={styles.scanBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/expenses/scan')}
          >
            <Ionicons name="camera-outline" size={16} color={colors.brand.burgundy} style={{ marginRight: 4 }} />
            <Text style={styles.scanBtnText}>Scan Bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newInvoiceBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/invoices/new')}
          >
            <Ionicons name="add" size={16} color={colors.neutral.white} style={{ marginRight: 2 }} />
            <Text style={styles.newInvoiceText}>Invoice</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* P&L Net Operating Profit Summary Card */}
        <View style={[styles.summaryCard, shadows.card]}>
          <Text style={[styles.summaryLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
            Net Operating Profit (FY 2026 YTD)
          </Text>
          <Text style={[styles.summaryAmount, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t.common.currency} 500,000.00
          </Text>

          <View style={[styles.splitRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Accounts Receivable</Text>
              <Text style={styles.splitValue}>{t.common.currency} 145,000</Text>
              <Text style={styles.splitSub}>Due from clients</Text>
            </View>
            <View style={styles.splitDivider} />
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Accounts Payable</Text>
              <Text style={styles.splitValue}>{t.common.currency} 62,000</Text>
              <Text style={styles.splitSub}>Owed to suppliers</Text>
            </View>
          </View>
        </View>

        {/* Segmented Switcher */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'invoices' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('invoices')}
          >
            <Text style={[styles.segmentText, activeTab === 'invoices' && styles.segmentTextActive]}>
              Invoices ({invoices.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'expenses' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('expenses')}
          >
            <Text style={[styles.segmentText, activeTab === 'expenses' && styles.segmentTextActive]}>
              Expenses ({expenses.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'ledger' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('ledger')}
          >
            <Text style={[styles.segmentText, activeTab === 'ledger' && styles.segmentTextActive]}>
              General Ledger
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: INVOICES LIST */}
        {activeTab === 'invoices' && (
          <View style={styles.listContainer}>
            {invoices.map((inv) => (
              <View key={inv.id} style={[styles.itemCard, shadows.card]}>
                <View style={[styles.itemTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invNumber}>{inv.id}</Text>
                    <Text style={styles.customerName}>{inv.customer}</Text>
                    <Text style={styles.invMeta}>Issued: {inv.date} • Includes {inv.vat} VAT</Text>
                  </View>
                  <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                    <Text style={styles.invAmount}>{inv.amount} {inv.currency}</Text>
                    <View style={[styles.statusBadge, inv.status === 'PAID' ? styles.statusPaid : styles.statusIssued]}>
                      <Text style={[styles.statusBadgeText, inv.status === 'PAID' ? styles.statusPaidText : styles.statusIssuedText]}>
                        {inv.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 2: EXPENSES LIST WITH DECISION 17 TAGS */}
        {activeTab === 'expenses' && (
          <View style={styles.listContainer}>
            {expenses.map((exp) => (
              <View key={exp.id} style={[styles.itemCard, shadows.card]}>
                <View style={[styles.itemTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{exp.merchant}</Text>
                    <Text style={styles.invMeta}>Date: {exp.date} • VAT: {exp.vat} AED</Text>
                    <View style={[styles.expPill, { backgroundColor: exp.tagBg }]}>
                      <Text style={[styles.expPillText, { color: exp.tagColor }]}>{exp.tag}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                    <Text style={styles.invAmount}>{exp.total} AED</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: GENERAL LEDGER ACCOUNTS */}
        {activeTab === 'ledger' && (
          <View style={styles.listContainer}>
            <View style={[styles.itemCard, shadows.card]}>
              <Text style={styles.ledgerHeader}>Standard UAE Double-Entry Chart of Accounts</Text>
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerCode}>1010</Text>
                <Text style={styles.ledgerName}>Cash & Bank Equivalents</Text>
                <Text style={styles.ledgerBal}>AED 320,000</Text>
              </View>
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerCode}>1150</Text>
                <Text style={styles.ledgerName}>Input VAT Recoverable (Box 9/10)</Text>
                <Text style={styles.ledgerBal}>AED 14,250</Text>
              </View>
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerCode}>2150</Text>
                <Text style={styles.ledgerName}>Output VAT Payable (Box 1/3)</Text>
                <Text style={styles.ledgerBal}>AED 22,750</Text>
              </View>
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerCode}>4010</Text>
                <Text style={styles.ledgerName}>Operating Sales Revenue (5%)</Text>
                <Text style={styles.ledgerBal}>AED 1,200,000</Text>
              </View>
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerCode}>6010</Text>
                <Text style={styles.ledgerName}>Allowable Business Expenses (Art 28)</Text>
                <Text style={styles.ledgerBal}>AED 700,000</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.canvas },
  container: { flex: 1 },
  contentContainer: { paddingBottom: spacing.section },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.neutral.textPrimary },
  headerButtonsRow: { flexDirection: 'row', gap: spacing.xs + 2 },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.blushSoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand.blushAlt,
  },
  scanBtnText: { color: colors.brand.burgundy, fontSize: 12, fontWeight: '700' },
  newInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.burgundy,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  newInvoiceText: { color: colors.neutral.white, fontSize: 12, fontWeight: '700' },
  summaryCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  summaryLabel: { fontSize: 12, color: colors.neutral.textSecondary, fontWeight: '600', marginBottom: 4 },
  summaryAmount: { fontSize: 30, fontWeight: '800', color: colors.neutral.textPrimary, marginBottom: spacing.lg },
  splitRow: {
    justifyContent: 'space-between',
    backgroundColor: colors.brand.blushSoft,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  splitItem: { flex: 1 },
  splitDivider: { width: 1, backgroundColor: colors.brand.blushAlt, marginHorizontal: spacing.sm },
  splitLabel: { fontSize: 11, color: colors.neutral.textSecondary, marginBottom: 2 },
  splitValue: { fontSize: 15, fontWeight: '700', color: colors.brand.burgundy },
  splitSub: { fontSize: 10, color: colors.neutral.textSecondary, marginTop: 1 },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.brand.blushSoft,
    borderRadius: radii.pill,
    padding: 3,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand.blushAlt,
  },
  segmentBtn: { flex: 1, paddingVertical: spacing.xs + 3, alignItems: 'center', borderRadius: radii.pill },
  segmentBtnActive: { backgroundColor: colors.brand.burgundy },
  segmentText: { fontSize: 12, fontWeight: '700', color: colors.brand.burgundy },
  segmentTextActive: { color: colors.neutral.white },
  listContainer: { paddingHorizontal: spacing.lg, gap: spacing.md },
  itemCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  itemTopRow: { justifyContent: 'space-between', alignItems: 'flex-start' },
  invNumber: { fontSize: 11, fontWeight: '700', color: colors.brand.burgundy, marginBottom: 2 },
  customerName: { fontSize: 14, fontWeight: '700', color: colors.neutral.textPrimary },
  invMeta: { fontSize: 11, color: colors.neutral.textSecondary, marginTop: 2 },
  invAmount: { fontSize: 15, fontWeight: '800', color: colors.neutral.textPrimary, marginBottom: 4 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  statusPaid: { backgroundColor: colors.semantic.successBg },
  statusPaidText: { color: '#007A70', fontSize: 10, fontWeight: '700' },
  statusIssued: { backgroundColor: colors.brand.blush },
  statusIssuedText: { color: colors.brand.burgundy, fontSize: 10, fontWeight: '700' },
  expPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
  },
  expPillText: { fontSize: 10, fontWeight: '700' },
  ledgerHeader: { fontSize: 13, fontWeight: '700', color: colors.neutral.textPrimary, marginBottom: spacing.md },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  ledgerCode: { width: 45, fontSize: 12, fontWeight: '700', color: colors.brand.burgundy },
  ledgerName: { flex: 1, fontSize: 12, color: colors.neutral.textSecondary },
  ledgerBal: { fontSize: 12, fontWeight: '700', color: colors.neutral.textPrimary },
});
