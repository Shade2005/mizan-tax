// ============================================================================
// Mizan (ميزان) - Legal Grounding & RAG Synthesis Service
// Injection-Safe, Business-Aware Statutory Grounding via Gemini & Deterministic Fallback
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import {
  KnowledgeBaseService,
  ScoredChunk,
} from './knowledge/knowledge-base.service';
import {
  GroundedRAGResult,
  LegalCitation,
} from './knowledge/knowledge.types';

export interface BusinessContextInput {
  tradeName?: string;
  legalForm?: string;
  entityType?: string;
  isFreeZone?: boolean;
  annualRevenue?: number;
  hasTradeLicense?: boolean;
  isVatRegistered?: boolean;
  isCorporateTaxRegistered?: boolean;
  licenseIssueMonth?: number;
}

export interface RAGQueryDto {
  query: string;
  language?: 'en' | 'ar';
  businessContext?: BusinessContextInput;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(private readonly knowledgeBase: KnowledgeBaseService) {}

  /**
   * Sanitizes user input against prompt injection attacks.
   */
  private sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(/<\/?(?:system|instruction|prompt|assistant|human|user_query|legal_evidence)>/gi, '')
      .replace(/```(?:system|json|xml)?/gi, '')
      .trim();
  }

  /**
   * Formats business context for grounding and display.
   */
  private formatBusinessContext(bCtx?: BusinessContextInput) {
    if (!bCtx) return null;

    let applicableRelief: string | undefined;
    if (bCtx.isFreeZone) {
      applicableRelief = 'Qualifying Free Zone Person (QFZP 0% on Qualifying Income)';
    } else if (bCtx.annualRevenue !== undefined && bCtx.annualRevenue <= 3_000_000) {
      applicableRelief = 'Small Business Relief (SBR under Art. 21)';
    } else {
      applicableRelief = 'Standard Corporate Tax (9% on Taxable Income above AED 375,000)';
    }

    return {
      entityName: bCtx.tradeName || 'Registered Entity',
      entityType: bCtx.entityType || bCtx.legalForm || 'LLC',
      isFreeZone: !!bCtx.isFreeZone,
      applicableRelief,
    };
  }

  /**
   * Generates grounded tax advice using RAG.
   */
  public async generateGroundedAnswer(dto: RAGQueryDto): Promise<GroundedRAGResult> {
    const rawQuery = (dto.query || '').trim();
    const sanitizedQuery = this.sanitizeInput(rawQuery);
    const isAr = dto.language === 'ar' || /[\u0600-\u06FF]/.test(sanitizedQuery);
    const lang = isAr ? 'ar' : 'en';

    // Retrieve verified statutory chunks
    const searchResults = this.knowledgeBase.searchKnowledge(sanitizedQuery, {
      language: lang,
      businessContext: dto.businessContext,
      topK: 4,
      minScore: 16,
    });

    const businessGrounding = this.formatBusinessContext(dto.businessContext) || undefined;

    // Zero-Evidence / Statutory Silence Guard
    if (!searchResults || searchResults.length === 0) {
      return this.handleStatutorySilence(sanitizedQuery, isAr, businessGrounding);
    }

    // Top verified citations
    const citations: LegalCitation[] = searchResults.map((r) => r.citation);
    const primaryChunk = searchResults[0].chunk;

    // Check for Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const geminiAnswer = await this.callGeminiRAG(
          sanitizedQuery,
          searchResults,
          dto.businessContext,
          isAr,
          apiKey,
        );
        if (geminiAnswer) {
          return {
            answer: geminiAnswer,
            citations,
            statutoryRationale: isAr
              ? `مبني على ${primaryChunk.documentNumber} (${primaryChunk.articleNumber}) الصادر عن ${primaryChunk.authority}`
              : `Grounded in ${primaryChunk.documentNumber} (${primaryChunk.articleNumber}) issued by ${primaryChunk.authority}`,
            actionRequired: isAr
              ? `الرجوع إلى البوابة الرسمية أو تطبيق إمارات تاكس للتحقق من الامتثال لأحكام ${primaryChunk.articleNumber}.`
              : `Review EmaraTax portal or business records to ensure adherence to ${primaryChunk.articleNumber}.`,
            emaraTaxImpact: isAr
              ? `متوافق مع التصنيف الضريبي المسجل في إمارات تاكس.`
              : `Aligned with tax classification registered in EmaraTax.`,
            suggestedFollowUps: this.generateFollowUps(primaryChunk.chunkId, isAr),
            isGrounded: true,
            businessGrounding,
          };
        }
      } catch (err: any) {
        this.logger.warn(`Gemini RAG synthesis failed, using deterministic fallback: ${err.message}`);
      }
    }

    // Deterministic Statutory Synthesis (Zero Hallucination Guaranteed)
    return this.synthesizeDeterministicAnswer(
      sanitizedQuery,
      searchResults,
      dto.businessContext,
      isAr,
      businessGrounding,
    );
  }

  /**
   * Refuses to invent tax rules when statutory evidence is absent.
   */
  private handleStatutorySilence(
    query: string,
    isAr: boolean,
    businessGrounding?: any,
  ): GroundedRAGResult {
    if (isAr) {
      return {
        answer:
          'لم تتضمن التشريعات الضريبية الاتحادية أو قرارات الهيئة الاتحادية للضرائب المتاحة نصاً قانونياً صريحاً يتناول استفسارك بشكل مباشر. لتجنب تقديم معلومات غير مؤكدة، يُنصح بمراجعة وكيل ضريبي معتمد أو التوجه باستفسار رسمي إلى الهيئة الاتحادية للضرائب عبر منصة إمارات تاكس.',
        citations: [],
        statutoryRationale: 'عدم وجود نص صريح في التشريعات الضريبية النافذة',
        actionRequired: 'استشر وكيلاً ضريبياً مرخصاً أو ارفع طلب توضيح رسمي (Clarification) للهيئة الاتحادية للضرائب.',
        suggestedFollowUps: [
          'هل شركتي مؤهلة لتسهيلات الأعمال الصغيرة (3 ملايين درهم)؟',
          'ما هي شروط استرداد ضريبة القيمة المضافة على سفر الموظفين وفق القرار 17؟',
          'ما هي غرامة التأخر في التسجيل لضريبة الشركات؟',
        ],
        isGrounded: false,
        businessGrounding,
      };
    }

    return {
      answer:
        'Official UAE tax legislation and published Federal Tax Authority (FTA) guidance do not contain a specific statutory provision directly addressing your query. To maintain strict legal accuracy and avoid non-compliant assumptions, Mizan cannot provide unverified guidance. You should consult a licensed UAE tax agent or submit a formal tax clarification to the FTA via EmaraTax.',
      citations: [],
      statutoryRationale: 'Absence of explicit statutory provision in active legislation',
      actionRequired: 'Consult a licensed UAE tax agent or submit a formal FTA clarification request via EmaraTax.',
      suggestedFollowUps: [
        'Is my business eligible for Small Business Relief (AED 3M)?',
        'Can I claim VAT back on employee hotels & travel under Decision 17?',
        'What are the Corporate Tax registration deadlines and late penalties?',
      ],
      isGrounded: false,
      businessGrounding,
    };
  }

  /**
   * Deterministic synthesis of verified statutory chunks with business context tailoring.
   */
  private synthesizeDeterministicAnswer(
    query: string,
    results: ScoredChunk[],
    bCtx?: BusinessContextInput,
    isAr = false,
    businessGrounding?: any,
  ): GroundedRAGResult {
    const primary = results[0].chunk;
    const secondary = results.length > 1 ? results[1].chunk : null;
    const citations = results.map((r) => r.citation);

    let answer = isAr ? primary.contentAr : primary.contentEn;

    // Tailor with active business context if relevant
    if (bCtx) {
      const bizName = bCtx.tradeName || 'Your business';
      if (bCtx.isFreeZone && (primary.documentId.includes('qfzp') || primary.articleNumber.includes('18'))) {
        answer = isAr
          ? `بناءً على ملف منشأتك (${bizName}) المسجلة كمنطقة حرة:\n\n${answer}\n\nيُرجى التأكد من استيفاء شرط الوجود الاقتصادي الواقعي وعدم تجاوز إيرادات غير المؤهلة للحد الأدنى (5% أو 5 ملايين درهم).`
          : `Based on your profile for ${bizName} (Free Zone entity):\n\n${answer}\n\nEnsure adequate economic substance and verify non-qualifying revenue does not breach the de minimis threshold (5% or AED 5,000,000).`;
      } else if (
        bCtx.annualRevenue !== undefined &&
        bCtx.annualRevenue <= 3_000_000 &&
        (primary.documentId.includes('sbr') || primary.articleNumber.includes('21'))
      ) {
        answer = isAr
          ? `بناءً على إيرادات منشأتك (${bizName}) المقدرة بـ ${bCtx.annualRevenue.toLocaleString()} درهم إماراتي:\n\n${answer}\n\nمنشأتك مؤهلة للاستفادة من تسهيلات الأعمال الصغيرة حتى 31 ديسمبر 2029.`
          : `Based on your reported revenue of AED ${bCtx.annualRevenue.toLocaleString()} for ${bizName}:\n\n${answer}\n\nYour business is within the AED 3,000,000 threshold and eligible to elect for Small Business Relief through 31 December 2029.`;
      } else if (
        (bCtx.entityType === 'SOLE_ESTABLISHMENT' || bCtx.entityType === 'FREELANCER') &&
        primary.documentId.includes('cd-49-2023')
      ) {
        answer = isAr
          ? `بناءً على صفتك القانونية (${bCtx.entityType === 'FREELANCER' ? 'مستقل' : 'مؤسسة فردية'}):\n\n${answer}`
          : `Based on your entity classification (${bCtx.entityType || 'Freelancer / Sole Establishment'}):\n\n${answer}`;
      }
    }

    // Append secondary complementary rule if relevant
    if (secondary && secondary.documentId !== primary.documentId) {
      const secText = isAr ? secondary.contentAr : secondary.contentEn;
      answer += isAr
        ? `\n\nبالإضافة إلى ذلك، ينص ${secondary.documentNumber} (${secondary.articleNumber}) على ما يلي:\n${secText}`
        : `\n\nAdditionally, ${secondary.documentNumber} (${secondary.articleNumber}) stipulates:\n${secText}`;
    }

    const statutoryRationale = isAr
      ? `مبني على ${primary.documentNumber} (${primary.articleNumber}) الصادر عن ${primary.authority}`
      : `Grounded in ${primary.documentNumber} (${primary.articleNumber}) issued by ${primary.authority}`;

    const actionRequired = this.deriveActionRequired(primary.chunkId, isAr);
    const emaraTaxImpact = this.deriveEmaraTaxImpact(primary.chunkId, isAr);
    const suggestedFollowUps = this.generateFollowUps(primary.chunkId, isAr);

    return {
      answer,
      citations,
      statutoryRationale,
      actionRequired,
      emaraTaxImpact,
      suggestedFollowUps,
      isGrounded: true,
      businessGrounding,
    };
  }

  /**
   * Calls Google Gemini with bounded statutory evidence and injection defense.
   */
  private async callGeminiRAG(
    query: string,
    results: ScoredChunk[],
    bCtx: BusinessContextInput | undefined,
    isAr: boolean,
    apiKey: string,
  ): Promise<string | null> {
    const evidenceBlocks = results
      .map(
        (r, idx) => `
<evidence item="${idx + 1}">
  <document>${r.chunk.documentNumber}</document>
  <article>${r.chunk.articleNumber}</article>
  <authority>${r.chunk.authority}</authority>
  <content>${isAr ? r.chunk.contentAr : r.chunk.contentEn}</content>
</evidence>`,
      )
      .join('\n');

    const bizInfo = bCtx
      ? `
<business_context>
  Trade Name: ${bCtx.tradeName || 'N/A'}
  Entity Type: ${bCtx.entityType || bCtx.legalForm || 'N/A'}
  Free Zone: ${bCtx.isFreeZone ? 'YES' : 'NO'}
  Annual Revenue: AED ${bCtx.annualRevenue !== undefined ? bCtx.annualRevenue : 'N/A'}
  VAT Registered: ${bCtx.isVatRegistered ? 'YES' : 'NO'}
</business_context>`
      : '<business_context>No specific business profile active</business_context>';

    const systemPrompt = `You are Mizan AI (ميزان), the official UAE Corporate Tax and VAT Assistant.
Your core mission is to provide 100% legally grounded answers backed by verified UAE Federal Decree-Laws, Cabinet Decisions, and Ministerial Decisions.

STRICT RULES:
1. Base all factual assertions, rates, thresholds, and conditions EXCLUSIVELY on the statutory evidence in <legal_evidence>.
2. NEVER hallucinate or invent article numbers, decisions, or tax percentages.
3. If <legal_evidence> does not cover the question, state that UAE legislation does not specify a rule and advise consulting a registered tax agent.
4. Mention the exact Federal Decree-Law or Decision number and article (e.g. "Federal Decree-Law No. 47 of 2022, Article 21").
5. Account for the user's business context from <business_context> when tailoring advice.
6. Language: Respond in ${isAr ? 'Arabic (العربية الفصحى)' : 'clear English'}. Keep tone professional, authoritative, and concise.`;

    const userPrompt = `
<legal_evidence>
${evidenceBlocks}
</legal_evidence>

${bizInfo}

<user_query>
${query}
</user_query>
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1, // Near-deterministic for legal precision
          maxOutputTokens: 800,
        },
      }),
    });

    if (!res.ok) {
      this.logger.warn(`Gemini API returned status ${res.status}: ${await res.text()}`);
      return null;
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidateText ? candidateText.trim() : null;
  }

  private deriveActionRequired(chunkId: string, isAr: boolean): string {
    if (chunkId.includes('sbr')) {
      return isAr
        ? 'تفعيل خيار تسهيلات الأعمال الصغيرة عبر إقرار ضريبة الشركات في إمارات تاكس والاحتفاظ بالسجلات المالية لمدة 7 سنوات.'
        : 'Elect for Small Business Relief in the EmaraTax Corporate Tax return and maintain financial records for 7 years.';
    }
    if (chunkId.includes('dec17')) {
      return isAr
        ? 'الحصول على فواتير ضريبية نظامية تحمل اسم الشركة وإثبات صلة المصروف بالنشاط التجاري لاسترداد ضريبة السفر في الإقرار.'
        : 'Obtain compliant tax invoices in the company name with business justification to recover VAT in Box 9 of Form VAT201.';
    }
    if (chunkId.includes('entertainment')) {
      return isAr
        ? 'حظر استرداد ضريبة القيمة المضافة بنسبة 100% على ترفيه العملاء، وقيد خصم 50% فقط لأغراض ضريبة الشركات.'
        : 'Block 100% of input VAT on client entertainment, and apply the 50% deduction limit in the Corporate Tax calculation.';
    }
    if (chunkId.includes('penalty') || chunkId.includes('deadline')) {
      return isAr
        ? 'التقديم الفوري لطلب التسجيل لضريبة الشركات عبر بوابة إمارات تاكس لتجنب فرض غرامة الـ 10,000 درهم.'
        : 'Submit Corporate Tax registration immediately on the EmaraTax portal to avoid the AED 10,000 administrative penalty.';
    }
    if (chunkId.includes('qfzp')) {
      return isAr
        ? 'إعداد حسابات مدققة والتحقق من أن الإيرادات غير المؤهلة لا تتجاوز 5 ملايين درهم أو 5% من إجمالي الإيرادات.'
        : 'Maintain audited financial statements and ensure non-qualifying revenue remains within the de minimis limit.';
    }
    if (chunkId.includes('natural-persons')) {
      return isAr
        ? 'متابعة حجم المبيعات الإجمالية والتسجيل لضريبة الشركات إذا تجاوزت المليون درهم في السنة الميلادية.'
        : 'Track total commercial turnover and apply for CT registration if annual revenue exceeds AED 1,000,000.';
    }
    if (chunkId.includes('peppol')) {
      return isAr
        ? 'التأكد من جاهزية نظام تخطيط الموارد لتوليد فواتير إلكترونية متوافقة مع معيار Peppol PINT.'
        : 'Prepare ERP/accounting systems to generate Peppol PINT compliant XML e-invoices with accredited Service Providers.';
    }
    return isAr
      ? 'مراجعة المعاملة المالية وقيدها في السجلات المحاسبية بما يتوافق مع التشريعات الضريبية.'
      : 'Review the transaction and record it in accounting books in accordance with UAE tax regulations.';
  }

  private deriveEmaraTaxImpact(chunkId: string, isAr: boolean): string {
    if (chunkId.includes('sbr')) {
      return isAr
        ? 'إقرار ضريبة الشركات (CT Return) - تحديد خيار المادة 21 (Small Business Relief).'
        : 'Corporate Tax Return - Tick election box for Article 21 (Small Business Relief).';
    }
    if (chunkId.includes('dec17')) {
      return isAr
        ? 'إقرار ضريبة القيمة المضافة (VAT201) - الصندوق رقم 9 (المصروفات المستردة).'
        : 'VAT Return Form VAT201 - Box 9 (Standard-rated expenses recoverable).';
    }
    if (chunkId.includes('entertainment')) {
      return isAr
        ? 'إقرار ضريبة القيمة المضافة - استبعاد الضريبة من الصندوق 9؛ إقرار ضريبة الشركات - تسوية 50% غير قابلة للخصم.'
        : 'VAT Form VAT201: Do not include in Box 9; CT Return: Disallow 50% of expense in taxable income reconciliation.';
    }
    if (chunkId.includes('rcm-saas')) {
      return isAr
        ? 'إقرار ضريبة القيمة المضافة - إدراج الضريبة المستحقة في الصندوق 3 والضريبة المستردة في الصندوق 10.'
        : 'VAT Form VAT201 - Output tax in Box 3, and recoverable input tax in Box 10.';
    }
    if (chunkId.includes('penalty')) {
      return isAr
        ? 'لوحة تحكم إمارات تاكس - التنبيهات والغرامات الإدارية غير المسددة.'
        : 'EmaraTax Dashboard - Liabilities & Administrative Penalties Tab.';
    }
    return isAr
      ? 'متوافق مع التصنيف الضريبي المسجل في إمارات تاكس.'
      : 'Aligned with tax classification registered in EmaraTax.';
  }

  private generateFollowUps(chunkId: string, isAr: boolean): string[] {
    if (chunkId.includes('sbr')) {
      return isAr
        ? [
            'ما هي شروط ترحيل الخسائر الضريبية أثناء تطبيق تسهيلات الأعمال الصغيرة؟',
            'هل يحق للشركات القابضة أو الأعضاء في مجموعات مؤهلة الاستفادة من تسهيلات الأعمال الصغيرة؟',
            'ما هي مدة الاحتفاظ بالسجلات الضريبية المطلوبة قانوناً؟',
          ]
        : [
            'Can tax losses be carried forward while claiming Small Business Relief?',
            'Are holding companies or members of qualifying groups eligible for SBR?',
            'What is the statutory record retention requirement under UAE Tax Law?',
          ];
    }
    if (chunkId.includes('dec17')) {
      return isAr
        ? [
            'ما هي الشروط الخمسة الإلزامية لاسترداد ضريبة القيمة المضافة على سفر الموظفين؟',
            'هل يجوز استرداد ضريبة الوجبات الفردية للموظف أثناء مهمة العمل؟',
            'كيف تُعامل نفقات الترفيه للعملاء مقارنة بسفر الموظفين؟',
          ]
        : [
            'What are the 5 mandatory conditions to claim VAT on employee travel under Decision 17?',
            'Is VAT recoverable on employee meals during official travel?',
            'How is client entertainment treated compared to employee business travel?',
          ];
    }
    if (chunkId.includes('entertainment')) {
      return isAr
        ? [
            'هل يُسمح باسترداد أي نسبة من ضريبة القيمة المضافة على ضيافة العملاء؟',
            'ما هي نسبة الخصم المسموحة لنفقات الترفيه في ضريبة الشركات (المادة 32)؟',
            'هل تُعامل فعاليات الموظفين الداخلية مثل حفلات العمل معاملة ترفيه العملاء؟',
          ]
        : [
            'Can any input VAT be recovered on client entertainment expenses?',
            'What is the 50% deduction rule for entertainment under Corporate Tax Art. 32?',
            'Are internal employee social events treated differently from client entertainment?',
          ];
    }
    if (chunkId.includes('qfzp')) {
      return isAr
        ? [
            'ما هو حد الإيرادات غير المؤهلة (De Minimis) لشركات المناطق الحرة؟',
            'ما هي الأنشطة المؤهلة لنسبة 0% في ضريبة الشركات؟',
            'ماذا يحدث إذا أخلت شركة المنطقة الحرة بشروط الوجود الاقتصادي؟',
          ]
        : [
            'What is the de minimis threshold for non-qualifying revenue in Free Zones?',
            'Which activities qualify for 0% Corporate Tax under Cabinet Decision 139?',
            'What are the consequences of disqualification as a QFZP?',
          ];
    }
    return isAr
      ? [
          'هل شركتي مؤهلة لتسهيلات الأعمال الصغيرة (3 ملايين درهم)؟',
          'ما هي غرامة التأخر في التسجيل لضريبة الشركات؟',
          'ما هي متطلبات منظومة الفوترة الإلكترونية الإلزامية (Peppol PINT)؟',
        ]
      : [
          'Is my business eligible for Small Business Relief (AED 3M)?',
          'What are the Corporate Tax registration deadlines and late penalties?',
          'What are the UAE mandatory E-Invoicing (Peppol PINT) requirements?',
        ];
  }
}
