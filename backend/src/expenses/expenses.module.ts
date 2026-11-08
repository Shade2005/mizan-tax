// ============================================================================
// Mizan (ميزان) - Expenses Module
// ============================================================================

import { Module, forwardRef } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { BusinessModule } from '../business/business.module';
import { OcrModule } from '../ocr/ocr.module';
import { InvoicingModule } from '../invoicing/invoicing.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    forwardRef(() => BusinessModule),
    forwardRef(() => InvoicingModule),
    OcrModule,
    PrismaModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
