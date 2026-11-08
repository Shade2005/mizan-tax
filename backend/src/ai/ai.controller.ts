// ============================================================================
// Mizan (ميزان) - AI Assistant Controller
// Grounded UAE Tax Knowledge, Multi-Tenant Conversations & Legal Citations
// ============================================================================

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { AiService, ChatMessageDto } from './ai.service';
import { ConversationService } from './conversation.service';
import { KnowledgeBaseService } from './knowledge/knowledge-base.service';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.interface';

class ChatRequestDto {
  @ApiProperty({ example: 'Can I recover VAT on employee hotel expenses?' })
  message!: string;

  @ApiProperty({ example: 'en', required: false, enum: ['en', 'ar'] })
  language?: 'en' | 'ar';

  @ApiProperty({ required: false })
  context?: {
    businessType?: string;
    annualRevenue?: number;
    isFreeZone?: boolean;
    licenseIssueMonth?: number;
  };

  @ApiProperty({ required: false })
  businessId?: string;
}

class CreateConversationDto {
  @ApiProperty({ required: false })
  businessId?: string;

  @ApiProperty({ required: false, example: 'Corporate Tax Registration Advice' })
  title?: string;
}

class SendMessageDto {
  @ApiProperty({ example: 'Is my business eligible for Small Business Relief?' })
  content!: string;

  @ApiProperty({ required: false })
  businessId?: string;

  @ApiProperty({ required: false, enum: ['en', 'ar'] })
  language?: 'en' | 'ar';
}

class RenameConversationDto {
  @ApiProperty({ example: 'Updated Topic Title' })
  title!: string;
}

@ApiTags('Grounded AI Tax Assistant')
@ApiBearerAuth()
@Controller('api/v1/ai')
export class AiController {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(ConversationService) private readonly conversationService: ConversationService,
    @Inject(KnowledgeBaseService) private readonly knowledgeBase: KnowledgeBaseService,
  ) {}

  @Public()
  @Get('prompts')
  @ApiOperation({ summary: 'Get curated quick tax prompts in English or Arabic' })
  getPrompts(@Query('lang') lang?: 'en' | 'ar') {
    return this.aiService.getQuickPrompts(lang || 'en');
  }

  @Public()
  @Get('corpus')
  @ApiOperation({ summary: 'Get official UAE tax documents and indexed statutory corpus statistics' })
  getCorpusSummary() {
    const docs = this.knowledgeBase.getAllDocuments();
    const chunks = this.knowledgeBase.getAllChunks();
    return {
      totalDocuments: docs.length,
      totalChunks: chunks.length,
      documents: docs.map((d) => ({
        id: d.id,
        officialNumber: d.documentNumber,
        titleEn: d.documentTitle,
        titleAr: d.documentTitleAr,
        authority: d.issuingAuthority,
        hierarchyRank: d.hierarchyRank,
        officialUrl: d.officialUrl,
      })),
    };
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask single-turn grounded UAE tax question with statutory citations' })
  chat(@Body() dto: ChatRequestDto) {
    return this.aiService.answerTaxQuery(dto);
  }

  // ==========================================================================
  // MULTI-TENANT CONVERSATION THREAD MANAGEMENT
  // ==========================================================================

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new AI conversation thread' })
  async createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const orgId = user.organisationId || 'default-org';
    return this.conversationService.createConversation(
      user.userId,
      orgId,
      dto.businessId,
      dto.title,
    );
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List user conversations' })
  async listConversations(
    @Query('businessId') businessId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const orgId = user.organisationId || 'default-org';
    return this.conversationService.getConversations(user.userId, orgId, businessId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details and full message history' })
  async getConversation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const orgId = user.organisationId || 'default-org';
    return this.conversationService.getConversation(id, user.userId, orgId);
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message in conversation and receive legally grounded response' })
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const orgId = user.organisationId || 'default-org';
    return this.conversationService.sendMessage(
      id,
      user.userId,
      orgId,
      dto.content,
      dto.businessId,
      dto.language,
    );
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Rename conversation thread' })
  async renameConversation(
    @Param('id') id: string,
    @Body() dto: RenameConversationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const orgId = user.organisationId || 'default-org';
    return this.conversationService.renameConversation(id, user.userId, orgId, dto.title);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete conversation thread' })
  async deleteConversation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const orgId = user.organisationId || 'default-org';
    return this.conversationService.deleteConversation(id, user.userId, orgId);
  }
}
