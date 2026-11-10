// ============================================================================
// Mizan (ميزان) - My Profile & More Settings Screen
// Design Reference: screen-designs/4121.png (Screen 1: Profile & Screen 2: Business Settings)
// User profile card, multi-business management, and interactive settings groups
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { AnimatedSwitch } from '../../src/animations';
import { MizanApi } from '../../src/services/api';
import { AppStorage } from '../../src/utils/storage';
import { AppPreferences } from '../../src/utils/preferences';

type BizSettingsTab = 'Business' | 'Tax & Compliance' | 'Integrations' | 'Team';
type ActiveModalType =
  | null
  | 'account'
  | 'notifications'
  | 'security'
  | 'edit-biz-field'
  | 'invite-team'
  | 'app-preferences';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Invited';
}

const STORAGE_KEY_NOTIF_PREFS = 'mizan_notification_prefs';
const STORAGE_KEY_SECURITY_PREFS = 'mizan_security_prefs';

export default function ProfileScreen() {
  const router = useRouter();
  const { locale, toggleLocale, isRTL } = useLocale();
  const {
    businesses,
    activeBusiness,
    setActiveBusinessId,
    currentUser,
    logout,
    refreshBusinesses,
    loadUserProfile,
  } = useBusiness();

  const userInitials = currentUser?.fullName
    ? currentUser.fullName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'MZ';

  // Sub-view toggle: 'profile' | 'business-settings'
  const [viewState, setViewState] = useState<'profile' | 'business-settings'>('profile');
  const [bizTab, setBizTab] = useState<BizSettingsTab>('Business');
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Persisted Business settings toggles
  const [isPrimary, setIsPrimary] = useState(true);
  const [isMultiCurrency, setIsMultiCurrency] = useState(true);
  const [isAutoCalc, setIsAutoCalc] = useState(true);

  // Persisted Notification toggles
  const [vatDeadlineAlerts, setVatDeadlineAlerts] = useState(true);
  const [ctFilingReminders, setCtFilingReminders] = useState(true);
  const [ocrReviewAlerts, setOcrReviewAlerts] = useState(true);
  const [ftaPenaltyWarnings, setFtaPenaltyWarnings] = useState(true);

  // Persisted Security toggles
  const [biometricLock, setBiometricLock] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // App & Device Preferences (Defaults to false per requirements)
  const [hapticsEnabled, setHapticsEnabled] = useState(AppPreferences.isHapticsEnabled());
  const [shutterSoundEnabled, setShutterSoundEnabled] = useState(AppPreferences.isShutterSoundEnabled());

  // Edit Business Field Modal state
  const [editFieldKey, setEditFieldKey] = useState<string>('');
  const [editFieldLabel, setEditFieldLabel] = useState<string>('');
  const [editFieldValue, setEditFieldValue] = useState<string>('');
  const [editFieldHint, setEditFieldHint] = useState<string>('');

  // Team members list
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Tax Accountant' | 'Finance Manager' | 'Auditor'>('Tax Accountant');

  // Load persisted preferences from AppStorage
  const loadPersistedSettings = useCallback(async () => {
    try {
      // Sync app preferences cache
      setHapticsEnabled(AppPreferences.isHapticsEnabled());
      setShutterSoundEnabled(AppPreferences.isShutterSoundEnabled());

      const notifRaw = await AppStorage.getItem(STORAGE_KEY_NOTIF_PREFS);
      if (notifRaw) {
        const parsed = JSON.parse(notifRaw);
        setVatDeadlineAlerts(parsed.vatDeadlineAlerts ?? true);
        setCtFilingReminders(parsed.ctFilingReminders ?? true);
        setOcrReviewAlerts(parsed.ocrReviewAlerts ?? true);
        setFtaPenaltyWarnings(parsed.ftaPenaltyWarnings ?? true);
      }

      const secRaw = await AppStorage.getItem(STORAGE_KEY_SECURITY_PREFS);
      if (secRaw) {
        const parsed = JSON.parse(secRaw);
        setBiometricLock(parsed.biometricLock ?? false);
        setTwoFactorEnabled(parsed.twoFactorEnabled ?? true);
      }

      if (activeBusiness?.id) {
        const bizPrefsRaw = await AppStorage.getItem(`mizan_biz_prefs_${activeBusiness.id}`);
        if (bizPrefsRaw) {
          const parsed = JSON.parse(bizPrefsRaw);
          setIsPrimary(parsed.isPrimary ?? true);
          setIsMultiCurrency(parsed.isMultiCurrency ?? true);
          setIsAutoCalc(parsed.isAutoCalc ?? true);
        }

        const teamRaw = await AppStorage.getItem(`mizan_team_${activeBusiness.id}`);
        if (teamRaw) {
          setTeamMembers(JSON.parse(teamRaw));
        } else {
          setTeamMembers([]);
        }
      }
    } catch (e) {
      console.warn('Failed to load profile settings:', e);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    loadPersistedSettings();
  }, [loadPersistedSettings]);

  const updateAppPref = async (key: 'hapticsEnabled' | 'shutterSoundEnabled', val: boolean) => {
    if (key === 'hapticsEnabled') setHapticsEnabled(val);
    if (key === 'shutterSoundEnabled') setShutterSoundEnabled(val);
    await AppPreferences.update({ [key]: val });
    AppPreferences.selection();
  };

  const updateBizPref = async (key: 'isPrimary' | 'isMultiCurrency' | 'isAutoCalc', val: boolean) => {
    AppPreferences.selection();
    const next = {
      isPrimary: key === 'isPrimary' ? val : isPrimary,
      isMultiCurrency: key === 'isMultiCurrency' ? val : isMultiCurrency,
      isAutoCalc: key === 'isAutoCalc' ? val : isAutoCalc,
    };
    if (key === 'isPrimary') setIsPrimary(val);
    if (key === 'isMultiCurrency') setIsMultiCurrency(val);
    if (key === 'isAutoCalc') setIsAutoCalc(val);

    if (activeBusiness?.id) {
      await AppStorage.setItem(`mizan_biz_prefs_${activeBusiness.id}`, JSON.stringify(next));
    }
  };

  const updateNotifPref = async (
    key: 'vatDeadlineAlerts' | 'ctFilingReminders' | 'ocrReviewAlerts' | 'ftaPenaltyWarnings',
    val: boolean
  ) => {
    AppPreferences.selection();
    const next = {
      vatDeadlineAlerts: key === 'vatDeadlineAlerts' ? val : vatDeadlineAlerts,
      ctFilingReminders: key === 'ctFilingReminders' ? val : ctFilingReminders,
      ocrReviewAlerts: key === 'ocrReviewAlerts' ? val : ocrReviewAlerts,
      ftaPenaltyWarnings: key === 'ftaPenaltyWarnings' ? val : ftaPenaltyWarnings,
    };
    if (key === 'vatDeadlineAlerts') setVatDeadlineAlerts(val);
    if (key === 'ctFilingReminders') setCtFilingReminders(val);
    if (key === 'ocrReviewAlerts') setOcrReviewAlerts(val);
    if (key === 'ftaPenaltyWarnings') setFtaPenaltyWarnings(val);

    await AppStorage.setItem(STORAGE_KEY_NOTIF_PREFS, JSON.stringify(next));
  };

  const updateSecurityPref = async (key: 'biometricLock' | 'twoFactorEnabled', val: boolean) => {
    AppPreferences.selection();
    const next = {
      biometricLock: key === 'biometricLock' ? val : biometricLock,
      twoFactorEnabled: key === 'twoFactorEnabled' ? val : twoFactorEnabled,
    };
    if (key === 'biometricLock') setBiometricLock(val);
    if (key === 'twoFactorEnabled') setTwoFactorEnabled(val);

    await AppStorage.setItem(STORAGE_KEY_SECURITY_PREFS, JSON.stringify(next));
  };

  const openEditBizField = (key: string, label: string, currentVal: string, hint: string = '') => {
    if (!activeBusiness) {
      Alert.alert('No Active Business', 'Please scan or select a business entity first.');
      return;
    }
    AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);
    setEditFieldKey(key);
    setEditFieldLabel(label);
    setEditFieldValue(currentVal);
    setEditFieldHint(hint);
    setActiveModal('edit-biz-field');
  };

  const handleSaveBizField = async () => {
    if (!activeBusiness) return;
    const trimmed = editFieldValue.trim();
    if (!trimmed && editFieldKey !== 'vatTrn' && editFieldKey !== 'corporateTaxTrn') {
      Alert.alert('Validation Error', `${editFieldLabel} cannot be empty.`);
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (editFieldKey === 'businessActivity') {
        payload.businessActivities = [trimmed];
      } else {
        payload[editFieldKey] = trimmed;
      }

      await MizanApi.updateBusiness(activeBusiness.id, payload);
      await refreshBusinesses();
      AppPreferences.notification(Haptics.NotificationFeedbackType.Success);
      setActiveModal(null);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update business record.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteTeamMember = async () => {
    if (!inviteName.trim() || !inviteEmail.trim() || !inviteEmail.includes('@')) {
      Alert.alert('Invalid Details', 'Please enter a valid full name and email address.');
      return;
    }
    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      status: 'Invited',
    };
    const updated = [...teamMembers, newMember];
    setTeamMembers(updated);
    if (activeBusiness?.id) {
      await AppStorage.setItem(`mizan_team_${activeBusiness.id}`, JSON.stringify(updated));
    }
    setInviteName('');
    setInviteEmail('');
    setActiveModal(null);
    AppPreferences.notification(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Invitation Sent', `${newMember.name} (${newMember.role}) has been invited to ${activeBusiness?.legalName || 'your organisation'}.`);
  };

  const handleRemoveTeamMember = async (id: string) => {
    const updated = teamMembers.filter((m) => m.id !== id);
    setTeamMembers(updated);
    if (activeBusiness?.id) {
      await AppStorage.setItem(`mizan_team_${activeBusiness.id}`, JSON.stringify(updated));
    }
    AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {viewState === 'business-settings' ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setViewState('profile')}
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

          {viewState === 'business-settings' && (
            <Text style={styles.headerTitle}>Business Settings</Text>
          )}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setActiveModal('notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.neutral.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={toggleLocale}
            activeOpacity={0.7}
          >
            <Ionicons name="language-outline" size={20} color={colors.neutral.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================================================================== */}
        {/* VIEW 1: MY PROFILE (MAIN TAB)                                         */}
        {/* ==================================================================== */}
        {viewState === 'profile' && (
          <View style={styles.profileSection}>
            <View style={styles.pageTitleBlock}>
              <Text style={styles.pageHeading}>{isRTL ? 'ملفي الشخصي' : 'My Profile'}</Text>
              <Text style={styles.pageSub}>
                {isRTL
                  ? 'إدارة حسابك وشركاتك وتفضيلات التطبيق.'
                  : 'Manage your account, businesses, and app preferences.'}
              </Text>
            </View>

            {/* User Account Card */}
            <TouchableOpacity
              style={styles.userCard}
              activeOpacity={0.8}
              onPress={() => {
                if (!currentUser) {
                  router.push('/auth/login');
                } else {
                  setActiveModal('account');
                }
              }}
            >
              <View style={styles.avatarBig}>
                <Text style={styles.avatarBigText}>{userInitials}</Text>
                <View style={styles.avatarEditPencil}>
                  <Ionicons name="pencil" size={10} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.userInfoCol}>
                <Text style={styles.userName}>
                  {currentUser?.fullName || (isRTL ? 'مؤسس الشركة' : 'Company Founder')}
                </Text>
                <Text style={styles.userEmail}>
                  {currentUser?.email || (isRTL ? 'اضغط لتسجيل الدخول' : 'Tap to sign in')}
                </Text>
                <Text style={styles.userPhone}>
                  {currentUser?.phone || (currentUser?.organisationName ? `Org: ${currentUser.organisationName}` : '+971 UAE')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.neutral.textTertiary} />
            </TouchableOpacity>

            {/* My Businesses Section */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <Ionicons name="business-outline" size={18} color={colors.brand.primary} />
                <Text style={styles.sectionHeading}>
                  {isRTL ? `شركاتي (${businesses.length})` : `My Businesses (${businesses.length})`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addBizBtn}
                onPress={() => router.push('/scan')}
                activeOpacity={0.7}
              >
                <Text style={styles.addBizBtnText}>
                  {isRTL ? '+ إضافة شركة' : '+ Add Business'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dynamic Business List */}
            {businesses.length === 0 ? (
              <View style={[styles.businessCard, { flexDirection: 'column', alignItems: 'center', paddingVertical: 24, gap: 8 }]}>
                <Ionicons name="business-outline" size={36} color={colors.neutral.textTertiary} />
                <Text style={[styles.bizName, { fontSize: 15 }]}>
                  {isRTL ? 'لا توجد شركات مسجلة' : 'No Registered Businesses'}
                </Text>
                <Text style={[styles.bizTradeLicense, { textAlign: 'center' }]}>
                  {isRTL
                    ? 'لم يتم العثور على رخص تجارية نشطة لهذه المؤسسة.'
                    : 'No active trade licenses found for this organisation.'}
                </Text>
                <TouchableOpacity
                  style={[styles.addBizBtn, { marginTop: 8 }]}
                  onPress={() => router.push('/scan')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addBizBtnText}>
                    {isRTL ? '+ مسح الرخصة التجارية' : '+ Scan Trade License'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              businesses.map((biz) => {
                const isActive = activeBusiness?.id === biz.id;
                const isFreeZone = biz.jurisdictionType === 'FREE_ZONE' || biz.jurisdictionType === 'DESIGNATED_FREE_ZONE';
                return (
                  <TouchableOpacity
                    key={biz.id}
                    style={[
                      styles.businessCard,
                      isActive && { borderColor: colors.brand.primary, borderWidth: 1.5 },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (isActive) {
                        AppPreferences.selection();
                        setViewState('business-settings');
                      } else {
                        setActiveBusinessId(biz.id);
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.bizIconSquare,
                        isFreeZone ? { backgroundColor: '#F0F9FF' } : undefined,
                      ]}
                    >
                      <Ionicons
                        name={
                          biz.legalEntityType === 'NATURAL_PERSON'
                            ? 'person'
                            : isFreeZone
                            ? 'globe'
                            : 'business'
                        }
                        size={20}
                        color={isFreeZone ? '#0284C7' : colors.brand.primary}
                      />
                    </View>
                    <View style={styles.bizInfoCol}>
                      <View style={styles.bizNameRow}>
                        <Text style={styles.bizName} numberOfLines={1}>
                          {biz.tradeName || biz.legalName}
                        </Text>
                        {isActive && (
                          <View style={styles.primaryTag}>
                            <Text style={styles.primaryTagText}>Active</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.bizTradeLicense}>
                        License: {biz.tradeLicenseNumber} • {biz.emirate || 'Dubai'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.manageBizPill}
                      onPress={() => {
                        setActiveBusinessId(biz.id);
                        setViewState('business-settings');
                      }}
                    >
                      <Ionicons name="options-outline" size={14} color={colors.brand.primary} />
                      <Text style={styles.manageBizPillText}>
                        {isRTL ? 'إعدادات' : 'Manage'}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Settings Options Group */}
            <View style={styles.settingsGroupCard}>
              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={() => setActiveModal('account')}
              >
                <View style={styles.settingIconSquare}>
                  <Ionicons name="settings-outline" size={18} color={colors.neutral.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>
                    {isRTL ? 'إعدادات الحساب' : 'Account Settings'}
                  </Text>
                  <Text style={styles.settingDesc}>
                    {isRTL ? 'الاسم، البريد الإلكتروني، الهاتف، المؤسسة' : 'Name, email, phone, organisation'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>

              <View style={styles.itemDivider} />

              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={toggleLocale}
              >
                <View style={styles.settingIconSquare}>
                  <Ionicons name="options-outline" size={18} color={colors.neutral.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>
                    {isRTL ? 'اللغة والتفضيلات' : 'Preferences'}
                  </Text>
                  <Text style={styles.settingDesc}>
                    {locale === 'en' ? 'English (Switch to العربية)' : 'العربية (التبديل إلى English)'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>

              <View style={styles.itemDivider} />

              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={() => setActiveModal('notifications')}
              >
                <View style={styles.settingIconSquare}>
                  <Ionicons name="notifications-outline" size={18} color={colors.neutral.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>
                    {isRTL ? 'الإشعارات والتنبيهات' : 'Notifications'}
                  </Text>
                  <Text style={styles.settingDesc}>
                    {isRTL ? 'تنبيهات الضرائب، مواعيد الإقرارات، الغرامات' : 'Tax alerts, deadlines, filing updates'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>

              <View style={styles.itemDivider} />

              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={() => setActiveModal('security')}
              >
                <View style={styles.settingIconSquare}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.neutral.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>
                    {isRTL ? 'الأمان والخصوصية' : 'Security & Privacy'}
                  </Text>
                  <Text style={styles.settingDesc}>
                    {isRTL ? 'الدخول البيومتري، التشفير، حماية البيانات' : 'Biometric login, 2FA, data & privacy'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>

              <View style={styles.itemDivider} />

              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={() => setActiveModal('app-preferences')}
              >
                <View style={styles.settingIconSquare}>
                  <Ionicons name="options-outline" size={18} color={colors.neutral.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>
                    {isRTL ? 'الصوت والاهتزاز' : 'Haptics & Shutter Sound'}
                  </Text>
                  <Text style={styles.settingDesc}>
                    {isRTL ? 'التحكم في الاهتزاز التفاعلي وصوت التقاط الكاميرا' : 'Control vibration feedback and camera shutter sound'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>

              <View style={styles.itemDivider} />

              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={() => router.push('/learn/chat')}
              >
                <View style={styles.settingIconSquare}>
                  <Ionicons name="help-circle-outline" size={18} color={colors.neutral.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>
                    {isRTL ? 'المساعدة والدعم الضريبي' : 'Help & Support'}
                  </Text>
                  <Text style={styles.settingDesc}>
                    {isRTL ? 'الأسئلة الشائعة، استشارة المساعد الذكي' : 'FAQs, AI tax assistant, support'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>

              <View style={styles.itemDivider} />

              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={() => {
                  Alert.alert(
                    isRTL ? 'تسجيل الخروج' : 'Sign Out',
                    isRTL
                      ? 'هل أنت متأكد من رغبتك في تسجيل الخروج من تطبيق ميزان؟'
                      : 'Are you sure you want to sign out of Mizan?',
                    [
                      { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
                      {
                        text: isRTL ? 'تسجيل الخروج' : 'Sign Out',
                        style: 'destructive',
                        onPress: async () => {
                          await logout();
                          router.replace('/auth/login');
                        },
                      },
                    ]
                  );
                }}
              >
                <View style={[styles.settingIconSquare, { backgroundColor: colors.semantic.riskBg }]}>
                  <Ionicons name="log-out-outline" size={18} color={colors.semantic.risk} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingTitle, { color: colors.semantic.risk }]}>
                    {isRTL ? 'تسجيل الخروج' : 'Sign Out'}
                  </Text>
                  <Text style={styles.settingDesc}>
                    {isRTL ? 'إنهاء الجلسة والعودة لشاشة الدخول' : 'End active session & return to login screen'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* VIEW 2: BUSINESS SETTINGS                                             */}
        {/* ==================================================================== */}
        {viewState === 'business-settings' && (
          <View style={styles.businessSettingsSection}>
            {/* Dark Skyline Card */}
            <View style={styles.bizHeroDarkCard}>
              <View style={styles.bizHeroIconBox}>
                <Ionicons
                  name={
                    activeBusiness?.legalEntityType === 'NATURAL_PERSON'
                      ? 'person'
                      : activeBusiness?.jurisdictionType === 'FREE_ZONE'
                      ? 'globe'
                      : 'business'
                  }
                  size={24}
                  color={colors.brand.primary}
                />
              </View>
              <View style={styles.bizHeroInfoCol}>
                <View style={styles.bizHeroNameRow}>
                  <Text style={styles.bizHeroTitle}>
                    {activeBusiness?.tradeName || activeBusiness?.legalName || 'No Active Business'}
                  </Text>
                  <View style={styles.primaryTag}>
                    <Text style={styles.primaryTagText}>Active</Text>
                  </View>
                </View>
                <Text style={styles.bizHeroSubtitle}>
                  Trade License: {activeBusiness?.tradeLicenseNumber || 'N/A'} • {activeBusiness?.emirate || 'UAE'}
                </Text>
              </View>
            </View>

            {/* 4 Interactive Segment Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bizPillRow}
            >
              {(['Business', 'Tax & Compliance', 'Integrations', 'Team'] as BizSettingsTab[]).map((tab) => {
                const isSelected = bizTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.bizPill, isSelected && styles.bizPillActive]}
                    onPress={() => {
                      AppPreferences.selection();
                      setBizTab(tab);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.bizPillText, isSelected && styles.bizPillTextActive]}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* SUB-TAB 1: BUSINESS DETAILS & PREFERENCES */}
            {bizTab === 'Business' && (
              <>
                <View style={styles.detailsGroupHeader}>
                  <Ionicons name="business" size={18} color={colors.brand.primary} />
                  <Text style={styles.detailsGroupTitle}>Business Details (Tap to Edit)</Text>
                </View>

                <View style={styles.settingsGroupCard}>
                  <TouchableOpacity
                    style={styles.settingItemRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      openEditBizField(
                        'legalName',
                        'Legal Business Name',
                        activeBusiness?.legalName || '',
                        'Official name as printed on your DED / Free Zone trade license.'
                      )
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemKeyLabel}>Legal Business Name</Text>
                      <Text style={styles.itemValText}>
                        {activeBusiness?.legalName || 'Not Set'}
                      </Text>
                    </View>
                    <Ionicons name="create-outline" size={16} color={colors.brand.primary} />
                  </TouchableOpacity>
                  <View style={styles.itemDivider} />

                  <TouchableOpacity
                    style={styles.settingItemRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      openEditBizField(
                        'tradeLicenseNumber',
                        'Trade License Number',
                        activeBusiness?.tradeLicenseNumber || '',
                        'Official commercial license number issued by your licensing authority.'
                      )
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemKeyLabel}>Trade License</Text>
                      <Text style={styles.itemValText}>
                        {activeBusiness?.tradeLicenseNumber || 'Not Set'}
                      </Text>
                    </View>
                    <Ionicons name="create-outline" size={16} color={colors.brand.primary} />
                  </TouchableOpacity>
                  <View style={styles.itemDivider} />

                  <TouchableOpacity
                    style={styles.settingItemRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      openEditBizField(
                        'businessActivity',
                        'Primary Business Activity',
                        activeBusiness?.businessActivities?.[0] || 'General Commercial Activities',
                        'Main economic activity listed on your UAE trade license.'
                      )
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemKeyLabel}>Business Activity</Text>
                      <Text style={styles.itemValText}>
                        {activeBusiness?.businessActivities?.[0] || 'General Commercial Activities'}
                      </Text>
                    </View>
                    <Ionicons name="create-outline" size={16} color={colors.brand.primary} />
                  </TouchableOpacity>
                  <View style={styles.itemDivider} />

                  <TouchableOpacity
                    style={styles.settingItemRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      openEditBizField(
                        'legalEntityType',
                        'Legal Entity Type',
                        activeBusiness?.legalEntityType || 'LLC',
                        'Examples: LLC, FREE_ZONE_LLC, SOLE_ESTABLISHMENT, NATURAL_PERSON'
                      )
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemKeyLabel}>Entity Type</Text>
                      <Text style={styles.itemValText}>
                        {activeBusiness?.legalEntityType || 'LLC'}
                      </Text>
                    </View>
                    <Ionicons name="create-outline" size={16} color={colors.brand.primary} />
                  </TouchableOpacity>
                  <View style={styles.itemDivider} />

                  <TouchableOpacity
                    style={styles.settingItemRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      openEditBizField(
                        'emirate',
                        'Emirate',
                        activeBusiness?.emirate || 'Dubai',
                        'UAE Emirate where your business is registered (e.g., Dubai, Abu Dhabi, Sharjah).'
                      )
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemKeyLabel}>Emirate / Jurisdiction</Text>
                      <Text style={styles.itemValText}>
                        {activeBusiness?.emirate || 'Dubai'} ({activeBusiness?.jurisdictionType || 'MAINLAND'})
                      </Text>
                    </View>
                    <Ionicons name="create-outline" size={16} color={colors.brand.primary} />
                  </TouchableOpacity>
                  <View style={styles.itemDivider} />

                  <TouchableOpacity
                    style={styles.settingItemRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      openEditBizField(
                        'expiryDate',
                        'License Expiry Date (YYYY-MM-DD)',
                        activeBusiness?.expiryDate || '2027-05-14',
                        'Used to calculate staggered Corporate Tax registration deadlines.'
                      )
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemKeyLabel}>License Expiry</Text>
                      <Text style={styles.itemValText}>
                        {activeBusiness?.expiryDate || 'N/A'}
                      </Text>
                    </View>
                    <Ionicons name="create-outline" size={16} color={colors.brand.primary} />
                  </TouchableOpacity>
                </View>

                {/* Business Settings Toggles */}
                <View style={[styles.detailsGroupHeader, { marginTop: spacing.lg }]}>
                  <Ionicons name="settings" size={18} color={colors.brand.primary} />
                  <Text style={styles.detailsGroupTitle}>Business Settings</Text>
                </View>

                <View style={styles.settingsGroupCard}>
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleTextCol}>
                      <Text style={styles.toggleTitle}>Set as Primary Business</Text>
                      <Text style={styles.toggleDesc}>
                        Use this business as default across the app
                      </Text>
                    </View>
                    <AnimatedSwitch
                      value={isPrimary}
                      onValueChange={(v) => updateBizPref('isPrimary', v)}
                      accessibilityLabel="Set as Primary Business"
                    />
                  </View>
                  <View style={styles.itemDivider} />

                  <View style={styles.toggleRow}>
                    <View style={styles.toggleTextCol}>
                      <Text style={styles.toggleTitle}>Multi-Currency Books</Text>
                      <Text style={styles.toggleDesc}>
                        Record transactions in multiple currencies (auto-converts using CBUAE rates)
                      </Text>
                    </View>
                    <AnimatedSwitch
                      value={isMultiCurrency}
                      onValueChange={(v) => updateBizPref('isMultiCurrency', v)}
                      accessibilityLabel="Multi-Currency Books"
                    />
                  </View>
                  <View style={styles.itemDivider} />

                  <View style={styles.toggleRow}>
                    <View style={styles.toggleTextCol}>
                      <Text style={styles.toggleTitle}>Auto Tax Calculations</Text>
                      <Text style={styles.toggleDesc}>
                        Automatically calculate VAT & Corporate Tax on new ledger entries
                      </Text>
                    </View>
                    <AnimatedSwitch
                      value={isAutoCalc}
                      onValueChange={(v) => updateBizPref('isAutoCalc', v)}
                      accessibilityLabel="Auto Tax Calculations"
                    />
                  </View>
                </View>
              </>
            )}

            {/* SUB-TAB 2: TAX & COMPLIANCE */}
            {bizTab === 'Tax & Compliance' && (
              <>
                <View style={styles.detailsGroupHeader}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.brand.primary} />
                  <Text style={styles.detailsGroupTitle}>FTA Tax Registrations</Text>
                </View>

                <View style={styles.settingsGroupCard}>
                  <TouchableOpacity
                    style={styles.settingItemRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      openEditBizField(
                        'vatTrn',
                        'VAT TRN (15-Digit FTA Number)',
                        activeBusiness?.vatTrn || '',
                        '15-digit Tax Registration Number starting with 100 and ending with 003.'
                      )
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemKeyLabel}>VAT Registration Number (TRN)</Text>
                      <Text style={styles.itemValText}>
                        {activeBusiness?.vatTrn || 'Not Registered (Tap to Add)'}
                      </Text>
                    </View>
                    <Ionicons name="create-outline" size={16} color={colors.brand.primary} />
                  </TouchableOpacity>
                  <View style={styles.itemDivider} />

                  <TouchableOpacity
                    style={styles.settingItemRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      openEditBizField(
                        'corporateTaxTrn',
                        'Corporate Tax TRN',
                        activeBusiness?.corporateTaxTrn || '',
                        'Corporate Tax Registration Number issued via FTA EmaraTax.'
                      )
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemKeyLabel}>Corporate Tax TRN</Text>
                      <Text style={styles.itemValText}>
                        {activeBusiness?.corporateTaxTrn || 'Pending Registration (Tap to Add)'}
                      </Text>
                    </View>
                    <Ionicons name="create-outline" size={16} color={colors.brand.primary} />
                  </TouchableOpacity>
                  <View style={styles.itemDivider} />

                  <View style={styles.settingItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemKeyLabel}>Statutory Tax Regime</Text>
                      <Text style={styles.itemValText}>
                        {activeBusiness?.taxRegime || 'Standard UAE Corporate Tax (9%)'}
                      </Text>
                    </View>
                    <View style={styles.primaryTag}>
                      <Text style={styles.primaryTagText}>Decree-Law 47/2022</Text>
                    </View>
                  </View>
                  <View style={styles.itemDivider} />

                  <View style={styles.settingItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemKeyLabel}>Small Business Relief (Article 21)</Text>
                      <Text style={styles.itemValText}>
                        {activeBusiness?.isSbrEligible
                          ? 'Eligible (Revenue ≤ AED 3,000,000)'
                          : 'Not Applicable (Standard 9% Tier)'}
                      </Text>
                    </View>
                    <Ionicons
                      name={activeBusiness?.isSbrEligible ? 'checkmark-circle' : 'information-circle'}
                      size={18}
                      color={activeBusiness?.isSbrEligible ? colors.semantic.successDark : colors.neutral.textSecondary}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.actionFullBtn}
                  onPress={() => router.push('/(tabs)/tax')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="calculator-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionFullBtnText}>Open Live Tax Hub & Assessments →</Text>
                </TouchableOpacity>
              </>
            )}

            {/* SUB-TAB 3: INTEGRATIONS */}
            {bizTab === 'Integrations' && (
              <>
                <View style={styles.detailsGroupHeader}>
                  <Ionicons name="git-network-outline" size={18} color={colors.brand.primary} />
                  <Text style={styles.detailsGroupTitle}>Connected UAE Ecosystems</Text>
                </View>

                <View style={styles.settingsGroupCard}>
                  <TouchableOpacity
                    style={styles.settingItemRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      Alert.alert(
                        'FTA EmaraTax Ready',
                        'Mizan formats all VAT Form 201 boxes and Corporate Tax schedules directly to Federal Tax Authority EmaraTax specifications.'
                      )
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemValText}>FTA EmaraTax Return Schema</Text>
                      <Text style={styles.itemKeyLabel}>Form 201 & Corporate Tax Schedule Export</Text>
                    </View>
                    <View style={styles.primaryTag}>
                      <Text style={styles.primaryTagText}>Connected</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.itemDivider} />

                  <TouchableOpacity
                    style={styles.settingItemRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      Alert.alert(
                        'Peppol PINT AE E-Invoicing',
                        'All issued tax invoices include Article 59 mandatory fields and SHA-256 tamper-evident hashes ready for UAE Peppol PINT Access Points.'
                      )
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemValText}>UAE Peppol PINT E-Invoicing</Text>
                      <Text style={styles.itemKeyLabel}>Article 59 Compliant XML / PDF Hash</Text>
                    </View>
                    <View style={styles.primaryTag}>
                      <Text style={styles.primaryTagText}>Active</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.itemDivider} />

                  <TouchableOpacity
                    style={styles.settingItemRow}
                    activeOpacity={0.7}
                    onPress={() => router.push('/expenses/scan')}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemValText}>Gemini Vision OCR Engine</Text>
                      <Text style={styles.itemKeyLabel}>Bilingual Arabic/English Receipt & License Extraction</Text>
                    </View>
                    <View style={styles.primaryTag}>
                      <Text style={styles.primaryTagText}>Live</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* SUB-TAB 4: TEAM */}
            {bizTab === 'Team' && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleGroup}>
                    <Ionicons name="people-outline" size={18} color={colors.brand.primary} />
                    <Text style={styles.detailsGroupTitle}>
                      Authorized Team ({1 + teamMembers.length})
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addBizBtn}
                    onPress={() => setActiveModal('invite-team')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addBizBtnText}>+ Invite Member</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.settingsGroupCard}>
                  {/* Owner Row */}
                  <View style={styles.settingItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemValText}>
                        {currentUser?.fullName || 'Organisation Owner'}
                      </Text>
                      <Text style={styles.itemKeyLabel}>
                        {currentUser?.email || 'Authenticated Owner'} • Managing Partner
                      </Text>
                    </View>
                    <View style={styles.primaryTag}>
                      <Text style={styles.primaryTagText}>Owner</Text>
                    </View>
                  </View>

                  {teamMembers.map((member) => (
                    <React.Fragment key={member.id}>
                      <View style={styles.itemDivider} />
                      <View style={styles.settingItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemValText}>{member.name}</Text>
                          <Text style={styles.itemKeyLabel}>
                            {member.email} • {member.role}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveTeamMember(member.id)}
                          style={{ padding: 6 }}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.semantic.risk} />
                        </TouchableOpacity>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ==================================================================== */}
      {/* MODAL 1: ACCOUNT SETTINGS                                             */}
      {/* ==================================================================== */}
      <Modal visible={activeModal === 'account'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Account Profile</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInfoRow}>
              <Text style={styles.modalInfoLabel}>Full Name</Text>
              <Text style={styles.modalInfoValue}>{currentUser?.fullName || 'Not Signed In'}</Text>
            </View>
            <View style={styles.itemDivider} />

            <View style={styles.modalInfoRow}>
              <Text style={styles.modalInfoLabel}>Email Address</Text>
              <Text style={styles.modalInfoValue}>{currentUser?.email || 'N/A'}</Text>
            </View>
            <View style={styles.itemDivider} />

            <View style={styles.modalInfoRow}>
              <Text style={styles.modalInfoLabel}>Phone Number</Text>
              <Text style={styles.modalInfoValue}>{currentUser?.phone || '+971 UAE'}</Text>
            </View>
            <View style={styles.itemDivider} />

            <View style={styles.modalInfoRow}>
              <Text style={styles.modalInfoLabel}>Organisation</Text>
              <Text style={styles.modalInfoValue}>
                {currentUser?.organisationName || activeBusiness?.legalName || 'Primary Tenant'}
              </Text>
            </View>
            <View style={styles.itemDivider} />

            <View style={styles.modalInfoRow}>
              <Text style={styles.modalInfoLabel}>Role</Text>
              <Text style={styles.modalInfoValue}>{currentUser?.role || 'ADMIN'}</Text>
            </View>

            <TouchableOpacity
              style={[styles.actionFullBtn, { marginTop: 18 }]}
              onPress={async () => {
                setIsSaving(true);
                await loadUserProfile();
                setIsSaving(false);
                setActiveModal(null);
              }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionFullBtnText}>Sync Profile with Cloud Server</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 2: NOTIFICATIONS SETTINGS                                       */}
      {/* ==================================================================== */}
      <Modal visible={activeModal === 'notifications'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Notification Preferences</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleTitle}>VAT Form 201 Filing Deadlines</Text>
                <Text style={styles.toggleDesc}>Remind 14 and 3 days before FTA return due date</Text>
              </View>
              <AnimatedSwitch
                value={vatDeadlineAlerts}
                onValueChange={(v) => updateNotifPref('vatDeadlineAlerts', v)}
                accessibilityLabel="VAT Deadlines"
              />
            </View>
            <View style={styles.itemDivider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleTitle}>Corporate Tax Registration & Return</Text>
                <Text style={styles.toggleDesc}>Alerts for Article 21 SBR & 9-month filing window</Text>
              </View>
              <AnimatedSwitch
                value={ctFilingReminders}
                onValueChange={(v) => updateNotifPref('ctFilingReminders', v)}
                accessibilityLabel="Corporate Tax Reminders"
              />
            </View>
            <View style={styles.itemDivider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleTitle}>Unverified OCR Receipt Queue</Text>
                <Text style={styles.toggleDesc}>Notify when scanned bills require tax review</Text>
              </View>
              <AnimatedSwitch
                value={ocrReviewAlerts}
                onValueChange={(v) => updateNotifPref('ocrReviewAlerts', v)}
                accessibilityLabel="OCR Review Alerts"
              />
            </View>
            <View style={styles.itemDivider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleTitle}>FTA Penalty Risk Warnings</Text>
                <Text style={styles.toggleDesc}>Immediate alert for compliance blockers</Text>
              </View>
              <AnimatedSwitch
                value={ftaPenaltyWarnings}
                onValueChange={(v) => updateNotifPref('ftaPenaltyWarnings', v)}
                accessibilityLabel="FTA Penalty Warnings"
              />
            </View>

            <TouchableOpacity
              style={[styles.actionFullBtn, { marginTop: 16 }]}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.actionFullBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 3: SECURITY & PRIVACY                                           */}
      {/* ==================================================================== */}
      <Modal visible={activeModal === 'security'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Security & Data Privacy</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleTitle}>Biometric App Lock</Text>
                <Text style={styles.toggleDesc}>Require FaceID / Fingerprint when opening Mizan</Text>
              </View>
              <AnimatedSwitch
                value={biometricLock}
                onValueChange={(v) => updateSecurityPref('biometricLock', v)}
                accessibilityLabel="Biometric App Lock"
              />
            </View>
            <View style={styles.itemDivider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleTitle}>Enhanced Session Verification</Text>
                <Text style={styles.toggleDesc}>Strict JWT signature & tenant boundary enforcement</Text>
              </View>
              <AnimatedSwitch
                value={twoFactorEnabled}
                onValueChange={(v) => updateSecurityPref('twoFactorEnabled', v)}
                accessibilityLabel="Enhanced Session Verification"
              />
            </View>
            <View style={styles.itemDivider} />

            <View style={styles.modalInfoRow}>
              <Text style={styles.modalInfoLabel}>Password Encryption</Text>
              <Text style={styles.modalInfoValue}>Salted scrypt + TimingSafeEqual</Text>
            </View>
            <View style={styles.itemDivider} />

            <View style={styles.modalInfoRow}>
              <Text style={styles.modalInfoLabel}>FTA Record Retention</Text>
              <Text style={styles.modalInfoValue}>7-Year Statutory Archive (Art. 78)</Text>
            </View>

            <TouchableOpacity
              style={[styles.actionFullBtn, { marginTop: 16 }]}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.actionFullBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL: APP & DEVICE PREFERENCES (HAPTICS & SHUTTER SOUND)            */}
      {/* ==================================================================== */}
      <Modal visible={activeModal === 'app-preferences'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {isRTL ? 'إعدادات الصوت والاهتزاز' : 'Device & Feedback Preferences'}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleTitle}>
                  {isRTL ? 'الاهتزاز التفاعلي (Haptics)' : 'Haptic Vibration Feedback'}
                </Text>
                <Text style={styles.toggleDesc}>
                  {isRTL ? 'الاهتزاز عند النقر على الأزرار والتنبيهات (مغلق افتراضياً)' : 'Vibrate on buttons, tabs, and system alerts (Default: OFF)'}
                </Text>
              </View>
              <AnimatedSwitch
                value={hapticsEnabled}
                onValueChange={(v) => updateAppPref('hapticsEnabled', v)}
                accessibilityLabel="Haptic Vibration Feedback"
              />
            </View>
            <View style={styles.itemDivider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleTitle}>
                  {isRTL ? 'صوت التقاط الكاميرا (Shutter Sound)' : 'Camera Shutter Sound'}
                </Text>
                <Text style={styles.toggleDesc}>
                  {isRTL ? 'إصدار صوت عند التقاط صورة الفواتير أو الرخص (مغلق افتراضياً)' : 'Play sound when capturing receipts & trade licenses (Default: OFF)'}
                </Text>
              </View>
              <AnimatedSwitch
                value={shutterSoundEnabled}
                onValueChange={(v) => updateAppPref('shutterSoundEnabled', v)}
                accessibilityLabel="Camera Shutter Sound"
              />
            </View>
            <View style={styles.itemDivider} />

            <View style={styles.modalInfoRow}>
              <Text style={styles.modalInfoLabel}>Default Policy</Text>
              <Text style={styles.modalInfoValue}>Silent Operation (Both OFF by default)</Text>
            </View>

            <TouchableOpacity
              style={[styles.actionFullBtn, { marginTop: 16 }]}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.actionFullBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 4: EDIT BUSINESS FIELD                                          */}
      {/* ==================================================================== */}
      <Modal visible={activeModal === 'edit-biz-field'} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Update {editFieldLabel}</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            {editFieldHint ? <Text style={styles.modalHintText}>{editFieldHint}</Text> : null}

            <TextInput
              style={styles.modalTextInput}
              value={editFieldValue}
              onChangeText={setEditFieldValue}
              placeholder={`Enter ${editFieldLabel}`}
              placeholderTextColor={colors.neutral.textTertiary}
              autoFocus
            />

            <View style={styles.modalActionBtnsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setActiveModal(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveBizField}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Save to Cloud</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 5: INVITE TEAM MEMBER                                           */}
      {/* ==================================================================== */}
      <Modal visible={activeModal === 'invite-team'} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Invite Team Member</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHintText}>
              Grant your accountant or finance manager access to {activeBusiness?.legalName || 'this entity'}.
            </Text>

            <TextInput
              style={[styles.modalTextInput, { marginBottom: 10 }]}
              value={inviteName}
              onChangeText={setInviteName}
              placeholder="Full Name (e.g., Sara Al Mansoori)"
              placeholderTextColor={colors.neutral.textTertiary}
            />

            <TextInput
              style={[styles.modalTextInput, { marginBottom: 12 }]}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="Email Address (e.g., sara@firm.ae)"
              placeholderTextColor={colors.neutral.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              {(['Tax Accountant', 'Finance Manager', 'Auditor'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.bizPill, inviteRole === r && styles.bizPillActive]}
                  onPress={() => setInviteRole(r)}
                >
                  <Text style={[styles.bizPillText, inviteRole === r && styles.bizPillTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActionBtnsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setActiveModal(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleInviteTeamMember}>
                <Text style={styles.modalSaveText}>Send Invite</Text>
              </TouchableOpacity>
            </View>
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
    gap: 10,
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
  headerActions: {
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
  profileSection: {
    gap: 12,
  },
  pageTitleBlock: {
    marginBottom: 6,
  },
  pageHeading: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  avatarBig: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EAE6E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
  },
  avatarBigText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  avatarEditPencil: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoCol: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 11,
    color: colors.neutral.textTertiary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  addBizBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  addBizBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  bizIconSquare: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.brand.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bizInfoCol: {
    flex: 1,
  },
  bizNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  bizName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    flexShrink: 1,
  },
  primaryTag: {
    backgroundColor: colors.semantic.successBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.semantic.successDark,
  },
  bizTradeLicense: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
  },
  manageBizPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brand.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  manageBizPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  settingsGroupCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIconSquare: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.neutral.surfaceSubdued,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextCol: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 11,
    color: colors.neutral.textTertiary,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.neutral.border,
  },
  businessSettingsSection: {
    gap: 12,
  },
  bizHeroDarkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.darkHero,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.cardHover,
  },
  bizHeroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 87, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bizHeroInfoCol: {
    flex: 1,
  },
  bizHeroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bizHeroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  bizHeroSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  bizPillRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  bizPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  bizPillActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  bizPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
  },
  bizPillTextActive: {
    color: '#FFFFFF',
  },
  detailsGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  detailsGroupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  settingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  itemKeyLabel: {
    fontSize: 11,
    color: colors.neutral.textTertiary,
    marginBottom: 2,
  },
  itemValText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleTextCol: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  toggleDesc: {
    fontSize: 11,
    color: colors.neutral.textTertiary,
    lineHeight: 15,
  },
  actionFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    borderRadius: radii.lg,
    marginTop: 8,
  },
  actionFullBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
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
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  modalHintText: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  modalInfoLabel: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    fontWeight: '600',
  },
  modalInfoValue: {
    fontSize: 13,
    color: colors.neutral.textPrimary,
    fontWeight: '700',
  },
  modalTextInput: {
    backgroundColor: colors.neutral.canvas,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.neutral.textPrimary,
    marginBottom: 16,
  },
  modalActionBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
