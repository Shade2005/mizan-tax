// ============================================================================
// Mizan (ميزان) - UAE Tax Invoice Compliance Validation Service
// Enforces Article 59 of the Executive Regulation to Federal Decree-Law No. 8 of 2017
// Validates Full Tax Invoices vs Simplified Tax Invoices vs Commercial Invoices
// ============================================================================

import { Injectable } from '@nestjs/common';
import {
  ComplianceValidationResult,
  CustomerRecord,
  InvoiceCalculationSummary,
  InvoiceLineItemInput,
  InvoiceType,
} from './invoice.types';
import { BusinessRecord } from '../business/business.service';

export interface InvoiceValidationPayload {
  business: BusinessRecord;
  customer?: CustomerRecord;
  invoiceNumber: string;
  issueDate: string;
  supplyDate?: string;
  currency: string;
  lines: InvoiceLineItemInput[];
  calculation?: InvoiceCalculationSummary;
  preferredInvoiceType?: InvoiceType;
}

@Injectable()
export class InvoiceValidationService {
  /**
   * Validates an invoice against UAE VAT statutory requirements before issuance.
   * Enforces Article 59(1) and Article 59(5) of Cabinet Decision No. 52 of 2017 (Executive Regulations),
   * as well as Article 65(1) and Article 58(1) of Federal Decree-Law No. 8 of 2017.
   */
  public validateInvoiceForIssuance(payload: InvoiceValidationPayload): ComplianceValidationResult {
    const missing: string[] = [];
    const warnings: string[] = [];
    const citations: string[] = [];

    const { business, customer, invoiceNumber, issueDate, lines, calculation, preferredInvoiceType } = payload;
    const isSupplierRegistered = !!business.vatTrn && business.vatTrn.trim().length >= 15;

    // 1. Determine Appropriate Invoice Classification
    let invoiceType: InvoiceType = 'COMMERCIAL_INVOICE';

    if (!isSupplierRegistered) {
      invoiceType = 'COMMERCIAL_INVOICE';
      citations.push('Article 65(1) Federal Decree-Law No. 8 of 2017: A Person not registered for Tax shall not collect, charge or represent any amount as Tax.');
      citations.push('Article 58(1) Federal Decree-Law No. 8 of 2017: Only registered Taxable Persons making a Taxable Supply may issue a Tax Invoice.');
      // Verify that no VAT was charged by an unregistered business
      const hasVatCharged = calculation ? calculation.totalVat > 0 : false;
      if (hasVatCharged) {
        missing.push('Non-VAT registered business cannot charge 5% VAT or issue a Tax Invoice under Article 65(1) of UAE Federal Decree-Law No. 8 of 2017.');
      }
    } else {
      // Supplier is VAT-registered.
      // Implement Article 59(5) eligibility rules of Cabinet Decision No. 52 of 2017:
      // a. Recipient is not VAT registered: Simplified Tax Invoice may be issued, regardless of consideration amount.
      // b. Recipient is VAT registered and consideration does not exceed AED 10,000: Simplified Tax Invoice may be issued.
      // c. Recipient is VAT registered and consideration exceeds AED 10,000: Full Tax Invoice is MANDATORY.
      // d. The supplier may voluntarily issue a Full Tax Invoice even when simplified invoicing is permitted.
      const totalConsiderationAED = calculation?.statutoryAED.grandTotalAED ?? calculation?.grandTotal ?? 0;
      const isRecipientRegistered = !!customer?.trn && customer.trn.trim().length === 15;
      const isConsiderationOver10k = totalConsiderationAED > 10000;

      const isSimplifiedPermitted = !isRecipientRegistered || (!isConsiderationOver10k);

      if (!isSimplifiedPermitted) {
        // Recipient is VAT registered AND consideration > AED 10,000 -> Full Tax Invoice mandatory under Art. 59(1)
        invoiceType = 'TAX_INVOICE';
        citations.push('Article 59(1) Cabinet Decision No. 52 of 2017: Mandatory Full Tax Invoice for supplies to registered recipients exceeding AED 10,000.');
      } else {
        // Simplified invoicing is permitted under Art. 59(5)(a) or Art. 59(5)(b)
        if (preferredInvoiceType === 'TAX_INVOICE') {
          // Supplier voluntarily elected to issue a Full Tax Invoice
          invoiceType = 'TAX_INVOICE';
          citations.push('Article 59(1) Cabinet Decision No. 52 of 2017: Full Tax Invoice voluntarily issued where simplified invoicing is permitted.');
        } else {
          invoiceType = 'SIMPLIFIED_TAX_INVOICE';
          if (!isRecipientRegistered) {
            citations.push('Article 59(5)(a) Cabinet Decision No. 52 of 2017: Simplified Tax Invoice permitted as recipient is not registered for Tax.');
          } else {
            citations.push('Article 59(5)(b) Cabinet Decision No. 52 of 2017: Simplified Tax Invoice permitted as consideration does not exceed AED 10,000.');
          }
        }
      }
    }

    // 2. Validate Supplier Particulars
    if (!business.legalName && !business.tradeName) {
      missing.push('Supplier Legal Business Name is required.');
    }
    if (isSupplierRegistered && (!business.vatTrn || business.vatTrn.trim().length !== 15)) {
      missing.push('Supplier Tax Registration Number (TRN) must be exactly 15 digits.');
    }

    // 3. Validate Invoice Identifiers & Dates
    if (!invoiceNumber || invoiceNumber.trim() === '') {
      missing.push('Sequential invoice identifier is required under Article 59(1)(d).');
    }
    if (!issueDate || isNaN(Date.parse(issueDate))) {
      missing.push('Valid invoice issue date is required under Article 59(1)(e).');
    }

    // 4. Validate Customer Particulars (Specific to Full Tax Invoices)
    if (invoiceType === 'TAX_INVOICE') {
      if (!customer) {
        missing.push('Customer details are mandatory for a Full Tax Invoice under Article 59(1)(c).');
      } else {
        if (!customer.name && !customer.companyName) {
          missing.push('Customer Name or Company Name is mandatory under Article 59(1)(c).');
        }
        if (!customer.billingAddress || customer.billingAddress.trim() === '') {
          missing.push('Customer billing address is mandatory for a Full Tax Invoice under Article 59(1)(c).');
        }
        if (customer.customerType === 'CORPORATE' && (!customer.trn || customer.trn.trim().length !== 15)) {
          warnings.push('B2B recipient is corporate; ensure 15-digit TRN is recorded for recipient input tax recovery.');
        }
      }
    }

    // 5. Validate Line Items
    if (!lines || lines.length === 0) {
      missing.push('Invoice must contain at least one line item under Article 59(1)(g).');
    } else {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.description || line.description.trim() === '') {
          missing.push(`Line item #${i + 1} is missing a description of goods/services.`);
        }
        if (line.quantity === undefined || line.quantity <= 0) {
          missing.push(`Line item #${i + 1} quantity must be greater than zero.`);
        }
        if (line.unitPrice === undefined || line.unitPrice < 0) {
          missing.push(`Line item #${i + 1} unit price cannot be negative.`);
        }
      }
    }

    // 6. Validate Reverse Charge Disclosure (if any line is REVERSE_CHARGE)
    const hasReverseCharge = lines.some((l) => l.vatTreatment === 'REVERSE_CHARGE');
    if (hasReverseCharge) {
      citations.push(
        'Article 59(1)(i) UAE VAT Executive Regulations: Statement required that the recipient must account for Tax under Article 48 of the Law.',
      );
      if (!customer?.trn) {
        missing.push('Recipient TRN is mandatory for Reverse Charge Mechanism supplies under Article 48.');
      }
    }

    // 7. Validate Currency Conversion Disclosures
    if (payload.currency && payload.currency.toUpperCase() !== 'AED') {
      citations.push(
        'Article 69 UAE VAT Executive Regulations: Currency conversion to AED using CBUAE exchange rate.',
      );
      if (!calculation?.statutoryAED.grandTotalAED) {
        missing.push('Foreign currency invoices must state gross and VAT amounts converted to AED.');
      }
    }

    return {
      isValid: missing.length === 0,
      invoiceType,
      missingMandatoryFields: missing,
      warnings,
      statutoryCitations: citations,
    };
  }
}
