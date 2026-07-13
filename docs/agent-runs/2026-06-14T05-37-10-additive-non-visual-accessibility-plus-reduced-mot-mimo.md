# MiMo run — 2026-06-14T05:37:10.779Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. ConnectionHealthBanner MOUNTED on /map returns null unless online and connectionHealth degraded. POOR: Wifi icon + 'Weak Signal...'. DISCONNECTED: WifiOff icon + 'No Connection...'. framer-motion div initial opacity 0 y -20, AnimatePresence with exit. Questions: (1) aria-hidden true on Wifi/WifiOff icons? (2) Guard y -20 entrance with useReducedMotion (initial becomes false), leave exit? (3) Live region: DISCONNECTED role=alert assertive vs POOR role=status polite, or both polite for consistency? Recommend clearly. Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/ConnectionHealthBanner.tsx

---

## Verdict

**(1) `aria-hidden="true"` on both icons — YES.**
The icons are purely decorative; the adjacent `<span>` already conveys the full message. Screen readers should not redundantly announce "wifi off icon" before "No Connection…".

**(2) Guard `y: -20` with `useReducedMotion` — YES, guard BOTH entrance and exit.**
When reduced motion is preferred: initial → `{ opacity: 0 }`, animate → `{ opacity: 1 }`, exit → `{ opacity: 0 }` (fade only, no vertical slide). There is no reason to leave the exit unguarded — the same motion sensitivity applies.

**(3) Live regions — different roles matching severity.**
- **DISCONNECTED** → `role="alert"` (assertive). The driver has *no connection*; this is urgent and must interrupt.
- **POOR** → `role="status"` (polite). Weak signal is informational; the driver is still online. Polite announcement is sufficient.

Using both polite "for consistency" would under-sell the disconnection emergency. Match the semantics to the severity.

---

## Proposed diff

**File:** `../zivodriver/src/components/ConnectionHealthBanner.tsx`

```diff
--- a/src/components/ConnectionHealthBanner.tsx
+++ b/src/components/ConnectionHealthBanner.tsx
@@ -1,10 +1,10 @@
 /**
  * Connection Health Banner
  * Displays when location heartbeat fails repeatedly
  * - Yellow for POOR (3+ failures)
  * - Red for DISCONNECTED (10+ failures)
  */
 
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
-        animate={{ opacity: 1, y: 0 }}
-        exit={{ opacity: 0, y: -20 }}
+        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
+        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
+        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
         transition={{ duration: 0.2 }}
         className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium ${
           isDisconnected ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"
         }`}
+        role={isDisconnected ? "alert" : "status"}
+        aria-live={isDisconnected ? "assertive" : "polite"}
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
               ? "No Connection. Check your internet."
               : "Weak Signal. Location updates may be delayed."}
           </span>
         </div>
       </motion.div>
     </AnimatePresence>
   );
 }
```

### Summary of changes (5 touch points, zero logic/copy/layout change)

| # | Change | Why |
|---|--------|-----|
| 1 | `import { useReducedMotion }` + `const prefersReducedMotion` | Reduced-motion guard |
| 2 | `initial` / `animate` / `exit` are conditional on `prefersReducedMotion` | Fade-only when reduced motion preferred; full slide+fade otherwise |
| 3 | `role={isDisconnected ? "alert" : "status"}` + matching `aria-live` | DISCONNECTED = assertive interrupt; POOR = polite status |
| 4 | `aria-hidden="true"` on both `<WifiOff>` and `<Wifi>` | Decorative icons; text is the accessible name |
| 5 | *(No other changes)* | className, copy, routing, store logic untouched |

### Owner verification

- `npm run update` in the **zivodriver** repo (this file lives there, not in the ZIVO monorepo).
- Test with screen reader: DISCONNECTED state should interrupt with an assertive announcement; POOR state should announce politely without interrupting.
- Test with `prefers-reduced-motion: reduce` in browser devtools: banner should fade in/out with no vertical slide.
