// ============================================================================
// Mizan (ميزان) - Quick Action Row Component
// 4 Primary Action Buttons with soft blush backgrounds and Deep Burgundy icons
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, spacing } from '../theme/tokens';
import { useLocale } from '../context/LocaleContext';

interface QuickActionRowProps {
  onScanLicence?: () => void;
  onScanReceipt?: () => void;
  onNewInvoice?: () => void;
  onAskAi?: () => void;
}

interface ActionItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export const QuickActionRow: React.FC<QuickActionRowProps> = ({
  onScanLicence,
  onScanReceipt,
  onNewInvoice,
  onAskAi,
}) => {
  const { t, isRTL } = useLocale();

  const actions: ActionItem[] = [
    { id: 'licence', label: t.home.scanLicence, icon: 'document-text-outline', onPress: onScanLicence },
    { id: 'receipt', label: t.home.scanReceipt, icon: 'receipt-outline', onPress: onScanReceipt },
    { id: 'invoice', label: t.home.newInvoice, icon: 'create-outline', onPress: onNewInvoice },
    { id: 'ai', label: t.home.askAi, icon: 'sparkles', onPress: onAskAi },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t.home.quickActionsTitle}
      </Text>

      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {actions.map((act) => (
          <TouchableOpacity
            key={act.id}
            style={[styles.actionCard, shadows.card]}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              act.onPress?.();
            }}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={act.icon} size={22} color={colors.brand.burgundy} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={2}>
              {act.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
  },
  row: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.blushSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.brand.blushAlt,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
