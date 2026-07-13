# DeepSeek run — 2026-06-14T06:42:19.792Z

- model: deepseek-chat
- task: Additive non-visual accessibility only, zero visual change. NO framer-motion in this file but it uses Tailwind animate-spin on 2 Loader2 spinners which need motion-reduce:animate-none appended. File already imports useTranslation t. Identify: icon-only back button needs aria-label t common.back; decorative icons need aria-hidden true (ArrowLeft, balance DollarSign, pending Clock, lifetime TrendingUp, button Zap, setup AlertCircle, 2 Loader2 spinners, 2 ExternalLink, the 2 CheckCircle and 2 AlertCircle in Stripe-status block each beside text). Heading order: single h1 then two h3 (Finish Stripe setup, Payout History) which skip h2 level - recommend promoting both h3 to h2. List exact edits only, no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Payouts.tsx

---

## Plan

This is a pure accessibility pass on `src/pages/driver/Payouts.tsx` — no visual changes, no logic changes, no framer-motion. The file is in the **zivodriver** sub-project (`../zivodriver/src/pages/driver/Payouts.tsx`), not the main ZIVO monorepo.

**Edits needed:**

1. **Icon-only back button** — add `aria-label={t("common.back")}` (already imports `t` from `useTranslation`)
2. **Decorative icons** — add `aria-hidden="true"` to: `ArrowLeft`, `DollarSign`, `Clock`, `TrendingUp`, `Zap`, `AlertCircle` (setup banner), both `Loader2` spinners, both `ExternalLink`, both `CheckCircle` and both `AlertCircle` in the Stripe-status block
3. **Motion-reduce on spinners** — append `motion-reduce:animate-none` to the `animate-spin` classes on both `Loader2` instances
4. **Heading order** — promote the two `<h3>` elements to `<h2>`:
   - "Finish Stripe setup to get paid" (setup banner)
   - Payout History heading

## Proposed Diff

```diff
--- a/zivodriver/src/pages/driver/Payouts.tsx
+++ b/zivodriver/src/pages/driver/Payouts.tsx
@@ -72,7 +72,7 @@ export default function DriverPayouts() {
         <div className="flex items-center gap-3">
           <button
             onClick={goBack}
-            className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
+            className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
+            aria-label={t("common.back")}
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </button>
@@ -107,7 +108,7 @@ export default function DriverPayouts() {
           <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
             <div className="flex items-start gap-3">
-              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
+              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
               <div className="flex-1">
-                <h3 className="font-medium text-foreground">Finish Stripe setup to get paid</h3>
+                <h2 className="font-medium text-foreground">Finish Stripe setup to get paid</h2>
                 <p className="text-sm text-muted-foreground mt-1">
@@ -120,7 +121,7 @@ export default function DriverPayouts() {
                   {isGettingLink ? (
                     <>
-                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
+                      <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                       Loading...
                     </>
                   ) : (
                     <>
                       Set Up Now
-                      <ExternalLink className="w-4 h-4 ml-2" />
+                      <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
                     </>
                   )}
@@ -140,7 +141,7 @@ export default function DriverPayouts() {
             <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
-              <DollarSign className="w-6 h-6 text-primary" />
+              <DollarSign className="w-6 h-6 text-primary" aria-hidden="true" />
             </div>
@@ -152,12 +153,12 @@ export default function DriverPayouts() {
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
-                <Clock className="w-4 h-4" />
+                <Clock className="w-4 h-4" aria-hidden="true" />
                 <span>{formatCurrency(pendingBalance, isCambodia)} pending</span>
               </div>
             )}
             {lifetimeEarnings > 0 && (
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
-                <TrendingUp className="w-4 h-4 text-primary" />
+                <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" />
                 <span>Lifetime: {formatCurrency(lifetimeEarnings, isCambodia)}</span>
               </div>
             )}
@@ -170,7 +171,7 @@ export default function DriverPayouts() {
               className="w-full bg-primary hover:bg-primary/90"
               size="lg"
             >
-              <Zap className="w-5 h-5 mr-2" />
+              <Zap className="w-5 h-5 mr-2" aria-hidden="true" />
               Instant Cashout
@@ -194,9 +195,9 @@ export default function DriverPayouts() {
           <div className="flex items-center gap-1.5">
             {stripeStatus.hasAccount ? (
-              <CheckCircle className="w-4 h-4 text-success" />
+              <CheckCircle className="w-4 h-4 text-success" aria-hidden="true" />
             ) : (
-              <AlertCircle className="w-4 h-4 text-muted-foreground" />
+              <AlertCircle className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
             )}
             <span className="text-muted-foreground">
@@ -206,9 +207,9 @@ export default function DriverPayouts() {
           <div className="flex items-center gap-1.5">
             {stripeStatus.payoutsEnabled ? (
-              <CheckCircle className="w-4 h-4 text-success" />
+              <CheckCircle className="w-4 h-4 text-success" aria-hidden="true" />
             ) : (
-              <AlertCircle className="w-4 h-4 text-muted-foreground" />
+              <AlertCircle className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
             )}
             <span className="text-muted-foreground">
@@ -226,7 +227,7 @@ export default function DriverPayouts() {
             >
               {isOpeningDashboard ? (
-                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
+                <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" />
               ) : (
-                <ExternalLink className="w-4 h-4 mr-2" />
+                <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
               )}
               View Stripe Dashboard
@@ -237,7 +238,7 @@ export default function DriverPayouts() {
         {/* Payout History */}
         <div className="bg-card border border-border rounded-xl p-4">
-          <h3 className="text-sm font-semibold text-foreground mb-3">{t("wallet.payoutHistory")}</h3>
+          <h2 className="text-sm font-semibold text-foreground mb-3">{t("wallet.payoutHistory")}</h2>
```

## Summary of changes

| # | Element | Change |
|---|---------|--------|
| 1 | Back button | Added `aria-label={t("common.back")}` |
| 2 | `ArrowLeft` (header) | Added `aria-hidden="true"` |
| 3 | `AlertCircle` (setup banner) | Added `aria-hidden="true"` |
| 4 | `Loader2` (setup button, loading) | Added `aria-hidden="true"` + `motion-reduce:animate-none` |
| 5 | `ExternalLink` (setup button) | Added `aria-hidden="true"` |
| 6 | `DollarSign` (balance card) | Added `aria-hidden="true"` |
| 7 | `Clock` (pending balance) | Added `aria-hidden="true"` |
| 8 | `TrendingUp` (lifetime earnings) | Added `aria-hidden="true"` |
| 9 | `Zap` (cashout button) | Added `aria-hidden="true"` |
| 10 | `CheckCircle` ×2 (Stripe status) | Added `aria-hidden="true"` |
| 11 | `AlertCircle` ×2 (Stripe status) | Added `aria-hidden="true"` |
| 12 | `Loader2` (dashboard button, loading) | Added `aria-hidden="true"` + `motion-reduce:animate-none` |
| 13 | `ExternalLink` (dashboard button) | Added `aria-hidden="true"` |
| 14 | `<h3>` → `<h2>` (setup banner heading) | Promoted to `h2` |
| 15 | `<h3>` → `<h2>` (payout history heading) | Promoted to `h2` |

## Owner verification

1. **Confirm `t("common.back")` exists** in the translation files for the zivodriver project — if not, use a literal `"Back"` or the existing translation key.
2. **This file is in the zivodriver sub-project** (`../zivodriver/`), not the main ZIVO monorepo — verify the path is correct before applying.
3. **Run `npm run update`** (or the zivodriver equivalent type-check) after applying to ensure no regressions.
4. **No visual changes** — all edits are `aria-*` attributes, `motion-reduce:` utility, and heading tag swaps (same Tailwind classes preserved).
