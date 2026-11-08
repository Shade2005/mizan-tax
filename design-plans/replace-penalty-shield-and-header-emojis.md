# Implementation Plan: Replace PenaltyShieldCard and ScreenHeader Emojis with Vector Icons

## Metadata
- **Plan ID**: `PLAN-UI-002`
- **Surfaces**: 
  - `mobile/src/components/PenaltyShieldCard.tsx`
  - `mobile/src/components/ScreenHeader.tsx`
  - `mobile/src/components/TaxOpportunityCard.tsx`
  - `mobile/app/(tabs)/index.tsx`
- **Target Files**:
  - `mobile/src/components/PenaltyShieldCard.tsx`
  - `mobile/src/components/ScreenHeader.tsx`
  - `mobile/src/components/TaxOpportunityCard.tsx`
  - `mobile/app/(tabs)/index.tsx`
  - `mobile/src/context/BusinessContext.tsx`
- **Baseline Commit**: `9a81bfb1954b9e1cf664117d2ca55865e59e0dea`
- **Status**: Completed and Verified

---

## 1. Problem Statement
Multiple key components across the Home Dashboard contain raw platform emojis and unicode text glyphs:
- `PenaltyShieldCard.tsx`: Uses raw unicode emoji `⚠️` inside the risk badge and raw text characters `←` / `→` inside the primary CTA button.
- `ScreenHeader.tsx`: Uses raw emoji `🏢` inside the circular business avatar and raw unicode triangles `◀` / `▶` for the entity switch indicator.
- `TaxOpportunityCard.tsx`: Uses raw unicode arrows `←` / `→` in the bottom action prompt.
- `app/(tabs)/index.tsx`: Uses raw emoji `📅` in the upcoming deadlines card title.
- `BusinessContext.tsx`: Defaults business icons to emoji strings (`'🏢'`, `'🌐'`, `'👤'`).

---

## 2. Design Contracts & Evidence
1. `docs/UI_UX_IMPLEMENTATION_SPECIFICATION.md` § 5.2 explicitly requires:
   `Shield icon with exclamation badge` for `COMP-PENALTY-SHIELD`.
2. `docs/UI_UX_IMPLEMENTATION_SPECIFICATION.md` § 5.4 mandates:
   `Trailing Icon: Arrow or Chevron that automatically mirrors in RTL (→ in LTR, ← in RTL)`.
3. Standard icon library in project: `@expo/vector-icons` (`Ionicons`).

---

## 3. Exact Implementation Specifications

### 3.1 `PenaltyShieldCard.tsx`
- Import `Ionicons` from `@expo/vector-icons`.
- In `alertPill`: Replace `⚠️ {t.home.penaltyAmountRisk}` with:
  ```tsx
  <View style={[styles.alertPill, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }]}>
    <Ionicons name="warning-outline" size={13} color={colors.semantic.risk} />
    <Text style={styles.alertPillText}>{t.home.penaltyAmountRisk}</Text>
  </View>
  ```
- In `actionButton`: Replace `{t.home.startAssistedFiling} {isRTL ? '←' : '→'}` with:
  ```tsx
  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
    <Text style={styles.actionButtonText}>{t.home.startAssistedFiling}</Text>
    <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={15} color={colors.neutral.white} />
  </View>
  ```

### 3.2 `ScreenHeader.tsx`
- Import `Ionicons` from `@expo/vector-icons`.
- Map entity icon to Ionicons (`business-outline`, `globe-outline`, `person-outline`).
- Render `<Ionicons name={getIconName(activeBusiness.icon)} size={20} color={colors.neutral.white} />` inside `avatar`.
- In `entityPill`: Replace `<Text style={styles.switchIcon}>{isRTL ? '◀' : '▶'}</Text>` with:
  ```tsx
  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color={colors.brand.burgundy} />
  ```
- In `languagePill`: Add globe icon prefix `<Ionicons name="globe-outline" size={12} color={colors.brand.burgundy} />`.

### 3.3 `TaxOpportunityCard.tsx`
- Import `Ionicons` from `@expo/vector-icons`.
- In `bottomRow`: Replace raw arrow text with:
  ```tsx
  <View style={[styles.bottomRow, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: isRTL ? 'flex-start' : 'flex-end', gap: 4 }]}>
    <Text style={styles.actionPrompt}>
      {isRTL ? 'مراجعة الفرصة والمطالبة' : 'Review & Claim Opportunity'}
    </Text>
    <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={13} color={colors.brand.burgundy} />
  </View>
  ```

### 3.4 `app/(tabs)/index.tsx`
- Import `Ionicons` from `@expo/vector-icons`.
- In `deadlinesCard`: Replace `<Text style={styles.deadlineTitle}>📅 {t.home.upcomingDeadlines}</Text>` with:
  ```tsx
  <View style={[styles.deadlineHeader, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }]}>
    <Ionicons name="calendar-outline" size={17} color={colors.brand.burgundy} />
    <Text style={styles.deadlineTitle}>{t.home.upcomingDeadlines}</Text>
  </View>
  ```

### 3.5 `BusinessContext.tsx`
- Update default business entity icons to standard Ionicons glyph names (`'business-outline'`, `'globe-outline'`, `'person-outline'`).

---

## 4. Verification Checklist
- [ ] TypeScript check (`mobile/node_modules/.bin/tsc --noEmit`) passes with zero errors.
- [ ] No emoji characters in `PenaltyShieldCard`, `ScreenHeader`, `TaxOpportunityCard`, or `UpcomingDeadlines`.
- [ ] All RTL mirrored layouts function properly.
