# MiMo run — 2026-06-14T06:41:16.297Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive non-visual accessibility only, zero visual change. NO framer-motion. Identify: icon-only ghost back Button needs aria-label Back, decorative icons ArrowLeft and empty-state Send and the 3 statusBadge icons Check Clock X each beside visible label text need aria-hidden true. Confirm single h1 Payouts heading order fine. List exact edits only, no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/WalletPayouts.tsx

---

## Plan

Six additive ARIA edits, zero visual/logic change:

1. **Back `<Button>`** — icon-only ghost, no visible text → add `aria-label="Back"`.
2. **`ArrowLeft`** inside that button — decorative (label conveys meaning) → add `aria-hidden="true"`.
3. **`Send`** empty-state icon — decorative beside "No payouts yet" → add `aria-hidden="true"`.
4. **`Check`** in `statusBadge` paid branch — decorative beside "Paid" → add `aria-hidden="true"`.
5. **`Clock`** in `statusBadge` processing branch — decorative beside "Processing" → add `aria-hidden="true"`.
6. **`X`** in `statusBadge` failed branch — decorative beside "Failed" → add `aria-hidden="true"`.

**`<h1>Payouts</h1>`** — single h1, correct heading order. ✅ No change.

---

## Diff

**File:** `src/pages/driver/WalletPayouts.tsx`

```diff
 function statusBadge(status: string) {
   switch (status) {
     case "paid":
-      return <Badge className="bg-primary/10 text-primary"><Check className="h-3 w-3 mr-1" />Paid</Badge>;
+      return <Badge className="bg-primary/10 text-primary"><Check className="h-3 w-3 mr-1" aria-hidden="true" />Paid</Badge>;
     case "processing":
-      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
+      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" aria-hidden="true" />Processing</Badge>;
     case "failed":
-      return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Failed</Badge>;
+      return <Badge variant="destructive"><X className="h-3 w-3 mr-1" aria-hidden="true" />Failed</Badge>;
     default:
       return <Badge variant="outline">{status}</Badge>;
   }
```

```diff
-        <Button variant="ghost" size="icon" onClick={() => navigate("/driver/wallet")}>
-          <ArrowLeft className="h-5 w-5" />
+        <Button variant="ghost" size="icon" onClick={() => navigate("/driver/wallet")} aria-label="Back">
+          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
         </Button>
```

```diff
-            <Send className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
+            <Send className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" aria-hidden="true" />
```

---

## Summary

| # | Element | Edit |
|---|---------|------|
| 1 | Back `<Button>` | `aria-label="Back"` |
| 2 | `<ArrowLeft>` | `aria-hidden="true"` |
| 3 | `<Send>` (empty state) | `aria-hidden="true"` |
| 4 | `<Check>` (paid badge) | `aria-hidden="true"` |
| 5 | `<Clock>` (processing badge) | `aria-hidden="true"` |
| 6 | `<X>` (failed badge) | `aria-hidden="true"` |

**6 additive attributes, 0 className changes, 0 logic lines touched, 0 visual change.**

## Owner verification

- `npm run type-check` — must stay at 0 errors (these are standard HTML/SVG attrs, no risk).
- Screen reader: Back button should announce "Back, button"; badges read "Paid"/"Processing"/"Failed" without the icon being separately announced; empty state reads "No payouts yet" without the Send icon.
- Heading order: confirm the page lives under the correct route so the single `<h1>Payouts</h1>` sits within a proper heading hierarchy.
