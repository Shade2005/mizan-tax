// ============================================================================
// Mizan (ميزان) - Mandatory Business Entity Onboarding Screen
// Enforces mandatory business registration before entering the tax intelligence platform.
// Cannot be skipped or bypassed: users must configure their legal entity, jurisdiction,
// licensing authority, and revenue to establish tax posture & EmaraTax readiness.
// ============================================================================

import React, { useState } from 'react';
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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';

const LEGAL_ENTITY_TYPES = [
  { id: 'LLC', labelEn: 'Limited Liability Company (LLC)', labelAr: 'شركة ذات مسؤولية محدودة (ش.ذ.م.م)' },
  { id: 'SOLE_ESTABLISHMENT', labelEn: 'Sole Establishment', labelAr: 'مؤسسة فردية' },
  { id: 'FREE_ZONE_COMPANY', labelEn: 'Free Zone Company (FZ-LLC / FZCO)', labelAr: 'شركة منطقة حرة' },
  { id: 'FREE_ZONE_ESTABLISHMENT', labelEn: 'Free Zone Establishment (FZE)', labelAr: 'مؤسسة منطقة حرة' },
  { id: 'BRANCH_OF_FOREIGN_COMPANY', labelEn: 'Branch of Foreign / Local Company', labelAr: 'فرع شركة' },
  { id: 'NATURAL_PERSON', labelEn: 'Natural Person / Freelance Permit', labelAr: 'شخص طبيعي / تصريح عمل حر' },
];

const JURISDICTIONS = [
  { id: 'MAINLAND', labelEn: 'Mainland UAE', labelAr: 'داخل الدولة (البر الرئيسي)' },
  { id: 'FREE_ZONE', labelEn: 'Free Zone', labelAr: 'منطقة حرة' },
  { id: 'DESIGNATED_FREE_ZONE', labelEn: 'Designated Free Zone (VAT Exempt)', labelAr: 'منطقة حرة محددة (ضريبياً)' },
];

const EMIRATES = [
  { id: 'Dubai', labelEn: 'Dubai', labelAr: 'دبي' },
  { id: 'Abu Dhabi', labelEn: 'Abu Dhabi', labelAr: 'أبوظبي' },
  { id: 'Sharjah', labelEn: 'Sharjah', labelAr: 'الشارقة' },
  { id: 'Ajman', labelEn: 'Ajman', labelAr: 'عجمان' },
  { id: 'Ras Al Khaimah', labelEn: 'Ras Al Khaimah', labelAr: 'رأس الخيمة' },
  { id: 'Fujairah', labelEn: 'Fujairah', labelAr: 'الفجيرة' },
  { id: 'Umm Al Quwain', labelEn: 'Umm Al Quwain', labelAr: 'أم القيوين' },
];

const LICENSING_AUTHORITIES: Record<string, string[]> = {
  MAINLAND: [
    'Department of Economy and Tourism (DET Dubai)',
    'Abu Dhabi Department of Economic Development (ADDED)',
    'Sharjah Economic Development Department (SEDD)',
    'Ajman Department of Economic Development',
    'RAK Department of Economic Development',
    'Fujairah Municipality',
    'Umm Al Quwain Department of Economic Development',
  ],
  FREE_ZONE: [
    'Dubai Multi Commodities Centre (DMCC)',
    'Dubai International Financial Centre (DIFC)',
    'Abu Dhabi Global Market (ADGM)',
    'Dubai Airport Freezone Authority (DAFZA)',
    'Sharjah Media City (Shams)',
    'Ras Al Khaimah Economic Zone (RAKEZ)',
    'International Free Zone Authority (IFZA)',
    'Meydan Free Zone',
    'Ajman Free Zone (AFZ)',
    'Dubai Silicon Oasis (DSO)',
    'Jebel Ali Free Zone (JAFZA)',
    'Sharjah Publishing City (SPC)',
  ],
  DESIGNATED_FREE_ZONE: [
    'Jebel Ali Free Zone (JAFZA) - Designated',
    'Dubai Airport Freezone (DAFZA) - Designated',
    'Khalifa Industrial Zone Abu Dhabi (KIZAD)',
    'Hamriyah Free Zone Sharjah',
    'RAK Maritime City Free Zone',
  ],
};

const BUSINESS_ACTIVITIES = [
  { id: 'trading', labelEn: 'Commercial & General Trading', labelAr: 'التجارة العامة والمواد التجارية' },
  { id: 'it_software', labelEn: 'Technology & Software Development', labelAr: 'تقنية المعلومات وتطوير البرمجيات' },
  { id: 'consulting', labelEn: 'Management & Professional Consulting', labelAr: 'الاستشارات الإدارية والمهنية' },
  { id: 'ecommerce', labelEn: 'E-Commerce & Digital Services', labelAr: 'التجارة الإلكترونية والخدمات الرقمية' },
  { id: 'hospitality', labelEn: 'F&B, Restaurants & Hospitality', labelAr: 'الأغذية والمطاعم والضيافة' },
  { id: 'real_estate', labelEn: 'Real Estate & Property Management', labelAr: 'العقارات وإدارة الممتلكات' },
  { id: 'logistics', labelEn: 'Logistics, Freight & Transport', labelAr: 'الخدمات اللوجستية والشحن والنقل' },
  { id: 'marketing', labelEn: 'Marketing, Media & Advertising', labelAr: 'التسويق والدعاية والإعلام' },
];

export default function BusinessOnboardingScreen() {
  const router = useRouter();
  const { isRTL, toggleLocale, locale } = useLocale();
  const { currentUser, addOrUpdateBusiness, refreshBusinesses } = useBusiness();

  // Wizard Step State (1: Entity & Name, 2: Jurisdiction & Authority, 3: Revenue & Tax Profile)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [legalName, setLegalName] = useState(currentUser?.organisationName || '');
  const [tradeName, setTradeName] = useState(currentUser?.organisationName || '');
  const [legalEntityType, setLegalEntityType] = useState<string>('LLC');
  const [jurisdictionType, setJurisdictionType] = useState<string>('MAINLAND');
  const [licensingAuthority, setLicensingAuthority] = useState<string>(
    'Department of Economy and Tourism (DET Dubai)'
  );
  const [emirate, setEmirate] = useState<string>('Dubai');
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState<string>(
    `TL-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [expiryDate, setExpiryDate] = useState<string>('2027-12-31');
  const [revenueAED, setRevenueAED] = useState<string>('1200000');
  const [hasVatTrn, setHasVatTrn] = useState(false);
  const [vatTrn, setVatTrn] = useState('');
  const [hasCorporateTaxTrn, setHasCorporateTaxTrn] = useState(false);
  const [corporateTaxTrn, setCorporateTaxTrn] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>(['trading']);
  const [address, setAddress] = useState('Business Bay, Dubai, UAE');

  const parsedRevenue = parseFloat(revenueAED) || 0;
  const isSbrEligible = parsedRevenue > 0 && parsedRevenue <= 3000000;

  const handleNextStep = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!legalName.trim()) {
        setErrorMessage(
          isRTL ? 'يرجى إدخال اسم المنشأة أو الشركة' : 'Please enter your registered legal business name'
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return;
      }
      if (!tradeLicenseNumber.trim()) {
        setErrorMessage(
          isRTL ? 'يرجى إدخال رقم الرخصة التجارية' : 'Please enter your trade license number'
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return;
      }
      Haptics.selectionAsync().catch(() => {});
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!licensingAuthority.trim()) {
        setErrorMessage(
          isRTL ? 'يرجى اختيار جهة الترخيص' : 'Please select your licensing authority'
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return;
      }
      Haptics.selectionAsync().catch(() => {});
      setCurrentStep(3);
      return;
    }
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
    Haptics.selectionAsync().catch(() => {});
  };

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
    Haptics.selectionAsync().catch(() => {});
  };

  const handleCompleteRegistration = async () => {
    if (!legalName.trim() || !tradeLicenseNumber.trim()) {
      setErrorMessage(
        isRTL ? 'يرجى استكمال بيانات المنشأة' : 'Please complete all required business details'
      );
      return;
    }

    if (hasVatTrn && vatTrn.trim() && vatTrn.trim().length !== 15) {
      setErrorMessage(
        isRTL
          ? 'رقم التسجيل الضريبي للضريبة على القيمة المضافة (TRN) يجب أن يتكون من 15 رقماً'
          : 'VAT TRN must be exactly 15 digits'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const taxRegimeDescription = isSbrEligible
        ? `${jurisdictionType === 'FREE_ZONE' ? 'Free Zone' : 'Mainland'} ${legalEntityType} • SBR 0% Relief Eligible (≤ AED 3M)`
        : `${jurisdictionType === 'FREE_ZONE' ? 'Free Zone' : 'Mainland'} ${legalEntityType} • Standard 9% UAE Corporate Tax`;

      await addOrUpdateBusiness({
        legalName: legalName.trim(),
        tradeName: tradeName.trim() || legalName.trim(),
        legalEntityType,
        jurisdictionType,
        licensingAuthority,
        emirate,
        tradeLicenseNumber: tradeLicenseNumber.trim(),
        expiryDate,
        annualRevenueEstimateAED: parsedRevenue,
        vatTrn: hasVatTrn && vatTrn.trim() ? vatTrn.trim() : undefined,
        corporateTaxTrn: hasCorporateTaxTrn && corporateTaxTrn.trim() ? corporateTaxTrn.trim() : undefined,
        address: address.trim(),
        businessActivities: selectedActivities,
        taxRegime: taxRegimeDescription,
        isSbrEligible,
        isQfzpEligible: jurisdictionType === 'FREE_ZONE' || jurisdictionType === 'DESIGNATED_FREE_ZONE',
        verificationStatus: 'REGISTRY_VERIFIED',
      });

      await refreshBusinesses();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Successfully registered business -> Navigate to Dashboard
      router.replace('/(tabs)');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setErrorMessage(
        err?.message ||
          (isRTL
            ? 'تعذر تسجيل المنشأة. يرجى المحاولة مرة أخرى.'
            : 'Failed to complete business registration. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
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
          {/* Header Bar */}
          <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.brandRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.brandLogoBox}>
                <View style={styles.logoSlantBar1} />
                <View style={styles.logoSlantBar2} />
              </View>
              <Text style={styles.brandTitle}>Mizan ميزان</Text>
            </View>

            <TouchableOpacity style={styles.langPill} onPress={toggleLocale} activeOpacity={0.7}>
              <Ionicons name="language-outline" size={16} color={colors.neutral.textPrimary} />
              <Text style={styles.langText}>{locale === 'en' ? 'العربية' : 'English'}</Text>
            </TouchableOpacity>
          </View>

          {/* Stepper Header */}
          <View style={styles.headerBlock}>
            <View style={styles.badgeRow}>
              <View style={styles.requiredBadge}>
                <Ionicons name="shield-checkmark" size={14} color={colors.brand.primary} />
                <Text style={styles.requiredBadgeText}>
                  {isRTL ? 'تسجيل منشأة إلزامي' : 'Mandatory Business Registration'}
                </Text>
              </View>
            </View>
            <Text style={[styles.pageTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {isRTL ? 'سجّل منشأتك لتفعيل الحساب' : 'Register Your UAE Business'}
            </Text>
            <Text style={[styles.pageSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {isRTL
                ? 'وفقاً لمتطلبات الهيئة الاتحادية للضرائب وقانون ضريبة الشركات، يجب ربط المنشأة بحسابك للوصول إلى التحليلات والإقرارات.'
                : 'Under UAE Federal Tax Authority statutory requirements, you must register your verified business entity before accessing tax compliance and bookkeeping.'}
            </Text>
          </View>

          {/* Progress Indicator */}
          <View style={styles.stepsIndicatorRow}>
            {[1, 2, 3].map((step) => {
              const isActive = currentStep === step;
              const isDone = currentStep > step;
              return (
                <View key={step} style={styles.stepTrackItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      isDone && styles.stepCircleDone,
                      isActive && styles.stepCircleActive,
                    ]}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    ) : (
                      <Text
                        style={[
                          styles.stepNumberText,
                          isActive && styles.stepNumberTextActive,
                        ]}
                      >
                        {step}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabelText,
                      isActive && styles.stepLabelTextActive,
                    ]}
                  >
                    {step === 1
                      ? isRTL ? 'الاسم والشكل' : 'Entity & Name'
                      : step === 2
                      ? isRTL ? 'الترخيص والإمارة' : 'Licensing'
                      : isRTL ? 'الضريبة والإيراد' : 'Tax & Revenue'}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.semantic.risk} />
              <Text style={[styles.errorBannerText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* ================================================================ */}
          {/* STEP 1: ENTITY NAME & LEGAL STRUCTURE                            */}
          {/* ================================================================ */}
          {currentStep === 1 && (
            <View style={styles.card}>
              <Text style={[styles.cardSectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'البيانات القانونية للمنشأة' : 'Company Legal Information'}
              </Text>

              {/* Legal Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'الاسم القانوني للمنشأة *' : 'Legal Business Name *'}
                </Text>
                <View style={[styles.inputContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="business-outline" size={18} color={colors.neutral.textTertiary} />
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                    value={legalName}
                    onChangeText={setLegalName}
                    placeholder={isRTL ? 'مثال: شركة نور الإتقان للتجارة العامة ش.ذ.م.م' : 'e.g. Noor Al Itqan General Trading LLC'}
                    placeholderTextColor={colors.neutral.textTertiary}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Trade Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'الاسم التجاري (الشهرة)' : 'Trade Name (Commercial Brand)'}
                </Text>
                <View style={[styles.inputContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="pricetag-outline" size={18} color={colors.neutral.textTertiary} />
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                    value={tradeName}
                    onChangeText={setTradeName}
                    placeholder={isRTL ? 'مثال: نور الإتقان' : 'e.g. Noor Al Itqan'}
                    placeholderTextColor={colors.neutral.textTertiary}
                  />
                </View>
              </View>

              {/* Trade License Number */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'رقم الرخصة التجارية *' : 'Trade License Number *'}
                </Text>
                <View style={[styles.inputContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="document-text-outline" size={18} color={colors.neutral.textTertiary} />
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                    value={tradeLicenseNumber}
                    onChangeText={setTradeLicenseNumber}
                    placeholder="e.g. 1029384 or CN-1294820"
                    placeholderTextColor={colors.neutral.textTertiary}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Legal Entity Type Selector */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'الشكل القانوني *' : 'Legal Entity Type *'}
                </Text>
                <View style={styles.optionsWrap}>
                  {LEGAL_ENTITY_TYPES.map((type) => {
                    const isSelected = legalEntityType === type.id;
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[styles.selectablePill, isSelected && styles.selectablePillActive]}
                        onPress={() => {
                          setLegalEntityType(type.id);
                          Haptics.selectionAsync().catch(() => {});
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={isSelected ? colors.brand.primary : colors.neutral.textTertiary}
                        />
                        <Text style={[styles.selectablePillText, isSelected && styles.selectablePillTextActive]}>
                          {isRTL ? type.labelAr : type.labelEn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* ================================================================ */}
          {/* STEP 2: JURISDICTION & LICENSING                                */}
          {/* ================================================================ */}
          {currentStep === 2 && (
            <View style={styles.card}>
              <Text style={[styles.cardSectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'بيانات الولاية القضائية والترخيص' : 'Jurisdiction & Licensing Authority'}
              </Text>

              {/* Jurisdiction Type */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'نوع الولاية القضائية *' : 'Jurisdiction Type *'}
                </Text>
                <View style={styles.optionsWrap}>
                  {JURISDICTIONS.map((j) => {
                    const isSelected = jurisdictionType === j.id;
                    return (
                      <TouchableOpacity
                        key={j.id}
                        style={[styles.selectablePill, isSelected && styles.selectablePillActive]}
                        onPress={() => {
                          setJurisdictionType(j.id);
                          const authorities = LICENSING_AUTHORITIES[j.id] || LICENSING_AUTHORITIES.MAINLAND;
                          setLicensingAuthority(authorities[0]);
                          Haptics.selectionAsync().catch(() => {});
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isSelected ? 'shield-checkmark' : 'ellipse-outline'}
                          size={16}
                          color={isSelected ? colors.brand.primary : colors.neutral.textTertiary}
                        />
                        <Text style={[styles.selectablePillText, isSelected && styles.selectablePillTextActive]}>
                          {isRTL ? j.labelAr : j.labelEn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Emirate Selector */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'الإمارة *' : 'Emirate *'}
                </Text>
                <View style={styles.optionsWrap}>
                  {EMIRATES.map((em) => {
                    const isSelected = emirate === em.id;
                    return (
                      <TouchableOpacity
                        key={em.id}
                        style={[styles.selectablePillSmall, isSelected && styles.selectablePillActive]}
                        onPress={() => {
                          setEmirate(em.id);
                          Haptics.selectionAsync().catch(() => {});
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.selectablePillText, isSelected && styles.selectablePillTextActive]}>
                          {isRTL ? em.labelAr : em.labelEn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Licensing Authority */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'جهة إصدار الرخصة *' : 'Licensing Authority *'}
                </Text>
                <View style={styles.optionsWrap}>
                  {(LICENSING_AUTHORITIES[jurisdictionType] || LICENSING_AUTHORITIES.MAINLAND).map((authName) => {
                    const isSelected = licensingAuthority === authName;
                    return (
                      <TouchableOpacity
                        key={authName}
                        style={[styles.selectablePill, isSelected && styles.selectablePillActive]}
                        onPress={() => {
                          setLicensingAuthority(authName);
                          Haptics.selectionAsync().catch(() => {});
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={isSelected ? colors.brand.primary : colors.neutral.textTertiary}
                        />
                        <Text style={[styles.selectablePillText, isSelected && styles.selectablePillTextActive]}>
                          {authName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Registered Address */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'عنوان المقر المسجل' : 'Registered Office Address'}
                </Text>
                <View style={[styles.inputContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="location-outline" size={18} color={colors.neutral.textTertiary} />
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder={isRTL ? 'مثال: برج الخليج، الخليج التجاري، دبي' : 'e.g. Office 402, Business Bay, Dubai'}
                    placeholderTextColor={colors.neutral.textTertiary}
                  />
                </View>
              </View>
            </View>
          )}

          {/* ================================================================ */}
          {/* STEP 3: TAX POSTURE, REVENUE & TRN                              */}
          {/* ================================================================ */}
          {currentStep === 3 && (
            <View style={styles.card}>
              <Text style={[styles.cardSectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'الملف الضريبي والإيرادات التقديرية' : 'Tax Posture & Estimated Turnover'}
              </Text>

              {/* Annual Turnover / Revenue in AED */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'الإيرادات السنوية التقديرية (درهم إماراتي) *' : 'Estimated Annual Turnover (AED) *'}
                </Text>
                <View style={[styles.inputContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ fontWeight: '700', color: colors.brand.primary }}>AED</Text>
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left', fontSize: 16, fontWeight: '700' }]}
                    value={revenueAED}
                    onChangeText={setRevenueAED}
                    keyboardType="numeric"
                    placeholder="1200000"
                    placeholderTextColor={colors.neutral.textTertiary}
                  />
                </View>

                {/* Dynamic SBR / Corporate Tax Callout */}
                <View
                  style={[
                    styles.taxPostureBadge,
                    {
                      backgroundColor: isSbrEligible ? colors.semantic.successBg : '#F0F9FF',
                      borderColor: isSbrEligible ? colors.semantic.successBorder : '#BAE6FD',
                    },
                  ]}
                >
                  <Ionicons
                    name={isSbrEligible ? 'checkmark-circle' : 'information-circle'}
                    size={20}
                    color={isSbrEligible ? colors.semantic.success : colors.semantic.info}
                  />
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <Text
                      style={[
                        styles.taxPostureTitle,
                        { color: isSbrEligible ? colors.semantic.successDark : '#0369A1' },
                        { textAlign: isRTL ? 'right' : 'left' },
                      ]}
                    >
                      {isSbrEligible
                        ? isRTL
                          ? 'مؤهل لإعفاء الأعمال الصغيرة (نسبة ضريبة 0%)'
                          : 'Eligible for Small Business Relief (0% Tax)'
                        : isRTL
                        ? 'تخضع للنظام الضريبي القياسي (9%)'
                        : 'Standard Corporate Tax Regime (9%)'}
                    </Text>
                    <Text
                      style={[
                        styles.taxPostureDesc,
                        { textAlign: isRTL ? 'right' : 'left' },
                      ]}
                    >
                      {isSbrEligible
                        ? isRTL
                          ? 'بموجب القرار الوزاري رقم 73 لسنة 2023، إذا كانت إيراداتك لا تتجاوز 3 ملايين درهم، يمكنك المطالبة بإعفاء الأعمال الصغيرة بنسبة 0% حتى نهاية 2026.'
                          : 'Turnover ≤ AED 3,000,000 qualifies for 0% Corporate Tax under Ministerial Decision No. 73 of 2023.'
                        : isRTL
                        ? 'الإيرادات تتجاوز 3 ملايين درهم، وتخضع الأرباح الخاضعة للضريبة فوق 375,000 درهم لنسبة 9%.'
                        : 'Turnover > AED 3,000,000: Taxable profits exceeding AED 375,000 are taxed at the statutory 9% rate.'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* VAT Registration Toggle */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.checkboxRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => setHasVatTrn(!hasVatTrn)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={hasVatTrn ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={hasVatTrn ? colors.brand.primary : colors.neutral.textTertiary}
                  />
                  <Text style={[styles.checkboxLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {isRTL
                      ? 'المنشأة مسجلة لضريبة القيمة المضافة (لديها TRN)'
                      : 'Business is already registered for UAE VAT (Has VAT TRN)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* VAT TRN Input */}
              {hasVatTrn && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {isRTL ? 'رقم التسجيل الضريبي لضريبة القيمة المضافة (15 رقماً) *' : '15-Digit VAT TRN *'}
                  </Text>
                  <View style={[styles.inputContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="receipt-outline" size={18} color={colors.neutral.textTertiary} />
                    <TextInput
                      style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                      value={vatTrn}
                      onChangeText={setVatTrn}
                      keyboardType="numeric"
                      maxLength={15}
                      placeholder="100XXXXXXXX0003"
                      placeholderTextColor={colors.neutral.textTertiary}
                    />
                  </View>
                </View>
              )}

              {/* Corporate Tax TRN Toggle */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.checkboxRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => setHasCorporateTaxTrn(!hasCorporateTaxTrn)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={hasCorporateTaxTrn ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={hasCorporateTaxTrn ? colors.brand.primary : colors.neutral.textTertiary}
                  />
                  <Text style={[styles.checkboxLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {isRTL
                      ? 'تم إصدار رقم التسجيل لضريبة الشركات من الهيئة الاتحادية للضرائب'
                      : 'Has Corporate Tax Registration Number from FTA'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Corporate Tax TRN Input */}
              {hasCorporateTaxTrn && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {isRTL ? 'رقم تسجيل ضريبة الشركات (CT-TRN)' : 'Corporate Tax Registration Number'}
                  </Text>
                  <View style={[styles.inputContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="card-outline" size={18} color={colors.neutral.textTertiary} />
                    <TextInput
                      style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                      value={corporateTaxTrn}
                      onChangeText={setCorporateTaxTrn}
                      placeholder="e.g. CT-1002938475"
                      placeholderTextColor={colors.neutral.textTertiary}
                    />
                  </View>
                </View>
              )}

              {/* Business Activities Tag Cloud */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'الأنشطة التجارية الرئيسية' : 'Primary Business Activities'}
                </Text>
                <View style={styles.optionsWrap}>
                  {BUSINESS_ACTIVITIES.map((act) => {
                    const isSelected = selectedActivities.includes(act.id);
                    return (
                      <TouchableOpacity
                        key={act.id}
                        style={[styles.activityPill, isSelected && styles.activityPillActive]}
                        onPress={() => toggleActivity(act.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                          size={16}
                          color={isSelected ? colors.brand.primary : colors.neutral.textTertiary}
                        />
                        <Text style={[styles.activityPillText, isSelected && styles.activityPillTextActive]}>
                          {isRTL ? act.labelAr : act.labelEn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Navigation Action Buttons */}
          <View style={[styles.actionButtonsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handlePrevStep}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isRTL ? 'arrow-forward' : 'arrow-back'}
                  size={18}
                  color={colors.neutral.textPrimary}
                />
                <Text style={styles.backButtonText}>{isRTL ? 'السابق' : 'Back'}</Text>
              </TouchableOpacity>
            )}

            {currentStep < 3 ? (
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={handleNextStep}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>{isRTL ? 'التالي' : 'Continue'}</Text>
                <Ionicons
                  name={isRTL ? 'arrow-back' : 'arrow-forward'}
                  size={18}
                  color="#FFF"
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }, isSubmitting && styles.buttonDisabled]}
                onPress={handleCompleteRegistration}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-circle" size={20} color="#FFF" />
                    <Text style={styles.primaryButtonText}>
                      {isRTL ? 'تسجيل المنشأة والدخول' : 'Register Business & Enter'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.section,
  },
  topBar: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  brandRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandLogoBox: {
    width: 32,
    height: 32,
    backgroundColor: colors.brand.primary,
    borderRadius: radii.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  logoSlantBar1: {
    width: 4,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    transform: [{ skewX: '-15deg' }],
  },
  logoSlantBar2: {
    width: 4,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    transform: [{ skewX: '-15deg' }],
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: 6,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  headerBlock: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  badgeRow: {
    marginBottom: spacing.xs,
  },
  requiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.brand.primaryMuted,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 6,
  },
  requiredBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.primaryDark,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginTop: spacing.xs,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  stepsIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    backgroundColor: colors.neutral.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  stepTrackItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral.canvas,
    borderWidth: 1.5,
    borderColor: colors.neutral.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  stepCircleDone: {
    backgroundColor: colors.semantic.success,
    borderColor: colors.semantic.success,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
  },
  stepNumberTextActive: {
    color: '#FFF',
  },
  stepLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textTertiary,
  },
  stepLabelTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.semantic.riskBg,
    borderColor: colors.semantic.riskBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.semantic.risk,
    fontWeight: '500',
  },
  card: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
    marginBottom: 6,
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral.textPrimary,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    gap: 6,
  },
  selectablePillSmall: {
    backgroundColor: colors.neutral.canvas,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radii.md,
  },
  selectablePillActive: {
    backgroundColor: colors.brand.primaryMuted,
    borderColor: colors.brand.primary,
  },
  selectablePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  selectablePillTextActive: {
    color: colors.brand.primaryDark,
    fontWeight: '700',
  },
  activityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.full,
    gap: 6,
  },
  activityPillActive: {
    backgroundColor: colors.brand.primaryMuted,
    borderColor: colors.brand.primary,
  },
  activityPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  activityPillTextActive: {
    color: colors.brand.primaryDark,
    fontWeight: '700',
  },
  taxPostureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  taxPostureTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  taxPostureDesc: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    lineHeight: 16,
  },
  toggleRow: {
    marginVertical: spacing.xs,
  },
  checkboxRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
    flex: 1,
  },
  actionButtonsRow: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    height: 48,
    gap: spacing.xs,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radii.md,
    height: 48,
    gap: spacing.sm,
    ...shadows.sm,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
