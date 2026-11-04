// ============================================================================
// Mizan (ميزان) - Profile & Multi-Entity Business Management Screen
// Entity Switcher (Mainland LLC, Free Zone FZE, Freelance), TRN Vault & Settings
// ============================================================================

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness, BusinessEntity } from '../../src/context/BusinessContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { t, locale, toggleLocale, isRTL } = useLocale();
  const { businesses, activeBusiness, setActiveBusinessId } = useBusiness();

  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(true);

  const handleSelectBusiness = (entity: BusinessEntity) => {
    setActiveBusinessId(entity.id);
  };

  const handleScanNewLicense = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/scan');
  };

  const handleCopyTrn = (label: string, value?: string) => {
    if (!value || value.startsWith('NOT') || value.startsWith('EXEMPT')) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(label, `${value}\n\nCopied to clipboard.`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.title}>{t.profile.title}</Text>
          <View style={styles.uaePassBadge}>
            <Text style={styles.uaePassText}>UAE PASS</Text>
          </View>
        </View>

        {/* User Account Card */}
        <View style={[styles.userCard, shadows.card]}>
          <View style={[styles.userRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>HM</Text>
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={styles.userName}>Hamza Al Mansoori</Text>
              <Text style={styles.userEmail}>hamza@alnahda.ae</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Admin</Text>
            </View>
          </View>
        </View>

        {/* Active Business Entity Card */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t.profile.activeEntity}
          </Text>
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activePillText}>{t.profile.activeEntity}</Text>
          </View>
        </View>

        <View style={[styles.activeBizCard, shadows.card]}>
          <View style={[styles.bizTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.bizIconContainer}>
              <Text style={styles.bizIcon}>{activeBusiness.icon || '🏢'}</Text>
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={styles.bizLegalName}>{activeBusiness.legalName}</Text>
              <Text style={styles.bizAuthority}>
                {activeBusiness.licensingAuthority} • {activeBusiness.emirate}
              </Text>
            </View>
          </View>

          {/* Tax Posture Banner */}
          <View style={styles.taxRegimeBanner}>
            <Text style={styles.taxRegimeIcon}>⚖️</Text>
            <Text style={[styles.taxRegimeText, { textAlign: isRTL ? 'right' : 'left' }]}>
              {activeBusiness.taxRegime}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Meta Details */}
          <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.metaLabel}>{t.profile.tradeLicenseNo}</Text>
            <Text style={styles.metaValue}>{activeBusiness.tradeLicenseNumber}</Text>
          </View>

          <TouchableOpacity
            style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => handleCopyTrn('VAT TRN', activeBusiness.vatTrn)}
            activeOpacity={0.7}
          >
            <Text style={styles.metaLabel}>{t.profile.vatTrn}</Text>
            <View style={[styles.copyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.metaValue}>{activeBusiness.vatTrn || '—'}</Text>
              {activeBusiness.vatTrn && !activeBusiness.vatTrn.startsWith('NOT') && (
                <Text style={styles.copyIcon}>📋</Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => handleCopyTrn('Corporate Tax TRN', activeBusiness.corporateTaxTrn)}
            activeOpacity={0.7}
          >
            <Text style={styles.metaLabel}>{t.profile.ctTrn}</Text>
            <View style={[styles.copyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.metaValueHighlight}>
                {activeBusiness.corporateTaxTrn || '—'}
              </Text>
              {activeBusiness.corporateTaxTrn && !activeBusiness.corporateTaxTrn.startsWith('EXEMPT') && (
                <Text style={styles.copyIcon}>📋</Text>
              )}
            </View>
          </TouchableOpacity>

          <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.metaLabel}>{t.profile.annualTurnover}</Text>
            <Text style={styles.metaValue}>
              AED {activeBusiness.annualRevenueEstimateAED.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Multi-Entity Switcher Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t.profile.switchEntity}
          </Text>
          <Text style={styles.entityCountBadge}>{businesses.length} Licenses</Text>
        </View>

        <View style={styles.entityList}>
          {businesses.map((biz) => {
            const isSelected = biz.id === activeBusiness.id;
            return (
              <TouchableOpacity
                key={biz.id}
                style={[
                  styles.entityCard,
                  isSelected && styles.entityCardSelected,
                  shadows.card,
                ]}
                activeOpacity={0.8}
                onPress={() => handleSelectBusiness(biz)}
              >
                <View style={[styles.entityCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.entityIconBox}>
                    <Text style={styles.entityIcon}>{biz.icon || '🏢'}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={styles.entityName} numberOfLines={1}>
                      {biz.legalName}
                    </Text>
                    <Text style={styles.entitySubtitle}>
                      {biz.legalEntityType.replace(/_/g, ' ')} • {biz.emirate}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      isSelected && styles.radioButtonSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInnerCircle} />}
                  </View>
                </View>

                <View style={[styles.entityFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.jurisdictionTag}>
                    <Text style={styles.jurisdictionText}>{biz.jurisdictionType}</Text>
                  </View>
                  <Text style={styles.entityLicenceText}>Lic: {biz.tradeLicenseNumber}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Add New Trade License Button */}
          <TouchableOpacity
            style={[styles.addLicenseButton, shadows.card]}
            onPress={handleScanNewLicense}
            activeOpacity={0.8}
          >
            <View style={styles.addIconCircle}>
              <Text style={styles.addIconText}>+</Text>
            </View>
            <Text style={styles.addLicenseText}>{t.profile.addEntity}</Text>
          </TouchableOpacity>
        </View>

        {/* Settings & Preferences */}
        <Text style={[styles.sectionTitle, { marginHorizontal: spacing.lg, marginTop: spacing.lg, textAlign: isRTL ? 'right' : 'left' }]}>
          {t.profile.settings}
        </Text>

        <View style={styles.settingsGroup}>
          <TouchableOpacity
            style={[styles.settingsItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            activeOpacity={0.7}
            onPress={toggleLocale}
          >
            <View style={[styles.settingsItemLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.settingsIcon}>🌐</Text>
              <Text style={styles.settingsItemLabel}>{t.profile.language}</Text>
            </View>
            <View style={[styles.settingsItemRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.settingsItemValue}>
                {locale === 'en' ? 'English (Switch to العربية)' : 'العربية (التبديل إلى English)'}
              </Text>
              <Text style={styles.chevronIcon}>{isRTL ? '←' : '→'}</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.settingsItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.settingsItemLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.settingsIcon}>🔒</Text>
              <View>
                <Text style={styles.settingsItemLabel}>{t.profile.security}</Text>
                <Text style={styles.settingsSubLabel}>{t.profile.biometricsActive}</Text>
              </View>
            </View>
            <Switch
              value={isFaceIdEnabled}
              onValueChange={setIsFaceIdEnabled}
              trackColor={{ false: colors.neutral.border, true: colors.brand.burgundy }}
              thumbColor={colors.neutral.white}
            />
          </View>

          <TouchableOpacity
            style={[styles.settingsItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            activeOpacity={0.7}
            onPress={() => router.push('/scan/readiness')}
          >
            <View style={[styles.settingsItemLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.settingsIcon}>📁</Text>
              <View>
                <Text style={styles.settingsItemLabel}>{t.profile.documentVault}</Text>
                <Text style={styles.settingsSubLabel}>{t.profile.documentsCount}</Text>
              </View>
            </View>
            <View style={[styles.settingsItemRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.vaultCountBadge}>
                <Text style={styles.vaultCountText}>6 Docs</Text>
              </View>
              <Text style={styles.chevronIcon}>{isRTL ? '←' : '→'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* EmaraTax Ready Footer */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>Mizan (ميزان) Engine v2026.1-MZN</Text>
          <Text style={styles.footerSubText}>
            Direct EmaraTax API & Peppol PINT Electronic Invoicing Ready
          </Text>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  uaePassBadge: {
    backgroundColor: '#006699',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  uaePassText: {
    color: colors.neutral.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.md + 2,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  userRow: {
    alignItems: 'center',
    gap: spacing.md,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.brand.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '800',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginTop: 1,
  },
  roleBadge: {
    backgroundColor: colors.brand.blushAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs + 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.semantic.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#008C82',
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#008C82',
  },
  activeBizCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.brand.burgundy,
  },
  bizTopRow: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  bizIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.blushSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand.blushAlt,
  },
  bizIcon: {
    fontSize: 22,
  },
  bizLegalName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  bizAuthority: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginTop: 1,
  },
  taxRegimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.blushSoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    gap: 6,
    marginBottom: spacing.md,
  },
  taxRegimeIcon: {
    fontSize: 14,
  },
  taxRegimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.burgundy,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.border,
    marginBottom: spacing.md,
  },
  metaRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  copyRow: {
    alignItems: 'center',
    gap: 4,
  },
  copyIcon: {
    fontSize: 12,
  },
  metaLabel: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  metaValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  entityCountBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  entityList: {
    marginHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  entityCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  entityCardSelected: {
    borderColor: colors.brand.burgundy,
    borderWidth: 2,
    backgroundColor: '#FFFDFE',
  },
  entityCardHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  entityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityIcon: {
    fontSize: 18,
  },
  entityName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  entitySubtitle: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neutral.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.brand.burgundy,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand.burgundy,
  },
  entityFooter: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  jurisdictionTag: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  jurisdictionText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00838F',
  },
  entityLicenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textTertiary,
  },
  addLicenseButton: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.brand.burgundy,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  addIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '800',
  },
  addLicenseText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  settingsGroup: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  settingsItem: {
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  settingsItemLeft: {
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  settingsIcon: {
    fontSize: 18,
  },
  settingsItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  settingsSubLabel: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 1,
  },
  settingsItemRight: {
    alignItems: 'center',
    gap: 6,
  },
  settingsItemValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.burgundy,
  },
  chevronIcon: {
    fontSize: 14,
    color: colors.neutral.textTertiary,
  },
  vaultCountBadge: {
    backgroundColor: colors.brand.blushAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  vaultCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  footerNote: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textTertiary,
  },
  footerSubText: {
    fontSize: 10,
    color: colors.neutral.textTertiary,
    marginTop: 2,
  },
});
