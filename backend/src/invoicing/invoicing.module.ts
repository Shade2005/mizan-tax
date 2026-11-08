import { Module, forwardRef } from '@nestjs/common';
import { InvoicingController } from './invoicing.controller';
import { InvoicingService } from './invoicing.service';
import { InvoiceCalculationService } from './invoice-calculation.service';
import { InvoiceValidationService } from './invoice-validation.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { BusinessModule } from '../business/business.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [forwardRef(() => BusinessModule), PrismaModule],
  controllers: [InvoicingController],
  providers: [
    InvoicingService,
    InvoiceCalculationService,
    InvoiceValidationService,
    InvoiceNumberService,
    InvoicePdfService,
  ],
  exports: [
    InvoicingService,
    InvoiceCalculationService,
    InvoiceValidationService,
    InvoiceNumberService,
    InvoicePdfService,
  ],
})
export class InvoicingModule {}
