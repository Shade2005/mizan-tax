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
    let url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || '';
    if (url && url.includes('.neon.tech') && !url.includes('-pooler.')) {
      url = url.replace('.c-', '-pooler.c-');
    }
    if (url) {
      process.env.DATABASE_URL = url;
    }
    super(
      url
        ? {
            datasources: {
              db: { url },
            },
          }
        : undefined
    );
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
