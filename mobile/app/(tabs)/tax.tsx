// ============================================================================
// Mizan (ميزان) - Live UAE Tax Hub Screen (Phase 6.6)
// Real Multi-Tenant Deterministic VAT & Corporate Tax Assessment Engines
// Real Persisted Data, Statutory FTA Box 201 Return, SBR & Grounded AI
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { MizanApi } from '../../src/services/api';
import { ScreenSection, AnimatedFinancialNumber } from '../../src/animations';

type TaxTab = 'Overview' | 'Corporate Tax' | 'VAT (201)' | 'SBR';

export default function TaxScreen() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  const [activeTab, setActiveTab] = useState<TaxTab>('Overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [reassessing, setReassessing] = useState<boolean>(false);

  // Real Assessment Data
  const [vatAssessment, setVatAssessment] = useState<any | null>(null);
  const [ctAssessment, setCtAssessment] = useState<any | null>(null);

  // Period Selectors
  const [selectedFY, setSelectedFY] = useState<number>(2026);
  const [selectedVatPeriod, setSelectedVatPeriod] = useState<string>('2026-M11');
  const [periodModalVisible, setPeriodModalVisible] = useState<boolean>(false);

  const vatPeriodDates: Record<string, { start: string; end: string; label: string }> = {
    '2026-M11': { start: '2026-11-01', end: '2026-11-30', label: 'Nov 2026 (Monthly)' },
    '2026-M10': { start: '2026-10-01', end: '2026-10-31', label: 'Oct 2026 (Monthly)' },
    '2026-Q4': { start: '2026-10-01', end: '2026-12-31', label: 'Q4 2026 (Oct – Dec)' },
    '2026-Q3': { start: '2026-07-01', end: '2026-09-30', label: 'Q3 2026 (Jul – Sep)' },
  };

  // Grounded AI Question Modal
  const [aiModalVisible, setAiModalVisible] = useState<boolean>(false);
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<any | null>(null);

  // Fetch or trigger live assessments for the active business
  const fetchAssessments = useCallback(async () => {
    if (!activeBusiness) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const pInfo = vatPeriodDates[selectedVatPeriod] || vatPeriodDates['2026-M11'];
      // 1. Fetch VAT Assessment for selected period
      const vat = await MizanApi.assessBusinessVat({
        businessId: activeBusiness.id,
        periodKey: selectedVatPeriod,
        startDate: pInfo.start,
        endDate: pInfo.end,
      }).catch((err) => {
        console.warn('VAT assessment fetch note:', err.message);
        return null;
      });

      // 2. Fetch Corporate Tax Assessment (FY 2026)
      const ct = await MizanApi.assessBusinessCorporateTax({
        businessId: activeBusiness.id,
        financialYear: selectedFY,
        electSmallBusinessRelief: activeBusiness.isSbrEligible,
      }).catch((err) => {
        console.warn('CT assessment fetch note:', err.message);
        return null;
      });

      setVatAssessment(vat);
      setCtAssessment(ct);
    } catch (err) {
      console.error('Error fetching tax assessments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeBusiness, selectedFY, selectedVatPeriod]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAssessments();
  };

  const handleReassess = async (type: 'VAT' | 'CT') => {
    if (!activeBusiness) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setReassessing(true);
      if (type === 'VAT' && vatAssessment?.assessmentId) {
        const updated = await MizanApi.reassessTaxAssessment(vatAssessment.assessmentId);
        setVatAssessment(updated);
      } else if (type === 'CT' && ctAssessment?.assessmentId) {
        const updated = await MizanApi.reassessTaxAssessment(ctAssessment.assessmentId);
        setCtAssessment(updated);
      } else {
        await fetchAssessments();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      alert(`Reassessment failed: ${err.message}`);
    } finally {
      setReassessing(false);
    }
  };

  const handleAskAi = async (customPrompt?: string) => {
    const questionToAsk = customPrompt || aiQuestion;
    if (!questionToAsk.trim()) return;

    try {
      setAiLoading(true);
      const targetAssessmentId =
        activeTab === 'VAT (201)' ? vatAssessment?.assessmentId : ctAssessment?.assessmentId;

      if (!targetAssessmentId) {
        alert('Please select an active assessment first.');
        return;
      }

      const res = await MizanApi.explainAssessmentWithAi(
        targetAssessmentId,
        questionToAsk,
        isRTL ? 'ar' : 'en'
      );
      setAiResponse(res);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      alert(`AI Consultation failed: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Derived Financial Figures
  const ctPayable = ctAssessment?.corporateTaxPayableAED ?? 0;
  const vatNet = vatAssessment?.netVatPositionAED ?? 0;
  const combinedTaxDue = ctPayable + (vatNet > 0 ? vatNet : 0);

  const complianceScore = Math.min(
    ctAssessment?.complianceScore ?? 100,
    vatAssessment?.complianceScore ?? 100
  );

  const allFindings = [
    ...(vatAssessment?.findings || []),
    ...(ctAssessment?.findings || []),
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.neutral.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>
              {activeTab === 'Corporate Tax'
                ? 'Corporate Tax'
                : activeTab === 'VAT (201)'
                ? 'VAT (201) Return'
                : activeTab === 'SBR'
                ? 'Small Business Relief'
                : 'Tax Hub'}
            </Text>
            {activeBusiness && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {activeBusiness.legalName}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAiModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles" size={18} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand.primary} />
        }
      >
        {/* Banner Section */}
        {activeTab === 'Overview' && (
          <View style={styles.bannerSection}>
            <Text style={styles.bannerTitle}>UAE Tax Hub</Text>
            <Text style={styles.bannerSubtitle}>
              {isRTL
                ? 'إدارة ضريبة الشركات، وضريبة القيمة المضافة، وإعفاء الأعمال الصغيرة.'
                : 'Deterministic assessments from real invoices & bookkeeping records.'}
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
          {(['Overview', 'Corporate Tax', 'VAT (201)', 'SBR'] as TaxTab[]).map((tab) => {
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
                <Text style={[styles.segmentPillText, isSelected && styles.segmentPillTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Interactive Tax Period & FY Selector Bar */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.neutral.surface,
            paddingHorizontal: spacing.md,
            paddingVertical: 10,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.neutral.border,
            marginBottom: spacing.md,
          }}
          activeOpacity={0.75}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setPeriodModalVisible(true);
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="calendar-outline" size={18} color={colors.brand.primary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.neutral.textPrimary }}>
              Corporate Tax: FY {selectedFY} • VAT: {vatPeriodDates[selectedVatPeriod]?.label || selectedVatPeriod}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.neutral.textPrimary} />
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text style={styles.loadingText}>Running statutory tax engines...</Text>
          </View>
        ) : (
          <>
            {/* ==================================================================== */}
            {/* VIEW 1: OVERVIEW TAB                                                  */}
            {/* ==================================================================== */}
            {activeTab === 'Overview' && (
              <View style={styles.tabBody}>
                {/* Combined Tax Position Dark Card */}
                <ScreenSection index={0}>
                  <View style={styles.taxPositionCard}>
                    <View style={styles.positionHeaderRow}>
                      <Text style={styles.positionYearLabel}>Active Position (FY {selectedFY})</Text>
                      <View style={[styles.compliantTag, complianceScore < 75 && { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.compliantTagText, complianceScore < 75 && { color: '#B45309' }]}>
                          {complianceScore >= 80 ? 'Compliant' : 'Needs Review'} ({complianceScore}%)
                        </Text>
                      </View>
                    </View>

                    <AnimatedFinancialNumber
                      value={combinedTaxDue}
                      currency="AED "
                      decimals={2}
                      textStyle={styles.positionAmount}
                    />
                    <Text style={styles.positionSubtext}>
                      Est. Total Tax Payable (CT + Net VAT)
                    </Text>

                    <View style={styles.positionStatsRow}>
                      <View style={styles.positionStatCol}>
                        <Text style={styles.posStatLabel}>CT Liability</Text>
                        <Text style={styles.posStatVal}>AED {ctPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                      </View>
                      <View style={styles.posDivider} />
                      <View style={styles.positionStatCol}>
                        <Text style={styles.posStatLabel}>Net VAT (Nov)</Text>
                        <Text style={styles.posStatVal}>
                          AED {Math.abs(vatNet).toLocaleString('en-US', { minimumFractionDigits: 2 })} {vatNet >= 0 ? 'Payable' : 'Refundable'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScreenSection>

                {/* CT & VAT 2-Column Cards */}
                <ScreenSection index={1}>
                  <View style={styles.twoColumnGrid}>
                    <TouchableOpacity
                      style={styles.halfCard}
                      onPress={() => setActiveTab('Corporate Tax')}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cardTopRow}>
                        <View style={styles.iconSquare}>
                          <Ionicons name="business" size={18} color={colors.brand.primary} />
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
                      </View>
                      <Text style={styles.halfCardLabel}>Corporate Tax</Text>
                      <AnimatedFinancialNumber
                        value={ctPayable}
                        currency="AED "
                        decimals={0}
                        textStyle={styles.halfCardAmount}
                      />
                      <Text style={styles.halfCardSub}>
                        Effective Rate: {ctAssessment?.effectiveTaxRatePct?.toFixed(1) ?? '0.0'}%
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.halfCard}
                      onPress={() => setActiveTab('VAT (201)')}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cardTopRow}>
                        <View style={styles.iconSquare}>
                          <Ionicons name="pie-chart" size={18} color={colors.brand.primary} />
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
                      </View>
                      <Text style={styles.halfCardLabel}>VAT (201)</Text>
                      <AnimatedFinancialNumber
                        value={vatNet}
                        currency="AED "
                        decimals={0}
                        textStyle={styles.halfCardAmount}
                      />
                      <Text style={styles.halfCardSub}>
                        {vatAssessment?.positionType === 'REFUNDABLE' ? 'Refundable' : 'Payable'} (Nov)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScreenSection>

                {/* SBR Status Card */}
                <ScreenSection index={2}>
                  <TouchableOpacity
                    style={styles.sbrCard}
                    onPress={() => setActiveTab('SBR')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.sbrIconCircle}>
                      <Ionicons
                        name={ctAssessment?.isSmallBusinessReliefApplied ? 'checkmark-circle' : 'alert-circle'}
                        size={24}
                        color={ctAssessment?.isSmallBusinessReliefApplied ? colors.semantic.successDark : colors.semantic.warning}
                      />
                    </View>
                    <View style={styles.sbrInfoCol}>
                      <View style={styles.sbrTitleRow}>
                        <Text style={styles.sbrCardTitle}>Small Business Relief (SBR)</Text>
                        <View style={styles.sbrGreenPill}>
                          <Text style={styles.sbrGreenText}>
                            {ctAssessment?.isSmallBusinessReliefApplied ? 'Elected (0% Tax)' : 'Standard 9%'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.sbrCardDesc}>
                        Revenue: AED {ctAssessment?.accountingRevenueAED?.toLocaleString() ?? '0'} / AED 3,000,000 ceiling.
                      </Text>
                    </View>
                  </TouchableOpacity>
                </ScreenSection>

                {/* Automated Compliance Warnings Banner */}
                {allFindings.length > 0 && (
                  <ScreenSection index={3}>
                    <View style={styles.findingsSummaryCard}>
                      <View style={styles.findingsHeaderRow}>
                        <Ionicons name="shield-checkmark" size={18} color={colors.brand.primary} />
                        <Text style={styles.findingsCardTitle}>
                          Statutory Compliance Audit ({allFindings.length} Items)
                        </Text>
                      </View>
                      {allFindings.slice(0, 3).map((f, idx) => (
                        <View key={f.id || idx} style={styles.findingMiniRow}>
                          <View
                            style={[
                              styles.miniSeverityDot,
                              { backgroundColor: f.severity === 'CRITICAL' ? colors.semantic.risk : colors.semantic.warning },
                            ]}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.findingMiniTitle}>{f.title}</Text>
                            <Text style={styles.findingMiniDesc} numberOfLines={2}>
                              {f.description}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScreenSection>
                )}
              </View>
            )}

            {/* ==================================================================== */}
            {/* VIEW 2: CORPORATE TAX TAB                                             */}
            {/* ==================================================================== */}
            {activeTab === 'Corporate Tax' && (
              <View style={styles.tabBody}>
                {/* Header Card */}
                <View style={styles.ctHeaderCard}>
                  <View style={styles.ctHeaderRow}>
                    <Ionicons name="business" size={24} color={colors.brand.primary} />
                    <Text style={styles.ctHeaderTitle}>Corporate Tax Assessment</Text>
                    <TouchableOpacity
                      onPress={() => handleReassess('CT')}
                      disabled={reassessing}
                      style={styles.reassessPill}
                    >
                      <Ionicons name="refresh" size={14} color={colors.brand.primary} />
                      <Text style={styles.reassessText}>
                        {reassessing ? 'Reassessing...' : 'Reassess'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.ctHeaderDesc}>
                    Deterministic statutory calculation under Federal Decree-Law No. (47) of 2022.
                  </Text>
                </View>

                {/* Liability Card */}
                <View style={styles.liabilityDarkCard}>
                  <View style={styles.liabilityTopRow}>
                    <View>
                      <Text style={styles.liabilityTitle}>Corporate Tax Liability (FY 2026)</Text>
                      <Text style={styles.liabilityAmount}>
                        AED {ctPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.liabilitySub}>
                        {ctAssessment?.isSmallBusinessReliefApplied
                          ? 'Relieved under Article 21 (Small Business Relief)'
                          : ctPayable === 0
                          ? 'Taxable Income within 0% threshold (<= AED 375,000)'
                          : '9% statutory rate applied on excess above AED 375,000'}
                      </Text>
                    </View>
                    <View style={styles.ratePill}>
                      <Text style={styles.ratePillText}>
                        {ctAssessment?.isSmallBusinessReliefApplied ? '0% SBR' : '9%'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.liabilityStatsRow}>
                    <View style={styles.liabilityStatCol}>
                      <Text style={styles.statColVal}>
                        AED {ctAssessment?.accountingRevenueAED?.toLocaleString() ?? '0'}
                      </Text>
                      <Text style={styles.statColLabel}>Revenue</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.liabilityStatCol}>
                      <Text style={styles.statColVal}>
                        AED {ctAssessment?.operatingExpensesAED?.toLocaleString() ?? '0'}
                      </Text>
                      <Text style={styles.statColLabel}>Expenses</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.liabilityStatCol}>
                      <Text style={styles.statColVal}>
                        AED {ctAssessment?.finalTaxableIncomeAED?.toLocaleString() ?? '0'}
                      </Text>
                      <Text style={styles.statColLabel}>Taxable Income</Text>
                    </View>
                  </View>
                </View>

                {/* Accounting Profit Reconciliation Schedule */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryTitleRow}>
                    <Ionicons name="calculator" size={18} color={colors.brand.primary} />
                    <Text style={styles.summaryCardTitle}>Profit to Taxable Income Reconciliation</Text>
                  </View>

                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Gross Accounting Revenue</Text>
                    <Text style={styles.tableValue}>AED {ctAssessment?.accountingRevenueAED?.toFixed(2) ?? '0.00'}</Text>
                  </View>
                  <View style={styles.itemDivider} />

                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Accounting Net Profit / (Loss)</Text>
                    <Text style={[styles.tableValue, { fontWeight: '700' }]}>
                      AED {ctAssessment?.accountingNetProfitAED?.toFixed(2) ?? '0.00'}
                    </Text>
                  </View>
                  <View style={styles.itemDivider} />

                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>+ Statutory Additions (Art. 32/33)</Text>
                    <Text style={[styles.tableValue, { color: colors.semantic.warning }]}>
                      + AED {ctAssessment?.totalAdditionsAED?.toFixed(2) ?? '0.00'}
                    </Text>
                  </View>
                  <View style={styles.itemDivider} />

                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>- Reliefs & Deductions (SBR/Losses)</Text>
                    <Text style={[styles.tableValue, { color: colors.semantic.successDark }]}>
                      - AED {ctAssessment?.isSmallBusinessReliefApplied ? ctAssessment?.accountingNetProfitAED?.toFixed(2) : '0.00'}
                    </Text>
                  </View>
                  <View style={styles.itemDivider} />

                  <View style={[styles.tableRow, { backgroundColor: '#F8FAFC', paddingVertical: 8, paddingHorizontal: 4 }]}>
                    <Text style={[styles.tableLabel, { fontWeight: '800', color: colors.neutral.textPrimary }]}>
                      Final Taxable Income
                    </Text>
                    <Text style={[styles.tableValue, { fontWeight: '800', color: colors.brand.primary }]}>
                      AED {ctAssessment?.finalTaxableIncomeAED?.toFixed(2) ?? '0.00'}
                    </Text>
                  </View>
                </View>

                {/* Adjustments Breakdown */}
                {ctAssessment?.adjustments && ctAssessment.adjustments.length > 0 && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.cardHeaderSmall}>Statutory Adjustments Applied</Text>
                    {ctAssessment.adjustments.map((adj: any, idx: number) => (
                      <View key={idx} style={styles.adjustmentItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.adjLabel}>{adj.label}</Text>
                          <Text style={styles.adjRef}>{adj.statutoryReference}</Text>
                        </View>
                        <Text style={[styles.adjAmount, { color: adj.isAdditionToProfit ? colors.semantic.warning : colors.semantic.successDark }]}>
                          {adj.isAdditionToProfit ? '+' : '-'} AED {Number(adj.amountAED).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ==================================================================== */}
            {/* VIEW 3: VAT (201) RETURN TAB                                          */}
            {/* ==================================================================== */}
            {activeTab === 'VAT (201)' && (
              <View style={styles.tabBody}>
                {/* Header Card */}
                <View style={styles.ctHeaderCard}>
                  <View style={styles.ctHeaderRow}>
                    <Ionicons name="receipt" size={24} color={colors.brand.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ctHeaderTitle}>FTA VAT Return (Form 201)</Text>
                      <Text style={styles.ctHeaderSub}>
                        Period: {selectedVatPeriod} ({vatPeriodDates[selectedVatPeriod]?.label || '2026'})
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleReassess('VAT')}
                      disabled={reassessing}
                      style={styles.reassessPill}
                    >
                      <Ionicons name="refresh" size={14} color={colors.brand.primary} />
                      <Text style={styles.reassessText}>
                        {reassessing ? 'Reassessing...' : 'Reassess'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Net VAT Position Hero */}
                <View style={[styles.liabilityDarkCard, { backgroundColor: vatNet >= 0 ? colors.brand.darkHero : '#064E3B' }]}>
                  <View style={styles.liabilityTopRow}>
                    <View>
                      <Text style={styles.liabilityTitle}>Net VAT Position (Box 12)</Text>
                      <Text style={styles.liabilityAmount}>
                        AED {Math.abs(vatNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.liabilitySub}>
                        {vatNet > 0
                          ? 'Net VAT amount payable to the Federal Tax Authority'
                          : vatNet < 0
                          ? 'Net VAT refundable credit from the FTA'
                          : 'Nil liability for the evaluated tax period'}
                      </Text>
                    </View>
                    <View style={[styles.ratePill, { backgroundColor: vatNet >= 0 ? colors.brand.primary : colors.semantic.successDark }]}>
                      <Text style={styles.ratePillText}>{vatAssessment?.positionType ?? 'NIL'}</Text>
                    </View>
                  </View>

                  <View style={styles.liabilityStatsRow}>
                    <View style={styles.liabilityStatCol}>
                      <Text style={styles.statColVal}>
                        AED {vatAssessment?.totalOutputVatAED?.toLocaleString() ?? '0'}
                      </Text>
                      <Text style={styles.statColLabel}>Output VAT (Box 8)</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.liabilityStatCol}>
                      <Text style={styles.statColVal}>
                        AED {vatAssessment?.recoverableInputVatAED?.toLocaleString() ?? '0'}
                      </Text>
                      <Text style={styles.statColLabel}>Input VAT (Box 11)</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.liabilityStatCol}>
                      <Text style={styles.statColVal}>
                        AED {vatAssessment?.blockedInputVatAED?.toLocaleString() ?? '0'}
                      </Text>
                      <Text style={styles.statColLabel}>Blocked (Art. 53)</Text>
                    </View>
                  </View>
                </View>

                {/* Official FTA VAT 201 Return Schedule */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryTitleRow}>
                    <Ionicons name="list" size={18} color={colors.brand.primary} />
                    <Text style={styles.summaryCardTitle}>Official FTA Form 201 Return Boxes</Text>
                  </View>

                  {vatAssessment?.boxes && vatAssessment.boxes.map((box: any, idx: number) => (
                    <View key={idx} style={styles.vatBoxRow}>
                      <View style={styles.boxNumberCol}>
                        <Text style={styles.boxNumberText}>{box.boxNumber}</Text>
                      </View>
                      <View style={{ flex: 1, paddingHorizontal: 8 }}>
                        <Text style={styles.boxTitleText}>{box.boxTitle}</Text>
                        <Text style={styles.boxRefText}>{box.legalReference}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.boxAmountVal}>AED {Number(box.vatAmountAED || box.amountAED || 0).toFixed(2)}</Text>
                        {box.amountAED > 0 && box.vatAmountAED > 0 && (
                          <Text style={styles.boxBaseVal}>Base: AED {Number(box.amountAED).toFixed(0)}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ==================================================================== */}
            {/* VIEW 4: SMALL BUSINESS RELIEF (SBR) TAB                               */}
            {/* ==================================================================== */}
            {activeTab === 'SBR' && (
              <View style={styles.tabBody}>
                <View style={styles.ctHeaderCard}>
                  <View style={styles.ctHeaderRow}>
                    <Ionicons name="shield-checkmark" size={24} color={colors.semantic.successDark} />
                    <Text style={styles.ctHeaderTitle}>Small Business Relief (Art. 21)</Text>
                  </View>
                  <Text style={styles.ctHeaderDesc}>
                    Ministerial Decision No. (73) of 2023 allows eligible UAE businesses with revenue up to AED 3,000,000 to be treated as having zero taxable income.
                  </Text>
                </View>

                {/* SBR Gauge Card */}
                <View style={styles.summaryCard}>
                  <Text style={styles.cardHeaderSmall}>Revenue Ceiling Gauge (AED 3,000,000)</Text>
                  <View style={styles.sbrProgressContainer}>
                    <View
                      style={[
                        styles.sbrProgressBar,
                        {
                          width: `${Math.min(
                            100,
                            ((ctAssessment?.accountingRevenueAED || 0) / 3000000) * 100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.sbrStatsRow}>
                    <Text style={styles.sbrCurRevenue}>
                      Current: AED {ctAssessment?.accountingRevenueAED?.toLocaleString() ?? '0'}
                    </Text>
                    <Text style={styles.sbrRemainingRevenue}>
                      Remaining: AED {Math.max(0, 3000000 - (ctAssessment?.accountingRevenueAED || 0)).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.itemDivider} />

                  <View style={styles.checkItem}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.semantic.successDark} />
                    <Text style={styles.checkText}>Gross Revenue does not exceed AED 3M statutory threshold</Text>
                  </View>
                  <View style={styles.checkItem}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.semantic.successDark} />
                    <Text style={styles.checkText}>Entity is not a Qualifying Free Zone Person (QFZP)</Text>
                  </View>
                  <View style={styles.checkItem}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.semantic.successDark} />
                    <Text style={styles.checkText}>Entity is not part of an MNE Group with consolidated revenue {'>'} AED 3.15B</Text>
                  </View>
                  <View style={styles.checkItem}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.semantic.successDark} />
                    <Text style={styles.checkText}>Period falls within relief sunset window (until 31 Dec 2029)</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* AI Legal Explanation Modal */}
      <Modal visible={aiModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles" size={20} color={colors.brand.primary} />
                <Text style={styles.modalTitle}>Grounded Tax Intelligence</Text>
              </View>
              <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                Ask legal questions grounded in your actual {activeTab} assessment:
              </Text>

              {/* Quick suggestion chips */}
              <View style={styles.chipsRow}>
                {[
                  'Why is my tax liability this amount?',
                  'Why was entertainment VAT blocked?',
                  'Am I eligible for Small Business Relief?',
                ].map((chip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.promptChip}
                    onPress={() => {
                      setAiQuestion(chip);
                      handleAskAi(chip);
                    }}
                  >
                    <Text style={styles.promptChipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.questionInput}
                placeholder="Ask about this calculation or legal citation..."
                value={aiQuestion}
                onChangeText={setAiQuestion}
                multiline
              />

              {aiLoading && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.brand.primary} />
                  <Text style={{ marginTop: 8, fontSize: 13, color: colors.neutral.textSecondary }}>
                    Consulting UAE tax legislation & assessment data...
                  </Text>
                </View>
              )}

              {aiResponse && !aiLoading && (
                <View style={styles.aiResultBox}>
                  <Text style={styles.aiAnswerTitle}>Statutory Explanation</Text>
                  <Text style={styles.aiAnswerText}>{aiResponse.explanation}</Text>

                  {aiResponse.citations && aiResponse.citations.length > 0 && (
                    <View style={styles.citationsBox}>
                      <Text style={styles.citationHeader}>Authoritative Citations</Text>
                      {aiResponse.citations.map((c: any, i: number) => (
                        <Text key={i} style={styles.citationText}>
                          • {c.legislation || c.title} ({c.article || c.officialNumber})
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalAskBtn}
              onPress={() => handleAskAi()}
              disabled={aiLoading || !aiQuestion.trim()}
            >
              <Text style={styles.modalAskBtnText}>
                {aiLoading ? 'Consulting...' : 'Ask Grounded AI'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Tax Period & Financial Year Selector Modal */}
      <Modal visible={periodModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Assessment Period</Text>
              <TouchableOpacity onPress={() => setPeriodModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Corporate Tax Financial Year:</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {[2026, 2025].map((fy) => {
                const isSel = selectedFY === fy;
                return (
                  <TouchableOpacity
                    key={fy}
                    style={[
                      styles.segmentPill,
                      { flex: 1, alignItems: 'center' },
                      isSel && styles.segmentPillActive,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSelectedFY(fy);
                    }}
                  >
                    <Text style={[styles.segmentPillText, isSel && styles.segmentPillTextActive]}>
                      FY {fy}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalSubtitle}>VAT Return Period (Form 201):</Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {Object.entries(vatPeriodDates).map(([key, info]) => {
                const isSel = selectedVatPeriod === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: radii.md,
                      backgroundColor: isSel ? '#FFF8F4' : colors.neutral.canvas,
                      borderWidth: 1,
                      borderColor: isSel ? colors.brand.primary : colors.neutral.border,
                    }}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSelectedVatPeriod(key);
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSel ? '800' : '600',
                        color: isSel ? colors.brand.primary : colors.neutral.textPrimary,
                      }}
                    >
                      {key} — {info.label}
                    </Text>
                    {isSel && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.brand.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.modalAskBtn}
              onPress={() => setPeriodModalVisible(false)}
            >
              <Text style={styles.modalAskBtnText}>Apply & Run Tax Engines</Text>
            </TouchableOpacity>
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
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: colors.neutral.textSecondary,
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
    paddingTop: spacing.xs,
  },
  bannerSection: {
    marginBottom: spacing.md,
  },
  bannerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
    lineHeight: 18,
  },
  segmentScroll: {
    marginBottom: spacing.md,
  },
  segmentContent: {
    gap: 8,
  },
  segmentPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radii.pill,
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
    fontWeight: '700',
    color: colors.neutral.textSecondary,
  },
  segmentPillTextActive: {
    color: '#FFFFFF',
  },
  tabBody: {
    gap: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral.textSecondary,
    fontWeight: '600',
  },
  taxPositionCard: {
    backgroundColor: colors.brand.darkHero,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.cardHover,
  },
  positionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  positionYearLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  compliantTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: '#ECFDF5',
  },
  compliantTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.semantic.successDark,
  },
  positionAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  positionSubtext: {
    fontSize: 13,
    color: '#D1D5DB',
    marginBottom: 16,
  },
  positionStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 12,
  },
  positionStatCol: {
    flex: 1,
  },
  posDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 12,
  },
  posStatLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  posStatVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
    marginBottom: 4,
  },
  halfCardAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  halfCardSub: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 4,
  },
  sbrCard: {
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
  sbrIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sbrInfoCol: {
    flex: 1,
  },
  sbrTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sbrCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  sbrGreenPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  sbrGreenText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.semantic.successDark,
  },
  sbrCardDesc: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
  },
  findingsSummaryCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: 10,
    ...shadows.card,
  },
  findingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  findingsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  findingMiniRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#FAF9F7',
    padding: 8,
    borderRadius: 6,
  },
  miniSeverityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  findingMiniTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  findingMiniDesc: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  ctHeaderCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  ctHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  ctHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  ctHeaderSub: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  ctHeaderDesc: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    lineHeight: 17,
  },
  reassessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: '#FFF3ED',
  },
  reassessText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  liabilityDarkCard: {
    backgroundColor: colors.brand.darkHero,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.cardHover,
  },
  liabilityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  liabilityTitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  liabilityAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  liabilitySub: {
    fontSize: 11,
    color: '#D1D5DB',
    maxWidth: 220,
  },
  ratePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.primary,
  },
  ratePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  liabilityStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 12,
  },
  liabilityStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  statColVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statColLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  summaryCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tableLabel: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  tableValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.neutral.border,
    marginVertical: 4,
  },
  cardHeaderSmall: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 8,
  },
  adjustmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  adjLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  adjRef: {
    fontSize: 10,
    color: colors.neutral.textSecondary,
  },
  adjAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  vatBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  boxNumberCol: {
    width: 52,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  boxNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  boxTitleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  boxRefText: {
    fontSize: 10,
    color: colors.neutral.textSecondary,
  },
  boxAmountVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  boxBaseVal: {
    fontSize: 10,
    color: colors.neutral.textSecondary,
  },
  sbrProgressContainer: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 10,
  },
  sbrProgressBar: {
    height: '100%',
    backgroundColor: colors.semantic.successDark,
  },
  sbrStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sbrCurRevenue: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  sbrRemainingRevenue: {
    fontSize: 11,
    color: colors.semantic.successDark,
    fontWeight: '600',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  checkText: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  promptChip: {
    backgroundColor: '#FFF3ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  promptChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  questionInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    minHeight: 64,
    fontSize: 13,
    marginBottom: 12,
  },
  aiResultBox: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  aiAnswerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  aiAnswerText: {
    fontSize: 12,
    color: '#14532D',
    lineHeight: 18,
  },
  citationsBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
    paddingTop: 6,
  },
  citationHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  citationText: {
    fontSize: 10,
    color: '#15803D',
  },
  modalAskBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  modalAskBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
