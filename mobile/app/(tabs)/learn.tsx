// ============================================================================
// Mizan (ميزان) - Tax Academy & Grounded AI Assistant Screen
// Personalised micro-courses, interactive statutory quizzes, and UAE tax RAG assistant
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { AppStorage } from '../../src/utils/storage';

interface AcademyCourse {
  id: string;
  tag: string;
  duration: string;
  title: string;
  desc: string;
  aiPrompt: string;
  lessons: { title: string; summary: string; citation: string }[];
  quizQuestion: string;
  quizOptions: string[];
  correctIndex: number;
  quizExplanation: string;
}

const ACADEMY_COURSES: AcademyCourse[] = [
  {
    id: 'ct-sme-101',
    tag: 'Beginner • 4 Lessons',
    duration: '15 mins',
    title: 'Corporate Tax Fundamentals for SMEs',
    desc: 'Learn how taxable income is calculated, what expenses are disallowed under Art. 32/33, and how to apply for Small Business Relief.',
    aiPrompt: 'Explain Corporate Tax fundamentals for UAE SMEs',
    lessons: [
      {
        title: '1. The 0% and 9% Tiered Structure',
        summary:
          'UAE resident businesses pay 0% Corporate Tax on taxable income up to AED 375,000, and 9% on taxable income exceeding AED 375,000.',
        citation: 'Article 3 of Federal Decree-Law No. 47 of 2022',
      },
      {
        title: '2. Small Business Relief (SBR)',
        summary:
          'Resident persons with gross revenue ≤ AED 3,000,000 in the current and all previous tax periods can elect to be treated as having zero taxable income until 31 Dec 2029.',
        citation: 'Article 21 & Ministerial Decision No. 73 of 2023',
      },
      {
        title: '3. Entertainment & Non-Deductible Expenses',
        summary:
          'Client entertainment expenses are capped at 50% deductibility, while administrative fines and penalties are 100% non-deductible.',
        citation: 'Articles 32 & 33 of Corporate Tax Law',
      },
    ],
    quizQuestion:
      'What is the maximum annual revenue threshold to elect Small Business Relief (0% Corporate Tax)?',
    quizOptions: ['AED 375,000', 'AED 1,000,000', 'AED 3,000,000', 'AED 5,000,000'],
    correctIndex: 2,
    quizExplanation:
      'Correct! Under Article 21 and Ministerial Decision No. 73 of 2023, the revenue ceiling for Small Business Relief is AED 3,000,000.',
  },
  {
    id: 'vat-201-mastery',
    tag: 'Intermediate • 3 Lessons',
    duration: '12 mins',
    title: 'Mastering UAE VAT 201 & Input Recovery',
    desc: 'Detailed breakdown of Decision No. 17 of 2026 for employee travel expenses and reverse charge mechanism rules.',
    aiPrompt: 'Explain UAE VAT 201 return and input tax recovery',
    lessons: [
      {
        title: '1. Output VAT vs Input VAT Recovery',
        summary:
          'Standard-rated supplies in the UAE carry 5% Output VAT (Box 1). Input VAT paid on business purchases (Box 9) is recoverable if supported by a valid Article 59 Tax Invoice.',
        citation: 'Articles 54 & 55 of Federal Decree-Law No. 8 of 2017',
      },
      {
        title: '2. Blocked Entertainment vs Employee Duty Travel',
        summary:
          'Free hospitality and entertainment for non-employees are blocked from VAT recovery under Article 53, whereas subsistence and hotel costs for employees on official business duty are 100% recoverable.',
        citation: 'Article 53 & FTA Public Clarification',
      },
      {
        title: '3. Filing Deadlines & Late Penalties',
        summary:
          'VAT Form 201 must be filed within 28 days after the end of the tax period. Late filing incurs an AED 1,000 penalty for the first offence.',
        citation: 'Article 71 & Cabinet Decision No. 40 of 2017',
      },
    ],
    quizQuestion:
      'Can a VAT-registered UAE business recover Input VAT on hotel accommodation for an employee travelling on official business duty?',
    quizOptions: [
      'Yes, 100% recoverable with a valid Tax Invoice',
      'No, all hotel expenses are blocked',
      'Only 50% recoverable',
    ],
    correctIndex: 0,
    quizExplanation:
      'Correct! Unlike client entertainment (which is blocked under Article 53), official employee business travel and hotel expenses are 100% recoverable when supported by a valid Tax Invoice.',
  },
];

const STORAGE_KEY_COMPLETED_COURSES = 'mizan_completed_courses';

export default function LearnScreen() {
  const router = useRouter();
  const { t, isRTL } = useLocale();

  const [completedCourseIds, setCompletedCourseIds] = useState<string[]>([]);
  const [activeCourse, setActiveCourse] = useState<AcademyCourse | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const loadCompletedCourses = useCallback(async () => {
    try {
      const raw = await AppStorage.getItem(STORAGE_KEY_COMPLETED_COURSES);
      if (raw) {
        setCompletedCourseIds(JSON.parse(raw));
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadCompletedCourses();
  }, [loadCompletedCourses]);

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

  const handleOpenCourseModal = (course: AcademyCourse) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedOption(null);
    setActiveCourse(course);
  };

  const handleCompleteCourse = async () => {
    if (!activeCourse) return;
    if (selectedOption === null) {
      Alert.alert('Quick Quiz', 'Please select an answer to the comprehension check before completing the module.');
      return;
    }
    if (selectedOption !== activeCourse.correctIndex) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Alert.alert('Try Again', 'Review the lesson notes above and select the statutory threshold.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const next = Array.from(new Set([...completedCourseIds, activeCourse.id]));
    setCompletedCourseIds(next);
    await AppStorage.setItem(STORAGE_KEY_COMPLETED_COURSES, JSON.stringify(next));
    Alert.alert('Module Completed! 🎉', activeCourse.quizExplanation);
    setActiveCourse(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.title}>Tax Academy</Text>
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
            <View style={styles.aiIconWrapper}>
              <Ionicons name="sparkles" size={20} color={colors.brand.burgundy} />
            </View>
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
              <Ionicons name="business-outline" size={20} color={colors.brand.burgundy} />
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
              <Ionicons name="airplane-outline" size={20} color={colors.brand.burgundy} />
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
              <Ionicons name="warning-outline" size={20} color={colors.semantic.risk} />
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
              <Ionicons name="document-text-outline" size={20} color={colors.brand.burgundy} />
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
          {ACADEMY_COURSES.map((course) => {
            const isCompleted = completedCourseIds.includes(course.id);
            return (
              <TouchableOpacity
                key={course.id}
                style={[
                  styles.courseCard,
                  shadows.card,
                  isCompleted && { borderColor: colors.semantic.success, borderWidth: 1.5 },
                ]}
                onPress={() => handleOpenCourseModal(course)}
                activeOpacity={0.8}
              >
                <View style={[styles.courseTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.courseTag}>{course.tag}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isCompleted && (
                      <View style={styles.completedChip}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.semantic.successDark} />
                        <Text style={styles.completedChipText}>Completed</Text>
                      </View>
                    )}
                    <Text style={styles.courseTime}>{course.duration}</Text>
                  </View>
                </View>
                <Text style={[styles.courseTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {course.title}
                </Text>
                <Text style={[styles.courseDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {course.desc}
                </Text>
                <View style={styles.courseActionRow}>
                  <Text style={styles.courseActionLink}>
                    {isCompleted ? 'Review Lessons & Quiz →' : 'Start Interactive Module →'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Interactive Micro-Course & Quiz Modal */}
      <Modal visible={!!activeCourse} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {activeCourse?.title}
              </Text>
              <TouchableOpacity onPress={() => setActiveCourse(null)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            {activeCourse && (
              <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                {activeCourse.lessons.map((lesson, idx) => (
                  <View key={idx} style={styles.lessonBox}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonSummary}>{lesson.summary}</Text>
                    <Text style={styles.lessonCitation}>📜 {lesson.citation}</Text>
                  </View>
                ))}

                {/* Interactive Quiz Section */}
                <View style={styles.quizBox}>
                  <Text style={styles.quizHeaderLabel}>Comprehension Check</Text>
                  <Text style={styles.quizQuestionText}>{activeCourse.quizQuestion}</Text>

                  {activeCourse.quizOptions.map((opt, idx) => {
                    const isSel = selectedOption === idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.quizOptionRow, isSel && styles.quizOptionActive]}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setSelectedOption(idx);
                        }}
                      >
                        <Ionicons
                          name={isSel ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSel ? colors.brand.primary : colors.neutral.textTertiary}
                        />
                        <Text
                          style={[
                            styles.quizOptionText,
                            isSel && { color: colors.brand.primary, fontWeight: '700' },
                          ]}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={handleCompleteCourse}
                  >
                    <Text style={styles.completeBtnText}>Submit Answer & Complete Module</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.askAiCourseBtn}
                    onPress={() => {
                      const q = activeCourse.aiPrompt;
                      setActiveCourse(null);
                      handleOpenAi(q);
                    }}
                  >
                    <Ionicons name="sparkles" size={16} color={colors.brand.burgundy} />
                    <Text style={styles.askAiCourseBtnText}>Ask Mizan AI About This Topic →</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
  aiIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.blushSoft,
    alignItems: 'center',
    justifyContent: 'center',
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
  completedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.semantic.successBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  completedChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.semantic.successDark,
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
  courseActionRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
  },
  courseActionLink: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand.burgundy,
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
    marginBottom: 12,
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    flex: 1,
  },
  lessonBox: {
    backgroundColor: colors.neutral.canvas,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  lessonTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  lessonSummary: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    lineHeight: 17,
    marginBottom: 6,
  },
  lessonCitation: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  quizBox: {
    backgroundColor: '#FFF8F4',
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  quizHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand.primary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  quizQuestionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 10,
    lineHeight: 18,
  },
  quizOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.neutral.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  quizOptionActive: {
    borderColor: colors.brand.primary,
    backgroundColor: '#FFF3ED',
  },
  quizOptionText: {
    fontSize: 12,
    color: colors.neutral.textPrimary,
    flex: 1,
  },
  completeBtn: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 13,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  askAiCourseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.canvas,
  },
  askAiCourseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
});
