# DeepSeek run — 2026-06-14T01:54:35.259Z

- model: deepseek-chat
- task: SLICE 29 — CollabsPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props (do NOT add/remove whileTap). If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it for the owner.

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for pure icon-scale with no hover color. If transition-all already present, just append (DON'T-CHURN). If a raw control has transition-colors AND a hover color AND we are adding active:scale, FLIP transition-colors -> transition-all. If a raw control has an EXISTING valid active treatment (active:scale OR active:opacity), KEEP it (DON'T renumber/convert).
- framer-motion: a motion.button WITH whileTap -> CSS active:scale is DEAD (framer's inline transform overrides it) -> add focus RING ONLY, do NOT add active:scale, KEEP whileTap. If such a motion.button has transition-colors + hover color, KEEP transition-colors (do NOT flip to transition-all — transition:transform would fight whileTap's inline transform -> jitter; NotificationsPage/PlacesPage motion.button precedent).
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens.
- ring-inset KEY CSS FACT: overflow-hidden clips an element's DESCENDANTS, NOT its OWN box-shadow/ring. So a button that is ITSELF overflow-hidden does NOT clip its own outward ring. ring-inset is only needed when the focusable control sits FLUSH/a few px INSIDE a SEPARATE overflow-hidden rounded ancestor. A control with ample padding clearance (e.g. p-3/p-4) inside the container does NOT need ring-inset.
- Toggle/segmented controls whose pressed-state is conveyed ONLY by background get aria-pressed (display-only). Controls with visible text get their accessible name from text (no aria-label); icon-only controls need aria-label.

PAGE: src/pages/CollabsPage.tsx (361 lines, /collabs, useAuth, SwipeBackContainer). "Collabs" = co-author invites you've been tagged on. Backed by post_collaborators (+ user_posts + profiles joins). pending/accepted/declined tabs over a list; each row = a media thumbnail button + author/caption + (if pending) Accept/Decline action buttons, else a ChevronRight view button. updateMutation flips status.

SKIP (confirm): Back shadcn <Button aria-label="Back" variant="ghost" size="icon"> L191 (ships tokens, labeled); all presentational motion.div (hero L204, row wrapper L275 — no onClick); the <Avatar>/<AvatarImage>/<AvatarFallback> L303 (not a button); img/video/span/p; skeleton/empty-state divs.

FIVE controls:

(A) Tabs (pending/accepted/declined), L223-238 — RAW <button type="button">, .map over TABS, onClick={() => setTab(t.key)}. cn() base = "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5" + (tab === t.key ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"). transition-all ALREADY. Selection conveyed ONLY by bg. Visible label {t.label} ("Pending"/"Accepted"/"Declined", CONSTANT per button) + a separate count <span>{counts[t.key]}</span>. Parent `flex gap-2 overflow-x-auto scrollbar-hide`.
Q-A: append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` into the cn base (after gap-1.5) + add `aria-pressed={tab === t.key}` (segmented-pill-tab tier [0.97]; DON'T-CHURN transition-all; selection-by-bg-only -> aria-pressed; the count changes but the LABEL is constant per button so aria-pressed still valid [AMAPage/CreatorSubscribers precedent]; visible text -> NO aria-label; overflow-x-auto scrollbar-hide -> normal OUTWARD ring, TrendingTopicsPage precedent)? Confirm.

(B) Media thumbnail button, L283-299 — RAW <button type="button">, onClick={() => navigate("/feed")}, ALREADY aria-label="View post". className = "shrink-0 relative w-14 h-14 rounded-xl overflow-hidden bg-muted active:opacity-80". It wraps a <video>/<img>/placeholder that fills it (w-full h-full object-cover). Has active:opacity-80 (opacity-press), NO transition, NO ring. The button is ITSELF overflow-hidden (clips the media to rounded-xl). Sits in the row `flex items-center gap-3 p-3 rounded-2xl bg-card border` (NOT overflow-hidden), p-3 clearance.
Q-B (judgment call): My LEAN = append `transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` and KEEP active:opacity-80, do NOT add active:scale. Rationale: opacity-press is THIS APP'S established media-thumbnail convention — HighlightsPage L270 + PostAlbumsPage L323 use the IDENTICAL `rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity` thumbnail pattern (opacity-press, NOT scale; a scale transform on an overflow-hidden media tile reads worse). So I (1) KEEP active:opacity-80 (existing valid active treatment), (2) ADD transition-opacity to EASE it (matching the HighlightsPage/PostAlbumsPage siblings — currently it snaps), (3) ADD the ring. OUTWARD ring — the button's OWN overflow-hidden does NOT clip its own box-shadow ring (overflow clips descendants only), and it sits with p-3 clearance inside a non-overflow-hidden card, so no ring-inset. aria-label already present. Do you AGREE (keep active:opacity-80 + add transition-opacity + ring, no scale), or prefer ring-only (leave the snap), or converting to active:scale-95+transition-transform? Pick one and say why.

(C) Accept invite button, L322-331 — motion.button, whileTap={{ scale: 0.85 }}, disabled={busy}, onClick={() => updateMutation.mutate({ id, status: "accepted" })}, ALREADY aria-label="Accept invite". className = "h-9 w-9 rounded-xl bg-ig-gradient text-white flex items-center justify-center shadow-sm shadow-rose-500/25 disabled:opacity-50". motion.button WITH whileTap, NO hover color, NO transition, NO ring.
Q-C: append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (motion.button + whileTap -> CSS active:scale would be DEAD, so RING ONLY; do NOT add active:scale; KEEP whileTap; no hover color -> no transition needed; aria-label present -> no attr change; icon-only h-9 w-9 in p-3 row, not overflow-hidden -> OUTWARD ring; disabled preserved)? Confirm.

(D) Decline invite button, L332-341 — motion.button, whileTap={{ scale: 0.85 }}, disabled={busy}, onClick={() => updateMutation.mutate({ id, status: "declined" })}, ALREADY aria-label="Decline invite". className = "h-9 w-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50". motion.button WITH whileTap + transition-colors + hover:bg-destructive/10 + hover:text-destructive, NO ring.
Q-D: append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (motion.button + whileTap -> RING ONLY, no active:scale; KEEP transition-colors — do NOT flip to transition-all because I'm NOT adding a CSS transform here [whileTap owns the transform], and transition:transform would fight whileTap -> jitter [NotificationsPage/PlacesPage motion.button precedent]; KEEP whileTap + hover; aria-label present; OUTWARD ring; disabled preserved)? Confirm.

(E) View-post ChevronRight button (non-pending rows), L344-351 — RAW <button type="button">, onClick={() => navigate("/feed")}, ALREADY aria-label="View post". className = "shrink-0 h-8 w-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center text-muted-foreground". RAW icon-only, has hover:bg-muted, NO transition, NO active, NO ring.
Q-E: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier scale-95; it has hover:bg-muted color fade -> transition-all to ease BOTH the hover-bg and the new scale [no existing transition, so this is an ADD not a flip]; aria-label present -> no attr change; OUTWARD ring — h-8 w-8 rounded-full shrink-0 at the end of the p-3 row, not overflow-hidden)? Confirm.

============================================================
DELIVERABLE: For each control (A)(B)(C)(D)(E) give the EXACT final className string + any attrs. Note where you DIVERGE and why. Resolve B (thumbnail: keep active:opacity-80 + transition-opacity + ring [my lean] vs ring-only vs convert-to-scale) explicitly. Confirm C/D motion.button ring-only (no dead active:scale) + D keep-transition-colors. Flag any keyboard/logic gaps for the owner. Keep it tight.
- files: src/pages/CollabsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 29 — CollabsPage Review

## Plan

Apply className-only interaction tokens + display-only ARIA attributes to 5 controls on `src/pages/CollabsPage.tsx`. No logic changes, no handler modifications, no framer-motion prop changes.

## Proposed Changes

### (A) Tabs (pending/accepted/declined) — L223-238

**Before:**
```tsx
className={cn(
  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
  tab === t.key
    ? "bg-ig-gradient text-white shadow-sm"
    : "bg-secondary text-foreground hover:bg-muted",
)}
```

**After:**
```tsx
className={cn(
  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  tab === t.key
    ? "bg-ig-gradient text-white shadow-sm"
    : "bg-secondary text-foreground hover:bg-muted",
)}
```
+ Add `aria-pressed={tab === t.key}` attribute

**Rationale:** Segmented-pill-tab tier `[0.97]`. DON'T-CHURN `transition-all`. Selection-by-bg-only → `aria-pressed` valid (label constant per button, count badge changes don't disqualify — AMAPage/CreatorSubscribers precedent). Visible text → no `aria-label`. `overflow-x-auto scrollbar-hide` → outward ring (TrendingTopicsPage precedent).

### (B) Media thumbnail button — L283-299

**Before:**
```tsx
className="shrink-0 relative w-14 h-14 rounded-xl overflow-hidden bg-muted active:opacity-80"
```

**After:**
```tsx
className="shrink-0 relative w-14 h-14 rounded-xl overflow-hidden bg-muted active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** **AGREE with your lean.** Keep `active:opacity-80` (established media-thumbnail convention — HighlightsPage L270, PostAlbumsPage L323 use identical pattern). Add `transition-opacity` to ease the opacity snap. Add ring. **Do NOT convert to scale** — a scale transform on an `overflow-hidden` media tile reads worse than opacity-press. Outward ring — the button's own `overflow-hidden` does NOT clip its own box-shadow (overflow clips descendants only), and it sits with `p-3` clearance inside a non-`overflow-hidden` card.

### (C) Accept invite button — L322-331

**Before:**
```tsx
className="h-9 w-9 rounded-xl bg-ig-gradient text-white flex items-center justify-center shadow-sm shadow-rose-500/25 disabled:opacity-50"
```

**After:**
```tsx
className="h-9 w-9 rounded-xl bg-ig-gradient text-white flex items-center justify-center shadow-sm shadow-rose-500/25 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** **CONFIRM.** `motion.button` with `whileTap={{ scale: 0.85 }}` → CSS `active:scale` would be dead. Ring-only. No transition needed (no hover color). `aria-label` already present. Outward ring (`h-9 w-9` in `p-3` row, not `overflow-hidden`). `disabled` preserved.

### (D) Decline invite button — L332-341

**Before:**
```tsx
className="h-9 w-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
```

**After:**
```tsx
className="h-9 w-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** **CONFIRM.** `motion.button` with `whileTap` → ring-only, no `active:scale`. **KEEP `transition-colors`** — do NOT flip to `transition-all` because I'm NOT adding a CSS transform here (`whileTap` owns the transform), and `transition:transform` would fight `whileTap`'s inline transform → jitter (NotificationsPage/PlacesPage `motion.button` precedent). `aria-label` present. Outward ring. `disabled` preserved.

### (E) View-post ChevronRight button — L344-351

**Before:**
```tsx
className="shrink-0 h-8 w-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center text-muted-foreground"
```

**After:**
```tsx
className="shrink-0 h-8 w-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center text-muted-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** **CONFIRM.** Icon-only tier `scale-95`. Has `hover:bg-muted` color fade → `transition-all` to ease BOTH the hover-bg and the new scale (no existing transition, so this is an ADD, not a flip). `aria-label` present. Outward ring (`h-8 w-8 rounded-full shrink-0` at end of `p-3` row, not `overflow-hidden`).

## Diff

```diff
--- a/src/pages/CollabsPage.tsx
+++ b/src/pages/CollabsPage.tsx
@@ -220,7 +220,8 @@ export default function CollabsPage() {
           {TABS.map((t) => (
             <button
               key={t.key}
               type="button"
               onClick={() => setTab(t.key)}
+              aria-pressed={tab === t.key}
               className={cn(
-                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
+                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 tab === t.key
                   ? "bg-ig-gradient text-white shadow-sm"
                   : "bg-secondary text-foreground hover:bg-muted",
@@ -280,7 +281,7 @@ export default function CollabsPage() {
                   <button
                     type="button"
                     onClick={() => navigate("/feed")}
-                    className="shrink-0 relative w-14 h-14 rounded-xl overflow-hidden bg-muted active:opacity-80"
+                    className="shrink-0 relative w-14 h-14 rounded-xl overflow-hidden bg-muted active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                     aria-label="View post"
                   >
                     {url ? (
@@ -319,7 +320,7 @@ export default function CollabsPage() {
                       <motion.button
                         type="button"
                         whileTap={{ scale: 0.85 }}
                         disabled={busy}
                         onClick={() => updateMutation.mutate({ id: c.collabId, status: "accepted" })}
                         aria-label="Accept invite"
-                        className="h-9 w-9 rounded-xl bg-ig-gradient text-white flex items-center justify-center shadow-sm shadow-rose-500/25 disabled:opacity-50"
+                        className="h-9 w-9 rounded-xl bg-ig-gradient text-white flex items-center justify-center shadow-sm shadow-rose-500/25 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                       >
                         <Check className="h-4 w-4" strokeWidth={3} />
                       </motion.button>
@@ -329,7 +330,7 @@ export default function CollabsPage() {
                       <motion.button
                         type="button"
                         whileTap={{ scale: 0.85 }}
                         disabled={busy}
                         onClick={() => updateMutation.mutate({ id: c.collabId, status: "declined" })}
                         aria-label="Decline invite"
-                        className="h-9 w-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
+                        className="h-9 w-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                       >
                         <X className="h-4 w-4" />
                       </motion.button>
@@ -341,7 +342,7 @@ export default function CollabsPage() {
                     <button
                       type="button"
                       onClick={() => navigate("/feed")}
                       aria-label="View post"
-                      className="shrink-0 h-8 w-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center text-muted-foreground"
+                      className="shrink-0 h-8 w-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center text-muted-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                     >
                       <ChevronRight className="h-4 w-4" />
                     </button>
```

## Summary

| Control | Type | Change | Scale Tier | Ring |
|---------|------|--------|------------|------|
| (A) Tabs | raw `<button>` | `active:scale-[0.97]` + ring + `aria-pressed` | `[0.97]` | outward |
| (B) Thumbnail | raw `<button>` | `transition-opacity` + ring (keep `active:opacity-80`) | N/A (opacity) | outward |
| (C) Accept | `motion.button` | ring-only (keep `whileTap`) | N/A | outward |
| (D) Decline | `motion.button` | ring-only (keep `whileTap` + `transition-colors`) | N/A | outward |
| (E) View-post | raw `<button>` | `transition-all active:scale-95` + ring | `scale-95` | outward |

**Diff stats:** 7 ins / 5 del (+2 net = the `aria-pressed` line + the `transition-opacity` line)

## Owner Flags

1. **Sub-44px tap targets** (established repo compact pattern, not per-page fix): Accept/Decline `h-9 w-9` (36px), View-post `h-8 w-8` (32px), tabs `py-1.5` (~30px), thumbnail `w-14 h-14` (56px OK).
