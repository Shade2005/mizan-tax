# Implementation Plan & Record: Financial Gauges, Progress Meters & Hero Card Visual Depth

## Metadata
- **Plan ID**: `PLAN-UI-003`
- **Surfaces**:
  - `mobile/src/components/HeroTaxCard.tsx`
  - `mobile/app/(tabs)/tax.tsx`
  - `mobile/app/(tabs)/books.tsx`
  - `mobile/src/hooks/useAnimatedNumber.ts`
- **Baseline Commit**: `9a81bfb1954b9e1cf664117d2ca55865e59e0dea`
- **Status**: Completed and Verified

---

## 1. Objectives
1. **Option 1 (Financial Gauges & Progress Meters)**:
   - Provide visual clarity on UAE Corporate Tax thresholds (Art. 3 Law No. 47/2022) and Small Business Relief caps (Art. 21).
   - Display a segmented VAT 201 distribution progress bar (Box 1 Supplies vs Box 3 RCM vs Box 9 Recoverable Input Credit).
   - Display Operating Profit Margin gauge in Books P&L.
2. **Option 2 (Hero Card Depth & Number Transitions)**:
   - Implement layered visual depth on `HeroTaxCard` using Deep Burgundy Dark (`#360016`), ambient corner glow orbs (`#00E5FF`), and fine border highlights.
   - Smoothly animate financial metrics on mount using 60 FPS cubic ease-out transitions (`useAnimatedNumber`).

---

## 2. Changes Implemented
- **`mobile/src/hooks/useAnimatedNumber.ts`**: Created high-performance `requestAnimationFrame` ease-out cubic number animator.
- **`mobile/src/components/HeroTaxCard.tsx`**:
  - Integrated `useAnimatedNumber` for animated counter transitions on Corporate Tax and VAT figures.
  - Added visual **SBR 0% Relief Gauge** showing statutory cap progress (`40% used • AED 1.2M of AED 3.0M`).
  - Added subtle ambient cyan orb and deep burgundy layered styling for modern fintech depth.
- **`mobile/app/(tabs)/tax.tsx`**:
  - Added **0% vs 9% Statutory Bracket Meter** (First AED 375k @ 0% vs Excess AED 125k @ 9%).
  - Added **VAT 201 Return Reconciliation Meter** (Output Supplies, RCM imports, and Input Tax credits).
- **`mobile/app/(tabs)/books.tsx`**:
  - Added **Operating Profit Margin Meter** (41.7% net margin ratio indicator).

---

## 3. Verification
- `tsc --noEmit` verified with 0 errors.
- RTL layout mirroring validated for all horizontal meter bars and labels.
