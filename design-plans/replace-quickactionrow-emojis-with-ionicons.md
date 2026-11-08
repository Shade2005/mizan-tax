# Implementation Plan: Replace QuickActionRow Emojis with Deep Burgundy Ionicons

## Metadata
- **Plan ID**: `PLAN-UI-001`
- **Surface**: Mizan Mobile Home Dashboard (`mobile/app/(tabs)/index.tsx` -> `mobile/src/components/QuickActionRow.tsx`)
- **Target File**: `mobile/src/components/QuickActionRow.tsx`
- **Baseline Commit**: `9a81bfb1954b9e1cf664117d2ca55865e59e0dea`
- **Status**: Completed and Verified

---

## 1. Problem Statement
The Quick Action navigation row on the Home tab displays raw OS unicode emojis (`📄`, `🧾`, `💼`, `✨`) instead of vector icons. This produces low-fidelity visual artifacting ("AI slop") and violates the documented brand contract requiring Deep Burgundy (`#4A001F`) iconography on soft blush containers.

---

## 2. Design Contracts & Evidence
1. **Component Contract**: `mobile/src/components/QuickActionRow.tsx#L3` explicitly specifies:
   `// 4 Primary Action Buttons with soft blush backgrounds and Deep Burgundy icons`
2. **Brand Token Contract**: `docs/UI_UX_IMPLEMENTATION_SPECIFICATION.md` § 1.1 defines:
   - `color.brand.burgundy` (`#4A001F`) for interactive action icons and CTAs.
   - `color.brand.blushSoft` (`#FFF5F7`) and `color.brand.blushAlt` (`#FFC6D1`) for icon container backgrounds and borders.
3. **Exemplar in Project**: `mobile/app/(tabs)/_layout.tsx` and `mobile/app/(tabs)/books.tsx` already import and consume `@expo/vector-icons` (`Ionicons`) for navigation and action icons.

---

## 3. Scope of Changes
Modifications are strictly limited to `mobile/src/components/QuickActionRow.tsx`:
- Import `Ionicons` from `@expo/vector-icons`.
- Update the action item structure to use typed `Ionicons` glyph names instead of emoji string characters.
- Replace `<Text style={styles.iconText}>{act.icon}</Text>` with `<Ionicons name={act.icon} size={22} color={colors.brand.burgundy} />`.
- Clean up the unused `iconText` style definition.

---

## 4. Exact Implementation Specification

### File: `mobile/src/components/QuickActionRow.tsx`

#### 4.1 Update Imports
```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '../theme/tokens';
import { useLocale } from '../context/LocaleContext';
```

#### 4.2 Type and Data Definitions
Define the action items using valid `keyof typeof Ionicons.glyphMap` icon names:
```typescript
interface ActionItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}
```

Map each action to its corresponding semantic icon:
- **Scan Trade Licence**: `'document-text-outline'`
- **Scan Receipt / Bill**: `'receipt-outline'`
- **New Tax Invoice**: `'create-outline'`
- **Ask AI Assistant**: `'sparkles'`

```typescript
const actions: ActionItem[] = [
  { id: 'licence', label: t.home.scanLicence, icon: 'document-text-outline', onPress: onScanLicence },
  { id: 'receipt', label: t.home.scanReceipt, icon: 'receipt-outline', onPress: onScanReceipt },
  { id: 'invoice', label: t.home.newInvoice, icon: 'create-outline', onPress: onNewInvoice },
  { id: 'ai', label: t.home.askAi, icon: 'sparkles', onPress: onAskAi },
];
```

#### 4.3 Replace Render Output in JSX
Inside `actions.map((act) => ...)`:
```tsx
<TouchableOpacity
  key={act.id}
  style={[styles.actionCard, shadows.card]}
  activeOpacity={0.75}
  onPress={act.onPress}
>
  <View style={styles.iconContainer}>
    <Ionicons name={act.icon} size={22} color={colors.brand.burgundy} />
  </View>
  <Text style={styles.actionLabel} numberOfLines={2}>
    {act.label}
  </Text>
</TouchableOpacity>
```

#### 4.4 Style Adjustments
Remove `iconText` style rule (`fontSize: 20`) from `StyleSheet.create`. Retain `iconContainer` with its existing tokens:
- `width: 44`
- `height: 44`
- `borderRadius: 22`
- `backgroundColor: colors.brand.blushSoft`
- `borderWidth: 1`
- `borderColor: colors.brand.blushAlt`

---

## 5. Verification Checklist for Executor
- [x] TypeScript compiles cleanly without errors (`tsc --noEmit` under `mobile/`).
- [x] No raw emoji text is rendered in `QuickActionRow`.
- [x] Icons render in `#4A001F` (Deep Burgundy) centered inside each blush circle.
- [x] RTL layout flip continues to work properly (`flexDirection: isRTL ? 'row-reverse' : 'row'`).
- [x] All touch callbacks (`onScanLicence`, `onScanReceipt`, `onNewInvoice`, `onAskAi`) remain operational.
