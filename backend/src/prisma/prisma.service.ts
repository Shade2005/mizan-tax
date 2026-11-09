// ============================================================================
// Mizan (ميزان) - Prisma Database Service
// PostgreSQL Lifecycle Manager with Multi-Tenant Support & Graceful Fallback
// ============================================================================

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
  }

  async onModuleInit() {
    if (process.env.DATABASE_URL) {
      try {
        await this.$connect();
        this.logger.log('Connected to PostgreSQL database successfully.');
      } catch (err: any) {
        this.logger.warn(`PostgreSQL connection deferred: ${err.message}`);
      }
    } else {
      this.logger.warn('DATABASE_URL environment variable is not defined.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
