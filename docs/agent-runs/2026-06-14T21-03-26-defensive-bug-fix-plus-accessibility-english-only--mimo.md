# MiMo run — 2026-06-14T21:03:26.955Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Defensive bug fix plus accessibility, English only React TSX driver app component using framer motion. There is an icon only motion button that calls window dot location dot href equals a tel URL built from order dot customer dot phone, which can be empty or undefined, so tapping it when phone is missing silently does nothing. One, add a guard so when the phone value is missing or empty the handler instead shows a toast from the sonner library with message Call not available and a description telling the user the customer phone is not available. Only set the tel link when a real phone value exists. Keep the existing haptic onButtonPress call. Two, the button is icon only with no visible text, so add an aria-label saying Call customer to the button and aria-hidden true on the inner Phone lucide icon. Do not change layout or any visible copy. Report the exact edits as a diff.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/ActiveDelivery.tsx

---

## Plan

Two surgical edits to `../zivodriver/src/components/ActiveDelivery.tsx`:

1. **Import `toast`** from `sonner` (one new import line).
2. **Rewrite the phone-button `onClick`** to guard on `order.customer.phone`, call `toast.error(...)` when missing, and only set `window.location.href` when a real value exists.
3. **Add `aria-label="Call customer"`** to the `<motion.button>` and **`aria-hidden="true"`** to the `<Phone>` icon.

No layout changes, no visible copy changes.

---

## Diff

```diff
--- a/zivodriver/src/components/ActiveDelivery.tsx
+++ b/zivodriver/src/components/ActiveDelivery.tsx
@@ -1,6 +1,7 @@
 import { motion } from "framer-motion";
 import { MapPin, Phone, Navigation, Clock, Store, User, CheckCircle2, Sparkles } from "lucide-react";
 import { Button } from "@/components/ui/button";
+import { toast } from "sonner";
 import { useNotificationSound } from "@/hooks/useNotificationSound";
 import { useHapticFeedback } from "@/hooks/useHapticFeedback";
 import { useState } from "react";
@@ -151,10 +152,17 @@
           <motion.button 
             className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-muted flex items-center justify-center shrink-0 hover:bg-muted/80 transition-colors"
+            aria-label="Call customer"
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.9 }}
             onClick={() => {
               haptic.onButtonPress();
-              window.location.href = `tel:${order.customer.phone}`;
+              const phone = order.customer.phone?.trim();
+              if (phone) {
+                window.location.href = `tel:${phone}`;
+              } else {
+                toast.error("Call not available", {
+                  description: "The customer phone number is not available.",
+                });
+              }
             }}
           >
-            <Phone className="w-4 h-4 text-muted-foreground" />
+            <Phone className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
           </motion.button>
```

**Exact lines changed (3 hunks):**

| # | What | Before | After |
|---|------|--------|-------|
| 1 | **Import** (after `Button` import) | — | `import { toast } from "sonner";` |
| 2 | **Button attrs** | `whileHover` is first attr after className | `aria-label="Call customer"` inserted between className and whileHover |
| 3 | **onClick body** | `haptic.onButtonPress();` → `window.location.href = \`tel:${order.customer.phone}\`` | haptic preserved; then `const phone = order.customer.phone?.trim(); if (phone) { window.location.href = \`tel:${phone}\`; } else { toast.error("Call not available", { description: "The customer phone number is not available." }); }` |
| 4 | **Phone icon** | `<Phone className="w-4 h-4 text-muted-foreground" />` | `<Phone className="w-4 h-4 text-muted-foreground" aria-hidden="true" />` |

---

## Owner verification

- **Confirm `sonner` is installed** in `zivodriver/package.json`. If not: `npm i sonner` and ensure `<Toaster />` is mounted at the app root.
- **Confirm the `phone` field** — the interface declares `phone: string` (non-optional), but if the Supabase query can return `null`, consider changing the interface to `phone?: string | null` so TypeScript catches it at compile time. The `.trim()` guard handles runtime `undefined`/`null`/`""` regardless.
- **Run `npm run update`** (type-check + build) from the `zivodriver` project root to confirm zero errors.
- **No deploy needed by the agent** — owner commits and deploys per house rules.
