// ============================================================================
// Mizan (ميزان) - Business-Specific Sequential Numbering Service
// Concurrency-Safe, Business-Isolated Sequential Invoice Identifiers
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InvoiceNumberService {
  private readonly logger = new Logger(InvoiceNumberService.name);

  // In-memory sequence counters per business: `${businessId}:${type}:${year}` -> counter
  private readonly sequenceCounters: Map<string, number> = new Map();

  /**
   * Generates the next sequential invoice number for a specific business entity.
   * Concurrency-safe, business-isolated, and deterministic.
   */
  public getNextInvoiceNumber(
    businessId: string,
    prefix: 'INV' | 'CN' = 'INV',
    year: number = new Date().getFullYear(),
  ): { invoiceNumber: string; sequenceNumber: number } {
    const key = `${businessId}:${prefix}:${year}`;
    const current = this.sequenceCounters.get(key) || 0;
    const nextSequence = current + 1;

    this.sequenceCounters.set(key, nextSequence);

    // Format: INV-2026-0001, CN-2026-0001
    const padded = String(nextSequence).padStart(4, '0');
    const invoiceNumber = `${prefix}-${year}-${padded}`;

    return {
      invoiceNumber,
      sequenceNumber: nextSequence,
    };
  }

  /**
   * Peak at current sequence count for a business without incrementing.
   */
  public getCurrentSequence(
    businessId: string,
    prefix: 'INV' | 'CN' = 'INV',
    year: number = new Date().getFullYear(),
  ): number {
    const key = `${businessId}:${prefix}:${year}`;
    return this.sequenceCounters.get(key) || 0;
  }

  /**
   * Sets sequence counter (e.g. when syncing from persistent database).
   */
  public setSequence(
    businessId: string,
    prefix: 'INV' | 'CN',
    year: number,
    value: number,
  ): void {
    const key = `${businessId}:${prefix}:${year}`;
    const current = this.sequenceCounters.get(key) || 0;
    if (value > current) {
      this.sequenceCounters.set(key, value);
    }
  }
}
