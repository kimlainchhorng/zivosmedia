# MiMo run — 2026-06-14T08:14:54.579Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y zero visual change. File imports NO framer-motion and NO useTranslation so plain Back and plain Refresh. There are NO motion.div so NO useReducedMotion and NO reduced-motion JS guards. One CSS animation animate-pulse on the Navigation icon in the location-loading row APPEND the Tailwind variant motion-reduce animate-none KEEP animate-pulse and add aria-hidden true. Two icon-only ghost Buttons. The header back Button onClick goBack gets aria-label Back its ArrowLeft aria-hidden true. The header refresh Button onClick refetch gets aria-label Refresh its RefreshCw aria-hidden true. aria-hidden true on decorative icons the location-row Navigation already covered the empty-state MapPin beside No ride requests the pickup MapPin beside the pickup address the destination MapPin beside the dest address all ornamental or beside visible text. The Accept button has visible text no aria-label. HEADING single h1 Ride Requests no other headings so NO heading change. Confirm or correct. List exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Requests.tsx

---

## Plan

9 additive edits, zero logic. File confirmed: no framer-motion, no useTranslation, no motion.div, no useReducedMotion needed. Single CSS animation (`animate-pulse`) gets a `motion-reduce:` variant. Two ghost icon Buttons get `aria-label`. Five decorative icons get `aria-hidden="true"`. No heading changes. Accept button has visible text — no label needed.

---

## Proposed diff

**File:** `src/pages/driver/Requests.tsx`

```diff
--- a/src/pages/driver/Requests.tsx
+++ b/src/pages/driver/Requests.tsx
@@ -86,9 +86,11 @@
             <Button
               variant="ghost"
               size="icon"
               onClick={goBack}
+              aria-label="Back"
             >
-              <ArrowLeft className="h-5 w-5" />
+              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
             </Button>
             <div>
               <h1 className="text-lg font-semibold">Ride Requests</h1>
@@ -100,9 +102,11 @@
           <Button
             variant="ghost"
             size="icon"
             onClick={() => refetch()}
+            aria-label="Refresh"
           >
-            <RefreshCw className="h-5 w-5" />
+            <RefreshCw className="h-5 w-5" aria-hidden="true" />
           </Button>
         </div>
       </header>
@@ -113,7 +117,7 @@
         {locationLoading && (
           <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
-            <Navigation className="h-4 w-4 animate-pulse" />
+            <Navigation className="h-4 w-4 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
             <span>Getting your location...</span>
           </div>
         )}
@@ -132,7 +136,7 @@
         {sortedRides.length === 0 && isDriverOnline && (
           <div className="text-center py-12">
-            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
+            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
             <p className="text-muted-foreground">No ride requests available</p>
             <p className="text-xs text-muted-foreground mt-1">
               Pull down to refresh or wait for new requests
@@ -172,7 +176,7 @@
                   {/* Pickup Address */}
                   <div className="flex items-start gap-2 text-muted-foreground mb-2">
-                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-success" />
+                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-success" aria-hidden="true" />
                     <span className="text-sm line-clamp-2">
                       {ride.pickup_text || "Pickup location"}
@@ -182,7 +186,7 @@
                   {ride.dest_text && (
                     <div className="flex items-start gap-2 text-muted-foreground">
-                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive" />
+                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive" aria-hidden="true" />
                       <span className="text-sm line-clamp-2">
                         {ride.dest_text}
```

---

## Edit summary

| # | Location | Edit |
|---|----------|------|
| 1 | Header Back `<Button>` | Add `aria-label="Back"` |
| 2 | Header Back `<ArrowLeft>` | Add `aria-hidden="true"` |
| 3 | Header Refresh `<Button>` | Add `aria-label="Refresh"` |
| 4 | Header Refresh `<RefreshCw>` | Add `aria-hidden="true"` |
| 5 | Location-loading `<Navigation>` | Append `motion-reduce:animate-none` to class, add `aria-hidden="true"` |
| 6 | Empty-state `<MapPin>` | Add `aria-hidden="true"` |
| 7 | Pickup `<MapPin>` | Add `aria-hidden="true"` |
| 8 | Destination `<MapPin>` | Add `aria-hidden="true"` |

**Total: 8 attribute additions across 8 locations, 0 logic lines touched.**

---

## Owner verification

- **Visual:** zero change. `aria-hidden` and `aria-label` are invisible to sighted users. `motion-reduce:animate-none` only fires under `prefers-reduced-motion` (the `animate-pulse` remains unchanged for all other users).
- **Build gate:** `npm run update` from the zivodriver repo root (or the appropriate verify command for that project). These are plain HTML attributes + one Tailwind variant — no import changes, no type risk.
