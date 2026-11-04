// ============================================================================
// Mizan (ميزان) - Grounded AI Tax Assistant Service
// Deterministic statutory retrieval & contextual grounding in UAE Tax Law
// ============================================================================

import { Injectable } from '@nestjs/common';
import { UAE_STATUTORY_KNOWLEDGE, StatutoryCitation } from './statutory-knowledge';

export interface ChatMessageDto {
  message: string;
  language?: 'en' | 'ar';
  context?: {
    businessType?: string;
    annualRevenue?: number;
    isFreeZone?: boolean;
    licenseIssueMonth?: number;
  };
}

export interface GroundedChatResponse {
  answer: string;
  citations: {
    id: string;
    authority: string;
    officialNumber: string;
    article: string;
    title: string;
    summary: string;
  }[];
  statutoryRationale: string;
  actionRequired: string;
  emaraTaxImpact?: string;
  suggestedFollowUps: string[];
  isGrounded: boolean;
  topicId?: string;
}

function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F]/g, '') // Remove tashkeel (diacritics)
    .replace(/[أإآ]/g, 'ا') // Normalize Alef
    .replace(/ة/g, 'ه') // Normalize Teh Marbuta
    .replace(/ى/g, 'ي') // Normalize Alef Maqsura
    .trim()
    .toLowerCase();
}

@Injectable()
export class AiService {
  /**
   * Returns curated questions/topics for the Learn Tab prompt chips
   */
  getQuickPrompts(lang: 'en' | 'ar' = 'en') {
    if (lang === 'ar') {
      return [
        {
          id: 'sbr',
          prompt: 'هل شركتي مؤهلة لتسهيلات الأعمال الصغيرة (3 ملايين درهم)؟',
          tag: 'ضريبة الشركات',
        },
        {
          id: 'travel-vat',
          prompt: 'هل يمكن استرداد ضريبة القيمة المضافة على فنادق وسفر الموظفين وفق القرار 17؟',
          tag: 'القرار 17 لسنة 2026',
        },
        {
          id: 'entertainment-art53',
          prompt: 'كيف تُعامل نفقات عشاء وضيافة العملاء ضريبياً (المادة 53 والمادة 32)؟',
          tag: 'استرداد الضريبة',
        },
        {
          id: 'freelancer-threshold',
          prompt: 'أنا مستقل، متى يلزمني التسجيل لضريبة الشركات وفق القرار 49؟',
          tag: 'أشخاص طبيعيون',
        },
        {
          id: 'registration-penalty',
          prompt: 'ما هي غرامة التأخر في التسجيل لضريبة الشركات وكيف أتجنبها؟',
          tag: 'غرامات إمارات تاكس',
        },
        {
          id: 'peppol-einvoicing',
          prompt: 'ما هي متطلبات منظومة الفوترة الإلكترونية الإلزامية (Peppol PINT)؟',
          tag: 'الفوترة الإلكترونية',
        },
      ];
    }

    return [
      {
        id: 'sbr',
        prompt: 'Is my business eligible for Small Business Relief (AED 3M)?',
        tag: 'Corporate Tax',
      },
      {
        id: 'travel-vat',
        prompt: 'Can I claim VAT back on employee hotels & travel under Decision 17?',
        tag: 'Decision 17/2026',
      },
      {
        id: 'entertainment-art53',
        prompt: 'How are client entertainment and dining expenses treated under Art. 53?',
        tag: 'Input VAT & CT',
      },
      {
        id: 'freelancer-threshold',
        prompt: 'I am a freelancer/sole proprietor, what is my Corporate Tax threshold?',
        tag: 'Natural Persons',
      },
      {
        id: 'registration-penalty',
        prompt: 'What are the Corporate Tax registration deadlines and late penalties?',
        tag: 'FTA Penalties',
      },
      {
        id: 'peppol-einvoicing',
        prompt: 'What are the UAE mandatory E-Invoicing (Peppol PINT) requirements?',
        tag: 'E-Invoicing',
      },
    ];
  }

  /**
   * Main grounded chat query processor
   */
  async answerTaxQuery(dto: ChatMessageDto): Promise<GroundedChatResponse> {
    const rawQuery = (dto.message || '').trim().toLowerCase();
    const normalizedQuery = normalizeArabic(rawQuery);
    const isAr = dto.language === 'ar' || /[\u0600-\u06FF]/.test(rawQuery);

    // Score all statutory citations
    const scored = UAE_STATUTORY_KNOWLEDGE.map((item) => {
      let score = 0;

      // Check keywords with Arabic normalization
      for (const kw of item.keyKeywords) {
        const normKw = normalizeArabic(kw);
        if (rawQuery.includes(kw.toLowerCase()) || normalizedQuery.includes(normKw)) {
          score += 15;
        }
      }

      // Check titles & articles
      if (rawQuery.includes(item.id.toLowerCase())) score += 20;
      if (rawQuery.includes(item.article.toLowerCase())) score += 15;
      if (rawQuery.includes(item.titleEn.toLowerCase())) score += 12;
      if (normalizedQuery.includes(normalizeArabic(item.titleAr))) score += 15;

      // SBR check
      if (
        (normalizedQuery.includes('تسهيلات') ||
          normalizedQuery.includes('اعمال صغيره') ||
          normalizedQuery.includes('3 ملايين') ||
          rawQuery.includes('small business') ||
          rawQuery.includes('sbr') ||
          rawQuery.includes('3 million')) &&
        item.id === 'ct-sbr-art21'
      ) {
        score += 30;
      }

      // Decision 17 Employee Travel check
      if (
        (normalizedQuery.includes('سفر') ||
          normalizedQuery.includes('فندق') ||
          normalizedQuery.includes('موظف') ||
          normalizedQuery.includes('قرار 17') ||
          rawQuery.includes('hotel') ||
          rawQuery.includes('travel') ||
          rawQuery.includes('decision 17')) &&
        item.id === 'vat-employee-exp-dec17'
      ) {
        score += 30;
      }

      // Entertainment check
      if (
        (normalizedQuery.includes('ترفيه') ||
          normalizedQuery.includes('ضيافه') ||
          normalizedQuery.includes('مطعم') ||
          normalizedQuery.includes('عشاء') ||
          rawQuery.includes('entertainment') ||
          rawQuery.includes('dinner') ||
          rawQuery.includes('50%')) &&
        item.id === 'vat-entertainment-art53'
      ) {
        score += 30;
      }

      // Freelancer & natural person check
      if (
        (normalizedQuery.includes('مستقل') ||
          normalizedQuery.includes('شخص طبيعي') ||
          normalizedQuery.includes('مليون') ||
          normalizedQuery.includes('راتب') ||
          rawQuery.includes('freelancer') ||
          rawQuery.includes('natural person') ||
          rawQuery.includes('salary')) &&
        item.id === 'ct-natural-person-cd49'
      ) {
        score += 30;
      }

      // Penalties check
      if (
        (normalizedQuery.includes('غرامه') ||
          normalizedQuery.includes('تاخير') ||
          normalizedQuery.includes('10000') ||
          normalizedQuery.includes('مهله') ||
          rawQuery.includes('penalty') ||
          rawQuery.includes('fine') ||
          rawQuery.includes('10000')) &&
        item.id === 'ct-penalty-ftadec3'
      ) {
        score += 30;
      }

      // Peppol E-invoicing check
      if (
        (normalizedQuery.includes('فوتره') ||
          normalizedQuery.includes('بيبول') ||
          normalizedQuery.includes('الكترونيه') ||
          rawQuery.includes('peppol') ||
          rawQuery.includes('einvoicing') ||
          rawQuery.includes('e-invoice')) &&
        item.id === 'peppol-einvoicing-mandate'
      ) {
        score += 30;
      }

      // SaaS & Reverse charge check
      if (
        (normalizedQuery.includes('احتساب عكسي') ||
          normalizedQuery.includes('سحابيه') ||
          normalizedQuery.includes('برمجيات') ||
          rawQuery.includes('reverse charge') ||
          rawQuery.includes('rcm') ||
          rawQuery.includes('saas')) &&
        item.id === 'vat-rcm-saas-art48'
      ) {
        score += 30;
      }

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topMatch = scored[0];

    // If strong match found (score >= 10)
    if (topMatch && topMatch.score >= 10) {
      const match = topMatch.item;
      const formattedCitations = [
        {
          id: match.id,
          authority: match.authority,
          officialNumber: match.officialNumber,
          article: match.article,
          title: isAr ? match.titleAr : match.titleEn,
          summary: isAr ? match.summaryAr : match.summaryEn,
        },
      ];

      return {
        answer: isAr ? match.summaryAr : match.summaryEn,
        citations: formattedCitations,
        statutoryRationale: isAr
          ? `صادر بموجب ${match.officialNumber} - ${match.article}`
          : `Governed under ${match.officialNumber} - ${match.article}`,
        actionRequired: isAr ? match.actionAdviceAr : match.actionAdviceEn,
        emaraTaxImpact: match.emaraTaxImpact,
        suggestedFollowUps: isAr ? match.suggestedFollowUpsAr : match.suggestedFollowUpsEn,
        isGrounded: true,
        topicId: match.id,
      };
    }

    // Fallback response if no specific keyword matched strongly
    if (isAr) {
      return {
        answer:
          'مساعد ميزان الضريبي مبني وفقاً للمرسوم بقانون اتحادي رقم 47 لسنة 2022 (ضريبة الشركات) والمرسوم بقانون اتحادي رقم 8 لسنة 2017 (ضريبة القيمة المضافة) وقرارات مجلس الوزراء ذات الصلة. يمكنك سؤالي عن تسهيلات الأعمال الصغيرة، استرداد ضريبة سفر الموظفين (قرار 17)، نفقات الترفيه، أو مواعيد التسجيل والغرامات.',
        citations: [
          {
            id: 'general-uae-tax',
            authority: 'FEDERAL_DECREE_LAW',
            officialNumber: 'Federal Decree-Law No. 47 of 2022 & No. 8 of 2017',
            article: 'UAE Tax Statutory Framework',
            title: 'التشريعات الضريبية الرسمية لدولة الإمارات',
            summary: 'الإطار القانوني لضريبة الشركات وضريبة القيمة المضافة الصادر عن وزارة المالية والهيئة الاتحادية للضرائب.',
          },
        ],
        statutoryRationale: 'التشريعات الضريبية الاتحادية الرسمية لدولة الإمارات العربية المتحدة',
        actionRequired: 'حدد موضوع استفسارك (مثل: تسهيلات الأعمال، استرداد الضريبة، أو غرامة التسجيل) للحصول على السند القانوني المحدد.',
        suggestedFollowUps: [
          'هل شركتي مؤهلة لتسهيلات الأعمال الصغيرة (3 ملايين درهم)؟',
          'ما هي غرامة التأخر في التسجيل لضريبة الشركات وكيف أتجنبها؟',
          'هل يمكن استرداد ضريبة القيمة المضافة على فنادق وسفر الموظفين وفق القرار 17؟',
        ],
        isGrounded: true,
      };
    }

    return {
      answer:
        'Mizan Tax Assistant is strictly grounded in Federal Decree-Law No. 47 of 2022 (Corporate Tax), Federal Decree-Law No. 8 of 2017 (VAT), and relevant Cabinet Decisions. You can ask about Small Business Relief (SBR), employee travel VAT recovery under Decision 17 of 2026, client entertainment disallowance, or Corporate Tax registration deadlines and fines.',
      citations: [
        {
          id: 'general-uae-tax',
          authority: 'FEDERAL_DECREE_LAW',
          officialNumber: 'Federal Decree-Law No. 47 of 2022 & No. 8 of 2017',
          article: 'UAE Tax Statutory Framework',
          title: 'Official UAE Tax Legislative Framework',
          summary: 'Governing federal statutes published by the UAE Ministry of Finance and Federal Tax Authority (FTA).',
        },
      ],
      statutoryRationale: 'Official Federal Tax Legislation of the United Arab Emirates',
      actionRequired: 'Please ask about a specific topic (e.g. Small Business Relief, Hotel VAT recovery, or CT registration fines) for precise legal citations and EmaraTax box mappings.',
      suggestedFollowUps: [
        'Is my business eligible for Small Business Relief (AED 3M)?',
        'Can I claim VAT back on employee hotels & travel under Decision 17?',
        'What are the Corporate Tax registration deadlines and late penalties?',
      ],
      isGrounded: true,
    };
  }
}
