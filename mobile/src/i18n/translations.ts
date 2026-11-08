// ============================================================================
// Mizan (ميزان) - Bilingual Dictionary (English & Arabic)
// Complete translations covering Tax Intelligence, Compliance & Books
// ============================================================================

export type Locale = 'en' | 'ar';

export interface TranslationSchema {
  appName: string;
  tagline: string;
  tabs: {
    home: string;
    books: string;
    invoicing: string;
    tax: string;
    more: string;
  };
  home: {
    greeting: string;
    defaultUser: string;
    readinessSubtitle: string;
    healthCheckBannerTitle: string;
    healthCheckBannerDesc: string;
    startAssessment: string;
    estimatedTaxLiability: string;
    basedOnRecords: string;
    corporateTaxLabel: string;
    netVatPayableLabel: string;
    sbrStatusTag: string;
    revenueStat: string;
    expensesStat: string;
    taxSavingsFound: string;
    complianceActions: string;
    opportunitiesCount: string;
    actionsCount: string;
    penaltyShieldTitle: string;
    penaltyShieldDesc: string;
    daysRemaining: string;
    penaltyAmountRisk: string;
    startAssistedFiling: string;
    quickActionsTitle: string;
    scanLicence: string;
    scanReceipt: string;
    newInvoice: string;
    askAi: string;
    upcomingDeadlines: string;
    vatReturnQuarterly: string;
    vatReturnDueDate: string;
    tradeLicenceRenewal: string;
    tradeLicenceDueDate: string;
    topOpportunities: string;
    viewAll: string;
    sbrTitle: string;
    sbrDesc: string;
    sbrSavings: string;
    rcmTitle: string;
    rcmDesc: string;
    rcmSavings: string;
  };
  tax: {
    title: string;
    ctTab: string;
    vatTab: string;
    optTab: string;
    reportsTab: string;
    taxableIncome: string;
    statutoryRate: string;
    exemptThreshold: string;
    exportHealthReport: string;
    likelyCompliant: string;
    complianceChecklist: string;
    keyDeadlines: string;
  };
  learn: {
    title: string;
    badge: string;
    assistantTitle: string;
    groundedInLaw: string;
    assistantDesc: string;
    inputPlaceholder: string;
    askButton: string;
    learningPaths: string;
    statutoryCitation: string;
    statutoryRationale: string;
    actionRequired: string;
    emaraTaxImpact: string;
    suggestedQuestions: string;
    clearChat: string;
    backToAcademy: string;
  };
  profile: {
    title: string;
    manageEntities: string;
    switchEntity: string;
    addEntity: string;
    activeEntity: string;
    tradeLicenseNo: string;
    vatTrn: string;
    ctTrn: string;
    legalForm: string;
    authority: string;
    annualTurnover: string;
    taxRegime: string;
    settings: string;
    language: string;
    currentLanguage: string;
    security: string;
    biometricsActive: string;
    documentVault: string;
    documentsCount: string;
  };
  common: {
    aed: string;
    confirm: string;
    cancel: string;
    save: string;
    edit: string;
    verified: string;
    pending: string;
    currency: string;
    switchLanguage: string;
  };
}

export const translations: Record<Locale, TranslationSchema> = {
  en: {
    appName: 'Mizan',
    tagline: 'UAE Tax Intelligence & Financial Management',
    tabs: {
      home: 'Home',
      books: 'Bookkeeping',
      invoicing: 'Invoicing',
      tax: 'Tax & Filings',
      more: 'More',
    },
    home: {
      greeting: 'Good morning,',
      defaultUser: 'Hamza',
      readinessSubtitle: "Let's check your UAE tax readiness.",
      healthCheckBannerTitle: 'UAE Business Tax Health Check',
      healthCheckBannerDesc: 'Scan your trade licence, answer a few questions and get a preliminary CT & VAT readiness report.',
      startAssessment: 'Start Assessment',
      estimatedTaxLiability: 'ESTIMATED TAX LIABILITY',
      basedOnRecords: 'Based on current financial records',
      corporateTaxLabel: 'Corporate Tax',
      netVatPayableLabel: 'Net VAT Payable',
      sbrStatusTag: 'SBR Eligible (0%)',
      revenueStat: 'Revenue',
      expensesStat: 'Expenses',
      taxSavingsFound: 'Tax Savings Found',
      complianceActions: 'Compliance Actions',
      opportunitiesCount: '3 opportunities',
      actionsCount: '2 actions required',
      penaltyShieldTitle: 'Corporate Tax Registration Deadline',
      penaltyShieldDesc: 'Your license was issued in May. Submit your EmaraTax application by 31 July to avoid the statutory AED 10,000 late registration penalty under FTA Decision No. 3 of 2024.',
      daysRemaining: '14 Days Remaining',
      penaltyAmountRisk: 'AED 10,000 Penalty Risk',
      startAssistedFiling: 'Start Assisted Registration',
      quickActionsTitle: 'Quick Actions',
      scanLicence: 'Scan Licence',
      scanReceipt: 'Scan Receipt',
      newInvoice: 'New Invoice',
      askAi: 'Ask Tax AI',
      upcomingDeadlines: 'Upcoming Deadlines',
      vatReturnQuarterly: 'Q2 VAT Return (Form 201)',
      vatReturnDueDate: 'Due 28 August 2026',
      tradeLicenceRenewal: 'Trade Licence Renewal (DET)',
      tradeLicenceDueDate: 'Due 15 January 2027',
      topOpportunities: 'Legitimate Tax Optimisation',
      viewAll: 'View All',
      sbrTitle: 'Small Business Relief (Art. 21)',
      sbrDesc: 'Revenue <= AED 3M qualifies for 0% Corporate Tax relief through 2029.',
      sbrSavings: 'Save AED 22,500',
      rcmTitle: 'Foreign SaaS VAT Neutrality',
      rcmDesc: 'Input tax on imported AWS & Google software fully claimed in Box 10.',
      rcmSavings: 'AED 1,836 Recovered',
    },
    tax: {
      title: 'Tax Intelligence',
      ctTab: 'Corporate Tax',
      vatTab: 'VAT Return',
      optTab: 'Optimisation',
      reportsTab: 'Reports',
      taxableIncome: 'Taxable Income',
      statutoryRate: 'Standard Rate: 9% above AED 375,000',
      exemptThreshold: '0% below AED 375,000',
      exportHealthReport: 'Download Tax Health Report',
      likelyCompliant: 'Likely Compliant',
      complianceChecklist: 'Compliance Checklist',
      keyDeadlines: 'Key Deadlines',
    },
    learn: {
      title: 'Tax Academy & AI',
      badge: 'Tax Academy',
      assistantTitle: 'Ask Mizan Tax Assistant',
      groundedInLaw: 'Grounded in UAE Law',
      assistantDesc: 'Instant statutory guidance on Corporate Tax, VAT exemptions, Decision 17 travel rules, and QFZP criteria.',
      inputPlaceholder: 'Ask any UAE tax question...',
      askButton: 'Ask',
      learningPaths: 'Learning Paths',
      statutoryCitation: 'Official Statutory Citation',
      statutoryRationale: 'Statutory Authority',
      actionRequired: 'Action Required',
      emaraTaxImpact: 'EmaraTax Return Impact',
      suggestedQuestions: 'Suggested Follow-up Questions',
      clearChat: 'Clear History',
      backToAcademy: 'Back to Academy',
    },
    profile: {
      title: 'Business Profile & Entities',
      manageEntities: 'Registered UAE Businesses',
      switchEntity: 'Switch Active Entity',
      addEntity: '+ Scan New Trade Licence',
      activeEntity: 'Active Entity',
      tradeLicenseNo: 'Trade Licence No',
      vatTrn: 'VAT TRN',
      ctTrn: 'Corporate Tax TRN',
      legalForm: 'Legal Entity Form',
      authority: 'Licensing Authority',
      annualTurnover: 'Estimated Revenue',
      taxRegime: 'Tax Posture',
      settings: 'App & Security Preferences',
      language: 'Language / اللغة',
      currentLanguage: 'English (Tap to switch)',
      security: 'Biometrics & Security',
      biometricsActive: 'Face ID & UAE Pass Enabled',
      documentVault: 'Statutory Document Vault',
      documentsCount: 'Trade Licenses, TRNs & Leases',
    },
    common: {
      aed: 'AED',
      confirm: 'Confirm & Continue',
      cancel: 'Cancel',
      save: 'Save',
      edit: 'Edit',
      verified: 'Verified',
      pending: 'Pending',
      currency: 'AED',
      switchLanguage: 'العربية',
    }
  },

  ar: {
    appName: 'ميزان',
    tagline: 'ذكاء الضرائب والإدارة المالية في دولة الإمارات',
    tabs: {
      home: 'الرئيسية',
      books: 'المحاسبة',
      invoicing: 'الفواتير',
      tax: 'الضرائب والإقرارات',
      more: 'المزيد',
    },
    home: {
      greeting: 'صباح الخير،',
      defaultUser: 'حمزة',
      readinessSubtitle: 'دعنا نتحقق من جاهزيتك الضريبية في الإمارات.',
      healthCheckBannerTitle: 'الفحص الضريبي للشركات الإماراتية',
      healthCheckBannerDesc: 'امسح رخصتك التجارية ضوئياً، وأجب عن بضعة أسئلة للحصول على تقرير الجاهزية لضريبة الشركات والقيمة المضافة.',
      startAssessment: 'بدء الفحص الضريبي',
      estimatedTaxLiability: 'الالتزام الضريبي التقديري',
      basedOnRecords: 'بناءً على السجلات المالية الحالية',
      corporateTaxLabel: 'ضريبة الشركات',
      netVatPayableLabel: 'صافي ضريبة القيمة المضافة',
      sbrStatusTag: 'مؤهل لإعفاء الأعمال الصغيرة (0%)',
      revenueStat: 'الإيرادات',
      expensesStat: 'المصروفات',
      taxSavingsFound: 'وفورات ضريبية مكتشفة',
      complianceActions: 'إجراءات الامتثال',
      opportunitiesCount: '3 فرص قانونية',
      actionsCount: 'إجراءان مطلوبان',
      penaltyShieldTitle: 'الموعد النهائي للتسجيل لضريبة الشركات',
      penaltyShieldDesc: 'تم إصدار رخصتك في شهر مايو. يرجى تقديم طلب التسجيل عبر منصة إمارات تاكس قبل 31 يوليو لتجنب الغرامة القانونية البالغة 10,000 درهم وفقاً لقرار الهيئة رقم 3 لسنة 2024.',
      daysRemaining: 'متبقي 14 يوماً',
      penaltyAmountRisk: 'خطر غرامة 10,000 درهم',
      startAssistedFiling: 'بدء التسجيل بمساعدة النظام',
      quickActionsTitle: 'إجراءات سريعة',
      scanLicence: 'مسح الرخصة',
      scanReceipt: 'مسح إيصال',
      newInvoice: 'فاتورة ضريبية',
      askAi: 'المستشار الذكي',
      upcomingDeadlines: 'المواعيد النهائية القادمة',
      vatReturnQuarterly: 'إقرار القيمة المضافة للربع الثاني (نموذج 201)',
      vatReturnDueDate: 'يستحق في 28 أغسطس 2026',
      tradeLicenceRenewal: 'تجديد الرخصة التجارية (اقتصادية دبي)',
      tradeLicenceDueDate: 'يستحق في 15 يناير 2027',
      topOpportunities: 'التحسين الضريبي القانوني',
      viewAll: 'عرض الكل',
      sbrTitle: 'إعفاء الأعمال الصغيرة (المادة 21)',
      sbrDesc: 'الإيرادات أقل من 3 ملايين درهم مؤهلة لمعدل ضريبة 0% حتى نهاية 2029.',
      sbrSavings: 'وفر 22,500 درهم',
      rcmTitle: 'آلية الاحتساب العكسي لخدمات السحابة الأجنبية',
      rcmDesc: 'استرداد ضريبة المدخلات على برمجيات AWS وجوجل بالكامل في الصندوق 10.',
      rcmSavings: 'تم استرداد 1,836 درهم',
    },
    tax: {
      title: 'ذكاء الضرائب',
      ctTab: 'ضريبة الشركات',
      vatTab: 'إقرار القيمة المضافة',
      optTab: 'التحسين الضريبي',
      reportsTab: 'التقارير',
      taxableIncome: 'الدخل الخاضع للضريبة',
      statutoryRate: 'النسبة القانونية: 9% على ما زاد عن 375,000 درهم',
      exemptThreshold: '0% على ما دون 375,000 درهم',
      exportHealthReport: 'تحميل تقرير الجاهزية الضريبية',
      likelyCompliant: 'ممتثل على الأرجح',
      complianceChecklist: 'قائمة التحقق من الامتثال',
      keyDeadlines: 'المواعيد الهامة',
    },
    learn: {
      title: 'أكاديمية الضرائب والمساعد',
      badge: 'أكاديمية الضرائب',
      assistantTitle: 'اسأل مساعد ميزان الضريبي',
      groundedInLaw: 'مستند إلى القوانين الاتحادية',
      assistantDesc: 'إجابات فورية موثقة حول ضريبة الشركات، استرداد ضريبة القيمة المضافة، والقرار 17.',
      inputPlaceholder: 'اطرح أي سؤال ضريبي باللغة العربية أو الإنجليزية...',
      askButton: 'إرسال',
      learningPaths: 'المسارات التعليمية',
      statutoryCitation: 'السند القانوني الرسمي',
      statutoryRationale: 'المرجعية التشريعية',
      actionRequired: 'الإجراء المطلوب',
      emaraTaxImpact: 'الأثر في منصة إمارات تاكس',
      suggestedQuestions: 'أسئلة مقترحة',
      clearChat: 'مسح المحادثة',
      backToAcademy: 'العودة للأكاديمية',
    },
    profile: {
      title: 'الملف التجاري والمنشآت',
      manageEntities: 'المنشآت التجارية المسجلة',
      switchEntity: 'تبديل المنشأة النشطة',
      addEntity: '+ مسح رخصة تجارية جديدة',
      activeEntity: 'المنشأة الحالية',
      tradeLicenseNo: 'رقم الرخصة التجارية',
      vatTrn: 'الرقم الضريبي (القيمة المضافة)',
      ctTrn: 'رقم ضريبة الشركات',
      legalForm: 'الشكل القانوني',
      authority: 'جهة الترخيص',
      annualTurnover: 'الإيرادات التقديرية',
      taxRegime: 'النظام الضريبي المطبق',
      settings: 'إعدادات التطبيق والأمان',
      language: 'اللغة / Language',
      currentLanguage: 'العربية (اضغط للتبديل)',
      security: 'الأمان والمصادقة البيومترية',
      biometricsActive: 'بصمة الوجه والهوية الرقمية مفعلة',
      documentVault: 'خزنة المستندات الرسمية',
      documentsCount: 'الرخص والشهادات وعقود الإيجار',
    },
    common: {
      aed: 'د.إ',
      confirm: 'تأكيد ومتابعة',
      cancel: 'إلغاء',
      save: 'حفظ',
      edit: 'تعديل',
      verified: 'تم التحقق',
      pending: 'معلق',
      currency: 'د.إ',
      switchLanguage: 'English',
    }
  }
};
