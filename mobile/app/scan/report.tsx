// ============================================================================
// Mizan (ميزان) - Tax Health Audit Report Screen
// Design Reference: screen-designs/4125.png (Screens 1, 2, and 3)
// 3 Views: Audit Intro -> Dashboard with 4 Active Tabs -> Finding Deep-Dive Details
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
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
import { AppStorage } from '../../src/utils/storage';

type AuditView = 'intro' | 'dashboard' | 'finding-details';
type DashboardTab = 'Overview' | 'Findings (6)' | 'Action Plan' | 'Report';

interface AuditFindingItem {
  id: string;
  title: string;
  subtitle: string;
  taxType: string;
  period: string;
  dueDate: string;
  statusLabel: string;
  severity: 'HIGH_RISK' | 'WARNING' | 'COMPLIANT';
  legalReason: string;
  steps: string[];
  actionRoute: string;
  actionButtonLabel: string;
}

interface ActionPlanTask {
  id: string;
  title: string;
  category: string;
  completed: boolean;
}

const DEFAULT_FINDINGS: AuditFindingItem[] = [
  {
    id: 'vat-filing',
    title: 'VAT Return Filing (Form 201)',
    subtitle: 'Ensure current period VAT return is reconciled and filed on time.',
    taxType: 'VAT (201)',
    period: 'Nov 2026 (2026-M11)',
    dueDate: '28 Dec 2026',
    statusLabel: 'Action Required',
    severity: 'HIGH_RISK',
    legalReason:
      'Late filing of a VAT return leads to administrative penalties from the FTA starting from AED 1,000 for the first offence and AED 2,000 for repeated delays under Cabinet Decision No. 40 of 2017.',
    steps: [
      'Review output VAT on issued sales invoices (Box 1)',
      'Verify tax invoices for recoverable input VAT (Box 9)',
      'Generate Form 201 return schedule in Mizan Tax Hub',
    ],
    actionRoute: '/(tabs)/tax',
    actionButtonLabel: 'Open VAT 201 Return →',
  },
  {
    id: 'expense-evidence',
    title: 'Unverified Expense Receipts',
    subtitle: 'Some expense bills require TRN & category verification.',
    taxType: 'Bookkeeping & Input VAT',
    period: 'FY 2026',
    dueDate: 'Before Return Filing',
    statusLabel: 'Needs Review',
    severity: 'WARNING',
    legalReason:
      'Under Article 55 of Federal Decree-Law No. 8 of 2017, input VAT can only be recovered if supported by a valid Tax Invoice containing the supplier TRN.',
    steps: [
      'Open the Expense Categorization & Review queue',
      'Verify supplier TRNs and 5% VAT amounts extracted via OCR',
      'Approve valid business expenses to post to the ledger',
    ],
    actionRoute: '/expenses/review',
    actionButtonLabel: 'Review Expense Receipts →',
  },
  {
    id: 'ct-registration',
    title: 'Corporate Tax Registration & Regime',
    subtitle: 'Entity classified under Federal Decree-Law No. 47 of 2022.',
    taxType: 'Corporate Tax',
    period: 'FY 2026 (Jan – Dec)',
    dueDate: '30 Sep 2027',
    statusLabel: 'Compliant',
    severity: 'COMPLIANT',
    legalReason:
      'Taxable persons must file their Corporate Tax return within 9 months from the end of the relevant Tax Period under Article 48 of the Corporate Tax Law.',
    steps: [
      'Maintain audited or reconciled financial statements',
      'Track entertainment (50% cap) and non-deductible additions',
      'Submit Corporate Tax return within 9 months of year-end',
    ],
    actionRoute: '/(tabs)/tax',
    actionButtonLabel: 'View Corporate Tax Hub →',
  },
  {
    id: 'sbr-election',
    title: 'Small Business Relief (Article 21)',
    subtitle: 'Revenue below AED 3,000,000 statutory threshold.',
    taxType: 'Corporate Tax (SBR)',
    period: 'FY 2026',
    dueDate: 'Annual Election',
    statusLabel: 'Eligible (0% Tax)',
    severity: 'COMPLIANT',
    legalReason:
      'Ministerial Decision No. 73 of 2023 allows resident businesses with gross revenue ≤ AED 3,000,000 to elect Small Business Relief and be treated as having zero taxable income.',
    steps: [
      'Monitor gross revenue against the AED 3,000,000 ceiling',
      'Confirm entity is not a Qualifying Free Zone Person or MNE',
      'Elect Small Business Relief on your FTA EmaraTax return',
    ],
    actionRoute: '/(tabs)/tax',
    actionButtonLabel: 'Check SBR Gauge →',
  },
  {
    id: 'article-59-invoicing',
    title: 'Article 59 Tax Invoicing Format',
    subtitle: 'Sequential numbering and mandatory TRN fields active.',
    taxType: 'VAT Invoicing',
    period: 'Ongoing',
    dueDate: 'Continuous',
    statusLabel: 'Compliant',
    severity: 'COMPLIANT',
    legalReason:
      'Article 59 of the UAE VAT Executive Regulations mandates sequential invoice numbers, supplier/recipient TRNs, and line-item VAT breakdowns in AED.',
    steps: [
      'Issue all customer invoices through Mizan Invoicing Hub',
      'Ensure customer TRNs are recorded for B2B supplies',
      'Retain tamper-evident PDF copies for 7 years',
    ],
    actionRoute: '/(tabs)/invoices',
    actionButtonLabel: 'Go to Invoices Hub →',
  },
  {
    id: 'record-retention',
    title: '7-Year Statutory Archive (Art. 78)',
    subtitle: 'Digital ledger and OCR receipts stored in cloud vault.',
    taxType: 'FTA Audit Trail',
    period: 'FY 2026 – 2033',
    dueDate: '7 Years from FY End',
    statusLabel: 'Compliant',
    severity: 'COMPLIANT',
    legalReason:
      'Article 56 of the Corporate Tax Law and Article 78 of the VAT Executive Regulations require taxable persons to retain accounting records for at least 7 years.',
    steps: [
      'Scan all physical thermal receipts using Mizan OCR',
      'Export periodic Trial Balance and P&L PDF archives',
    ],
    actionRoute: '/(tabs)/books',
    actionButtonLabel: 'Open Financial Ledger →',
  },
];

const INITIAL_ACTION_TASKS: ActionPlanTask[] = [
  {
    id: 'task-1',
    title: 'Reconcile November 2026 VAT Return (Form 201)',
    category: 'VAT (201)',
    completed: false,
  },
  {
    id: 'task-2',
    title: 'Review & approve pending OCR expense receipts',
    category: 'Bookkeeping',
    completed: false,
  },
  {
    id: 'task-3',
    title: 'Verify Small Business Relief (Art. 21) revenue threshold',
    category: 'Corporate Tax',
    completed: true,
  },
  {
    id: 'task-4',
    title: 'Confirm Trade License & TRN details in Business Settings',
    category: 'Compliance',
    completed: true,
  },
];

export default function TaxHealthAuditReportScreen() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  const [currentView, setCurrentView] = useState<AuditView>('dashboard');
  const [activeTab, setActiveTab] = useState<DashboardTab>('Overview');
  const [selectedFinding, setSelectedFinding] = useState<AuditFindingItem>(DEFAULT_FINDINGS[0]);
  const [actionTasks, setActionTasks] = useState<ActionPlanTask[]>(INITIAL_ACTION_TASKS);
  const [isExporting, setIsExporting] = useState(false);

  const storageTasksKey = `mizan_audit_tasks_${activeBusiness?.id || 'default'}`;

  const loadTasks = useCallback(async () => {
    try {
      const saved = await AppStorage.getItem(storageTasksKey);
      if (saved) {
        setActionTasks(JSON.parse(saved));
      } else {
        setActionTasks(INITIAL_ACTION_TASKS);
      }
    } catch {
      setActionTasks(INITIAL_ACTION_TASKS);
    }
  }, [storageTasksKey]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const toggleTaskCompletion = async (taskId: string) => {
    Haptics.selectionAsync().catch(() => {});
    const updated = actionTasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    setActionTasks(updated);
    await AppStorage.setItem(storageTasksKey, JSON.stringify(updated));
  };

  const handleAddFindingToTasks = async (finding: AuditFindingItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const exists = actionTasks.some((t) => t.title.includes(finding.title));
    if (!exists) {
      const newTask: ActionPlanTask = {
        id: `task-${Date.now()}`,
        title: `Resolve: ${finding.title} (${finding.period})`,
        category: finding.taxType,
        completed: false,
      };
      const updated = [newTask, ...actionTasks];
      setActionTasks(updated);
      await AppStorage.setItem(storageTasksKey, JSON.stringify(updated));
    }
    setCurrentView('dashboard');
    setActiveTab('Action Plan');
    Alert.alert(
      'Added to Action Plan',
      `"${finding.title}" has been added to your compliance checklist.`
    );
  };

  const handleOpenFinding = (finding: AuditFindingItem) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedFinding(finding);
    setCurrentView('finding-details');
  };

  const handleDownloadPdf = async (reportTypeArg?: string) => {
    const reportType = typeof reportTypeArg === 'string' ? reportTypeArg : 'TAX_READINESS_AUDIT';
    setIsExporting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
          console.warn('Backend report fallback to client template:', apiErr);
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
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">Mizan ميزان</div>
              <h2>UAE Tax Health Audit Report (${reportType})</h2>
              <p><strong>Entity:</strong> ${activeBusiness?.legalName || 'Registered UAE Entity'} | <strong>License:</strong> ${activeBusiness?.tradeLicenseNumber || 'N/A'} | <strong>TRN:</strong> ${activeBusiness?.vatTrn || 'N/A'}</p>
            </div>
            <div class="score-box">
              <h3>Tax Readiness Audit Summary — Score: 82% (Good)</h3>
              <p>Statutory assessment under Federal Decree-Law No. 8 of 2017 & Federal Decree-Law No. 47 of 2022.</p>
            </div>
            <table>
              <tr><th>Finding</th><th>Tax Pillar</th><th>Status</th></tr>
              ${DEFAULT_FINDINGS.map(
                (f) => `<tr><td>${f.title}</td><td>${f.taxType}</td><td>${f.statusLabel}</td></tr>`
              ).join('')}
            </table>
          </body>
          </html>
        `;
      }

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.warn('PDF export error:', e);
      Alert.alert(
        isRTL ? 'خطأ في التصدير' : 'Export Failed',
        isRTL ? 'تعذر إنشاء تقرير PDF' : 'Unable to generate PDF report'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const completedTasksCount = actionTasks.filter((t) => t.completed).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (currentView === 'finding-details') setCurrentView('dashboard');
              else if (currentView === 'dashboard') router.back();
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
          onPress={() => handleDownloadPdf('TAX_READINESS_AUDIT')}
          activeOpacity={0.7}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : (
            <Ionicons name="download-outline" size={20} color={colors.neutral.textPrimary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================================================================== */}
        {/* VIEW 1: INTRO LANDING                                                */}
        {/* ==================================================================== */}
        {currentView === 'intro' && (
          <View style={styles.introSection}>
            <View style={styles.titleBanner}>
              <Text style={styles.mainTitle}>Tax Health Audit Report</Text>
              <Text style={styles.subtitle}>
                A comprehensive, AI-powered audit of your tax, bookkeeping and compliance health under UAE laws and FTA requirements.
              </Text>
            </View>

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
            </View>

            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => setCurrentView('dashboard')}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>Open Audit Dashboard →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ==================================================================== */}
        {/* VIEW 2: AUDIT REPORT DASHBOARD WITH 4 FUNCTIONAL TABS                */}
        {/* ==================================================================== */}
        {currentView === 'dashboard' && (
          <View style={styles.dashboardSection}>
            {/* Real Active Business Entity Hero Card */}
            <View style={styles.entityHeroCard}>
              <View style={styles.entityIconBox}>
                <Ionicons name="business" size={20} color={colors.brand.primary} />
              </View>
              <View style={styles.entityInfoCol}>
                <Text style={styles.entityTitle}>
                  {activeBusiness?.tradeName || activeBusiness?.legalName || 'Registered UAE Business'}
                </Text>
                <Text style={styles.entitySub}>
                  TRN: {activeBusiness?.vatTrn || 'Pending VAT Registration'} | License:{' '}
                  {activeBusiness?.tradeLicenseNumber || 'N/A'}
                </Text>
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

            {/* ---------------------------------------------------------------- */}
            {/* TAB 1: OVERVIEW                                                  */}
            {/* ---------------------------------------------------------------- */}
            {activeTab === 'Overview' && (
              <>
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
                      You're largely compliant, with 2 priority items that need attention to reach 100%.
                    </Text>
                  </View>
                </View>

                {/* 4 Status Pillars */}
                <View style={styles.pillarRow}>
                  <TouchableOpacity
                    style={styles.pillarCard}
                    onPress={() => handleOpenFinding(DEFAULT_FINDINGS[2])}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
                    <Text style={styles.pillarLabel}>Corporate Tax</Text>
                    <Text style={[styles.pillarStatus, { color: colors.semantic.successDark }]}>Compliant</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pillarCard}
                    onPress={() => handleOpenFinding(DEFAULT_FINDINGS[0])}
                  >
                    <Ionicons name="alert-circle" size={16} color={colors.semantic.warning} />
                    <Text style={styles.pillarLabel}>VAT (201)</Text>
                    <Text style={[styles.pillarStatus, { color: '#D97706' }]}>Needs Action</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pillarCard}
                    onPress={() => handleOpenFinding(DEFAULT_FINDINGS[3])}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
                    <Text style={styles.pillarLabel}>SBR</Text>
                    <Text style={[styles.pillarStatus, { color: colors.semantic.successDark }]}>Eligible</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pillarCard}
                    onPress={() => handleOpenFinding(DEFAULT_FINDINGS[1])}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
                    <Text style={styles.pillarLabel}>Bookkeeping</Text>
                    <Text style={[styles.pillarStatus, { color: colors.semantic.successDark }]}>Active</Text>
                  </TouchableOpacity>
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
                      <Text style={styles.summaryLabel}>Total Statutory Checks</Text>
                    </View>
                    <Text style={styles.summaryVal}>6</Text>
                  </View>
                  <View style={styles.itemDivider} />

                  <View style={styles.summaryRow}>
                    <View style={styles.summaryLabelGroup}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
                      <Text style={styles.summaryLabel}>Compliant</Text>
                    </View>
                    <Text style={styles.summaryVal}>4</Text>
                  </View>
                  <View style={styles.itemDivider} />

                  <View style={styles.summaryRow}>
                    <View style={styles.summaryLabelGroup}>
                      <Ionicons name="alert-circle" size={16} color={colors.semantic.warning} />
                      <Text style={styles.summaryLabel}>Action Needed</Text>
                    </View>
                    <Text style={styles.summaryVal}>1</Text>
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

                  {DEFAULT_FINDINGS.slice(0, 2).map((item, idx) => (
                    <React.Fragment key={item.id}>
                      {idx > 0 && <View style={styles.itemDivider} />}
                      <TouchableOpacity
                        style={styles.issueRow}
                        activeOpacity={0.7}
                        onPress={() => handleOpenFinding(item)}
                      >
                        <View
                          style={[
                            styles.issueIconBox,
                            {
                              backgroundColor:
                                item.severity === 'HIGH_RISK' ? '#FEE2E2' : '#FEF3C7',
                            },
                          ]}
                        >
                          <Ionicons
                            name={item.severity === 'HIGH_RISK' ? 'warning' : 'warning-outline'}
                            size={18}
                            color={item.severity === 'HIGH_RISK' ? colors.semantic.risk : '#D97706'}
                          />
                        </View>
                        <View style={styles.issueTextCol}>
                          <Text style={styles.issueTitle}>{item.title}</Text>
                          <Text style={styles.issueSub}>{item.subtitle}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => setActiveTab('Action Plan')}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryActionText}>View Prioritised Action Plan →</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* TAB 2: FINDINGS (ALL 6 STATUTORY CHECKS)                         */}
            {/* ---------------------------------------------------------------- */}
            {activeTab === 'Findings (6)' && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.brand.primary} />
                  <Text style={styles.summaryTitle}>All Audit Findings (Tap for Legal Details)</Text>
                </View>

                {DEFAULT_FINDINGS.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    {idx > 0 && <View style={styles.itemDivider} />}
                    <TouchableOpacity
                      style={styles.issueRow}
                      activeOpacity={0.75}
                      onPress={() => handleOpenFinding(item)}
                    >
                      <View
                        style={[
                          styles.issueIconBox,
                          {
                            backgroundColor:
                              item.severity === 'HIGH_RISK'
                                ? '#FEE2E2'
                                : item.severity === 'WARNING'
                                ? '#FEF3C7'
                                : '#ECFDF5',
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            item.severity === 'HIGH_RISK'
                              ? 'warning'
                              : item.severity === 'WARNING'
                              ? 'alert-circle'
                              : 'checkmark-circle'
                          }
                          size={18}
                          color={
                            item.severity === 'HIGH_RISK'
                              ? colors.semantic.risk
                              : item.severity === 'WARNING'
                              ? '#D97706'
                              : colors.semantic.successDark
                          }
                        />
                      </View>
                      <View style={styles.issueTextCol}>
                        <Text style={styles.issueTitle}>{item.title}</Text>
                        <Text style={styles.issueSub}>
                          {item.taxType} • {item.statusLabel}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* TAB 3: ACTION PLAN CHECKLIST                                     */}
            {/* ---------------------------------------------------------------- */}
            {activeTab === 'Action Plan' && (
              <>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <Ionicons name="checkbox-outline" size={18} color={colors.brand.primary} />
                    <Text style={styles.summaryTitle}>
                      Compliance Action Plan ({completedTasksCount}/{actionTasks.length} Done)
                    </Text>
                  </View>

                  {actionTasks.map((task, idx) => (
                    <React.Fragment key={task.id}>
                      {idx > 0 && <View style={styles.itemDivider} />}
                      <TouchableOpacity
                        style={styles.issueRow}
                        activeOpacity={0.75}
                        onPress={() => toggleTaskCompletion(task.id)}
                      >
                        <Ionicons
                          name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={task.completed ? colors.semantic.successDark : colors.brand.primary}
                          style={{ marginRight: 10 }}
                        />
                        <View style={styles.issueTextCol}>
                          <Text
                            style={[
                              styles.issueTitle,
                              task.completed && {
                                textDecorationLine: 'line-through',
                                color: colors.neutral.textTertiary,
                              },
                            ]}
                          >
                            {task.title}
                          </Text>
                          <Text style={styles.issueSub}>{task.category}</Text>
                        </View>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => router.push('/(tabs)/tax')}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryActionText}>Go to Tax Hub to Resolve →</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* TAB 4: EXPORTABLE AUDIT REPORTS                                  */}
            {/* ---------------------------------------------------------------- */}
            {activeTab === 'Report' && (
              <View style={{ gap: 12 }}>
                {[
                  {
                    type: 'TAX_READINESS_AUDIT',
                    title: 'Comprehensive Tax Health Audit PDF',
                    desc: 'Full 6-pillar statutory compliance evaluation with FTA citations.',
                  },
                  {
                    type: 'VAT_201_SUMMARY',
                    title: 'FTA VAT Form 201 Audit Working Paper',
                    desc: 'Box-by-box output and input VAT schedule for EmaraTax filing.',
                  },
                  {
                    type: 'CORPORATE_TAX_PACK',
                    title: 'Corporate Tax & SBR Eligibility Pack',
                    desc: 'Article 21 Small Business Relief and taxable income schedule.',
                  },
                ].map((rep) => (
                  <View key={rep.type} style={styles.summaryCard}>
                    <Text style={styles.issueTitle}>{rep.title}</Text>
                    <Text style={[styles.issueSub, { marginTop: 4, marginBottom: 12 }]}>
                      {rep.desc}
                    </Text>
                    <TouchableOpacity
                      style={styles.primaryActionButton}
                      onPress={() => handleDownloadPdf(rep.type)}
                      disabled={isExporting}
                    >
                      <Text style={styles.primaryActionText}>
                        {isExporting ? 'Generating PDF...' : 'Download & Share PDF →'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ==================================================================== */}
        {/* VIEW 3: DYNAMIC FINDING DETAILS                                      */}
        {/* ==================================================================== */}
        {currentView === 'finding-details' && (
          <View style={styles.findingDetailsSection}>
            {/* Top Issue Banner */}
            <View
              style={[
                styles.highRiskBanner,
                selectedFinding.severity === 'COMPLIANT' && {
                  backgroundColor: '#ECFDF5',
                  borderColor: '#A7F3D0',
                },
              ]}
            >
              <View style={styles.riskHeaderRow}>
                <View style={styles.riskIconCircle}>
                  <Ionicons
                    name={
                      selectedFinding.severity === 'COMPLIANT' ? 'checkmark-circle' : 'warning'
                    }
                    size={24}
                    color={
                      selectedFinding.severity === 'COMPLIANT'
                        ? colors.semantic.successDark
                        : colors.semantic.risk
                    }
                  />
                </View>
                <View style={styles.riskHeaderCol}>
                  <View style={styles.riskTagRow}>
                    <Text style={styles.riskTitle}>{selectedFinding.title}</Text>
                    <View
                      style={[
                        styles.riskBadge,
                        selectedFinding.severity === 'COMPLIANT' && {
                          backgroundColor: '#D1FAE5',
                          borderColor: '#6EE7B7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.riskBadgeText,
                          selectedFinding.severity === 'COMPLIANT' && {
                            color: colors.semantic.successDark,
                          },
                        ]}
                      >
                        {selectedFinding.statusLabel}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.riskSubtitle,
                      selectedFinding.severity === 'COMPLIANT' && { color: '#065F46' },
                    ]}
                  >
                    {selectedFinding.subtitle}
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
                <Text style={styles.detailKey}>Tax Pillar</Text>
                <Text style={styles.detailVal}>{selectedFinding.taxType}</Text>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Period</Text>
                <Text style={styles.detailVal}>{selectedFinding.period}</Text>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Due Date</Text>
                <Text style={styles.detailVal}>{selectedFinding.dueDate}</Text>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Status</Text>
                <View style={styles.overdueChip}>
                  <Text style={styles.overdueChipText}>{selectedFinding.statusLabel}</Text>
                </View>
              </View>
            </View>

            {/* Why It Matters Legal Reference */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="information-circle" size={18} color={colors.brand.primary} />
                <Text style={styles.summaryTitle}>Statutory Basis & Why It Matters</Text>
              </View>
              <Text style={styles.legalReasonText}>{selectedFinding.legalReason}</Text>
            </View>

            {/* Recommended Action Checklist */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="list" size={18} color={colors.brand.primary} />
                <Text style={styles.summaryTitle}>Recommended Steps</Text>
              </View>

              {selectedFinding.steps.map((stepText, idx) => (
                <View key={idx} style={styles.actionStepRow}>
                  <View style={styles.actionStepNum}>
                    <Text style={styles.stepNumText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.actionStepText}>{stepText}</Text>
                </View>
              ))}
            </View>

            {/* Actions Bar */}
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => router.push(selectedFinding.actionRoute as any)}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>{selectedFinding.actionButtonLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => handleAddFindingToTasks(selectedFinding)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.neutral.textPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.secondaryButtonText}>Add to My Action Plan</Text>
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
    fontSize: 15,
    fontWeight: '800',
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
    paddingVertical: 10,
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
    gap: 8,
  },
  riskTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    flex: 1,
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
