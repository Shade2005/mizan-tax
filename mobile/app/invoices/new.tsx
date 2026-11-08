// ============================================================================
// Mizan (ميزان) - New Tax Invoice & Full Invoice Creation Screen
// Design Reference: screen-designs/4126.png (Screens 1, 2, 3) & screen-designs/4130.png (Screens 2, 3)
// 3-Step Creation Flow + Full Details & In-App PDF Preview View
// Connected to Active Business Entity & Real Statutory Backend
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { MizanApi } from '../../src/services/api';
import { AnimatedFinancialNumber } from '../../src/animations';
import Animated, { FadeInDown } from 'react-native-reanimated';

type InvoiceStep = 'details' | 'items' | 'preview' | 'pdf-view';
type VatTreatmentType = 'STANDARD_5' | 'ZERO_RATED_0' | 'EXEMPT' | 'OUT_OF_SCOPE' | 'REVERSE_CHARGE';

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatTreatment: VatTreatmentType;
}

export default function NewInvoiceScreen() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  const [step, setStep] = useState<InvoiceStep>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [persistedInvoiceId, setPersistedInvoiceId] = useState<string | null>(null);

  // Supplier info (automatically derived from active business)
  const isSupplierVatRegistered = !!activeBusiness?.vatTrn && activeBusiness.vatTrn.trim().length >= 15;
  const supplierName = activeBusiness?.tradeName || activeBusiness?.legalName || 'Registered Enterprise';
  const supplierTrn = activeBusiness?.vatTrn || '';
  const supplierLicence = activeBusiness?.tradeLicenseNumber || '';

  // Form Fields
  const [customerName, setCustomerName] = useState('Al Noor Trading LLC');
  const [customerTrn, setCustomerTrn] = useState('100567894300003');
  const [customerAddress, setCustomerAddress] = useState('Downtown Dubai, Boulevard Plaza');
  const [customerId, setCustomerId] = useState<string>('cust-default');
  const [invoiceNo, setInvoiceNo] = useState('DRAFT-001');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState('AED');
  const [paymentTerms, setPaymentTerms] = useState('Net 14 Days');
  const [notes, setNotes] = useState('Payment is due within 14 days of issue date.');

  // Line Items
  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      id: '1',
      description: 'Professional Tax & Accounting Services',
      quantity: 1,
      unitPrice: 12000,
      discount: 0,
      vatTreatment: 'STANDARD_5',
    },
  ]);

  // Load existing customers on mount
  useEffect(() => {
    if (activeBusiness?.id) {
      MizanApi.getCustomers(activeBusiness.id)
        .then((custs) => {
          if (custs && custs.length > 0) {
            setCustomerId(custs[0].id);
            setCustomerName(custs[0].name || custs[0].companyName || 'Valued Client');
            setCustomerTrn(custs[0].trn || '');
            setCustomerAddress(custs[0].billingAddress || 'Dubai, UAE');
          }
        })
        .catch((err) => {
          console.warn('Failed to load customers:', err?.message || err);
        });
    }
  }, [activeBusiness?.id]);

  // Calculations
  const subtotalGross = items.reduce((acc, itm) => acc + itm.quantity * itm.unitPrice, 0);
  const totalDiscount = items.reduce((acc, itm) => acc + (itm.discount || 0), 0);
  const subtotalNet = Math.max(0, subtotalGross - totalDiscount);

  const vatTotal = items.reduce((acc, itm) => {
    if (!isSupplierVatRegistered) return acc;
    if (itm.vatTreatment === 'STANDARD_5') {
      const lineTaxable = Math.max(0, itm.quantity * itm.unitPrice - (itm.discount || 0));
      return acc + lineTaxable * 0.05;
    }
    return acc;
  }, 0);

  const grandTotal = subtotalNet + vatTotal;

  // Build draft payload
  const buildPayload = () => ({
    businessId: activeBusiness?.id || 'biz-default',
    customerId: customerId || 'cust-default',
    issueDate: invoiceDate,
    dueDate,
    currency,
    paymentTerms,
    notes,
    lines: items.map((itm) => ({
      description: itm.description,
      quantity: itm.quantity,
      unitPrice: itm.unitPrice,
      discount: itm.discount,
      vatTreatment: isSupplierVatRegistered ? itm.vatTreatment : 'OUT_OF_SCOPE',
    })),
  });

  const handleSaveDraft = async () => {
    if (!activeBusiness?.id) {
      Alert.alert('Notice', 'Please onboard or select an active business entity first.');
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const res = await MizanApi.createDraftInvoice(buildPayload());
      setPersistedInvoiceId(res.id);
      setInvoiceNo(res.invoiceNumber);
      Alert.alert('Draft Saved', `Draft invoice ${res.invoiceNumber} saved to your ledger.`);
      router.push('/(tabs)/invoices');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save draft invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIssueInvoice = async () => {
    if (!activeBusiness?.id) {
      Alert.alert('Notice', 'Please onboard or select an active business entity first.');
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. Create Draft
      const draft = await MizanApi.createDraftInvoice(buildPayload());
      setPersistedInvoiceId(draft.id);

      // 2. Issue Invoice (Article 59 validation & sequential numbering)
      const issued = await MizanApi.issueInvoice(draft.id);
      setInvoiceNo(issued.invoiceNumber);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Tax Invoice Issued',
        `Invoice ${issued.invoiceNumber} has been officially issued under Article 59 of UAE VAT Executive Regulations.`,
        [
          {
            text: 'View & Share PDF',
            onPress: () => setStep('pdf-view'),
          },
          {
            text: 'Return to Invoices',
            onPress: () => router.push('/(tabs)/invoices'),
          },
        ]
      );
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Issuance Failed', err?.message || 'Invoice compliance validation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      let htmlContent = '';
      if (persistedInvoiceId) {
        try {
          const res = await MizanApi.getInvoicePdfHtml(persistedInvoiceId);
          htmlContent = res.html;
        } catch (_) {}
      }

      if (!htmlContent) {
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <title>${invoiceNo}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #141416; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #F95700; padding-bottom: 20px; }
              .brand { font-size: 26px; font-weight: 900; color: #F95700; }
              .title { font-size: 20px; font-weight: bold; text-align: right; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { padding: 10px; border-bottom: 1px solid #EAE6E1; text-align: left; }
              th { background: #F7F6F4; font-size: 12px; }
              .totals { margin-top: 30px; margin-left: auto; width: 300px; }
              .tot-row { display: flex; justify-content: space-between; padding: 6px 0; }
              .grand-tot { border-top: 2px solid #141416; font-size: 16px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="brand">Mizan ميزان</div>
                <p><strong>${supplierName}</strong><br/>TRN: ${supplierTrn || 'Not Registered'}<br/>Licence: ${supplierLicence}</p>
              </div>
              <div>
                <div class="title">${isSupplierVatRegistered ? 'Tax Invoice' : 'Commercial Invoice'}</div>
                <p>Invoice No: ${invoiceNo}<br/>Date: ${invoiceDate}<br/>Due: ${dueDate}</p>
              </div>
            </div>
            <div style="margin: 20px 0;">
              <strong>Bill To:</strong><br/>
              ${customerName}<br/>
              TRN: ${customerTrn || 'N/A'}<br/>
              ${customerAddress}
            </div>
            <table>
              <tr><th>#</th><th>Description</th><th>Qty</th><th>Price</th><th>VAT%</th><th>Total</th></tr>
              ${items
                .map(
                  (itm, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${itm.description}</td>
                  <td>${itm.quantity}</td>
                  <td>AED ${itm.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>${isSupplierVatRegistered && itm.vatTreatment === 'STANDARD_5' ? '5%' : '0%'}</td>
                  <td>AED ${(itm.quantity * itm.unitPrice - itm.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>`
                )
                .join('')}
            </table>
            <div class="totals">
              <div class="tot-row"><span>Gross Subtotal:</span><span>AED ${subtotalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div class="tot-row"><span>Discount:</span><span>-AED ${totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div class="tot-row"><span>VAT Total:</span><span>AED ${vatTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div class="tot-row grand-tot"><span>Grand Total:</span><span>AED ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            </div>
            <p style="margin-top: 30px; font-size: 11px; color: #666;">Generated under Article 59 of UAE VAT Executive Regulations.</p>
          </body>
          </html>`;
      }

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (e: any) {
      Alert.alert('Export Error', e?.message || 'Failed to export PDF');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 'pdf-view') setStep('preview');
              else if (step === 'preview') setStep('items');
              else if (step === 'items') setStep('details');
              else router.back();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.neutral.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>
              {step === 'details'
                ? 'New Tax Invoice'
                : step === 'items'
                ? 'Items & VAT Rates'
                : step === 'preview'
                ? 'Invoice Review'
                : `${invoiceNo}.pdf`}
            </Text>
            {activeBusiness && (
              <Text style={styles.headerSubTitle} numberOfLines={1}>
                {supplierName} • {isSupplierVatRegistered ? 'VAT Registered' : 'Commercial (0%)'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerRight}>
          {step === 'preview' && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setStep('pdf-view')}
              activeOpacity={0.7}
            >
              <Ionicons name="eye-outline" size={20} color={colors.neutral.textPrimary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/learn/chat')}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Registration status banner if non-registered */}
        {!isSupplierVatRegistered && (
          <View style={styles.unregisteredNotice}>
            <Ionicons name="information-circle-outline" size={18} color="#D97706" />
            <Text style={styles.unregisteredNoticeText}>
              Your business is not registered for UAE VAT. Under Article 59, this invoice will be issued as a Commercial Invoice with 0% VAT.
            </Text>
          </View>
        )}

        {/* Stepper */}
        {step !== 'pdf-view' && (
          <View style={styles.stepperContainer}>
            <View style={styles.stepperRow}>
              {/* Step 1 */}
              <View style={styles.stepCol}>
                <View
                  style={[
                    styles.stepCircle,
                    step === 'details' ? styles.stepCircleActive : styles.stepCircleComplete,
                  ]}
                >
                  <Text style={styles.stepNumText}>1</Text>
                </View>
                <Text style={styles.stepLabel}>Details</Text>
              </View>

              <View
                style={[
                  styles.stepLine,
                  (step === 'items' || step === 'preview') && styles.stepLineActive,
                ]}
              />

              {/* Step 2 */}
              <View style={styles.stepCol}>
                <View
                  style={[
                    styles.stepCircle,
                    step === 'items'
                      ? styles.stepCircleActive
                      : step === 'preview'
                      ? styles.stepCircleComplete
                      : styles.stepCircleInactive,
                  ]}
                >
                  <Text style={step === 'details' ? styles.stepNumInactive : styles.stepNumText}>
                    2
                  </Text>
                </View>
                <Text style={styles.stepLabel}>Items & VAT</Text>
              </View>

              <View style={[styles.stepLine, step === 'preview' && styles.stepLineActive]} />

              {/* Step 3 */}
              <View style={styles.stepCol}>
                <View
                  style={[
                    styles.stepCircle,
                    step === 'preview' ? styles.stepCircleActive : styles.stepCircleInactive,
                  ]}
                >
                  <Text style={step === 'preview' ? styles.stepNumText : styles.stepNumInactive}>
                    3
                  </Text>
                </View>
                <Text style={styles.stepLabel}>Review</Text>
              </View>
            </View>
          </View>
        )}

        {/* STEP 1: DETAILS */}
        {step === 'details' && (
          <View style={styles.stepBody}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons name="business" size={18} color={colors.brand.primary} />
              <Text style={styles.sectionHeadingTitle}>Supplier (Your Business)</Text>
            </View>

            <View style={styles.supplierCard}>
              <Text style={styles.supplierName}>{supplierName}</Text>
              <Text style={styles.supplierMeta}>Licence: {supplierLicence || 'N/A'}</Text>
              <Text style={styles.supplierMeta}>
                TRN: {supplierTrn || 'Not Registered'}
              </Text>
            </View>

            <View style={styles.sectionHeadingRow}>
              <Ionicons name="person" size={18} color={colors.brand.primary} />
              <Text style={styles.sectionHeadingTitle}>Recipient / Customer (Bill To)</Text>
            </View>

            {/* Customer Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Customer Name *</Text>
              <TextInput
                style={styles.textInputBox}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="e.g. Al Noor Trading LLC"
              />
            </View>

            {/* Customer TRN */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Customer 15-Digit TRN (Optional for B2C)</Text>
              <TextInput
                style={styles.textInputBox}
                value={customerTrn}
                onChangeText={setCustomerTrn}
                placeholder="100XXXXXXXXXXXX"
                keyboardType="numeric"
              />
            </View>

            {/* Billing Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Billing Address *</Text>
              <TextInput
                style={styles.textInputBox}
                value={customerAddress}
                onChangeText={setCustomerAddress}
                placeholder="Downtown Dubai, Boulevard Plaza"
              />
            </View>

            {/* Dates */}
            <View style={styles.twoColInputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Issue Date *</Text>
                <TextInput
                  style={styles.textInputBox}
                  value={invoiceDate}
                  onChangeText={setInvoiceDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Due Date *</Text>
                <TextInput
                  style={styles.textInputBox}
                  value={dueDate}
                  onChangeText={setDueDate}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => {
                if (!customerName.trim() || !customerAddress.trim()) {
                  Alert.alert('Missing Fields', 'Please provide customer name and billing address.');
                  return;
                }
                setStep('items');
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>Continue to Items & VAT →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: ITEMS & CHARGES */}
        {step === 'items' && (
          <View style={styles.stepBody}>
            <View style={styles.sectionHeadingRow}>
              <Ionicons name="list" size={18} color={colors.brand.primary} />
              <Text style={styles.sectionHeadingTitle}>Invoice Line Items</Text>
            </View>

            {items.map((itm, idx) => (
              <Animated.View
                key={itm.id}
                entering={FadeInDown.duration(200)}
                style={styles.itemEditCard}
              >
                <View style={styles.itemCardTop}>
                  <Text style={styles.itemNumLabel}>Item #{idx + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setItems(items.filter((x) => x.id !== itm.id));
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.semantic.risk} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Description *</Text>
                  <TextInput
                    style={styles.textInputBox}
                    value={itm.description}
                    onChangeText={(val) => {
                      const next = [...items];
                      next[idx].description = val;
                      setItems(next);
                    }}
                  />
                </View>

                <View style={styles.twoColInputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Qty</Text>
                    <TextInput
                      style={styles.textInputBox}
                      keyboardType="numeric"
                      value={String(itm.quantity)}
                      onChangeText={(val) => {
                        const next = [...items];
                        next[idx].quantity = Number(val) || 1;
                        setItems(next);
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Unit Price ({currency})</Text>
                    <TextInput
                      style={styles.textInputBox}
                      keyboardType="numeric"
                      value={String(itm.unitPrice)}
                      onChangeText={(val) => {
                        const next = [...items];
                        next[idx].unitPrice = Number(val) || 0;
                        setItems(next);
                      }}
                    />
                  </View>
                </View>

                {/* VAT Treatment Selector */}
                {isSupplierVatRegistered && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>VAT Treatment</Text>
                    <View style={styles.vatPillsRow}>
                      {[
                        { label: '5% Standard', val: 'STANDARD_5' },
                        { label: '0% Export', val: 'ZERO_RATED_0' },
                        { label: 'Exempt', val: 'EXEMPT' },
                      ].map((t) => (
                        <TouchableOpacity
                          key={t.val}
                          style={[
                            styles.vatPill,
                            itm.vatTreatment === t.val && styles.vatPillActive,
                          ]}
                          onPress={() => {
                            const next = [...items];
                            next[idx].vatTreatment = t.val as VatTreatmentType;
                            setItems(next);
                          }}
                        >
                          <Text
                            style={[
                              styles.vatPillText,
                              itm.vatTreatment === t.val && styles.vatPillTextActive,
                            ]}
                          >
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </Animated.View>
            ))}

            <TouchableOpacity
              style={styles.addItemBtn}
              onPress={() =>
                setItems([
                  ...items,
                  {
                    id: String(Date.now()),
                    description: 'Additional Services',
                    quantity: 1,
                    unitPrice: 2500,
                    discount: 0,
                    vatTreatment: 'STANDARD_5',
                  },
                ])
              }
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={18} color={colors.brand.primary} />
              <Text style={styles.addItemBtnText}>+ Add Line Item</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => setStep('preview')}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>Review Tax Invoice →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: PREVIEW & ISSUANCE */}
        {step === 'preview' && (
          <View style={styles.stepBody}>
            <View style={styles.invoiceSheet}>
              {/* Header */}
              <View style={styles.sheetHeaderRow}>
                <View>
                  <Text style={styles.sheetBrandTitle}>Mizan ميزان</Text>
                  <Text style={styles.partyName}>{supplierName}</Text>
                  <Text style={styles.partyMeta}>TRN: {supplierTrn || 'Not Registered'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.sheetInvoiceTitle}>
                    {isSupplierVatRegistered ? 'Tax Invoice' : 'Commercial Invoice'}
                  </Text>
                  <Text style={styles.metaKeyVal}>Date: {invoiceDate}</Text>
                  <Text style={styles.metaKeyVal}>Due: {dueDate}</Text>
                </View>
              </View>

              {/* Bill To */}
              <View style={styles.buyerContainer}>
                <Text style={styles.billToLabel}>Bill To:</Text>
                <Text style={styles.buyerName}>{customerName}</Text>
                {customerTrn ? <Text style={styles.buyerTrn}>TRN: {customerTrn}</Text> : null}
                <Text style={styles.buyerAddress}>{customerAddress}</Text>
              </View>

              {/* Line Items Table */}
              <View style={styles.tableHeadRow}>
                <Text style={[styles.thCell, { flex: 1 }]}>Item</Text>
                <Text style={[styles.thCell, { width: 35, textAlign: 'center' }]}>Qty</Text>
                <Text style={[styles.thCell, { width: 70, textAlign: 'right' }]}>Price</Text>
                <Text style={[styles.thCell, { width: 75, textAlign: 'right' }]}>Total</Text>
              </View>

              {items.map((itm, idx) => (
                <View key={itm.id} style={styles.tableBodyRow}>
                  <Text style={[styles.tdCell, { flex: 1, fontWeight: '700' }]}>{itm.description}</Text>
                  <Text style={[styles.tdCell, { width: 35, textAlign: 'center' }]}>{itm.quantity}</Text>
                  <Text style={[styles.tdCell, { width: 70, textAlign: 'right' }]}>
                    {itm.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.tdCell, { width: 75, textAlign: 'right', fontWeight: '800' }]}>
                    {(itm.quantity * itm.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              ))}

              {/* Totals */}
              <View style={styles.totalsContainer}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Gross Subtotal</Text>
                  <AnimatedFinancialNumber
                    value={subtotalGross}
                    currency={`${currency} `}
                    decimals={2}
                    textStyle={styles.totalVal}
                  />
                </View>
                {totalDiscount > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Discount</Text>
                    <Text style={[styles.totalVal, { color: colors.semantic.risk }]}>
                      -{currency} {totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>VAT ({isSupplierVatRegistered ? '5%' : '0%'})</Text>
                  <AnimatedFinancialNumber
                    value={vatTotal}
                    currency={`${currency} `}
                    decimals={2}
                    textStyle={styles.totalVal}
                  />
                </View>
                <View style={styles.grandTotalBox}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <AnimatedFinancialNumber
                    value={grandTotal}
                    currency={`${currency} `}
                    decimals={2}
                    textStyle={styles.grandTotalVal}
                  />
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.previewActionsRow}>
              <TouchableOpacity
                style={styles.previewSmallBtn}
                onPress={handleDownloadPdf}
                activeOpacity={0.75}
              >
                <Ionicons name="share-outline" size={18} color={colors.neutral.textPrimary} />
                <Text style={styles.previewSmallBtnText}>Share PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.previewSmallBtn}
                onPress={handleSaveDraft}
                disabled={isSubmitting}
                activeOpacity={0.75}
              >
                <Ionicons name="save-outline" size={18} color={colors.neutral.textPrimary} />
                <Text style={styles.previewSmallBtnText}>Save Draft</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryActionButton, isSubmitting && { opacity: 0.6 }]}
              onPress={handleIssueInvoice}
              disabled={isSubmitting}
              activeOpacity={0.88}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryActionText}>Issue Tax Invoice (Article 59) →</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 4: PDF VIEW */}
        {step === 'pdf-view' && (
          <View style={styles.pdfViewerSection}>
            <View style={styles.pdfPaperCard}>
              <Text style={styles.pdfPaperTitle}>{isSupplierVatRegistered ? 'TAX INVOICE' : 'COMMERCIAL INVOICE'}</Text>
              <Text style={styles.pdfPaperMeta}>Supplier: {supplierName}</Text>
              <Text style={styles.pdfPaperMeta}>TRN: {supplierTrn || 'Not Registered'}</Text>
              <Text style={styles.pdfPaperMeta}>Customer: {customerName}</Text>
              <Text style={styles.pdfPaperMeta}>Invoice Total: {currency} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </View>

            <View style={styles.pdfBottomBar}>
              <TouchableOpacity style={styles.pdfActionBtn} onPress={handleDownloadPdf}>
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.pdfActionBtnText}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pdfActionBtn} onPress={handleDownloadPdf}>
                <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                <Text style={styles.pdfActionBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.canvas,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  headerSubTitle: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    maxWidth: 220,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  unregisteredNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginBottom: spacing.md,
    gap: 8,
  },
  unregisteredNoticeText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 15,
  },
  stepperContainer: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCol: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.brand.primary,
  },
  stepCircleComplete: {
    backgroundColor: colors.semantic.success,
  },
  stepCircleInactive: {
    backgroundColor: colors.neutral.border,
  },
  stepNumText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepNumInactive: {
    color: colors.neutral.textTertiary,
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
    marginTop: 4,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.neutral.border,
    marginHorizontal: 8,
    marginBottom: 14,
  },
  stepLineActive: {
    backgroundColor: colors.brand.primary,
  },
  stepBody: {
    gap: 12,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  sectionHeadingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  supplierCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  supplierName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  supplierMeta: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  inputGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
  },
  textInputBox: {
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.neutral.textPrimary,
  },
  twoColInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  itemEditCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: 10,
  },
  itemCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemNumLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  vatPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  vatPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral.canvas,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  vatPillActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  vatPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
  },
  vatPillTextActive: {
    color: '#FFFFFF',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderStyle: 'dashed',
    gap: 4,
  },
  addItemBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  primaryActionButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    ...shadows.pillButton,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  invoiceSheet: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: 12,
    ...shadows.card,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
    paddingBottom: 10,
  },
  sheetBrandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.brand.primary,
  },
  sheetInvoiceTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.neutral.textPrimary,
  },
  partyName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginTop: 2,
  },
  partyMeta: {
    fontSize: 10,
    color: colors.neutral.textSecondary,
  },
  metaKeyVal: {
    fontSize: 10,
    color: colors.neutral.textSecondary,
  },
  buyerContainer: {
    backgroundColor: '#F8FAFC',
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  billToLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brand.primary,
    textTransform: 'uppercase',
  },
  buyerName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginTop: 2,
  },
  buyerTrn: {
    fontSize: 10,
    color: colors.neutral.textSecondary,
  },
  buyerAddress: {
    fontSize: 10,
    color: colors.neutral.textSecondary,
  },
  tableHeadRow: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.canvas,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
  },
  thCell: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.neutral.textSecondary,
    textTransform: 'uppercase',
  },
  tableBodyRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
    alignItems: 'center',
  },
  tdCell: {
    fontSize: 11,
    color: colors.neutral.textPrimary,
  },
  totalsContainer: {
    alignSelf: 'flex-end',
    width: 220,
    gap: 4,
    marginTop: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
  },
  totalVal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  grandTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.neutral.textPrimary,
    paddingTop: 4,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.neutral.textPrimary,
  },
  grandTotalVal: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.brand.primary,
  },
  previewActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  previewSmallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.surface,
    paddingVertical: 11,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: 6,
  },
  previewSmallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  pdfViewerSection: {
    gap: 14,
  },
  pdfPaperCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: 8,
    ...shadows.card,
  },
  pdfPaperTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.brand.primary,
    marginBottom: 6,
  },
  pdfPaperMeta: {
    fontSize: 12,
    color: colors.neutral.textPrimary,
  },
  pdfBottomBar: {
    flexDirection: 'row',
    gap: 10,
  },
  pdfActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    paddingVertical: 12,
    borderRadius: radii.md,
    gap: 6,
  },
  pdfActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
