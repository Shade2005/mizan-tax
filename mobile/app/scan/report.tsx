// ============================================================================
// Mizan (ميزان) - Tax Health Audit Report Screen
// Design Reference: screen-designs/4125.png (Screens 1, 2, and 3)
// 3 Views: Audit Intro -> Dashboard with 4 Tabs -> Finding Deep-Dive Details
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
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
import { AnimatedFinancialNumber } from '../../src/animations';
import { MizanApi } from '../../src/services/api';

type AuditView = 'intro' | 'dashboard' | 'finding-details';
type DashboardTab = 'Overview' | 'Findings (6)' | 'Action Plan' | 'Report';

export default function TaxHealthAuditReportScreen() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  const [currentView, setCurrentView] = useState<AuditView>('dashboard');
  const [activeTab, setActiveTab] = useState<DashboardTab>('Overview');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('TAX_READINESS_AUDIT');
  const [liveFindings, setLiveFindings] = useState<any[]>([]);

  useEffect(() => {
    if (activeBusiness?.id) {
      MizanApi.getComplianceActions(activeBusiness.id)
        .then((f: any) => setLiveFindings(f))
        .catch((err: any) => console.warn('Findings fetch error:', err));
    }
  }, [activeBusiness?.id]);

  const handleDownloadPdf = async (reportTypeArg?: any) => {
    const reportType = typeof reportTypeArg === 'string' ? reportTypeArg : selectedReportType;
    setIsExporting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      let htmlContent = '';

      if (activeBusiness?.id) {
        try {
          const result = await MizanApi.generateReport({
            businessId: activeBusiness.id,
            reportType,
            format: 'PDF',
          });
          htmlContent = result.content;
        } catch (apiErr) {
          console.warn('Backend report error, falling back to client template:', apiErr);
        }
      }

      if (!htmlContent) {
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Mizan - Tax Health Audit Report</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #141416; }
              .header { border-bottom: 2px solid #F95700; padding-bottom: 20px; margin-bottom: 24px; }
              .brand { font-size: 26px; font-weight: 800; color: #F95700; }
              .score-box { background: #ECFDF5; border: 1px solid #A7F3D0; padding: 14px; border-radius: 8px; margin: 16px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 14px; }
              th, td { padding: 10px; border: 1px solid #EAE6E1; text-align: left; }
              th { background: #F7F6F4; font-size: 13px; }
              .risk { color: #EF4444; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">Mizan ميزان</div>
              <h2>UAE Tax Health Audit Report</h2>
              <p><strong>Entity:</strong> ${activeBusiness?.legalName || 'Mizan Business'} | <strong>License:</strong> ${activeBusiness?.tradeLicenseNumber || 'N/A'}</p>
            </div>
            <div class="score-box">
              <h3>Tax Readiness Audit Summary</h3>
              <p>Statutory assessment under Federal Decree-Law No. 8 of 2017 & Federal Decree-Law No. 47 of 2022.</p>
            </div>
          </body>
          </html>
        `;
      }

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.warn('PDF export error:', e);
      Alert.alert(isRTL ? 'خطأ في التصدير' : 'Export Failed', isRTL ? 'تعذر إنشاء تقرير PDF' : 'Unable to generate PDF report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (currentView === 'finding-details') setCurrentView('dashboard');
              else if (currentView === 'dashboard') setCurrentView('intro');
              else router.back();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.neutral.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentView === 'finding-details' ? 'Finding Details' : 'Tax Health Audit Report'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={handleDownloadPdf}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={20} color={colors.neutral.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================================================================== */}
        {/* VIEW 1: INTRO LANDING (4125.png Screen 1)                            */}
        {/* ==================================================================== */}
        {currentView === 'intro' && (
          <View style={styles.introSection}>
            <View style={styles.titleBanner}>
              <Text style={styles.mainTitle}>Tax Health Audit Report</Text>
              <Text style={styles.subtitle}>
                A comprehensive, AI-powered audit of your tax, bookkeeping and compliance health under UAE laws and FTA requirements.
              </Text>
            </View>

            {/* Feature list card */}
            <View style={styles.featureCard}>
              <View style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: '#FFF3ED' }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand.primary} />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Check Compliance</Text>
                  <Text style={styles.featureDesc}>Corporate Tax, VAT, SBR and key obligations</Text>
                </View>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="layers-outline" size={20} color="#D97706" />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Find Gaps & Risks</Text>
                  <Text style={styles.featureDesc}>Identify potential issues before the FTA does</Text>
                </View>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="flash-outline" size={20} color="#2563EB" />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Get an Action Plan</Text>
                  <Text style={styles.featureDesc}>Clear, prioritised steps to become fully compliant</Text>
                </View>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.semantic.successDark} />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Downloadable Report</Text>
                  <Text style={styles.featureDesc}>A professional, shareable audit report (PDF)</Text>
                </View>
              </View>
            </View>

            {/* 2 Meta metric badges */}
            <View style={styles.metaBadgeRow}>
              <View style={styles.metaBadgeCard}>
                <Ionicons name="time-outline" size={22} color={colors.brand.primary} style={{ marginBottom: 4 }} />
                <Text style={styles.metaBadgeVal}>~ 2-3 Minutes</Text>
                <Text style={styles.metaBadgeSub}>Typical time</Text>
              </View>
              <View style={styles.metaBadgeCard}>
                <Ionicons name="grid-outline" size={22} color={colors.brand.primary} style={{ marginBottom: 4 }} />
                <Text style={styles.metaBadgeVal}>11+ Checkpoints</Text>
                <Text style={styles.metaBadgeSub}>Across tax, books & filings</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => setCurrentView('dashboard')}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>Run Tax Health Audit →</Text>
            </TouchableOpacity>

            <View style={styles.aiFooterCard}>
              <Ionicons name="sparkles" size={20} color={colors.brand.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.aiFooterTitle}>Powered by Mizan AI</Text>
                <Text style={styles.aiFooterDesc}>
                  Analyses your business data against UAE tax laws, FTA rules and best practices.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* VIEW 2: AUDIT REPORT DASHBOARD (4125.png Screen 2)                   */}
        {/* ==================================================================== */}
        {currentView === 'dashboard' && (
          <View style={styles.dashboardSection}>
            {/* Entity Skyline Hero Card */}
            <View style={styles.entityHeroCard}>
              <View style={styles.entityIconBox}>
                <Ionicons name="business" size={20} color={colors.brand.primary} />
              </View>
              <View style={styles.entityInfoCol}>
                <Text style={styles.entityTitle}>The FlexFlow Marketing LLC</Text>
                <Text style={styles.entitySub}>TRN: 123456789000003 | License: 1234567</Text>
              </View>
            </View>

            {/* 4 Segment Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.segmentScroll}
              contentContainerStyle={styles.segmentContent}
            >
              {(['Overview', 'Findings (6)', 'Action Plan', 'Report'] as DashboardTab[]).map((tab) => {
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

            {/* Score Ring Banner Card */}
            <View style={styles.scoreBannerCard}>
              <View style={styles.scoreRingWrap}>
                <View style={styles.scoreOuterCircle}>
                  <AnimatedFinancialNumber
                    value={82}
                    suffix="%"
                    decimals={0}
                    style={styles.scoreCircleText}
                  />
                </View>
              </View>

              <View style={styles.scoreTextCol}>
                <View style={styles.scoreTitleRow}>
                  <Text style={styles.scoreTitle}>Tax Health Score</Text>
                  <View style={styles.goodPill}>
                    <Text style={styles.goodPillText}>Good</Text>
                  </View>
                </View>
                <Text style={styles.scoreDesc}>
                  You're largely compliant, with a few areas that need attention to reach 100%.
                </Text>
              </View>
            </View>

            {/* 4 Status Pillars */}
            <View style={styles.pillarRow}>
              <View style={styles.pillarCard}>
                <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
                <Text style={styles.pillarLabel}>Corporate Tax</Text>
                <Text style={[styles.pillarStatus, { color: colors.semantic.successDark }]}>Compliant</Text>
              </View>

              <View style={styles.pillarCard}>
                <Ionicons name="alert-circle" size={16} color={colors.semantic.warning} />
                <Text style={styles.pillarLabel}>VAT (201)</Text>
                <Text style={[styles.pillarStatus, { color: '#D97706' }]}>Needs Attention</Text>
              </View>

              <View style={styles.pillarCard}>
                <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
                <Text style={styles.pillarLabel}>SBR</Text>
                <Text style={[styles.pillarStatus, { color: colors.semantic.successDark }]}>Eligible</Text>
              </View>

              <View style={styles.pillarCard}>
                <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
                <Text style={styles.pillarLabel}>Bookkeeping</Text>
                <Text style={[styles.pillarStatus, { color: colors.semantic.successDark }]}>Compliant</Text>
              </View>
            </View>

            {/* Audit Summary Table Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="bar-chart" size={18} color={colors.brand.primary} />
                <Text style={styles.summaryTitle}>Audit Summary</Text>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelGroup}>
                  <Ionicons name="list" size={16} color={colors.neutral.textSecondary} />
                  <Text style={styles.summaryLabel}>Total Checks</Text>
                </View>
                <Text style={styles.summaryVal}>11</Text>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelGroup}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
                  <Text style={styles.summaryLabel}>Compliant</Text>
                </View>
                <Text style={styles.summaryVal}>8</Text>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelGroup}>
                  <Ionicons name="alert-circle" size={16} color={colors.semantic.warning} />
                  <Text style={styles.summaryLabel}>Action Needed</Text>
                </View>
                <Text style={styles.summaryVal}>2</Text>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelGroup}>
                  <Ionicons name="warning" size={16} color={colors.semantic.risk} />
                  <Text style={styles.summaryLabel}>High Risk</Text>
                </View>
                <Text style={[styles.summaryVal, { color: colors.semantic.risk }]}>1</Text>
              </View>
            </View>

            {/* Key Issues to Address */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="locate" size={18} color={colors.brand.primary} />
                <Text style={styles.summaryTitle}>Key Issues to Address</Text>
              </View>

              <TouchableOpacity
                style={styles.issueRow}
                activeOpacity={0.7}
                onPress={() => setCurrentView('finding-details')}
              >
                <View style={[styles.issueIconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="warning" size={18} color={colors.semantic.risk} />
                </View>
                <View style={styles.issueTextCol}>
                  <Text style={styles.issueTitle}>VAT Return Not Filed</Text>
                  <Text style={styles.issueSub}>Your last VAT return is overdue by 14 days.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>
              <View style={styles.itemDivider} />

              <TouchableOpacity
                style={styles.issueRow}
                activeOpacity={0.7}
                onPress={() => setCurrentView('finding-details')}
              >
                <View style={[styles.issueIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="warning-outline" size={18} color="#D97706" />
                </View>
                <View style={styles.issueTextCol}>
                  <Text style={styles.issueTitle}>Missing Expense Evidence</Text>
                  <Text style={styles.issueSub}>Some expenses lack valid invoices/receipts.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => setCurrentView('finding-details')}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>View Action Plan →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ==================================================================== */}
        {/* VIEW 3: FINDING DETAILS (4125.png Screen 3)                          */}
        {/* ==================================================================== */}
        {currentView === 'finding-details' && (
          <View style={styles.findingDetailsSection}>
            {/* Top Issue Banner */}
            <View style={styles.highRiskBanner}>
              <View style={styles.riskHeaderRow}>
                <View style={styles.riskIconCircle}>
                  <Ionicons name="warning" size={24} color={colors.semantic.risk} />
                </View>
                <View style={styles.riskHeaderCol}>
                  <View style={styles.riskTagRow}>
                    <Text style={styles.riskTitle}>VAT Return Not Filed</Text>
                    <View style={styles.riskBadge}>
                      <Text style={styles.riskBadgeText}>High Risk</Text>
                    </View>
                  </View>
                  <Text style={styles.riskSubtitle}>
                    Your VAT return for Period Mar – Apr 2026 is overdue by 14 days.
                  </Text>
                </View>
              </View>
            </View>

            {/* Details Table Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="document-text" size={18} color={colors.brand.primary} />
                <Text style={styles.summaryTitle}>Details</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Tax Type</Text>
                <Text style={styles.detailVal}>VAT (201)</Text>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Period</Text>
                <Text style={styles.detailVal}>Mar 2026 – Apr 2026</Text>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Due Date</Text>
                <Text style={styles.detailVal}>30 Apr 2026</Text>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Status</Text>
                <View style={styles.overdueChip}>
                  <Text style={styles.overdueChipText}>Overdue (14 days)</Text>
                </View>
              </View>
            </View>

            {/* Why It Matters Legal Reference */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="information-circle" size={18} color={colors.brand.primary} />
                <Text style={styles.summaryTitle}>Why it matters</Text>
              </View>
              <Text style={styles.legalReasonText}>
                Late filing of a VAT return can lead to administrative penalties from the FTA, starting from <Text style={{ fontWeight: '800', color: colors.semantic.risk }}>AED 1,000</Text> for the first offence, and higher for repeated delays under Cabinet Decision No. 40 of 2017.
              </Text>
            </View>

            {/* Recommended Action Checklist */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="list" size={18} color={colors.brand.primary} />
                <Text style={styles.summaryTitle}>Recommended Action</Text>
              </View>

              <View style={styles.actionStepRow}>
                <View style={styles.actionStepNum}>
                  <Text style={styles.stepNumText}>1</Text>
                </View>
                <Text style={styles.actionStepText}>Prepare your VAT return for Mar – Apr 2026</Text>
              </View>

              <View style={styles.actionStepRow}>
                <View style={styles.actionStepNum}>
                  <Text style={styles.stepNumText}>2</Text>
                </View>
                <Text style={styles.actionStepText}>Review sales, purchases and input VAT recovery</Text>
              </View>

              <View style={styles.actionStepRow}>
                <View style={styles.actionStepNum}>
                  <Text style={styles.stepNumText}>3</Text>
                </View>
                <Text style={styles.actionStepText}>File the return with the FTA and settle any payable VAT</Text>
              </View>
            </View>

            {/* Actions Bar */}
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => router.push('/(tabs)/tax')}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>File VAT Return →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => Alert.alert('Task Created', 'Added to your compliance to-do list.')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.neutral.textPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.secondaryButtonText}>Add to My Tasks</Text>
            </TouchableOpacity>
          </View>
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
  introSection: {
    gap: 12,
  },
  titleBanner: {
    marginBottom: spacing.xs,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
    lineHeight: 18,
  },
  featureCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.neutral.border,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaBadgeCard: {
    flex: 1,
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  metaBadgeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  metaBadgeSub: {
    fontSize: 10,
    color: colors.neutral.textTertiary,
  },
  primaryActionButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    ...shadows.pillButton,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  aiFooterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F5',
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  aiFooterTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  aiFooterDesc: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    lineHeight: 15,
  },
  dashboardSection: {
    gap: 12,
  },
  entityHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.darkHero,
    borderRadius: radii.xl,
    padding: spacing.md,
    ...shadows.cardHover,
  },
  entityIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(249, 87, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  entityInfoCol: {
    flex: 1,
  },
  entityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  entitySub: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  segmentScroll: {
    marginVertical: 2,
  },
  segmentContent: {
    gap: 8,
  },
  segmentPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
  },
  segmentPillTextActive: {
    color: '#FFFFFF',
  },
  scoreBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  scoreRingWrap: {
    marginRight: 14,
  },
  scoreOuterCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 5,
    borderColor: colors.semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCircleText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.neutral.textPrimary,
  },
  scoreTextCol: {
    flex: 1,
  },
  scoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  scoreTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  goodPill: {
    backgroundColor: colors.semantic.successBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  goodPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.semantic.successDark,
  },
  scoreDesc: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    lineHeight: 16,
  },
  pillarRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pillarCard: {
    flex: 1,
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  pillarLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
    marginTop: 4,
    marginBottom: 2,
    textAlign: 'center',
  },
  pillarStatus: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  issueIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  issueTextCol: {
    flex: 1,
  },
  issueTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  issueSub: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
  },
  findingDetailsSection: {
    gap: 12,
  },
  highRiskBanner: {
    backgroundColor: '#FFF1F2',
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  riskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  riskIconCircle: {
    marginRight: 10,
    marginTop: 2,
  },
  riskHeaderCol: {
    flex: 1,
  },
  riskTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  riskTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  riskBadge: {
    backgroundColor: colors.semantic.riskBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.semantic.riskBorder,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.semantic.risk,
  },
  riskSubtitle: {
    fontSize: 12,
    color: '#9F1239',
    lineHeight: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailKey: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  overdueChip: {
    backgroundColor: colors.semantic.riskBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  overdueChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.semantic.risk,
  },
  legalReasonText: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    lineHeight: 17,
  },
  actionStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  actionStepText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
    flex: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
});
