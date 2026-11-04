// ============================================================================
// Mizan (ميزان) - AI Assistant Controller
// Grounded UAE Tax Knowledge Endpoint
// ============================================================================

import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { AiService, ChatMessageDto } from './ai.service';

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
}

@ApiTags('Grounded AI Tax Assistant')
@Controller('api/v1/ai')
export class AiController {
  constructor(@Inject(AiService) private readonly aiService: AiService) {}

  @Get('prompts')
  @ApiOperation({ summary: 'Get curated quick tax prompts in English or Arabic' })
  getPrompts(@Query('lang') lang?: 'en' | 'ar') {
    return this.aiService.getQuickPrompts(lang || 'en');
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask grounded UAE tax question with statutory citations' })
  chat(@Body() dto: ChatRequestDto) {
    return this.aiService.answerTaxQuery(dto);
  }
}
