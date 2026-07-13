# DeepSeek run — 2026-06-14T05:36:44.448Z

- model: deepseek-chat
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. This is ConnectionHealthBanner, MOUNTED on /map. It returns null unless the driver is online AND connectionHealth is degraded. Two states: POOR (yellow/warning bg) shows a Wifi icon plus 'Weak Signal. Location updates may be delayed.'; DISCONNECTED (red/destructive bg) shows a WifiOff icon plus 'No Connection. Check your internet.' A framer-motion div animates in initial opacity 0 y -20, fixed to top, AnimatePresence with exit. Questions: (1) Should the Wifi/WifiOff icons get aria-hidden true since the adjacent text conveys the meaning? (2) Guard the y -20 entrance with useReducedMotion so initial becomes false under reduced motion (leave exit as-is)? (3) Live region: this is an auto-triggered connection-status alert the driver did not trigger. Should DISCONNECTED use role=alert (assertive) since loss of connectivity is urgent, while POOR uses role=status aria-live=polite? Or should both be polite role=status for consistency? Give a clear recommendation. Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/ConnectionHealthBanner.tsx

---

## Audit: ConnectionHealthBanner — Accessibility + Reduced Motion

### (1) Short Plan

Three targeted, additive changes — no layout, copy, styling, or logic touched:

1. **Icons → `aria-hidden="true"`** — both `Wifi` and `WifiOff` are purely decorative alongside the adjacent text span. Mark them hidden from AT.
2. **Entrance animation → reduced-motion guard** — wrap `initial` so it becomes `false` when the user prefers reduced motion, preventing the `y: -20` slide-in. Leave `exit` as-is (fade-out is fine for all).
3. **Live region** — use **`role="status"` with `aria-live="polite"`** for both states. Rationale: `role="alert"` (assertive) would interrupt the driver mid-navigation or mid-call for a non-blocking status banner. POOR is advisory; DISCONNECTED, while urgent, is already visually prominent (red, fixed top, icon) and the driver can act on it without an assertive interruption. Consistency avoids jarring AT behavior differences between the two states.

### (2) Proposed Diff

**File:** `../zivodriver/src/components/ConnectionHealthBanner.tsx`

```diff
 import { motion, AnimatePresence } from "framer-motion";
 import { useDispatchStore } from "@/store/dispatchStore";
 import { WifiOff, Wifi } from "lucide-react";
+import { useReducedMotion } from "framer-motion";

 export default function ConnectionHealthBanner() {
   const health = useDispatchStore((state) => state.connectionHealth);
   const online = useDispatchStore((state) => state.online);
+  const prefersReducedMotion = useReducedMotion();

   // Only show if driver is online and health is degraded
   if (!online || health === "GOOD") return null;

   const isDisconnected = health === "DISCONNECTED";

   return (
     <AnimatePresence>
       <motion.div
         key="connection-banner"
-        initial={{ opacity: 0, y: -20 }}
+        initial={prefersReducedMotion ? false : { opacity: 0, y: -20 }}
         animate={{ opacity: 1, y: 0 }}
         exit={{ opacity: 0, y: -20 }}
         transition={{ duration: 0.2 }}
+        role="status"
+        aria-live="polite"
         className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium ${
           isDisconnected ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"
         }`}
       >
         <div className="flex items-center justify-center gap-2">
           {isDisconnected ? (
-            <WifiOff className="h-4 w-4" />
+            <WifiOff className="h-4 w-4" aria-hidden="true" />
           ) : (
-            <Wifi className="h-4 w-4" />
+            <Wifi className="h-4 w-4" aria-hidden="true" />
           )}
           <span>
             {isDisconnected
```

### (3) Owner Verification

- **Type-check:** run `npm run type-check` (or the project's equivalent) — `useReducedMotion` returns `boolean | null`, and `initial={false}` is a valid Framer Motion value, so no type error.
- **Preview:** open the driver app on `/map`, go online, and simulate degraded connection (e.g., via the dispatch store or network throttling). Verify:
  - Banner appears with correct icon + text for POOR and DISCONNECTED.
  - On a device with `prefers-reduced-motion: reduce` enabled, the banner appears instantly (no slide-in).
  - Screen reader announces the banner text politely (no assertive interruption).
- **No regression:** banner still disappears when health returns to `GOOD` or driver goes offline.
