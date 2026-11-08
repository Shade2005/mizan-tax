// ============================================================================
// Mizan (ميزان) - My Profile & More Settings Screen
// Design Reference: screen-designs/4121.png (Screen 1: Profile & Screen 2: Business Settings)
// User profile card, multi-business management, and settings groups
// ============================================================================

import React, { useState } from 'react';
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
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { AnimatedSwitch } from '../../src/animations';

export default function ProfileScreen() {
  const router = useRouter();
  const { locale, toggleLocale, isRTL } = useLocale();
  const {
    businesses,
    activeBusiness,
    setActiveBusinessId,
    currentUser,
    logout,
    currentUserKey,
    switchTenantUser,
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

  // Business settings toggles
  const [isPrimary, setIsPrimary] = useState(true);
  const [isMultiCurrency, setIsMultiCurrency] = useState(true);
  const [isAutoCalc, setIsAutoCalc] = useState(true);

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
            onPress={() => router.push('/scan/readiness')}
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
              <Text style={styles.pageHeading}>My Profile</Text>
              <Text style={styles.pageSub}>
                Manage your account, businesses, and app preferences.
              </Text>
            </View>

            {/* User Account Card */}
            <TouchableOpacity
              style={styles.userCard}
              activeOpacity={0.8}
              onPress={() => {
                if (!currentUser) router.push('/auth/login');
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
                <Text style={styles.sectionHeading}>My Businesses ({businesses.length})</Text>
              </View>
              <TouchableOpacity
                style={styles.addBizBtn}
                onPress={() => router.push('/scan')}
                activeOpacity={0.7}
              >
                <Text style={styles.addBizBtnText}>+ Add Business</Text>
              </TouchableOpacity>
            </View>

            {/* Dynamic Business List */}
            {businesses.length === 0 ? (
              <View style={[styles.businessCard, { flexDirection: 'column', alignItems: 'center', paddingVertical: 24, gap: 8 }]}>
                <Ionicons name="business-outline" size={36} color={colors.neutral.textTertiary} />
                <Text style={[styles.bizName, { fontSize: 15 }]}>No Registered Businesses</Text>
                <Text style={[styles.bizTradeLicense, { textAlign: 'center' }]}>
                  No active trade licenses found for this organisation.
                </Text>
                <TouchableOpacity
                  style={[styles.addBizBtn, { marginTop: 8 }]}
                  onPress={() => router.push('/scan')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addBizBtnText}>+ Scan Trade License</Text>
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
                    onPress={() => setActiveBusinessId(biz.id)}
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
                        <Text style={styles.bizName}>{biz.tradeName || biz.legalName}</Text>
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
                    {isActive ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.brand.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.neutral.textTertiary} />
                    )}
                  </TouchableOpacity>
                );
              })
            )}

            {/* Settings Options Group */}
            <View style={styles.settingsGroupCard}>
              <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
                <View style={styles.settingIconSquare}>
                  <Ionicons name="settings-outline" size={18} color={colors.neutral.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Account Settings</Text>
                  <Text style={styles.settingDesc}>Name, email, phone, password</Text>
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
                  <Text style={styles.settingTitle}>Preferences</Text>
                  <Text style={styles.settingDesc}>
                    {locale === 'en' ? 'English (Switch to العربية)' : 'العربية (التبديل إلى English)'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>

              <View style={styles.itemDivider} />

              <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
                <View style={styles.settingIconSquare}>
                  <Ionicons name="notifications-outline" size={18} color={colors.neutral.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Notifications</Text>
                  <Text style={styles.settingDesc}>Tax alerts, deadlines, filing updates</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>

              <View style={styles.itemDivider} />

              <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
                <View style={styles.settingIconSquare}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.neutral.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Security & Privacy</Text>
                  <Text style={styles.settingDesc}>Biometric login, 2FA, data & privacy</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>

              <View style={styles.itemDivider} />

              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={() => {
                  const next = currentUserKey === 'user-a' ? 'user-b' : 'user-a';
                  switchTenantUser(next);
                }}
              >
                <View style={[styles.settingIconSquare, { backgroundColor: colors.brand.primaryMuted }]}>
                  <Ionicons name="swap-horizontal" size={18} color={colors.brand.primary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Tenant Boundary (Sandbox)</Text>
                  <Text style={styles.settingDesc}>
                    {currentUserKey === 'user-a'
                      ? 'User A (Hamza / FlexFlow Marketing)'
                      : 'User B (Tariq / Desert Cloud FZE)'} • Tap to switch
                  </Text>
                </View>
                <Ionicons name="repeat" size={16} color={colors.brand.primary} />
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
                  <Text style={styles.settingTitle}>Help & Support</Text>
                  <Text style={styles.settingDesc}>FAQs, contact support, share feedback</Text>
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

            {/* 4 Segment Pills */}
            <View style={styles.bizPillRow}>
              <View style={[styles.bizPill, styles.bizPillActive]}>
                <Text style={[styles.bizPillText, styles.bizPillTextActive]}>Business</Text>
              </View>
              <View style={styles.bizPill}>
                <Text style={styles.bizPillText}>Tax & Compliance</Text>
              </View>
              <View style={styles.bizPill}>
                <Text style={styles.bizPillText}>Integrations</Text>
              </View>
              <View style={styles.bizPill}>
                <Text style={styles.bizPillText}>Team</Text>
              </View>
            </View>

            {/* Business Details Group */}
            <View style={styles.detailsGroupHeader}>
              <Ionicons name="business" size={18} color={colors.brand.primary} />
              <Text style={styles.detailsGroupTitle}>Business Details</Text>
            </View>

            <View style={styles.settingsGroupCard}>
              <TouchableOpacity style={styles.settingItemRow} activeOpacity={0.7}>
                <View>
                  <Text style={styles.itemKeyLabel}>Legal Business Name</Text>
                  <Text style={styles.itemValText}>
                    {activeBusiness?.legalName || 'Not Set'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>
              <View style={styles.itemDivider} />

              <TouchableOpacity style={styles.settingItemRow} activeOpacity={0.7}>
                <View>
                  <Text style={styles.itemKeyLabel}>Trade License</Text>
                  <Text style={styles.itemValText}>
                    {activeBusiness?.tradeLicenseNumber || 'Not Set'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>
              <View style={styles.itemDivider} />

              <TouchableOpacity style={styles.settingItemRow} activeOpacity={0.7}>
                <View>
                  <Text style={styles.itemKeyLabel}>Business Activity</Text>
                  <Text style={styles.itemValText}>
                    {activeBusiness?.businessActivities?.[0] || 'General Commercial Activities'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>
              <View style={styles.itemDivider} />

              <TouchableOpacity style={styles.settingItemRow} activeOpacity={0.7}>
                <View>
                  <Text style={styles.itemKeyLabel}>Entity Type</Text>
                  <Text style={styles.itemValText}>
                    {activeBusiness?.legalEntityType || 'LLC'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>
              <View style={styles.itemDivider} />

              <TouchableOpacity style={styles.settingItemRow} activeOpacity={0.7}>
                <View>
                  <Text style={styles.itemKeyLabel}>Emirate / Jurisdiction</Text>
                  <Text style={styles.itemValText}>
                    {activeBusiness?.emirate || 'Dubai'} ({activeBusiness?.jurisdictionType || 'MAINLAND'})
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
              </TouchableOpacity>
              <View style={styles.itemDivider} />

              <TouchableOpacity style={styles.settingItemRow} activeOpacity={0.7}>
                <View>
                  <Text style={styles.itemKeyLabel}>License Expiry</Text>
                  <Text style={styles.itemValText}>
                    {activeBusiness?.expiryDate || 'N/A'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.neutral.textTertiary} />
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
                  onValueChange={setIsPrimary}
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
                  onValueChange={setIsMultiCurrency}
                  accessibilityLabel="Multi-Currency Books"
                />
              </View>
              <View style={styles.itemDivider} />

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>Auto Tax Calculations</Text>
                  <Text style={styles.toggleDesc}>
                    Automatically calculate VAT & Corporate Tax
                  </Text>
                </View>
                <AnimatedSwitch
                  value={isAutoCalc}
                  onValueChange={setIsAutoCalc}
                  accessibilityLabel="Auto Tax Calculations"
                />
              </View>
            </View>
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
  },
  bizHeroSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  bizPillRow: {
    flexDirection: 'row',
    gap: 6,
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
});
