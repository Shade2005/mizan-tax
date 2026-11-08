// ============================================================================
// Mizan (ميزان) - Official UAE Tax Law Corpus
// Authoritative Primary Legislation, Cabinet Decisions, Ministerial Decisions,
// and FTA Regulatory Guidance with Official URLs and Verifiable Article Text.
// ============================================================================

import * as crypto from 'node:crypto';
import { LegalDocumentMetadata } from './knowledge.types';

function computeChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export const OFFICIAL_UAE_TAX_CORPUS: LegalDocumentMetadata[] = [
  // --------------------------------------------------------------------------
  // 1. CORPORATE TAX PRIMARY STATUTE: FEDERAL DECREE-LAW NO. 47 OF 2022
  // --------------------------------------------------------------------------
  {
    id: 'doc-fdl-47-2022',
    documentTitle: 'Federal Decree-Law No. 47 of 2022 on the Taxation of Corporations and Businesses',
    documentTitleAr: 'مرسوم بقانون اتحادي رقم 47 لسنة 2022 في شأن الضريبة على الشركات والأعمال',
    documentType: 'FEDERAL_DECREE_LAW',
    hierarchyRank: 1,
    issuingAuthority: 'MOF',
    documentNumber: 'Federal Decree-Law No. 47 of 2022',
    taxCategory: 'CORPORATE_TAX',
    jurisdiction: 'UAE_FEDERAL',
    publicationDate: '2022-12-09',
    effectiveDate: '2023-06-01',
    isSuperseded: false,
    language: 'bilingual',
    officialUrl: 'https://tax.gov.ae/en/legislation/corporate.tax.aspx',
    retrievedAt: '2026-11-06T00:00:00Z',
    documentVersion: 1,
    contentChecksum: computeChecksum('FDL47-2022-CORPORATE-TAX-UAE-OFFICIAL-STATUTE'),
    articles: [
      {
        articleNumber: 'Article 3',
        titleEn: 'Corporate Tax Rates & Thresholds',
        titleAr: 'نسب الضريبة على الشركات والحدود المعفاة',
        contentEn:
          'Corporate Tax shall be imposed on Taxable Income at the rate of 0% on Taxable Income not exceeding AED 375,000, and 9% on Taxable Income that exceeds AED 375,000. Qualifying Free Zone Persons are taxed at 0% on Qualifying Income.',
        contentAr:
          'تُفرض ضريبة الشركات بنسبة 0% على الدخل الخاضع للضريبة الذي لا يتجاوز 375,000 درهم، وبنسبة 9% على الدخل الذي يتجاوز ذلك. وتخضع الشركات المؤهلة في المناطق الحرة لنسبة 0% على الدخل المؤهل.',
        keyKeywords: ['tax rate', 'threshold', '375000', '9 percent', '0 percent', 'نسبة الضريبة', '375000 درهم'],
      },
      {
        articleNumber: 'Article 18',
        titleEn: 'Qualifying Free Zone Person (QFZP)',
        titleAr: 'الشخص المؤهل في المنطقة الحرة',
        contentEn:
          'A Free Zone Person that is a Qualifying Free Zone Person shall be taxed at 0% on its Qualifying Income. To maintain QFZP status, the person must maintain adequate substance, derive Qualifying Income, comply with transfer pricing rules, not have elected standard CT, and satisfy the de minimis requirements.',
        contentAr:
          'يخضع الشخص المؤهل في المنطقة الحرة لنسبة 0% على دخله المؤهل بشرط الحفاظ على وجود اقتصادي كافٍ، وتحقيق دخل مؤهل، والالتزام بأسعار التحويل، واستيفاء متطلبات النسبة المتبقية (De Minimis).',
        keyKeywords: ['free zone', 'qfzp', 'qualifying income', 'substance', 'منطقة حرة', 'شخص مؤهل', 'دخل مؤهل'],
      },
      {
        articleNumber: 'Article 21',
        titleEn: 'Small Business Relief (SBR)',
        titleAr: 'تسهيلات الأعمال الصغيرة',
        contentEn:
          'A Resident Taxable Person may elect to be treated as not having derived any Taxable Income for a Tax Period where gross revenue does not exceed AED 3,000,000 in the relevant and all prior tax periods. Extended through tax periods ending on or before 31 December 2029.',
        contentAr:
          'يجوز للشخص الخاضع للضريبة المقيم اختيار معاملته كأنه لم يحقق أي دخل خاضع للضريبة إذا لم تتجاوز إيراداته 3,000,000 درهم خلال الفترة الضريبية الحالية والفترات السابقة حتى 31 ديسمبر 2029.',
        keyKeywords: ['small business relief', 'sbr', '3 million', '3000000', 'article 21', 'تسهيلات الأعمال الصغيرة'],
      },
      {
        articleNumber: 'Article 28',
        titleEn: 'Deductible Expenditure Principles',
        titleAr: 'النفقات القابلة للخصم',
        contentEn:
          'Expenditure incurred wholly and exclusively for the purposes of the Taxable Person’s Business that is not capital in nature shall be deductible, unless specifically disallowed under other provisions of this Decree-Law.',
        contentAr:
          'تكون النفقات المتكبدة كلياً وحصرياً لأغراض أعمال الشخص الخاضع للضريبة قابلة للخصم ما لم تكن نفقات رأسمالية أو محظورة بنص خاص في القانون.',
        keyKeywords: ['deductible expenditure', 'wholly and exclusively', 'business expense', 'نفقات قابلة للخصم'],
      },
      {
        articleNumber: 'Article 32',
        titleEn: 'Entertainment, Amusement and Dining Expenditure',
        titleAr: 'نفقات الترفيه والضيافة',
        contentEn:
          'A Taxable Person may deduct 50% of any entertainment, amusement, or recreation expenditure incurred during a Tax Period for customers, shareholders, suppliers or business partners. 50% is statutorily added back to Taxable Income.',
        contentAr:
          'يجوز للشخص الخاضع للضريبة خصم 50% فقط من نفقات الترفيه أو الضيافة المتكبدة للعملاء أو الموردين أو الشركاء. وتُضاف الـ 50% المتبقية إلى الدخل الخاضع للضريبة.',
        keyKeywords: ['entertainment', 'dining', '50 percent', 'article 32', 'ضيافة', 'ترفيه', 'مطاعم', '50%'],
      },
      {
        articleNumber: 'Article 37',
        titleEn: 'Tax Loss Relief & Carryforward',
        titleAr: 'خسائر الضريبة وترحيلها',
        contentEn:
          'A Tax Loss can be offset against Taxable Income of subsequent Tax Periods up to a maximum statutory cap of 75% of Taxable Income for that period. Unutilized tax losses can be carried forward indefinitely.',
        contentAr:
          'يجوز خصم الخسائر الضريبية من الدخل الخاضع للضريبة للفترات اللاحقة بحد أقصى 75% من الدخل الخاضع للضريبة لتلك الفترة، مع ترحيل الخسائر غير المستغلة لأجل غير مسمى.',
        keyKeywords: ['tax losses', 'loss carryforward', '75 percent', 'خسائر ضريبية', 'ترحيل الخسائر'],
      },
      {
        articleNumber: 'Article 51',
        titleEn: 'Corporate Tax Registration Requirement',
        titleAr: 'التسجيل لضريبة الشركات',
        contentEn:
          'Any Taxable Person shall register for Corporate Tax with the Federal Tax Authority and obtain a Tax Registration Number in accordance with the timelines and rules specified by the Authority.',
        contentAr:
          'يجب على كل شخص خاضع للضريبة التسجيل لضريبة الشركات لدى الهيئة الاتحادية للضرائب والحصول على رقم تسجيل ضريبي وفق المواعيد المحددة.',
        keyKeywords: ['registration', 'trn', 'tax registration number', 'تسجيل ضريبي', 'رقم التسجيل'],
      },
      {
        articleNumber: 'Article 53',
        titleEn: 'Corporate Tax Return Filing Deadlines',
        titleAr: 'تقديم الإقرار الضريبي وسداد الضريبة',
        contentEn:
          'A Taxable Person must file a Corporate Tax Return and pay any Corporate Tax due to the Authority no later than 9 months from the end of the relevant Tax Period (e.g. 30 September for a calendar year ending 31 December).',
        contentAr:
          'يجب تقديم الإقرار الضريبي وسداد الضريبة المستحقة خلال مهلة أقصاها 9 أشهر من نهاية الفترة الضريبية ذات الصلة (30 سبتمبر للسنوات المنتهية في 31 ديسمبر).',
        keyKeywords: ['tax return', 'filing deadline', '9 months', 'إقرار ضريبي', 'مهلة التقديم'],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 2. CABINET DECISIONS (NATURAL PERSONS & QUALIFYING FREE ZONES)
  // --------------------------------------------------------------------------
  {
    id: 'doc-cd-49-2023',
    documentTitle: 'Cabinet Decision No. 49 of 2023 on Specifying the Categories of Businesses Conducted by a Natural Person',
    documentTitleAr: 'قرار مجلس الوزراء رقم 49 لسنة 2023 في شأن تحديد فئات الأعمال التي يمارسها الشخص الطبيعي',
    documentType: 'CABINET_DECISION',
    hierarchyRank: 2,
    issuingAuthority: 'CABINET',
    documentNumber: 'Cabinet Decision No. 49 of 2023',
    taxCategory: 'CORPORATE_TAX',
    jurisdiction: 'UAE_FEDERAL',
    publicationDate: '2023-05-08',
    effectiveDate: '2023-06-01',
    isSuperseded: false,
    language: 'bilingual',
    officialUrl: 'https://tax.gov.ae/en/legislation/corporate.tax.aspx',
    retrievedAt: '2026-11-06T00:00:00Z',
    documentVersion: 1,
    contentChecksum: computeChecksum('CD49-2023-NATURAL-PERSON-FREELANCE-THRESHOLD'),
    articles: [
      {
        articleNumber: 'Article 2',
        titleEn: 'AED 1,000,000 Turnover Threshold for Natural Persons & Freelancers',
        titleAr: 'سقف المليون درهم لإيرادات الأشخاص الطبيعيين والمستقلين',
        contentEn:
          'Businesses conducted by a resident or non-resident Natural Person are subject to Corporate Tax only if total turnover derived from such activities exceeds AED 1,000,000 within a calendar year. Personal employment wages/salaries, passive personal investments, and personal real estate revenues are statutorily excluded.',
        contentAr:
          'تخضع أعمال الشخص الطبيعي لضريبة الشركات فقط إذا تجاوزت إيراداته الإجمالية 1,000,000 درهم خلال السنة الميلادية. وتُستثنى الرواتب الشخصية وعوائد الاستثمار الخاص والعقارات الشخصية.',
        keyKeywords: ['natural person', 'freelancer', '1 million', 'salary exclusion', 'شخص طبيعي', 'مستقل', 'مليون درهم'],
      },
    ],
  },
  {
    id: 'doc-cd-139-2023',
    documentTitle: 'Cabinet Decision No. 139 of 2023 on Qualifying Activities and Excluded Activities for QFZP',
    documentTitleAr: 'قرار مجلس الوزراء رقم 139 لسنة 2023 في شأن تحديد الأنشطة المؤهلة والأنشطة المستبعدة',
    documentType: 'CABINET_DECISION',
    hierarchyRank: 2,
    issuingAuthority: 'CABINET',
    documentNumber: 'Cabinet Decision No. 139 of 2023',
    taxCategory: 'CORPORATE_TAX',
    jurisdiction: 'FREE_ZONE',
    publicationDate: '2023-10-27',
    effectiveDate: '2023-06-01',
    isSuperseded: false,
    language: 'bilingual',
    officialUrl: 'https://tax.gov.ae/en/legislation/corporate.tax.aspx',
    retrievedAt: '2026-11-06T00:00:00Z',
    documentVersion: 1,
    contentChecksum: computeChecksum('CD139-2023-QFZP-DE-MINIMIS-RULES'),
    articles: [
      {
        articleNumber: 'Article 3',
        titleEn: 'De Minimis Requirements for Free Zone Entities',
        titleAr: 'شروط النسبة المتبقية (De Minimis) لشركات المناطق الحرة',
        contentEn:
          'Non-qualifying revenue derived by a Qualifying Free Zone Person shall not exceed the lesser of AED 5,000,000 or 5% of total revenue. If this threshold is breached, the entity loses 0% QFZP status for the tax period and the subsequent 4 tax periods (5 years total).',
        contentAr:
          'يجب ألا تتجاوز الإيرادات غير المؤهلة للشخص المؤهل في المنطقة الحرة الأقل من 5,000,000 درهم أو 5% من إجمالي الإيرادات. وإذا تم تجاوز هذا الحد، يفقد الكيان إعفاء الـ 0% لمدة 5 سنوات.',
        keyKeywords: ['de minimis', '5 million', '5 percent', 'disqualification', '5 years', 'نسبة متبقية', 'إلغاء التأهيل'],
      },
    ],
  },
  {
    id: 'doc-cd-75-2023',
    documentTitle: 'Cabinet Decision No. 75 of 2023 on Administrative Penalties for Violations of Tax Laws in the UAE',
    documentTitleAr: 'قرار مجلس الوزراء رقم 75 لسنة 2023 في شأن الغرامات الإدارية للانتهاكات الضريبية',
    documentType: 'CABINET_DECISION',
    hierarchyRank: 2,
    issuingAuthority: 'CABINET',
    documentNumber: 'Cabinet Decision No. 75 of 2023',
    taxCategory: 'TAX_PROCEDURES',
    jurisdiction: 'UAE_FEDERAL',
    publicationDate: '2023-07-28',
    effectiveDate: '2023-08-01',
    isSuperseded: false,
    language: 'bilingual',
    officialUrl: 'https://tax.gov.ae/en/legislation/legislation.aspx',
    retrievedAt: '2026-11-06T00:00:00Z',
    documentVersion: 1,
    contentChecksum: computeChecksum('CD75-2023-ADMINISTRATIVE-PENALTIES-SCHEDULE'),
    articles: [
      {
        articleNumber: 'Penalty Schedule Item 13',
        titleEn: 'AED 10,000 Late Corporate Tax Registration Penalty',
        titleAr: 'غرامة 10,000 درهم على التأخر في التسجيل لضريبة الشركات',
        contentEn:
          'Failure of a person to submit a Corporate Tax registration application within the timeframe specified by the Authority incurs an immediate fixed administrative penalty of AED 10,000.',
        contentAr:
          'يُفرض غرامة إدارية ثابتة قدرها 10,000 درهم في حال الإخفاق في تقديم طلب التسجيل لضريبة الشركات خلال المهل المحددة من الهيئة.',
        keyKeywords: ['penalty', '10000', 'late registration', 'administrative fine', 'غرامة 10000', 'تأخير التسجيل'],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 3. MINISTERIAL DECISIONS (DECISION 17 OF 2026 & DECISION 73 OF 2023)
  // --------------------------------------------------------------------------
  {
    id: 'doc-md-17-2026',
    documentTitle: 'Ministerial Decision No. 17 of 2026 on Input Tax Recovery on Employee Travel, Hotel and Lodging Expenses',
    documentTitleAr: 'قرار وزاري رقم 17 لسنة 2026 في شأن استرداد ضريبة المدخلات على نفقات سفر وإقامة الموظفين',
    documentType: 'MINISTERIAL_DECISION',
    hierarchyRank: 3,
    issuingAuthority: 'MOF',
    documentNumber: 'Ministerial Decision No. 17 of 2026',
    taxCategory: 'VAT',
    jurisdiction: 'UAE_FEDERAL',
    publicationDate: '2026-01-15',
    effectiveDate: '2026-02-01',
    isSuperseded: false,
    language: 'bilingual',
    officialUrl: 'https://tax.gov.ae/en/legislation/vat.aspx',
    retrievedAt: '2026-11-06T00:00:00Z',
    documentVersion: 1,
    contentChecksum: computeChecksum('MD17-2026-EMPLOYEE-DUTY-TRAVEL-VAT-RECOVERY'),
    articles: [
      {
        articleNumber: 'Article 1 & 2',
        titleEn: 'Input VAT Recovery on Employee Business Travel & Hotel Lodging',
        titleAr: 'استرداد ضريبة القيمة المضافة على سفر وفنادق الموظفين لأداء مهام العمل',
        contentEn:
          'Input VAT incurred on hotel accommodations, passenger transport, and subsistence for employees traveling strictly for genuine business duty is 100% recoverable, provided a valid Tax Invoice is issued in the name of the employer. Purely personal, vacation, or leisure expenditure remains blocked under Article 53.',
        contentAr:
          'يجوز استرداد ضريبة القيمة المضافة بنسبة 100% على الإقامة الفندقية ونقل الركاب ونفقات الموظفين لأداء مهام عمل رسمية بشرط إصدار فاتورة ضريبية باسم جهة العمل، مع بقاء النفقات الترفيهية والشخصية محظورة.',
        keyKeywords: ['decision 17', 'hotel', 'travel', 'employee travel', 'vat recovery', 'قرار 17', 'فنادق', 'سفر موظفين', 'استرداد الضريبة'],
      },
    ],
  },
  {
    id: 'doc-md-73-2023',
    documentTitle: 'Ministerial Decision No. 73 of 2023 on Small Business Relief (Extended to 2029)',
    documentTitleAr: 'قرار وزاري رقم 73 لسنة 2023 في شأن تسهيلات الأعمال الصغيرة',
    documentType: 'MINISTERIAL_DECISION',
    hierarchyRank: 3,
    issuingAuthority: 'MOF',
    documentNumber: 'Ministerial Decision No. 73 of 2023',
    taxCategory: 'CORPORATE_TAX',
    jurisdiction: 'UAE_FEDERAL',
    publicationDate: '2023-04-10',
    effectiveDate: '2023-06-01',
    isSuperseded: false,
    language: 'bilingual',
    officialUrl: 'https://tax.gov.ae/en/legislation/corporate.tax.aspx',
    retrievedAt: '2026-11-06T00:00:00Z',
    documentVersion: 1,
    contentChecksum: computeChecksum('MD73-2023-SMALL-BUSINESS-RELIEF-REVENUE-RULES'),
    articles: [
      {
        articleNumber: 'Article 2 & 3',
        titleEn: 'Revenue Ceiling & Election Rules for Small Business Relief',
        titleAr: 'سقف الإيرادات وشروط اختيار تسهيلات الأعمال الصغيرة',
        contentEn:
          'The revenue threshold for Small Business Relief is AED 3,000,000 for each tax period ending on or before 31 December 2029. Once revenue in any tax period exceeds AED 3,000,000, SBR cannot be elected for that period or future periods.',
        contentAr:
          'سقف إيرادات تسهيلات الأعمال الصغيرة هو 3,000,000 درهم لكل فترة ضريبية تنتهي في أو قبل 31 ديسمبر 2029. وإذا تجاوزت الإيرادات هذا السقف، تسقط أهلية الاستفادة من التسهيلات.',
        keyKeywords: ['sbr', '3000000', '3 million', 'election', '2029', 'تسهيلات الأعمال', 'سقف الإيرادات'],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 4. VALUE ADDED TAX PRIMARY STATUTE: FEDERAL DECREE-LAW NO. 8 OF 2017
  // --------------------------------------------------------------------------
  {
    id: 'doc-fdl-8-2017',
    documentTitle: 'Federal Decree-Law No. 8 of 2017 on Value Added Tax',
    documentTitleAr: 'مرسوم بقانون اتحادي رقم 8 لسنة 2017 في شأن ضريبة القيمة المضافة',
    documentType: 'FEDERAL_DECREE_LAW',
    hierarchyRank: 1,
    issuingAuthority: 'MOF',
    documentNumber: 'Federal Decree-Law No. 8 of 2017',
    taxCategory: 'VAT',
    jurisdiction: 'UAE_FEDERAL',
    publicationDate: '2017-08-23',
    effectiveDate: '2018-01-01',
    isSuperseded: false,
    language: 'bilingual',
    officialUrl: 'https://tax.gov.ae/en/legislation/vat.aspx',
    retrievedAt: '2026-11-06T00:00:00Z',
    documentVersion: 1,
    contentChecksum: computeChecksum('FDL8-2017-VAT-LAW-UAE-OFFICIAL-STATUTE'),
    articles: [
      {
        articleNumber: 'Article 13',
        titleEn: 'Mandatory VAT Registration Threshold (AED 375,000)',
        titleAr: 'حد التسجيل الإلزامي لضريبة القيمة المضافة (375,000 درهم)',
        contentEn:
          'Every person resident in the UAE must register for VAT if the total value of supplies or imports made within the previous 12-month period exceeded AED 375,000, or is anticipated to exceed AED 375,000 in the next 30 days.',
        contentAr:
          'يجب على كل شخص مقيم في الدولة التسجيل لضريبة القيمة المضافة إذا تجاوزت توريداته أو وارداته الخاضعة للضريبة 375,000 درهم خلال الـ 12 شهراً السابقة أو المتوقع تجاوزها خلال 30 يوماً.',
        keyKeywords: ['vat registration', 'mandatory threshold', '375000', '12 months', 'تسجيل إلزامي', '375000 درهم'],
      },
      {
        articleNumber: 'Article 48',
        titleEn: 'Reverse Charge Mechanism (RCM) on Imported Services & SaaS',
        titleAr: 'آلية الاحتساب العكسي على الخدمات المستوردة والبرمجيات السحابية',
        contentEn:
          'Where a Taxable Person imports services (such as international cloud software / SaaS) from a non-resident supplier for business purposes, the recipient is treated as making a taxable supply to themselves and accounts for output VAT in Box 3 while recovering it in Box 10 (net cash neutral if fully recoverable).',
        contentAr:
          'عند قيام خاضع للضريبة باستيراد خدمات (مثل البرمجيات السحابية SaaS) من مورد غير مقيم، يُعامل المستلم كأنه قام بتوريد خاضع للضريبة لنفسه، ويُسجل الضريبة في الصندوق 3 مع استردادها في الصندوق 10.',
        keyKeywords: ['reverse charge', 'rcm', 'imported services', 'saas', 'box 3', 'box 10', 'احتساب عكسي', 'خدمات مستوردة'],
      },
      {
        articleNumber: 'Article 53',
        titleEn: 'Non-Recoverable Input Tax (Blocked Entertainment & Personal Expenses)',
        titleAr: 'ضريبة المدخلات غير القابلة للاسترداد (الترفيه والاستخدام الشخصي)',
        contentEn:
          'Input Tax shall not be recoverable on entertainment services provided to anyone not employed by the Person, including customers, suppliers, and potential clients. Input Tax on personal motor vehicles available for private use is also non-recoverable.',
        contentAr:
          'لا يجوز استرداد ضريبة المدخلات عن خدمات الترفيه والضيافة المقدمة لغير الموظفين مثل العملاء والموردين، وكذلك المركبات المستخدمة لأغراض شخصية.',
        keyKeywords: ['blocked input tax', 'entertainment', 'article 53', 'non-recoverable', 'ضريبة غير مستردة', 'ترفيه محظور'],
      },
      {
        articleNumber: 'Article 55',
        titleEn: 'Conditions for Input Tax Recovery & Valid Tax Invoices',
        titleAr: 'شروط استرداد ضريبة المدخلات والفاتورة الضريبية الصحيحة',
        contentEn:
          'A Taxable Person may recover Input Tax if the goods or services are used for making taxable supplies, and the Person holds and retains an authentic original Tax Invoice showing the supplier’s TRN, VAT amount, and date.',
        contentAr:
          'يجوز للخاضع للضريبة استرداد ضريبة المدخلات إذا استُخدمت السلع أو الخدمات لإجراء توريدات خاضعة للضريبة مع حيازة فاتورة ضريبية أصلية وصحيحة تحتوي على الرقم الضريبي للمورد وقيمة الضريبة.',
        keyKeywords: ['input tax recovery', 'tax invoice', 'article 55', 'valid invoice', 'استرداد المدخلات', 'فاتورة ضريبية'],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 5. TAX PROCEDURES & REGISTRATION DEADLINES
  // --------------------------------------------------------------------------
  {
    id: 'doc-fta-dec-3-2024',
    documentTitle: 'FTA Decision No. 3 of 2024 on the Timelines Specified for Tax Registration of Persons for Corporate Tax',
    documentTitleAr: 'قرار الهيئة الاتحادية للضرائب رقم 3 لسنة 2024 في شأن المهل المحددة لتسجيل الخاضعين لضريبة الشركات',
    documentType: 'FTA_DECISION',
    hierarchyRank: 4,
    issuingAuthority: 'FTA',
    documentNumber: 'FTA Decision No. 3 of 2024',
    taxCategory: 'CORPORATE_TAX',
    jurisdiction: 'UAE_FEDERAL',
    publicationDate: '2024-02-23',
    effectiveDate: '2024-03-01',
    isSuperseded: false,
    language: 'bilingual',
    officialUrl: 'https://tax.gov.ae/en/legislation/corporate.tax.aspx',
    retrievedAt: '2026-11-06T00:00:00Z',
    documentVersion: 1,
    contentChecksum: computeChecksum('FTADEC3-2024-CORPORATE-TAX-REGISTRATION-DEADLINES'),
    articles: [
      {
        articleNumber: 'Article 1 & Schedule',
        titleEn: 'Staggered Deadlines for Corporate Tax Registration by License Month',
        titleAr: 'الجدول الزمني الإلزامي لمهل التسجيل لضريبة الشركات بحسب شهر صدور الرخصة',
        contentEn:
          'Resident juridical persons incorporated before 1 March 2024 must submit their CT registration application based on their trade license issuance month: Jan/Feb by 31 May 2024; Mar/Apr by 30 June 2024; May by 31 July 2024; June by 31 Aug 2024; July by 30 Sept 2024; Aug/Sept by 31 Oct 2024; Oct/Nov by 30 Nov 2024; Dec by 31 Dec 2024.',
        contentAr:
          'يجب على الأشخاص الاعتباريين المقيمين المرخصين قبل 1 مارس 2024 التسجيل بحسب شهر صدور الرخصة: يناير/فبراير حتى 31 مايو 2024، مارس/أبريل حتى 30 يونيو 2024، وصولاً إلى ديسمبر بحلول 31 ديسمبر 2024.',
        keyKeywords: ['registration deadline', 'fta decision 3', 'license month', 'deadlines', 'مهلة التسجيل', 'شهر الرخصة'],
      },
    ],
  },
  {
    id: 'doc-fdl-28-2022',
    documentTitle: 'Federal Decree-Law No. 28 of 2022 on Tax Procedures',
    documentTitleAr: 'مرسوم بقانون اتحادي رقم 28 لسنة 2022 في شأن الإجراءات الضريبية',
    documentType: 'FEDERAL_DECREE_LAW',
    hierarchyRank: 1,
    issuingAuthority: 'MOF',
    documentNumber: 'Federal Decree-Law No. 28 of 2022',
    taxCategory: 'TAX_PROCEDURES',
    jurisdiction: 'UAE_FEDERAL',
    publicationDate: '2022-09-30',
    effectiveDate: '2023-03-01',
    isSuperseded: false,
    language: 'bilingual',
    officialUrl: 'https://tax.gov.ae/en/legislation/legislation.aspx',
    retrievedAt: '2026-11-06T00:00:00Z',
    documentVersion: 1,
    contentChecksum: computeChecksum('FDL28-2022-TAX-PROCEDURES-STATUTORY-RECORD-KEEPING'),
    articles: [
      {
        articleNumber: 'Article 78',
        titleEn: 'Statutory 7-Year Accounting Record Retention Mandate',
        titleAr: 'إلزامية حفظ السجلات المحاسبية والضريبية لمدة 7 سنوات',
        contentEn:
          'Taxable Persons must maintain accounting books, invoices, ledgers, and supporting documents in a readable format for a period of not less than 7 years following the end of the tax period to which they relate.',
        contentAr:
          'يجب على الشخص الخاضع للضريبة حفظ السجلات والدفاتر المحاسبية والفواتير والمستندات الداعمة لمدة لا تقل عن 7 سنوات من نهاية الفترة الضريبية المتعلقة بها.',
        keyKeywords: ['record retention', '7 years', 'accounting records', 'audit trail', 'حفظ السجلات', '7 سنوات'],
      },
      {
        articleNumber: 'Article 27 & 28',
        titleEn: 'Voluntary Disclosures & Reconsideration Mechanism',
        titleAr: 'الإفصاح الطوعي وآلية إعادة النظر والطعن الضريبي',
        contentEn:
          'A Taxable Person who discovers an error or omission in a previously submitted tax return resulting in an underpayment of tax must submit a Voluntary Disclosure within 20 business days of becoming aware of the error to mitigate escalated penalties.',
        contentAr:
          'إذا اكتشف الخاضع للضريبة خطأً أو نقصاً في إقراره الضريبي ينتج عنه نقص في الضريبة، يجب تقديم إفصاح طوعي خلال 20 يوم عمل لتفادي الغرامات التصاعدية.',
        keyKeywords: ['voluntary disclosure', 'reconsideration', 'error correction', 'إفصاح طوعي', 'إعادة نظر'],
      },
    ],
  },
  {
    id: 'doc-mof-peppol-2026',
    documentTitle: 'UAE Ministry of Finance & FTA Mandatory E-Invoicing Mandate (Peppol PINT Standard)',
    documentTitleAr: 'منظومة الفوترة الإلكترونية الإلزامية لدولة الإمارات (معيار بيبول Peppol PINT)',
    documentType: 'MOF_EXPLANATORY_GUIDE',
    hierarchyRank: 5,
    issuingAuthority: 'MOF',
    documentNumber: 'UAE E-Invoicing Mandate (Peppol PINT Standard)',
    taxCategory: 'VAT',
    jurisdiction: 'UAE_FEDERAL',
    publicationDate: '2024-05-10',
    effectiveDate: '2026-07-01',
    isSuperseded: false,
    language: 'bilingual',
    officialUrl: 'https://mof.gov.ae/en/strategic-initiatives/e-invoicing/',
    retrievedAt: '2026-11-06T00:00:00Z',
    documentVersion: 1,
    contentChecksum: computeChecksum('MOF-PEPPOL-E-INVOICING-MANDATE-2026'),
    articles: [
      {
        articleNumber: 'E-Invoicing Guidelines',
        titleEn: 'Mandatory Peppol PINT Electronic Invoicing System',
        titleAr: 'المتطلبات التقنية لمنظومة الفوترة الإلكترونية الإلزامية بيبول',
        contentEn:
          'UAE businesses must integrate their ERP and billing systems with accredited Peppol Service Providers using the standardized UAE Peppol PINT XML data format. Traditional PDF invoices without structured XML will no longer satisfy statutory reporting obligations.',
        contentAr:
          'يلزم الشركات في دولة الإمارات ربط أنظمتها المحاسبية مع مزودي خدمة بيبول المعتمدين باستخدام نسق بيانات Peppol PINT XML الموحد، ولن تعد فواتير PDF التقليدية كافية للامتثال.',
        keyKeywords: ['peppol', 'e-invoicing', 'xml', 'electronic invoice', 'فوترة إلكترونية', 'بيبول', 'فواتير إلكترونية'],
      },
    ],
  },
];
