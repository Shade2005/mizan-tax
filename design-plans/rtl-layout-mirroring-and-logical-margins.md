# Implementation Plan: RTL Layout Mirroring and Logical Margins

## Metadata
- **Plan ID**: `PLAN-UI-004`
- **Surface**: Mizan Mobile Home Dashboard (`mobile/app/(tabs)/index.tsx`)
- **Target File**: `mobile/app/(tabs)/index.tsx`
- **Baseline Commit**: `9a81bfb1954b9e1cf664117d2ca55865e59e0dea`
- **Status**: Completed and Verified

---

## 1. Problem Statement
In `mobile/app/(tabs)/index.tsx`, multiple horizontal flex containers and components use fixed left-to-right (`row`) layout orientations and hardcoded physical margins (`marginLeft: 12`, `marginRight: 12`). When the user switches the application to Arabic (`isRTL === true`), these containers do not flip, and physical margins cause date badges, shield icons, and action buttons to collide with text or stick to card boundaries in reverse order. This violates the dual-language architecture mandate.

---

## 2. Design Contracts & Evidence
1. **Bilingual & RTL Contract**: `docs/UI_UX_IMPLEMENTATION_SPECIFICATION.md` § 2 explicitly mandates:
   - "Dual English & Arabic (RTL) from Day 1"
   - "All flexbox containers use logical properties (`start`, `end`, `marginHorizontal`, `paddingHorizontal`) rather than hardcoded `left`/`right`."
   - "LTR: Left: Icons & Labels | Right: Values & Chevron >"
   - "RTL: Right: Icons & Labels | Left: Values & Chevron <"
2. **Current Implementation Flaw**:
   - `mobile/app/(tabs)/index.tsx#L529`: `shieldContainer: { marginLeft: 12 }`
   - `mobile/app/(tabs)/index.tsx#L685`: `dateBadge: { marginRight: 12 }`
   - `mobile/app/(tabs)/index.tsx#L757`: `aiBannerLeft: { marginRight: 12 }`
   - Row containers (`headerRow`, `brandRow`, `headerActions`, `complianceContentRow`, `statusIndicatorRow`, `scoreRow`, `metricsGrid`, `quickActionsContainer`, `cardHeaderRow`, `cardHeaderLeft`, `viewAllRow`, `calendarItemRow`, `aiBannerContent`, `aiBannerTitleRow`, `askAnythingButton`) do not invert `flexDirection` dynamically based on `isRTL`.

---

## 3. Scope of Changes
Modifications are strictly limited to `mobile/app/(tabs)/index.tsx`:
- Update physical margins (`marginLeft`, `marginRight`) in `StyleSheet.create` to logical properties (`marginEnd`, `marginStart`) or dynamic RTL checks.
- Add dynamic `flexDirection: isRTL ? 'row-reverse' : 'row'` to all horizontal rows in the JSX.
- Apply `textAlign: isRTL ? 'right' : 'left'` and `alignItems: isRTL ? 'flex-end' : 'flex-start'` to localized content blocks so Arabic text anchors correctly to the right margin.

---

## 4. Exact Implementation Specification

### File: `mobile/app/(tabs)/index.tsx`

#### 4.1 Update Header Rows JSX
In `HomeScreen`:
```tsx
{/* Top App Header */}
<View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
  <View style={[styles.brandRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
    {/* Logo icon pill */}
    <View style={styles.brandLogoBox}>
      <View style={styles.logoSlantBar1} />
      <View style={styles.logoSlantBar2} />
    </View>
    <Text style={styles.brandTitle}>Mizan ميزان</Text>
  </View>

  <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
    <TouchableOpacity
      style={styles.headerIconButton}
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/books')}
    >
      <Ionicons name="search-outline" size={20} color={colors.neutral.textPrimary} />
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.headerIconButton}
      activeOpacity={0.7}
      onPress={() => router.push('/scan/readiness')}
    >
      <Ionicons name="notifications-outline" size={20} color={colors.neutral.textPrimary} />
      <View style={[styles.notifDot, isRTL ? { left: 8, right: undefined } : { right: 8, left: undefined }]} />
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.avatarButton}
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/profile')}
    >
      <Text style={styles.avatarText}>HK</Text>
    </TouchableOpacity>
  </View>
</View>
```

#### 4.2 Update Greeting and Compliance Card JSX
```tsx
{/* User Greeting & Skyline Backdrop */}
<View style={styles.greetingSection}>
  <View style={[styles.greetingTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
    <Text style={[styles.greetingTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
      {isRTL ? 'صباح الخير، حمزة 👋' : 'Good morning, Hamza 👋'}
    </Text>
    <Text style={[styles.greetingSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
      {isRTL
        ? 'مساعدك الذكي لضرائب وامتثال الشركات في الإمارات'
        : 'Your UAE tax & compliance copilot'}
    </Text>
  </View>
</View>

{/* Compliance Health Hero Card */}
<View style={styles.complianceCard}>
  <View style={styles.complianceGlowOverlay} />
  <View style={[styles.complianceContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
    <View style={[styles.complianceTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
      <View style={[styles.statusIndicatorRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.greenPulseDot} />
        <Text style={styles.complianceLabel}>
          {isRTL ? 'صحة الامتثال' : 'Compliance Health'}
        </Text>
      </View>

      <View style={[styles.scoreRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.scoreText}>100%</Text>
        <View style={styles.compliantBadge}>
          <Text style={styles.compliantBadgeText}>
            {isRTL ? 'ممتثل' : 'Compliant'}
          </Text>
        </View>
      </View>

      <Text style={[styles.complianceSubtext, { textAlign: isRTL ? 'right' : 'left' }]}>
        {isRTL
          ? 'جميع الإقرارات محدثة. لا توجد غرامات نشطة.'
          : 'All filings up to date. No active penalties.'}
      </Text>
    </View>

    {/* Glowing Orange Shield Icon */}
    <View style={[styles.shieldContainer, isRTL ? { marginRight: 12, marginLeft: 0 } : { marginLeft: 12, marginRight: 0 }]}>
      <View style={styles.shieldOuterGlow}>
        <Ionicons name="shield-checkmark" size={38} color={colors.brand.primary} />
      </View>
    </View>
  </View>
</View>
```

#### 4.3 Update Metrics Grid & Quick Actions JSX
```tsx
{/* 3 Metrics Cards Grid */}
<View style={[styles.metricsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
  {/* Card 1: Corporate Tax */}
  <TouchableOpacity
    style={[styles.metricCard, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}
    activeOpacity={0.8}
    onPress={() => router.push('/(tabs)/tax')}
  >
    <View style={styles.metricIconBox}>
      <Ionicons name="business-outline" size={18} color={colors.brand.primary} />
    </View>
    <Text style={[styles.metricLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{isRTL ? 'ضريبة الشركات' : 'Corporate Tax'}</Text>
    <Text style={[styles.metricAmount, { textAlign: isRTL ? 'right' : 'left' }]}>AED 0</Text>
    <Text style={[styles.metricSub, { textAlign: isRTL ? 'right' : 'left' }]}>
      {isRTL ? 'تقديري لهذه الفترة' : 'Est. for this period'}
    </Text>
  </TouchableOpacity>

  {/* Card 2: VAT (201) */}
  <TouchableOpacity
    style={[styles.metricCard, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}
    activeOpacity={0.8}
    onPress={() => router.push('/(tabs)/tax')}
  >
    <View style={styles.metricIconBox}>
      <Ionicons name="pie-chart-outline" size={18} color={colors.brand.primary} />
    </View>
    <Text style={[styles.metricLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{isRTL ? 'القيمة المضافة (201)' : 'VAT (201)'}</Text>
    <Text style={[styles.metricAmount, { textAlign: isRTL ? 'right' : 'left' }]}>AED 14,320</Text>
    <Text style={[styles.metricSub, { textAlign: isRTL ? 'right' : 'left' }]}>{isRTL ? 'يستحق خلال 23 يوماً' : 'Due in 23 days'}</Text>
  </TouchableOpacity>

  {/* Card 3: SBR Status */}
  <TouchableOpacity
    style={[styles.metricCard, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}
    activeOpacity={0.8}
    onPress={() => router.push('/(tabs)/tax')}
  >
    <View style={styles.metricIconBox}>
      <Ionicons name="bar-chart-outline" size={18} color={colors.brand.primary} />
    </View>
    <Text style={[styles.metricLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{isRTL ? 'إعفاء الشركات' : 'SBR Status'}</Text>
    <View style={styles.sbrEligibleChip}>
      <Text style={styles.sbrEligibleText}>{isRTL ? 'مؤهل' : 'Eligible'}</Text>
    </View>
    {/* Mini Progress Bar */}
    <View style={styles.sbrProgressBarBg}>
      <View style={[styles.sbrProgressBarFill, { width: '60%' }]} />
    </View>
    <Text style={[styles.metricSub, { textAlign: isRTL ? 'right' : 'left' }]}>Turnover: 1.8M / 3M</Text>
  </TouchableOpacity>
</View>

{/* 5 Quick Action Circular Buttons */}
<View style={[styles.quickActionsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
  {/* action items retain center alignment within their flex: 1 containers */}
  ...
</View>
```

#### 4.4 Update Tax Calendar & AI Banner JSX
```tsx
{/* Tax Calendar Section */}
<View style={styles.calendarCard}>
  <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
    <View style={[styles.cardHeaderLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Ionicons name="calendar-outline" size={20} color={colors.neutral.textPrimary} />
      <Text style={styles.cardHeaderText}>
        {isRTL ? 'التقويم الضريبي' : 'Tax Calendar'}
      </Text>
    </View>
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/tax')}
      style={[styles.viewAllRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
    >
      <Text style={styles.viewAllText}>{isRTL ? 'عرض الكل' : 'View All'}</Text>
      <Ionicons
        name={isRTL ? 'arrow-back' : 'arrow-forward'}
        size={14}
        color={colors.neutral.textSecondary}
      />
    </TouchableOpacity>
  </View>

  {/* Deadline item 1 */}
  <View style={[styles.calendarItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
    <View style={[styles.dateBadge, isRTL ? { marginLeft: 12, marginRight: 0 } : { marginRight: 12, marginLeft: 0 }]}>
      <Text style={styles.dateBadgeMonth}>DEC</Text>
      <Text style={styles.dateBadgeDay}>28</Text>
    </View>
    <View style={[styles.calendarInfoCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
      <Text style={[styles.calendarItemTitle, { textAlign: isRTL ? 'right' : 'left' }]}>VAT Return (Form 201)</Text>
      <Text style={[styles.calendarItemSub, { textAlign: isRTL ? 'right' : 'left' }]}>Period: Nov 1 – Nov 30, 2026</Text>
    </View>
    <View style={styles.dueDaysChip}>
      <Text style={styles.dueDaysText}>Due in 23 days</Text>
    </View>
  </View>

  <View style={styles.itemDivider} />

  {/* Deadline item 2 */}
  <View style={[styles.calendarItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
    <View style={[styles.dateBadge, isRTL ? { marginLeft: 12, marginRight: 0 } : { marginRight: 12, marginLeft: 0 }]}>
      <Text style={styles.dateBadgeMonth}>JAN</Text>
      <Text style={styles.dateBadgeDay}>31</Text>
    </View>
    <View style={[styles.calendarInfoCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
      <Text style={[styles.calendarItemTitle, { textAlign: isRTL ? 'right' : 'left' }]}>Corporate Tax Return</Text>
      <Text style={[styles.calendarItemSub, { textAlign: isRTL ? 'right' : 'left' }]}>FY: Jan 1 – Dec 31, 2026</Text>
    </View>
    <View style={styles.upcomingChip}>
      <Text style={styles.upcomingText}>Upcoming</Text>
    </View>
  </View>
</View>

{/* Ask Mizan AI Banner */}
<TouchableOpacity
  style={styles.aiBannerCard}
  activeOpacity={0.88}
  onPress={() => router.push('/learn/chat')}
>
  <View style={[styles.aiBannerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
    <View style={[styles.aiBannerLeft, isRTL ? { marginLeft: 12, marginRight: 0, alignItems: 'flex-end' } : { marginRight: 12, marginLeft: 0, alignItems: 'flex-start' }]}>
      <View style={[styles.aiBannerTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="sparkles" size={18} color={colors.brand.primary} />
        <Text style={styles.aiBannerTitle}>
          Ask Mizan <Text style={{ color: colors.brand.primary }}>AI</Text>
        </Text>
      </View>
      <Text style={[styles.aiBannerDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
        {isRTL
          ? 'احصل على إجابات فورية واستشارات دقيقة وفقاً للقوانين الإماراتية.'
          : 'Get instant, UAE-specific tax answers, calculations, and compliance guidance.'}
      </Text>
    </View>

    <View style={[styles.askAnythingButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text style={styles.askAnythingText}>
        {isRTL ? 'اسأل الآن' : 'Ask Anything'}
      </Text>
      <Ionicons
        name={isRTL ? 'arrow-back' : 'arrow-forward'}
        size={14}
        color={colors.neutral.textPrimary}
      />
    </View>
  </View>
</TouchableOpacity>
```

#### 4.5 Clean Up Styles in `StyleSheet.create`
Remove the hardcoded one-sided margins in the base style rules so they do not conflict with the dynamic inline overrides:
- In `shieldContainer`: Remove `marginLeft: 12`.
- In `dateBadge`: Remove `marginRight: 12`.
- In `aiBannerLeft`: Remove `marginRight: 12`.

---

## 5. Verification Checklist
- [ ] Run `npx tsc --noEmit` from `mobile/` to confirm zero TypeScript compilation errors.
- [ ] Verify in English mode (LTR):
  - Brand header shows logo on left, action icons on right.
  - Compliance card shows text on left, shield glow on right.
  - Metrics cards display left-aligned labels and values.
  - Tax Calendar shows date badge on left with 12px margin before the title column.
  - Ask Mizan AI banner has description on left and "Ask Anything" CTA button on right.
- [ ] Verify in Arabic mode (RTL):
  - Brand header mirrors: logo on right, action icons on left.
  - Compliance card mirrors: text on right, shield glow on left with 12px spacing between them.
  - Metrics cards order reverses (Card 1 on right, Card 3 on left).
  - Tax Calendar items mirror: date badge on right with 12px margin separating it from Arabic title.
  - AI banner mirrors: text block on right and CTA button on left.
