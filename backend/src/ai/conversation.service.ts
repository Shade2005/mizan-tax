// ============================================================================
// Mizan (ميزان) - AI Conversation & Thread Management Service
// Multi-Tenant Isolation, Persistent Chat History & Contextual Grounding
// ============================================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { RagService, BusinessContextInput } from './rag.service';
import { GroundedRAGResult } from './knowledge/knowledge.types';
import { BusinessService } from '../business/business.service';

export interface StoredMessage {
  id: string;
  aiConversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citationsJson?: any;
  createdAt: Date;
}

export interface StoredConversation {
  id: string;
  userId: string;
  organisationId: string;
  businessId?: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: StoredMessage[];
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  // In-memory conversation store for testing / offline execution
  private readonly conversations: Map<string, StoredConversation> = new Map();

  constructor(
    @Inject(forwardRef(() => RagService)) private readonly ragService: RagService,
    @Optional() @Inject(forwardRef(() => BusinessService)) private readonly businessService?: BusinessService,
  ) {}

  /**
   * Creates a new conversation for a user within an organisation.
   */
  public async createConversation(
    userId: string,
    organisationId: string,
    businessId?: string,
    title?: string,
  ): Promise<StoredConversation> {
    const id = crypto.randomUUID();
    const conv: StoredConversation = {
      id,
      userId,
      organisationId,
      businessId: businessId || undefined,
      title: title || 'New Tax Inquiry',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    };

    this.conversations.set(id, conv);
    return conv;
  }

  /**
   * Retrieves all conversations for a specific user and organisation.
   */
  public async getConversations(
    userId: string,
    organisationId: string,
    businessId?: string,
  ): Promise<StoredConversation[]> {
    const userConvs: StoredConversation[] = [];

    for (const conv of this.conversations.values()) {
      if (conv.userId === userId && conv.organisationId === organisationId) {
        if (!businessId || conv.businessId === businessId) {
          userConvs.push(conv);
        }
      }
    }

    return userConvs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Retrieves a conversation by ID, enforcing strict tenant and user isolation.
   */
  public async getConversation(
    conversationId: string,
    userId: string,
    organisationId: string,
  ): Promise<StoredConversation> {
    const conv = this.conversations.get(conversationId);
    if (!conv) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    // Strict multi-tenant security verification
    if (conv.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied: cross-tenant conversation access is prohibited');
    }

    if (conv.userId !== userId) {
      throw new ForbiddenException('Access denied: conversation belongs to another user');
    }

    return conv;
  }

  /**
   * Sends a user message to a conversation, performs RAG retrieval, and records the grounded response.
   */
  public async sendMessage(
    conversationId: string,
    userId: string,
    organisationId: string,
    content: string,
    businessId?: string,
    language?: 'en' | 'ar',
  ): Promise<{
    userMessage: StoredMessage;
    assistantMessage: StoredMessage;
    ragResult: GroundedRAGResult;
  }> {
    const conv = await this.getConversation(conversationId, userId, organisationId);

    // Resolve business context
    const activeBizId = businessId || conv.businessId;
    let businessContext: BusinessContextInput | undefined = undefined;

    if (activeBizId && this.businessService) {
      try {
        const biz = await this.businessService.getBusinessById(activeBizId, organisationId);
        if (biz) {
          const isFreeZone =
            biz.jurisdictionType === 'FREE_ZONE' ||
            (biz.licensingAuthority && biz.licensingAuthority.toLowerCase().includes('free zone')) ||
            false;

          businessContext = {
            tradeName: biz.tradeName || biz.legalName,
            legalForm: biz.legalEntityType,
            entityType: biz.legalEntityType,
            isFreeZone,
            annualRevenue: biz.annualRevenueEstimateAED,
            hasTradeLicense: !!biz.tradeLicenseNumber,
            isVatRegistered: !!biz.vatTrn,
            isCorporateTaxRegistered: !!biz.corporateTaxTrn,
          };
          if (!conv.businessId) {
            conv.businessId = activeBizId;
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to resolve business context for ${activeBizId}: ${err.message}`);
      }
    }

    // Record user message
    const userMsg: StoredMessage = {
      id: crypto.randomUUID(),
      aiConversationId: conv.id,
      role: 'user',
      content: content.trim(),
      createdAt: new Date(),
    };
    conv.messages.push(userMsg);

    // Auto-title conversation from first user message if default
    if (conv.title === 'New Tax Inquiry' && conv.messages.length === 1) {
      conv.title = content.trim().slice(0, 40) + (content.length > 40 ? '...' : '');
    }

    // Assemble conversation history for context
    const conversationHistory = conv.messages.slice(-6).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Perform RAG synthesis
    const ragResult = await this.ragService.generateGroundedAnswer({
      query: content,
      language,
      businessContext,
      conversationHistory,
    });

    // Record assistant message with full verified citations
    const assistantMsg: StoredMessage = {
      id: crypto.randomUUID(),
      aiConversationId: conv.id,
      role: 'assistant',
      content: ragResult.answer,
      citationsJson: {
        citations: ragResult.citations,
        statutoryRationale: ragResult.statutoryRationale,
        actionRequired: ragResult.actionRequired,
        emaraTaxImpact: ragResult.emaraTaxImpact,
        suggestedFollowUps: ragResult.suggestedFollowUps,
        isGrounded: ragResult.isGrounded,
        businessGrounding: ragResult.businessGrounding,
      },
      createdAt: new Date(),
    };
    conv.messages.push(assistantMsg);
    conv.updatedAt = new Date();

    return {
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      ragResult,
    };
  }

  /**
   * Renames a conversation.
   */
  public async renameConversation(
    conversationId: string,
    userId: string,
    organisationId: string,
    newTitle: string,
  ): Promise<StoredConversation> {
    const conv = await this.getConversation(conversationId, userId, organisationId);
    conv.title = newTitle.trim();
    conv.updatedAt = new Date();
    return conv;
  }

  /**
   * Deletes a conversation.
   */
  public async deleteConversation(
    conversationId: string,
    userId: string,
    organisationId: string,
  ): Promise<{ success: boolean; id: string }> {
    await this.getConversation(conversationId, userId, organisationId);
    this.conversations.delete(conversationId);
    return { success: true, id: conversationId };
  }
}
