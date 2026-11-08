// ============================================================================
// Mizan (ميزان) - Books & Financial Ledger Screen
// Real Multi-Tenant Financial Ledger: Persisted Invoices & Expenses
// Design Reference: screen-designs/4119.png
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { MizanApi } from '../../src/services/api';
import { AnimatedPressable } from '../../src/animations';

type BookTab = 'Overview' | 'Transactions' | 'Ledger' | 'Reports';
type TxFilterType = 'ALL' | 'INCOME' | 'EXPENSE';

interface UnifiedTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  title: string;
  subtitle: string;
  amountAED: number;
  date: string;
  status: string;
  icon: keyof typeof Ionicons.glyphMap;
  category?: string;
}

export default function BooksScreen() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  const [activeTab, setActiveTab] = useState<BookTab>('Overview');
  const [searchTx, setSearchTx] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<TxFilterType>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real backend ledger records
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<any>(null);

  const fetchLedgerData = useCallback(async () => {
    if (!activeBusiness?.id) return;
    try {
      const [invList, expList, expSum] = await Promise.all([
        MizanApi.getInvoices(activeBusiness.id),
        MizanApi.getExpenses(activeBusiness.id),
        MizanApi.getExpenseSummaries(activeBusiness.id),
      ]);

      setInvoices(invList || []);
      setExpenses(expList || []);
      setExpenseSummary(expSum || null);
    } catch (err: any) {
      console.warn('Failed to load books data:', err?.message || err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    setIsLoading(true);
    fetchLedgerData();
  }, [fetchLedgerData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchLedgerData();
  };

  // Compute Total Income from issued or paid invoices (or draft invoices recorded in books)
  const totalIncomeAED = useMemo(() => {
    return invoices.reduce((acc, inv) => {
      const val = Number(inv.totalAmountAED || inv.totalAmount) || 0;
      return acc + val;
    }, 0);
  }, [invoices]);

  // Compute Total Expenses from recorded expense bills
  const totalExpensesAED = useMemo(() => {
    if (expenseSummary?.totalRecordedExpensesAED !== undefined && expenseSummary.totalRecordedExpensesAED > 0) {
      return expenseSummary.totalRecordedExpensesAED;
    }
    return expenses.reduce((acc, exp) => {
      if (exp.status === 'ARCHIVED' || exp.status === 'REJECTED') return acc;
      return acc + (Number(exp.totalAmountAED || exp.totalAmount) || 0);
    }, 0);
  }, [expenseSummary, expenses]);

  const netProfitAED = totalIncomeAED - totalExpensesAED;
  const profitMarginPct =
    totalIncomeAED > 0 ? ((netProfitAED / totalIncomeAED) * 100).toFixed(1) : '0.0';

  // Build unified chronological transaction ledger
  const transactions: UnifiedTransaction[] = useMemo(() => {
    const list: UnifiedTransaction[] = [];

    // Map Invoices (Income)
    invoices.forEach((inv) => {
      list.push({
        id: inv.id,
        type: 'INCOME',
        title: inv.customer?.name || inv.customerName || `Invoice ${inv.invoiceNumber}`,
        subtitle: `Sales Invoice • ${inv.status}`,
        amountAED: Number(inv.totalAmountAED || inv.totalAmount) || 0,
        date: inv.issueDate ? inv.issueDate.split('T')[0] : '2026-10-15',
        status: inv.status,
        icon: 'cash-outline',
        category: 'Operating Revenue',
      });
    });

    // Map Expenses
    expenses.forEach((exp) => {
      if (exp.status === 'ARCHIVED') return;
      list.push({
        id: exp.id,
        type: 'EXPENSE',
        title: exp.supplierName,
        subtitle: `${exp.categoryNameEn || exp.category} • ${exp.status}`,
        amountAED: Number(exp.totalAmountAED || exp.totalAmount) || 0,
        date: exp.expenseDate,
        status: exp.status,
        icon: 'receipt-outline',
        category: exp.categoryNameEn || exp.category,
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, expenses]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (txTypeFilter === 'INCOME' && tx.type !== 'INCOME') return false;
      if (txTypeFilter === 'EXPENSE' && tx.type !== 'EXPENSE') return false;
      if (searchTx.trim()) {
        const query = searchTx.toLowerCase();
        const matches =
          tx.title.toLowerCase().includes(query) ||
          tx.subtitle.toLowerCase().includes(query) ||
          String(tx.amountAED).includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [transactions, txTypeFilter, searchTx]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {activeTab !== 'Overview' && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setActiveTab('Overview')}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.neutral.textPrimary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>
              {activeTab === 'Transactions' ? 'Financial Ledger' : 'Books & Financial Ledger'}
            </Text>
            {activeBusiness && (
              <Text style={styles.headerSubtitle}>
                {activeBusiness.legalName}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push('/expenses/review')}
            activeOpacity={0.7}
          >
            <Ionicons name="layers-outline" size={20} color={colors.neutral.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push('/expenses/scan')}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-outline" size={20} color={colors.neutral.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.brand.primary]} />
        }
      >
        {/* Banner Section */}
        {activeTab === 'Overview' && (
          <View style={styles.bannerSection}>
            <Text style={styles.bannerSubtitle}>
              {isRTL
                ? 'أموال أعمالك، منظمة وجاهزة للمطابقة الضريبية.'
                : 'Your business finances, organised and tax-ready.'}
            </Text>
          </View>
        )}

        {/* 4 Segmented Control Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.segmentScroll}
          contentContainerStyle={styles.segmentContent}
        >
          {(['Overview', 'Transactions', 'Ledger', 'Reports'] as BookTab[]).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.segmentPill, isSelected && styles.segmentPillActive]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveTab(tab);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.segmentPillText, isSelected && styles.segmentPillTextActive]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text style={styles.loadingText}>Syncing books & ledger records...</Text>
          </View>
        ) : (
          <>
            {/* ==================================================================== */}
            {/* VIEW 1: OVERVIEW TAB                                                  */}
            {/* ==================================================================== */}
            {activeTab === 'Overview' && (
              <View style={styles.tabBody}>
                {/* Fiscal Period Selector */}
                <View style={styles.fyDropdown}>
                  <View style={styles.fyRow}>
                    <Ionicons name="calendar-outline" size={18} color={colors.neutral.textSecondary} />
                    <Text style={styles.fyDropdownText}>FY 2026 (Jan 1 – Dec 31)</Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={colors.neutral.textPrimary} />
                </View>

                {/* Business Performance Dark Hero Card */}
                <View style={styles.perfDarkCard}>
                  <View style={styles.perfTopRow}>
                    <Text style={styles.perfTitle}>Business Performance</Text>
                    <View style={styles.growthBadge}>
                      <Text style={styles.growthBadgeText}>
                        {netProfitAED >= 0 ? '✓ Profitable' : '⚠ Deficit'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.perfStatsRow}>
                    <View style={styles.perfStatCol}>
                      <Text style={styles.perfAmount}>AED {totalIncomeAED.toLocaleString()}</Text>
                      <Text style={styles.perfSub}>Total Income</Text>
                    </View>
                    <View style={styles.perfDivider} />
                    <View style={styles.perfStatCol}>
                      <Text style={styles.perfAmount}>AED {totalExpensesAED.toLocaleString()}</Text>
                      <Text style={styles.perfSub}>Total Expenses</Text>
                    </View>
                  </View>

                  {/* Glowing Green accent */}
                  <View style={styles.chartAccentLine} />
                </View>

                {/* 4 Action Buttons Grid */}
                <View style={styles.quickGrid}>
                  <TouchableOpacity
                    style={styles.quickCard}
                    onPress={() => router.push('/expenses/review')}
                    activeOpacity={0.75}
                  >
                    <View style={styles.quickIconBox}>
                      <Ionicons name="layers-outline" size={22} color={colors.brand.primary} />
                    </View>
                    <Text style={styles.quickCardLabel}>Review Expenses</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickCard}
                    onPress={() => router.push('/expenses/scan')}
                    activeOpacity={0.75}
                  >
                    <View style={styles.quickIconBox}>
                      <Ionicons name="scan-outline" size={20} color={colors.brand.primary} />
                    </View>
                    <Text style={styles.quickCardLabel}>Scan Receipt</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickCard}
                    onPress={() => router.push('/invoices/new')}
                    activeOpacity={0.75}
                  >
                    <View style={styles.quickIconBox}>
                      <Ionicons name="add-circle-outline" size={20} color={colors.brand.primary} />
                    </View>
                    <Text style={styles.quickCardLabel}>Create Invoice</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickCard}
                    onPress={() => setActiveTab('Transactions')}
                    activeOpacity={0.75}
                  >
                    <View style={styles.quickIconBox}>
                      <Ionicons name="list-outline" size={20} color={colors.brand.primary} />
                    </View>
                    <Text style={styles.quickCardLabel}>View Ledger</Text>
                  </TouchableOpacity>
                </View>

                {/* Financial Summary Card */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryTitleRow}>
                    <Ionicons name="bar-chart" size={18} color={colors.brand.primary} />
                    <Text style={styles.summaryCardTitle}>Financial Summary</Text>
                  </View>

                  <View style={styles.tableRow}>
                    <View style={styles.rowLabelGroup}>
                      <View style={[styles.miniDot, { backgroundColor: colors.semantic.success }]} />
                      <Text style={styles.tableLabel}>Gross Revenue (Income)</Text>
                    </View>
                    <Text style={styles.tableValue}>AED {totalIncomeAED.toLocaleString()}</Text>
                  </View>
                  <View style={styles.itemDivider} />

                  <View style={styles.tableRow}>
                    <View style={styles.rowLabelGroup}>
                      <View style={[styles.miniDot, { backgroundColor: colors.semantic.risk }]} />
                      <Text style={styles.tableLabel}>Operating Expenses</Text>
                    </View>
                    <Text style={styles.tableValue}>AED {totalExpensesAED.toLocaleString()}</Text>
                  </View>
                  <View style={styles.itemDivider} />

                  <View style={styles.tableRow}>
                    <View style={styles.rowLabelGroup}>
                      <View style={[styles.miniDot, { backgroundColor: colors.brand.primary }]} />
                      <Text style={[styles.tableLabel, { fontWeight: '700' }]}>Net Profit Before Tax</Text>
                    </View>
                    <Text style={[styles.tableValue, { fontWeight: '800' }]}>
                      AED {netProfitAED.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.itemDivider} />

                  <View style={styles.tableRow}>
                    <View style={styles.rowLabelGroup}>
                      <Ionicons name="pie-chart-outline" size={14} color={colors.brand.primary} />
                      <Text style={styles.tableLabel}>Operating Margin</Text>
                    </View>
                    <View style={styles.marginPill}>
                      <Text style={styles.marginPillText}>{profitMarginPct}%</Text>
                    </View>
                  </View>
                </View>

                {/* Category Breakdown Card */}
                {expenseSummary?.categoryBreakdown && (
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryTitleRow}>
                      <Ionicons name="pie-chart" size={18} color={colors.brand.primary} />
                      <Text style={styles.summaryCardTitle}>Expense Breakdown by Category</Text>
                    </View>

                    {expenseSummary.categoryBreakdown
                      .filter((c: any) => c.totalAmountAED > 0)
                      .slice(0, 5)
                      .map((cat: any) => (
                        <View key={cat.category} style={styles.categoryBarRow}>
                          <View style={styles.catInfoRow}>
                            <Text style={styles.catNameText}>{cat.categoryNameEn}</Text>
                            <Text style={styles.catAmountText}>AED {cat.totalAmountAED.toLocaleString()}</Text>
                          </View>
                          <View style={styles.progressBarBg}>
                            <View
                              style={[
                                styles.progressBarFill,
                                { width: `${Math.min(100, Math.max(5, cat.percentage))}%` },
                              ]}
                            />
                          </View>
                        </View>
                      ))}
                  </View>
                )}

                {/* Ask Mizan AI Banner */}
                <AnimatedPressable
                  style={styles.aiBannerCard}
                  activeScale={0.98}
                  onPress={() => router.push('/learn/chat')}
                >
                  <View style={styles.aiBannerLeft}>
                    <View style={styles.aiBannerTitleRow}>
                      <Ionicons name="sparkles" size={18} color={colors.brand.primary} />
                      <Text style={styles.aiBannerTitle}>
                        Ask Mizan <Text style={{ color: colors.brand.primary }}>AI</Text>
                      </Text>
                    </View>
                    <Text style={styles.aiBannerDesc}>
                      Analyse your books, check VAT recoverability, or review Corporate Tax deductibility.
                    </Text>
                  </View>
                  <View style={styles.askNowBtn}>
                    <Text style={styles.askNowBtnText}>Ask Now</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.neutral.textPrimary} />
                  </View>
                </AnimatedPressable>
              </View>
            )}

            {/* ==================================================================== */}
            {/* VIEW 2: TRANSACTIONS LEDGER TAB                                       */}
            {/* ==================================================================== */}
            {activeTab === 'Transactions' && (
              <View style={styles.tabBody}>
                <View style={styles.txHeaderBlock}>
                  <Text style={styles.txMainHeading}>Transactions Ledger</Text>
                  <Text style={styles.txSubHeading}>
                    Chronological financial feed for {activeBusiness?.legalName}.
                  </Text>
                </View>

                {/* Search Input */}
                <View style={styles.txSearchBox}>
                  <Ionicons name="search" size={18} color={colors.neutral.textTertiary} />
                  <TextInput
                    style={styles.txSearchInput}
                    placeholder="Search vendor, customer, amount..."
                    placeholderTextColor={colors.neutral.textTertiary}
                    value={searchTx}
                    onChangeText={setSearchTx}
                  />
                  {searchTx.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchTx('')}>
                      <Ionicons name="close-circle" size={18} color={colors.neutral.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Filter Pills */}
                <View style={styles.filterDropdownRow}>
                  <TouchableOpacity
                    style={[styles.miniFilterPill, txTypeFilter === 'ALL' && styles.miniFilterPillActive]}
                    onPress={() => setTxTypeFilter('ALL')}
                  >
                    <Text style={[styles.miniFilterText, txTypeFilter === 'ALL' && styles.miniFilterTextActive]}>
                      All ({transactions.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.miniFilterPill, txTypeFilter === 'INCOME' && styles.miniFilterPillActive]}
                    onPress={() => setTxTypeFilter('INCOME')}
                  >
                    <Text style={[styles.miniFilterText, txTypeFilter === 'INCOME' && styles.miniFilterTextActive]}>
                      Income ({invoices.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.miniFilterPill, txTypeFilter === 'EXPENSE' && styles.miniFilterPillActive]}
                    onPress={() => setTxTypeFilter('EXPENSE')}
                  >
                    <Text style={[styles.miniFilterText, txTypeFilter === 'EXPENSE' && styles.miniFilterTextActive]}>
                      Expenses ({expenses.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Income vs Expenses Summary Banner */}
                <View style={styles.twoColumnGrid}>
                  <View style={[styles.statBannerCard, { backgroundColor: '#F0FDF4' }]}>
                    <Text style={styles.statBannerLabel}>↑ Income</Text>
                    <Text style={[styles.statBannerAmount, { color: colors.semantic.successDark }]}>
                      AED {totalIncomeAED.toLocaleString()}
                    </Text>
                  </View>

                  <View style={[styles.statBannerCard, { backgroundColor: '#FEF2F2' }]}>
                    <Text style={styles.statBannerLabel}>↓ Expenses</Text>
                    <Text style={[styles.statBannerAmount, { color: colors.semantic.risk }]}>
                      AED {totalExpensesAED.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Transaction Feed */}
                {filteredTransactions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="receipt-outline" size={40} color={colors.neutral.textTertiary} />
                    <Text style={styles.emptyTitle}>No Transactions Found</Text>
                    <Text style={styles.emptySub}>
                      {searchTx
                        ? 'No records match your search criteria.'
                        : 'No financial records have been recorded for this entity yet.'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.txListContainer}>
                    {filteredTransactions.map((tx) => (
                      <View key={tx.id} style={styles.txCard}>
                        <View
                          style={[
                            styles.txIconSquare,
                            tx.type === 'INCOME'
                              ? { backgroundColor: '#F0FDF4' }
                              : { backgroundColor: '#FFF7ED' },
                          ]}
                        >
                          <Ionicons
                            name={tx.icon}
                            size={18}
                            color={tx.type === 'INCOME' ? colors.semantic.successDark : colors.brand.primary}
                          />
                        </View>
                        <View style={styles.txInfoCol}>
                          <Text style={styles.txTitle}>{tx.title}</Text>
                          <Text style={styles.txSubtitle}>{tx.subtitle} • {tx.date}</Text>
                        </View>
                        <View style={styles.txAmountCol}>
                          <Text
                            style={[
                              styles.txAmount,
                              {
                                color:
                                  tx.type === 'INCOME'
                                    ? colors.semantic.successDark
                                    : colors.semantic.risk,
                              },
                            ]}
                          >
                            {tx.type === 'INCOME' ? '+' : '-'}AED {tx.amountAED.toLocaleString()}
                          </Text>
                          <Text style={styles.txTime}>{tx.date}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ==================================================================== */}
            {/* VIEW 3 & 4: LEDGER & REPORTS PLACEHOLDERS                             */}
            {/* ==================================================================== */}
            {(activeTab === 'Ledger' || activeTab === 'Reports') && (
              <View style={styles.tabBody}>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryTitleRow}>
                    <Ionicons name="document-text" size={20} color={colors.brand.primary} />
                    <Text style={styles.summaryCardTitle}>
                      {activeTab === 'Ledger' ? 'General Ledger & Chart of Accounts' : 'Financial & Tax Reports'}
                    </Text>
                  </View>
                  <Text style={styles.bannerSubtitle}>
                    {activeTab === 'Ledger'
                      ? 'Double-entry journal vouchers, trial balance, and debit/credit postings compliant with UAE standards.'
                      : 'Audit-ready profit & loss and balance sheet reports for Federal Tax Authority compliance.'}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.canvas,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.brand.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  bannerSection: {
    marginBottom: spacing.md,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: colors.neutral.textSecondary,
    lineHeight: 20,
  },
  segmentScroll: {
    marginBottom: spacing.md,
  },
  segmentContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  segmentPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  segmentPillActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  segmentPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  segmentPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingBox: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  tabBody: {
    gap: 14,
  },
  fyDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  fyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fyDropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  perfDarkCard: {
    backgroundColor: '#0F172A',
    borderRadius: radii.lg,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  perfTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  perfTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  growthBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  growthBadgeText: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '700',
  },
  perfStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perfStatCol: {
    flex: 1,
  },
  perfAmount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  perfSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  perfDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  chartAccentLine: {
    height: 3,
    backgroundColor: colors.brand.primary,
    marginTop: 14,
    borderRadius: 2,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickCard: {
    width: '48%',
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    alignItems: 'center',
    gap: 6,
    ...shadows.sm,
  },
  quickIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  summaryCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.sm,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tableLabel: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  tableValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.neutral.border,
  },
  marginPill: {
    backgroundColor: '#FFF3ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  marginPillText: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBarRow: {
    paddingVertical: 8,
  },
  catInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  catNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  catAmountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: 3,
  },
  aiBannerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF8F4',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiBannerLeft: {
    flex: 1,
    marginRight: 10,
  },
  aiBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  aiBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  aiBannerDesc: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    lineHeight: 16,
  },
  askNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    gap: 4,
  },
  askNowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  txHeaderBlock: {
    marginBottom: 4,
  },
  txMainHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  txSubHeading: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  txSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: 8,
  },
  txSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral.textPrimary,
    padding: 0,
  },
  filterDropdownRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniFilterPill: {
    flex: 1,
    backgroundColor: colors.neutral.surface,
    paddingVertical: 8,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  miniFilterPillActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  miniFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  miniFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statBannerCard: {
    flex: 1,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statBannerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  statBannerAmount: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  txListContainer: {
    gap: 8,
  },
  txCard: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    alignItems: 'center',
    ...shadows.sm,
  },
  txIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txInfoCol: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  txSubtitle: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  txTime: {
    fontSize: 10,
    color: colors.neutral.textTertiary,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginVertical: spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
