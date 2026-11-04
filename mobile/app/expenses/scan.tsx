// ============================================================================
// Mizan (ميزان) - Expense Receipt Camera Scanner
// Live Viewfinder, Cyan Laser Beam, and Automatic TRN Extraction
// ============================================================================

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { ScannerLaserBeam } from '../../src/components/ScannerLaserBeam';

const { width } = Dimensions.get('window');
const FRAME_WIDTH = width - 48;
const FRAME_HEIGHT = FRAME_WIDTH * 1.35;

export default function ExpenseScanScreen() {
  const router = useRouter();
  const { t, isRTL } = useLocale();

  const [torchOn, setTorchOn] = useState(false);
  const [preset, setPreset] = useState<'travel' | 'entertainment' | 'saas'>('travel');

  const handleCapture = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}

    // Preset routing data to test Decision 17 vs Art. 53
    let params = {
      merchantName: 'Emirates Airline',
      trn: '100234567800003',
      invoiceDate: '02 Nov 2026',
      amountAED: '5250.00',
      vatAED: '250.00',
      category: 'DUTY_TRAVEL',
    };

    if (preset === 'entertainment') {
      params = {
        merchantName: 'Zuma DIFC Restaurant',
        trn: '100456789000003',
        invoiceDate: '03 Nov 2026',
        amountAED: '1260.00',
        vatAED: '60.00',
        category: 'CLIENT_ENTERTAINMENT',
      };
    } else if (preset === 'saas') {
      params = {
        merchantName: 'Amazon Web Services (AWS)',
        trn: 'FOREIGN_NO_TRN',
        invoiceDate: '01 Nov 2026',
        amountAED: '1836.25',
        vatAED: '91.81',
        category: 'REVERSE_CHARGE_SAAS',
      };
    }

    setTimeout(() => {
      router.push({
        pathname: '/expenses/review',
        params,
      });
    }, 500);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled) {
      handleCapture();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.screenTitle}>{isRTL ? 'مسح إيصال / فاتورة' : 'Scan Receipt / Bill'}</Text>

        <TouchableOpacity style={styles.iconButton} onPress={() => setTorchOn(!torchOn)} activeOpacity={0.7}>
          <Ionicons name={torchOn ? 'flash' : 'flash-outline'} size={22} color={torchOn ? colors.brand.cyan : colors.neutral.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Preset Scenario Selector (Simulates different UAE expense types) */}
      <View style={styles.presetRow}>
        <TouchableOpacity
          style={[styles.presetChip, preset === 'travel' && styles.presetChipActive]}
          onPress={() => setPreset('travel')}
        >
          <Text style={[styles.presetText, preset === 'travel' && styles.presetTextActive]}>
            ✈️ Duty Travel (Dec 17)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.presetChip, preset === 'entertainment' && styles.presetChipActive]}
          onPress={() => setPreset('entertainment')}
        >
          <Text style={[styles.presetText, preset === 'entertainment' && styles.presetTextActive]}>
            🍽️ Client Dinner (Art 53)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.presetChip, preset === 'saas' && styles.presetChipActive]}
          onPress={() => setPreset('saas')}
        >
          <Text style={[styles.presetText, preset === 'saas' && styles.presetTextActive]}>
            ☁️ AWS SaaS (RCM)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Viewfinder Reticle */}
      <View style={styles.viewfinderContainer}>
        <View style={styles.reticleFrame}>
          <ScannerLaserBeam height={FRAME_HEIGHT} />

          <View style={styles.receiptMock}>
            <Text style={styles.receiptHeader}>TAX INVOICE / فاتورة ضريبية</Text>
            <View style={styles.dashedDivider} />
            <Text style={styles.receiptMerchant}>
              {preset === 'travel' ? 'Emirates Airline' : preset === 'entertainment' ? 'Zuma DIFC' : 'Amazon Web Services'}
            </Text>
            <Text style={styles.receiptTrn}>TRN: 100234567800003</Text>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptSmall}>Subtotal:</Text>
              <Text style={styles.receiptSmall}>AED {preset === 'travel' ? '5,000' : preset === 'entertainment' ? '1,200' : '1,836'}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptSmall}>VAT 5%:</Text>
              <Text style={styles.receiptSmall}>AED {preset === 'travel' ? '250' : preset === 'entertainment' ? '60' : '91.81'}</Text>
            </View>
            <View style={styles.dashedDivider} />
            <Text style={styles.receiptTotal}>
              TOTAL: AED {preset === 'travel' ? '5,250' : preset === 'entertainment' ? '1,260' : '1,927.81'}
            </Text>
          </View>

          {/* Corner Guides */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <View style={styles.guidancePill}>
          <Text style={styles.guidanceText}>
            {isRTL ? 'ضع الإيصال أو الفاتورة داخل الإطار' : 'Hold receipt steady within frame'}
          </Text>
        </View>
      </View>

      {/* Bottom Shutter Controls */}
      <View style={styles.bottomBar}>
        <View style={[styles.shutterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity style={styles.auxButton} onPress={handlePickImage} activeOpacity={0.7}>
            <Ionicons name="images-outline" size={26} color={colors.neutral.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.shutterButton, shadows.pillButton]} activeOpacity={0.85} onPress={handleCapture}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.auxButton} onPress={() => setTorchOn(!torchOn)} activeOpacity={0.7}>
            <Ionicons name="flash-outline" size={26} color={colors.neutral.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  presetChipActive: {
    backgroundColor: colors.brand.burgundy,
    borderColor: colors.brand.burgundy,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.textSecondary,
  },
  presetTextActive: {
    color: colors.neutral.white,
  },
  viewfinderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  reticleFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: radii.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.neutral.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptMock: {
    width: '84%',
    padding: spacing.lg,
    backgroundColor: '#FAF8F9',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  receiptHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand.burgundy,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderStyle: 'dashed',
    marginVertical: spacing.sm,
  },
  receiptMerchant: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  receiptTrn: {
    fontSize: 10,
    color: colors.neutral.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  receiptSmall: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
  },
  receiptTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    textAlign: 'right',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.brand.cyan,
  },
  cornerTL: { top: 10, left: 10, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 10, right: 10, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 10, left: 10, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 10, right: 10, borderBottomWidth: 3, borderRightWidth: 3 },
  guidancePill: {
    backgroundColor: colors.brand.burgundy,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    marginTop: spacing.md,
  },
  guidanceText: {
    color: colors.neutral.white,
    fontSize: 12,
    fontWeight: '600',
  },
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  shutterRow: {
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  auxButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.brand.burgundy,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.brand.burgundy,
  },
});
