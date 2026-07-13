# MiMo run — 2026-06-14T07:26:27.777Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y only, zero visual change, no reduced-motion needed (NO framer-motion, no raw CSS animate; shadcn Skeleton out of scope). File HAS useTranslation so back label uses t common.back. Edits: (1) icon-only ghost back Button gets aria-label t of common.back, its ArrowLeft gets aria-hidden true. (2) aria-hidden true on every decorative icon beside visible text: header Shield, banner Shield, Calendar in Week-of CardTitle, Clock by days-left, TrendingUp empty state, Wallet in Last Payout CardTitle, Wallet no-payouts empty state, Building2 and ChevronRight in the Payment-to-ZIVO button. (3) the Payment-to-ZIVO Button has visible text so NO aria-label just aria-hidden its icons. Headings h1 then h2 then CardTitle h3 contiguous NO CHANGE. List exact edits only, no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Guarantee.tsx

---

## Plan

Nine `aria-hidden="true"` attributes on decorative icons, one `aria-label` + one `aria-hidden` on the back button. Zero visual or logic change.

## Proposed diff — `src/pages/driver/Guarantee.tsx`

```diff
--- a/src/pages/driver/Guarantee.tsx
+++ b/src/pages/driver/Guarantee.tsx
@@ -97,8 +97,8 @@
       <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
         <div className="flex items-center gap-3 p-4">
-          <Button variant="ghost" size="icon" onClick={goBack}>
-            <ArrowLeft className="h-5 w-5" />
+          <Button variant="ghost" size="icon" onClick={goBack} aria-label={t("common.back")}>
+            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
           </Button>
           <div className="flex items-center gap-2">
-            <Shield className="h-5 w-5 text-primary" />
+            <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
             <h1 className="text-lg font-semibold">Earnings Guarantee</h1>
@@ -109,7 +109,7 @@
             <div className="flex items-start gap-3">
               <div className="p-2 bg-primary/10 rounded-full">
-                <Shield className="h-6 w-6 text-primary" />
+                <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
               </div>
               <div>
@@ -121,10 +121,10 @@
             <div className="flex items-center justify-between">
               <CardTitle className="text-base flex items-center gap-2">
-                <Calendar className="h-4 w-4 text-muted-foreground" />
+                <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                 Week of {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
               </CardTitle>
               <div className="flex items-center gap-1 text-sm text-muted-foreground">
-                <Clock className="h-4 w-4" />
+                <Clock className="h-4 w-4" aria-hidden="true" />
                 {daysRemaining} days left
@@ -172,16 +172,16 @@
                 {passengerTotal === 0 && (
                   <div className="text-center py-4">
-                    <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
+                    <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
                     <p className="text-sm text-muted-foreground">
@@ -182,7 +182,7 @@
           <CardHeader className="pb-2">
             <CardTitle className="text-base flex items-center gap-2">
-              <Wallet className="h-4 w-4 text-muted-foreground" />
+              <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
               Last Payout
             </CardTitle>
@@ -194,14 +194,14 @@
             ) : (
               <div className="text-center py-4">
-                <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
+                <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
                 <p className="text-sm text-muted-foreground">No payouts yet</p>
@@ -203,9 +203,9 @@
           <span className="flex items-center gap-2">
-            <Building2 className="h-4 w-4 text-primary" />
+            <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
             {t("wallet.paymentToZivo")}
           </span>
-          <ChevronRight className="h-4 w-4" />
+          <ChevronRight className="h-4 w-4" aria-hidden="true" />
         </Button>
```

**Summary of every edit (11 icon touches, 0 logic):**

| # | Element | Change |
|---|---------|--------|
| 1 | Back `<Button>` L99 | add `aria-label={t("common.back")}` |
| 2 | `<ArrowLeft>` L100 | add `aria-hidden="true"` |
| 3 | Header `<Shield>` L103 | add `aria-hidden="true"` |
| 4 | Banner `<Shield>` L112 | add `aria-hidden="true"` |
| 5 | Week-of `<Calendar>` L124 | add `aria-hidden="true"` |
| 6 | Days-left `<Clock>` L128 | add `aria-hidden="true"` |
| 7 | Empty-state `<TrendingUp>` L175 | add `aria-hidden="true"` |
| 8 | Last Payout `<Wallet>` (CardTitle) L185 | add `aria-hidden="true"` |
| 9 | No-payouts `<Wallet>` (empty state) L197 | add `aria-hidden="true"` |
| 10 | Payment-to-ZIVO `<Building2>` L206 | add `aria-hidden="true"` |
| 11 | Payment-to-ZIVO `<ChevronRight>` L208 | add `aria-hidden="true"` |

**Owner verification:**
- Run `npm run type-check` (or the zivodriver equivalent) — should stay at 0 errors.
- Visually confirm zero layout/spacing shift (aria-hidden/aria-label are non-visual).
- Confirm `t("common.back")` resolves to the correct translation string in the driver project's i18n files.
