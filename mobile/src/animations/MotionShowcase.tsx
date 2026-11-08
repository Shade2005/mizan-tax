// ============================================================================
// Mizan (ميزان) — Motion System Showcase Component
// Isolated demonstration of all core motion utilities, tokens, and accessibility
// ============================================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { colors } from '../theme/tokens';
import {
  AnimatedPressable,
  AnimatedFade,
  AnimatedSlide,
  AnimatedExpandable,
  AnimatedSwitch,
  AnimatedCheckbox,
  AnimatedRadio,
  AnimatedChevron,
  AnimatedTextInput,
  AnimatedFinancialNumber,
  AnimatedProgressBar,
  AnimatedTypingIndicator,
  OcrProcessingOverlay,
  layoutPresets,
  entryExitPresets,
  getStaggerDelay,
  useReduceMotionPreference,
} from './index';

export const MotionShowcase: React.FC = () => {
  const [isFadeVisible, setIsFadeVisible] = useState(true);
  const [isSlideVisible, setIsSlideVisible] = useState(true);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [counter, setCounter] = useState(0);

  // Phase 3 Micro-interactions state
  const [switchVal, setSwitchVal] = useState(true);
  const [checkboxVal, setCheckboxVal] = useState(true);
  const [selectedRadio, setSelectedRadio] = useState<'Standard' | 'Exempt'>('Standard');
  const [inputValue, setInputValue] = useState('AED 375,000');

  // Phase 4 Domain Animations state
  const [financialAmount, setFinancialAmount] = useState(45000);
  const [progressValue, setProgressValue] = useState(82);
  const [isOcrActive, setIsOcrActive] = useState(false);

  const isReducedMotion = useReduceMotionPreference();

  const sampleItems = [
    { id: '1', title: 'Corporate Tax Assessment', tag: 'Compliant' },
    { id: '2', title: 'VAT 201 Quarterly Filing', tag: 'Due in 14d' },
    { id: '3', title: 'Small Business Relief (SBR)', tag: 'Active' },
  ];

  return (
    <View style={styles.container}>
      {/* Header & Accessibility Status */}
      <View style={styles.header}>
        <Text style={styles.title}>Motion Engine Foundation</Text>
        <View
          style={[
            styles.badge,
            isReducedMotion ? styles.badgeReduced : styles.badgeNormal,
          ]}
        >
          <Text style={styles.badgeText}>
            {isReducedMotion ? 'Reduce Motion: ON' : 'Reduce Motion: OFF'}
          </Text>
        </View>
      </View>

      {/* 1. Scale Press Feedback */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>1. Tactile Press Feedback (AnimatedPressable)</Text>
        <AnimatedPressable
          style={styles.actionButton}
          onPress={() => setCounter((c) => c + 1)}
        >
          <Text style={styles.actionButtonText}>
            Tap For Tactile Response (Count: {counter})
          </Text>
        </AnimatedPressable>
      </View>

      {/* 2. Fade In / Out */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>2. Smooth Fade Transition (AnimatedFade)</Text>
        <View style={styles.row}>
          <AnimatedPressable
            style={styles.secondaryButton}
            onPress={() => setIsFadeVisible((v) => !v)}
          >
            <Text style={styles.secondaryButtonText}>
              {isFadeVisible ? 'Fade Out' : 'Fade In'}
            </Text>
          </AnimatedPressable>
        </View>

        <AnimatedFade visible={isFadeVisible} style={styles.panel}>
          <Text style={styles.panelText}>
            Tax calculation verified: AED 45,000 corporate tax payable under standard 9% rate.
          </Text>
        </AnimatedFade>
      </View>

      {/* 3. Slide Up / Down */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>3. Directional Entrance (AnimatedSlide)</Text>
        <View style={styles.row}>
          <AnimatedPressable
            style={styles.secondaryButton}
            onPress={() => setIsSlideVisible((v) => !v)}
          >
            <Text style={styles.secondaryButtonText}>
              {isSlideVisible ? 'Slide Out' : 'Slide In'}
            </Text>
          </AnimatedPressable>
        </View>

        <AnimatedSlide visible={isSlideVisible} direction="up" offset={20} style={styles.slideCard}>
          <Text style={styles.slideCardTitle}>Federal Tax Authority Notice</Text>
          <Text style={styles.slideCardBody}>
            Corporate Tax registration threshold verified against trade licence records.
          </Text>
        </AnimatedSlide>
      </View>

      {/* 4. Expand / Collapse Accordion */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>4. Card Expansion with Animated Chevron</Text>
        <Animated.View layout={layoutPresets.spring} style={styles.card}>
          <AnimatedPressable
            onPress={() => setIsCardExpanded((e) => !e)}
            style={styles.cardHeader}
          >
            <Text style={styles.cardTitle}>Deductible Expenses Breakdown</Text>
            <AnimatedChevron expanded={isCardExpanded} color={colors.brand.primary} />
          </AnimatedPressable>

          <AnimatedExpandable isExpanded={isCardExpanded}>
            <View style={styles.expandedContent}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Employee Compensation</Text>
                <Text style={styles.metricValue}>AED 340,000 (100% deductible)</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Client Entertainment</Text>
                <Text style={styles.metricValue}>AED 42,000 (50% capped)</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Fines & Penalties</Text>
                <Text style={styles.metricValue}>AED 0 (Non-deductible)</Text>
              </View>
            </View>
          </AnimatedExpandable>
        </Animated.View>
      </View>

      {/* 5. Staggered Content Entrance */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>5. Staggered Entrance Presets</Text>
        {sampleItems.map((item, index) => (
          <Animated.View
            key={item.id}
            entering={entryExitPresets.fadeIn.delay(getStaggerDelay(index))}
            layout={layoutPresets.spring}
            style={styles.listItem}
          >
            <Text style={styles.listItemTitle}>{item.title}</Text>
            <View style={styles.itemTag}>
              <Text style={styles.itemTagText}>{item.tag}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* 6. Premium Switch (AnimatedSwitch) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>6. Spring Toggle Switch (AnimatedSwitch)</Text>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Auto Tax Deductions</Text>
            <Text style={styles.settingSub}>Real-time UAE 9% CT calculation</Text>
          </View>
          <AnimatedSwitch
            value={switchVal}
            onValueChange={setSwitchVal}
            accessibilityLabel="Auto Tax Deductions switch"
          />
        </View>
      </View>

      {/* 7. Checkbox (AnimatedCheckbox) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>7. Spring Checkbox (AnimatedCheckbox)</Text>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Corporate Tax Registration Verified</Text>
            <Text style={styles.settingSub}>FTA TRN compliance check completed</Text>
          </View>
          <AnimatedCheckbox
            checked={checkboxVal}
            onChange={setCheckboxVal}
            accessibilityLabel="Tax registration verified checkbox"
          />
        </View>
      </View>

      {/* 8. Radio Buttons (AnimatedRadio) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>8. Spring Radio Selectors (AnimatedRadio)</Text>
        <View style={styles.radioGroup}>
          <View style={styles.radioRow}>
            <AnimatedRadio
              selected={selectedRadio === 'Standard'}
              onSelect={() => setSelectedRadio('Standard')}
              accessibilityLabel="Standard 9% rate radio"
            />
            <Text style={styles.radioText}>Standard Mainland Rate (9%)</Text>
          </View>
          <View style={styles.radioRow}>
            <AnimatedRadio
              selected={selectedRadio === 'Exempt'}
              onSelect={() => setSelectedRadio('Exempt')}
              accessibilityLabel="Exempt SBR relief radio"
            />
            <Text style={styles.radioText}>Small Business Relief (0% up to AED 3M)</Text>
          </View>
        </View>
      </View>

      {/* 9. Animated Text Input (AnimatedTextInput) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>9. Focus-Responsive Input (AnimatedTextInput)</Text>
        <AnimatedTextInput
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Enter taxable profit"
          showClearButton
          onClear={() => setInputValue('')}
        />
      </View>

      {/* 10. Authoritative Financial Numbers (AnimatedFinancialNumber) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>10. Authoritative Financial Numbers</Text>
        <View style={styles.row}>
          <AnimatedPressable
            style={styles.secondaryButton}
            onPress={() => setFinancialAmount((prev) => (prev === 45000 ? 52500 : 45000))}
          >
            <Text style={styles.secondaryButtonText}>Toggle Calculation</Text>
          </AnimatedPressable>
        </View>
        <View style={styles.panel}>
          <Text style={styles.metricLabel}>Calculated Corporate Tax Payable:</Text>
          <AnimatedFinancialNumber
            value={financialAmount}
            currency="AED "
            decimals={2}
            style={styles.financialAmountText}
          />
        </View>
      </View>

      {/* 11. Spring Progress Bar (AnimatedProgressBar) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>11. Spring Progress Bar (AnimatedProgressBar)</Text>
        <View style={styles.row}>
          <AnimatedPressable
            style={styles.secondaryButton}
            onPress={() => setProgressValue((prev) => (prev >= 100 ? 25 : prev + 25))}
          >
            <Text style={styles.secondaryButtonText}>Cycle Score ({progressValue}%)</Text>
          </AnimatedPressable>
        </View>
        <View style={{ marginVertical: 8 }}>
          <AnimatedProgressBar
            progress={progressValue}
            height={8}
            trackColor="#EAE6E1"
            barColor={colors.brand.primary}
          />
        </View>
      </View>

      {/* 12. Mizan AI Typing Indicator (AnimatedTypingIndicator) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>12. Mizan AI Grounded Inference</Text>
        <View style={[styles.panel, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Text style={styles.metricLabel}>Mizan AI Copilot:</Text>
          <AnimatedTypingIndicator dotSize={7} dotColor={colors.brand.primary} />
        </View>
      </View>

      {/* 13. Trade License OCR Processing Overlay */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>13. OCR Processing State Machine</Text>
        <AnimatedPressable
          style={styles.actionButton}
          onPress={() => setIsOcrActive(true)}
        >
          <Text style={styles.actionButtonText}>Launch Staged OCR Simulation</Text>
        </AnimatedPressable>
        <OcrProcessingOverlay
          visible={isOcrActive}
          onComplete={() => setIsOcrActive(false)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.neutral.surface,
    borderRadius: 16,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeNormal: {
    backgroundColor: 'rgba(0, 200, 83, 0.12)',
  },
  badgeReduced: {
    backgroundColor: 'rgba(255, 145, 0, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryButton: {
    backgroundColor: colors.neutral.surfaceSubdued,
    borderColor: colors.neutral.border,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  panel: {
    backgroundColor: colors.neutral.surfaceSubdued,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand.primary,
  },
  panelText: {
    fontSize: 12,
    color: colors.neutral.textPrimary,
    lineHeight: 18,
  },
  slideCard: {
    backgroundColor: colors.neutral.surfaceSubdued,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  slideCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  slideCardBody: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    lineHeight: 16,
  },
  card: {
    backgroundColor: colors.neutral.surfaceSubdued,
    borderRadius: 10,
    borderColor: colors.neutral.border,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  cardAction: {
    fontSize: 11,
    color: colors.brand.primary,
    fontWeight: '700',
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
    paddingTop: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceSubdued,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: 6,
  },
  listItemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  itemTag: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceSubdued,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  settingSub: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  radioGroup: {
    backgroundColor: colors.neutral.surfaceSubdued,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: 8,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioText: {
    fontSize: 12,
    color: colors.neutral.textPrimary,
    fontWeight: '500',
  },
  financialAmountText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brand.primary,
    marginTop: 6,
  },
});
