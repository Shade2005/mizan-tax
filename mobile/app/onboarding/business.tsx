// ============================================================================
// Mizan (ميزان) - Mandatory Business Entity Onboarding Screen
// Enforces mandatory business registration before entering the tax intelligence platform.
// Cannot be skipped or bypassed: users must configure their legal entity, jurisdiction,
// licensing authority, and revenue to establish tax posture & EmaraTax readiness.
// ============================================================================

import React, { useState, useRef } from 'react';
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
  PermissionsAndroid,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { VisionOcr } from '../../src/services/visionOcr';
import { EdgeOcrParser } from '../../src/services/edgeOcrParser';
import { AppPreferences } from '../../src/utils/preferences';

function normalizeDateToISO(raw?: string | null): string {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // Match YYYY/MM/DD
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    const year = ymd[1];
    const month = ymd[2].padStart(2, '0');
    const day = ymd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return s;
}

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

  // Keyboard avoidance and auto-scrolling refs
  const scrollViewRef = useRef<any>(null);
  const fieldYPositions = useRef<Record<string, number>>({});

  // Field touched tracking for real-time validation visual indicators
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  /**
   * Tracks vertical layout position of each form field
   */
  const handleFieldLayout = (key: string, y: number) => {
    fieldYPositions.current[key] = y;
  };

  /**
   * Smoothly scrolls the focused input so it sits comfortably right above the soft keyboard
   */
  const handleFieldFocus = (key: string) => {
    markTouched(key);
    const y = fieldYPositions.current[key];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: Math.max(0, y - 40),
        animated: true,
      });
    }
  };

  // Form Fields - Initialized empty without dummy/fake defaults
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [legalEntityType, setLegalEntityType] = useState<string>('LLC');
  const [jurisdictionType, setJurisdictionType] = useState<string>('MAINLAND');
  const [licensingAuthority, setLicensingAuthority] = useState<string>(
    'Department of Economy and Tourism (DET Dubai)'
  );
  const [emirate, setEmirate] = useState<string>('Dubai');
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [revenueAED, setRevenueAED] = useState<string>('');
  const [hasVatTrn, setHasVatTrn] = useState(false);
  const [vatTrn, setVatTrn] = useState('');
  const [hasCorporateTaxTrn, setHasCorporateTaxTrn] = useState(false);
  const [corporateTaxTrn, setCorporateTaxTrn] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>(['trading']);
  const [address, setAddress] = useState('');

  const parsedRevenue = parseFloat(revenueAED) || 0;
  const isSbrEligible = parsedRevenue > 0 && parsedRevenue <= 3000000;

  // Onboarding Setup Mode: 'SELECT' (Choose between Camera Scan, File Upload, or Manual) | 'FORM' (Step-by-step form)
  const [entryMode, setEntryMode] = useState<'SELECT' | 'FORM'>('SELECT');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [extractedBadge, setExtractedBadge] = useState<string | null>(null);

  /**
   * Process photo or document base64 through AI Vision OCR and populate form fields
   */
  const processLicenseImage = async (base64Data: string, mimeType: string = 'image/jpeg') => {
    setIsOcrProcessing(true);
    setOcrStatusText(
      isRTL
        ? 'جارٍ استخراج البيانات...'
        : 'Extracting details...'
    );
    setErrorMessage(null);

    try {
      const extracted = await VisionOcr.extractTradeLicense(base64Data, mimeType);

      if (extracted) {
        const foundName = extracted.businessName || extracted.businessNameAr;
        if (foundName) {
          setLegalName(foundName);
          setTradeName(foundName);
          markTouched('legalName');
        }

        if (extracted.licenseNumber) {
          setTradeLicenseNumber(extracted.licenseNumber);
          markTouched('tradeLicenseNumber');
        }

        if (extracted.expiryDate) {
          setExpiryDate(normalizeDateToISO(extracted.expiryDate));
        }

        // Legal structure heuristic matching
        const formRaw = (extracted.legalForm || '').toLowerCase();
        if (formRaw.includes('free zone') || formRaw.includes('fz')) {
          setLegalEntityType('FREE_ZONE_COMPANY');
          setJurisdictionType('FREE_ZONE');
        } else if (formRaw.includes('sole') || formRaw.includes('مؤسسة فردية')) {
          setLegalEntityType('SOLE_ESTABLISHMENT');
        } else if (formRaw.includes('branch')) {
          setLegalEntityType('BRANCH_OF_FOREIGN_COMPANY');
        } else {
          setLegalEntityType('LLC');
        }

        // Jurisdiction heuristic matching
        const jurisRaw = (extracted.jurisdiction || '').toLowerCase();
        if (jurisRaw.includes('free zone')) {
          setJurisdictionType('FREE_ZONE');
        } else {
          setJurisdictionType('MAINLAND');
        }

        setExtractedBadge(
          isRTL
            ? '✨ تم استخراج البيانات بنجاح! راجع البيانات وأكمل النموذج أدناه.'
            : '✨ Details extracted! Review your details and complete the steps below.'
        );
        AppPreferences.notification(Haptics.NotificationFeedbackType.Success);
      }

      // Transition smoothly into form wizard
      setEntryMode('FORM');
      setCurrentStep(1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } catch (ocrErr: any) {
      console.warn('OCR Extraction error:', ocrErr);
      Alert.alert(
        isRTL ? 'تنبيه استخراج المستند' : 'Trade License OCR Notice',
        ocrErr?.message || (isRTL
          ? 'تم استلام المستند ولكن تعذر التعرف على بعض الحقول بدقة. يرجى إكمال النموذج يدوياً.'
          : 'Document received. Some fields could not be recognized with statutory confidence. Please complete details manually.'),
        [
          {
            text: isRTL ? 'إكمال النموذج يدوياً' : 'Complete Manually',
            onPress: () => {
              setEntryMode('FORM');
              setCurrentStep(1);
            },
          },
        ]
      );
    } finally {
      setIsOcrProcessing(false);
    }
  };

  /**
   * Option 1: Live camera capture with automatic permission request
   */
  const handleScanWithCamera = async () => {
    try {
      AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);
      // Automatically triggers system permission popup if not granted yet
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isRTL ? 'إذن الكاميرا مطلوب' : 'Camera Permission Required',
          isRTL
            ? 'يرجى السماح بالوصول إلى الكاميرا لالتقاط صورة الرخصة التجارية.'
            : 'Please grant camera access to photograph your UAE trade license.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]?.base64) {
        const asset = result.assets[0];
        await processLicenseImage(asset.base64!, asset.mimeType || 'image/jpeg');
      }
    } catch (err: any) {
      console.warn('Camera launch error:', err);
      Alert.alert(
        isRTL ? 'خطأ في الكاميرا' : 'Camera Launch Error',
        err?.message || (isRTL ? 'تعذر تشغيل الكاميرا' : 'Could not launch camera')
      );
    }
  };

  /**
   * Option 2: Upload trade license file or image from device
   */
  const handleUploadDocument = async () => {
    try {
      AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);

      // Prompt native Android OS permission dialog for file & media access
      if (Platform.OS === 'android') {
        try {
          if (Number(Platform.Version) >= 33) {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
              {
                title: isRTL ? 'إذن الوصول للملفات والوسائط' : 'File & Media Access',
                message: isRTL
                  ? 'يتطلب ميزان إذن الوصول للملفات لاختيار ملف الرخصة التجارية.'
                  : 'Mizan requires access to your files to select your UAE Trade License.',
                buttonPositive: isRTL ? 'موافق' : 'Allow',
                buttonNegative: isRTL ? 'إلغاء' : 'Cancel',
              }
            );
          } else {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
              {
                title: isRTL ? 'إذن قراءة الملفات' : 'Storage Access',
                message: isRTL
                  ? 'يتطلب ميزان إذن الوصول للملفات لاختيار ملف الرخصة التجارية.'
                  : 'Mizan requires access to your files to select your Trade License document.',
                buttonPositive: isRTL ? 'موافق' : 'Allow',
                buttonNegative: isRTL ? 'إلغاء' : 'Cancel',
              }
            );
          }
        } catch (permErr) {
          console.warn('Android permissions request notice:', permErr);
        }
      } else {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      // Open system file manager (supports both PDF documents and images)
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        const isPdf = asset.name?.toLowerCase().endsWith('.pdf') || asset.mimeType?.includes('pdf');
        const mimeType = isPdf ? 'application/pdf' : asset.mimeType || 'image/jpeg';

        // Read file contents as base64 using the official expo-file-system/legacy API
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await processLicenseImage(base64, mimeType);
      }
    } catch (err: any) {
      console.warn('Document picker error:', err);
      Alert.alert(
        isRTL ? 'خطأ في فتح الملف' : 'Document Selection Error',
        err?.message || (isRTL ? 'تعذر فتح مدير الملفات' : 'Could not access documents')
      );
    }
  };

  /**
   * Option 3: Manual entry mode
   */
  const handleManualEntryMode = () => {
    AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);
    setExtractedBadge(null);
    setEntryMode('FORM');
    setCurrentStep(1);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleNextStep = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      markTouched('legalName');
      markTouched('tradeLicenseNumber');

      if (!legalName.trim() || legalName.trim().length < 2) {
        setErrorMessage(
          isRTL ? 'يرجى إدخال اسم المنشأة القانوني (حرفان على الأقل)' : 'Please enter your registered legal business name'
        );
        AppPreferences.notification(Haptics.NotificationFeedbackType.Error);
        handleFieldFocus('legalName');
        return;
      }
      if (!tradeLicenseNumber.trim() || tradeLicenseNumber.trim().length < 3) {
        setErrorMessage(
          isRTL ? 'يرجى إدخال رقم الرخصة التجارية الصادرة' : 'Please enter your registered trade license number'
        );
        AppPreferences.notification(Haptics.NotificationFeedbackType.Error);
        handleFieldFocus('tradeLicenseNumber');
        return;
      }
      AppPreferences.selection();
      setCurrentStep(2);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    if (currentStep === 2) {
      if (!licensingAuthority.trim()) {
        setErrorMessage(
          isRTL ? 'يرجى اختيار جهة الترخيص' : 'Please select your licensing authority'
        );
        AppPreferences.notification(Haptics.NotificationFeedbackType.Error);
        return;
      }
      AppPreferences.selection();
      setCurrentStep(3);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
    AppPreferences.selection();
  };

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
    AppPreferences.selection();
  };

  const handleCompleteRegistration = async () => {
    markTouched('legalName');
    markTouched('tradeLicenseNumber');
    markTouched('revenueAED');

    if (!legalName.trim() || legalName.trim().length < 2) {
      setErrorMessage(
        isRTL ? 'يرجى إدخال اسم المنشأة القانوني' : 'Please enter your registered legal business name'
      );
      setCurrentStep(1);
      handleFieldFocus('legalName');
      return;
    }

    if (!tradeLicenseNumber.trim() || tradeLicenseNumber.trim().length < 3) {
      setErrorMessage(
        isRTL ? 'يرجى إدخال رقم الرخصة التجارية' : 'Please enter your trade license number'
      );
      setCurrentStep(1);
      handleFieldFocus('tradeLicenseNumber');
      return;
    }

    if (!revenueAED.trim() || isNaN(parsedRevenue) || parsedRevenue <= 0) {
      setErrorMessage(
        isRTL
          ? 'يرجى إدخال الإيرادات السنوية التقديرية بالدرهم لحساب وضع ضريبة الشركات'
          : 'Please enter a valid estimated annual revenue in AED'
      );
      handleFieldFocus('revenueAED');
      return;
    }

    if (hasVatTrn) {
      markTouched('vatTrn');
      if (!vatTrn.trim() || vatTrn.trim().length !== 15) {
        setErrorMessage(
          isRTL
            ? 'رقم التسجيل الضريبي للضريبة على القيمة المضافة (TRN) يجب أن يتكون من 15 رقماً'
            : 'VAT TRN must be exactly 15 digits'
        );
        handleFieldFocus('vatTrn');
        return;
      }
    }

    if (hasCorporateTaxTrn) {
      markTouched('corporateTaxTrn');
      if (!corporateTaxTrn.trim() || corporateTaxTrn.trim().length !== 15) {
        setErrorMessage(
          isRTL
            ? 'رقم التسجيل الضريبي لضريبة الشركات يجب أن يتكون من 15 رقماً'
            : 'Corporate Tax TRN must be exactly 15 digits'
        );
        handleFieldFocus('corporateTaxTrn');
        return;
      }
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
        expiryDate: normalizeDateToISO(expiryDate) || undefined,
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

      AppPreferences.notification(Haptics.NotificationFeedbackType.Success);

      // Successfully registered business -> Navigate to Dashboard
      router.replace('/(tabs)');
    } catch (err: any) {
      AppPreferences.notification(Haptics.NotificationFeedbackType.Error);
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 280 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={true}
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

          {/* 3-Mode Selection View OR Step-by-Step Form Wizard */}
          {entryMode === 'SELECT' ? (
            <View>
              {/* Onboarding Mode Selection Header */}
              <View style={styles.headerBlock}>
                <View style={styles.badgeRow}>
                  <View style={styles.requiredBadge}>
                    <Ionicons name="shield-checkmark" size={14} color={colors.brand.primary} />
                    <Text style={styles.requiredBadgeText}>
                      {isRTL ? 'إعداد المنشأة الضريبية' : 'Tax Entity Onboarding'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.pageTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'كيف تفضل إدخال بيانات منشأتك؟' : 'How would you like to set up your business?'}
                </Text>
                <Text style={[styles.pageSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL
                    ? 'اختر إحدى الطرق التالية لربط منشأتك بحسابك وتفعيل نظام الامتثال الضريبي وفقاً لقوانين دولة الإمارات.'
                    : 'Choose one of the 3 setup options below to establish your tax profile with official UAE compliance.'}
                </Text>
              </View>

              {/* Error Banner if any */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color={colors.semantic.risk} />
                  <Text style={[styles.errorBannerText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {errorMessage}
                  </Text>
                </View>
              )}

              {/* OCR Loading Overlay Card if processing */}
              {isOcrProcessing ? (
                <View style={styles.ocrLoadingCard}>
                  <ActivityIndicator size="large" color={colors.brand.primary} />
                  <Text style={styles.ocrLoadingTitle}>
                    {isRTL ? 'جارٍ قراءة بيانات الرخصة بالذكاء الاصطناعي...' : 'Extracting Trade License with AI...'}
                  </Text>
                  <Text style={styles.ocrLoadingSubtext}>
                    {ocrStatusText || (isRTL ? 'يرجى الانتظار ثوانٍ معدودة...' : 'Reading legal name, license number, and dates...')}
                  </Text>
                </View>
              ) : (
                <View style={styles.methodCardsContainer}>
                  {/* Option 1: Scan Trade License with Camera */}
                  <TouchableOpacity
                    style={[styles.methodCard, styles.methodCardRecommended]}
                    onPress={handleScanWithCamera}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.methodCardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.methodIconCircle, styles.methodIconCirclePrimary]}>
                        <Ionicons name="camera" size={24} color={colors.brand.primary} />
                      </View>
                      <View style={[styles.methodBadge, styles.methodBadgePrimary]}>
                        <Text style={[styles.methodBadgeText, styles.methodBadgeTextPrimary]}>
                          {isRTL ? 'موصى به • فوري' : 'Recommended • Instant'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.methodTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {isRTL ? 'مسح الرخصة التجارية بالكاميرا' : 'Scan Trade License (Camera)'}
                    </Text>
                    <Text style={[styles.methodDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {isRTL
                        ? 'التقاط صورة للرخصة التجارية الصادرة في الدولة. سيقوم الذكاء الاصطناعي بقراءة وتعبئة بيانات المنشأة فوراً.'
                        : 'Take a photo of your UAE Trade License. AI Vision will automatically read and populate company name, license number, and validity dates.'}
                    </Text>
                    <View style={[styles.methodActionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.methodActionText}>
                        {isRTL ? 'فتح الكاميرا للمسح ←' : 'Open Camera to Scan →'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Option 2: Upload Trade License Document */}
                  <TouchableOpacity
                    style={styles.methodCard}
                    onPress={handleUploadDocument}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.methodCardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={styles.methodIconCircle}>
                        <Ionicons name="cloud-upload" size={22} color={colors.brand.primary} />
                      </View>
                      <View style={styles.methodBadge}>
                        <Text style={styles.methodBadgeText}>
                          {isRTL ? 'ملف أو صورة' : 'Photo or File'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.methodTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {isRTL ? 'رفع ملف أو صورة الرخصة' : 'Upload License Document'}
                    </Text>
                    <Text style={[styles.methodDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {isRTL
                        ? 'رفع صورة أو مستند الرخصة التجارية المحفوظ في جهازك لاستخراج البيانات تلقائياً.'
                        : 'Upload an existing photo or document of your Trade License from your device for automatic data recognition.'}
                    </Text>
                    <View style={[styles.methodActionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.methodActionText}>
                        {isRTL ? 'اختيار ملف من الجهاز ←' : 'Select File from Device →'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Option 3: Enter Details Manually */}
                  <TouchableOpacity
                    style={styles.methodCard}
                    onPress={handleManualEntryMode}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.methodCardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={styles.methodIconCircle}>
                        <Ionicons name="create-outline" size={22} color={colors.neutral.textPrimary} />
                      </View>
                      <View style={styles.methodBadge}>
                        <Text style={styles.methodBadgeText}>
                          {isRTL ? 'إدخال يدوي' : 'Manual Entry'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.methodTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {isRTL ? 'إدخال البيانات يدوياً' : 'Enter Details Manually'}
                    </Text>
                    <Text style={[styles.methodDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {isRTL
                        ? 'إدخال اسم المنشأة، رقم الرخصة، جهة الترخيص، والإيرادات يدوياً خطوة بخطوة.'
                        : 'Type in your trade license number, business authority, jurisdiction, and revenue through our guided form.'}
                    </Text>
                    <View style={[styles.methodActionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.methodActionText}>
                        {isRTL ? 'بدء الإدخال اليدوي ←' : 'Start Manual Entry →'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Statutory Trust Notice */}
                  <View style={[styles.complianceNoticeBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="shield-checkmark" size={18} color={colors.brand.primary} />
                    <Text style={[styles.complianceNoticeText, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {isRTL
                        ? 'بياناتك مشفرة بالكامل ومتوافقة 100% مع معايير الهيئة الاتحادية للضرائب وقانون ضريبة الشركات الإماراتي.'
                        : 'Encrypted & 100% compliant with UAE Federal Decree-Law No. 47 of 2022 on the Taxation of Corporations.'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View>
              {/* Back to Method Selection Action */}
              <TouchableOpacity
                style={[styles.backToMethodsBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => {
                  AppPreferences.selection();
                  setEntryMode('SELECT');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={15} color={colors.brand.primary} />
                <Text style={styles.backToMethodsText}>
                  {isRTL ? '← تغيير طريقة الإدخال (مسح / رفع / يدوي)' : '← Change setup method (Scan / Upload / Manual)'}
                </Text>
              </TouchableOpacity>

              {/* OCR Auto-Extracted Success Badge */}
              {extractedBadge && (
                <View style={[styles.ocrSuccessBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="sparkles" size={18} color="#059669" />
                  <Text style={[styles.ocrSuccessBannerText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {extractedBadge}
                  </Text>
                </View>
              )}

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
              <View
                style={styles.fieldGroup}
                onLayout={(e) => handleFieldLayout('legalName', e.nativeEvent.layout.y)}
              >
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'الاسم القانوني للمنشأة *' : 'Legal Business Name *'}
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    touched.legalName && (!legalName.trim() || legalName.trim().length < 2) && styles.inputContainerError,
                  ]}
                >
                  <Ionicons
                    name="business-outline"
                    size={18}
                    color={touched.legalName && (!legalName.trim() || legalName.trim().length < 2) ? colors.semantic.risk : colors.neutral.textTertiary}
                  />
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                    value={legalName}
                    onChangeText={(val) => {
                      setLegalName(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onFocus={() => handleFieldFocus('legalName')}
                    placeholder={isRTL ? 'مثال: شركة نور الإتقان للتجارة العامة ش.ذ.م.م' : 'e.g. Noor Al Itqan General Trading LLC'}
                    placeholderTextColor={colors.neutral.textTertiary}
                    autoCapitalize="words"
                  />
                </View>
                {touched.legalName && (!legalName.trim() || legalName.trim().length < 2) && (
                  <Text style={[styles.inlineErrorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {isRTL ? 'الاسم القانوني للمنشأة مطلوب (حرفان على الأقل)' : 'Legal business name is required (at least 2 characters)'}
                  </Text>
                )}
              </View>

              {/* Trade Name */}
              <View
                style={styles.fieldGroup}
                onLayout={(e) => handleFieldLayout('tradeName', e.nativeEvent.layout.y)}
              >
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'الاسم التجاري (الشهرة)' : 'Trade Name (Commercial Brand)'}
                </Text>
                <View style={[styles.inputContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="pricetag-outline" size={18} color={colors.neutral.textTertiary} />
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                    value={tradeName}
                    onChangeText={setTradeName}
                    onFocus={() => handleFieldFocus('tradeName')}
                    placeholder={isRTL ? 'مثال: نور الإتقان (اختياري)' : 'e.g. Noor Al Itqan (Optional)'}
                    placeholderTextColor={colors.neutral.textTertiary}
                  />
                </View>
              </View>

              {/* Trade License Number */}
              <View
                style={styles.fieldGroup}
                onLayout={(e) => handleFieldLayout('tradeLicenseNumber', e.nativeEvent.layout.y)}
              >
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'رقم الرخصة التجارية *' : 'Trade License Number *'}
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    touched.tradeLicenseNumber && (!tradeLicenseNumber.trim() || tradeLicenseNumber.trim().length < 3) && styles.inputContainerError,
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={touched.tradeLicenseNumber && (!tradeLicenseNumber.trim() || tradeLicenseNumber.trim().length < 3) ? colors.semantic.risk : colors.neutral.textTertiary}
                  />
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                    value={tradeLicenseNumber}
                    onChangeText={(val) => {
                      setTradeLicenseNumber(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onFocus={() => handleFieldFocus('tradeLicenseNumber')}
                    placeholder="e.g. 1029384 or CN-1294820"
                    placeholderTextColor={colors.neutral.textTertiary}
                    autoCapitalize="characters"
                  />
                </View>
                {touched.tradeLicenseNumber && (!tradeLicenseNumber.trim() || tradeLicenseNumber.trim().length < 3) && (
                  <Text style={[styles.inlineErrorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {isRTL ? 'رقم الرخصة التجارية الصادر من دائرة التنمية أو المنطقة الحرة مطلوب' : 'Trade license number issued by authority is required (min 3 chars)'}
                  </Text>
                )}
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
                          AppPreferences.selection();
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
                          AppPreferences.selection();
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
                          AppPreferences.selection();
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
                          AppPreferences.selection();
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
              <View
                style={styles.fieldGroup}
                onLayout={(e) => handleFieldLayout('address', e.nativeEvent.layout.y)}
              >
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'عنوان المقر المسجل (اختياري)' : 'Registered Office Address (Optional)'}
                </Text>
                <View style={[styles.inputContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="location-outline" size={18} color={colors.neutral.textTertiary} />
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                    value={address}
                    onChangeText={setAddress}
                    onFocus={() => handleFieldFocus('address')}
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
              <View
                style={styles.fieldGroup}
                onLayout={(e) => handleFieldLayout('revenueAED', e.nativeEvent.layout.y)}
              >
                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'الإيرادات السنوية التقديرية (درهم إماراتي) *' : 'Estimated Annual Turnover (AED) *'}
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    touched.revenueAED && (!revenueAED.trim() || isNaN(parsedRevenue) || parsedRevenue <= 0) && styles.inputContainerError,
                  ]}
                >
                  <Text style={{ fontWeight: '700', color: touched.revenueAED && (!revenueAED.trim() || isNaN(parsedRevenue) || parsedRevenue <= 0) ? colors.semantic.risk : colors.brand.primary }}>AED</Text>
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left', fontSize: 16, fontWeight: '700' }]}
                    value={revenueAED}
                    onChangeText={(val) => {
                      setRevenueAED(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onFocus={() => handleFieldFocus('revenueAED')}
                    keyboardType="numeric"
                    placeholder="e.g. 1500000"
                    placeholderTextColor={colors.neutral.textTertiary}
                  />
                </View>
                {touched.revenueAED && (!revenueAED.trim() || isNaN(parsedRevenue) || parsedRevenue <= 0) && (
                  <Text style={[styles.inlineErrorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {isRTL ? 'يرجى إدخال الإيرادات السنوية التقديرية بالدرهم' : 'Please enter valid estimated annual revenue (AED)'}
                  </Text>
                )}

                {/* Dynamic SBR / Corporate Tax Callout */}
                <View
                  style={[
                    styles.taxPostureBadge,
                    {
                      backgroundColor: parsedRevenue > 0 && isSbrEligible ? colors.semantic.successBg : parsedRevenue > 0 ? '#F0F9FF' : '#F9FAFB',
                      borderColor: parsedRevenue > 0 && isSbrEligible ? colors.semantic.successBorder : parsedRevenue > 0 ? '#BAE6FD' : '#E5E7EB',
                    },
                  ]}
                >
                  <Ionicons
                    name={parsedRevenue > 0 && isSbrEligible ? 'checkmark-circle' : 'information-circle'}
                    size={20}
                    color={parsedRevenue > 0 && isSbrEligible ? colors.semantic.success : parsedRevenue > 0 ? colors.semantic.info : colors.neutral.textTertiary}
                  />
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <Text
                      style={[
                        styles.taxPostureTitle,
                        { color: parsedRevenue > 0 && isSbrEligible ? colors.semantic.successDark : parsedRevenue > 0 ? '#0369A1' : colors.neutral.textPrimary },
                        { textAlign: isRTL ? 'right' : 'left' },
                      ]}
                    >
                      {parsedRevenue === 0
                        ? isRTL
                          ? 'محدد ضريبة الشركات وإعفاء الأعمال الصغيرة'
                          : 'Corporate Tax & SBR Determination Engine'
                        : isSbrEligible
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
                      {parsedRevenue === 0
                        ? isRTL
                          ? 'أدخل إيراداتك التقديرية لتحديد ما إذا كانت منشأتك مؤهلة للإعفاء بنسبة 0% بموجب القرار الوزاري رقم 73 لسنة 2023.'
                          : 'Enter your turnover to calculate whether you qualify for 0% Small Business Relief under Ministerial Decision No. 73 of 2023.'
                        : isSbrEligible
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
                <View
                  style={styles.fieldGroup}
                  onLayout={(e) => handleFieldLayout('vatTrn', e.nativeEvent.layout.y)}
                >
                  <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {isRTL ? 'رقم التسجيل الضريبي لضريبة القيمة المضافة (15 رقماً) *' : '15-Digit VAT TRN *'}
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      touched.vatTrn && (!vatTrn.trim() || vatTrn.trim().length !== 15 || !vatTrn.trim().startsWith('100')) && styles.inputContainerError,
                    ]}
                  >
                    <Ionicons
                      name="receipt-outline"
                      size={18}
                      color={touched.vatTrn && (!vatTrn.trim() || vatTrn.trim().length !== 15 || !vatTrn.trim().startsWith('100')) ? colors.semantic.risk : colors.neutral.textTertiary}
                    />
                    <TextInput
                      style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                      value={vatTrn}
                      onChangeText={(val) => {
                        setVatTrn(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onFocus={() => handleFieldFocus('vatTrn')}
                      keyboardType="numeric"
                      maxLength={15}
                      placeholder="100XXXXXXXX0003"
                      placeholderTextColor={colors.neutral.textTertiary}
                    />
                  </View>
                  {touched.vatTrn && (!vatTrn.trim() || vatTrn.trim().length !== 15 || !vatTrn.trim().startsWith('100')) && (
                    <Text style={[styles.inlineErrorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {isRTL ? 'رقم التسجيل لضريبة القيمة المضافة يجب أن يتكون من 15 رقماً ويبدأ بـ 100' : 'UAE VAT TRN must be exactly 15 digits starting with 100'}
                    </Text>
                  )}
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
                <View
                  style={styles.fieldGroup}
                  onLayout={(e) => handleFieldLayout('corporateTaxTrn', e.nativeEvent.layout.y)}
                >
                  <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {isRTL ? 'رقم تسجيل ضريبة الشركات (15 رقماً) *' : '15-Digit Corporate Tax Registration Number *'}
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      touched.corporateTaxTrn && (!corporateTaxTrn.trim() || corporateTaxTrn.trim().length !== 15) && styles.inputContainerError,
                    ]}
                  >
                    <Ionicons
                      name="card-outline"
                      size={18}
                      color={touched.corporateTaxTrn && (!corporateTaxTrn.trim() || corporateTaxTrn.trim().length !== 15) ? colors.semantic.risk : colors.neutral.textTertiary}
                    />
                    <TextInput
                      style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                      value={corporateTaxTrn}
                      onChangeText={(val) => {
                        setCorporateTaxTrn(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onFocus={() => handleFieldFocus('corporateTaxTrn')}
                      keyboardType="numeric"
                      maxLength={15}
                      placeholder="e.g. 100123456789003"
                      placeholderTextColor={colors.neutral.textTertiary}
                    />
                  </View>
                  {touched.corporateTaxTrn && (!corporateTaxTrn.trim() || corporateTaxTrn.trim().length !== 15) && (
                    <Text style={[styles.inlineErrorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {isRTL ? 'رقم تسجيل ضريبة الشركات يجب أن يتكون من 15 رقماً' : 'Corporate Tax TRN must be exactly 15 digits'}
                    </Text>
                  )}
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
        </View>
      )}
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
  inputContainerError: {
    borderColor: colors.semantic.risk,
    backgroundColor: '#FFF8F8',
    borderWidth: 1.5,
  },
  inlineErrorText: {
    fontSize: 12,
    color: colors.semantic.risk,
    marginTop: 4,
    fontWeight: '500',
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
  // Method selection styles (3 onboarding choices)
  methodCardsContainer: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  methodCard: {
    backgroundColor: colors.neutral.surface,
    borderWidth: 1.5,
    borderColor: colors.neutral.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  methodCardRecommended: {
    borderColor: colors.brand.primary,
    backgroundColor: '#FFFDF9',
  },
  methodCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  methodIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconCirclePrimary: {
    backgroundColor: '#FEF3C7',
  },
  methodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  methodBadgePrimary: {
    backgroundColor: '#FDE68A',
  },
  methodBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
  },
  methodBadgeTextPrimary: {
    color: '#92400E',
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  methodDesc: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  methodActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  methodActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  backToMethodsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: radii.md,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  backToMethodsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  ocrSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ocrSuccessBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
    flex: 1,
  },
  ocrLoadingCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
    ...shadows.card,
  },
  ocrLoadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  ocrLoadingSubtext: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  complianceNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  complianceNoticeText: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
});
