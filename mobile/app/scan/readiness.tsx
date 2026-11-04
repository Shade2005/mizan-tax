// ============================================================================
// Mizan (ميزان) - Screen 4: Tax Readiness Assessment
// Real-time integration with NestJS EmaraTax Readiness Engine
// ============================================================================

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { MizanApi } from '../../src/services/api';

export default function TaxReadinessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t, isRTL } = useLocale();

  const licenseNumber = (params.licenseNumber as string) || '1234567';

  // Live Query to NestJS backend EmaraTax engine
  const { data, isLoading } = useQuery({
    queryKey: ['tax-readiness', licenseNumber],
    queryFn: () => MizanApi.getTaxReadiness(licenseNumber, 1200000),
  });

  const ctBadge = data?.corporateTax.statusBadge || (isRTL ? 'خاضع على الأرجح' : 'Likely Applicable');
  const vatBadge = data?.vat.statusBadge || (isRTL ? 'التسجيل مطلوب' : 'Registration Required');
  const checklistPending = data?.complianceChecklist?.length || 3;
  const deadlineDate = data?.corporateTax.statutoryRegistrationDeadline || '31 July 2024';

  const readinessItems = [
    {
      id: 'ct',
      icon: 'shield-checkmark-outline',
      title: isRTL ? 'ضريبة الشركات (CT)' : 'Corporate Tax (CT)',
      badgeText: ctBadge,
      badgeBg: '#CCFAFF',
      badgeColor: '#007A70',
      route: '/(tabs)/tax',
    },
    {
      id: 'vat',
      icon: 'receipt-outline',
      title: isRTL ? 'ضريبة القيمة المضافة (VAT)' : 'VAT',
      badgeText: vatBadge,
      badgeBg: '#FFE4E8',
      badgeColor: '#C42B47',
      route: '/(tabs)/tax',
    },
    {
      id: 'compliance',
      icon: 'checkbox-outline',
      title: isRTL ? 'قائمة التحقق من الامتثال' : 'Compliance Checklist',
      badgeText: isRTL ? `${checklistPending} بنود معلقة` : `${checklistPending} items pending`,
      badgeBg: '#FFF0F2',
      badgeColor: '#B84A5B',
      route: '/(tabs)/profile',
    },
    {
      id: 'deadlines',
      icon: 'calendar-outline',
      title: isRTL ? 'المواعيد الهامة' : 'Key Deadlines',
      badgeText: isRTL ? `الموعد: ${deadlineDate}` : `Next: ${deadlineDate}`,
      badgeBg: colors.brand.blushSoft,
      badgeColor: colors.brand.burgundy,
      route: '/(tabs)/profile',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.screenTitle}>
          {isRTL ? 'الجاهزية الضريبية' : 'Tax Readiness'}
        </Text>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push('/scan/report')}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={22} color={colors.brand.burgundy} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {isRTL
            ? 'تقييم أولي بناءً على تفاصيل منشأتك وسجلاتها.'
            : 'Preliminary assessment based on your details and answers.'}
        </Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brand.burgundy} />
            <Text style={styles.loadingText}>
              {isRTL ? 'جارٍ احتساب الجاهزية الضريبية...' : 'Evaluating EmaraTax readiness...'}
            </Text>
          </View>
        ) : (
          <>
            {/* Hero Likely Compliant Card */}
            <View style={[styles.heroCard, shadows.card]}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={32} color={colors.neutral.white} />
              </View>
              <Text style={styles.heroTitle}>
                {isRTL ? 'ممتثل على الأرجح' : 'Likely Compliant'}
              </Text>
              <Text style={styles.heroDesc}>
                {data?.summaryMessage ||
                  (isRTL
                    ? 'تبدو منشأتك تحت النظام الضريبي المعتاد لدولة الإمارات دون وجود مخاطر فورية.'
                    : 'You appear to be under the standard UAE tax regime with no immediate risks.')}
              </Text>
            </View>

            {/* Readiness Checklist Items */}
            <View style={styles.itemsList}>
              {readinessItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemCard,
                    shadows.card,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => router.push(item.route as any)}
                >
                  <View
                    style={[
                      styles.itemLeft,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={colors.neutral.textPrimary}
                    />
                    <Text style={styles.itemTitle}>{item.title}</Text>
                  </View>

                  <View
                    style={[
                      styles.badgePill,
                      { backgroundColor: item.badgeBg },
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: item.badgeColor }]}>
                      {item.badgeText}
                    </Text>
                    <Ionicons
                      name={isRTL ? 'chevron-back' : 'chevron-forward'}
                      size={12}
                      color={item.badgeColor}
                      style={{ marginLeft: 2 }}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bottom CTA to View PDF Report */}
            <TouchableOpacity
              style={[styles.reportCtaButton, shadows.pillButton]}
              activeOpacity={0.85}
              onPress={() => router.push('/scan/report')}
            >
              <Text style={styles.reportCtaText}>
                {isRTL ? 'عرض تقرير التقييم الكامل ←' : 'View Full Assessment Report →'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
  },
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
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.neutral.textSecondary,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    paddingVertical: spacing.section * 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.burgundy,
  },
  heroCard: {
    backgroundColor: '#E6FAF8',
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 209, 193, 0.35)',
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.semantic.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginBottom: spacing.xs,
  },
  heroDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.neutral.textSecondary,
    textAlign: 'center',
  },
  itemsList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  itemCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  itemLeft: {
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  badgePill: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reportCtaButton: {
    backgroundColor: colors.brand.burgundy,
    borderRadius: radii.pill,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportCtaText: {
    color: colors.neutral.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
