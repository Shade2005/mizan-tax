// ============================================================================
// Mizan (ميزان) - Production Register Screen
// Creates new User, Organisation, and Admin Membership with UAE tax grounding
// ============================================================================

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { MizanApi } from '../../src/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const { locale, toggleLocale, isRTL } = useLocale();
  const { refreshBusinesses } = useBusiness();

  const [fullName, setFullName] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getFirebaseAuthErrorMessage = (code: string, isRTL: boolean): string => {
    switch (code) {
      case 'auth/email-already-in-use':
        return isRTL ? 'البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.' : 'This email address is already in use. Please sign in.';
      case 'auth/weak-password':
        return isRTL ? 'كلمة المرور ضعيفة جداً (يجب ألا تقل عن 8 أحرف).' : 'Password is too weak. Please use at least 8 characters.';
      case 'auth/invalid-email':
        return isRTL ? 'صيغة البريد الإلكتروني غير صالحة.' : 'The email address is badly formatted.';
      case 'auth/network-request-failed':
        return isRTL ? 'فشل الاتصال بالإنترنت. يرجى التحقق من الشبكة.' : 'Network connection error. Please verify your connection.';
      default:
        return '';
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim()) {
      setErrorMessage(isRTL ? 'يرجى إدخال الاسم الكامل' : 'Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage(isRTL ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please enter a valid email address');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage(
        isRTL
          ? 'يجب ألا تقل كلمة المرور عن 8 أحرف'
          : 'Password must be at least 8 characters long'
      );
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      await MizanApi.register({
        fullName: fullName.trim(),
        organisationName: organisationName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refreshBusinesses();
      // Mandatory onboarding: user must configure their actual business before entering
      router.replace('/onboarding/business');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const friendlyMsg = getFirebaseAuthErrorMessage(err?.code || '', isRTL);
      setErrorMessage(
        friendlyMsg ||
          err?.message ||
          (isRTL
            ? 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.'
            : 'Registration failed. Please check your details.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar with Language Switcher */}
          <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.brandRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.brandLogoBox}>
                <View style={styles.logoSlantBar1} />
                <View style={styles.logoSlantBar2} />
              </View>
              <Text style={styles.brandTitle}>Mizan ميزان</Text>
            </View>

            <TouchableOpacity
              style={styles.langBtn}
              onPress={toggleLocale}
              activeOpacity={0.7}
            >
              <Ionicons name="language-outline" size={16} color={colors.neutral.textPrimary} />
              <Text style={styles.langBtnText}>
                {locale === 'en' ? 'العربية' : 'English'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Heading */}
          <View style={[styles.headerSection, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.heading, { textAlign: isRTL ? 'right' : 'left' }]}>
              {isRTL ? 'إنشاء حساب جديد' : 'Create an account'}
            </Text>
            <Text style={[styles.subheading, { textAlign: isRTL ? 'right' : 'left' }]}>
              {isRTL
                ? 'ابدأ إدارة الضرائب والامتثال لشركتك في دولة الإمارات بكل ثقة.'
                : 'Start managing your UAE tax obligations and compliance with confidence.'}
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={[styles.errorBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="alert-circle" size={20} color={colors.semantic.risk} />
              <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Registration Form Card */}
          <View style={styles.formCard}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'الاسم الكامل *' : 'Full Name *'}
              </Text>
              <View style={[styles.inputWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.neutral.textTertiary}
                  style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }}
                />
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={isRTL ? 'أحمد المنصوري' : 'Ahmed Al Mansoori'}
                  placeholderTextColor={colors.neutral.textTertiary}
                  value={fullName}
                  onChangeText={(val) => {
                    setFullName(val);
                    setErrorMessage(null);
                  }}
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Company / Business Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'اسم الشركة أو المؤسسة' : 'Company or Business Name'}
              </Text>
              <View style={[styles.inputWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={colors.neutral.textTertiary}
                  style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }}
                />
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={isRTL ? 'المنصوري لتجارة المواد ش.ذ.م.م' : 'Al Mansoori Trading LLC'}
                  placeholderTextColor={colors.neutral.textTertiary}
                  value={organisationName}
                  onChangeText={(val) => setOrganisationName(val)}
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'البريد الإلكتروني للعمل *' : 'Work Email *'}
              </Text>
              <View style={[styles.inputWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.neutral.textTertiary}
                  style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }}
                />
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="founder@company.ae"
                  placeholderTextColor={colors.neutral.textTertiary}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* UAE Mobile Phone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'رقم الهاتف (اختياري)' : 'UAE Mobile Number (Optional)'}
              </Text>
              <View style={[styles.inputWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={colors.neutral.textTertiary}
                  style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }}
                />
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="+971 50 123 4567"
                  placeholderTextColor={colors.neutral.textTertiary}
                  value={phone}
                  onChangeText={(val) => setPhone(val)}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'كلمة المرور (8 أحرف على الأقل) *' : 'Password (8+ characters) *'}
              </Text>
              <View style={[styles.inputWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.neutral.textTertiary}
                  style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }}
                />
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.neutral.textTertiary}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setErrorMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.neutral.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isRTL ? 'إنشاء الحساب' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Switch to Login */}
          <View style={[styles.footerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.footerText}>
              {isRTL ? 'لديك حساب بالفعل؟' : 'Already have an account?'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.footerLink}>
                {isRTL ? ' تسجيل الدخول' : ' Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  topBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  brandRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  logoSlantBar1: {
    position: 'absolute',
    width: 3,
    height: 18,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '25deg' }],
    left: 11,
  },
  logoSlantBar2: {
    position: 'absolute',
    width: 3,
    height: 18,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '25deg' }],
    right: 11,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    letterSpacing: -0.3,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  headerSection: {
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: colors.neutral.textSecondary,
    lineHeight: 20,
  },
  errorBanner: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.semantic.riskBg,
    borderColor: colors.semantic.riskBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.semantic.risk,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.card,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral.textPrimary,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  primaryButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    color: colors.neutral.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.primary,
  },
});
