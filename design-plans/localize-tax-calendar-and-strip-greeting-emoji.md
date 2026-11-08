# Implementation Plan: Localize Tax Calendar and Remove Greeting Emoji

## Metadata
- **Plan ID**: `PLAN-UI-005`
- **Surface**: Mizan Mobile Home Dashboard (`mobile/app/(tabs)/index.tsx`)
- **Target File**: `mobile/app/(tabs)/index.tsx`
- **Baseline Commit**: `9a81bfb1954b9e1cf664117d2ca55865e59e0dea`
- **Status**: Completed and Verified

---

## 1. Problem Statement
In `mobile/app/(tabs)/index.tsx`:
1. The user greeting contains a raw unicode wave emoji (`👋` in `Good morning, Hamza 👋` / `صباح الخير، حمزة 👋`), producing low-fidelity visual artifacting ("AI slop") contrary to the professional fintech brand guidelines established in previous plans (`PLAN-UI-001`, `PLAN-UI-002`).
2. The entire Tax Calendar section (`lines 284–312`) and SBR turnover metric subtext (`line 187`) are hardcoded in static English (`DEC`, `JAN`, `VAT Return (Form 201)`, `Period: Nov 1 – Nov 30, 2026`, `Due in 23 days`, `Corporate Tax Return`, `FY: Jan 1 – Dec 31, 2026`, `Upcoming`, `Turnover: 1.8M / 3M`). When Arabic is active, these strings remain in English, violating the Day 1 bilingual parity contract.

---

## 2. Design Contracts & Evidence
1. **No Raw Emojis ("AI Slop" Prevention)**:
   - `design-plans/replace-penalty-shield-and-header-emojis.md` § 1: Raw unicode emojis create low-fidelity visual artifacting and must be replaced by vector icons or removed from typography.
2. **Bilingual Parity Contract**:
   - `docs/UI_UX_IMPLEMENTATION_SPECIFICATION.md` § 2: "Dual English & Arabic (RTL) from Day 1". All user-facing strings must be localized.
   - `docs/UI_UX_IMPLEMENTATION_SPECIFICATION.md` § 2.1: "Numeric Typography: For financial figures, the app uses Western Arabic numerals (`1, 2, 3...`) in both language modes for consistency with UAE banking and FTA EmaraTax portals, with Arabic labels (e.g., `45,000 د.إ`)."
3. **Current Runtime Flaw in `mobile/app/(tabs)/index.tsx`**:
   - Line 91: `'Good morning, Hamza 👋'` / `'صباح الخير، حمزة 👋'`
   - Line 187: `<Text style={styles.metricSub}>Turnover: 1.8M / 3M</Text>`
   - Line 285: `<Text style={styles.dateBadgeMonth}>DEC</Text>`
   - Line 289: `<Text style={styles.calendarItemTitle}>VAT Return (Form 201)</Text>`
   - Line 290: `<Text style={styles.calendarItemSub}>Period: Nov 1 – Nov 30, 2026</Text>`
   - Line 293: `<Text style={styles.dueDaysText}>Due in 23 days</Text>`
   - Line 302: `<Text style={styles.dateBadgeMonth}>JAN</Text>`
   - Line 306: `<Text style={styles.calendarItemTitle}>Corporate Tax Return</Text>`
   - Line 307: `<Text style={styles.calendarItemSub}>FY: Jan 1 – Dec 31, 2026</Text>`
   - Line 310: `<Text style={styles.upcomingText}>Upcoming</Text>`

---

## 3. Scope of Changes
Modifications are strictly limited to `mobile/app/(tabs)/index.tsx`:
- Strip the `👋` emoji from `greetingTitle`.
- Localize the SBR turnover subtext with currency symbol (`Turnover: AED 1.8M / 3M` vs `الإيرادات: 1.8M / 3M د.إ`).
- Localize month abbreviations (`DEC` $\rightarrow$ `ديسمبر`, `JAN` $\rightarrow$ `يناير`), return titles, periods, and status chips in the Tax Calendar using `isRTL` conditional strings.

---

## 4. Exact Implementation Specification

### File: `mobile/app/(tabs)/index.tsx`

#### 4.1 Remove Greeting Emoji
Replace:
```tsx
<Text style={styles.greetingTitle}>
  {isRTL ? 'صباح الخير، حمزة 👋' : 'Good morning, Hamza 👋'}
</Text>
```
With:
```tsx
<Text style={styles.greetingTitle}>
  {isRTL ? 'صباح الخير، حمزة' : 'Good morning, Hamza'}
</Text>
```

#### 4.2 Localize SBR Turnover Subtext
In Card 3 of `metricsGrid`, replace:
```tsx
<Text style={styles.metricSub}>Turnover: 1.8M / 3M</Text>
```
With:
```tsx
<Text style={styles.metricSub}>
  {isRTL ? 'الإيرادات: 1.8M / 3M د.إ' : 'Turnover: AED 1.8M / 3M'}
</Text>
```

#### 4.3 Localize Tax Calendar Item 1 (VAT 201 Return)
Replace:
```tsx
{/* Deadline item 1 */}
<View style={styles.calendarItemRow}>
  <View style={styles.dateBadge}>
    <Text style={styles.dateBadgeMonth}>DEC</Text>
    <Text style={styles.dateBadgeDay}>28</Text>
  </View>
  <View style={styles.calendarInfoCol}>
    <Text style={styles.calendarItemTitle}>VAT Return (Form 201)</Text>
    <Text style={styles.calendarItemSub}>Period: Nov 1 – Nov 30, 2026</Text>
  </View>
  <View style={styles.dueDaysChip}>
    <Text style={styles.dueDaysText}>Due in 23 days</Text>
  </View>
</View>
```
With:
```tsx
{/* Deadline item 1 */}
<View style={styles.calendarItemRow}>
  <View style={styles.dateBadge}>
    <Text style={styles.dateBadgeMonth}>{isRTL ? 'ديسمبر' : 'DEC'}</Text>
    <Text style={styles.dateBadgeDay}>28</Text>
  </View>
  <View style={styles.calendarInfoCol}>
    <Text style={styles.calendarItemTitle}>
      {isRTL ? 'إقرار ضريبة القيمة المضافة (نموذج 201)' : 'VAT Return (Form 201)'}
    </Text>
    <Text style={styles.calendarItemSub}>
      {isRTL ? 'الفترة: 1 نوفمبر – 30 نوفمبر 2026' : 'Period: Nov 1 – Nov 30, 2026'}
    </Text>
  </View>
  <View style={styles.dueDaysChip}>
    <Text style={styles.dueDaysText}>
      {isRTL ? 'يستحق خلال 23 يوماً' : 'Due in 23 days'}
    </Text>
  </View>
</View>
```

#### 4.4 Localize Tax Calendar Item 2 (Corporate Tax Return)
Replace:
```tsx
{/* Deadline item 2 */}
<View style={styles.calendarItemRow}>
  <View style={styles.dateBadge}>
    <Text style={styles.dateBadgeMonth}>JAN</Text>
    <Text style={styles.dateBadgeDay}>31</Text>
  </View>
  <View style={styles.calendarInfoCol}>
    <Text style={styles.calendarItemTitle}>Corporate Tax Return</Text>
    <Text style={styles.calendarItemSub}>FY: Jan 1 – Dec 31, 2026</Text>
  </View>
  <View style={styles.upcomingChip}>
    <Text style={styles.upcomingText}>Upcoming</Text>
  </View>
</View>
```
With:
```tsx
{/* Deadline item 2 */}
<View style={styles.calendarItemRow}>
  <View style={styles.dateBadge}>
    <Text style={styles.dateBadgeMonth}>{isRTL ? 'يناير' : 'JAN'}</Text>
    <Text style={styles.dateBadgeDay}>31</Text>
  </View>
  <View style={styles.calendarInfoCol}>
    <Text style={styles.calendarItemTitle}>
      {isRTL ? 'إقرار ضريبة الشركات' : 'Corporate Tax Return'}
    </Text>
    <Text style={styles.calendarItemSub}>
      {isRTL ? 'السنة المالية: 1 يناير – 31 ديسمبر 2026' : 'FY: Jan 1 – Dec 31, 2026'}
    </Text>
  </View>
  <View style={styles.upcomingChip}>
    <Text style={styles.upcomingText}>
      {isRTL ? 'قادم' : 'Upcoming'}
    </Text>
  </View>
</View>
```

---

## 5. Verification Checklist
- [ ] Run `npx tsc --noEmit` from `mobile/` to confirm zero TypeScript compilation errors.
- [ ] Verify that no raw unicode emojis (`👋`) appear in the greeting header in either language.
- [ ] In English mode:
  - Heading reads: `Good morning, Hamza`
  - Turnover reads: `Turnover: AED 1.8M / 3M`
  - Tax Calendar shows `DEC` / `JAN`, `VAT Return (Form 201)` / `Corporate Tax Return`, `Due in 23 days` / `Upcoming`.
- [ ] In Arabic mode:
  - Heading reads: `صباح الخير، حمزة`
  - Turnover reads: `الإيرادات: 1.8M / 3M د.إ`
  - Tax Calendar displays proper Arabic statutory titles: `إقرار ضريبة القيمة المضافة (نموذج 201)`, `ديسمبر`, `يستحق خلال 23 يوماً`, `إقرار ضريبة الشركات`, `يناير`, `قادم`.
