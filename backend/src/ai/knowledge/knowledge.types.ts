// ============================================================================
// Mizan (ميزان) - UAE Tax Knowledge Base & Legal Repository Types
// Authoritative source hierarchy, document metadata, and chunking schemas
// ============================================================================

export type LegalDocumentType =
  | 'FEDERAL_DECREE_LAW'
  | 'CABINET_DECISION'
  | 'MINISTERIAL_DECISION'
  | 'FTA_DECISION'
  | 'FTA_PUBLIC_CLARIFICATION'
  | 'FTA_GUIDE'
  | 'MOF_EXPLANATORY_GUIDE';

export type IssuingAuthority = 'MOF' | 'FTA' | 'CABINET';

export type TaxDomain = 'CORPORATE_TAX' | 'VAT' | 'TAX_PROCEDURES' | 'GENERAL';

export type LegalJurisdiction = 'UAE_FEDERAL' | 'MAINLAND' | 'FREE_ZONE' | 'DESIGNATED_FREE_ZONE';

export interface LegalArticle {
  articleNumber: string; // e.g. "Article 21", "Article 53(1)"
  titleEn: string;
  titleAr: string;
  contentEn: string;
  contentAr: string;
  keyKeywords: string[];
}

export interface LegalDocumentMetadata {
  id: string;
  documentTitle: string;
  documentTitleAr: string;
  documentType: LegalDocumentType;
  hierarchyRank: number; // 1 = Law, 2 = Cabinet Decision, 3 = Ministerial Decision, 4 = FTA Decision, 5 = Guide
  issuingAuthority: IssuingAuthority;
  documentNumber: string; // e.g. "Federal Decree-Law No. 47 of 2022"
  taxCategory: TaxDomain;
  jurisdiction: LegalJurisdiction;
  publicationDate: string; // ISO date YYYY-MM-DD
  effectiveDate: string; // Legal effective date YYYY-MM-DD
  isSuperseded: boolean;
  supersededBy?: string;
  language: 'en' | 'ar' | 'bilingual';
  officialUrl: string;
  retrievedAt: string;
  documentVersion: number;
  contentChecksum: string; // SHA-256 of raw corpus text
  articles: LegalArticle[];
}

export interface SearchableKnowledgeChunk {
  chunkId: string;
  documentId: string;
  documentNumber: string;
  documentTitle: string;
  documentType: LegalDocumentType;
  hierarchyRank: number;
  authority: IssuingAuthority;
  articleNumber: string;
  headingEn: string;
  headingAr: string;
  contentEn: string;
  contentAr: string;
  keyKeywords: string[];
  effectiveDate: string;
  isSuperseded: boolean;
  officialUrl: string;
  taxCategory: TaxDomain;
  contentHash: string;
  emaraTaxImpact?: string;
  actionRequiredEn?: string;
  actionRequiredAr?: string;
  suggestedFollowUpsEn?: string[];
  suggestedFollowUpsAr?: string[];
}

export interface LegalCitation {
  id: string;
  documentTitle: string;
  documentNumber: string;
  authority: string;
  documentType: LegalDocumentType;
  article: string;
  officialUrl: string;
  effectiveDate: string;
  summary: string;
  isLegislation: boolean; // true if Decree-Law or Cabinet Decision
  hierarchyRank: number;
}

export interface GroundedRAGResult {
  answer: string;
  citations: LegalCitation[];
  statutoryRationale: string;
  actionRequired: string;
  emaraTaxImpact?: string;
  suggestedFollowUps: string[];
  isGrounded: boolean;
  confidenceScore?: number;
  businessGrounding?: {
    entityName?: string;
    entityType?: string;
    isFreeZone?: boolean;
    applicableRelief?: string;
  };
}
