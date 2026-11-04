// ============================================================================
// Mizan (ميزان) - Tax Academy & Grounded AI Assistant Screen
// Personalised micro-courses, quizzes, and statutory UAE tax RAG assistant
// ============================================================================

import React from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';

export default function LearnScreen() {
  const router = useRouter();
  const { t, isRTL } = useLocale();

  const handleOpenAi = (initialQuery?: string) => {
    if (initialQuery) {
      router.push({
        pathname: '/learn/chat' as any,
        params: { initialQuery },
      });
    } else {
      router.push('/learn/chat' as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.title}>{t.tabs.learn}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t.learn.badge}</Text>
          </View>
        </View>

        {/* AI Assistant Banner */}
        <TouchableOpacity
          style={[styles.aiBanner, shadows.card]}
          activeOpacity={0.88}
          onPress={() => handleOpenAi()}
        >
          <View style={[styles.aiTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.aiIcon}>✨</Text>
            <View style={styles.aiTag}>
              <Text style={styles.aiTagText}>{t.learn.groundedInLaw}</Text>
            </View>
          </View>
          <Text style={[styles.aiTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t.learn.assistantTitle}
          </Text>
          <Text style={[styles.aiDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t.learn.assistantDesc}
          </Text>
          <View style={[styles.aiPromptBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.aiPromptPlaceholder}>{t.learn.inputPlaceholder}</Text>
            <View style={styles.aiSendPill}>
              <Text style={styles.aiSendText}>{t.learn.askButton}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Question Prompts */}
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t.learn.suggestedQuestions}
        </Text>

        <View style={styles.quickPromptsGrid}>
          <TouchableOpacity
            style={[styles.quickPromptCard, shadows.card]}
            onPress={() => handleOpenAi('Is my business eligible for Small Business Relief (AED 3M)?')}
            activeOpacity={0.8}
          >
            <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.quickIcon}>🏢</Text>
              <Text style={styles.quickBadge}>Article 21</Text>
            </View>
            <Text style={[styles.quickTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              Small Business Relief (SBR)
            </Text>
            <Text style={[styles.quickDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
              0% relief for taxable persons under AED 3,000,000 gross revenue through 2029.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickPromptCard, shadows.card]}
            onPress={() => handleOpenAi('Can I claim VAT back on employee hotels and travel under Decision 17?')}
            activeOpacity={0.8}
          >
            <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.quickIcon}>✈️</Text>
              <Text style={styles.quickBadge}>Decision 17/2026</Text>
            </View>
            <Text style={[styles.quickTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              Employee Duty Travel & Hotels
            </Text>
            <Text style={[styles.quickDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
              100% input VAT recovery rules for business travel vs Article 53 blocked entertainment.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickPromptCard, shadows.card]}
            onPress={() => handleOpenAi('What are the Corporate Tax registration deadlines and AED 10,000 late penalties?')}
            activeOpacity={0.8}
          >
            <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.quickIcon}>⚠️</Text>
              <Text style={styles.quickBadge}>Decision 3/2024</Text>
            </View>
            <Text style={[styles.quickTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              Registration Fines & Deadlines
            </Text>
            <Text style={[styles.quickDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
              Staggered license month deadlines and automated AED 10,000 FTA late penalties.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickPromptCard, shadows.card]}
            onPress={() => handleOpenAi('What are the UAE mandatory E-Invoicing Peppol PINT requirements?')}
            activeOpacity={0.8}
          >
            <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.quickIcon}>📑</Text>
              <Text style={styles.quickBadge}>Peppol PINT</Text>
            </View>
            <Text style={[styles.quickTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              Federal E-Invoicing System
            </Text>
            <Text style={[styles.quickDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
              Continuous Transaction Control (CTC) model and accredited Access Point requirements.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Learning Paths */}
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t.learn.learningPaths}
        </Text>

        <View style={styles.courseList}>
          <TouchableOpacity
            style={[styles.courseCard, shadows.card]}
            onPress={() => handleOpenAi('Explain Corporate Tax fundamentals for UAE SMEs')}
            activeOpacity={0.8}
          >
            <View style={[styles.courseTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.courseTag}>Beginner • 4 Lessons</Text>
              <Text style={styles.courseTime}>15 mins</Text>
            </View>
            <Text style={[styles.courseTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              Corporate Tax Fundamentals for SMEs
            </Text>
            <Text style={[styles.courseDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
              Learn how taxable income is calculated, what expenses are disallowed under Art. 32/33, and how to apply for Small Business Relief.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.courseCard, shadows.card]}
            onPress={() => handleOpenAi('Explain UAE VAT 201 return and input tax recovery')}
            activeOpacity={0.8}
          >
            <View style={[styles.courseTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.courseTag}>Intermediate • 3 Lessons</Text>
              <Text style={styles.courseTime}>12 mins</Text>
            </View>
            <Text style={[styles.courseTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              Mastering UAE VAT 201 & Input Recovery
            </Text>
            <Text style={[styles.courseDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
              Detailed breakdown of Decision No. 17 of 2026 for employee travel expenses and reverse charge mechanism rules.
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: spacing.section,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  badge: {
    backgroundColor: colors.brand.blush,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  aiBanner: {
    backgroundColor: colors.brand.burgundy,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  aiTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  aiIcon: {
    fontSize: 24,
  },
  aiTag: {
    backgroundColor: 'rgba(0, 229, 255, 0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  aiTagText: {
    color: colors.brand.cyan,
    fontSize: 10,
    fontWeight: '700',
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.white,
    marginBottom: spacing.xs,
  },
  aiDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.brand.blushAlt,
    marginBottom: spacing.lg,
  },
  aiPromptBar: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiPromptPlaceholder: {
    color: colors.neutral.textTertiary,
    fontSize: 13,
  },
  aiSendPill: {
    backgroundColor: colors.brand.burgundy,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  aiSendText: {
    color: colors.neutral.white,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  quickPromptsGrid: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  quickPromptCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  cardHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quickIcon: {
    fontSize: 18,
  },
  quickBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand.burgundy,
    backgroundColor: colors.brand.blush,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  quickDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.neutral.textSecondary,
  },
  courseList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  courseCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  courseTop: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  courseTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  courseTime: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textTertiary,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: spacing.xs,
  },
  courseDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.neutral.textSecondary,
  },
});
