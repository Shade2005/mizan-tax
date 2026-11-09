// ============================================================================
// Mizan (ميزان) - Root Gatekeeper & Route Dispatcher
// Evaluates authentication & business registration status on startup.
// Prevents unauthenticated users and unregistered businesses from exploring the app.
// ============================================================================

import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../src/components/SafeAreaView';
import { colors, radii, spacing } from '../src/theme/tokens';
import { useBusiness } from '../src/context/BusinessContext';
import { useLocale } from '../src/context/LocaleContext';

export default function RootIndexScreen() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const { isAuthenticated, businesses, isLoading } = useBusiness();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Unauthenticated -> Gate to Login
      router.replace('/auth/login');
    } else if (!businesses || businesses.length === 0) {
      // Authenticated but no business entity registered -> Gate to Onboarding
      router.replace('/onboarding/business');
    } else {
      // Authenticated with registered business -> Main Dashboard
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated, businesses, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.centerContent}>
        <View style={styles.brandLogoBox}>
          <View style={styles.logoSlantBar1} />
          <View style={styles.logoSlantBar2} />
        </View>
        <Text style={styles.brandTitle}>Mizan ميزان</Text>
        <Text style={styles.brandTagline}>
          {isRTL ? 'منصة الامتثال والذكاء الضريبي لدولة الإمارات' : 'UAE Tax Intelligence & Compliance Platform'}
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.brand.primary} />
          <Text style={styles.loadingText}>
            {isRTL ? 'جاري التحقق من الجلسة وبيانات المنشأة...' : 'Verifying session and business entity...'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  brandLogoBox: {
    width: 64,
    height: 64,
    backgroundColor: colors.brand.primary,
    borderRadius: radii.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    elevation: 4,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  logoSlantBar1: {
    width: 8,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    transform: [{ skewX: '-15deg' }],
  },
  logoSlantBar2: {
    width: 8,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    transform: [{ skewX: '-15deg' }],
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
});
