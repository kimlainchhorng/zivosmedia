# MiMo run — 2026-06-14T11:30:56.297Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only. This file OrderHistory.tsx is bilingual via an isCambodia boolean switching visible copy between English and Khmer. Add useReducedMotion from framer-motion as var reduceMotion after const navigate. The order list uses a motion.button inside AnimatePresence with initial opacity 0 y 8 and transition delay i times 0.03 and NO exit prop. Guard the whole initial object with reduceMotion ternary to false and set the transition delay to reduceMotion ? 0 : i times 0.03. There is no exit prop and no perpetual loop. Add aria-hidden true to decorative icons: the order type icon Package or Car in each row, the two MapPin pickup and dropoff icons, the Star rating icons, the ChevronRight chevron, and the empty state Package. The header back button is an icon-only ghost Button with size icon containing only an ArrowLeft and no visible text so add a bilingual aria-label using isCambodia ternary Khmer for back English Back and aria-hidden its ArrowLeft. Do not add aria-label to controls with visible text such as the TabsTriggers or the order buttons which contain address and status text only aria-hidden their inner icons. The status badges from getStatusBadge are shadcn Badge with visible text leave them. Do NOT touch the shadcn Skeleton component it is a primitive. There is no raw heading skip the only raw heading is the h1. Do not change logic or layout.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/customer/OrderHistory.tsx

---

## Plan

1. **Import `useReducedMotion`** from `framer-motion` (already imported).
2. **Declare `const reduceMotion = useReducedMotion();`** right after `const navigate`.
3. **Guard the `motion.button`** — `initial` becomes `reduceMotion ? false : { opacity: 0, y: 8 }`; `transition.delay` becomes `reduceMotion ? 0 : i * 0.03`. No `exit` prop exists (none added). No perpetual loop.
4. **`aria-hidden="true"`** on 7 decorative icons: the two order-type icons (Package, Car), the two MapPins, each Star, the ChevronRight, and the empty-state Package.
5. **`aria-label`** on the back `<Button>` using the `isCambodia` ternary; **`aria-hidden="true"`** on its child ArrowLeft.
6. **Nothing else touched** — no logic, no layout, no Skeleton, no TabsTriggers, no order buttons.

---

## Proposed diff — `src/pages/customer/OrderHistory.tsx`

```diff
--- a/src/pages/customer/OrderHistory.tsx
+++ b/src/pages/customer/OrderHistory.tsx
@@ -51,6 +51,7 @@
 export default function OrderHistory() {
   const navigate = useNavigate();
+  const reduceMotion = useReducedMotion();
   const goBack = useGoBack();
   const { user } = useAuth();
   const isCambodia = useIsCambodia();
@@ -79,7 +80,11 @@
       {/* Header */}
       <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/30 px-4 py-3 pt-[calc(env(safe-area-inset-top)+4px)]">
         <div className="flex items-center gap-3">
-          <Button variant="ghost" size="icon" onClick={goBack}>
-            <ArrowLeft className="w-5 h-5" />
+          <Button variant="ghost" size="icon" onClick={goBack} aria-label={isCambodia ? "ត្រឡប់ក្រោយ" : "Back"}>
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
           <div>
@@ -101,7 +106,7 @@
           Array.from({ length: 5 }).map((_, i) => (
             <Skeleton key={i} className="h-24 w-full rounded-xl" />
           ))
         ) : filtered.length === 0 ? (
           <div className="text-center py-16">
-            <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
+            <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" aria-hidden="true" />
             <p className="text-muted-foreground">{isCambodia ? "មិនមានការបញ្ជាទិញ" : "No orders yet"}</p>
@@ -113,8 +118,8 @@
               <motion.button
                 key={order.id}
-                initial={{ opacity: 0, y: 8 }}
+                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                 animate={{ opacity: 1, y: 0 }}
-                transition={{ delay: i * 0.03 }}
+                transition={{ delay: reduceMotion ? 0 : i * 0.03 }}
                 onClick={() => navigate(`/tracking/${order.id}?type=${order.service_type || "trip"}`)}
                 className="w-full text-left p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm hover:bg-accent/30 transition-colors"
@@ -125,9 +130,9 @@
                     <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                       {order.service_type === "delivery" || order.service_type === "food"
-                        ? <Package className="w-4 h-4 text-primary" />
-                        : <Car className="w-4 h-4 text-primary" />}
+                        ? <Package className="w-4 h-4 text-primary" aria-hidden="true" />
+                        : <Car className="w-4 h-4 text-primary" aria-hidden="true" />}
                     </div>
                     <div className="flex-1 min-w-0">
@@ -141,12 +146,12 @@
                       {order.pickup_address && (
                         <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
-                          <MapPin className="w-3 h-3 shrink-0" />
+                          <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                           {order.pickup_address}
                         </p>
                       )}
                       {order.dropoff_address && (
                         <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
-                          <MapPin className="w-3 h-3 shrink-0 text-success" />
+                          <MapPin className="w-3 h-3 shrink-0 text-success" aria-hidden="true" />
                           {order.dropoff_address}
                         </p>
@@ -156,7 +161,7 @@
                       {order.rating && (
                         <div className="flex items-center gap-1 mt-1">
                           {Array.from({ length: order.rating }).map((_, j) => (
-                            <Star key={j} className="w-3 h-3 fill-warning text-warning" />
+                            <Star key={j} className="w-3 h-3 fill-warning text-warning" aria-hidden="true" />
                           ))}
                         </div>
@@ -166,7 +171,7 @@
                   <div className="text-right shrink-0 ml-2">
                     <p className="text-sm font-semibold">
                       {order.fare_amount ? formatCurrency(order.fare_amount, isCambodia) : "—"}
                     </p>
-                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto mt-1" />
+                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto mt-1" aria-hidden="true" />
                   </div>
                 </div>
```

### Summary of every change (line-level)

| # | Location | Change |
|---|----------|--------|
| 1 | L52 (after `const navigate`) | **+** `const reduceMotion = useReducedMotion();` |
| 2 | L82 `<Button>` back | **+** `aria-label={isCambodia ? "ត្រឡប់ក្រោយ" : "Back"}` |
| 3 | L83 `<ArrowLeft>` inside back Button | **+** `aria-hidden="true"` |
| 4 | L108 empty-state `<Package>` | **+** `aria-hidden="true"` |
| 5 | L118 `motion.button` `initial` | `{ opacity: 0, y: 8 }` → `reduceMotion ? false : { opacity: 0, y: 8 }` |
| 6 | L119 `motion.button` `transition` delay | `i * 0.03` → `reduceMotion ? 0 : i * 0.03` |
| 7 | L130 order-type `<Package>` | **+** `aria-hidden="true"` |
| 8 | L131 order-type `<Car>` | **+** `aria-hidden="true"` |
| 9 | L149 pickup `<MapPin>` | **+** `aria-hidden="true"` |
| 10 | L155 dropoff `<MapPin>` | **+** `aria-hidden="true"` |
| 11 | L161 rating `<Star>` | **+** `aria-hidden="true"` |
| 12 | L171 `<ChevronRight>` | **+** `aria-hidden="true"` |

**Zero logic lines touched. Zero layout changes. Zero Skeleton/Tab edits. No `exit` prop. No perpetual loop.**

---

## Owner verification

1. **Run `npm run update`** — must exit 0 (type-check + worker type-check + production build).
2. **Visual spot-check** at 375 / 768 — no layout shift (aria-hidden and aria-label are metadata-only; `reduceMotion ? false` is a documented framer-motion shorthand that skips the initial animation entirely when reduced motion is preferred).
3. **Reduced-motion test**: enable "Reduce motion" in OS settings → order cards should appear instantly (no fade/slide). Disable → staggered fade-in returns.
4. **Screen reader test** (optional): the back button should announce "Back" (English) or "ត្រឡប់ក្រោយ" (Khmer); decorative icons should be silent.
