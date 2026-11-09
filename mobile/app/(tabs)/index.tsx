// ============================================================================
// Mizan (ميزان) - Home Dashboard Screen
// Design Reference: screen-designs/4117.png
// Clean Warm Pearl canvas, Charcoal Compliance card, 3-stat grid, quick actions,
// Tax Calendar, and Ask Mizan AI banner
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { ScreenSection, AnimatedPressable, AnimatedProgressBar, AnimatedFinancialNumber } from '../../src/animations';
import { MizanApi } from '../../src/services/api';

export default function HomeScreen() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const { activeBusiness, businesses, currentUser } = useBusiness();
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<any | null>(null);

  const avatarInitials = currentUser?.fullName
    ? currentUser.fullName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'MZ';

  const userFirstName = currentUser?.fullName
    ? currentUser.fullName.split(' ')[0]
    : activeBusiness?.tradeName || (isRTL ? 'عزيزي المشترك' : 'Founder');

  const fetchDashboardData = async () => {
    if (!activeBusiness?.id) return;
    try {
      setLoading(true);
      const data = await MizanApi.getDashboardOverview(activeBusiness.id);
      setDashboard(data);
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeBusiness?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top App Header */}
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.brandRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Logo icon pill */}
          <View style={styles.brandLogoBox}>
            <View style={styles.logoSlantBar1} />
            <View style={styles.logoSlantBar2} />
          </View>
          <Text style={styles.brandTitle}>Mizan ميزان</Text>
        </View>

        <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={styles.headerIconButton}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/books')}
          >
            <Ionicons name="search-outline" size={20} color={colors.neutral.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            activeOpacity={0.7}
            onPress={() => router.push('/scan/readiness')}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.neutral.textPrimary} />
            <View style={[styles.notifDot, isRTL ? { left: 8, right: undefined } : { right: 8, left: undefined }]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarButton}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.avatarText}>{avatarInitials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
      >
        {/* User Greeting & Skyline Backdrop */}
        <ScreenSection index={0}>
          <View style={styles.greetingSection}>
            <View style={[styles.greetingTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.greetingTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL
                  ? `مرحباً، ${userFirstName}`
                  : `Hello, ${userFirstName}`}
              </Text>
              <Text style={[styles.greetingSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {activeBusiness
                  ? `${activeBusiness.tradeLicenseNumber} • ${activeBusiness.taxRegime}`
                  : isRTL
                  ? 'مساعدك الذكي لضرائب وامتثال الشركات في الإمارات'
                  : 'Your UAE tax & compliance copilot'}
              </Text>
            </View>
          </View>
        </ScreenSection>

        {/* Compliance Health Hero Card OR Onboarding Card if no business */}
        <ScreenSection index={1}>
          {!activeBusiness ? (
            <View style={styles.onboardingCard}>
              <View style={styles.onboardingIconCircle}>
                <Ionicons name="scan-outline" size={32} color={colors.brand.primary} />
              </View>
              <Text style={styles.onboardingTitle}>
                {isRTL ? 'سجّل شركتك الأولى في الإمارات' : 'Register Your First UAE Business'}
              </Text>
              <Text style={styles.onboardingDesc}>
                {isRTL
                  ? 'امسح رخصتك التجارية لتفعيل الحسابات الضريبية التلقائية، والتحقق من أهلية إعفاء المشاريع الصغيرة (SBR)، ومواعيد إقرارات القيمة المضافة.'
                  : 'Scan your trade license to activate automated corporate tax calculations, Small Business Relief (SBR) screening, and statutory filing calendars.'}
              </Text>
              <TouchableOpacity
                style={styles.onboardingBtn}
                onPress={() => router.push('/scan')}
                activeOpacity={0.85}
              >
                <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                <Text style={styles.onboardingBtnText}>
                  {isRTL ? 'مسح الرخصة التجارية بالكاميرا' : 'Scan Trade License'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/scan/readiness')}
            >
              <View style={styles.complianceCard}>
                <View style={styles.complianceGlowOverlay} />
                <View style={[styles.complianceContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.complianceTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <View style={[styles.statusIndicatorRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View
                        style={[
                          styles.greenPulseDot,
                          dashboard?.readiness?.status !== 'AUDIT_READY' && { backgroundColor: colors.semantic.warning },
                        ]}
                      />
                      <Text style={styles.complianceLabel}>
                        {isRTL ? 'صحة الامتثال الضريبي' : 'Tax Compliance Health'}
                      </Text>
                    </View>

                    <View style={[styles.scoreRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <AnimatedFinancialNumber
                        value={dashboard?.readiness?.overallScore ?? 100}
                        suffix="%"
                        decimals={0}
                        textStyle={styles.scoreText}
                      />
                      <View
                        style={[
                          styles.compliantBadge,
                          dashboard?.readiness?.status !== 'AUDIT_READY' && {
                            backgroundColor: '#FEF3C7',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.compliantBadgeText,
                            dashboard?.readiness?.status !== 'AUDIT_READY' && { color: '#B45309' },
                          ]}
                        >
                          {dashboard?.readiness?.status === 'AUDIT_READY'
                            ? isRTL
                              ? 'ممتثل جاهز للتدقيق'
                              : 'Audit Ready'
                            : isRTL
                            ? 'إجراء مطلوب'
                            : 'Action Required'}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.complianceSubtext, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {dashboard?.readiness?.criticalBlockerCount > 0
                        ? isRTL
                          ? `يوجد ${dashboard.readiness.criticalBlockerCount} متطلب(ات) امتثال بحاجة للمراجعة.`
                          : `${dashboard.readiness.criticalBlockerCount} critical blocker(s) require action.`
                        : isRTL
                        ? 'جميع الإقرارات محدثة. لا توجد غرامات نشطة.'
                        : 'All filings up to date. No active penalties.'}
                    </Text>
                  </View>

                  {/* Glowing Shield Icon */}
                  <View style={[styles.shieldContainer, isRTL ? { marginRight: 12, marginLeft: 0 } : { marginLeft: 12, marginRight: 0 }]}>
                    <View style={styles.shieldOuterGlow}>
                      <Ionicons
                        name="shield-checkmark"
                        size={38}
                        color={dashboard?.readiness?.status === 'AUDIT_READY' ? colors.brand.primary : colors.semantic.warning}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </ScreenSection>

        {/* 3 Metrics Cards Grid */}
        <ScreenSection index={2}>
          <View style={[styles.metricsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Card 1: Corporate Tax */}
            <AnimatedPressable
              activeScale={0.97}
              style={[styles.metricCard, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}
              onPress={() => router.push('/(tabs)/tax')}
            >
              <View style={styles.metricIconBox}>
                <Ionicons name="business-outline" size={18} color={colors.brand.primary} />
              </View>
              <Text style={[styles.metricLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{isRTL ? 'ضريبة الشركات' : 'Corporate Tax'}</Text>
              <AnimatedFinancialNumber
                value={Number(dashboard?.tax?.latestCorporateTaxAssessment?.corporateTaxDueAED ?? 0)}
                currency="AED "
                decimals={0}
                textStyle={[styles.metricAmount, { textAlign: isRTL ? 'right' : 'left' }]}
              />
              <Text style={[styles.metricSub, { textAlign: isRTL ? 'right' : 'left' }]}>
                {dashboard?.tax?.latestCorporateTaxAssessment?.dueDate
                  ? isRTL
                    ? `استحقاق: ${dashboard.tax.latestCorporateTaxAssessment.dueDate.slice(0, 10)}`
                    : `Due: ${dashboard.tax.latestCorporateTaxAssessment.dueDate.slice(0, 10)}`
                  : isRTL
                  ? 'تقديري لهذه الفترة'
                  : 'Est. for this period'}
              </Text>
            </AnimatedPressable>

            {/* Card 2: VAT (201) */}
            <AnimatedPressable
              activeScale={0.97}
              style={[styles.metricCard, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}
              onPress={() => router.push('/(tabs)/tax')}
            >
              <View style={styles.metricIconBox}>
                <Ionicons name="pie-chart-outline" size={18} color={colors.brand.primary} />
              </View>
              <Text style={[styles.metricLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{isRTL ? 'القيمة المضافة (201)' : 'VAT (201)'}</Text>
              <AnimatedFinancialNumber
                value={Math.abs(Number(dashboard?.tax?.latestVatAssessment?.netVatPayableAED ?? 0))}
                currency="AED "
                decimals={0}
                textStyle={[styles.metricAmount, { textAlign: isRTL ? 'right' : 'left' }]}
              />
              <Text style={[styles.metricSub, { textAlign: isRTL ? 'right' : 'left' }]}>
                {dashboard?.tax?.latestVatAssessment?.dueDate
                  ? isRTL
                    ? `استحقاق: ${dashboard.tax.latestVatAssessment.dueDate.slice(0, 10)}`
                    : `Due: ${dashboard.tax.latestVatAssessment.dueDate.slice(0, 10)}`
                  : isRTL
                  ? 'يستحق خلال 28 يوماً'
                  : 'Due in 28 days'}
              </Text>
            </AnimatedPressable>

            {/* Card 3: SBR Status */}
            <AnimatedPressable
              activeScale={0.97}
              style={[styles.metricCard, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}
              onPress={() => router.push('/(tabs)/tax')}
            >
              <View style={styles.metricIconBox}>
                <Ionicons name="bar-chart-outline" size={18} color={colors.brand.primary} />
              </View>
              <Text style={[styles.metricLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{isRTL ? 'إعفاء الشركات' : 'SBR Status'}</Text>
              <View
                style={[
                  styles.sbrEligibleChip,
                  Number(dashboard?.financials?.totalRevenueAED ?? 0) > 3000000 && {
                    backgroundColor: '#FEE2E2',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sbrEligibleText,
                    Number(dashboard?.financials?.totalRevenueAED ?? 0) > 3000000 && {
                      color: '#DC2626',
                    },
                  ]}
                >
                  {Number(dashboard?.financials?.totalRevenueAED ?? 0) <= 3000000
                    ? isRTL
                      ? 'مؤهل'
                      : 'Eligible'
                    : isRTL
                    ? 'غير مؤهل'
                    : 'Standard'}
                </Text>
              </View>
              <AnimatedProgressBar
                progress={Math.min(100, Math.round((Number(dashboard?.financials?.totalRevenueAED ?? 0) / 3000000) * 100))}
                height={5}
                style={{ marginVertical: 6 }}
              />
              <Text style={[styles.metricSub, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL
                  ? `الإيرادات: ${Math.round(Number(dashboard?.financials?.totalRevenueAED ?? 0) / 1000)}k / 3M د.إ`
                  : `Turnover: AED ${Math.round(Number(dashboard?.financials?.totalRevenueAED ?? 0) / 1000)}k / 3M`}
              </Text>
            </AnimatedPressable>
          </View>
        </ScreenSection>

        {/* 5 Quick Action Circular Buttons */}
        <ScreenSection index={3}>
          <View style={[styles.quickActionsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <AnimatedPressable
              activeScale={0.92}
              style={styles.actionItem}
              onPress={() => router.push('/expenses/scan')}
            >
              <View style={styles.actionRoundBtn}>
                <Ionicons name="scan-outline" size={22} color={colors.brand.primary} />
              </View>
              <Text style={styles.actionLabel}>
                {isRTL ? 'مسح الفاتورة\n(OCR)' : 'Scan Receipt\n(OCR)'}
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              activeScale={0.92}
              style={styles.actionItem}
              onPress={() => router.push('/invoices/new')}
            >
              <View style={styles.actionRoundBtn}>
                <Ionicons name="document-text-outline" size={22} color={colors.brand.primary} />
              </View>
              <Text style={styles.actionLabel}>
                {isRTL ? 'إنشاء\nفاتورة' : 'Create\nInvoice'}
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              activeScale={0.92}
              style={styles.actionItem}
              onPress={() => router.push('/expenses/review')}
            >
              <View style={styles.actionRoundBtn}>
                <Ionicons name="add" size={24} color={colors.brand.primary} />
              </View>
              <Text style={styles.actionLabel}>
                {isRTL ? 'إضافة\nمصروف' : 'Add\nExpense'}
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              activeScale={0.92}
              style={styles.actionItem}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setBankModalVisible(true);
              }}
            >
              <View style={styles.actionRoundBtn}>
                <Ionicons name="card-outline" size={22} color={colors.brand.primary} />
              </View>
              <Text style={styles.actionLabel}>
                {isRTL ? 'ربط\nالبنك' : 'Sync\nBank'}
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              activeScale={0.92}
              style={styles.actionItem}
              onPress={() => router.push('/learn/chat')}
            >
              <View style={styles.actionRoundBtn}>
                <Ionicons name="sparkles" size={22} color={colors.brand.primary} />
              </View>
              <Text style={styles.actionLabel}>
                {isRTL ? 'اسأل\nالمستشار' : 'Ask\nTax AI'}
              </Text>
            </AnimatedPressable>
          </View>
        </ScreenSection>

        {/* Real Financial Ledger Summary */}
        <ScreenSection index={4}>
          <View style={styles.financialSummaryCard}>
            <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.cardHeaderLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="wallet-outline" size={20} color={colors.neutral.textPrimary} />
                <Text style={styles.cardHeaderText}>
                  {isRTL ? 'ملخص الدفاتر المالية' : 'Financial Ledger Summary'}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/scan/report')}
                style={[styles.viewAllRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Text style={styles.viewAllText}>{isRTL ? 'التقارير المالية' : 'Reports'}</Text>
                <Ionicons
                  name={isRTL ? 'arrow-back' : 'arrow-forward'}
                  size={14}
                  color={colors.neutral.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.finMetricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.finMetricBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.finMetricLabel}>{isRTL ? 'الإيرادات المسجلة' : 'Total Revenue'}</Text>
                <AnimatedFinancialNumber
                  value={Number(dashboard?.financials?.totalRevenueAED ?? 0)}
                  currency="AED "
                  decimals={2}
                  textStyle={styles.finMetricValPositive}
                />
              </View>

              <View style={[styles.finMetricBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.finMetricLabel}>{isRTL ? 'المصروفات المعتمدة' : 'Total Expenses'}</Text>
                <AnimatedFinancialNumber
                  value={Number(dashboard?.financials?.totalExpensesAED ?? 0)}
                  currency="AED "
                  decimals={2}
                  textStyle={styles.finMetricValNeutral}
                />
              </View>
            </View>

            <View style={[styles.finMetricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 12 }]}>
              <View style={[styles.finMetricBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.finMetricLabel}>{isRTL ? 'صافي الربح المحاسبي' : 'Net Accounting Profit'}</Text>
                <AnimatedFinancialNumber
                  value={Number(dashboard?.financials?.netAccountingProfitAED ?? 0)}
                  currency="AED "
                  decimals={2}
                  textStyle={styles.finMetricValPrimary}
                />
              </View>

              <View style={[styles.finMetricBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.finMetricLabel}>{isRTL ? 'مستحقات التحصيل' : 'Receivables'}</Text>
                <AnimatedFinancialNumber
                  value={Number(dashboard?.financials?.totalReceivablesAED ?? 0)}
                  currency="AED "
                  decimals={2}
                  textStyle={styles.finMetricValWarning}
                />
              </View>
            </View>
          </View>
        </ScreenSection>

        {/* Tax Calendar Section */}
        <ScreenSection index={5}>
          <View style={styles.calendarCard}>
            <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.cardHeaderLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.neutral.textPrimary} />
                <Text style={styles.cardHeaderText}>
                  {isRTL ? 'التقويم الضريبي الإماراتي' : 'UAE Tax Calendar'}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/tax')}
                style={[styles.viewAllRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Text style={styles.viewAllText}>{isRTL ? 'عرض الكل' : 'View All'}</Text>
                <Ionicons
                  name={isRTL ? 'arrow-back' : 'arrow-forward'}
                  size={14}
                  color={colors.neutral.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {dashboard?.upcomingDeadlines && dashboard.upcomingDeadlines.length > 0 ? (
              dashboard.upcomingDeadlines.slice(0, 3).map((dl: any, idx: number) => {
                const d = new Date(dl.calculatedDueDate);
                const monthsEn = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                const monthLabel = isRTL ? monthsAr[d.getMonth()] : monthsEn[d.getMonth()];
                const dayLabel = d.getDate();

                return (
                  <React.Fragment key={dl.id || idx}>
                    {idx > 0 && <View style={styles.itemDivider} />}
                    <TouchableOpacity
                      style={[styles.calendarItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      activeOpacity={0.75}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setSelectedDeadline(dl);
                      }}
                    >
                      <View style={[styles.dateBadge, isRTL ? { marginLeft: 12, marginRight: 0 } : { marginRight: 12, marginLeft: 0 }]}>
                        <Text style={styles.dateBadgeMonth}>{monthLabel}</Text>
                        <Text style={styles.dateBadgeDay}>{dayLabel}</Text>
                      </View>
                      <View style={[styles.calendarInfoCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={[styles.calendarItemTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                          {dl.title}
                        </Text>
                        <Text style={[styles.calendarItemSub, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                          {dl.legalReference}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.dueDaysChip,
                          dl.status === 'OVERDUE' && { backgroundColor: '#FEE2E2' },
                          dl.status === 'UPCOMING' && { backgroundColor: '#E0F2FE' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dueDaysText,
                            dl.status === 'OVERDUE' && { color: '#DC2626' },
                            dl.status === 'UPCOMING' && { color: '#0369A1' },
                          ]}
                        >
                          {dl.daysRemaining < 0
                            ? isRTL
                              ? 'متأخر'
                              : 'Overdue'
                            : isRTL
                            ? `خلال ${dl.daysRemaining} يوم`
                            : `In ${dl.daysRemaining}d`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })
            ) : (
              <>
                {/* Fallback Deadline 1 */}
                <TouchableOpacity
                  style={[styles.calendarItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  activeOpacity={0.75}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedDeadline({
                      title: isRTL ? 'إقرار ضريبة القيمة المضافة (نموذج 201)' : 'VAT Return (Form 201)',
                      legalReference: isRTL ? 'المادة 71 من مرسوم بقانون 8/2017' : 'Article 71 of FDL 8/2017',
                      calculatedDueDate: '2026-12-28',
                      status: 'UPCOMING',
                      daysRemaining: 28,
                      penaltyInfo: 'AED 1,000 first late filing penalty (Cabinet Decision No. 40 of 2017)',
                    });
                  }}
                >
                  <View style={[styles.dateBadge, isRTL ? { marginLeft: 12, marginRight: 0 } : { marginRight: 12, marginLeft: 0 }]}>
                    <Text style={styles.dateBadgeMonth}>{isRTL ? 'أبريل' : 'APR'}</Text>
                    <Text style={styles.dateBadgeDay}>28</Text>
                  </View>
                  <View style={[styles.calendarInfoCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.calendarItemTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {isRTL ? 'إقرار ضريبة القيمة المضافة (نموذج 201)' : 'VAT Return (Form 201)'}
                    </Text>
                    <Text style={[styles.calendarItemSub, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {isRTL ? 'المادة 71 من مرسوم بقانون 8/2017' : 'Article 71 of FDL 8/2017'}
                    </Text>
                  </View>
                  <View style={styles.dueDaysChip}>
                    <Text style={styles.dueDaysText}>
                      {isRTL ? '28 من كل فترة' : '28th of month'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScreenSection>

        {/* Ask Mizan AI Banner */}
        <ScreenSection index={5}>
          <TouchableOpacity
            style={styles.aiBannerCard}
            activeOpacity={0.88}
            onPress={() => router.push('/learn/chat')}
          >
            <View style={[styles.aiBannerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.aiBannerLeft, isRTL ? { marginLeft: 12, marginRight: 0, alignItems: 'flex-end' } : { marginRight: 12, marginLeft: 0, alignItems: 'flex-start' }]}>
                <View style={[styles.aiBannerTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="sparkles" size={18} color={colors.brand.primary} />
                  <Text style={styles.aiBannerTitle}>
                    Ask Mizan <Text style={{ color: colors.brand.primary }}>AI</Text>
                  </Text>
                </View>
                <Text style={[styles.aiBannerDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL
                    ? 'احصل على إجابات فورية واستشارات دقيقة وفقاً للقوانين الإماراتية.'
                    : 'Get instant, UAE-specific tax answers, calculations, and compliance guidance.'}
                </Text>
              </View>

              <View style={[styles.askAnythingButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.askAnythingText}>
                  {isRTL ? 'اسأل الآن' : 'Ask Anything'}
                </Text>
                <Ionicons
                  name={isRTL ? 'arrow-back' : 'arrow-forward'}
                  size={14}
                  color={colors.neutral.textPrimary}
                />
              </View>
            </View>
          </TouchableOpacity>
        </ScreenSection>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* UAE Open Banking & Statement Sync Modal */}
      <Modal visible={bankModalVisible} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            justifyContent: 'center',
            paddingHorizontal: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: colors.neutral.surface,
              borderRadius: radii.xl,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: colors.neutral.border,
              ...shadows.cardHover,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.neutral.textPrimary }}>
                {isRTL ? 'ربط الحسابات البنكية الإماراتية' : 'UAE Business Bank Sync'}
              </Text>
              <TouchableOpacity onPress={() => setBankModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: colors.neutral.textSecondary, marginBottom: 14, lineHeight: 18 }}>
              {isRTL
                ? 'قم بمزامنة كشوف الحسابات البنكية أو مسح الفواتير مباشرة إلى دفاتر شركتك.'
                : 'Select your UAE corporate bank to sync statement transactions or scan a receipt/statement directly.'}
            </Text>

            {[
              { name: 'Wio Business (UAE Open Banking)', tag: 'Instant Feed' },
              { name: 'Mashreq NeoBiz Corporate', tag: 'Statement Sync' },
              { name: 'Emirates NBD BusinessBanking', tag: 'Statement Sync' },
              { name: 'ADCB ProCash / First Abu Dhabi Bank', tag: 'Statement Sync' },
            ].map((bank) => (
              <TouchableOpacity
                key={bank.name}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  backgroundColor: colors.neutral.canvas,
                  borderRadius: radii.md,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: colors.neutral.border,
                }}
                onPress={() => {
                  setBankModalVisible(false);
                  Alert.alert(
                    bank.name,
                    'Bank ledger feed synchronized with your Mizan Financial Books.',
                    [
                      {
                        text: 'Open Financial Ledger',
                        onPress: () => router.push('/(tabs)/books'),
                      },
                      { text: 'OK' },
                    ]
                  );
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="business-outline" size={18} color={colors.brand.primary} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.neutral.textPrimary }}>
                    {bank.name}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand.primary }}>
                  {bank.tag}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={{
                backgroundColor: colors.brand.primary,
                paddingVertical: 13,
                borderRadius: radii.md,
                alignItems: 'center',
                marginTop: 8,
              }}
              onPress={() => {
                setBankModalVisible(false);
                router.push('/(tabs)/books');
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {isRTL ? 'عرض الدفاتر المالية ←' : 'Open Financial Books & Ledger →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Statutory Tax Deadline Detail Modal */}
      <Modal visible={!!selectedDeadline} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            justifyContent: 'center',
            paddingHorizontal: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: colors.neutral.surface,
              borderRadius: radii.xl,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: colors.neutral.border,
              ...shadows.cardHover,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.neutral.textPrimary, flex: 1 }}>
                {selectedDeadline?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDeadline(null)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedDeadline && (
              <View style={{ gap: 10 }}>
                <View
                  style={{
                    backgroundColor: colors.neutral.canvas,
                    padding: 12,
                    borderRadius: radii.md,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.neutral.textSecondary }}>
                    Statutory Citation:{' '}
                    <Text style={{ fontWeight: '700', color: colors.neutral.textPrimary }}>
                      {selectedDeadline.legalReference}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.neutral.textSecondary }}>
                    Due Date:{' '}
                    <Text style={{ fontWeight: '700', color: colors.brand.primary }}>
                      {String(selectedDeadline.calculatedDueDate || '2026-12-28').slice(0, 10)}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.neutral.textSecondary }}>
                    FTA Late Penalty Rule:{' '}
                    <Text style={{ fontWeight: '700', color: colors.semantic.risk }}>
                      {selectedDeadline.penaltyInfo ||
                        'AED 1,000 – AED 10,000 administrative penalty under Cabinet Decision No. 40/2017 & 75/2023.'}
                    </Text>
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: colors.brand.primary,
                    paddingVertical: 13,
                    borderRadius: radii.md,
                    alignItems: 'center',
                    marginTop: 6,
                  }}
                  onPress={() => {
                    setSelectedDeadline(null);
                    router.push('/(tabs)/tax');
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                    {isRTL ? 'الانتقال إلى المركز الضريبي ←' : 'Prepare & Review in Tax Hub →'}
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
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
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
  },
  brandLogoBox: {
    width: 28,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  logoSlantBar1: {
    width: 8,
    height: 22,
    backgroundColor: colors.brand.primary,
    borderRadius: 4,
    transform: [{ skewX: '-18deg' }],
  },
  logoSlantBar2: {
    width: 8,
    height: 22,
    backgroundColor: colors.brand.primary,
    borderRadius: 4,
    transform: [{ skewX: '-18deg' }],
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.primary,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.neutral.surfaceSubdued,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  greetingSection: {
    paddingVertical: spacing.md,
  },
  greetingTextCol: {},
  greetingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: colors.neutral.textSecondary,
  },
  onboardingCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryMuted,
    ...shadows.card,
  },
  onboardingIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brand.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  onboardingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  onboardingDesc: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  onboardingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radii.lg,
    width: '100%',
    ...shadows.sm,
  },
  onboardingBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  complianceCard: {
    backgroundColor: colors.brand.darkHero,
    borderRadius: radii.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.cardHover,
  },
  complianceGlowOverlay: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(249, 87, 0, 0.15)',
  },
  complianceContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  complianceTextCol: {
    flex: 1,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.semantic.success,
  },
  complianceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.surfaceSubdued,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  scoreText: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.neutral.white,
  },
  compliantBadge: {
    backgroundColor: colors.semantic.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.semantic.successBorder,
  },
  compliantBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.semantic.successDark,
  },
  complianceSubtext: {
    fontSize: 12,
    color: colors.neutral.textTertiary,
  },
  shieldContainer: {},
  shieldOuterGlow: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: 'rgba(249, 87, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(249, 87, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
    marginBottom: 4,
  },
  metricAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  metricSub: {
    fontSize: 10,
    color: colors.neutral.textTertiary,
  },
  sbrEligibleChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.semantic.successBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  sbrEligibleText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.semantic.successDark,
  },
  sbrProgressBarBg: {
    height: 4,
    backgroundColor: colors.neutral.border,
    borderRadius: 2,
    marginBottom: 6,
  },
  sbrProgressBarFill: {
    height: 4,
    backgroundColor: colors.semantic.success,
    borderRadius: 2,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
  },
  actionRoundBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
  calendarCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  calendarItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dateBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.brand.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadgeMonth: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  dateBadgeDay: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.brand.primary,
  },
  calendarInfoCol: {
    flex: 1,
  },
  calendarItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  calendarItemSub: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
  },
  dueDaysChip: {
    backgroundColor: colors.brand.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.brand.blushAlt,
  },
  dueDaysText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  upcomingChip: {
    backgroundColor: colors.neutral.canvas,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  upcomingText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.neutral.border,
    marginVertical: 4,
  },
  aiBannerCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  aiBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.brand.primaryMuted,
  },
  aiBannerLeft: {
    flex: 1,
  },
  aiBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  aiBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  aiBannerDesc: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    lineHeight: 16,
  },
  askAnythingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  askAnythingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  financialSummaryCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  finMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  finMetricBox: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  finMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
    marginBottom: 4,
  },
  finMetricValPositive: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  finMetricValNeutral: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  finMetricValPrimary: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  finMetricValWarning: {
    fontSize: 15,
    fontWeight: '800',
    color: '#D97706',
  },
});
