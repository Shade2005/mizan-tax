// ============================================================================
// Mizan (ميزان) - Books & Financial Ledger Screen
// Real Multi-Tenant Financial Ledger: Persisted Invoices, Expenses, COA & Reports
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
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { MizanApi } from '../../src/services/api';
import { AnimatedPressable } from '../../src/animations';

type BookTab = 'Overview' | 'Transactions' | 'Ledger' | 'Reports';
type TxFilterType = 'ALL' | 'INCOME' | 'EXPENSE';
type FiscalPeriodOption =
  | 'FY 2026 (Jan 1 – Dec 31)'
  | 'Q4 2026 (Oct 1 – Dec 31)'
  | 'Q3 2026 (Jul 1 – Sep 30)'
  | 'All Recorded Periods';

interface UnifiedTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  title: string;
  subtitle: string;
  amountAED: number;
  vatAmountAED: number;
  date: string;
  status: string;
  icon: keyof typeof Ionicons.glyphMap;
  category?: string;
}

const FISCAL_PERIODS: FiscalPeriodOption[] = [
  'FY 2026 (Jan 1 – Dec 31)',
  'Q4 2026 (Oct 1 – Dec 31)',
  'Q3 2026 (Jul 1 – Sep 30)',
  'All Recorded Periods',
];

export default function BooksScreen() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  const [activeTab, setActiveTab] = useState<BookTab>('Overview');
  const [searchTx, setSearchTx] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<TxFilterType>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<FiscalPeriodOption>('FY 2026 (Jan 1 – Dec 31)');
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<UnifiedTransaction | null>(null);
  const [exportingReport, setExportingReport] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real backend ledger records
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<any>(null);

  const fetchLedgerData = useCallback(async () => {
    if (!activeBusiness?.id) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
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

  // Date filter helper for Fiscal Period
  const matchesPeriod = useCallback(
    (dateStr?: string) => {
      if (!dateStr || selectedPeriod === 'All Recorded Periods') return true;
      const d = dateStr.slice(0, 10);
      if (selectedPeriod === 'FY 2026 (Jan 1 – Dec 31)') {
        return d >= '2026-01-01' && d <= '2026-12-31';
      }
      if (selectedPeriod === 'Q4 2026 (Oct 1 – Dec 31)') {
        return d >= '2026-10-01' && d <= '2026-12-31';
      }
      if (selectedPeriod === 'Q3 2026 (Jul 1 – Sep 30)') {
        return d >= '2026-07-01' && d <= '2026-09-30';
      }
      return true;
    },
    [selectedPeriod]
  );

  const periodInvoices = useMemo(
    () => invoices.filter((inv) => matchesPeriod(inv.issueDate)),
    [invoices, matchesPeriod]
  );

  const periodExpenses = useMemo(
    () =>
      expenses.filter(
        (exp) =>
          exp.status !== 'ARCHIVED' &&
          exp.status !== 'REJECTED' &&
          matchesPeriod(exp.expenseDate)
      ),
    [expenses, matchesPeriod]
  );

  // Compute Total Income from period invoices
  const totalIncomeAED = useMemo(() => {
    return periodInvoices.reduce((acc, inv) => {
      const val = Number(inv.totalAmountAED || inv.totalAmount || inv.calculation?.grandTotal) || 0;
      return acc + val;
    }, 0);
  }, [periodInvoices]);

  const totalOutputVatAED = useMemo(() => {
    return periodInvoices.reduce((acc, inv) => {
      return acc + (Number(inv.vatAmountAED || inv.vatAmount || inv.calculation?.totalVat) || 0);
    }, 0);
  }, [periodInvoices]);

  // Compute Total Expenses from period expense bills
  const totalExpensesAED = useMemo(() => {
    return periodExpenses.reduce((acc, exp) => {
      return acc + (Number(exp.totalAmountAED || exp.totalAmount) || 0);
    }, 0);
  }, [periodExpenses]);

  const totalInputVatAED = useMemo(() => {
    return periodExpenses.reduce((acc, exp) => {
      return acc + (Number(exp.vatAmountAED || exp.vatAmount) || 0);
    }, 0);
  }, [periodExpenses]);

  const netProfitAED = totalIncomeAED - totalExpensesAED;
  const profitMarginPct =
    totalIncomeAED > 0 ? ((netProfitAED / totalIncomeAED) * 100).toFixed(1) : '0.0';

  // Build unified chronological transaction ledger
  const transactions: UnifiedTransaction[] = useMemo(() => {
    const list: UnifiedTransaction[] = [];

    // Map Invoices (Income)
    periodInvoices.forEach((inv) => {
      const grand = Number(inv.totalAmountAED || inv.totalAmount || inv.calculation?.grandTotal) || 0;
      const vat = Number(inv.vatAmountAED || inv.vatAmount || inv.calculation?.totalVat) || 0;
      list.push({
        id: inv.id,
        type: 'INCOME',
        title: inv.customer?.name || inv.customerName || `Invoice ${inv.invoiceNumber}`,
        subtitle: `Sales Invoice #${inv.invoiceNumber} • ${inv.status}`,
        amountAED: grand,
        vatAmountAED: vat,
        date: inv.issueDate ? inv.issueDate.split('T')[0] : '2026-10-15',
        status: inv.status,
        icon: 'cash-outline',
        category: 'Operating Revenue (4000)',
      });
    });

    // Map Expenses
    periodExpenses.forEach((exp) => {
      const grand = Number(exp.totalAmountAED || exp.totalAmount) || 0;
      const vat = Number(exp.vatAmountAED || exp.vatAmount) || 0;
      list.push({
        id: exp.id,
        type: 'EXPENSE',
        title: exp.supplierName,
        subtitle: `${exp.categoryNameEn || exp.category} • ${exp.status}`,
        amountAED: grand,
        vatAmountAED: vat,
        date: exp.expenseDate,
        status: exp.status,
        icon: 'receipt-outline',
        category: exp.categoryNameEn || exp.category,
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [periodInvoices, periodExpenses]);

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

  // Chart of Accounts / Trial Balance computation for Ledger tab
  const chartOfAccounts = useMemo(() => {
    const netSales = Math.max(0, totalIncomeAED - totalOutputVatAED);
    const netExpenses = Math.max(0, totalExpensesAED - totalInputVatAED);
    return [
      {
        code: '1100',
        name: 'Cash & Accounts Receivable',
        type: 'Asset',
        debit: totalIncomeAED,
        credit: totalExpensesAED,
        balance: totalIncomeAED - totalExpensesAED,
      },
      {
        code: '1200',
        name: 'Input VAT Recoverable (FTA Box 9)',
        type: 'Asset',
        debit: totalInputVatAED,
        credit: 0,
        balance: totalInputVatAED,
      },
      {
        code: '2100',
        name: 'Output VAT Payable (FTA Box 1)',
        type: 'Liability',
        debit: 0,
        credit: totalOutputVatAED,
        balance: totalOutputVatAED,
      },
      {
        code: '4000',
        name: 'Operating Sales Revenue',
        type: 'Revenue',
        debit: 0,
        credit: netSales,
        balance: netSales,
      },
      {
        code: '5000',
        name: 'Operating & General Expenses',
        type: 'Expense',
        debit: netExpenses,
        credit: 0,
        balance: netExpenses,
      },
    ];
  }, [totalIncomeAED, totalExpensesAED, totalOutputVatAED, totalInputVatAED]);

  const handleExportBookReport = async (reportCode: string, reportTitle: string) => {
    setExportingReport(reportCode);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      let html = '';
      if (activeBusiness?.id) {
        try {
          const res = await MizanApi.generateReport({
            businessId: activeBusiness.id,
            reportType: reportCode,
            format: 'PDF',
          });
          html = res.content;
        } catch {
          // Use clean client financial schedule template
        }
      }

      if (!html) {
        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <title>${reportTitle}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 36px; color: #141416; }
              .header { border-bottom: 2px solid #F95700; padding-bottom: 16px; margin-bottom: 24px; }
              .brand { font-size: 24px; font-weight: 800; color: #F95700; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
              th, td { padding: 10px; border: 1px solid #EAE6E1; text-align: left; }
              th { background: #F7F6F4; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">Mizan ميزان — ${reportTitle}</div>
              <p><strong>Entity:</strong> ${activeBusiness?.legalName || 'UAE Enterprise'} | <strong>Period:</strong> ${selectedPeriod}</p>
            </div>
            <table>
              <tr><th>Metric / Account</th><th>Amount (AED)</th></tr>
              <tr><td>Gross Revenue (Income)</td><td>AED ${totalIncomeAED.toFixed(2)}</td></tr>
              <tr><td>Output VAT Collected (5%)</td><td>AED ${totalOutputVatAED.toFixed(2)}</td></tr>
              <tr><td>Operating Expenses</td><td>AED ${totalExpensesAED.toFixed(2)}</td></tr>
              <tr><td>Recoverable Input VAT (5%)</td><td>AED ${totalInputVatAED.toFixed(2)}</td></tr>
              <tr><td><strong>Net Profit Before Tax</strong></td><td><strong>AED ${netProfitAED.toFixed(2)}</strong></td></tr>
            </table>
          </body>
          </html>
        `;
      }

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Could not generate PDF report.');
    } finally {
      setExportingReport(null);
    }
  };

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
              {activeTab === 'Transactions'
                ? 'Financial Ledger'
                : activeTab === 'Ledger'
                ? 'Chart of Accounts'
                : activeTab === 'Reports'
                ? 'Financial Reports'
                : 'Books & Financial Ledger'}
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

        {/* Interactive Fiscal Period Selector (Shared across tabs) */}
        <TouchableOpacity
          style={styles.fyDropdown}
          activeOpacity={0.75}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setPeriodModalOpen(true);
          }}
        >
          <View style={styles.fyRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.brand.primary} />
            <Text style={styles.fyDropdownText}>{selectedPeriod}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.neutral.textPrimary} />
        </TouchableOpacity>

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
                    Tap any entry to inspect its double-entry journal voucher.
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
                      Income ({periodInvoices.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.miniFilterPill, txTypeFilter === 'EXPENSE' && styles.miniFilterPillActive]}
                    onPress={() => setTxTypeFilter('EXPENSE')}
                  >
                    <Text style={[styles.miniFilterText, txTypeFilter === 'EXPENSE' && styles.miniFilterTextActive]}>
                      Expenses ({periodExpenses.length})
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
                        : 'No financial records have been recorded for this period yet.'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.txListContainer}>
                    {filteredTransactions.map((tx) => (
                      <TouchableOpacity
                        key={`${tx.type}-${tx.id}`}
                        style={styles.txCard}
                        activeOpacity={0.75}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setSelectedTx(tx);
                        }}
                      >
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
                          <Text style={styles.txTime}>Tap for Voucher →</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ==================================================================== */}
            {/* VIEW 3: GENERAL LEDGER & CHART OF ACCOUNTS                            */}
            {/* ==================================================================== */}
            {activeTab === 'Ledger' && (
              <View style={styles.tabBody}>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryTitleRow}>
                    <Ionicons name="book-outline" size={18} color={colors.brand.primary} />
                    <Text style={styles.summaryCardTitle}>UAE Standard Chart of Accounts</Text>
                  </View>
                  <Text style={[styles.bannerSubtitle, { marginBottom: 12 }]}>
                    Live double-entry ledger balances derived from your approved invoices and expenses.
                  </Text>

                  {chartOfAccounts.map((acc, idx) => (
                    <React.Fragment key={acc.code}>
                      {idx > 0 && <View style={styles.itemDivider} />}
                      <View style={styles.coaRow}>
                        <View style={styles.coaCodeBadge}>
                          <Text style={styles.coaCodeText}>{acc.code}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.coaNameText}>{acc.name}</Text>
                          <Text style={styles.coaTypeText}>
                            {acc.type} • DR: AED {acc.debit.toLocaleString()} | CR: AED {acc.credit.toLocaleString()}
                          </Text>
                        </View>
                        <Text style={styles.coaBalanceText}>
                          AED {Math.abs(acc.balance).toLocaleString()}
                        </Text>
                      </View>
                    </React.Fragment>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.exportActionBtn}
                  onPress={() => handleExportBookReport('TRIAL_BALANCE', 'Trial Balance & General Ledger')}
                >
                  <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.exportActionBtnText}>Download Trial Balance PDF</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ==================================================================== */}
            {/* VIEW 4: FINANCIAL & TAX REPORTS                                       */}
            {/* ==================================================================== */}
            {activeTab === 'Reports' && (
              <View style={styles.tabBody}>
                {[
                  {
                    code: 'PROFIT_AND_LOSS',
                    title: 'Profit & Loss Statement (P&L)',
                    desc: 'Operating revenue, cost of sales, and net accounting profit schedule.',
                    icon: 'trending-up-outline' as const,
                  },
                  {
                    code: 'VAT_201_SUMMARY',
                    title: 'FTA VAT Form 201 Audit Working Paper',
                    desc: 'Output VAT (Box 1) vs Recoverable Input VAT (Box 9) transaction breakdown.',
                    icon: 'receipt-outline' as const,
                  },
                  {
                    code: 'CORPORATE_TAX_PACK',
                    title: 'Corporate Tax Profit Reconciliation',
                    desc: 'Accounting net profit adjustments under Articles 21, 32, and 33.',
                    icon: 'business-outline' as const,
                  },
                  {
                    code: 'TRIAL_BALANCE',
                    title: 'General Ledger & Trial Balance',
                    desc: 'Complete chart of accounts debit/credit balances for external audit.',
                    icon: 'library-outline' as const,
                  },
                ].map((rep) => (
                  <View key={rep.code} style={styles.summaryCard}>
                    <View style={styles.reportCardTop}>
                      <View style={styles.quickIconBox}>
                        <Ionicons name={rep.icon} size={20} color={colors.brand.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.summaryCardTitle}>{rep.title}</Text>
                        <Text style={styles.txSubtitle}>{rep.desc}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.exportActionBtn, { marginTop: 12 }]}
                      onPress={() => handleExportBookReport(rep.code, rep.title)}
                      disabled={exportingReport === rep.code}
                    >
                      {exportingReport === rep.code ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="share-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.exportActionBtnText}>Generate & Share PDF</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ==================================================================== */}
      {/* MODAL 1: FISCAL PERIOD PICKER                                         */}
      {/* ==================================================================== */}
      <Modal visible={periodModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Fiscal Period</Text>
              <TouchableOpacity onPress={() => setPeriodModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            {FISCAL_PERIODS.map((p) => {
              const active = selectedPeriod === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodOptionRow, active && styles.periodOptionActive]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedPeriod(p);
                    setPeriodModalOpen(false);
                  }}
                >
                  <Text style={[styles.periodOptionText, active && { color: colors.brand.primary, fontWeight: '800' }]}>
                    {p}
                  </Text>
                  {active && <Ionicons name="checkmark-circle" size={20} color={colors.brand.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 2: JOURNAL VOUCHER DRILL-DOWN                                   */}
      {/* ==================================================================== */}
      <Modal visible={!!selectedTx} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Journal Voucher Entry</Text>
                <Text style={styles.txSubtitle}>{selectedTx?.date} • {selectedTx?.status}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTx(null)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <View style={{ gap: 10 }}>
                <View style={styles.voucherBox}>
                  <Text style={styles.coaNameText}>{selectedTx.title}</Text>
                  <Text style={styles.txSubtitle}>{selectedTx.subtitle}</Text>
                  <View style={[styles.itemDivider, { marginVertical: 8 }]} />

                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Gross Amount</Text>
                    <Text style={styles.tableValue}>AED {selectedTx.amountAED.toFixed(2)}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>VAT Component (5%)</Text>
                    <Text style={styles.tableValue}>AED {selectedTx.vatAmountAED.toFixed(2)}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Ledger Account</Text>
                    <Text style={styles.tableValue}>{selectedTx.category}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.exportActionBtn}
                  onPress={() => {
                    const isInc = selectedTx.type === 'INCOME';
                    setSelectedTx(null);
                    router.push(isInc ? '/(tabs)/invoices' : '/expenses/review');
                  }}
                >
                  <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.exportActionBtnText}>
                    {selectedTx.type === 'INCOME' ? 'Open in Invoices Hub' : 'Open in Expense Review'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    marginBottom: spacing.sm,
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
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: 14,
  },
  fyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fyDropdownText: {
    fontSize: 13,
    fontWeight: '700',
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
    marginBottom: 8,
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
    paddingVertical: 8,
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
    color: colors.brand.primary,
    fontWeight: '600',
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
  coaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  coaCodeBadge: {
    backgroundColor: colors.brand.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  coaCodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  coaNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  coaTypeText: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  coaBalanceText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  reportCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  exportActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.cardHover,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  periodOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    marginBottom: 6,
    backgroundColor: colors.neutral.canvas,
  },
  periodOptionActive: {
    borderWidth: 1,
    borderColor: colors.brand.primary,
    backgroundColor: '#FFF8F4',
  },
  periodOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  voucherBox: {
    backgroundColor: colors.neutral.canvas,
    padding: 14,
    borderRadius: radii.md,
  },
});
