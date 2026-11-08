// ============================================================================
// Mizan (ميزان) - Screen Header Component
// Shows Greeting, UAE Flag, Active Business Tag & Dynamic Language Switcher
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme/tokens';
import { useLocale } from '../context/LocaleContext';
import { useBusiness } from '../context/BusinessContext';
import { useRouter } from 'expo-router';

interface ScreenHeaderProps {
  onPressNotifications?: () => void;
}

const getBusinessIcon = (iconName?: string): keyof typeof Ionicons.glyphMap => {
  if (iconName === 'globe-outline' || iconName === '🌐') return 'globe-outline';
  if (iconName === 'person-outline' || iconName === '👤') return 'person-outline';
  return 'business-outline';
};

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ onPressNotifications }) => {
  const router = useRouter();
  const { t, locale, toggleLocale, isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {/* Left: User Avatar & Greeting & Entity Chip */}
      <View style={[styles.userBlock, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={styles.avatar}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Ionicons
            name={getBusinessIcon(activeBusiness?.icon)}
            size={20}
            color={colors.neutral.white}
          />
        </TouchableOpacity>
        <View style={[styles.textBlock, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={styles.greetingText}>
            {t.home.greeting} <Text style={styles.userName}>{t.home.defaultUser}</Text>
          </Text>
          <TouchableOpacity
            style={[styles.entityPill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}
          >
            <Text style={styles.entityPillText} numberOfLines={1}>
              {activeBusiness?.tradeName || activeBusiness?.legalName || 'Register Business'}
            </Text>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={12}
              color={colors.brand.burgundy}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Right: Language Switcher & Flag */}
      <View style={[styles.controlsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[styles.languagePill, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }]}
          activeOpacity={0.75}
          onPress={toggleLocale}
        >
          <Ionicons name="globe-outline" size={13} color={colors.brand.burgundy} />
          <Text style={styles.languageText}>{t.common.switchLanguage}</Text>
        </TouchableOpacity>

        <View style={styles.flagBadge}>
          <Text style={styles.flagIcon}>🇦🇪</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  userBlock: {
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.brand.blushAlt,
  },
  avatarText: {
    color: colors.neutral.white,
    fontSize: 17,
    fontWeight: '700',
  },
  textBlock: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: colors.neutral.textPrimary,
    fontWeight: '500',
  },
  userName: {
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  subtitleText: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginTop: 1,
  },
  entityPill: {
    backgroundColor: colors.brand.blushSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    maxWidth: 180,
  },
  entityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.burgundy,
    flexShrink: 1,
  },
  switchIcon: {
    fontSize: 8,
    color: colors.brand.burgundy,
  },
  controlsRow: {
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  languagePill: {
    backgroundColor: colors.brand.blush,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand.blushAlt,
  },
  languageText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  flagBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  flagIcon: {
    fontSize: 18,
  },
});
