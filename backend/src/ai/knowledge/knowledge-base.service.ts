// ============================================================================
// Mizan (ميزان) - Knowledge Base Service
// Verifiable UAE Tax Corpus Ingestion, SHA-256 Deduplication & Hybrid Retrieval
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  LegalCitation,
  LegalDocumentMetadata,
  SearchableKnowledgeChunk,
} from './knowledge.types';
import { OFFICIAL_UAE_TAX_CORPUS } from './official-corpus';

export interface SearchOptions {
  language?: 'en' | 'ar';
  topK?: number;
  minScore?: number;
  businessContext?: {
    tradeName?: string;
    entityType?: string;
    isFreeZone?: boolean;
    annualRevenue?: number;
    hasTradeLicense?: boolean;
    isVatRegistered?: boolean;
    isCorporateTaxRegistered?: boolean;
    licenseIssueMonth?: number;
  };
}

export interface ScoredChunk {
  chunk: SearchableKnowledgeChunk;
  citation: LegalCitation;
  score: number;
  matchedKeywords: string[];
}

export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F]/g, '') // Remove tashkeel (diacritics)
    .replace(/[أإآ]/g, 'ا') // Normalize Alef
    .replace(/ة/g, 'ه') // Normalize Teh Marbuta
    .replace(/ى/g, 'ي') // Normalize Alef Maqsura
    .trim()
    .toLowerCase();
}

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  // In-memory document and chunk storage
  private readonly documents: Map<string, LegalDocumentMetadata> = new Map();
  private readonly chunks: Map<string, SearchableKnowledgeChunk> = new Map();
  private readonly checksumIndex: Set<string> = new Set(); // DocumentId:ArticleNumber:ContentHash

  constructor() {
    this.seedOfficialCorpus();
  }

  /**
   * Seeds the in-memory knowledge store with the curated official UAE tax corpus.
   */
  private seedOfficialCorpus(): void {
    let inserted = 0;
    let skipped = 0;

    for (const doc of OFFICIAL_UAE_TAX_CORPUS) {
      this.documents.set(doc.id, doc);

      for (const article of doc.articles) {
        const hash = this.computeHash(article.contentEn + article.contentAr);
        const chunkId = `${doc.id}-${article.articleNumber.replace(/\s+/g, '-').toLowerCase()}`;

        const chunk: SearchableKnowledgeChunk = {
          chunkId,
          documentId: doc.id,
          documentNumber: doc.documentNumber,
          documentTitle: doc.documentTitle,
          documentType: doc.documentType,
          hierarchyRank: doc.hierarchyRank,
          authority: doc.issuingAuthority,
          articleNumber: article.articleNumber,
          headingEn: article.titleEn,
          headingAr: article.titleAr,
          contentEn: article.contentEn,
          contentAr: article.contentAr,
          keyKeywords: article.keyKeywords,
          effectiveDate: doc.effectiveDate,
          isSuperseded: doc.isSuperseded,
          officialUrl: doc.officialUrl,
          taxCategory: doc.taxCategory,
          contentHash: hash,
        };

        const isIngested = this.ingestChunk(chunk);
        if (isIngested) {
          inserted++;
        } else {
          skipped++;
        }
      }
    }

    this.logger.log(
      `KnowledgeBaseService initialized: ${this.documents.size} documents, ${inserted} statutory article chunks indexed (${skipped} duplicates skipped).`,
    );
  }

  /**
   * Computes SHA-256 hash of text content for deduplication.
   */
  public computeHash(content: string): string {
    return crypto.createHash('sha256').update(content.trim().toLowerCase()).digest('hex');
  }

  /**
   * Ingests a single chunk with SHA-256 deduplication.
   * Returns true if ingested, false if duplicate.
   */
  public ingestChunk(chunk: SearchableKnowledgeChunk): boolean {
    const hash = chunk.contentHash || this.computeHash(chunk.contentEn + chunk.contentAr);
    const key = `${chunk.documentId}:${chunk.articleNumber}:${hash}`;

    if (this.checksumIndex.has(key)) {
      return false; // Duplicate chunk detected
    }

    const chunkToStore: SearchableKnowledgeChunk = {
      ...chunk,
      contentHash: hash,
    };

    this.checksumIndex.add(key);
    this.chunks.set(chunk.chunkId, chunkToStore);
    return true;
  }

  /**
   * Get all registered documents.
   */
  public getAllDocuments(): LegalDocumentMetadata[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get all registered chunks.
   */
  public getAllChunks(): SearchableKnowledgeChunk[] {
    return Array.from(this.chunks.values());
  }

  /**
   * Get specific chunk by chunkId.
   */
  public getChunkById(chunkId: string): SearchableKnowledgeChunk | undefined {
    return this.chunks.get(chunkId);
  }

  /**
   * Format citation from a knowledge chunk.
   */
  public formatCitation(chunk: SearchableKnowledgeChunk, lang: 'en' | 'ar' = 'en'): LegalCitation {
    return {
      id: chunk.chunkId,
      documentTitle: chunk.documentTitle,
      documentNumber: chunk.documentNumber,
      authority: chunk.authority,
      documentType: chunk.documentType,
      article: chunk.articleNumber,
      officialUrl: chunk.officialUrl,
      effectiveDate: chunk.effectiveDate,
      summary: lang === 'ar' ? chunk.contentAr : chunk.contentEn,
      isLegislation: chunk.documentType === 'FEDERAL_DECREE_LAW' || chunk.documentType === 'CABINET_DECISION',
      hierarchyRank: chunk.hierarchyRank,
    };
  }

  /**
   * Performs hybrid, ranked retrieval over the official UAE statutory corpus.
   */
  public searchKnowledge(query: string, options: SearchOptions = {}): ScoredChunk[] {
    const rawQuery = (query || '').trim();
    if (!rawQuery) return [];

    const lang = options.language || (/[\\u0600-\\u06FF]/.test(rawQuery) ? 'ar' : 'en');
    const rawLower = rawQuery.toLowerCase();
    const normalizedQuery = normalizeArabic(rawQuery);
    const topK = options.topK || 5;
    const minScore = options.minScore !== undefined ? options.minScore : 16;
    const bCtx = options.businessContext;

    const scored: ScoredChunk[] = [];

    for (const chunk of this.chunks.values()) {
      let score = 0;
      const matchedKeywords: string[] = [];

      // 1. Keyword Matches
      for (const kw of chunk.keyKeywords) {
        const kwLower = kw.toLowerCase();
        const normKw = normalizeArabic(kw);
        if (rawLower.includes(kwLower) || normalizedQuery.includes(normKw)) {
          score += 18;
          matchedKeywords.push(kw);
        }
      }

      // 2. Exact Article / Decision Number Matching
      const articleClean = chunk.articleNumber.toLowerCase().replace(/article\s+/i, 'art.').trim();
      if (rawLower.includes(chunk.articleNumber.toLowerCase()) || rawLower.includes(articleClean)) {
        score += 25;
        matchedKeywords.push(chunk.articleNumber);
      }
      if (rawLower.includes(chunk.documentNumber.toLowerCase())) {
        score += 25;
        matchedKeywords.push(chunk.documentNumber);
      }
      if (rawLower.includes(chunk.documentId.toLowerCase())) {
        score += 20;
      }

      // 3. Title & Heading Matching
      if (rawLower.includes(chunk.headingEn.toLowerCase()) || rawLower.includes(chunk.documentTitle.toLowerCase())) {
        score += 15;
      }
      if (
        normalizedQuery.includes(normalizeArabic(chunk.headingAr)) ||
        normalizedQuery.includes(normalizeArabic(chunk.documentTitle))
      ) {
        score += 15;
      }

      // 4. Content Term Overlap (excluding common generic tax stop words)
      const contentEnLower = chunk.contentEn.toLowerCase();
      const contentArNorm = normalizeArabic(chunk.contentAr);

      const STOP_WORDS = new Set([
        'what', 'when', 'where', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
        'have', 'has', 'had', 'does', 'doing', 'done', 'will', 'would', 'shall', 'should',
        'from', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before',
        'after', 'above', 'below', 'under', 'rate', 'rates', 'tax', 'taxes', 'taxable',
        'uae', 'united', 'arab', 'emirates', 'dubai', 'abu', 'dhabi', 'salaries', 'salary',
      ]);

      const terms = rawLower
        .split(/[^a-z0-9\u0600-\u06FF]+/)
        .filter((t) => t.length > 3 && !STOP_WORDS.has(t));

      for (const term of terms) {
        if (contentEnLower.includes(term) || contentArNorm.includes(normalizeArabic(term))) {
          score += 4;
        }
      }

      // 5. Domain-Specific Trigger Rules
      // Small Business Relief (SBR)
      if (
        (rawLower.includes('small business') ||
          rawLower.includes('sbr') ||
          rawLower.includes('3 million') ||
          rawLower.includes('3m') ||
          normalizedQuery.includes('تسهيلات') ||
          normalizedQuery.includes('اعمال صغيره') ||
          normalizedQuery.includes('3 ملايين')) &&
        (chunk.chunkId.includes('sbr') || chunk.articleNumber.includes('21'))
      ) {
        score += 35;
      }

      // Qualifying Free Zone Person (QFZP)
      if (
        (rawLower.includes('free zone') ||
          rawLower.includes('freezone') ||
          rawLower.includes('qfzp') ||
          rawLower.includes('qualifying free zone') ||
          rawLower.includes('de minimis') ||
          normalizedQuery.includes('منطقه حره') ||
          normalizedQuery.includes('مؤهل') ||
          normalizedQuery.includes('مؤهله')) &&
        (chunk.chunkId.includes('qfzp') || chunk.articleNumber.includes('18'))
      ) {
        score += 35;
      }

      // Decision 17 (Employee Hotels, Travel, VAT)
      if (
        (rawLower.includes('hotel') ||
          rawLower.includes('travel') ||
          rawLower.includes('employee expense') ||
          rawLower.includes('decision 17') ||
          rawLower.includes('trip') ||
          rawLower.includes('accommodation') ||
          normalizedQuery.includes('سفر') ||
          normalizedQuery.includes('فندق') ||
          normalizedQuery.includes('موظف') ||
          normalizedQuery.includes('قرار 17')) &&
        chunk.documentId.includes('md-17-2026')
      ) {
        score += 40;
      }

      // Entertainment & Client Hospitality (Art 53 VAT / Art 32 CT 50%)
      if (
        (rawLower.includes('entertainment') ||
          rawLower.includes('hospitality') ||
          rawLower.includes('client dinner') ||
          rawLower.includes('50%') ||
          rawLower.includes('50 percent') ||
          normalizedQuery.includes('ترفيه') ||
          normalizedQuery.includes('ضيافه') ||
          normalizedQuery.includes('عشاء') ||
          normalizedQuery.includes('مطعم')) &&
        (chunk.articleNumber.includes('53') || chunk.articleNumber.includes('32'))
      ) {
        score += 35;
      }

      // Natural Persons & Freelancers (Cabinet Decision 49)
      if (
        (rawLower.includes('freelancer') ||
          rawLower.includes('natural person') ||
          rawLower.includes('sole proprietor') ||
          rawLower.includes('1 million') ||
          rawLower.includes('1m') ||
          rawLower.includes('salary') ||
          normalizedQuery.includes('مستقل') ||
          normalizedQuery.includes('شخص طبيعي') ||
          normalizedQuery.includes('مليون') ||
          normalizedQuery.includes('راتب')) &&
        chunk.documentId.includes('cd-49-2023')
      ) {
        score += 35;
      }

      // Penalties & CT Registration Deadlines (Cabinet Decision 75 / FTA Decision 3)
      if (
        (rawLower.includes('penalty') ||
          rawLower.includes('fine') ||
          rawLower.includes('10,000') ||
          rawLower.includes('10000') ||
          rawLower.includes('deadline') ||
          rawLower.includes('late registration') ||
          normalizedQuery.includes('غرامه') ||
          normalizedQuery.includes('تاخير') ||
          normalizedQuery.includes('10000') ||
          normalizedQuery.includes('مهله')) &&
        (chunk.documentId.includes('cd-75-2023') || chunk.documentId.includes('fta-dec-3-2024'))
      ) {
        score += 35;
      }

      // Peppol E-Invoicing Mandate
      if (
        (rawLower.includes('peppol') ||
          rawLower.includes('einvoicing') ||
          rawLower.includes('e-invoice') ||
          rawLower.includes('xml') ||
          rawLower.includes('pint') ||
          normalizedQuery.includes('فوتره') ||
          normalizedQuery.includes('بيبول') ||
          normalizedQuery.includes('الكترونيه')) &&
        chunk.documentId.includes('peppol')
      ) {
        score += 35;
      }

      // SaaS / Reverse Charge Mechanism (RCM Art 48)
      if (
        (rawLower.includes('reverse charge') ||
          rawLower.includes('rcm') ||
          rawLower.includes('saas') ||
          rawLower.includes('imported services') ||
          rawLower.includes('box 3') ||
          rawLower.includes('box 10') ||
          normalizedQuery.includes('احتساب عكسي') ||
          normalizedQuery.includes('سحابيه') ||
          normalizedQuery.includes('برمجيات')) &&
        chunk.articleNumber.includes('48')
      ) {
        score += 35;
      }

      // Tax Losses (Art 37 75% limit)
      if (
        (rawLower.includes('tax loss') ||
          rawLower.includes('loss offset') ||
          rawLower.includes('75%') ||
          rawLower.includes('carry forward') ||
          normalizedQuery.includes('خسائر') ||
          normalizedQuery.includes('ترحيل الخسائر')) &&
        chunk.articleNumber.includes('37')
      ) {
        score += 35;
      }

      // 6. Legislative Hierarchy Rank Weighting (only applied if query has substantial match)
      // Decree-Law > Cabinet Decision > Ministerial Decision > FTA Decision > Guide
      if (score >= 15) {
        const rankWeights: Record<number, number> = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
        score += rankWeights[chunk.hierarchyRank] || 0;
      }

      // 7. Active Business Context Boosting
      if (bCtx) {
        // Free zone entity boosting
        if (bCtx.isFreeZone && (chunk.documentId.includes('qfzp') || chunk.articleNumber.includes('18'))) {
          score += 20;
        }

        // Small business revenue boosting
        if (
          bCtx.annualRevenue !== undefined &&
          bCtx.annualRevenue > 0 &&
          bCtx.annualRevenue <= 3_000_000 &&
          (chunk.documentId.includes('sbr') || chunk.articleNumber.includes('21'))
        ) {
          score += 20;
        }

        // Natural person / Sole establishment boosting
        if (
          (bCtx.entityType === 'SOLE_ESTABLISHMENT' || bCtx.entityType === 'FREELANCER') &&
          chunk.documentId.includes('cd-49-2023')
        ) {
          score += 20;
        }

        // VAT Threshold match (revenue > AED 375,000)
        if (
          bCtx.annualRevenue !== undefined &&
          bCtx.annualRevenue >= 375_000 &&
          !bCtx.isVatRegistered &&
          chunk.articleNumber.includes('13')
        ) {
          score += 12;
        }
      }

      if (score >= minScore) {
        scored.push({
          chunk,
          citation: this.formatCitation(chunk, lang),
          score,
          matchedKeywords,
        });
      }
    }

    // Sort by score descending, then by hierarchy rank ascending (primary law first)
    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.chunk.hierarchyRank - b.chunk.hierarchyRank;
    });

    return scored.slice(0, topK);
  }
}
