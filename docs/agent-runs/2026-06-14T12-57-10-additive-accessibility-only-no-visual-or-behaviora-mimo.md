# MiMo run — 2026-06-14T12:57:10.453Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility only, no visual or behavioral change. This is an English only React TSX page with NO framer motion. One, the icon only header back button is a ghost icon Button containing an ArrowLeft icon and no visible text, add aria-label Back to the Button and aria-hidden true on the ArrowLeft. Two, the icon only refresh button is an outline Button containing only a RefreshCw icon and no visible text, add aria-label Refresh to the Button and aria-hidden true on the RefreshCw. Three, add aria-hidden true to all decorative lucide icons including the Package Users and Activity tab icons, the two Loader2 spinners, and the empty state Package. Four, for every CSS animation utility class add a reduced motion guard, specifically the pulse dot div with animate-pulse gets motion-reduce colon animate-none appended to its className, and every animate-spin gets motion-reduce colon animate-none appended. Do not change any copy or layout or logic. Report the exact edits.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/merchant/Dispatch.tsx

---

## Plan

Nine edits in `src/pages/merchant/Dispatch.tsx`, all additive attribute-only:

1. **Back Button** — add `aria-label="Back"` to the `<Button>`, add `aria-hidden="true"` to `<ArrowLeft>`.
2. **Refresh Button** — add `aria-label="Refresh"` to the `<Button>`, add `aria-hidden="true"` to `<RefreshCw>`.
3. **3 tab icons** — add `aria-hidden="true"` to `<Package>`, `<Users>`, `<Activity>` inside `<TabsTrigger>`s.
4. **2 Loader2 spinners** — add `aria-hidden="true"` + `motion-reduce:animate-none` to each.
5. **Empty-state Package** — add `aria-hidden="true"`.
6. **animate-pulse dot** — append `motion-reduce:animate-none`.
7. **RefreshCw animate-spin** — append `motion-reduce:animate-none` inside the conditional.

No copy, layout, or logic changes.

---

## Diff — `src/pages/merchant/Dispatch.tsx`

```diff
--- a/src/pages/merchant/Dispatch.tsx
+++ b/src/pages/merchant/Dispatch.tsx
@@ -76,8 +76,9 @@
           <Button
             variant="ghost"
             size="icon"
             onClick={() => navigate(-1)}
             className="h-8 w-8"
+            aria-label="Back"
           >
-            <ArrowLeft className="h-4 w-4" />
+            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
           </Button>
```

```diff
@@ -91,1 +92,1 @@
-            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
+            <div className="w-2 h-2 rounded-full bg-primary animate-pulse motion-reduce:animate-none" />
```

```diff
@@ -97,8 +98,9 @@
           <Button
             variant="outline"
             size="sm"
             onClick={handleRefresh}
             disabled={isLoading}
+            aria-label="Refresh"
           >
-            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
+            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
           </Button>
```

```diff
@@ -117,1 +119,1 @@
-                <Package className="h-3.5 w-3.5" />
+                <Package className="h-3.5 w-3.5" aria-hidden="true" />
```

```diff
@@ -121,1 +123,1 @@
-                <Users className="h-3.5 w-3.5" />
+                <Users className="h-3.5 w-3.5" aria-hidden="true" />
```

```diff
@@ -125,1 +127,1 @@
-                <Activity className="h-3.5 w-3.5" />
+                <Activity className="h-3.5 w-3.5" aria-hidden="true" />
```

```diff
@@ -131,1 +133,1 @@
-                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
+                  <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none text-muted-foreground" aria-hidden="true" />
```

```diff
@@ -137,1 +139,1 @@
-                  <Package className="h-10 w-10 text-muted-foreground mb-3" />
+                  <Package className="h-10 w-10 text-muted-foreground mb-3" aria-hidden="true" />
```

```diff
@@ -209,1 +211,1 @@
-                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
+                      <Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" />
```

---

## Edit summary table

| # | Element | Edit | Why |
|---|---------|------|-----|
| 1 | `<Button variant="ghost" …>` (back) | +`aria-label="Back"` | Icon-only button needs accessible name |
| 2 | `<ArrowLeft>` | +`aria-hidden="true"` | Decorative; label is on parent Button |
| 3 | pulse `<div>` | +`motion-reduce:animate-none` | Reduced-motion guard on `animate-pulse` |
| 4 | `<Button variant="outline" …>` (refresh) | +`aria-label="Refresh"` | Icon-only button needs accessible name |
| 5 | `<RefreshCw>` | +`aria-hidden="true"` + `motion-reduce:animate-none` in spin branch | Decorative icon; reduced-motion guard on `animate-spin` |
| 6 | `<Package>` (tab icon) | +`aria-hidden="true"` | Decorative alongside visible "Orders" label |
| 7 | `<Users>` (tab icon) | +`aria-hidden="true"` | Decorative alongside visible "Drivers" label |
| 8 | `<Activity>` (tab icon) | +`aria-hidden="true"` | Decorative alongside visible "Activity" label |
| 9 | `<Loader2>` (orders spinner) | +`aria-hidden="true"` + `motion-reduce:animate-none` | Decorative spinner; reduced-motion guard |
| 10 | `<Package>` (empty state) | +`aria-hidden="true"` | Decorative alongside "No active orders" text |
| 11 | `<Loader2>` (assign spinner) | +`aria-hidden="true"` + `motion-reduce:animate-none` | Decorative spinner; reduced-motion guard |

## Owner verification

- Run `npx tsc --noEmit` (or `npm run type-check`) — all changes are JSX attributes, no type risk.
- Tab through the header: the Back and Refresh buttons should announce "Back" and "Refresh" in screen readers; ArrowLeft/RefreshCw should not be read twice.
- `prefers-reduced-motion`: the pulse dot and all spinners should stop animating.
- Visual output is unchanged — `aria-hidden` and `aria-label` are invisible; `motion-reduce:animate-none` only activates under the user's OS-level reduced-motion preference.
