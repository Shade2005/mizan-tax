// ============================================================================
// Mizan (ميزان) — Central Motion Engine
// Production-quality animation foundation for fluid, responsive, subtle fintech UX
// ============================================================================

// Design Tokens
export {
  motionDurations,
  motionScales,
  motionOpacities,
  type MotionDurationKey,
} from './motionTokens';

// Easing Curves & Springs
export {
  motionEasings,
  motionSprings,
} from './easings';

// Presets & Builders
export {
  layoutPresets,
  entryExitPresets,
  getStaggerDelay,
  animateTiming,
  animateSpring,
} from './presets';

// Accessibility
export {
  useReduceMotionPreference,
  getAccessibleDuration,
} from './useReduceMotionPreference';

// Reusable Motion Utilities
export { AnimatedPressable, type AnimatedPressableProps } from './AnimatedPressable';
export { AnimatedFade, type AnimatedFadeProps } from './AnimatedFade';
export { AnimatedSlide, type AnimatedSlideProps, type SlideDirection } from './AnimatedSlide';
export { AnimatedExpandable, type AnimatedExpandableProps } from './AnimatedExpandable';
export { AnimatedTabButton, type AnimatedTabButtonProps } from './AnimatedTabButton';
export { AnimatedTabIcon, type AnimatedTabIconProps } from './AnimatedTabIcon';
export { ScreenSection, type ScreenSectionProps } from './ScreenSection';
export { AnimatedSwitch, type AnimatedSwitchProps } from './AnimatedSwitch';
export { AnimatedCheckbox, type AnimatedCheckboxProps } from './AnimatedCheckbox';
export { AnimatedRadio, type AnimatedRadioProps } from './AnimatedRadio';
export { AnimatedChevron, type AnimatedChevronProps } from './AnimatedChevron';
export { AnimatedTextInput, type AnimatedTextInputProps } from './AnimatedTextInput';
export { OcrProcessingOverlay, type OcrProcessingOverlayProps } from './OcrProcessingOverlay';
export { AnimatedFinancialNumber, type AnimatedFinancialNumberProps } from './AnimatedFinancialNumber';
export { AnimatedProgressBar, type AnimatedProgressBarProps } from './AnimatedProgressBar';
export { AnimatedTypingIndicator, type AnimatedTypingIndicatorProps } from './AnimatedTypingIndicator';
export { MotionShowcase } from './MotionShowcase';
