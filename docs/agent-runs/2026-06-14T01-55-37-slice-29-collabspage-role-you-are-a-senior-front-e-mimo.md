# MiMo run — 2026-06-14T01:55:37.166Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

All five controls are real `<button>` elements (natively focusable) — no keyboard-inaccessibility to flag. Five className-only edits + one new `aria-pressed` attribute. **6 ins / 5 del, +1 net** (the net line is the standalone `aria-pressed` on the tabs).

**SKIP confirmed:** Back shadcn `<Button>` (ships tokens, labeled), hero/row `motion.div`s (presentational, no `onClick`), `<Avatar>` (not a button), `<img>`/`<video>`/`<span>`/`<p>`, skeleton/empty-state divs.

**Resolution on B:** **Keep `active:opacity-80` + add `transition-opacity` + ring.** Opacity-press is this app's established media-thumbnail convention (HighlightsPage L270, PostAlbumsPage L323 use the identical `rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity` pattern). A scale transform on an `overflow-hidden` media tile reads worse than the subtle opacity dim. `transition-opacity` eases the snap (matching the sibling pages). Ring is outward — `overflow:hidden` clips the element's *descendants*, not its own `box-shadow`; the button sits with `p-3` clearance inside a non-overflow-hidden card.

**Confirmation on C/D:** Both are `motion.button` with `whileTap={{ scale: 0.85 }}` → CSS `active:scale` is DEAD (framer's inline transform overrides). Ring ONLY. D keeps `transition-colors` (NOT flipped to `transition-all` — no CSS transform is being added; `transition: transform` from `transition-all` would fight `whileTap`'s inline transform → jitter; NotificationsPage/PlacesPage precedent).

---

## Exact diffs — `src/pages/CollabsPage.tsx`

### (A) Tabs — L228-236

**Before:**
```tsx
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
                tab === t.key
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
```

**After:**
```tsx
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === t.key
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
```

**Rationale:** Segmented-pill-tab tier `[0.97]`; DON'T-CHURN `transition-all` (already present); selection by bg only → `aria-pressed`; label word constant per button (count badge `(N)` changes but the label is fixed) → `aria-pressed` valid (AMAPage/CreatorSubscribers precedent); visible text → NO `aria-label`; `overflow-x-auto scrollbar-hide` → normal OUTWARD ring (box-shadow ignored for scrollable overflow, TrendingTopicsPage precedent).

### (B) Media thumbnail — L283-290

**Before:**
```tsx
                  <button
                    type="button"
                    onClick={() => navigate("/feed")}
                    className="shrink-0 relative w-14 h-14 rounded-xl overflow-hidden bg-muted active:opacity-80"
                    aria-label="View post"
                  >
```

**After:**
```tsx
                  <button
                    type="button"
                    onClick={() => navigate("/feed")}
                    className="shrink-0 relative w-14 h-14 rounded-xl overflow-hidden bg-muted active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="View post"
                  >
```

**Rationale:** KEEP `active:opacity-80` (existing valid opacity-press, HighlightsPage/PostAlbumsPage media-thumbnail convention — NOT converted to scale). ADD `transition-opacity` to ease the opacity snap (matching sibling pages). ADD ring. OUTWARD — the button's own `overflow:hidden` does NOT clip its own `box-shadow`; `p-3` clearance inside non-overflow-hidden card. `aria-label` already present → no attr change.

### (C) Accept invite — L322-331

**Before:**
```tsx
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        disabled={busy}
                        onClick={() => updateMutation.mutate({ id: c.collabId, status: "accepted" })}
                        aria-label="Accept invite"
                        className="h-9 w-9 rounded-xl bg-ig-gradient text-white flex items-center justify-center shadow-sm shadow-rose-500/25 disabled:opacity-50"
                      >
```

**After:**
```tsx
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        disabled={busy}
                        onClick={() => updateMutation.mutate({ id: c.collabId, status: "accepted" })}
                        aria-label="Accept invite"
                        className="h-9 w-9 rounded-xl bg-ig-gradient text-white flex items-center justify-center shadow-sm shadow-rose-500/25 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
```

**Rationale:** `motion.button` + `whileTap` → CSS `active:scale` would be DEAD → ring ONLY; no hover color → no transition needed; `aria-label` present; `h-9 w-9` in `p-3` row, not `overflow-hidden` → OUTWARD ring; `disabled` preserved.

### (D) Decline invite — L332-341

**Before:**
```tsx
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        disabled={busy}
                        onClick={() => updateMutation.mutate({ id: c.collabId, status: "declined" })}
                        aria-label="Decline invite"
                        className="h-9 w-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                      >
```

**After:**
```tsx
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        disabled={busy}
                        onClick={() => updateMutation.mutate({ id: c.collabId, status: "declined" })}
                        aria-label="Decline invite"
                        className="h-9 w-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
```

**Rationale:** `motion.button` + `whileTap` → ring ONLY, no `active:scale`; KEEP `transition-colors` (NOT flipped to `transition-all` — we're NOT adding a CSS transform; `transition:transform` from `transition-all` would fight `whileTap`'s inline transform → jitter; NotificationsPage/PlacesPage precedent); KEEP `whileTap` + hover; `aria-label` present; OUTWARD ring; `disabled` preserved.

### (E) View-post ChevronRight — L344-351

**Before:**
```tsx
                    <button
                      type="button"
                      onClick={() => navigate("/feed")}
                      aria-label="View post"
                      className="shrink-0 h-8 w-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center text-muted-foreground"
                    >
```

**After:**
```tsx
                    <button
                      type="button"
                      onClick={() => navigate("/feed")}
                      aria-label="View post"
                      className="shrink-0 h-8 w-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center text-muted-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
```

**Rationale:** RAW icon-only; `hover:bg-muted` (color fade) → `transition-all` to ease BOTH the hover-bg and the new scale (no existing transition → ADD, not flip); icon-only tier `scale-95`; `aria-label` present; `h-8 w-8 rounded-full shrink-0` at end of `p-3` row, not `overflow-hidden` → OUTWARD ring.

---

## Summary

| Control | Type | Change | Scale | Transition | Ring | New attrs |
|---------|------|--------|-------|------------|------|-----------|
| A Tabs | RAW button | tokens + aria | `[0.97]` | DON'T-CHURN `transition-all` | OUTWARD | `aria-pressed={tab === t.key}` |
| B Thumbnail | RAW button | transition + ring | NONE (keep `active:opacity-80`) | ADD `transition-opacity` | OUTWARD | — |
| C Accept | motion.button | ring only | NONE (keep `whileTap`) | none needed | OUTWARD | — |
| D Decline | motion.button | ring only | NONE (keep `whileTap`) | DON'T-CHURN `transition-colors` | OUTWARD | — |
| E View | RAW button | tokens | `scale-95` | ADD `transition-all` | OUTWARD | — |

**Total diff: 6 ins / 5 del (+1 net).** The +1 net is the standalone `aria-pressed` line on control A.

## Owner flags

- **Sub-44px tap targets** (established repo-compact pattern): Accept/Decline `h-9 w-9` (~36px), View ChevronRight `h-8 w-8` (~32px), tabs `py-1.5` (~30px). Thumbnail `w-14 h-14` (56px) is fine.
- **No keyboard-inaccessibility gaps** — all five controls are real `<button>` elements (natively focusable); added focus rings are functional, not dead CSS.
- **Verify:** `npm run update` must pass (type-check + worker type-check + production build, TRUE EXIT 0).
