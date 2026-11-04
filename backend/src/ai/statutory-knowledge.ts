// ============================================================================
// Mizan (ميزان) - Official UAE Statutory Knowledge Base for RAG
// Verified Decree-Laws, Cabinet Decisions, Ministerial Decisions & FTA Rules
// ============================================================================

export interface StatutoryCitation {
  id: string;
  authority: 'FEDERAL_DECREE_LAW' | 'CABINET_DECISION' | 'MINISTERIAL_DECISION' | 'FTA_DECISION' | 'MOF_MANDATE';
  officialNumber: string;
  article: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  keyKeywords: string[];
  actionAdviceEn: string;
  actionAdviceAr: string;
  emaraTaxImpact?: string;
  suggestedFollowUpsEn: string[];
  suggestedFollowUpsAr: string[];
}

export const UAE_STATUTORY_KNOWLEDGE: StatutoryCitation[] = [
  {
    id: 'ct-sbr-art21',
    authority: 'MINISTERIAL_DECISION',
    officialNumber: 'Ministerial Decision No. 73 of 2023 (Extended to 2029)',
    article: 'Article 21 & MD 73/2023',
    titleEn: 'Small Business Relief (SBR)',
    titleAr: 'تسهيلات الأعمال الصغيرة',
    summaryEn:
      'Taxable persons with gross revenue of AED 3,000,000 or less in the relevant and prior tax periods can elect Small Business Relief, treating taxable income as AED 0. Extended by the Ministry of Finance to tax periods ending on or before 31 December 2029.',
    summaryAr:
      'يمكن للخاضعين للضريبة الذين تقل إيراداتهم عن 3,000,000 درهم في الفترة الحالية والسابقة اختيار تسهيلات الأعمال الصغيرة، بحيث يُعامل الدخل الخاضع للضريبة كـ 0 درهم حتى 31 ديسمبر 2029.',
    keyKeywords: ['small business relief', 'sbr', '3 million', '3000000', 'relief', 'revenue threshold', 'إعفاء', 'تسهيلات', 'أعمال صغيرة'],
    actionAdviceEn: 'Elect SBR in your annual Corporate Tax return on EmaraTax before your 9-month filing deadline. Retain revenue ledgers verifying gross sales stay below AED 3,000,000.',
    actionAdviceAr: 'قم باختيار تسهيلات الأعمال الصغيرة في إقرار ضريبة الشركات السنوي عبر منصة إمارات تاكس قبل انتهاء مهلة الـ 9 أشهر.',
    emaraTaxImpact: 'Corporate Tax Return -> Small Business Relief Election Checkbox',
    suggestedFollowUpsEn: [
      'Do I still need to submit a tax return if I elect SBR?',
      'Can a Free Zone company claim Small Business Relief?',
      'What happens if my revenue exceeds AED 3 million mid-year?'
    ],
    suggestedFollowUpsAr: [
      'هل ما زلت بحاجة لتقديم إقرار ضريبي إذا اخترت تسهيلات الأعمال الصغيرة؟',
      'هل يمكن لشركة منطقة حرة الاستفادة من تسهيلات الأعمال الصغيرة؟',
      'ماذا يحدث إذا تجاوزت إيراداتي 3 ملايين درهم خلال العام؟'
    ]
  },
  {
    id: 'ct-natural-person-cd49',
    authority: 'CABINET_DECISION',
    officialNumber: 'Cabinet Decision No. 49 of 2023',
    article: 'Cabinet Decision No. 49 of 2023',
    titleEn: 'Corporate Tax for Natural Persons (Freelancers & Sole Proprietors)',
    titleAr: 'ضريبة الشركات للأشخاص الطبيعيين (المستقلين والمؤسسات الفردية)',
    summaryEn:
      'Natural persons (freelancers, sole proprietorships) are subject to UAE Corporate Tax only if gross turnover derived from commercial business activities conducted in the UAE exceeds AED 1,000,000 within a calendar year. Personal employment wages/salaries, passive personal investment income, and personal real estate income are statutorily excluded.',
    summaryAr:
      'يخضع الشخص الطبيعي لضريبة الشركات فقط إذا تجاوزت إيرادات أعماله التجارية في الدولة 1,000,000 درهم خلال السنة الميلادية. وتُستثنى الرواتب الشخصية وعوائد الاستثمارات الشخصية والعقارات.',
    keyKeywords: ['freelancer', 'natural person', 'salary', '1 million', '1000000', 'individual', 'employment', 'مستقل', 'شخص طبيعي', 'راتب'],
    actionAdviceEn: 'Track your commercial trading revenue independently from your personal savings and wage slips. Only register for Corporate Tax once gross turnover exceeds AED 1M.',
    actionAdviceAr: 'قم بتتبع إيرادات نشاطك التجاري بمعزل عن راتبك الشخصي. يلزم التسجيل فقط عند تجاوز 1,000,000 درهم.',
    emaraTaxImpact: 'EmaraTax -> Natural Person Corporate Tax Registration',
    suggestedFollowUpsEn: [
      'Does my UAE employment salary count towards the AED 1M threshold?',
      'Are freelance permits in Dubai or Abu Dhabi taxable?',
      'Can natural persons elect Small Business Relief up to AED 3M?'
    ],
    suggestedFollowUpsAr: [
      'هل يُحتسب راتب وظيفتي الحكومية أو الخاصة ضمن سقف المليون درهم؟',
      'هل تخضع تصاريح العمل الحر في دبي أو أبوظبي للضريبة؟',
      'هل يحق للشخص الطبيعي الاستفادة من تسهيلات الأعمال الصغيرة حتى 3 ملايين؟'
    ]
  },
  {
    id: 'ct-penalty-ftadec3',
    authority: 'FTA_DECISION',
    officialNumber: 'FTA Decision No. 3 of 2024 & Cabinet Decision No. 75 of 2023',
    article: 'Decision No. 3 of 2024',
    titleEn: 'Staggered Corporate Tax Registration Deadlines & Late Penalties',
    titleAr: 'المواعيد المحددة لتسجيل ضريبة الشركات وغرامات التأخير',
    summaryEn:
      'Taxable persons must submit Corporate Tax registration applications based on their trade license issuance month. Failure to apply within the statutory deadline incurs an administrative penalty of AED 10,000 under Cabinet Decision No. 75 of 2023.',
    summaryAr:
      'يتعين على الخاضعين للضريبة تقديم طلب التسجيل لضريبة الشركات وفقاً لشهر إصدار الرخصة التجارية. ويترتب على التأخر في التقديم غرامة إدارية قدرها 10,000 درهم بموجب قرار مجلس الوزراء رقم 75 لسنة 2023.',
    keyKeywords: ['penalty', '10000', 'late registration', 'deadline', 'emaratax', 'license month', 'fine', 'غرامة', 'تأخير', 'تسجيل'],
    actionAdviceEn: 'Check your trade license issue month immediately. Submit your registration via EmaraTax before the statutory deadline to prevent an automated AED 10,000 penalty.',
    actionAdviceAr: 'تحقق من شهر إصدار رخصتك التجارية وقدم طلب التسجيل عبر إمارات تاكس لتجنب الغرامة التلقائية بقيمة 10,000 درهم.',
    emaraTaxImpact: 'EmaraTax Corporate Tax Account -> Penalties & Assessment Notice',
    suggestedFollowUpsEn: [
      'How do I request a penalty waiver for late Corporate Tax registration?',
      'What is the registration deadline for my specific license month?',
      'Can newly incorporated 2025/2026 companies register after 3 months?'
    ],
    suggestedFollowUpsAr: [
      'كيف أقدم طلب إعادة نظر أو إعفاء من غرامة التأخير 10,000 درهم؟',
      'ما هو الموعد النهائي لتسجيل رخصتي الصادرة في شهر معين؟',
      'ما هي مهلة التسجيل للشركات الجديدة المؤسسة حديثاً؟'
    ]
  },
  {
    id: 'vat-employee-exp-dec17',
    authority: 'FTA_DECISION',
    officialNumber: 'FTA Decision No. 17 of 2026',
    article: 'Decision No. 17 of 2026',
    titleEn: 'Input VAT Recovery on Employee Expenses & Business Travel',
    titleAr: 'استرداد ضريبة المدخلات على نفقات الموظفين وسفر العمل',
    summaryEn:
      'Input VAT incurred on employee travel, accommodation, transport, and equipment is 100% recoverable if mandated by UAE Labour Law, required under contractual employment policies, or strictly necessary for duty performance. Personal benefits and family perks remain blocked under Article 53.',
    summaryAr:
      'تُسترد ضريبة المدخلات بنسبة 100% على نفقات سفر وإقامة الموظفين إذا كانت ملزمة بموجب قانون العمل أو سياسة التوظيف أو لأداء المهام. وتظل المزايا الشخصية غير قابلة للاسترداد وفقاً للمادة 53.',
    keyKeywords: ['employee', 'hotel', 'travel', 'decision 17', 'decision no 17', 'duty travel', 'expense recovery', 'موظف', 'سفر', 'استرداد'],
    actionAdviceEn: 'Ensure tax invoices have your business TRN or keep documented internal HR expense reimbursement claims linking travel directly to customer meetings or operations.',
    actionAdviceAr: 'تأكد من اشتمال الفاتورة على الرقم الضريبي للشركة أو إرفاق مستندات الموارد البشرية التي تثبت ارتباط السفر بأعمال الشركة.',
    emaraTaxImpact: 'VAT 201 Return -> Box 9 (Standard-rated expenses)',
    suggestedFollowUpsEn: [
      'Are employee meals during business trips 100% recoverable or capped?',
      'Can I recover VAT on employee flight tickets and visa medicals?',
      'What documentation does the FTA audit require for employee hotel stays?'
    ],
    suggestedFollowUpsAr: [
      'هل وجبات الموظفين أثناء سفر العمل مستردة بالكامل أم مقيدة؟',
      'هل يمكن استرداد الضريبة على تذاكر السفر والفحوصات الطبية للإقامة؟',
      'ما هي المستندات المطلوبة للتدقيق الضريبي عند استرداد فنادق الموظفين؟'
    ]
  },
  {
    id: 'vat-entertainment-art53',
    authority: 'FEDERAL_DECREE_LAW',
    officialNumber: 'Executive Regulations of Decree-Law No. 8 of 2017',
    article: 'Article 53(1)(a) & Article 32 CT',
    titleEn: 'Blocked Input VAT on Client Entertainment & 50% CT Cap',
    titleAr: 'حظر استرداد ضريبة الترفيه وسقف 50% لضريبة الشركات',
    summaryEn:
      'Under Article 53(1)(a), input VAT on client entertainment, hospitality, and meals is 0% recoverable (blocked). Additionally, for Corporate Tax under Article 32 of Law No. 47 of 2022, only 50% of client entertainment expenses is deductible, with the remaining 50% added back to taxable income.',
    summaryAr:
      'بموجب المادة 53(1)(أ)، لا يمكن استرداد ضريبة المدخلات على نفقات ترفيه وضيافة العملاء (محظورة بنسبة 0%). ولضريبة الشركات، يُسمح بخصم 50% فقط من النفقات بموجب المادة 32 ويُضاف الباقي للدخل الخاضع للضريبة.',
    keyKeywords: ['entertainment', 'hospitality', 'dinner', 'restaurant', 'blocked', '50%', 'ضيافة', 'ترفيه', 'مطعم', 'حظر'],
    actionAdviceEn: 'Do not claim 5% input VAT on client dinners in VAT Return Box 9. In your Corporate Tax computation, automatically add back 50% to your accounting net profit.',
    actionAdviceAr: 'لا تطالب بضريبة الـ 5% في الصندوق 9 لعزائم العملاء. وفي حساب ضريبة الشركات أضف 50% من النفقات إلى الأرباح المحاسبية.',
    emaraTaxImpact: 'Corporate Tax Form -> Disallowed Entertainment Add-back (Article 32)',
    suggestedFollowUpsEn: [
      'Is coffee/tea provided to clients in the office considered entertainment?',
      'How does the 50% rule apply to staff parties or annual dinners?',
      'Can we claim VAT on client corporate gifts branded with our logo?'
    ],
    suggestedFollowUpsAr: [
      'هل تقديم الشاي والقهوة للعملاء في المكتب يعتبر ترفيهاً محظوراً؟',
      'كيف تنطبق قاعدة الـ 50% على الحفل السنوي للموظفين؟',
      'هل نسترد الضريبة على هدايا العملاء الترويجية التي تحمل شعار الشركة؟'
    ]
  },
  {
    id: 'vat-rcm-saas-art48',
    authority: 'FEDERAL_DECREE_LAW',
    officialNumber: 'Federal Decree-Law No. 8 of 2017',
    article: 'Article 48 (Reverse Charge Mechanism)',
    titleEn: 'Reverse Charge Mechanism (RCM) for Foreign Cloud & SaaS Services',
    titleAr: 'آلية الاحتساب العكسي للخدمات السحابية والبرمجيات الأجنبية',
    summaryEn:
      'UAE businesses purchasing digital services from foreign suppliers (e.g., AWS, Google Workspace, Zoom, OpenAI) must account for VAT under the Reverse Charge Mechanism. The 5% tax is reported as deemed output in Box 3 and simultaneously recovered as input tax in Box 10, resulting in zero net cash impact.',
    summaryAr:
      'تخضع الخدمات الرقمية المشتراة من موردين أجانب (مثل AWS وجوجل وزووم) لآلية الاحتساب العكسي. يتم الإقرار عن 5% كضريبة مستحقة في الصندوق 3 واستردادها في الصندوق 10، مما يجعل الأثر النقدي صفراً.',
    keyKeywords: ['reverse charge', 'rcm', 'saas', 'aws', 'google', 'box 3', 'box 10', 'software', 'cloud', 'احتساب عكسي', 'سحابية', 'برمجيات'],
    actionAdviceEn: 'Provide your UAE TRN to foreign SaaS providers so they do not charge foreign or domestic retail tax. Report invoice values under VAT 201 Box 3 and Box 10.',
    actionAdviceAr: 'قدم رقمك الضريبي لمزودي الخدمات السحابية، وقم بتسجيل الفاتورة في الصندوق 3 والصندوق 10 في إقرارك الدوري.',
    emaraTaxImpact: 'VAT 201 Return -> Box 3 (Supplies subject to RCM) & Box 10 (Input RCM)',
    suggestedFollowUpsEn: [
      'What should I do if a foreign SaaS vendor charged me 5% VAT anyway?',
      'Do non-registered businesses have to pay VAT on foreign software imports?',
      'How do I calculate CBUAE exchange rate on USD SaaS bills?'
    ],
    suggestedFollowUpsAr: [
      'ماذا أفعل إذا فرضت شركة أجنبية ضريبة 5% بالفعل على الفاتورة؟',
      'هل يجب على غير المسجلين سداد الضريبة على استيراد البرمجيات؟',
      'كيف أحول قيمة الفواتير بالدولار وفق سعر مصرف الإمارات المركزي؟'
    ]
  },
  {
    id: 'ct-qfzp-cd139',
    authority: 'CABINET_DECISION',
    officialNumber: 'Cabinet Decision No. 139 of 2023 & MD 265 of 2023',
    article: 'Cabinet Decision No. 139 of 2023',
    titleEn: 'Qualifying Free Zone Person (QFZP) 0% Regime & De Minimis Rules',
    titleAr: 'نظام الشخص المؤهل في المنطقة الحرة بنسبة 0% وقواعد الحد الأدنى',
    summaryEn:
      'Free zone companies deriving qualifying income from qualifying activities or transactions with other free zone persons benefit from a 0% Corporate Tax rate, provided non-qualifying revenue does not breach the de minimis threshold (the lower of AED 5,000,000 or 5% of total revenue) and audited financial statements are maintained.',
    summaryAr:
      'تستفيد شركات المناطق الحرة من معدل ضريبة 0% على الدخل المؤهل بشرط عدم تجاوز الإيرادات غير المؤهلة للحد الأدنى (الأقل بين 5 ملايين درهم أو 5% من إجمالي الإيرادات) وإعداد قوائم مالية مدققة.',
    keyKeywords: ['free zone', 'qfzp', 'qualifying income', 'de minimis', '0%', 'audit', 'منطقة حرة', 'دخل مؤهل', 'تدقيق'],
    actionAdviceEn: 'Maintain audited accounts, derive income only from qualifying activities or free zone clients, and monitor mainland retail sales against the 5% / AED 5M de minimis cap.',
    actionAdviceAr: 'احرص على إعداد حسابات مالية مدققة ومراقبة المبيعات للبر الرئيسي حتى لا تتجاوز سقف 5% أو 5 ملايين درهم.',
    emaraTaxImpact: 'Corporate Tax Return -> Qualifying Free Zone Person Schedule',
    suggestedFollowUpsEn: [
      'What activities count as Qualifying Activities under MD 265/2023?',
      'If I breach the de minimis threshold, do I lose the 0% rate for 5 years?',
      'Does a Qualifying Free Zone company need audited financial statements?'
    ],
    suggestedFollowUpsAr: [
      'ما هي الأنشطة المؤهلة المحددة في القرار الوزاري رقم 265 لسنة 2023؟',
      'إذا تجاوزت الحد الأدنى، هل أفقد نسبة 0% لمدة 5 سنوات متتالية؟',
      'هل تتطلب شركة المنطقة الحرة المؤهلة تقريراً مالياً مدققاً إلزامياً؟'
    ]
  },
  {
    id: 'vat-cbuae-rates-art69',
    authority: 'FEDERAL_DECREE_LAW',
    officialNumber: 'Executive Regulations of Decree-Law No. 8 of 2017',
    article: 'Article 69 (Currency Conversion)',
    titleEn: 'Mandatory Central Bank of the UAE (CBUAE) Exchange Rates',
    titleAr: 'أسعار الصرف الإلزامية لمصرف الإمارات المركزي (المادة 69)',
    summaryEn:
      'If an invoice is issued in a foreign currency (USD, EUR, GBP, SAR), the VAT amount declared on the tax invoice and VAT return must be converted using the official exchange rate published by the Central Bank of the UAE on the invoice date. Commercial spot rates are rejected by the FTA.',
    summaryAr:
      'إذا صدرت الفاتورة بعملة أجنبية، يجب تحويل مبلغ الضريبة باستخدام سعر الصرف الرسمي الصادر عن مصرف الإمارات المركزي في تاريخ الفاتورة. ترفض الهيئة أسعار الصرف التجارية الفورية.',
    keyKeywords: ['cbuae', 'exchange rate', 'currency conversion', 'usd', 'eur', 'article 69', 'مصرف مركزي', 'سعر صرف', 'عملة أجنبية'],
    actionAdviceEn: 'Always use Mizan’s integrated CBUAE rate lookup when converting foreign invoices. Include the explicit exchange rate applied on the face of the invoice.',
    actionAdviceAr: 'استخدم دائماً محول أسعار الصرف الرسمي المدمج في ميزان، واذكر سعر الصرف الرسمي صراحة على الفاتورة الضريبية.',
    emaraTaxImpact: 'VAT Tax Invoice Mandatory Field & Box 1 / Box 9 conversions',
    suggestedFollowUpsEn: [
      'Where does Mizan fetch the official CBUAE exchange rates from?',
      'What exchange rate should be used if the invoice is issued on a weekend or public holiday?',
      'Can I convert foreign expenses at bank card billing rates?'
    ],
    suggestedFollowUpsAr: [
      'من أين يحصل ميزان على أسعار الصرف اليومية الرسمية لمصرف الإمارات؟',
      'أي سعر صرف يُستخدم إذا صدرت الفاتورة في عطلة أسبوعية أو رسمية؟',
      'هل يُسمح بتحويل فواتير العملات الأجنبية بسعر خصم البطاقة البنكية؟'
    ]
  },
  {
    id: 'vat-mandatory-registration-art13',
    authority: 'FEDERAL_DECREE_LAW',
    officialNumber: 'Federal Decree-Law No. 8 of 2017',
    article: 'Articles 13 & 15',
    titleEn: 'Mandatory & Voluntary VAT Registration Thresholds',
    titleAr: 'حدود التسجيل الإلزامي والاختياري لضريبة القيمة المضافة',
    summaryEn:
      'A business must register for VAT if taxable supplies and imports exceed AED 375,000 in the previous 12 months or are expected to exceed it in the next 30 days. Businesses may register voluntarily if taxable supplies or taxable expenses exceed AED 187,500.',
    summaryAr:
      'يجب على الأعمال التسجيل لضريبة القيمة المضافة إذا تجاوزت التوريدات الخاضعة 375,000 درهم خلال الـ 12 شهراً السابقة أو المتوقعة خلال 30 يوماً. ويمكن التسجيل اختيارياً عند تجاوز 187,500 درهم توريدات أو مصروفات.',
    keyKeywords: ['vat threshold', '375000', '187500', 'mandatory registration', 'voluntary', 'حد التسجيل', 'تسجيل إلزامي', 'تسجيل اختياري'],
    actionAdviceEn: 'Review trailing 12-month taxable sales monthly. You have 30 days from crossing AED 375,000 to apply on EmaraTax to avoid an AED 10,000 late registration penalty.',
    actionAdviceAr: 'راجع مبيعاتك الخاضعة كل شهر. أمامك 30 يوماً من تاريخ تخطي 375,000 درهم لتقديم طلب التسجيل وتفادي غرامة 10,000 درهم.',
    emaraTaxImpact: 'EmaraTax -> VAT Registration Application',
    suggestedFollowUpsEn: [
      'Do exempt supplies count towards the AED 375,000 VAT threshold?',
      'Can a startup register voluntarily based on development expenses alone?',
      'What is the penalty for failing to register for VAT within 30 days?'
    ],
    suggestedFollowUpsAr: [
      'هل تُحتسب التوريدات المعفاة ضمن حد التسجيل الإلزامي 375,000 درهم؟',
      'هل تستطيع الشركة الناشئة التسجيل اختيارياً بناءً على مصروفاتها فقط؟',
      'ما هي عقوبة التأخر في التسجيل لضريبة القيمة المضافة بعد 30 يوماً؟'
    ]
  },
  {
    id: 'ct-standard-rate-art3',
    authority: 'FEDERAL_DECREE_LAW',
    officialNumber: 'Federal Decree-Law No. 47 of 2022',
    article: 'Article 3',
    titleEn: 'UAE Corporate Tax Rates & AED 375,000 Exemption Bracket',
    titleAr: 'معدلات ضريبة الشركات وشريحة الإعفاء حتى 375,000 درهم',
    summaryEn:
      'UAE Corporate Tax applies at 0% on taxable income up to AED 375,000, and 9% on taxable income exceeding AED 375,000. Large multinationals meeting Pillar Two rules (Pillar 2) are subject to 15% Qualified Domestic Minimum Top-up Tax (QDMTT).',
    summaryAr:
      'تُفرض ضريبة الشركات بمعدل 0% على الدخل الخاضع للضريبة حتى 375,000 درهم، وبنسبة 9% على الدخل الذي يتجاوز 375,000 درهم. وتخضع الشركات متعددة الجنسيات الكبرى لمعدل 15% بموجب الركيزة الثانية.',
    keyKeywords: ['9%', 'rate', '375000 bracket', 'slab', 'corporate tax calculation', 'نسبة الضريبة', 'معدل', 'شريحة'],
    actionAdviceEn: 'The first AED 375,000 of taxable profit is always taxed at 0%. Maintain complete financial books and GAAP/IFRS records to support your deductible costs.',
    actionAdviceAr: 'تخضع أول 375,000 درهم من الأرباح الصافية لمعدل 0%. احتفظ بسجلات مالية مكتملة لإثبات التكاليف المخصومة.',
    emaraTaxImpact: 'Corporate Tax Return -> Tax Calculation Schedule',
    suggestedFollowUpsEn: [
      'How does the AED 375,000 0% bracket differ from Small Business Relief?',
      'Can taxable losses be carried forward to offset future taxable income?',
      'When is the Corporate Tax return and payment due after year end?'
    ],
    suggestedFollowUpsAr: [
      'ما الفرق بين شريحة الـ 375,000 درهم بنسبة 0% وتسهيلات الأعمال الصغيرة؟',
      'هل يمكن ترحيل الخسائر الضريبية لخصمها من أرباح السنوات القادمة؟',
      'متى يحين موعد تقديم الإقرار وسداد ضريبة الشركات بعد نهاية السنة المالية؟'
    ]
  },
  {
    id: 'peppol-einvoicing-mandate',
    authority: 'MOF_MANDATE',
    officialNumber: 'Ministry of Finance Federal E-Invoicing System Announcement',
    article: 'Peppol PINT Standard',
    titleEn: 'UAE Mandatory B2B/B2G E-Invoicing System',
    titleAr: 'منظومة الفوترة الإلكترونية الإلزامية في دولة الإمارات',
    summaryEn:
      'The UAE Ministry of Finance is implementing a decentralized Continuous Transaction Control (CTC) e-invoicing model based on the Peppol PINT standard. Taxpayers will transmit structured XML/JSON e-invoices through accredited Open Peppol Access Points to the FTA.',
    summaryAr:
      'تطبق وزارة المالية منظومة الفوترة الإلكترونية عبر شبكة بيبول (Peppol PINT). سيتم إرسال الفواتير بصيغة XML/JSON عبر نقاط وصول معتمدة إلى الهيئة الاتحادية للضرائب.',
    keyKeywords: ['peppol', 'e-invoicing', 'pint', 'xml', 'electronic invoice', 'mandate', 'فوترة إلكترونية', 'بيبوا', 'فاتورة إلكترونية'],
    actionAdviceEn: 'Mizan provides native Peppol PINT compliant XML generation. Ensure your customers and supplier records include verified Trade License numbers and TRNs.',
    actionAdviceAr: 'يوفر ميزان تصديراً متوافقاً مع معيار Peppol PINT. تأكد من تدوين أرقام الرخص التجارية والأرقام الضريبية للعملاء.',
    emaraTaxImpact: 'Direct FTA CTC Real-time Clearance / Reporting',
    suggestedFollowUpsEn: [
      'What is the compliance timeline for UAE E-Invoicing?',
      'Does Mizan support Peppol PINT XML transmission out of the box?',
      'Are paper and standard PDF invoices valid once e-invoicing goes live?'
    ],
    suggestedFollowUpsAr: [
      'ما هي المواعيد الإلزامية لتطبيق الفوترة الإلكترونية في الإمارات؟',
      'هل يدعم ميزان إنشاء ملفات Peppol PINT XML مباشرة؟',
      'هل تظل الفواتير الورقية أو PDF التقليدية مقبولة بعد بدء التطبيق؟'
    ]
  }
];
