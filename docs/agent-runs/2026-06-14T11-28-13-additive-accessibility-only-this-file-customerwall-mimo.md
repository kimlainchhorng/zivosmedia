# MiMo run — 2026-06-14T11:28:13.327Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility only. This file CustomerWallet.tsx is English only with NO framer-motion and NO motion components so NO reduced-motion changes are needed. Add aria-hidden true to decorative icons: the five icons returned by getTxIcon which are ArrowDownRight RefreshCw ArrowUpRight Gift CreditCard shown next to a visible transaction description or label, the Wallet icon in the header next to the visible Wallet h1 heading, the Gift icon in the balance card next to the Lifetime Credits text, and the CreditCard and Gift icons in the two Quick Info cards which have visible text. The header back button is an icon-only ghost Button with size icon containing only an ArrowLeft and no visible text so add aria-label Back and aria-hidden its ArrowLeft. Do not add aria-label to controls with visible text. Do NOT touch the shadcn Skeleton component it is a primitive. There is no raw heading skip the only raw heading is the h1 and Transaction History is a shadcn CardTitle which is deferred. Do not change logic or layout.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/customer/CustomerWallet.tsx

---

## Plan

Pure additive accessibility — `aria-hidden="true"` on decorative icons, `aria-label="Back"` on the icon-only back button. Zero logic or layout changes. No framer-motion, no Skeleton, no heading changes.

**Icons to mark `aria-hidden="true"`:**
1. All 5 icons inside `getTxIcon()` (decorative next to visible transaction label)
2. Header `Wallet` icon (next to visible `<h1>Wallet</h1>`)
3. Balance-card `Gift` icon (next to visible "Lifetime Credits")
4. Quick-info `CreditCard` icon (next to visible "Pay with Wallet")
5. Quick-info `Gift` icon (next to visible "Earn Credits")
6. Header back-button `ArrowLeft` icon (inside button that gets `aria-label`)

**Button to label:**
- Header `<Button variant="ghost" size="icon">` — icon-only, no visible text → add `aria-label="Back"`

---

## Proposed diff

**File:** `src/pages/customer/CustomerWallet.tsx`

```diff
 const getTxIcon = (type: string) => {
   switch (type) {
     case "credit":
     case "promo_credit":
     case "referral_credit":
-      return <ArrowDownRight className="w-4 h-4 text-success" />;
+      return <ArrowDownRight className="w-4 h-4 text-success" aria-hidden="true" />;
     case "refund":
-      return <RefreshCw className="w-4 h-4 text-accent" />;
+      return <RefreshCw className="w-4 h-4 text-accent" aria-hidden="true" />;
     case "payment":
     case "debit":
-      return <ArrowUpRight className="w-4 h-4 text-destructive" />;
+      return <ArrowUpRight className="w-4 h-4 text-destructive" aria-hidden="true" />;
     case "reward":
-      return <Gift className="w-4 h-4 text-warning" />;
+      return <Gift className="w-4 h-4 text-warning" aria-hidden="true" />;
     default:
-      return <CreditCard className="w-4 h-4 text-muted-foreground" />;
+      return <CreditCard className="w-4 h-4 text-muted-foreground" aria-hidden="true" />;
   }
 };
```

```diff
-        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
-          <ArrowLeft className="h-5 w-5" />
+        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
+          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
         </Button>
```

```diff
           <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
```

```diff
-                    <Gift className="w-4 h-4 text-primary" />
+                    <Gift className="w-4 h-4 text-primary" aria-hidden="true" />
```

```diff
-              <CreditCard className="w-5 h-5 text-primary mx-auto mb-1" />
+              <CreditCard className="w-5 h-5 text-primary mx-auto mb-1" aria-hidden="true" />
```

```diff
-              <Gift className="w-5 h-5 text-warning mx-auto mb-1" />
+              <Gift className="w-5 h-5 text-warning mx-auto mb-1" aria-hidden="true" />
```

---

## Summary of counts

| Change | Count |
|--------|-------|
| `aria-hidden="true"` added | 10 (5 in `getTxIcon` + header Wallet + header ArrowLeft + balance Gift + quick-info CreditCard + quick-info Gift) |
| `aria-label` added | 1 (Back button) |
| Logic lines touched | 0 |
| Layout/class changes | 0 |

---

## Owner verification

1. Run `npm run update` (type-check + worker type-check + production build) — must pass.
2. Confirm `lucide-react` passes `aria-hidden` through to the rendered `<svg>` (it does — lucide spreads extra props onto the root SVG element).
3. No deploy step needed — additive HTML attributes only.
