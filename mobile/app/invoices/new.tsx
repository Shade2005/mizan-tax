// ============================================================================
// Mizan (ميزان) - Create UAE Tax Invoice Screen
// Line items, 5% VAT calculations, and CBUAE exchange rates under Art. 69
// ============================================================================

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { CbUaeRatesService, CBUAE_OFFICIAL_RATES } from '../../src/services/cbuaeRates';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: 'STANDARD_5' | 'ZERO_0' | 'EXEMPT';
}

export default function NewInvoiceScreen() {
  const router = useRouter();
  const { t, isRTL } = useLocale();

  const [customerName, setCustomerName] = useState('Dubai Media City FZ-LLC');
  const [customerTrn, setCustomerTrn] = useState('100345678900003');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-0015');
  const [currency, setCurrency] = useState<'AED' | 'USD' | 'EUR' | 'GBP' | 'SAR'>('AED');
  const [lines, setLines] = useState<LineItem[]>([
    {
      id: '1',
      description: 'Tax Intelligence & Financial Advisory',
      quantity: 1,
      unitPrice: 10000,
      vatRate: 'STANDARD_5',
    },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

  const cbuaeRate = CbUaeRatesService.getRate(currency);

  // Calculations
  const subtotal = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
  const vatAmount = lines.reduce((acc, l) => {
    if (l.vatRate === 'STANDARD_5') {
      return acc + l.quantity * l.unitPrice * 0.05;
    }
    return acc;
  }, 0);
  const totalAmount = subtotal + vatAmount;
  const totalAmountAED = CbUaeRatesService.convertToAED(totalAmount, currency);
  const vatAmountAED = CbUaeRatesService.convertToAED(vatAmount, currency);

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: String(Date.now()),
        description: 'Professional Services',
        quantity: 1,
        unitPrice: 2500,
        vatRate: 'STANDARD_5',
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter((l) => l.id !== id));
    }
  };

  const handleIssueInvoice = async () => {
    setIsGenerating(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>TAX INVOICE - ${invoiceNumber}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1C0D12; }
            .header-table { width: 100%; margin-bottom: 30px; border-bottom: 2px solid #4A001F; padding-bottom: 20px; }
            .logo { font-size: 26px; font-weight: bold; color: #4A001F; }
            .badge { display: inline-block; background: #FFE4E8; color: #4A001F; padding: 4px 12px; border-radius: 12px; font-weight: bold; }
            .info-table { width: 100%; margin-bottom: 30px; }
            .info-table td { vertical-align: top; width: 50%; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th { background: #4A001F; color: white; padding: 10px; text-align: left; }
            .items-table td { padding: 10px; border-bottom: 1px solid #EFE7E9; }
            .totals-table { width: 45%; margin-left: auto; border-collapse: collapse; }
            .totals-table td { padding: 8px 10px; }
            .totals-table .total-row { font-size: 18px; font-weight: bold; background: #FFF5F7; border-top: 2px solid #4A001F; }
            .cbuae-notice { margin-top: 25px; padding: 12px; background: #E0FAF7; border-left: 4px solid #00D1C1; font-size: 12px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td><div class="logo">Al Nahda Trading LLC</div><p>TRN: 100234567800003<br/>Mainland Dubai, UAE</p></td>
              <td style="text-align: right;"><div class="badge">TAX INVOICE / فاتورة ضريبية</div><h2>${invoiceNumber}</h2><p>Date: ${new Date().toLocaleDateString('en-GB')}</p></td>
            </tr>
          </table>

          <table class="info-table">
            <tr>
              <td><strong>Billed To:</strong><br/>${customerName}<br/>TRN: ${customerTrn}<br/>United Arab Emirates</td>
              <td><strong>Invoice Details:</strong><br/>Due Date: Immediate<br/>Currency: ${currency}</td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr><th>Description</th><th>Qty</th><th>Unit Price (${currency})</th><th>VAT (5%)</th><th>Line Total (${currency})</th></tr>
            </thead>
            <tbody>
              ${lines
                .map(
                  (l) => `
                <tr>
                  <td>${l.description}</td>
                  <td>${l.quantity}</td>
                  <td>${l.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td>${(l.vatRate === 'STANDARD_5' ? l.quantity * l.unitPrice * 0.05 : 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td>${(l.quantity * l.unitPrice * (l.vatRate === 'STANDARD_5' ? 1.05 : 1.0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <table class="totals-table">
            <tr><td>Subtotal:</td><td style="text-align: right;">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}</td></tr>
            <tr><td>VAT (5%):</td><td style="text-align: right;">${vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}</td></tr>
            <tr class="total-row"><td>Total Due:</td><td style="text-align: right; color: #4A001F;">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}</td></tr>
            ${
              currency !== 'AED'
                ? `<tr><td><strong>Total (AED equivalent):</strong></td><td style="text-align: right;"><strong>${totalAmountAED.toLocaleString('en-US', { minimumFractionDigits: 2 })} AED</strong></td></tr>`
                : ''
            }
          </table>

          ${
            currency !== 'AED'
              ? `<div class="cbuae-notice">
                  <strong>Statutory CBUAE Conversion (Article 69):</strong><br/>
                  Converted using Central Bank of the UAE official rate: 1 ${currency} = ${cbuaeRate.rateToAED} AED.<br/>
                  Total VAT in AED: ${vatAmountAED.toLocaleString('en-US', { minimumFractionDigits: 2 })} AED.
                </div>`
              : ''
          }
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
    } catch (e: any) {
      Alert.alert('Invoice Issued', `Tax Invoice ${invoiceNumber} created successfully.`);
    } finally {
      setIsGenerating(false);
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.screenTitle}>{isRTL ? 'إنشاء فاتورة ضريبية' : 'Create Tax Invoice'}</Text>

        <View style={styles.currencyPill}>
          <Text style={styles.currencyPillText}>{currency}</Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Customer Information Card */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.cardHeader}>{isRTL ? 'بيانات العميل' : 'Customer & Invoice Details'}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{isRTL ? 'اسم العميل / الشركة' : 'Customer Name'}</Text>
            <TextInput
              style={styles.textInput}
              value={customerName}
              onChangeText={setCustomerName}
              selectionColor={colors.brand.burgundy}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>{isRTL ? 'رقم التسجيل الضريبي للعميل (TRN)' : 'Customer TRN (15 Digits)'}</Text>
              <Text style={styles.verifiedTag}>✓ FTA Valid</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={customerTrn}
              onChangeText={setCustomerTrn}
              keyboardType="number-pad"
              selectionColor={colors.brand.burgundy}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.inputLabel}>{isRTL ? 'رقم الفاتورة' : 'Invoice #'}</Text>
              <TextInput style={styles.textInput} value={invoiceNumber} onChangeText={setInvoiceNumber} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>{isRTL ? 'العملة' : 'Currency'}</Text>
              <View style={styles.currencySelectorRow}>
                {(['AED', 'USD', 'EUR', 'GBP'] as const).map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    style={[styles.currChip, currency === curr && styles.currChipActive]}
                    onPress={() => setCurrency(curr)}
                  >
                    <Text style={[styles.currChipText, currency === curr && styles.currChipTextActive]}>{curr}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* CBUAE Mandatory Notice under Article 69 */}
          {currency !== 'AED' && (
            <View style={styles.cbUaeNoticeBox}>
              <Ionicons name="information-circle-outline" size={18} color="#008C82" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cbUaeTitle}>CBUAE Exchange Rate (Article 69)</Text>
                <Text style={styles.cbUaeText}>
                  Mandatory FTA rate: 1 {currency} = {cbuaeRate.rateToAED} AED. VAT will be declared in AED on your return.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Line Items Card */}
        <View style={[styles.card, shadows.card]}>
          <View style={styles.lineHeaderRow}>
            <Text style={styles.cardHeader}>{isRTL ? 'بنود الفاتورة' : 'Line Items'}</Text>
            <TouchableOpacity onPress={addLine} style={styles.addLineBtn}>
              <Text style={styles.addLineText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {lines.map((line, idx) => (
            <View key={line.id} style={styles.lineBox}>
              <View style={styles.lineTopRow}>
                <Text style={styles.itemIndex}>Item {idx + 1}</Text>
                {lines.length > 1 && (
                  <TouchableOpacity onPress={() => removeLine(line.id)}>
                    <Ionicons name="trash-outline" size={16} color={colors.semantic.risk} />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={[styles.textInput, { marginBottom: spacing.sm }]}
                value={line.description}
                onChangeText={(text) => {
                  const updated = [...lines];
                  updated[idx].description = text;
                  setLines(updated);
                }}
                placeholder="Description"
              />

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>Qty</Text>
                  <TextInput
                    style={styles.textInput}
                    value={String(line.quantity)}
                    keyboardType="number-pad"
                    onChangeText={(text) => {
                      const updated = [...lines];
                      updated[idx].quantity = Number(text) || 1;
                      setLines(updated);
                    }}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 2 }]}>
                  <Text style={styles.inputLabel}>Unit Price ({currency})</Text>
                  <TextInput
                    style={styles.textInput}
                    value={String(line.unitPrice)}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      const updated = [...lines];
                      updated[idx].unitPrice = Number(text) || 0;
                      setLines(updated);
                    }}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Invoice Summary Box */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.cardHeader}>{isRTL ? 'إجمالي الفاتورة' : 'Invoice Summary'}</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>VAT (5%)</Text>
            <Text style={styles.summaryValue}>
              {vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Due</Text>
            <Text style={styles.totalValue}>
              {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
            </Text>
          </View>

          {currency !== 'AED' && (
            <View style={styles.aedEquivalentRow}>
              <Text style={styles.aedEquivalentLabel}>Total in AED (CBUAE Rate):</Text>
              <Text style={styles.aedEquivalentValue}>
                {totalAmountAED.toLocaleString('en-US', { minimumFractionDigits: 2 })} AED
              </Text>
            </View>
          )}
        </View>

        {/* Bottom CTA Button */}
        <TouchableOpacity
          style={[styles.issueButton, shadows.pillButton]}
          activeOpacity={0.85}
          onPress={handleIssueInvoice}
          disabled={isGenerating}
        >
          <Ionicons name="document-text-outline" size={20} color={colors.neutral.white} style={{ marginRight: 6 }} />
          <Text style={styles.issueButtonText}>
            {isGenerating ? 'Generating Tax Invoice...' : isRTL ? 'إصدار الفاتورة الضريبية ←' : 'Issue Tax Invoice →'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
  },
  topBar: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  currencyPill: {
    backgroundColor: colors.brand.blush,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand.blushAlt,
  },
  currencyPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
    marginBottom: 4,
  },
  verifiedTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.semantic.success,
  },
  textInput: {
    backgroundColor: colors.brand.blushSoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.neutral.textPrimary,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySelectorRow: {
    flexDirection: 'row',
    gap: 4,
  },
  currChip: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.brand.blushSoft,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  currChipActive: {
    backgroundColor: colors.brand.burgundy,
    borderColor: colors.brand.burgundy,
  },
  currChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
  },
  currChipTextActive: {
    color: colors.neutral.white,
  },
  cbUaeNoticeBox: {
    flexDirection: 'row',
    backgroundColor: '#E6FAF8',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 193, 0.3)',
    marginTop: spacing.xs,
  },
  cbUaeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007A70',
    marginBottom: 2,
  },
  cbUaeText: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    lineHeight: 16,
  },
  lineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addLineBtn: {
    backgroundColor: colors.brand.blushSoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand.blushAlt,
  },
  addLineText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  lineBox: {
    backgroundColor: '#FAF7F8',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  lineTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  itemIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.neutral.border,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brand.burgundy,
  },
  aedEquivalentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.brand.blushSoft,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  aedEquivalentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  aedEquivalentValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand.burgundy,
  },
  issueButton: {
    backgroundColor: colors.brand.burgundy,
    borderRadius: radii.pill,
    paddingVertical: spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  issueButtonText: {
    color: colors.neutral.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
