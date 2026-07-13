# MiMo run — 2026-06-14T08:25:25.203Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y zero visual change. File imports NO framer-motion and NO motion.div and NO animate-spin or animate-pulse the loaders are shadcn Skeleton which is OUT OF SCOPE so NO reduced-motion work at all. File HAS useTranslation so use t common.back for the back label. One icon-only shadcn ghost back Button onClick navigate to driver wallet gets aria-label t common.back and its ArrowLeft aria-hidden true. aria-hidden true on decorative icons beside visible text the header Building2 beside the h1 title the summary-card AlertTriangle beside Outstanding and Check beside Total Paid the empty-state Check and the empty-state Receipt and inside the StatusBadge sub-component the Check Clock AlertTriangle and X icons each beside the badge label text. HEADING single h1 title no other headings so NO heading change. There is NO CardTitle. Confirm or correct list exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/CompanyPayments.tsx

---

## Plan

11 purely additive `aria-*` attribute edits — zero className or logic changes.

| # | Location | Edit |
|---|----------|------|
| 1 | Header back `<Button>` | Add `aria-label={t("common.back")}` |
| 2 | Header back `<ArrowLeft>` | Add `aria-hidden="true"` |
| 3 | Header `<Building2>` | Add `aria-hidden="true"` |
| 4 | Summary card `<AlertTriangle>` (Outstanding) | Add `aria-hidden="true"` |
| 5 | Summary card `<Check>` (Total Paid) | Add `aria-hidden="true"` |
| 6 | Empty-state `<Check>` (pending tab) | Add `aria-hidden="true"` |
| 7 | Empty-state `<Receipt>` (history tab) | Add `aria-hidden="true"` |
| 8 | StatusBadge `<Check>` (paid) | Add `aria-hidden="true"` |
| 9 | StatusBadge `<Clock>` (pending) | Add `aria-hidden="true"` |
| 10 | StatusBadge `<AlertTriangle>` (overdue) | Add `aria-hidden="true"` |
| 11 | StatusBadge `<X>` (waived) | Add `aria-hidden="true"` |

**No heading edits** (single h1, no CardTitle). **No reduced-motion work** (Skeleton is shadcn, out of scope). **No logic or className changes.**

## Diff

File: `../zivodriver/src/pages/driver/CompanyPayments.tsx`

```diff
--- a/src/pages/driver/CompanyPayments.tsx
+++ b/src/pages/driver/CompanyPayments.tsx
@@ StatusBadge component
-      return <Badge className="bg-primary/10 text-primary"><Check className="h-3 w-3 mr-1" />{t("companyPayments.paid")}</Badge>;
+      return <Badge className="bg-primary/10 text-primary"><Check aria-hidden="true" className="h-3 w-3 mr-1" />{t("companyPayments.paid")}</Badge>;
-      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
+      return <Badge variant="secondary"><Clock aria-hidden="true" className="h-3 w-3 mr-1" />Pending</Badge>;
-      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
+      return <Badge variant="destructive"><AlertTriangle aria-hidden="true" className="h-3 w-3 mr-1" />Overdue</Badge>;
-      return <Badge variant="outline"><X className="h-3 w-3 mr-1" />Waived</Badge>;
+      return <Badge variant="outline"><X aria-hidden="true" className="h-3 w-3 mr-1" />Waived</Badge>;

@@ Header
-        <Button variant="ghost" size="icon" onClick={() => navigate("/driver/wallet")}>
-          <ArrowLeft className="h-5 w-5" />
+        <Button variant="ghost" size="icon" aria-label={t("common.back")} onClick={() => navigate("/driver/wallet")}>
+          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
         </Button>
-        <Building2 className="h-5 w-5 text-primary" />
+        <Building2 aria-hidden="true" className="h-5 w-5 text-primary" />

@@ Summary card — Outstanding
-                <AlertTriangle className="h-3 w-3" />
+                <AlertTriangle aria-hidden="true" className="h-3 w-3" />

@@ Summary card — Total Paid
-                <Check className="h-3 w-3" />
+                <Check aria-hidden="true" className="h-3 w-3" />

@@ Empty-state (pending tab)
-                <Check className="h-10 w-10 mx-auto mb-3 text-primary/50" />
+                <Check aria-hidden="true" className="h-10 w-10 mx-auto mb-3 text-primary/50" />

@@ Empty-state (history tab)
-                <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
+                <Receipt aria-hidden="true" className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
```

## Owner verify

- `npm run update` must pass (type-check + worker type-check + build).
- Confirm `t("common.back")` exists in the translation files. If the key path differs (e.g. `t("common.back")` vs `t("back")`), adjust accordingly.
- This file is in `zivodriver` — run the gate from that project root if it has its own build pipeline, or from the monorepo root if `npm run update` covers it.
