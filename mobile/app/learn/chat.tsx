// ============================================================================
// Mizan (ميزان) - Grounded AI Tax Assistant Conversational Screen
// Deterministic statutory retrieval with verified UAE law citations & RTL
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { MizanApi } from '../../src/services/api';

interface Citation {
  id: string;
  authority: string;
  officialNumber: string;
  article: string;
  title: string;
  summary: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  statutoryRationale?: string;
  actionRequired?: string;
  emaraTaxImpact?: string;
  suggestedFollowUps?: string[];
  timestamp: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const { initialQuery } = useLocalSearchParams<{ initialQuery?: string }>();
  const { t, locale, isRTL } = useLocale();
  const scrollViewRef = useRef<any>(null);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState<Array<{ id: string; prompt: string; tag: string }>>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text:
        locale === 'ar'
          ? 'مرحباً بك في مساعد ميزان الضريبي. أنا هنا لمساعدتك في فهم القوانين الضريبية الاتحادية، التحقق من أحكام القرارات الوزارية، وتحديد متطلبات منصة إمارات تاكس بدقة وبدون أي أخطاء حسابية.'
          : 'Welcome to Mizan Tax Assistant. I provide statutory guidance grounded in official UAE Federal Decree-Laws, Cabinet Decisions, and FTA guidance — with zero arithmetic hallucination.',
      statutoryRationale:
        locale === 'ar'
          ? 'المرسوم بقانون اتحادي رقم 47 لسنة 2022 ورقم 8 لسنة 2017'
          : 'Federal Decree-Law No. 47 of 2022 & No. 8 of 2017',
      suggestedFollowUps:
        locale === 'ar'
          ? [
              'هل شركتي مؤهلة لتسهيلات الأعمال الصغيرة (3 ملايين درهم)؟',
              'هل يمكن استرداد ضريبة القيمة المضافة على فنادق وسفر الموظفين وفق القرار 17؟',
              'ما هي غرامة التأخر في التسجيل لضريبة الشركات وكيف أتجنبها؟',
            ]
          : [
              'Is my business eligible for Small Business Relief (AED 3M)?',
              'Can I claim VAT back on employee hotels & travel under Decision 17?',
              'What are the Corporate Tax registration deadlines and late penalties?',
            ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Load curated quick prompt chips from backend
  useEffect(() => {
    MizanApi.getAiPrompts(locale)
      .then((prompts) => setQuickPrompts(prompts))
      .catch((_) => {
        // Fallback default prompts if offline
        setQuickPrompts([
          { id: '1', prompt: locale === 'ar' ? 'تسهيلات الأعمال الصغيرة' : 'Small Business Relief (AED 3M)', tag: 'CT' },
          { id: '2', prompt: locale === 'ar' ? 'استرداد ضريبة السفر (القرار 17)' : 'Hotel & Travel VAT (Decision 17)', tag: 'VAT' },
          { id: '3', prompt: locale === 'ar' ? 'ضيافة وعزائم العملاء' : 'Client Entertainment (Art. 53)', tag: 'Audit' },
          { id: '4', prompt: locale === 'ar' ? 'غرامة التسجيل 10,000 درهم' : 'AED 10,000 Penalty Rules', tag: 'Penalties' },
        ]);
      });
  }, [locale]);

  // If opened with an initial query from another screen
  useEffect(() => {
    if (initialQuery && initialQuery.trim().length > 0) {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  const handleSend = async (queryToSend?: string) => {
    const question = (queryToSend || inputQuery).trim();
    if (!question || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await MizanApi.askAi(question, locale);

      const assistantMsg: Message = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        citations: response.citations,
        statutoryRationale: response.statutoryRationale,
        actionRequired: response.actionRequired,
        emaraTaxImpact: response.emaraTaxImpact,
        suggestedFollowUps: response.suggestedFollowUps,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text:
          locale === 'ar'
            ? 'تعذر الاتصال بخادم المعرفة الضريبية حالياً. يرجى المحاولة مرة أخرى.'
            : 'Unable to reach the UAE Tax Statutory server right now. Please check your connection and retry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text:
          locale === 'ar'
            ? 'تم بدء محادثة جديدة. كيف يمكنني إرشادك في القوانين الضريبية لدولة الإمارات؟'
            : 'Chat cleared. How can I assist you with UAE tax statutory rules today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header Bar */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backIcon}>{isRTL ? '→' : '←'}</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.headerTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.headerTitle}>{t.learn.assistantTitle}</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>FTA</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>{t.learn.groundedInLaw}</Text>
        </View>

        <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
          <Text style={styles.clearText}>{t.learn.clearChat}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Prompt Chips */}
      <View style={styles.chipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipsScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          {quickPrompts.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.chip}
              onPress={() => handleSend(item.prompt)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipTag}>{item.tag}</Text>
              <Text style={styles.chipText} numberOfLines={1}>
                {item.prompt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Chat Messages Stream */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageScroll}
          contentContainerStyle={styles.messageContainer}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  {
                    justifyContent: isUser
                      ? isRTL ? 'flex-start' : 'flex-end'
                      : isRTL ? 'flex-end' : 'flex-start',
                  },
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.assistantBubble,
                    shadows.card,
                    { maxWidth: '88%' },
                  ]}
                >
                  {/* Assistant Header Tag */}
                  {!isUser && (
                    <View style={[styles.bubbleHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={styles.assistantAvatar}>
                        <Text style={styles.avatarIcon}>م</Text>
                      </View>
                      <Text style={styles.assistantLabel}>Mizan Tax AI</Text>
                      <View style={styles.groundedPill}>
                        <Text style={styles.groundedPillText}>Statutory UAE Law</Text>
                      </View>
                    </View>
                  )}

                  {/* Main Message Text */}
                  <Text
                    style={[
                      styles.messageText,
                      isUser ? styles.userText : styles.assistantText,
                      { textAlign: isRTL ? 'right' : 'left' },
                    ]}
                  >
                    {msg.text}
                  </Text>

                  {/* Statutory Citation Card (if present) */}
                  {msg.citations && msg.citations.length > 0 && (
                    <View style={styles.citationBox}>
                      <View style={[styles.citationHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={styles.citationIcon}>📜</Text>
                        <Text style={styles.citationHeading}>{t.learn.statutoryCitation}</Text>
                      </View>
                      {msg.citations.map((c) => (
                        <View key={c.id} style={styles.citationCard}>
                          <Text style={[styles.citationNumber, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {c.officialNumber}
                          </Text>
                          <Text style={[styles.citationArticle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {c.article}
                          </Text>
                          <Text style={[styles.citationSummary, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {c.summary}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action Required Box */}
                  {msg.actionRequired && (
                    <View style={styles.actionBox}>
                      <View style={[styles.actionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={styles.actionIcon}>⚡</Text>
                        <Text style={styles.actionHeading}>{t.learn.actionRequired}</Text>
                      </View>
                      <Text style={[styles.actionText, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {msg.actionRequired}
                      </Text>
                    </View>
                  )}

                  {/* EmaraTax Impact Box */}
                  {msg.emaraTaxImpact && (
                    <View style={styles.impactBox}>
                      <View style={[styles.impactHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={styles.impactIcon}>🏛️</Text>
                        <Text style={styles.impactHeading}>{t.learn.emaraTaxImpact}</Text>
                      </View>
                      <Text style={[styles.impactText, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {msg.emaraTaxImpact}
                      </Text>
                    </View>
                  )}

                  {/* Suggested Follow-Ups */}
                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <View style={styles.followUpContainer}>
                      <Text style={[styles.followUpTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {t.learn.suggestedQuestions}:
                      </Text>
                      {msg.suggestedFollowUps.map((q, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.followUpChip, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                          onPress={() => handleSend(q)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.followUpChipText}>{q}</Text>
                          <Text style={styles.followUpArrow}>{isRTL ? '←' : '→'}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Timestamp */}
                  <Text
                    style={[
                      styles.timestampText,
                      isUser ? styles.userTimestamp : styles.assistantTimestamp,
                      { textAlign: isRTL ? 'left' : 'right' },
                    ]}
                  >
                    {msg.timestamp}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <View style={[styles.messageRow, { justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color={colors.brand.burgundy} />
                <Text style={styles.loadingText}>
                  {locale === 'ar' ? 'جاري مراجعة القوانين والقرارات الاتحادية...' : 'Consulting official UAE Decree-Laws...'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <View style={[styles.inputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TextInput
              style={[styles.textInput, { textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={t.learn.inputPlaceholder}
              placeholderTextColor={colors.neutral.textTertiary}
              value={inputQuery}
              onChangeText={setInputQuery}
              multiline
              maxLength={300}
              onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputQuery.trim().length > 0 ? colors.brand.burgundy : colors.neutral.border,
                },
              ]}
              disabled={inputQuery.trim().length === 0 || isLoading}
              onPress={() => handleSend()}
              activeOpacity={0.8}
            >
              <Text style={styles.sendIcon}>{isRTL ? '←' : '↑'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
    backgroundColor: colors.neutral.surface,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.blushAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  headerTitleRow: {
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  verifiedBadge: {
    backgroundColor: colors.brand.cyan,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 1,
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textTertiary,
  },
  chipsContainer: {
    backgroundColor: colors.neutral.surface,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  chipsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: 6,
  },
  chipTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand.burgundy,
    backgroundColor: colors.brand.blush,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
    maxWidth: 200,
  },
  keyboardContainer: {
    flex: 1,
  },
  messageScroll: {
    flex: 1,
  },
  messageContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  messageBubble: {
    borderRadius: radii.xl,
    padding: spacing.md,
  },
  userBubble: {
    backgroundColor: colors.brand.burgundy,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderBottomLeftRadius: 4,
  },
  bubbleHeader: {
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
    gap: 6,
  },
  assistantAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    color: colors.neutral.white,
    fontSize: 10,
    fontWeight: '800',
  },
  assistantLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  groundedPill: {
    backgroundColor: 'rgba(0, 229, 255, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  groundedPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00838F',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: colors.neutral.white,
    fontWeight: '500',
  },
  assistantText: {
    color: colors.neutral.textPrimary,
    fontWeight: '400',
  },
  citationBox: {
    marginTop: spacing.md,
    backgroundColor: '#F8F9FA',
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand.cyan,
  },
  citationHeader: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  citationIcon: {
    fontSize: 13,
  },
  citationHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    textTransform: 'uppercase',
  },
  citationCard: {
    marginTop: 4,
  },
  citationNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  citationArticle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
    marginBottom: 2,
  },
  citationSummary: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    lineHeight: 16,
  },
  actionBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand.blushAlt,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.brand.blush,
  },
  actionHeader: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  actionIcon: {
    fontSize: 13,
  },
  actionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.burgundy,
    textTransform: 'uppercase',
  },
  actionText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.neutral.textPrimary,
    fontWeight: '500',
  },
  impactBox: {
    marginTop: spacing.sm,
    backgroundColor: '#E0F7FA',
    borderRadius: radii.md,
    padding: spacing.sm + 2,
  },
  impactHeader: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  impactIcon: {
    fontSize: 12,
  },
  impactHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006064',
    textTransform: 'uppercase',
  },
  impactText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#006064',
  },
  followUpContainer: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
    paddingTop: spacing.sm,
  },
  followUpTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
    marginBottom: 6,
  },
  followUpChip: {
    backgroundColor: colors.neutral.canvas,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  followUpChipText: {
    fontSize: 12,
    color: colors.brand.burgundy,
    fontWeight: '600',
    flex: 1,
  },
  followUpArrow: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.burgundy,
    marginLeft: 6,
  },
  timestampText: {
    fontSize: 9,
    marginTop: spacing.xs,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  assistantTimestamp: {
    color: colors.neutral.textTertiary,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  loadingText: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
  },
  inputRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13,
    color: colors.neutral.textPrimary,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    maxHeight: 90,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
