import { Module, forwardRef } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { KnowledgeBaseService } from './knowledge/knowledge-base.service';
import { RagService } from './rag.service';
import { ConversationService } from './conversation.service';
import { BusinessModule } from '../business/business.module';

@Module({
  imports: [forwardRef(() => BusinessModule)],
  controllers: [AiController],
  providers: [
    KnowledgeBaseService,
    RagService,
    ConversationService,
    AiService,
  ],
  exports: [
    KnowledgeBaseService,
    RagService,
    ConversationService,
    AiService,
  ],
})
export class AiModule {}
