import { Module } from '@nestjs/common';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { VatAssessmentService } from './vat-assessment.service';
import { CorporateTaxAssessmentService } from './corporate-tax-assessment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [TaxController],
  providers: [TaxService, VatAssessmentService, CorporateTaxAssessmentService],
  exports: [TaxService, VatAssessmentService, CorporateTaxAssessmentService],
})
export class TaxModule {}
