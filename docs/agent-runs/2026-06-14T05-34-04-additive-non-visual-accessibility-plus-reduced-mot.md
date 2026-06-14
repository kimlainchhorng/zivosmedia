# DeepSeek run — 2026-06-14T05:34:04.035Z

- model: deepseek-chat
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. This is MultiAccountBanner, MOUNTED on /map. It is a persistent destructive glass alert banner shown when an account is under review. A framer-motion div animates in with initial opacity 0 y -8, spring transition. Inside: a ShieldAlert icon in a rounded box, then a bold title 'Account under review' and a muted line 'Please contact support for assistance.' No buttons. Questions: (1) Should the ShieldAlert icon get aria-hidden true since the title text already conveys meaning? (2) The entrance has a small y -8 translate - guard with useReducedMotion so initial becomes false when reduced motion is preferred, keeping the element at its final position? (3) This is an important account-status alert the driver did not trigger - should it get role=status aria-live=polite (polite, not assertive) so screen readers announce it, or leave it with no live region since it is persistent? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/driver/MultiAccountBanner.tsx

---

## Verdict per point

**(1) `aria-hidden` on ShieldAlert icon** — **YES.** The icon is purely decorative; the adjacent `<p>` text "Account under review" already conveys the meaning. Add `aria-hidden="true"` to the `<ShieldAlert>` element.

**(2) `useReducedMotion` guard on entrance** — **YES.** The `initial={{ opacity: 0, y: -8 }}` causes a visible slide-up on mount. When reduced motion is preferred, this should be suppressed so the element appears at its final position immediately. Use `useReducedMotion()` from framer-motion to conditionally set `initial` to `false`.

**(3) `role="status"` + `aria-live="polite"`** — **YES.** This is a dynamic, important account-status alert that appears without user interaction. `role="status"` with `aria-live="polite"` ensures screen readers announce it without interrupting the current task. `assertive` would be too aggressive for a persistent banner.

---

## Proposed change

**File:** `../zivodriver/src/components/driver/MultiAccountBanner.tsx`

```diff
 import { motion } from "framer-motion";
+import { useReducedMotion } from "framer-motion";
 import { ShieldAlert } from "lucide-react";

 export default function MultiAccountBanner() {
+  const prefersReducedMotion = useReducedMotion();
+
   return (
     <motion.div
-      initial={{ opacity: 0, y: -8 }}
+      initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ type: "spring", stiffness: 300, damping: 25 }}
+      role="status"
+      aria-live="polite"
       className="mx-4 mt-2 p-3.5 rounded-[16px] flex items-center gap-3 border border-destructive/25"
       style={{
         background: "hsl(var(--destructive) / 0.08)",
@@ -17,7 +20,7 @@ export default function MultiAccountBanner() {
     >
       <div className="w-9 h-9 rounded-[12px] bg-destructive/12 flex items-center justify-center shrink-0">
-        <ShieldAlert className="h-5 w-5 text-destructive" />
+        <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
       </div>
       <div className="flex-1 min-w-0">
         <p className="text-[14px] font-semibold text-foreground">Account under review</p>
```

---

## Owner verification

- **No visual change** — the banner looks identical; only accessibility attributes and the reduced-motion guard are added.
- **Verify** `npm run update` passes (type-check + build) before committing.
- **Preview** on the `/map` route with a screen reader (VoiceOver/NVDA) to confirm the banner is announced on mount.
- **Test reduced motion:** enable "Reduce motion" in OS accessibility settings → the banner should appear instantly without the slide-up animation.
