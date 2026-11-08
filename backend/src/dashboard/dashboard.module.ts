// ============================================================================
// Mizan (ميزان) - Business Intelligence Dashboard Module
// Bundles dashboard, readiness engine, tax calendar, compliance & reports
// ============================================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardService } from './dashboard.service';
import { ReadinessService } from './readiness.service';
import { TaxCalendarService } from './tax-calendar.service';
import { ComplianceActionService } from './compliance-action.service';
import { ReportsService } from './reports.service';
import { DashboardController } from './dashboard.controller';
import { ReportsController } from './reports.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController, ReportsController],
  providers: [
    DashboardService,
    ReadinessService,
    TaxCalendarService,
    ComplianceActionService,
    ReportsService,
  ],
  exports: [
    DashboardService,
    ReadinessService,
    TaxCalendarService,
    ComplianceActionService,
    ReportsService,
  ],
})
export class DashboardModule {}
