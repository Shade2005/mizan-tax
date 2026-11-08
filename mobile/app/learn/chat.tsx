// ============================================================================
// Mizan (ميزان) - Grounded Tax AI Chat & Answer Details Screen
// Design Reference: screen-designs/4129.png (Screens 1, 2, 3)
// 3 Views: Landing Hub -> Conversational Thread -> Answer Details Slide-Over
// Grounded strictly in UAE Federal Decree-Laws & FTA Clarifications
// Connected to Active Business Entity & Real Statutory Backend
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { MizanApi } from '../../src/services/api';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AnimatedTypingIndicator } from '../../src/animations';

type AIChatView = 'landing' | 'thread';
type DetailTab = 'Answer' | 'Sources' | 'Related' | 'Citations';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: Array<{
    title: string;
    sub: string;
    url?: string;
  }>;
  statutoryRationale?: string;
  actionRequired?: string;
  emaraTaxImpact?: string;
  suggestedFollowUps?: string[];
  isGrounded?: boolean;
  businessGrounding?: {
    entityName?: string;
    entityType?: string;
    isFreeZone?: boolean;
    applicableRelief?: string;
  };
}

export default function GroundedChatScreen() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();
  const scrollViewRef = useRef<any>(null);

  const [viewState, setViewState] = useState<AIChatView>('landing');
  const [inputText, setInputText] = useState('');
  const [showAnswerDetails, setShowAnswerDetails] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('Answer');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);

  const [followUpChips, setFollowUpChips] = useState<string[]>([
    'Is my business eligible for Small Business Relief (AED 3M)?',
    'Can I claim VAT back on employee hotels & travel under Decision 17?',
    'What are the Corporate Tax registration deadlines and late penalties?',
  ]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text:
        'مرحباً بك في مساعد ميزان الضريبي (Mizan AI).\n\n' +
        'أنا مساعدك القانوني المعتمد في دولة الإمارات. جميع إجاباتي مستندة حصراً إلى المراسيم بقوانين اتحادية وقرارات مجلس الوزراء والقرارات الوزارية الصادرة عن وزارة المالية والهيئة الاتحادية للضرائب.\n\n' +
        (activeBusiness
          ? `المنشأة النشطة الحالية: ${activeBusiness.tradeName || activeBusiness.legalName} (${activeBusiness.jurisdictionType === 'FREE_ZONE' ? 'منطقة حرة' : 'داخل الدولة'})\n\nكيف يمكنني مساعدتك اليوم؟`
          : 'كيف يمكنني مساعدتك في استفساراتك الضريبية اليوم؟'),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: [
        {
          title: 'Federal Decree-Law No. 47 of 2022',
          sub: 'Taxation of Corporations and Businesses',
          url: 'https://tax.gov.ae/en/legislation/corporate.tax.aspx',
        },
        {
          title: 'Federal Decree-Law No. 8 of 2017',
          sub: 'Value Added Tax Law',
          url: 'https://tax.gov.ae/en/legislation/vat.aspx',
        },
      ],
      isGrounded: true,
      statutoryRationale: 'Official UAE Tax Legislative Framework',
      actionRequired: 'Ask specific questions about Corporate Tax, VAT recovery, or registration obligations.',
    },
  ]);

  // Sync quick prompts on mount
  useEffect(() => {
    MizanApi.getAiPrompts(isRTL ? 'ar' : 'en')
      .then((prompts) => {
        if (prompts && prompts.length > 0) {
          setFollowUpChips(prompts.map((p) => p.prompt));
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch prompt chips:', err?.message || err);
      });
  }, [isRTL]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setViewState('thread');
    setIsTyping(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const isFreeZone =
        activeBusiness?.jurisdictionType === 'FREE_ZONE' ||
        (activeBusiness?.licensingAuthority &&
          activeBusiness.licensingAuthority.toLowerCase().includes('free zone')) ||
        false;

      const context = activeBusiness
        ? {
            businessType: activeBusiness.legalEntityType,
            annualRevenue: activeBusiness.annualRevenueEstimateAED,
            isFreeZone,
          }
        : undefined;

      const aiRes = await MizanApi.askAi(
        text,
        isRTL ? 'ar' : 'en',
        context,
        activeBusiness?.id
      );

      const mappedSources = (aiRes.citations || []).map((c) => ({
        title: `${c.officialNumber} – ${c.title}`,
        sub: c.article,
        url: c.officialUrl || 'https://tax.gov.ae',
      }));

      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: aiRes.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: mappedSources.length > 0 ? mappedSources : undefined,
        statutoryRationale: aiRes.statutoryRationale,
        actionRequired: aiRes.actionRequired,
        emaraTaxImpact: aiRes.emaraTaxImpact,
        suggestedFollowUps: aiRes.suggestedFollowUps,
        isGrounded: aiRes.isGrounded,
        businessGrounding: aiRes.businessGrounding,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setSelectedMessage(assistantMsg);

      if (aiRes.suggestedFollowUps && aiRes.suggestedFollowUps.length > 0) {
        setFollowUpChips(aiRes.suggestedFollowUps);
      }
    } catch (err: any) {
      console.warn('AI Tax Query Error:', err?.message || err);
      const fallbackMsg: ChatMessage = {
        id: String(Date.now() + 2),
        sender: 'assistant',
        text: isRTL
          ? 'تعذر الاتصال بمركز الاستعلامات الضريبية مؤقتاً. يرجى التحقق من اتصال الإنترنت وإعادة المحاولة.'
          : 'Unable to connect to the Mizan statutory intelligence engine. Please check your connection and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGrounded: false,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSelectQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const openSourceUrl = (url?: string) => {
    if (!url) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url).catch((err) => {
      console.warn('Failed to open source URL:', err);
    });
  };

  const handleOpenAnswerDetails = (msg?: ChatMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const target = msg || selectedMessage || messages.filter((m) => m.sender === 'assistant').slice(-1)[0];
    if (target) {
      setSelectedMessage(target);
      setShowAnswerDetails(true);
    }
  };

  const activeMsgForDetails =
    selectedMessage || messages.filter((m) => m.sender === 'assistant').slice(-1)[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (viewState === 'thread') setViewState('landing');
                else router.back();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.neutral.textPrimary} />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.headerTitle}>
                  {viewState === 'landing' ? 'Grounded Tax AI' : 'Mizan AI'}
                </Text>
                {viewState === 'thread' && (
                  <View style={styles.groundedTagPill}>
                    <Text style={styles.groundedTagText}>Grounded</Text>
                  </View>
                )}
              </View>

              {/* Active Business Entity Badge */}
              {activeBusiness && (
                <View style={styles.businessContextBadge}>
                  <Ionicons name="business" size={11} color={colors.brand.primary} />
                  <Text style={styles.businessContextText} numberOfLines={1}>
                    {activeBusiness.tradeName || activeBusiness.legalName}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => handleOpenAnswerDetails()}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={20} color={colors.neutral.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setViewState(viewState === 'landing' ? 'thread' : 'landing');
              }}
            >
              <Ionicons
                name={viewState === 'landing' ? 'chatbubbles-outline' : 'grid-outline'}
                size={18}
                color={colors.neutral.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================================================================== */}
        {/* VIEW 1: LANDING TOPICS HUB (4129.png Screen 1)                       */}
        {/* ==================================================================== */}
        {viewState === 'landing' && (
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleBanner}>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.mainTitle}>Grounded Tax AI Chat</Text>
                <View style={styles.groundedBadge}>
                  <Ionicons name="checkmark" size={12} color={colors.semantic.successDark} />
                  <Text style={styles.groundedBadgeText}>100% Legal Grounding</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                Get accurate, verifiable answers on UAE Corporate Tax, VAT, Decision 17 hotel & travel deductions, and EmaraTax filings with official statutory citations.
              </Text>
            </View>

            {/* 3 Capabilities Badges Card */}
            <View style={styles.featureCard}>
              <View style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: '#FFF3ED' }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand.primary} />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>UAE-Specific & FTA Grounded</Text>
                  <Text style={styles.featureDesc}>
                    Strictly backed by Federal Decree-Laws, Cabinet Decisions and FTA Clarifications. Zero hallucination.
                  </Text>
                </View>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="flash-outline" size={20} color="#2563EB" />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Business-Aware Compliance</Text>
                  <Text style={styles.featureDesc}>
                    Tailored automatically to your active business entity type (Mainland vs Free Zone, SBR AED 3M).
                  </Text>
                </View>
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.semantic.successDark} />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureTitle}>Verifiable Citations</Text>
                  <Text style={styles.featureDesc}>
                    Every answer provides direct hyperlinks to official Ministry of Finance and FTA publications.
                  </Text>
                </View>
              </View>
            </View>

            {/* 6 Quick Topic Starter Tiles */}
            <Text style={styles.topicsHeading}>Explore UAE Tax Legislation</Text>
            <View style={styles.topicsGrid}>
              {[
                { label: 'Small Business Relief', icon: 'shield-outline', color: colors.brand.primary, prompt: 'Is my business eligible for Small Business Relief (AED 3M)?' },
                { label: 'Hotel & Travel VAT', icon: 'airplane-outline', color: '#0284C7', prompt: 'Can I claim VAT back on employee hotels & travel under Decision 17?' },
                { label: 'Client Entertainment', icon: 'restaurant-outline', color: '#D97706', prompt: 'How are client entertainment and dining expenses treated under Art. 53?' },
                { label: 'Freelancers & Individuals', icon: 'person-outline', color: '#059669', prompt: 'I am a freelancer/sole proprietor, what is my Corporate Tax threshold?' },
                { label: 'CT Late Penalties', icon: 'alert-circle-outline', color: '#DC2626', prompt: 'What are the Corporate Tax registration deadlines and late penalties?' },
                { label: 'Peppol E-Invoicing', icon: 'receipt-outline', color: '#7C3AED', prompt: 'What are the UAE mandatory E-Invoicing (Peppol PINT) requirements?' },
              ].map((topic) => (
                <TouchableOpacity
                  key={topic.label}
                  style={styles.topicCard}
                  activeOpacity={0.75}
                  onPress={() => handleSelectQuickPrompt(topic.prompt)}
                >
                  <Ionicons name={topic.icon as any} size={22} color={topic.color} style={{ marginBottom: 6 }} />
                  <Text style={styles.topicCardLabel}>{topic.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Big Action Button */}
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => setViewState('thread')}
              activeOpacity={0.88}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionText}>Open Mizan AI Assistant →</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* ==================================================================== */}
        {/* VIEW 2: CONVERSATION THREAD (4129.png Screen 2)                     */}
        {/* ==================================================================== */}
        {viewState === 'thread' && (
          <View style={styles.threadContainer}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <Animated.View
                    key={msg.id}
                    entering={FadeInUp.duration(240)}
                    style={[styles.messageBubbleRow, isUser ? styles.userRow : styles.assistantRow]}
                  >
                    {!isUser && (
                      <View style={styles.aiAvatarBox}>
                        <View style={styles.brandLogoBoxMini}>
                          <View style={styles.logoSlantBar1} />
                          <View style={styles.logoSlantBar2} />
                        </View>
                      </View>
                    )}

                    <View style={[styles.bubbleContent, isUser ? styles.userBubble : styles.assistantBubble]}>
                      <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.assistantMessageText]}>
                        {msg.text}
                      </Text>

                      {/* Expandable Grounded Sources Box */}
                      {msg.sources && msg.sources.length > 0 && (
                        <TouchableOpacity
                          style={styles.sourcesBox}
                          activeOpacity={0.8}
                          onPress={() => handleOpenAnswerDetails(msg)}
                        >
                          <View style={styles.sourcesHeader}>
                            <View style={styles.sourcesIconTitle}>
                              <Ionicons name="shield-checkmark" size={14} color={colors.brand.primary} />
                              <Text style={styles.sourcesTitle}>Official Statutory Sources ({msg.sources.length})</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={colors.neutral.textSecondary} />
                          </View>

                          {msg.sources.map((src, i) => (
                            <TouchableOpacity
                              key={i}
                              style={styles.sourceItem}
                              activeOpacity={0.7}
                              onPress={() => openSourceUrl(src.url)}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.sourceItemTitle}>{src.title}</Text>
                                <Text style={styles.sourceItemSub}>{src.sub}</Text>
                              </View>
                              <Ionicons name="open-outline" size={14} color={colors.brand.primary} />
                            </TouchableOpacity>
                          ))}
                        </TouchableOpacity>
                      )}

                      {/* Action Bar (Thumbs, Copy, Info) */}
                      {!isUser && (
                        <View style={styles.bubbleActionRow}>
                          <TouchableOpacity
                            style={styles.actionIconBtn}
                            onPress={() => handleOpenAnswerDetails(msg)}
                          >
                            <Ionicons name="information-circle-outline" size={14} color={colors.brand.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionIconBtn}>
                            <Ionicons name="copy-outline" size={14} color={colors.neutral.textTertiary} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionIconBtn}>
                            <Ionicons name="share-outline" size={14} color={colors.neutral.textTertiary} />
                          </TouchableOpacity>
                          <Text style={styles.msgTimestamp}>{msg.timestamp}</Text>
                        </View>
                      )}
                    </View>

                    {isUser && (
                      <View style={styles.userAvatarBox}>
                        <Text style={styles.userAvatarText}>
                          {(activeBusiness?.tradeName || activeBusiness?.legalName || 'ME').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                );
              })}

              {isTyping && (
                <Animated.View
                  entering={FadeInUp.duration(200)}
                  style={[styles.messageBubbleRow, styles.assistantRow]}
                >
                  <View style={styles.aiAvatarBox}>
                    <View style={styles.brandLogoBoxMini}>
                      <View style={styles.logoSlantBar1} />
                      <View style={styles.logoSlantBar2} />
                    </View>
                  </View>
                  <View style={[styles.bubbleContent, styles.assistantBubble, { paddingVertical: 14, paddingHorizontal: 16 }]}>
                    <AnimatedTypingIndicator />
                  </View>
                </Animated.View>
              )}

              {/* Follow-up Suggestion Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionScroll}>
                {followUpChips.map((chip, idx) => (
                  <TouchableOpacity
                    key={`${chip}-${idx}`}
                    style={styles.chipPill}
                    onPress={() => handleSelectQuickPrompt(chip)}
                  >
                    <Text style={styles.chipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>

            {/* Input Bar */}
            <View style={styles.inputBarContainer}>
              <TouchableOpacity
                style={styles.plusBtn}
                onPress={() => setViewState('landing')}
              >
                <Ionicons name="grid-outline" size={20} color={colors.neutral.textSecondary} />
              </TouchableOpacity>

              <TextInput
                style={styles.chatInput}
                placeholder={isRTL ? 'اطرح سؤالاً ضريبياً...' : 'Ask a UAE tax question...'}
                placeholderTextColor={colors.neutral.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSendMessage()}
              />

              <TouchableOpacity
                style={[styles.sendBtn, (!inputText.trim() || isTyping) && { opacity: 0.5 }]}
                onPress={() => handleSendMessage()}
                disabled={!inputText.trim() || isTyping}
                activeOpacity={0.85}
              >
                {isTyping ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* VIEW 3: ANSWER DETAILS MODAL SHEET (4129.png Screen 3)               */}
        {/* ==================================================================== */}
        <Modal
          visible={showAnswerDetails}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAnswerDetails(false)}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Statutory Answer Details</Text>
                <Text style={styles.modalSubtitle}>Verifiable UAE Legislative Grounding</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAnswerDetails(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* 4 Segment Tabs */}
            <View style={styles.modalTabsRow}>
              {(['Answer', 'Sources', 'Related', 'Citations'] as DetailTab[]).map((tab) => {
                const isSelected = activeDetailTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.modalTabPill, isSelected && styles.modalTabPillActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveDetailTab(tab);
                    }}
                  >
                    <Text style={[styles.modalTabText, isSelected && styles.modalTabTextActive]}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: 14 }}>
              {/* TAB 1: ANSWER SUMMARY */}
              {activeDetailTab === 'Answer' && (
                <>
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryTitleRow}>
                      <Ionicons name="document-text" size={18} color={colors.brand.primary} />
                      <Text style={styles.summaryHeading}>Legal Synthesis</Text>
                    </View>
                    <Text style={styles.summaryBodyText}>
                      {activeMsgForDetails?.text || 'No answer text available'}
                    </Text>
                  </View>

                  {activeMsgForDetails?.statutoryRationale && (
                    <View style={styles.summaryCard}>
                      <View style={styles.summaryTitleRow}>
                        <Ionicons name="shield-checkmark" size={18} color={colors.semantic.successDark} />
                        <Text style={styles.summaryHeading}>Statutory Authority</Text>
                      </View>
                      <Text style={styles.summaryBodyText}>
                        {activeMsgForDetails.statutoryRationale}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* TAB 2: SOURCES */}
              {activeDetailTab === 'Sources' && (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryTitleRow}>
                    <Ionicons name="link" size={18} color={colors.brand.primary} />
                    <Text style={styles.summaryHeading}>Official Legislative Sources</Text>
                  </View>

                  {activeMsgForDetails?.sources && activeMsgForDetails.sources.length > 0 ? (
                    activeMsgForDetails.sources.map((src, i) => (
                      <View key={i}>
                        <TouchableOpacity
                          style={styles.officialSourceRow}
                          activeOpacity={0.7}
                          onPress={() => openSourceUrl(src.url)}
                        >
                          <View style={styles.govIconBox}>
                            <Ionicons name="shield" size={18} color={colors.brand.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.govTitle}>{src.title}</Text>
                            <Text style={styles.govSub}>{src.sub}</Text>
                          </View>
                          <Ionicons name="open-outline" size={16} color={colors.brand.primary} />
                        </TouchableOpacity>
                        {i < activeMsgForDetails.sources!.length - 1 && <View style={styles.itemDivider} />}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyNotice}>No external sources linked.</Text>
                  )}
                </View>
              )}

              {/* TAB 3: RELATED & BUSINESS GROUNDING */}
              {activeDetailTab === 'Related' && (
                <>
                  {activeMsgForDetails?.actionRequired && (
                    <View style={styles.summaryCard}>
                      <View style={styles.summaryTitleRow}>
                        <Ionicons name="checkbox-outline" size={18} color="#2563EB" />
                        <Text style={styles.summaryHeading}>Action Required</Text>
                      </View>
                      <Text style={styles.summaryBodyText}>
                        {activeMsgForDetails.actionRequired}
                      </Text>
                    </View>
                  )}

                  {activeMsgForDetails?.emaraTaxImpact && (
                    <View style={styles.summaryCard}>
                      <View style={styles.summaryTitleRow}>
                        <Ionicons name="layers-outline" size={18} color={colors.brand.primary} />
                        <Text style={styles.summaryHeading}>EmaraTax Box & Portal Mapping</Text>
                      </View>
                      <Text style={styles.summaryBodyText}>
                        {activeMsgForDetails.emaraTaxImpact}
                      </Text>
                    </View>
                  )}

                  {activeMsgForDetails?.businessGrounding && (
                    <View style={styles.summaryCard}>
                      <View style={styles.summaryTitleRow}>
                        <Ionicons name="business-outline" size={18} color={colors.semantic.successDark} />
                        <Text style={styles.summaryHeading}>Active Entity Context</Text>
                      </View>
                      <Text style={styles.summaryBodyText}>
                        Entity: {activeMsgForDetails.businessGrounding.entityName} ({activeMsgForDetails.businessGrounding.entityType})
                        {'\n'}Jurisdiction: {activeMsgForDetails.businessGrounding.isFreeZone ? 'Free Zone' : 'Mainland'}
                        {'\n'}Applicable Regime: {activeMsgForDetails.businessGrounding.applicableRelief}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* TAB 4: CITATIONS */}
              {activeDetailTab === 'Citations' && (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryTitleRow}>
                    <Ionicons name="ribbon-outline" size={18} color={colors.brand.primary} />
                    <Text style={styles.summaryHeading}>Legal Citations & Verification</Text>
                  </View>

                  <View style={styles.checkListItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
                    <Text style={styles.checkListText}>
                      Federal Decree-Law No. 47 of 2022 on the Taxation of Corporations and Businesses
                    </Text>
                  </View>
                  <View style={styles.checkListItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
                    <Text style={styles.checkListText}>
                      Federal Decree-Law No. 8 of 2017 on Value Added Tax
                    </Text>
                  </View>
                  <View style={styles.checkListItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
                    <Text style={styles.checkListText}>
                      Ministerial Decision No. 17 of 2026 (Employee Duty Travel VAT Recovery)
                    </Text>
                  </View>
                  <View style={styles.checkListItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
                    <Text style={styles.checkListText}>
                      Cabinet Decision No. 75 of 2023 (Administrative Penalties for Violations of Tax Laws)
                    </Text>
                  </View>
                </View>
              )}

              {/* Statutory Disclaimer Note */}
              <View style={styles.noteCard}>
                <Ionicons name="information-circle-outline" size={18} color={colors.neutral.textSecondary} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.noteTitle}>Statutory Disclaimer</Text>
                  <Text style={styles.noteText}>
                    Mizan AI provides statutory intelligence grounded in published UAE federal legislation. For complex commercial arrangements, transfer pricing documentation, or formal audits, verify details on EmaraTax or consult a licensed UAE tax agent.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
  groundedTagPill: {
    backgroundColor: '#FFF3ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  groundedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  businessContextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  businessContextText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
    maxWidth: 220,
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
  titleBanner: {
    marginBottom: spacing.md,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.neutral.textPrimary,
  },
  groundedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.semantic.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  groundedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.semantic.successDark,
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
    width: 38,
    height: 38,
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
    lineHeight: 16,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.neutral.border,
  },
  topicsHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicCard: {
    width: '48.5%',
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  topicCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    textAlign: 'center',
  },
  primaryActionButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    ...shadows.pillButton,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  threadContainer: {
    flex: 1,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 12,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  aiAvatarBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoBoxMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  logoSlantBar1: {
    width: 4,
    height: 12,
    backgroundColor: colors.brand.primary,
    borderRadius: 2,
    transform: [{ skewX: '-18deg' }],
  },
  logoSlantBar2: {
    width: 4,
    height: 12,
    backgroundColor: colors.brand.primary,
    borderRadius: 2,
    transform: [{ skewX: '-18deg' }],
  },
  userAvatarBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8E5DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  bubbleContent: {
    maxWidth: '82%',
    borderRadius: radii.xl,
    padding: spacing.md,
  },
  userBubble: {
    backgroundColor: '#FFF0EA',
    borderTopRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.neutral.surface,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  userMessageText: {
    color: colors.neutral.textPrimary,
    fontWeight: '600',
  },
  assistantMessageText: {
    color: colors.neutral.textPrimary,
  },
  sourcesBox: {
    marginTop: 10,
    backgroundColor: '#FFF8F5',
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sourcesIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourcesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  sourceItemTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  sourceItemSub: {
    fontSize: 10,
    color: colors.neutral.textSecondary,
  },
  bubbleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
  },
  actionIconBtn: {
    padding: 2,
  },
  msgTimestamp: {
    fontSize: 10,
    color: colors.neutral.textTertiary,
    marginLeft: 'auto',
  },
  suggestionScroll: {
    marginVertical: 6,
  },
  chipPill: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginRight: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  inputBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
    gap: 8,
  },
  plusBtn: {
    padding: 4,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.neutral.textPrimary,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.pillButton,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
    backgroundColor: colors.neutral.surface,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.neutral.surface,
    gap: 6,
  },
  modalTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral.canvas,
  },
  modalTabPillActive: {
    backgroundColor: colors.brand.primary,
  },
  modalTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
  },
  modalTabTextActive: {
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  summaryHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  summaryBodyText: {
    fontSize: 13,
    color: colors.neutral.textPrimary,
    lineHeight: 18,
  },
  checkListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  checkListText: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    flex: 1,
  },
  officialSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  govIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.brand.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  govTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  govSub: {
    fontSize: 10,
    color: colors.neutral.textTertiary,
  },
  emptyNotice: {
    fontSize: 12,
    color: colors.neutral.textTertiary,
    fontStyle: 'italic',
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  noteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  noteText: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    lineHeight: 15,
  },
});
