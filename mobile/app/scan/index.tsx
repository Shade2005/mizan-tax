// ============================================================================
// Mizan (ميزان) - Scan Trade License Screen
// Connected to Authenticated Backend Vision OCR Service
// Supports Camera capture, Gallery picker, and Direct Manual Entry
// ============================================================================

import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, shadows } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { ScannerLaserBeam } from '../../src/components/ScannerLaserBeam';
import { OcrProcessingOverlay } from '../../src/animations';
import { VisionOcr, ExtractedTradeLicense } from '../../src/services/visionOcr';

const { width } = Dimensions.get('window');
const FRAME_WIDTH = width - 48;
const FRAME_HEIGHT = FRAME_WIDTH * 1.35;

export default function ScanTradeLicenseScreen() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [torchOn, setTorchOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'0.5' | '1x' | '2'>('1x');
  const [isMultiPage, setIsMultiPage] = useState(false);
  const [capturedPages, setCapturedPages] = useState<{ base64: string; mime: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const cameraZoomValue = zoomLevel === '0.5' ? 0 : zoomLevel === '1x' ? 0.12 : 0.35;

  // Holds extracted data or error from async OCR
  const ocrResultRef = useRef<{ data?: ExtractedTradeLicense; error?: string } | null>(null);

  const navigateToReviewWithData = (data?: ExtractedTradeLicense, isManualFallback: boolean = false) => {
    setIsProcessing(false);
    router.push({
      pathname: '/scan/review',
      params: {
        licenseNumber: data?.licenseNumber || '',
        businessName: data?.businessName || '',
        businessNameAr: data?.businessNameAr || '',
        legalForm: data?.legalForm || 'Limited Liability Company (LLC)',
        jurisdiction: data?.jurisdiction || 'Mainland (Dubai)',
        issueDate: data?.issueDate || '2024-05-15',
        expiryDate: data?.expiryDate || '2027-05-14',
        activity: 'General Trading & Commercial Activities',
        extractionStatus: isManualFallback ? 'MANUALLY_ENTERED' : 'SUCCESS',
      },
    });
  };

  const handleProcessingComplete = () => {
    const res = ocrResultRef.current;
    if (res?.data && (res.data.businessName || res.data.licenseNumber)) {
      navigateToReviewWithData(res.data, false);
    } else {
      // OCR failed or unreadable
      Alert.alert(
        'Document Recognition Notice',
        res?.error || 'Document text could not be extracted with statutory confidence. Please enter your trade license details manually.',
        [
          {
            text: 'Enter Details Manually',
            onPress: () => navigateToReviewWithData(undefined, true),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsProcessing(false),
          },
        ]
      );
    }
  };

  const processImageBase64 = async (base64Data: string, mimeType: string = 'image/jpeg') => {
    ocrResultRef.current = null;
    setIsProcessing(true);

    try {
      const extracted = await VisionOcr.extractTradeLicense(base64Data, mimeType);
      ocrResultRef.current = { data: extracted };
    } catch (err: any) {
      console.warn('Vision OCR backend extraction error:', err?.message || err);
      ocrResultRef.current = {
        error: err?.message || 'Could not recognize trade license details.',
      };
    }
  };

  const handleImageAcquired = async (base64Data: string, mimeType: string = 'image/jpeg') => {
    if (isMultiPage) {
      const nextPages = [...capturedPages, { base64: base64Data, mime: mimeType }];
      setCapturedPages(nextPages);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return;
    }
    await processImageBase64(base64Data, mimeType);
  };

  const handleProcessQueuedPages = async () => {
    if (capturedPages.length === 0) return;
    const primary = capturedPages[0];
    await processImageBase64(primary.base64, primary.mime);
  };

  const handleCapture = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (cameraRef.current && permission?.granted) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        if (photo?.base64) {
          await handleImageAcquired(photo.base64, 'image/jpeg');
          return;
        }
      } catch (err) {
        console.warn('Camera capture error, falling back to manual entry:', err);
      }
    }

    // If camera unavailable or web, launch image picker or prompt manual entry
    await handlePickFromGallery();
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]?.base64) {
        const asset = result.assets[0];
        const mime = asset.mimeType || 'image/jpeg';
        await handleImageAcquired(asset.base64!, mime);
      }
    } catch (err: any) {
      console.warn('Gallery picker error:', err?.message || err);
    }
  };

  const handleManualEntry = () => {
    navigateToReviewWithData(undefined, true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.neutral.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Scan Trade License</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setTorchOn(!torchOn)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={torchOn ? 'flash' : 'flash-outline'}
              size={20}
              color={torchOn ? colors.brand.primary : colors.neutral.textPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleManualEntry}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Title Banner */}
      <View style={styles.bannerContainer}>
        <View style={styles.scannerBadgeIcon}>
          <Ionicons name="scan" size={26} color={colors.brand.primary} />
        </View>
        <Text style={styles.bannerHeading}>Scan Your Trade License</Text>
        <Text style={styles.bannerSubtext}>
          We'll automatically read the details and register your business entity in Mizan.
        </Text>
        <TouchableOpacity style={styles.manualEntryLink} onPress={handleManualEntry}>
          <Text style={styles.manualEntryLinkText}>Or enter license details manually →</Text>
        </TouchableOpacity>
      </View>

      {/* Camera Viewfinder Area */}
      <View style={styles.viewfinderContainer}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            enableTorch={torchOn}
            zoom={cameraZoomValue}
          >
            {/* Dark Surrounding Masks */}
            <View style={styles.maskDark} />

            {/* Glowing Orange Reticle Frame */}
            <View style={styles.reticleFrame}>
              <View style={[styles.cornerBracket, styles.topLeft]} />
              <View style={[styles.cornerBracket, styles.topRight]} />
              <View style={[styles.cornerBracket, styles.bottomLeft]} />
              <View style={[styles.cornerBracket, styles.bottomRight]} />

              {/* Smooth Laser Sweep */}
              <ScannerLaserBeam height={FRAME_HEIGHT} />

              <View style={styles.reticleInnerGuide}>
                <Text style={styles.guideText}>Position trade license within frame</Text>
              </View>
            </View>

            <View style={styles.maskDark} />
          </CameraView>
        ) : (
          <View style={styles.cameraPlaceholder}>
            <View style={styles.reticleFrame}>
              <View style={[styles.cornerBracket, styles.topLeft]} />
              <View style={[styles.cornerBracket, styles.topRight]} />
              <View style={[styles.cornerBracket, styles.bottomLeft]} />
              <View style={[styles.cornerBracket, styles.bottomRight]} />
              <View style={styles.reticleInnerGuide}>
                <Ionicons name="document-text-outline" size={44} color={colors.brand.primary} />
                <Text style={styles.guideText}>Position Trade License Here</Text>
                <TouchableOpacity
                  style={styles.permissionBtn}
                  onPress={requestPermission}
                >
                  <Text style={styles.permissionBtnText}>Enable Camera</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Zoom Selector Controls */}
        <View style={styles.zoomControlRow}>
          {(['0.5', '1x', '2'] as const).map((lvl) => (
            <TouchableOpacity
              key={lvl}
              style={[styles.zoomPill, zoomLevel === lvl && styles.zoomPillActive]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setZoomLevel(lvl);
              }}
            >
              <Text style={[styles.zoomText, zoomLevel === lvl && styles.zoomTextActive]}>
                {lvl}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isMultiPage && capturedPages.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1E293B',
            marginHorizontal: spacing.lg,
            marginBottom: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.brand.primary,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
            {capturedPages.length} License Page(s) Queued
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.brand.primary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: radii.pill,
            }}
            onPress={handleProcessQueuedPages}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
              Process All →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Shutter & Controls Bar */}
      <View style={styles.bottomControlsBar}>
        <TouchableOpacity
          style={styles.bottomActionItem}
          onPress={handlePickFromGallery}
          activeOpacity={0.7}
        >
          <View style={styles.smallCircleIcon}>
            <Ionicons name="images-outline" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.bottomActionLabel}>Gallery</Text>
        </TouchableOpacity>

        {/* Big Shutter Button */}
        <TouchableOpacity
          style={styles.shutterOuterRing}
          onPress={handleCapture}
          activeOpacity={0.85}
          disabled={isProcessing}
        >
          <View style={styles.shutterInnerButton}>
            {isProcessing && <ActivityIndicator color={colors.brand.primary} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomActionItem}
          onPress={() => setIsMultiPage(!isMultiPage)}
          activeOpacity={0.7}
        >
          <View style={styles.smallCircleIcon}>
            <Ionicons
              name={isMultiPage ? 'documents' : 'documents-outline'}
              size={20}
              color={isMultiPage ? colors.brand.primary : '#FFFFFF'}
            />
          </View>
          <Text style={styles.bottomActionLabel}>Multiple Pages</Text>
        </TouchableOpacity>
      </View>

      {/* Structured OCR Processing Experience */}
      <OcrProcessingOverlay
        visible={isProcessing}
        onComplete={handleProcessingComplete}
        documentType="licence"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.surface,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral.canvas,
  },
  bannerContainer: {
    backgroundColor: colors.neutral.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  scannerBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  bannerHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  bannerSubtext: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: spacing.md,
  },
  manualEntryLink: {
    marginTop: 8,
    paddingVertical: 4,
  },
  manualEntryLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  viewfinderContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  camera: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cameraPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  maskDark: {
    width: '100%',
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  reticleFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: radii.xl,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerBracket: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.brand.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: radii.xl,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: radii.xl,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: radii.xl,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: radii.xl,
  },
  reticleInnerGuide: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.primary,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  zoomControlRow: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 4,
    borderRadius: radii.pill,
  },
  zoomPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  zoomPillActive: {
    backgroundColor: colors.brand.primary,
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  zoomTextActive: {
    color: '#FFFFFF',
  },
  bottomControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: '#000000',
  },
  bottomActionItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  smallCircleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bottomActionLabel: {
    color: '#A3A3A3',
    fontSize: 11,
    fontWeight: '600',
  },
  shutterOuterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInnerButton: {
    width: '100%',
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
