// ============================================================================
// Mizan (ميزان) - Invoices Hub Tab
// Design Ref: screen-designs/4130.png (Screen 1) & screen-designs/4126.png (Screen 1)
// Clean card filters, invoice listing, status chips & action buttons
// Connected to Active Business Entity & Real Persisted Backend Records
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, shadows } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { MizanApi } from '../../src/services/api';
import { AnimatedPressable } from '../../src/animations';

type InvoiceFilter = 'All' | 'Paid' | 'Overdue' | 'Drafts';

interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  grandTotal: number;
  amountPaid: number;
  outstandingBalance: number;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';
}

export default function InvoicesTab() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  const [activeFilter, setActiveFilter] = useState<InvoiceFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setIsLoading(true);
    try {
      const statusParam =
        activeFilter === 'Paid'
          ? 'PAID'
          : activeFilter === 'Overdue'
          ? 'OVERDUE'
          : activeFilter === 'Drafts'
          ? 'DRAFT'
          : undefined;

      const raw = await MizanApi.getInvoices(activeBusiness.id, statusParam, searchQuery);
      const mapped: InvoiceListItem[] = (raw || []).map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.name || inv.customer?.companyName || 'Valued Customer',
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        currency: inv.currency || 'AED',
        grandTotal: inv.calculation?.grandTotal || 0,
        amountPaid: inv.amountPaid || 0,
        outstandingBalance: inv.outstandingBalance || 0,
        status: inv.status,
      }));
      setInvoices(mapped);
    } catch (err) {
      console.warn('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeBusiness?.id, activeFilter, searchQuery]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesFilter =
      activeFilter === 'All'
        ? true
        : activeFilter === 'Paid'
        ? inv.status === 'PAID'
        : activeFilter === 'Overdue'
        ? inv.status === 'OVERDUE'
        : inv.status === 'DRAFT';

    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="documents" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>Mizan ميزان</Text>
            {activeBusiness && (
              <Text style={styles.businessBadgeText} numberOfLines={1}>
                {activeBusiness.tradeName || activeBusiness.legalName}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            activeOpacity={0.7}
            onPress={() => router.push('/scan/readiness')}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.neutral.textPrimary} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarButton}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.avatarText}>
              {(activeBusiness?.tradeName || activeBusiness?.legalName || 'ME').slice(0, 2).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Title & Tagline */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{isRTL ? 'الفواتير الضريبية' : 'Tax Invoices'}</Text>
          <Text style={styles.pageSubtitle}>
            {isRTL
              ? 'إنشاء وإدارة ومتابعة فواتير ضريبة القيمة المضافة المتوافقة مع المادة 59.'
              : 'Create, manage and issue VAT tax invoices compliant with Article 59.'}
          </Text>
        </View>

        {/* Primary CTA: + New Invoice */}
        <AnimatedPressable
          style={styles.createButton}
          activeScale={0.97}
          onPress={() => router.push('/invoices/new')}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.createButtonText}>
            {isRTL ? '+ فاتورة جديدة' : '+ New Tax Invoice'}
          </Text>
        </AnimatedPressable>

        {/* Action Shortcuts Grid */}
        <View style={styles.actionGrid}>
          <AnimatedPressable
            style={styles.actionCard}
            onPress={() => router.push('/invoices/new')}
            activeScale={0.97}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FFF3ED' }]}>
              <Ionicons name="receipt-outline" size={22} color={colors.brand.primary} />
            </View>
            <Text style={styles.actionCardLabel}>
              {isRTL ? 'فاتورة ضريبية' : 'New Tax Invoice'}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={styles.actionCard}
            onPress={() => router.push('/invoices/new')}
            activeScale={0.97}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#F0F9FF' }]}>
              <Ionicons name="document-text-outline" size={22} color="#0284C7" />
            </View>
            <Text style={styles.actionCardLabel}>
              {isRTL ? 'إشعار دائن' : 'New Credit Note'}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={styles.actionCard}
            onPress={() => router.push('/invoices/new')}
            activeScale={0.97}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FDF2F8' }]}>
              <Ionicons name="reader-outline" size={22} color="#DB2777" />
            </View>
            <Text style={styles.actionCardLabel}>
              {isRTL ? 'إشعار مدين' : 'New Debit Note'}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={styles.actionCard}
            onPress={() => router.push('/learn/chat')}
            activeScale={0.97}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="sparkles-outline" size={22} color="#7C3AED" />
            </View>
            <Text style={styles.actionCardLabel}>
              {isRTL ? 'استشارة الذكاء' : 'Tax AI Help'}
            </Text>
          </AnimatedPressable>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['All', 'Paid', 'Overdue', 'Drafts'] as InvoiceFilter[]).map((filter) => {
            const isSelected = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveFilter(filter);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.neutral.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder={isRTL ? 'ابحث برقم الفاتورة أو اسم العميل...' : 'Search by invoice # or customer...'}
            placeholderTextColor={colors.neutral.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Loading Indicator */}
        {isLoading && !refreshing && (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator size="small" color={colors.brand.primary} />
          </View>
        )}

        {/* Empty State */}
        {!isLoading && filteredInvoices.length === 0 && (
          <View style={styles.emptyStateBox}>
            <Ionicons name="receipt-outline" size={44} color={colors.neutral.textTertiary} />
            <Text style={styles.emptyStateTitle}>
              {searchQuery || activeFilter !== 'All'
                ? isRTL
                  ? 'لا توجد فواتير مطابقة'
                  : 'No Invoices Found'
                : isRTL
                ? 'لا توجد فواتير حتى الآن'
                : 'No Invoices Yet'}
            </Text>
            <Text style={styles.emptyStateDesc}>
              {activeBusiness
                ? isRTL
                  ? `أنشئ أول فاتورة ضريبية متوافقة لشركة ${activeBusiness.tradeName || activeBusiness.legalName}.`
                  : `Create a UAE VAT-compliant invoice for ${activeBusiness.tradeName || activeBusiness.legalName}.`
                : isRTL
                ? 'يرجى تسجيل رخصة شركتك أولاً.'
                : 'Please onboard or select an active business entity.'}
            </Text>
            {activeBusiness && (
              <TouchableOpacity
                style={styles.emptyCtaBtn}
                onPress={() => router.push('/invoices/new')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.emptyCtaBtnText}>
                  {isRTL ? 'إنشاء فاتورة جديدة' : 'Create New Invoice'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Invoices List */}
        <View style={styles.listContainer}>
          {filteredInvoices.map((inv) => {
            const isPaid = inv.status === 'PAID';
            const isDraft = inv.status === 'DRAFT';
            const isOverdue = inv.status === 'OVERDUE';
            const isPartPaid = inv.status === 'PARTIALLY_PAID';

            return (
              <TouchableOpacity
                key={inv.id}
                style={styles.invoiceRowCard}
                activeOpacity={0.75}
                onPress={() => router.push('/invoices/new')}
              >
                <View style={styles.invoiceIconCircle}>
                  <Ionicons name="document-text-outline" size={20} color={colors.brand.primary} />
                </View>

                <View style={styles.invoiceInfoCol}>
                  <Text style={styles.invoiceNoText}>{inv.invoiceNumber}</Text>
                  <Text style={styles.customerText} numberOfLines={1}>
                    {inv.customerName}
                  </Text>
                  <Text style={styles.dateText}>{inv.issueDate}</Text>
                </View>

                <View style={styles.invoiceAmountCol}>
                  <Text style={styles.amountText}>
                    {inv.currency} {inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      isPaid
                        ? styles.statusBadgePaid
                        : isDraft
                        ? styles.statusBadgeDraft
                        : isOverdue
                        ? styles.statusBadgeOverdue
                        : isPartPaid
                        ? styles.statusBadgePartPaid
                        : styles.statusBadgeDue,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isPaid
                          ? styles.statusTextPaid
                          : isDraft
                          ? styles.statusTextDraft
                          : isOverdue
                          ? styles.statusTextOverdue
                          : styles.statusTextDue,
                      ]}
                    >
                      {inv.status}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>
            );
          })}
        </View>

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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  businessBadgeText: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    fontWeight: '600',
    maxWidth: 200,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.primary,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8E5DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  pageHeader: {
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
    lineHeight: 18,
  },
  createButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.pillButton,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  filterPillActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: spacing.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral.textPrimary,
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  emptyStateDesc: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.md,
    marginTop: 8,
    ...shadows.sm,
  },
  emptyCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listContainer: {
    gap: 8,
  },
  invoiceRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: 12,
    ...shadows.card,
  },
  invoiceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceInfoCol: {
    flex: 1,
  },
  invoiceNoText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  customerText: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginTop: 1,
  },
  dateText: {
    fontSize: 10,
    color: colors.neutral.textTertiary,
    marginTop: 2,
  },
  invoiceAmountCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  statusBadgePaid: {
    backgroundColor: colors.semantic.successBg,
  },
  statusBadgeDraft: {
    backgroundColor: '#F3F4F6',
  },
  statusBadgeOverdue: {
    backgroundColor: colors.semantic.riskBg,
  },
  statusBadgePartPaid: {
    backgroundColor: '#EFF6FF',
  },
  statusBadgeDue: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextPaid: {
    color: colors.semantic.successDark,
  },
  statusTextDraft: {
    color: colors.neutral.textSecondary,
  },
  statusTextOverdue: {
    color: colors.semantic.risk,
  },
  statusTextDue: {
    color: '#D97706',
  },
});
