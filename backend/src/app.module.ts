import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { BusinessModule } from './business/business.module';
import { TaxModule } from './tax/tax.module';
import { InvoicingModule } from './invoicing/invoicing.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [PrismaModule, BusinessModule, TaxModule, InvoicingModule, AiModule],
})
export class AppModule {}
