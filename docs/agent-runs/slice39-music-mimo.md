# MiMo run — 2026-06-14T03:14:38.592Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 39 — MusicStickersPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props (do NOT add/remove whileTap). If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it (do NOT fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for PURE icon/press-scale with NO hover color. If transition-all already present, just append the missing tokens (DON'T-CHURN). If a raw control has transition-colors AND a hover color AND we are adding active:scale, FLIP transition-colors -> transition-all.
- shadcn <Button> already ships tokens -> DO NOT add className tokens.
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset only when a focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor. A control in a padded (p-3) non-overflow-hidden row -> OUTWARD ring.
- Controls with visible text get their accessible name from text (no aria-label); icon-only controls NEED aria-label. aria-pressed ONLY for toggle/segmented controls whose pressed-state is conveyed ONLY by background. A media play/pause button whose accessible name + icon FLIP between states (Play <-> Pause) does NOT use aria-pressed (state already conveyed by the changing label/icon, not ONLY by bg).

PAGE: src/pages/MusicStickersPage.tsx (111 lines, reached via in-app nav, public catalog — NO useAuth, SwipeBackContainer + SEOHead noIndex). "Music Stickers" browse music tracks for story stickers. Reads shared_music_tracks (key ["shared-music-tracks"], .eq is_active true .order sort_order asc) into `tracks`. playingId useState + audioRef. togglePlay(t) plays/pauses an Audio preview. Layout: sticky header (shadcn back Button + Music badge + "Music Stickers" title); a gradient hero stat motion.div (tracks.length "tracks", NO onClick); loading skeletons; empty-state card; then a list of track rows (each a presentational motion.div [entrance anim + isPlaying border via cn(), NO onClick]: a RAW play/pause button + cover-emoji tile + title/artist + a CONDITIONAL trailing external-link <a> when t.external_url).

SKIP (confirm): shadcn back Button L62 (aria-label="Back", ships tokens; its onClick pauses audio + navigate(-1) = logic, untouched); hero stat motion.div L70 (entrance anim, NO onClick -> presentational); loading skeletons L77; empty-state card L78; each track-row motion.div L89 (entrance anim + isPlaying cn() border, NO onClick -> presentational; only the play button + external link inside are controls); all Music/Sparkles/Play/Pause/ExternalLink/ArrowLeft icons + cover_emoji tile + p text.

TWO edits to resolve:

(A) Play/Pause button, L90 — RAW <button type="button" aria-label={isPlaying ? "Pause" : "Play"} onClick={() => togglePlay(t)} disabled={!t.preview_url}>, icon-only (Play/Pause icon flips). className = cn("shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center active:scale-95 transition-all disabled:opacity-40", isPlaying ? "bg-ig-gradient text-white shadow-md shadow-rose-500/30" : "bg-secondary text-foreground hover:bg-muted"). Sits in track-row motion.div `flex items-center gap-3 p-3 rounded-2xl bg-card border` (NOT overflow-hidden).
Q-A: append ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() base (active:scale-95 + transition-all ALREADY present -> ring-only, DON'T-CHURN); KEEP the dynamic aria-label; NO aria-pressed. Confirm: ring-only (don't re-add scale/transition), NO aria-pressed (the aria-label + icon FLIP between Play/Pause already convey state to SR -> state NOT conveyed ONLY by bg, so aria-pressed would be redundant on a media play/pause toggle), KEEP dynamic aria-label (icon-only), OUTWARD ring (button in p-3 non-overflow-hidden row). Agree?

(B) External-link anchor, L99 — RAW <a href={t.external_url} target="_blank" rel="noopener noreferrer" aria-label="Open in source">, icon-only (ExternalLink icon), conditionally rendered when t.external_url. className = "h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary inline-flex items-center justify-center transition-colors". Sits in the same track-row motion.div (NOT overflow-hidden).
Q-B: FLIP `transition-colors`->`transition-all` + append `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`; KEEP existing aria-label="Open in source"; NO aria-pressed. Confirm: scale-95 (icon-only tier), FLIP to transition-all (existing transition-colors eases hover:text/bg but not the new transform -> transition-all superset; transition-transform would regress the hover fade to a snap), RAW <a> gets the full set, KEEP aria-label, OUTWARD ring (anchor in p-3 non-overflow-hidden row). Agree?

============================================================
DELIVERABLE: Give the EXACT final className string + attrs for (A) and (B). Resolve: (A) ring-only-vs-more, aria-pressed yes/no on a play/pause toggle, keep dynamic aria-label; (B) scale tier, transition flip, keep aria-label, ring outward-vs-inset. Confirm the SKIP list. Note any keyboard/responsive flags. Keep it tight.
- files: src/pages/MusicStickersPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Two className-only edits, both ring + token appends on RAW controls. Zero logic/handler changes. Diff = 2 ins / 2 del (+0 net).

---

## (A) Play/Pause button — ring-only append (L90)

**Agree with your analysis.** `active:scale-95` + `transition-all` already present → ring-only, don't-churn. Dynamic `aria-label` flips between "Play"/"Pause" + icon flips → state NOT conveyed only by bg → **NO `aria-pressed`** (per the explicit token rule for media play/pause). OUTWARD ring (button in `p-3` non-`overflow-hidden` row).

**BEFORE:**
```jsx
className={cn("shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center active:scale-95 transition-all disabled:opacity-40", isPlaying ? "bg-ig-gradient text-white shadow-md shadow-rose-500/30" : "bg-secondary text-foreground hover:bg-muted")}
```

**AFTER:**
```jsx
className={cn("shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center active:scale-95 transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isPlaying ? "bg-ig-gradient text-white shadow-md shadow-rose-500/30" : "bg-secondary text-foreground hover:bg-muted")}
```

**What changed:** appended ` focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() BASE string only. All attrs (`type="button"`, `aria-label={isPlaying ? "Pause" : "Play"}`, `onClick={() => togglePlay(t)}`, `disabled={!t.preview_url}`) byte-identical.

---

## (B) External-link anchor — FLIP + full set (L99)

**Agree with your analysis.** `transition-colors` eases existing `hover:text-foreground` + `hover:bg-secondary` but won't cover the new `active:scale` transform → FLIP to `transition-all` (superset; `transition-transform` would regress the hover color fades to a snap). Icon-only tier → `active:scale-95`. KEEP `aria-label="Open in source"`. OUTWARD ring (anchor in `p-3` non-`overflow-hidden` row).

**BEFORE:**
```jsx
className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary inline-flex items-center justify-center transition-colors"
```

**AFTER:**
```jsx
className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary inline-flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**What changed:** FLIPPED `transition-colors` → `transition-all` + appended ` active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. All attrs (`href`, `target="_blank"`, `rel="noopener noreferrer"`, `aria-label="Open in source"`) byte-identical.

---

## SKIP list — confirmed ✅

| Control | Reason |
|---|---|
| shadcn back `<Button>` L62 | `aria-label="Back"`, ships tokens, onClick = logic (pause + navigate) |
| Hero stat `motion.div` L70 | Entrance anim only, NO `onClick` → presentational |
| Loading skeletons L77 | Non-interactive |
| Empty-state card L78 | Non-interactive |
| Track-row `motion.div` L89 | Entrance anim + isPlaying `cn()` border, NO `onClick` → presentational (only play button + link inside are controls) |
| All icons + cover_emoji + `<p>` text | Display children, decorative |

---

## Diff summary

| Metric | Count |
|---|---|
| Lines changed | 2 ins / 2 del (+0 net) |
| Rings added | 2 (Play button + external link) |
| `active:scale-95` added | 1 (external link; Play already had it) |
| Transition flips | 1 (`transition-colors` → `transition-all`, external link; Play already had `transition-all`) |
| `aria-pressed` added | 0 |
| `ring-inset` | 0 (both OUTWARD) |
| Logic/handler changes | 0 |

---

## Flags

- **Owner flag (repo compact pattern):** external link `h-8 w-8` (~32px) is sub-44px tap target. Play button `h-11 w-11` (~44px) — fine.
- **No keyboard gaps** — both the `<button>` and `<a>` are native elements (natively focusable; added rings functional, not dead CSS).
- **Responsive 375/768/1280 — clean:** track row `flex items-center gap-3 p-3` → play `h-11` (44px) + `gap-3` (12px) + emoji tile `h-12` (48px) + `gap-3` (12px) + `flex-1 min-w-0` text + conditional link `h-8` (32px) = ~148px fixed; ~195px for text column at 375px inner (~343px) → no crush.

---

## Verify

After applying, run:
```bash
npm run update
```
Must pass (type-check + worker type-check + production build). Preview caveat: page is public (NO `useAuth`), so previewable at any route that mounts `MusicStickersPage`; shared dev server contention from parallel agents may require retrying behind the concurrent-build guard.
