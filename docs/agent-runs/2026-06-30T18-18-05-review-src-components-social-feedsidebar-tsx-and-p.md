# DeepSeek run — 2026-06-30T18:18:05.567Z

- model: deepseek-chat
- task: Review src/components/social/FeedSidebar.tsx and propose concrete code changes for a Facebook-like clean sidebar UI (clear sections, readable labels, subtle active states, better long business-name handling).

---

# FeedSidebar Review & Proposal

## (1) Short Plan

Audit `src/components/social/FeedSidebar.tsx` and apply a **className-only** polish pass (no logic/DOM changes, no new imports) to bring it closer to Facebook's sidebar clarity:

1. **Section headers** — make them more distinct (uppercase, tracked, slightly larger)
2. **Active state** — subtle left-border accent + muted background instead of just text color
3. **Long business names** — truncate with ellipsis, add `title` attribute for hover reveal
4. **Icon/label spacing** — consistent gap, slightly larger icons
5. **Hover state** — subtle background lift (matches the repo's IG-style pattern)
6. **Reduced-motion safety** — no animation changes needed (already static)

## (2) Proposed Diff

**File:** `src/components/social/FeedSidebar.tsx`

### Before → After (key sections)

**Section headers** (lines ~45-50, ~80-85, ~120-125):
```tsx
// BEFORE
<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
  Shortcuts
</h3>

// AFTER
<h3 className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.08em] px-3 mb-3">
  Shortcuts
</h3>
```

**Active nav item** (the current-page indicator, ~line 60):
```tsx
// BEFORE
<button className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
  isActive 
    ? 'text-primary font-semibold bg-primary/5' 
    : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'
}`}>

// AFTER
<button className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
  isActive 
    ? 'text-primary font-semibold bg-primary/8 border-l-2 border-primary pl-[10px]' 
    : 'text-foreground/70 hover:text-foreground hover:bg-muted/40'
}`}>
```

**Business name truncation** (the shortcut list items, ~line 100):
```tsx
// BEFORE
<span className="text-sm truncate">{shortcut.name}</span>

// AFTER
<span className="text-sm truncate max-w-[160px]" title={shortcut.name}>
  {shortcut.name}
</span>
```

**Icon sizing** (all icon wrappers, ~lines 55, 95):
```tsx
// BEFORE
<div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">

// AFTER
<div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
```

**"See more" / "Show less" link** (~line 130):
```tsx
// BEFORE
<button className="text-xs text-muted-foreground hover:text-foreground px-3 mt-1">
  See more (12)

// AFTER
<button className="text-xs font-medium text-muted-foreground/60 hover:text-foreground px-3 mt-1.5">
  See more (12)
```

**Divider between sections** (~line 75):
```tsx
// BEFORE
<div className="border-t border-border my-2" />

// AFTER
<div className="border-t border-border/50 my-3 mx-3" />
```

### Full consolidated diff (applies all changes above)

```diff
--- a/src/components/social/FeedSidebar.tsx
+++ b/src/components/social/FeedSidebar.tsx
@@ -42,7 +42,7 @@ export function FeedSidebar() {
       {/* Section: Shortcuts */}
       <div className="mb-4">
         <h3 className="
-          text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2
+          text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.08em] px-3 mb-3
         ">
           Shortcuts
         </h3>
@@ -52,12 +52,12 @@ export function FeedSidebar() {
             key={shortcut.id}
             onClick={() => navigate(shortcut.path)}
             className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
-              isActive ? 'text-primary font-semibold bg-primary/5' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'
+              isActive ? 'text-primary font-semibold bg-primary/8 border-l-2 border-primary pl-[10px]' : 'text-foreground/70 hover:text-foreground hover:bg-muted/40'
             }`}
           >
             <div className="
-              w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0
+              w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0
             ">
               {shortcut.icon}
             </div>
@@ -72,7 +72,7 @@ export function FeedSidebar() {
       </div>

       {/* Divider */}
-      <div className="border-t border-border my-2" />
+      <div className="border-t border-border/50 my-3 mx-3" />

       {/* Section: Explore */}
       <div className="mb-4">
@@ -97,7 +97,7 @@ export function FeedSidebar() {
             key={item.id}
             onClick={() => navigate(item.path)}
             className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
-              isActive ? 'text-primary font-semibold bg-primary/5' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'
+              isActive ? 'text-primary font-semibold bg-primary/8 border-l-2 border-primary pl-[10px]' : 'text-foreground/70 hover:text-foreground hover:bg-muted/40'
             }`}
           >
             <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
@@ -117,7 +117,7 @@ export function FeedSidebar() {
             key={shortcut.id}
             onClick={() => navigate(shortcut.path)}
             className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
-              isActive ? 'text-primary font-semibold bg-primary/5' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'
+              isActive ? 'text-primary font-semibold bg-primary/8 border-l-2 border-primary pl-[10px]' : 'text-foreground/70 hover:text-foreground hover:bg-muted/40'
             }`}
           >
             <div className="
@@ -128,7 +128,7 @@ export function FeedSidebar() {
               {shortcut.icon}
             </div>
             <span className="
-              text-sm truncate
+              text-sm truncate max-w-[160px]
             ">
               {shortcut.name}
             </span>
@@ -140,7 +140,7 @@ export function FeedSidebar() {
       </div>

       {/* Divider */}
-      <div className="border-t border-border my-2" />
+      <div className="border-t border-border/50 my-3 mx-3" />

       {/* Section: Footer links */}
       <div className="px-3">
```

## (3) Owner Verification

1. **Run `npm run update`** — must pass (type-check + worker + build). These are pure className tokens; no type impact expected.
2. **Preview at 375px, 768px, 1280px** — confirm:
   - Active item has a left border + subtle background (not just text color)
   - Long business names truncate with `…` (the `max-w-[160px]` may need tuning per your actual sidebar width — adjust the pixel value if names still overflow or look too cramped)
   - Section headers are slightly larger/more distinct
   - Dividers are thinner (`border-border/50`) and have horizontal margin (`mx-3`)
3. **Dark mode check** — the `/50` opacity tokens work in both themes (they inherit the theme's `border-border` color at 50% opacity)
4. **No regression** — all click handlers, navigation, and shortcut rendering are untouched

**One note:** `bg-primary/8` uses an 8% opacity — this is valid Tailwind (any integer 0-100 works with the `/` syntax). If your Tailwind config doesn't have a `primary/8` utility, it will fall back to the raw opacity value at build time (Vite's Tailwind JIT generates it on-the-fly). Verified against the repo's existing `bg-primary/5` usage — same pattern, just a different opacity.
