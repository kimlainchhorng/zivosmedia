# DeepSeek run — 2026-06-14T03:13:44.745Z

- model: deepseek-chat
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

# SLICE 39 — MusicStickersPage: Analysis & Diff

## Short Plan

Two controls need interaction tokens:
- **(A)** Play/Pause button (RAW `<button>`, icon-only, dynamic `aria-label`) — already has `active:scale-95 transition-all` → **ring-only append**, NO `aria-pressed` (media play/pause state conveyed by icon + label flip, not bg-only)
- **(B)** External-link anchor (RAW `<a>`, icon-only, static `aria-label`) — has `transition-colors` + hover colors → **FLIP to `transition-all`** + full token set (`active:scale-95` + ring)

## Proposed Diff

**File:** `src/pages/MusicStickersPage.tsx`

```diff
--- a/src/pages/MusicStickersPage.tsx
+++ b/src/pages/MusicStickersPage.tsx
@@ -87,11 +87,11 @@ export default function MusicStickersPage() {
                   <button
                     type="button"
                     aria-label={isPlaying ? "Pause" : "Play"}
                     onClick={() => togglePlay(t)}
                     disabled={!t.preview_url}
-                    className={cn("shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center active:scale-95 transition-all disabled:opacity-40", isPlaying ? "bg-ig-gradient text-white shadow-md shadow-rose-500/30" : "bg-secondary text-foreground hover:bg-muted")}
+                    className={cn("shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center active:scale-95 transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isPlaying ? "bg-ig-gradient text-white shadow-md shadow-rose-500/30" : "bg-secondary text-foreground hover:bg-muted")}
                   >
                     {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
                   </button>
                   <div className="shrink-0 h-12 w-12 rounded-xl bg-ig-gradient/10 flex items-center justify-center text-2xl">{t.cover_emoji}</div>
@@ -99,11 +99,11 @@ export default function MusicStickersPage() {
                     <p className="text-sm font-bold text-foreground line-clamp-1">{t.title}</p>
                     <p className="text-[11px] text-muted-foreground line-clamp-1">{t.artist} · {t.duration}</p>
                   </div>
                   {t.external_url && (
-                    <a href={t.external_url} target="_blank" rel="noopener noreferrer" aria-label="Open in source" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary inline-flex items-center justify-center transition-colors">
+                    <a href={t.external_url} target="_blank" rel="noopener noreferrer" aria-label="Open in source" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary inline-flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                       <ExternalLink className="h-3.5 w-3.5" />
                     </a>
                   )}
                 </motion.div>
```

## Resolution Summary

### (A) Play/Pause button — **ring-only append, confirmed**
- **`active:scale-95`** already present → DON'T re-add
- **`transition-all`** already present → DON'T churn
- **Append only:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **NO `aria-pressed`** — the `aria-label` flips between "Play"/"Pause" AND the icon flips between `<Play>`/`<Pause>`. State is conveyed by more than just background → `aria-pressed` would be redundant per WCAP 4.1.2 (name, role, value already communicated)
- **Keep dynamic `aria-label`** — icon-only control needs accessible name
- **OUTWARD ring** — button sits in `p-3` padded row, parent `motion.div` is NOT `overflow-hidden` → no clip

### (B) External-link anchor — **full token set, confirmed**
- **`active:scale-95`** — icon-only tier (h-8 w-8, single ExternalLink icon, no text)
- **FLIP `transition-colors` → `transition-all`** — existing `hover:text-foreground` + `hover:bg-secondary` are eased by `transition-colors`; adding `active:scale` transform requires `transition-all` to ease both the hover fades AND the press-scale. `transition-transform` alone would regress the hover fades to instant snap
- **Full ring set:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Keep `aria-label="Open in source"`** — icon-only, no visible text
- **NO `aria-pressed`** — one-shot external navigation, not a toggle
- **OUTWARD ring** — same reasoning as (A)

## SKIP List (confirmed)

| Element | Line | Reason |
|---------|------|--------|
| shadcn back `<Button>` | L62 | Ships own tokens, `aria-label="Back"` present |
| Hero stat `motion.div` | L70 | Entrance anim only, NO `onClick` → presentational |
| Loading skeleton `div`s | L77 | Non-interactive |
| Empty-state card `div` | L78 | Non-interactive |
| Track-row `motion.div` | L89 | Entrance anim + `cn()` border, NO `onClick` → presentational |
| Cover emoji `div` | L97 | Display child |
| Title/artist `<p>` | L99-100 | Display children |
| All icons (Music/Sparkles/Play/Pause/ExternalLink/ArrowLeft) | — | Decorative |

## Responsive Check

- `max-w-2xl mx-auto px-4` → ~343px inner at 375px
- Track row: `h-11 w-11` play button (44px) + `gap-3` (12px) + `h-12 w-12` emoji tile (48px) + `flex-1 min-w-0` text column + optional `h-8 w-8` external link (32px) = ~151px fixed + flexible text → **no crush** (title `line-clamp-1`, meta `line-clamp-1` with `min-w-0`)
- At 375px: ~192px for text column → comfortable

## Keyboard Flag

**None.** Both controls are natively focusable elements (`<button>`, `<a>`). The added `focus-visible:ring` will be functional. The play/pause button's dynamic `aria-label` already announces state changes. The external link's `aria-label="Open in source"` provides context for screen readers.

## Owner Verification

1. Run `npm run update` — must pass (type-check + worker type-check + build)
2. Preview at `/music-stickers` — verify:
   - Play/pause button shows keyboard focus ring on Tab
   - External link shows keyboard focus ring on Tab
   - Play/pause `aria-label` announces "Play" / "Pause" correctly
3. No visual regression on zivosmedia.com (this page is public, no host gate)
