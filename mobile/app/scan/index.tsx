// ============================================================================
// Mizan (ميزان) - On-Device Document Scanner Screen
// Live Camera Viewport, Cyan Laser Sweep, and Edge ML Kit Classifier
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
const FRAME_HEIGHT = FRAME_WIDTH * 1.38;

export default function ScanScreen() {
  const router = useRouter();
  const { t, isRTL } = useLocale();

  const [torchOn, setTorchOn] = useState(false);
  const [activeTab, setActiveTab] = useState<'document' | 'manual'>('document');
  const [isScanning, setIsScanning] = useState(false);

  // Trigger capture & edge OCR extraction
  const handleCapture = async () => {
    setIsScanning(true);
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}

    // Simulated edge OCR completion -> Navigate to Review Screen
    setTimeout(() => {
      setIsScanning(false);
      router.push({
        pathname: '/scan/review',
        params: {
          licenseNumber: '1234567',
          businessName: 'Al Nahda Trading LLC',
          legalForm: 'Limited Liability Company (LLC)',
          jurisdiction: 'Mainland (Dubai)',
          issueDate: '15 Jan 2024',
        },
      });
    }, 600);
  };

  // Upload document from gallery
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
      {/* Top Navigation Bar */}
      <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.screenTitle}>
          {isRTL ? 'مسح الرخصة التجارية' : 'Scan Trade Licence'}
        </Text>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setTorchOn(!torchOn)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={torchOn ? 'flash' : 'flash-outline'}
            size={22}
            color={torchOn ? colors.brand.cyan : colors.neutral.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Main Viewfinder Section */}
      <View style={styles.viewfinderContainer}>
        {/* Document Boundary Card / Reticle */}
        <View style={styles.reticleFrame}>
          {/* Animated Cyan Laser Sweep */}
          <ScannerLaserBeam height={FRAME_HEIGHT} />

          {/* UAE Trade Licence Frame Backdrop */}
          <View style={styles.documentMock}>
            <View style={styles.emblemBadge}>
              <Text style={styles.emblemArabic}>حكومة دبي</Text>
              <Text style={styles.emblemEnglish}>GOVERNMENT OF DUBAI</Text>
            </View>
            <Text style={styles.licenceHeading}>رخصة تجارية</Text>
            <Text style={styles.licenceHeadingEn}>Trade Licence</Text>

            <View style={styles.licenceLine} />
            <View style={[styles.licenceLine, { width: '70%' }]} />
            <View style={[styles.licenceLine, { width: '85%' }]} />
            <View style={[styles.licenceLine, { width: '60%' }]} />
          </View>

          {/* Corner Guides */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        {/* Guidance HUD Pill */}
        <View style={styles.guidancePill}>
          <Text style={styles.guidanceText}>
            {isRTL ? 'وجه الكاميرا نحو الرخصة التجارية' : 'Align Trade Licence within frame'}
          </Text>
        </View>
      </View>

      {/* Bottom Control Bar */}
      <View style={styles.bottomBar}>
        <View style={[styles.shutterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Gallery Button */}
          <TouchableOpacity
            style={styles.auxButton}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <Ionicons name="images-outline" size={26} color={colors.neutral.textPrimary} />
          </TouchableOpacity>

          {/* Main Deep Burgundy Shutter Button */}
          <TouchableOpacity
            style={[styles.shutterButton, shadows.pillButton]}
            activeOpacity={0.85}
            onPress={handleCapture}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          {/* Flash Mode Indicator */}
          <TouchableOpacity
            style={styles.auxButton}
            onPress={() => setTorchOn(!torchOn)}
            activeOpacity={0.7}
          >
            <Ionicons name="flash-outline" size={26} color={colors.neutral.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Segmented Bottom Pill: Document vs Manual Entry */}
        <View style={styles.segmentedToggle}>
          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeTab === 'document' && styles.segmentItemActive,
            ]}
            onPress={() => setActiveTab('document')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentItemText,
                activeTab === 'document' && styles.segmentItemTextActive,
              ]}
            >
              {isRTL ? 'مستند' : 'Document'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeTab === 'manual' && styles.segmentItemActive,
            ]}
            onPress={() => {
              setActiveTab('manual');
              router.push('/scan/review');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentItemText,
                activeTab === 'manual' && styles.segmentItemTextActive,
              ]}
            >
              {isRTL ? 'إدخال يدوي' : 'Manual Entry'}
            </Text>
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
  documentMock: {
    width: '88%',
    height: '90%',
    backgroundColor: '#FAF7F8',
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  emblemBadge: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emblemArabic: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  emblemEnglish: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
    letterSpacing: 0.5,
  },
  licenceHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginTop: spacing.xs,
  },
  licenceHeadingEn: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
    marginBottom: spacing.md,
  },
  licenceLine: {
    height: 6,
    width: '90%',
    backgroundColor: colors.neutral.border,
    borderRadius: 3,
    marginBottom: spacing.sm,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.brand.cyan,
  },
  cornerTL: {
    top: 10,
    left: 10,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 10,
    right: 10,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  guidancePill: {
    backgroundColor: colors.brand.burgundy,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    marginTop: spacing.lg,
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
    marginBottom: spacing.lg,
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
  segmentedToggle: {
    flexDirection: 'row',
    backgroundColor: colors.brand.blushSoft,
    borderRadius: radii.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.brand.blushAlt,
  },
  segmentItem: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  segmentItemActive: {
    backgroundColor: colors.brand.burgundy,
  },
  segmentItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.burgundy,
  },
  segmentItemTextActive: {
    color: colors.neutral.white,
  },
});
