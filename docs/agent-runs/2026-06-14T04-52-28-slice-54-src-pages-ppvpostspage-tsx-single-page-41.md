# DeepSeek run — 2026-06-14T04:52:28.238Z

- model: deepseek-chat
- task: SLICE 54 — src/pages/PPVPostsPage.tsx (single page, 417 lines, creator pay-per-view posts/unlocks page, 3 tabs: My Posts / Unlocked / Paid DMs). PREMIUM responsive interaction-token + a11y polish. CLASSNAME-ONLY + display-only aria attrs. NO logic, NO handlers, NO state, NO routing changes.

Apply the project's standing interaction-token rules to RAW <button>/<a>/<Link> only:
- active:scale-[X] press feedback (tiers: icon-only scale-95; small/pill chips [0.97]; cards [0.98]; full-width/wide-rows [0.99]).
- transition-* : use transition-all when the control ALSO has a real hover:bg-*/hover:text-*/hover:border-*/hover:opacity color fade; transition-transform for pure press-scale with no hover color. When a control already has `transition-colors` AND we add a new active:scale, FLIP `transition-colors`→`transition-all` so the transform eases alongside the hover color. A control with bare `transition` (Tailwind) needs no flip.
- focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (OUTWARD ring-ring; ring-inset ONLY if focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor).
- aria: icon-only button with no visible text and no aria-label -> ADD a concise aria-label. aria-pressed ONLY for segmented single/multi-select controls that convey selection by background, label word constant, NOT role=tab, toggleable. Do NOT add aria-expanded to dialog openers.

SKIP (already tokenized / native focus / not mine): shadcn components; presentational divs without onClick; child components (PPVPostDetail, PreviewThumb).

The 6 RAW <button> controls under review:
1. L178 Back ArrowLeft — aria-label="Back", className "p-2 -ml-2 rounded-full hover:bg-muted/50" (sticky header, neutral bg). Icon-only.
2. L190 "New" pill — VISIBLE TEXT (Plus + "New"), onClick navigate("/ppv/create"), className "h-9 px-3 rounded-full bg-rose-500 text-white text-[12px] font-extrabold flex items-center gap-1 hover:bg-rose-600 transition-colors". One-shot nav/create. Sits on neutral header bg.
3. L203 Tab bar ×3 (mine/unlocked/paid-dms) — VISIBLE TEXT (constant labels My Posts/Unlocked/Paid DMs), onClick setTab(t), className cn("flex-1 h-11 text-[13px] font-extrabold relative", tab===t ? "text-rose-500" : "text-muted-foreground"). Selection conveyed by TEXT COLOR + a framer `layoutId` underline bar (motion.div absolute bottom). NO bg change, NO hover. QUESTION: tier for a full-width flex-1 tab button? aria-pressed YES/NO given this is a tab-bar pattern (selection by color+underline, not bg)? Should we even add scale to a tab-bar button or leave it (tab bars often don't take press-scale)?
4. L271 My-posts card row ×N — VISIBLE content, onClick navigate(`/ppv?post=`), className "w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-colors". Card row, has hover:border color fade + transition-colors.
5. L359 Paid-DMs card row ×N — IDENTICAL className to #4, onClick navigate(`/chat?with=`).
6. L407 EmptyState CTA — VISIBLE TEXT (dynamic cta), onClick onCta(), className "h-11 px-5 rounded-2xl bg-rose-500 text-white text-[13px] font-extrabold hover:bg-rose-600". Has hover:bg, NO transition, NO scale. (This is a child component EmptyState, but it's in THIS file — in scope.)

Confirm per control: exact className change, transition-all vs transition-transform vs flip, scale tier, ring (outward vs inset), and any aria add/keep. Resolve the tab-bar question (#3) explicitly. Match the parity reference JobPostingDetailPage.tsx conventions. Reply concise per control.
- files: src/pages/PPVPostsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 54 — PPVPostsPage.tsx — Interaction Token + A11y Polish

## Plan

Apply the project's standing interaction-token rules to 6 RAW `<button>` controls in `src/pages/PPVPostsPage.tsx`. All changes are className-only + display-only aria attrs. No logic, handlers, state, or routing changes.

## Per-Control Analysis

### 1. L178 Back ArrowLeft (icon-only)
- **Current:** `"p-2 -ml-2 rounded-full hover:bg-muted/50"` — has `hover:bg`, NO transition, NO scale, NO ring
- **Has hover color?** YES → `transition-all` (FRESH, not a flip)
- **Scale tier:** icon-only → `active:scale-95`
- **Ring:** outward `ring-ring` (neutral bg, not overflow-hidden)
- **Aria:** KEEP existing `aria-label="Back"`
- **Final:** `"p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### 2. L190 "New" pill (visible text)
- **Current:** `"h-9 px-3 rounded-full bg-rose-500 text-white text-[12px] font-extrabold flex items-center gap-1 hover:bg-rose-600 transition-colors"` — has `hover:bg` + `transition-colors`
- **Has hover color?** YES → FLIP `transition-colors`→`transition-all` (gaining a new scale)
- **Scale tier:** small pill → `active:scale-[0.97]`
- **Ring:** outward `ring-ring` (neutral header bg, not overflow-hidden)
- **Aria:** visible text "New" → NO aria-label needed; one-shot nav → NO aria-pressed
- **Final:** `"h-9 px-3 rounded-full bg-rose-500 text-white text-[12px] font-extrabold flex items-center gap-1 hover:bg-rose-600 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### 3. L203 Tab bar ×3 (visible text, selection by color+underline)
- **Current:** `cn("flex-1 h-11 text-[13px] font-extrabold relative", tab === t ? "text-rose-500" : "text-muted-foreground")` — NO hover, NO bg change, NO transition, NO scale, NO ring
- **Has hover color?** NO (no `hover:*` class) → `transition-transform` (pure press-scale, no color fade)
- **Scale tier:** full-width flex-1 tab → `active:scale-[0.99]`
- **Ring:** outward `ring-ring` (neutral header bg, not overflow-hidden)
- **Aria:** visible text → NO aria-label needed
- **aria-pressed?** **NO.** This is a tab-bar pattern where selection is conveyed by text color + a framer `layoutId` underline bar. The `aria-pressed` rule applies to segmented single/multi-select controls that convey selection by **background**. Here selection is by **text color + underline**, and the control is a navigation-style tab (not a toggle). Adding `aria-pressed` would mislead SR into treating it as a persistent toggle. The correct ARIA would be `role="tab"` + `aria-selected`, but we are not adding roles in this minimal pass. Leave as-is.
- **Should we add scale to a tab-bar button?** **YES.** The parity reference `JobPostingDetailPage.tsx` applies `active:scale-[0.99]` to its full-width owner control button. Tab bars commonly take press-scale in modern UIs (iOS, Material Design). The scale is subtle (`[0.99]`) and reduced-motion-safe.
- **Final:** `cn("flex-1 h-11 text-[13px] font-extrabold relative transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === t ? "text-rose-500" : "text-muted-foreground")`

### 4. L271 My-posts card row ×N (visible content, card row)
- **Current:** `"w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-colors"` — has `hover:border` + `transition-colors`
- **Has hover color?** YES → FLIP `transition-colors`→`transition-all` (gaining a new scale)
- **Scale tier:** card row → `active:scale-[0.98]`
- **Ring:** outward `ring-ring` (card surface `bg-card`, not overflow-hidden)
- **Aria:** visible content → NO aria-label needed; one-shot nav → NO aria-pressed
- **Final:** `"w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### 5. L359 Paid-DMs card row ×N (identical to #4)
- **Current:** `"w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-colors"` — identical to #4
- **Same treatment as #4:** FLIP `transition-colors`→`transition-all` + `active:scale-[0.98]` + outward ring
- **Final:** `"w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### 6. L407 EmptyState CTA (visible text, child component)
- **Current:** `"h-11 px-5 rounded-2xl bg-rose-500 text-white text-[13px] font-extrabold hover:bg-rose-600"` — has `hover:bg`, NO transition, NO scale, NO ring
- **Has hover color?** YES → `transition-all` (FRESH, not a flip)
- **Scale tier:** full-width button → `active:scale-[0.99]`
- **Ring:** outward `ring-ring` (neutral page bg, not overflow-hidden)
- **Aria:** visible text (dynamic `cta`) → NO aria-label needed; one-shot nav → NO aria-pressed
- **Final:** `"h-11 px-5 rounded-2xl bg-rose-500 text-white text-[13px] font-extrabold hover:bg-rose-600 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

## Diff

```diff
--- a/src/pages/PPVPostsPage.tsx
+++ b/src/pages/PPVPostsPage.tsx
@@ -175,7 +175,7 @@ export default function PPVPostsPage() {
           <button
             type="button"
             onClick={() => navigate("/creator-dashboard")}
             aria-label="Back"
-            className="p-2 -ml-2 rounded-full hover:bg-muted/50"
+            className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <ArrowLeft className="h-5 w-5" />
           </button>
@@ -187,7 +187,7 @@ export default function PPVPostsPage() {
           <button
             type="button"
             onClick={() => navigate("/ppv/create")}
-            className="h-9 px-3 rounded-full bg-rose-500 text-white text-[12px] font-extrabold flex items-center gap-1 hover:bg-rose-600 transition-colors"
+            className="h-9 px-3 rounded-full bg-rose-500 text-white text-[12px] font-extrabold flex items-center gap-1 hover:bg-rose-600 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <Plus className="h-3.5 w-3.5" />
             New
@@ -201,7 +201,7 @@ export default function PPVPostsPage() {
               key={t}
               type="button"
               onClick={() => setTab(t)}
-              className={cn(
-                "flex-1 h-11 text-[13px] font-extrabold relative",
-                tab === t ? "text-rose-500" : "text-muted-foreground"
-              )}
+              className={cn(
+                "flex-1 h-11 text-[13px] font-extrabold relative transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
+                tab === t ? "text-rose-500" : "text-muted-foreground"
+              )}
             >
               {t === "mine" ? "My Posts" : t === "unlocked" ? "Unlocked" : "Paid DMs"}
               {tab === t && (
@@ -268,7 +268,7 @@ export default function PPVPostsPage() {
             <button
               key={post.id}
               type="button"
               onClick={() => navigate(`/ppv?post=${post.id}`)}
-              className="w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-colors"
+              className="w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                 <PreviewThumb path={post.preview_path || post.media_paths[0] || null} />
@@ -356,7 +356,7 @@ export default function PPVPostsPage() {
               <button
                 key={u.id}
                 type="button"
                 onClick={() => navigate(`/chat?with=${u.creator_id}`)}
-                className="w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-colors"
+                className="w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <div className="h-12 w-12 rounded-full bg-muted overflow-hidden shrink-0">
                   {profile?.avatar_url ? (
@@ -404,7 +404,7 @@ function EmptyState({
       <button
         type="button"
         onClick={onCta}
-        className="h-11 px-5 rounded-2xl bg-rose-500 text-white text-[13px] font-extrabold hover:bg-rose-600"
+        className="h-11 px-5 rounded-2xl bg-rose-500 text-white text-[13px] font-extrabold hover:bg-rose-600 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
       >
         {cta}
       </button>
```

## Summary

| # | Control | Scale | Transition | Ring | Aria |
|---|---------|-------|------------|------|------|
| 1 | Back ArrowLeft | `active:scale-95` | FRESH `transition-all` | outward | KEEP `aria-label="Back"` |
| 2 | "New" pill | `active:scale-[0.97]` | FLIP `transition-colors`→`transition-all` | outward | none needed |
| 3 | Tab bar ×3 | `active:scale-[0.99]` | FRESH `transition-transform` | outward | NO `aria-pressed` (selection by color+underline, not bg) |
| 4 | My-posts card row | `active:scale-[0.98]` | FLIP `transition-colors`→`transition-all` | outward | none needed |
| 5 | Paid-DMs card row | `active:scale-[0.98]` | FLIP `transition-colors`→`transition-all` | outward | none needed |
| 6 | EmptyState CTA | `active:scale-[0.99]` | FRESH `transition-all` | outward | none needed |

**Diff stats:** 6 className edits, 0 logic lines touched, 0 new aria attrs (1 KEPT), 0 `aria-pressed` added.

## Verification

Run `npm run update` to confirm type-check + worker type-check + production build pass before marking done.
