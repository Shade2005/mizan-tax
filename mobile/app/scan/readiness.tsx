// ============================================================================
// Mizan (ميزان) - Tax Readiness Assessment Flow
// Design Reference: screen-designs/4124.png (Screens 1, 2, and 3)
// 3-Stage Assessment: Intro Landing -> Tax Profile Questionnaire -> Assessment Result
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
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { AnimatedRadio, AnimatedFinancialNumber, AnimatedProgressBar } from '../../src/animations';
import { MizanApi } from '../../src/services/api';

type Stage = 'intro' | 'questions' | 'result';

export default function TaxReadinessAssessmentScreen() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  const [stage, setStage] = useState<Stage>('intro');
  const [liveReadiness, setLiveReadiness] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Questionnaire responses
  const [revenueRange, setRevenueRange] = useState<string>('1 - 3 Million');
  const [jurisdiction, setJurisdiction] = useState<'Mainland (UAE)' | 'Free Zone' | 'Both'>('Mainland (UAE)');
  const [vatRegistered, setVatRegistered] = useState<'Yes' | 'No' | 'Not Sure'>('Yes');
  const [properBookkeeping, setProperBookkeeping] = useState<'Yes' | 'No' | 'Partially'>('Yes');

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStage('questions');
  };

  const handleCalculateResult = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStage('result');
    if (activeBusiness?.id) {
      try {
        setLoading(true);
        const res = await MizanApi.getDetailedTaxReadiness(activeBusiness.id);
        setLiveReadiness(res);
      } catch (err) {
        console.warn('Failed to load real tax readiness:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {stage !== 'intro' ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (stage === 'result') setStage('questions');
                else setStage('intro');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.neutral.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.brandRow}>
              <View style={styles.brandLogoBox}>
                <View style={styles.logoSlantBar1} />
                <View style={styles.logoSlantBar2} />
              </View>
              <Text style={styles.brandTitle}>Mizan ميزان</Text>
            </View>
          )}

          {stage !== 'intro' && (
            <Text style={styles.headerTitle}>
              {stage === 'questions' ? 'Tax Readiness Assessment' : 'Assessment Result'}
            </Text>
          )}
        </View>

        <View style={styles.headerRight}>
          {stage === 'result' ? (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => router.push('/scan/report')}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={20} color={colors.neutral.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => {}}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.neutral.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================================================================== */}
        {/* STAGE 1: INTRO LANDING (4124.png Screen 1)                           */}
        {/* ==================================================================== */}
        {stage === 'intro' && (
          <View style={styles.introSection}>
            <View style={styles.titleBanner}>
              <Text style={styles.mainTitle}>Tax Readiness Assessment</Text>
              <Text style={styles.subtitle}>
                A quick, AI-powered check to see if your business is ready for UAE Corporate Tax, VAT, and FTA compliance.
              </Text>
            </View>

            {/* 3 Value Proposition Cards */}
            <View style={styles.featureListCard}>
              <View style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: '#FFF3ED' }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand.primary} />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Check your compliance status</Text>
                  <Text style={styles.featureDesc}>Corporate Tax, VAT, and key obligations</Text>
                </View>
              </View>

              <View style={styles.itemDivider} />

              <View style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="layers-outline" size={20} color={colors.semantic.successDark} />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Find gaps and potential risks</Text>
                  <Text style={styles.featureDesc}>Identify missing records, filings, or eligibility issues</Text>
                </View>
              </View>

              <View style={styles.itemDivider} />

              <View style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="flash-outline" size={20} color="#D97706" />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Get a clear action plan</Text>
                  <Text style={styles.featureDesc}>Practical steps to become fully compliant</Text>
                </View>
              </View>
            </View>

            {/* 3 Metric Badges Row */}
            <View style={styles.metaBadgeRow}>
              <View style={styles.metaBadgeCard}>
                <Ionicons name="time-outline" size={20} color={colors.brand.primary} style={{ marginBottom: 4 }} />
                <Text style={styles.metaBadgeVal}>5 – 7 minutes</Text>
                <Text style={styles.metaBadgeSub}>To complete</Text>
              </View>

              <View style={styles.metaBadgeCard}>
                <Ionicons name="document-text-outline" size={20} color={colors.brand.primary} style={{ marginBottom: 4 }} />
                <Text style={styles.metaBadgeVal}>Personalised</Text>
                <Text style={styles.metaBadgeSub}>For your business</Text>
              </View>

              <View style={styles.metaBadgeCard}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.semantic.successDark} style={{ marginBottom: 4 }} />
                <Text style={styles.metaBadgeVal}>UAE Compliant</Text>
                <Text style={styles.metaBadgeSub}>Based on current laws</Text>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={handleStart}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>Start Assessment →</Text>
            </TouchableOpacity>

            {/* Powered by Mizan AI Card */}
            <View style={styles.aiFooterCard}>
              <Ionicons name="sparkles" size={20} color={colors.brand.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.aiFooterTitle}>Powered by Mizan AI</Text>
                <Text style={styles.aiFooterDesc}>
                  Analyses your business details against UAE tax laws and FTA requirements.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* STAGE 2: QUESTIONNAIRE (4124.png Screen 2)                           */}
        {/* ==================================================================== */}
        {stage === 'questions' && (
          <View style={styles.questionSection}>
            {/* Stepper (Business -> Tax Profile -> Compliance -> Review) */}
            <View style={styles.stepperContainer}>
              <View style={styles.stepperRow}>
                <View style={styles.stepCol}>
                  <View style={[styles.stepCircle, styles.stepCircleComplete]}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={styles.stepLabel}>Business</Text>
                </View>

                <View style={[styles.stepLine, styles.stepLineActive]} />

                <View style={styles.stepCol}>
                  <View style={[styles.stepCircle, styles.stepCircleActive]}>
                    <Text style={styles.stepNumActive}>2</Text>
                  </View>
                  <Text style={styles.stepLabel}>Tax Profile</Text>
                </View>

                <View style={styles.stepLine} />

                <View style={styles.stepCol}>
                  <View style={[styles.stepCircle, styles.stepCircleInactive]}>
                    <Text style={styles.stepNumInactive}>3</Text>
                  </View>
                  <Text style={styles.stepLabel}>Compliance</Text>
                </View>

                <View style={styles.stepLine} />

                <View style={styles.stepCol}>
                  <View style={[styles.stepCircle, styles.stepCircleInactive]}>
                    <Text style={styles.stepNumInactive}>4</Text>
                  </View>
                  <Text style={styles.stepLabel}>Review</Text>
                </View>
              </View>
            </View>

            <View style={styles.titleBanner}>
              <Text style={styles.mainTitle}>Tax Profile</Text>
              <Text style={styles.subtitle}>
                Help us understand your tax position to assess your readiness accurately.
              </Text>
            </View>

            {/* Q1: Annual Revenue Range */}
            <View style={styles.questionCard}>
              <View style={styles.qHeaderRow}>
                <Text style={styles.qLabel}>What is your annual revenue (AED)?</Text>
                <Ionicons name="information-circle-outline" size={16} color={colors.neutral.textSecondary} />
              </View>
              <View style={styles.revenueGrid}>
                {['≤ 1 Million', '1 - 3 Million', '3 - 10 Million', '> 10 Million'].map((range) => {
                  const isSelected = revenueRange === range;
                  return (
                    <TouchableOpacity
                      key={range}
                      style={[styles.revenuePill, isSelected && styles.revenuePillActive]}
                      onPress={() => setRevenueRange(range)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.revenuePillText, isSelected && styles.revenuePillTextActive]}>
                        {range}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={colors.brand.primary}
                          style={styles.pillCheck}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Q2: Free Zone or Mainland */}
            <View style={styles.questionCard}>
              <View style={styles.qHeaderRow}>
                <Text style={styles.qLabel}>Are you a Free Zone or Mainland business?</Text>
                <Ionicons name="information-circle-outline" size={16} color={colors.neutral.textSecondary} />
              </View>
              <View style={styles.horizontalChoices}>
                {(['Mainland (UAE)', 'Free Zone', 'Both'] as const).map((jur) => {
                  const isSelected = jurisdiction === jur;
                  return (
                    <TouchableOpacity
                      key={jur}
                      style={[styles.jurisdictionPill, isSelected && styles.jurisdictionPillActive]}
                      onPress={() => setJurisdiction(jur)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.choiceText, isSelected && styles.choiceTextActive]}>
                        {jur}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={colors.brand.primary}
                          style={styles.pillCheck}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Q3: Registered for VAT */}
            <View style={styles.questionCard}>
              <View style={styles.qHeaderRow}>
                <Text style={styles.qLabel}>Are you registered for VAT?</Text>
                <Ionicons name="information-circle-outline" size={16} color={colors.neutral.textSecondary} />
              </View>
              <View style={styles.radioRow}>
                {(['Yes', 'No', 'Not Sure'] as const).map((opt) => {
                  const isSelected = vatRegistered === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={styles.radioOption}
                      onPress={() => setVatRegistered(opt)}
                      activeOpacity={0.7}
                    >
                      <AnimatedRadio
                        selected={isSelected}
                        onSelect={() => setVatRegistered(opt)}
                        size={20}
                        accessibilityLabel={`VAT Registered ${opt}`}
                      />
                      <Text style={styles.radioLabel}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Q4: Proper Bookkeeping */}
            <View style={styles.questionCard}>
              <View style={styles.qHeaderRow}>
                <Text style={styles.qLabel}>Do you currently maintain proper bookkeeping records?</Text>
                <Ionicons name="information-circle-outline" size={16} color={colors.neutral.textSecondary} />
              </View>
              <View style={styles.radioRow}>
                {(['Yes', 'No', 'Partially'] as const).map((opt) => {
                  const isSelected = properBookkeeping === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={styles.radioOption}
                      onPress={() => setProperBookkeeping(opt)}
                      activeOpacity={0.7}
                    >
                      <AnimatedRadio
                        selected={isSelected}
                        onSelect={() => setProperBookkeeping(opt)}
                        size={20}
                        accessibilityLabel={`Proper Bookkeeping ${opt}`}
                      />
                      <Text style={styles.radioLabel}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={handleCalculateResult}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ==================================================================== */}
        {/* STAGE 3: ASSESSMENT RESULT DASHBOARD (4124.png Screen 3)             */}
        {/* ==================================================================== */}
        {stage === 'result' && (
          <View style={styles.resultSection}>
            {/* Score Hero Dark Card */}
            <View style={styles.scoreDarkCard}>
              <View style={styles.scoreHeaderRow}>
                <View style={styles.scoreCol}>
                  <Text style={styles.scoreSubTitle}>Your Tax Readiness Score</Text>
                  <AnimatedFinancialNumber
                    value={liveReadiness?.overallScore ?? 82}
                    suffix="%"
                    decimals={0}
                    textStyle={styles.scoreBigNum}
                  />
                  <View style={styles.scorePill}>
                    <Ionicons
                      name={liveReadiness?.isAuditReady ? 'checkmark-circle' : 'alert-circle'}
                      size={14}
                      color={liveReadiness?.isAuditReady ? colors.semantic.successDark : '#D97706'}
                    />
                    <Text style={styles.scorePillText}>
                      {liveReadiness?.isAuditReady
                        ? isRTL
                          ? 'جاهز للتدقيق الضريبي'
                          : 'Audit Ready (Grade ' + (liveReadiness?.healthGrade || 'A') + ')'
                        : isRTL
                        ? 'إجراءات مطلوبة'
                        : 'Action Required (Grade ' + (liveReadiness?.healthGrade || 'B') + ')'}
                    </Text>
                  </View>
                </View>

                {/* Donut progress visual */}
                <View style={styles.donutGaugeBox}>
                  <View style={styles.donutGaugeCircle}>
                    <AnimatedFinancialNumber
                      value={liveReadiness?.overallScore ?? 82}
                      suffix="%"
                      decimals={0}
                      textStyle={styles.donutCenterText}
                    />
                  </View>
                </View>
              </View>
              <View style={{ marginVertical: 12 }}>
                <AnimatedProgressBar
                  progress={liveReadiness?.overallScore ?? 82}
                  height={6}
                  trackColor="rgba(255, 255, 255, 0.15)"
                  barColor={colors.brand.primary}
                />
              </View>
              <Text style={styles.scoreFootnote}>
                {liveReadiness?.disclaimer ||
                  "You're largely on track, with a few areas that need attention to be fully compliant."}
              </Text>
            </View>

            {/* 4 Status Chips Row */}
            <View style={styles.statusChipsRow}>
              <View style={styles.statusChipCard}>
                <Ionicons
                  name={
                    liveReadiness?.categories?.find((c: any) => c.category === 'CORPORATE_TAX')?.score >= 80
                      ? 'checkmark-circle'
                      : 'alert-circle'
                  }
                  size={16}
                  color={
                    liveReadiness?.categories?.find((c: any) => c.category === 'CORPORATE_TAX')?.score >= 80
                      ? colors.semantic.success
                      : colors.semantic.warning
                  }
                />
                <Text style={styles.statusChipTitle}>Corporate Tax</Text>
                <Text
                  style={[
                    styles.statusChipVal,
                    {
                      color:
                        liveReadiness?.categories?.find((c: any) => c.category === 'CORPORATE_TAX')?.score >= 80
                          ? colors.semantic.successDark
                          : '#D97706',
                    },
                  ]}
                >
                  {liveReadiness?.categories?.find((c: any) => c.category === 'CORPORATE_TAX')?.score >= 80
                    ? 'Ready'
                    : 'Action Needed'}
                </Text>
              </View>

              <View style={styles.statusChipCard}>
                <Ionicons
                  name={
                    liveReadiness?.categories?.find((c: any) => c.category === 'VAT')?.score >= 80
                      ? 'checkmark-circle'
                      : 'alert-circle'
                  }
                  size={16}
                  color={
                    liveReadiness?.categories?.find((c: any) => c.category === 'VAT')?.score >= 80
                      ? colors.semantic.success
                      : colors.semantic.warning
                  }
                />
                <Text style={styles.statusChipTitle}>VAT (201)</Text>
                <Text
                  style={[
                    styles.statusChipVal,
                    {
                      color:
                        liveReadiness?.categories?.find((c: any) => c.category === 'VAT')?.score >= 80
                          ? colors.semantic.successDark
                          : '#D97706',
                    },
                  ]}
                >
                  {liveReadiness?.categories?.find((c: any) => c.category === 'VAT')?.score >= 80
                    ? 'Ready'
                    : 'Action Needed'}
                </Text>
              </View>

              <View style={styles.statusChipCard}>
                <Ionicons
                  name={
                    liveReadiness?.categories?.find((c: any) => c.category === 'BOOKKEEPING')?.score >= 70
                      ? 'checkmark-circle'
                      : 'alert-circle'
                  }
                  size={16}
                  color={
                    liveReadiness?.categories?.find((c: any) => c.category === 'BOOKKEEPING')?.score >= 70
                      ? colors.semantic.success
                      : colors.semantic.warning
                  }
                />
                <Text style={styles.statusChipTitle}>Bookkeeping</Text>
                <Text
                  style={[
                    styles.statusChipVal,
                    {
                      color:
                        liveReadiness?.categories?.find((c: any) => c.category === 'BOOKKEEPING')?.score >= 70
                          ? colors.semantic.successDark
                          : '#D97706',
                    },
                  ]}
                >
                  {liveReadiness?.categories?.find((c: any) => c.category === 'BOOKKEEPING')?.score >= 70
                    ? 'Audited'
                    : 'In Review'}
                </Text>
              </View>

              <View style={styles.statusChipCard}>
                <Ionicons
                  name={
                    liveReadiness?.criticalBlockers?.length === 0
                      ? 'checkmark-circle'
                      : 'alert-circle'
                  }
                  size={16}
                  color={
                    liveReadiness?.criticalBlockers?.length === 0
                      ? colors.semantic.success
                      : colors.semantic.warning
                  }
                />
                <Text style={styles.statusChipTitle}>Compliance</Text>
                <Text
                  style={[
                    styles.statusChipVal,
                    {
                      color:
                        liveReadiness?.criticalBlockers?.length === 0
                          ? colors.semantic.successDark
                          : '#D97706',
                    },
                  ]}
                >
                  {liveReadiness?.criticalBlockers?.length === 0 ? 'Compliant' : 'Blocker'}
                </Text>
              </View>
            </View>

            {/* Key Findings Card */}
            <View style={styles.findingsGroupCard}>
              <View style={styles.findingsHeaderRow}>
                <Ionicons name="list" size={18} color={colors.brand.primary} />
                <Text style={styles.findingsHeading}>Key Findings</Text>
              </View>

              {/* Finding 1 */}
              <TouchableOpacity
                style={styles.findingRow}
                activeOpacity={0.7}
                onPress={() => router.push('/scan/report')}
              >
                <View style={[styles.findingIconSquare, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="warning-outline" size={18} color="#D97706" />
                </View>
                <View style={styles.findingTextCol}>
                  <Text style={styles.findingTitle}>VAT Return Filing</Text>
                  <Text style={styles.findingDesc}>Your last VAT return is not recorded in Mizan.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>
              <View style={styles.itemDivider} />

              {/* Finding 2 */}
              <TouchableOpacity
                style={styles.findingRow}
                activeOpacity={0.7}
                onPress={() => router.push('/scan/report')}
              >
                <View style={[styles.findingIconSquare, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="warning-outline" size={18} color="#D97706" />
                </View>
                <View style={styles.findingTextCol}>
                  <Text style={styles.findingTitle}>Missing Expense Records</Text>
                  <Text style={styles.findingDesc}>Some high-value expenses are not supported with valid documents.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>
              <View style={styles.itemDivider} />

              {/* Finding 3 */}
              <View style={styles.findingRow}>
                <View style={[styles.findingIconSquare, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="checkmark" size={18} color={colors.semantic.successDark} />
                </View>
                <View style={styles.findingTextCol}>
                  <Text style={styles.findingTitle}>Corporate Tax</Text>
                  <Text style={styles.findingDesc}>Based on your inputs, you are within compliance.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </View>
              <View style={styles.itemDivider} />

              {/* Finding 4 */}
              <View style={styles.findingRow}>
                <View style={[styles.findingIconSquare, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="checkmark" size={18} color={colors.semantic.successDark} />
                </View>
                <View style={styles.findingTextCol}>
                  <Text style={styles.findingTitle}>Small Business Relief (SBR)</Text>
                  <Text style={styles.findingDesc}>You are eligible for SBR for the current tax period.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </View>
            </View>

            {/* Recommended Next Steps Card */}
            <TouchableOpacity
              style={styles.nextStepsCard}
              activeOpacity={0.8}
              onPress={() => router.push('/scan/report')}
            >
              <View style={styles.targetIconBox}>
                <Ionicons name="locate-outline" size={20} color={colors.brand.primary} />
              </View>
              <View style={styles.nextStepsCol}>
                <Text style={styles.nextStepsTitle}>Recommended Next Steps</Text>
                <Text style={styles.nextStepsSub}>Take these actions to reach 100% tax readiness.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.neutral.textTertiary} />
            </TouchableOpacity>

            {/* View Full Report Button */}
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => router.push('/scan/report')}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>View Full Audit Report →</Text>
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
  headerRight: {
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
  featureListCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
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
    marginTop: 4,
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
    fontSize: 12,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  metaBadgeSub: {
    fontSize: 10,
    color: colors.neutral.textTertiary,
    textAlign: 'center',
  },
  primaryActionButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
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
  questionSection: {
    gap: 12,
  },
  stepperContainer: {
    paddingVertical: spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCol: {
    alignItems: 'center',
    minWidth: 50,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleComplete: {
    backgroundColor: colors.brand.primary,
  },
  stepCircleActive: {
    backgroundColor: colors.brand.primary,
  },
  stepCircleInactive: {
    backgroundColor: colors.neutral.surface,
    borderWidth: 1.5,
    borderColor: colors.neutral.border,
  },
  stepNumActive: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stepNumInactive: {
    color: colors.neutral.textTertiary,
    fontSize: 11,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 10,
    color: colors.neutral.textSecondary,
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.neutral.border,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.brand.primary,
  },
  questionCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  qHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  qLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  revenueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  revenuePill: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.md,
    backgroundColor: colors.neutral.canvas,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  revenuePillActive: {
    borderColor: colors.brand.primary,
    backgroundColor: '#FFF3ED',
  },
  revenuePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  revenuePillTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  pillCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  horizontalChoices: {
    flexDirection: 'row',
    gap: 8,
  },
  jurisdictionPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.neutral.canvas,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    alignItems: 'center',
    position: 'relative',
  },
  jurisdictionPillActive: {
    borderColor: colors.brand.primary,
    backgroundColor: '#FFF3ED',
  },
  choiceText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  choiceTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.neutral.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.brand.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand.primary,
  },
  radioLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  resultSection: {
    gap: 12,
  },
  scoreDarkCard: {
    backgroundColor: colors.brand.darkHero,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.cardHover,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  scoreCol: {
    flex: 1,
  },
  scoreSubTitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  scoreBigNum: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  scorePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.semantic.successDark,
  },
  donutGaugeBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 6,
    borderColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutGaugeCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#242528',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scoreFootnote: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusChipCard: {
    flex: 1,
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  statusChipTitle: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
    marginTop: 4,
    marginBottom: 2,
    textAlign: 'center',
  },
  statusChipVal: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  findingsGroupCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  findingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  findingsHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  findingIconSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  findingTextCol: {
    flex: 1,
  },
  findingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  findingDesc: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
  },
  nextStepsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  targetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nextStepsCol: {
    flex: 1,
  },
  nextStepsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  nextStepsSub: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
  },
});
