// ============================================================================
// Mizan (ميزان) - Deterministic PDF Invoice Generator Service
// Bilingual (English & Arabic RTL), Mizan Branding, SHA-256 Immutability Checksum
// Enforcing Article 59 & Article 69 of UAE VAT Executive Regulations
// ============================================================================

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { InvoiceRecord } from './invoice.types';
import { BusinessRecord } from '../business/business.service';

@Injectable()
export class InvoicePdfService {
  /**
   * Generates a fully compliant, print-ready HTML/CSS document for the invoice
   * and calculates a SHA-256 integrity checksum of the rendered document.
   */
  public generateInvoiceHtml(
    invoice: InvoiceRecord,
    business: BusinessRecord,
  ): { html: string; checksum: string } {
    const isAr = true; // Bilingual English & Arabic layout
    const isTaxInvoice = invoice.invoiceType === 'TAX_INVOICE' || invoice.invoiceType === 'SIMPLIFIED_TAX_INVOICE';
    const isFullTax = invoice.invoiceType === 'TAX_INVOICE';
    const isCommercial = invoice.invoiceType === 'COMMERCIAL_INVOICE';

    const calc = invoice.calculation;
    const isForeignCurrency = invoice.currency.toUpperCase() !== 'AED';

    // Header Title
    let titleEn = 'TAX INVOICE';
    let titleAr = 'فاتورة ضريبية';
    if (invoice.invoiceType === 'SIMPLIFIED_TAX_INVOICE') {
      titleEn = 'SIMPLIFIED TAX INVOICE';
      titleAr = 'فاتورة ضريبية مبسطة';
    } else if (isCommercial) {
      titleEn = 'COMMERCIAL INVOICE';
      titleAr = 'فاتورة تجارية';
    }

    // Line items HTML
    const linesHtml = invoice.lines
      .map(
        (l, idx) => `
        <tr>
          <td style="text-align: center; color: #64748B;">${idx + 1}</td>
          <td>
            <div style="font-weight: 700; color: #0F172A;">${this.escape(l.description)}</div>
            ${l.itemName ? `<div style="font-size: 11px; color: #64748B;">${this.escape(l.itemName)}</div>` : ''}
            <div style="font-size: 10px; color: #94A3B8;">${this.escape(l.statutoryLegalBasis)}</div>
          </td>
          <td style="text-align: center;">${l.quantity} ${this.escape(l.unit)}</td>
          <td style="text-align: right;">${l.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: ${l.discount > 0 ? '#DC2626' : '#64748B'};">
            ${l.discount > 0 ? `-${l.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '0.00'}
          </td>
          <td style="text-align: right; font-weight: 600;">${l.taxableAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td style="text-align: center; font-weight: 700; color: #F95700;">${l.vatRatePercentage}%</td>
          <td style="text-align: right;">${l.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right; font-weight: 800; color: #0F172A;">${l.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        </tr>`,
      )
      .join('\n');

    // VAT Breakdown HTML
    const vatBreakdownHtml = calc.vatBreakdown
      .map(
        (v) => `
        <tr>
          <td><strong>${v.treatment} (${v.ratePct}%)</strong><br/><small style="color: #64748B;">${v.legalBasis}</small></td>
          <td style="text-align: right;">${v.taxableAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${invoice.currency}</td>
          <td style="text-align: right; font-weight: 700; color: #F95700;">${v.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${invoice.currency}</td>
          ${
            isForeignCurrency
              ? `
            <td style="text-align: right;">${v.taxableAmountAED.toLocaleString(undefined, { minimumFractionDigits: 2 })} AED</td>
            <td style="text-align: right; font-weight: 700; color: #F95700;">${v.vatAmountAED.toLocaleString(undefined, { minimumFractionDigits: 2 })} AED</td>`
              : ''
          }
        </tr>`,
      )
      .join('\n');

    // Check Reverse Charge
    const hasReverseCharge = invoice.lines.some((l) => l.vatTreatment === 'REVERSE_CHARGE');

    const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.escape(invoice.invoiceNumber)} - ${titleEn}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      margin: 0;
      padding: 24px;
      font-size: 12px;
      line-height: 1.5;
    }
    .header-table { width: 100%; border-bottom: 2px solid #F95700; padding-bottom: 16px; margin-bottom: 20px; }
    .brand-title { font-size: 24px; font-weight: 900; color: #F95700; letter-spacing: -0.5px; }
    .brand-sub { font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase; }
    .invoice-title-en { font-size: 20px; font-weight: 900; color: #0F172A; text-align: right; }
    .invoice-title-ar { font-size: 16px; font-weight: 800; color: #F95700; text-align: right; direction: rtl; }
    .parties-grid { display: flex; justify-content: space-between; margin-bottom: 24px; gap: 20px; }
    .party-card {
      flex: 1;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .party-heading { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #F95700; margin-bottom: 6px; }
    .meta-box {
      background: #FFF7ED;
      border: 1px solid #FED7AA;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 20px;
    }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .meta-item strong { display: block; font-size: 10px; color: #9A3412; text-transform: uppercase; }
    .meta-item span { font-size: 13px; font-weight: 800; color: #431407; }
    table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
    table.data-table th {
      background: #F1F5F9;
      color: #334155;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 8px 10px;
      border-bottom: 2px solid #CBD5E1;
    }
    table.data-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
      font-size: 11px;
    }
    .totals-container { display: flex; justify-content: flex-end; margin-top: 10px; margin-bottom: 20px; }
    .totals-card {
      width: 320px;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 14px;
    }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
    .totals-row.grand-total {
      border-top: 2px solid #0F172A;
      margin-top: 6px;
      padding-top: 8px;
      font-size: 15px;
      font-weight: 900;
      color: #0F172A;
    }
    .statutory-badge {
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      border-radius: 6px;
      padding: 10px 12px;
      margin-top: 12px;
      font-size: 11px;
      color: #065F46;
    }
    .rcm-badge {
      background: #FEF3C7;
      border: 1px solid #FCD34D;
      border-radius: 6px;
      padding: 10px 12px;
      margin-top: 10px;
      font-size: 11px;
      color: #92400E;
      font-weight: 600;
    }
    .e-invoice-notice {
      border: 1px dashed #CBD5E1;
      border-radius: 6px;
      padding: 8px 12px;
      margin-top: 20px;
      font-size: 10px;
      color: #64748B;
      text-align: center;
    }
    .footer-row { margin-top: 20px; border-top: 1px solid #E2E8F0; padding-top: 10px; font-size: 10px; color: #94A3B8; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <!-- Header -->
  <table class="header-table">
    <tr>
      <td>
        <div class="brand-title">Mizan ميزان</div>
        <div class="brand-sub">UAE Tax Intelligence & Compliance</div>
      </td>
      <td>
        <div class="invoice-title-en">${titleEn}</div>
        <div class="invoice-title-ar">${titleAr}</div>
      </td>
    </tr>
  </table>

  <!-- Invoice Meta Details -->
  <div class="meta-box">
    <div class="meta-grid">
      <div class="meta-item">
        <strong>Invoice Number / رقم الفاتورة</strong>
        <span>${this.escape(invoice.invoiceNumber)}</span>
      </div>
      <div class="meta-item">
        <strong>Issue Date / تاريخ الإصدار</strong>
        <span>${this.escape(invoice.issueDate)}</span>
      </div>
      <div class="meta-item">
        <strong>Supply Date / تاريخ التوريد</strong>
        <span>${this.escape(invoice.supplyDate)}</span>
      </div>
      <div class="meta-item">
        <strong>Due Date / تاريخ الاستحقاق</strong>
        <span>${this.escape(invoice.dueDate)}</span>
      </div>
    </div>
  </div>

  <!-- Parties Grid -->
  <div class="parties-grid">
    <!-- Supplier -->
    <div class="party-card">
      <div class="party-heading">Supplier Details / بيانات المورّد</div>
      <div style="font-size: 13px; font-weight: 800; color: #0F172A;">${this.escape(business.legalName)}</div>
      ${business.tradeName ? `<div style="font-weight: 600; color: #475569;">${this.escape(business.tradeName)}</div>` : ''}
      <div style="margin-top: 4px;"><strong>TRN / الرقم الضريبي:</strong> ${business.vatTrn ? this.escape(business.vatTrn) : 'Not VAT Registered'}</div>
      <div><strong>Licence No / رقم الرخصة:</strong> ${this.escape(business.tradeLicenseNumber)}</div>
      <div><strong>Authority:</strong> ${this.escape(business.licensingAuthority)} (${business.jurisdictionType})</div>
      <div>${this.escape(business.emirate || 'United Arab Emirates')}</div>
    </div>

    <!-- Recipient / Customer -->
    <div class="party-card">
      <div class="party-heading">Customer Details / بيانات العميل</div>
      <div style="font-size: 13px; font-weight: 800; color: #0F172A;">${this.escape(invoice.customer.name)}</div>
      ${invoice.customer.companyName ? `<div style="font-weight: 600; color: #475569;">${this.escape(invoice.customer.companyName)}</div>` : ''}
      <div style="margin-top: 4px;"><strong>Customer TRN / الرقم الضريبي:</strong> ${invoice.customer.trn ? this.escape(invoice.customer.trn) : 'N/A'}</div>
      <div><strong>Address / العنوان:</strong> ${this.escape(invoice.customer.billingAddress)}</div>
      <div>${this.escape(invoice.customer.emirate || '')} ${this.escape(invoice.customer.country)}</div>
      ${invoice.customer.email ? `<div><strong>Email:</strong> ${this.escape(invoice.customer.email)}</div>` : ''}
    </div>
  </div>

  <!-- Line Items Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>Description / البيان</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price (${invoice.currency})</th>
        <th style="text-align: right;">Discount</th>
        <th style="text-align: right;">Taxable Amount</th>
        <th style="text-align: center;">VAT %</th>
        <th style="text-align: right;">VAT (${invoice.currency})</th>
        <th style="text-align: right;">Total (${invoice.currency})</th>
      </tr>
    </thead>
    <tbody>
      ${linesHtml}
    </tbody>
  </table>

  <!-- Totals Section -->
  <div class="totals-container">
    <div class="totals-card">
      <div class="totals-row">
        <span>Gross Subtotal / الإجمالي الفرعي:</span>
        <span>${calc.subtotalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${invoice.currency}</span>
      </div>
      ${
        calc.totalDiscount > 0
          ? `<div class="totals-row" style="color: #DC2626;">
              <span>Total Discount / إجمالي الخصم:</span>
              <span>-${calc.totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${invoice.currency}</span>
            </div>`
          : ''
      }
      <div class="totals-row">
        <span>Net Taxable Amount / الدخل الخاضع للضريبة:</span>
        <span style="font-weight: 700;">${calc.subtotalNetTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${invoice.currency}</span>
      </div>
      <div class="totals-row">
        <span>Total VAT / إجمالي ضريبة القيمة المضافة:</span>
        <span style="font-weight: 700; color: #F95700;">${calc.totalVat.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${invoice.currency}</span>
      </div>
      <div class="totals-row grand-total">
        <span>Grand Total / الإجمالي النهائي:</span>
        <span>${calc.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${invoice.currency}</span>
      </div>
      <div class="totals-row" style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #CBD5E1;">
        <span>Amount Paid / المبلغ المسدد:</span>
        <span>${calc.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${invoice.currency}</span>
      </div>
      <div class="totals-row" style="font-weight: 800; color: ${calc.outstandingBalance > 0 ? '#DC2626' : '#059669'};">
        <span>Balance Due / الرصيد المستحق:</span>
        <span>${calc.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${invoice.currency}</span>
      </div>
    </div>
  </div>

  <!-- Statutory Currency Conversion Summary (Art. 69) -->
  ${
    isForeignCurrency
      ? `
    <div class="statutory-badge">
      <strong>Official UAE Statutory Currency Conversion (Article 69 UAE VAT Regulations):</strong><br/>
      Applied Exchange Rate: <strong>1 ${invoice.currency} = ${calc.exchangeRate} AED</strong> 
      (${invoice.exchangeRateEvidence?.rateSource === 'CBUAE_OFFICIAL_FIX' ? 'Official CBUAE Pegged Rate' : invoice.exchangeRateEvidence?.rateSource || 'CBUAE Published Rate'})<br/>
      Date of Supply Used: <strong>${invoice.exchangeRateEvidence?.supplyDateUsed || invoice.supplyDate}</strong> | 
      Effective Rate Date: <strong>${invoice.exchangeRateEvidence?.effectiveDate || invoice.supplyDate}</strong><br/>
      Net Taxable Amount (AED): <strong>${calc.statutoryAED.subtotalNetTaxableAED.toLocaleString(undefined, { minimumFractionDigits: 2 })} AED</strong> | 
      Total VAT Payable (AED): <strong>${calc.statutoryAED.totalVatAED.toLocaleString(undefined, { minimumFractionDigits: 2 })} AED</strong> | 
      Grand Total Payable (AED): <strong>${calc.statutoryAED.grandTotalAED.toLocaleString(undefined, { minimumFractionDigits: 2 })} AED</strong>
    </div>`
      : ''
  }

  <!-- Reverse Charge Mechanism Notice (Art. 48) -->
  ${
    hasReverseCharge
      ? `
    <div class="rcm-badge">
      ⚠️ <strong>Reverse Charge Mechanism Notice (Article 48 Federal Decree-Law No. 8 of 2017):</strong><br/>
      The recipient is required to account for the Value Added Tax on the supplied services in their tax return under the Reverse Charge provisions.
    </div>`
      : ''
  }

  <!-- VAT Breakdown Table -->
  ${
    calc.vatBreakdown.length > 0
      ? `
    <div style="margin-top: 16px;">
      <div style="font-size: 11px; font-weight: 800; color: #334155; margin-bottom: 4px;">VAT Rate Breakdown / تحليل ضريبة القيمة المضافة:</div>
      <table class="data-table" style="margin-top: 4px;">
        <thead>
          <tr>
            <th>Treatment & Legal Basis</th>
            <th style="text-align: right;">Taxable Amount</th>
            <th style="text-align: right;">VAT Amount</th>
            ${isForeignCurrency ? `<th style="text-align: right;">Taxable (AED)</th><th style="text-align: right;">VAT (AED)</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${vatBreakdownHtml}
        </tbody>
      </table>
    </div>`
      : ''
  }

  <!-- Verification QR Code Block -->
  <div style="margin-top: 16px; display: flex; align-items: center; gap: 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px;">
    <div style="width: 72px; height: 72px; background: #0F172A; color: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 6px; font-size: 9px; font-weight: 800; text-align: center; line-height: 1.2;">
      <span>QR</span>
      <span style="font-size: 7px; color: #94A3B8;">VERIFY</span>
      <span style="font-size: 6px; color: #F95700;">MIZAN</span>
    </div>
    <div style="font-size: 10px; color: #475569; line-height: 1.4;">
      <strong>Statutory Digital Verification Data:</strong><br/>
      Supplier TRN: <strong>${business.vatTrn || 'N/A (Unregistered)'}</strong> | Invoice No: <strong>${this.escape(invoice.invoiceNumber)}</strong><br/>
      Total Payable: <strong>${calc.statutoryAED.grandTotalAED.toFixed(2)} AED</strong> | VAT: <strong>${calc.statutoryAED.totalVatAED.toFixed(2)} AED</strong><br/>
      Issued: <strong>${invoice.issuedAt || invoice.issueDate}</strong>
    </div>
  </div>

  <!-- Notes & Terms -->
  ${
    invoice.notes || invoice.termsAndConditions
      ? `
    <div style="margin-top: 14px; background: #F8FAFC; border-radius: 6px; padding: 10px 12px; border: 1px solid #E2E8F0;">
      ${invoice.notes ? `<div><strong>Notes:</strong> ${this.escape(invoice.notes)}</div>` : ''}
      ${invoice.termsAndConditions ? `<div style="margin-top: 4px;"><strong>Terms & Conditions:</strong> ${this.escape(invoice.termsAndConditions)}</div>` : ''}
    </div>`
      : ''
  }

  <!-- UAE e-Invoicing Notice -->
  <div class="e-invoice-notice">
    <strong>UAE Ministry of Finance e-Billing System Regulatory Disclosure (November 2026):</strong> This document is a valid human-readable invoice produced in compliance with Article 59 of Cabinet Decision No. 52 of 2017. It is a persisted business record within Mizan. It does not constitute a structured PINT AE electronic invoice, nor has it been cleared or transmitted through an Accredited Service Provider (ASP) or submitted directly to the Federal Tax Authority (FTA). Transmission via an accredited ASP requires certified API credentials under the MoF Federal e-Billing framework.
  </div>

  <!-- Document Integrity Footer -->
  <div class="footer-row">
    <div>Generated by Mizan UAE Tax Intelligence</div>
    <div>Document Content Digest (SHA-256): ${invoice.pdfChecksum || 'UNCOMMITTED-DRAFT'} (Tamper-detection digest; does not constitute a digital signature or government clearance seal)</div>
    <div>Status: ${invoice.status}</div>
  </div>
</body>
</html>`;

    const checksum = crypto.createHash('sha256').update(html).digest('hex');

    return {
      html,
      checksum,
    };
  }

  /**
   * Generates a fully compliant print-ready Tax Credit Note HTML under Article 60 of Cabinet Decision No. 52 of 2017.
   */
  public generateCreditNoteHtml(
    creditNote: {
      creditNoteNumber: string;
      originalInvoiceNumber: string;
      issueDate: string;
      reason: string;
      subtotalCredited: number;
      vatCredited: number;
      totalCredited: number;
      currency: string;
      statutoryBasis?: string;
    },
    originalInvoice: InvoiceRecord,
    business: BusinessRecord,
  ): { html: string; checksum: string } {
    const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <title>${this.escape(creditNote.creditNoteNumber)} - TAX CREDIT NOTE</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0F172A; padding: 24px; font-size: 12px; }
    .header { border-bottom: 2px solid #DC2626; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
    .title-en { font-size: 22px; font-weight: 900; color: #DC2626; }
    .title-ar { font-size: 16px; font-weight: 800; color: #DC2626; direction: rtl; }
    .card { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title-en">TAX CREDIT NOTE</div>
      <div class="title-ar">إشعار دائن ضريبي</div>
      <div style="font-size: 11px; color: #64748B;">Issued under Article 60 Cabinet Decision No. 52/2017</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 16px; font-weight: 800;">${this.escape(creditNote.creditNoteNumber)}</div>
      <div>Date: ${this.escape(creditNote.issueDate)}</div>
    </div>
  </div>

  <div class="card">
    <div class="grid">
      <div><strong>Original Invoice Ref:</strong> ${this.escape(creditNote.originalInvoiceNumber)}</div>
      <div><strong>Supplier TRN:</strong> ${this.escape(business.vatTrn || 'N/A')}</div>
      <div><strong>Customer:</strong> ${this.escape(originalInvoice.customer.name)}</div>
    </div>
    <div style="margin-top: 8px;"><strong>Circumstance / Reason for Credit:</strong> ${this.escape(creditNote.reason)}</div>
    <div style="margin-top: 4px; font-size: 10px; color: #64748B;"><strong>Statutory Authority:</strong> Article 60 of Executive Regulations & Article 70 of Federal Decree-Law No. 8 of 2017</div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-top: 14px;">
    <tr style="background: #F1F5F9; border-bottom: 2px solid #CBD5E1; font-weight: 800; font-size: 11px;">
      <th style="padding: 8px; text-align: left;">Description</th>
      <th style="padding: 8px; text-align: right;">Subtotal Credited</th>
      <th style="padding: 8px; text-align: right;">VAT Credited (5%)</th>
      <th style="padding: 8px; text-align: right;">Total Reduction (${creditNote.currency})</th>
    </tr>
    <tr style="border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 8px;">Adjustment against original supply (${this.escape(creditNote.originalInvoiceNumber)})</td>
      <td style="padding: 8px; text-align: right;">${creditNote.subtotalCredited.toFixed(2)}</td>
      <td style="padding: 8px; text-align: right;">${creditNote.vatCredited.toFixed(2)}</td>
      <td style="padding: 8px; text-align: right; font-weight: 800; color: #DC2626;">-${creditNote.totalCredited.toFixed(2)}</td>
    </tr>
  </table>
</body>
</html>`;

    const checksum = crypto.createHash('sha256').update(html).digest('hex');
    return { html, checksum };
  }

  private escape(str?: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
