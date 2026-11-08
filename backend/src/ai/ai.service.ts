// ============================================================================
// Mizan (ميزان) - AI Tax Assistant Service
// Unified Facade for Quick Prompts, Single-Turn Grounded Chat & RAG Integration
// ============================================================================

import { Injectable } from '@nestjs/common';
import { RagService, BusinessContextInput } from './rag.service';
import { GroundedRAGResult } from './knowledge/knowledge.types';

export interface ChatMessageDto {
  message: string;
  language?: 'en' | 'ar';
  context?: {
    businessType?: string;
    annualRevenue?: number;
    isFreeZone?: boolean;
    licenseIssueMonth?: number;
  };
  businessContext?: BusinessContextInput;
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
    officialUrl?: string;
  }[];
  statutoryRationale: string;
  actionRequired: string;
  emaraTaxImpact?: string;
  suggestedFollowUps: string[];
  isGrounded: boolean;
  topicId?: string;
  businessGrounding?: any;
}

@Injectable()
export class AiService {
  constructor(private readonly ragService: RagService) {}

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
        {
          id: 'qfzp-rules',
          prompt: 'ما هي شروط الشخص المؤهل في المنطقة الحرة (QFZP) وحد الـ 5%؟',
          tag: 'المناطق الحرة',
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
      {
        id: 'qfzp-rules',
        prompt: 'What are the Qualifying Free Zone Person (QFZP) rules and de minimis limit?',
        tag: 'Free Zones',
      },
    ];
  }

  /**
   * Main grounded chat query processor delegating to verified RAG engine
   */
  async answerTaxQuery(dto: ChatMessageDto): Promise<GroundedChatResponse> {
    const bCtx: BusinessContextInput = {
      ...(dto.businessContext || {}),
      entityType: dto.context?.businessType || dto.businessContext?.entityType,
      annualRevenue: dto.context?.annualRevenue || dto.businessContext?.annualRevenue,
      isFreeZone: dto.context?.isFreeZone || dto.businessContext?.isFreeZone,
      licenseIssueMonth: dto.context?.licenseIssueMonth || dto.businessContext?.licenseIssueMonth,
    };

    const ragResult: GroundedRAGResult = await this.ragService.generateGroundedAnswer({
      query: dto.message,
      language: dto.language,
      businessContext: bCtx,
    });

    return {
      answer: ragResult.answer,
      citations: ragResult.citations.map((c) => ({
        id: c.id,
        authority: c.authority,
        officialNumber: c.documentNumber,
        article: c.article,
        title: c.documentTitle,
        summary: c.summary,
        officialUrl: c.officialUrl,
      })),
      statutoryRationale: ragResult.statutoryRationale,
      actionRequired: ragResult.actionRequired,
      emaraTaxImpact: ragResult.emaraTaxImpact,
      suggestedFollowUps: ragResult.suggestedFollowUps,
      isGrounded: ragResult.isGrounded,
      businessGrounding: ragResult.businessGrounding,
    };
  }
}
