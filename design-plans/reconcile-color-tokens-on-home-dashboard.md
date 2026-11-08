# Implementation Plan: Reconcile Home Dashboard Styles with Design Tokens

## Metadata
- **Plan ID**: `PLAN-UI-006`
- **Surface**: Mizan Mobile Home Dashboard (`mobile/app/(tabs)/index.tsx`)
- **Target File**: `mobile/app/(tabs)/index.tsx`
- **Baseline Commit**: `9a81bfb1954b9e1cf664117d2ca55865e59e0dea`
- **Status**: Completed and Verified

---

## 1. Problem Statement
In `mobile/app/(tabs)/index.tsx`, several style declarations use hardcoded ad-hoc hex values (`#E8E5DF`, `#FFF7ED`, `#FFEDD5`, `#FFF8F5`, `#FFFFFF`), Tailwind palette defaults (`#D1D5DB`, `#9CA3AF`), and ad-hoc RGBA strings (`rgba(16, 185, 129, 0.2)`, `rgba(16, 185, 129, 0.4)`) instead of referencing the design token architecture defined in `mobile/src/theme/tokens.ts`. This causes visual dissonance, theme fragmentation, and prevents centralized token-level styling updates.

---

## 2. Design Contracts & Evidence
1. **Design System Token Architecture**: `mobile/src/theme/tokens.ts` defines canonical colors:
   - `colors.neutral.surfaceSubdued` (`#FAF9F7`) and `colors.neutral.borderStrong` (`#D7D2CB`) for subtle containers and avatars.
   - `colors.neutral.white` (`#FFFFFF`) for pure white surfaces and high-contrast dark-mode typography.
   - `colors.neutral.textTertiary` (`#9E9C98`) for subdued captions on dark backgrounds.
   - `colors.semantic.successBg` (`#ECFDF5`) and `colors.semantic.successBorder` (`#A7F3D0`) for compliant status chips.
   - `colors.brand.primaryMuted` (`#FFF3ED`) and `colors.brand.blushAlt` (`#FED7AA`) for warm peach badges and AI banners.
2. **Current Token Violations in `mobile/app/(tabs)/index.tsx`**:
   - Line 436: `avatarButton`: `backgroundColor: '#E8E5DF'` (ad-hoc gray)
   - Line 499: `complianceLabel`: `color: '#D1D5DB'` (Tailwind gray-300)
   - Line 510: `scoreText`: `color: '#FFFFFF'` (raw hex instead of `colors.neutral.white`)
   - Lines 513, 518: `compliantBadge`: `backgroundColor: 'rgba(16, 185, 129, 0.2)'`, `borderColor: 'rgba(16, 185, 129, 0.4)'` (raw RGBA instead of token)
   - Line 527: `complianceSubtext`: `color: '#9CA3AF'` (Tailwind gray-400)
   - Lines 710, 715: `dueDaysChip`: `backgroundColor: '#FFF7ED'`, `borderColor: '#FFEDD5'` (Tailwind orange-50/100)
   - Line 753: `aiBannerContent`: `backgroundColor: '#FFF8F5'` (ad-hoc tint)

---

## 3. Scope of Changes
Modifications are strictly limited to `mobile/app/(tabs)/index.tsx`:
- Reconcile `avatarButton` with `colors.neutral.borderStrong` and `colors.neutral.border`.
- Reconcile `scoreText` with `colors.neutral.white`.
- Reconcile `complianceLabel` and `complianceSubtext` with `colors.neutral.surfaceSubdued` and `colors.neutral.textTertiary`.
- Reconcile `compliantBadge` with `colors.semantic.successBg` and `colors.semantic.successBorder`.
- Reconcile `dueDaysChip` with `colors.brand.primaryMuted` and `colors.brand.blushAlt`.
- Reconcile `aiBannerContent` with `colors.brand.primaryMuted`.

---

## 4. Exact Implementation Specification

### File: `mobile/app/(tabs)/index.tsx`

In `StyleSheet.create`:

#### 4.1 Reconcile `avatarButton`
Replace:
```typescript
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8E5DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
```
With:
```typescript
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.neutral.surfaceSubdued,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
```

#### 4.2 Reconcile Dark Hero Typography & Badges
Replace:
```typescript
  complianceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  scoreText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  compliantBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  compliantBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.semantic.success,
  },
  complianceSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
```
With:
```typescript
  complianceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.surfaceSubdued,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  scoreText: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.neutral.white,
  },
  compliantBadge: {
    backgroundColor: colors.semantic.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.semantic.successBorder,
  },
  compliantBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.semantic.successDark,
  },
  complianceSubtext: {
    fontSize: 12,
    color: colors.neutral.textTertiary,
  },
```

#### 4.3 Reconcile `dueDaysChip`
Replace:
```typescript
  dueDaysChip: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
```
With:
```typescript
  dueDaysChip: {
    backgroundColor: colors.brand.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.brand.blushAlt,
  },
```

#### 4.4 Reconcile `aiBannerContent`
Replace:
```typescript
  aiBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: '#FFF8F5',
  },
```
With:
```typescript
  aiBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.brand.primaryMuted,
  },
```

---

## 5. Verification Checklist
- [ ] Run `npx tsc --noEmit` from `mobile/` to confirm zero TypeScript compilation errors.
- [ ] Confirm no hardcoded hex strings (`#E8E5DF`, `#FFF7ED`, `#FFEDD5`, `#FFF8F5`, `#FFFFFF`, `#D1D5DB`, `#9CA3AF`) remain in `mobile/app/(tabs)/index.tsx`.
- [ ] Confirm that `compliantBadge` renders with soft emerald background (`colors.semantic.successBg`) and emerald border (`colors.semantic.successBorder`).
- [ ] Confirm that `dueDaysChip` renders with peach container (`colors.brand.primaryMuted`) and crisp border (`colors.brand.blushAlt`).
- [ ] Confirm that the AI Assistant banner background uses `colors.brand.primaryMuted`.
