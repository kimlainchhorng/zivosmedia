# MiMo run — 2026-06-14T03:53:03.232Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 44 — RecordingsPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui) chat sub-page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown changes, NO state, NO routing, NO data hooks, NO new framer props. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it (do NOT fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for PURE icon/press-scale with NO hover color. If a control has NO transition but HAS a hover color and we add active:scale -> add transition-all fresh. (disabled:opacity is a disabled-attr state snap, NOT a hover fade.)
- shadcn <Button> already ships tokens -> DO NOT add className tokens.
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset only when a focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor. A control in a padded (p-2/p-3) non-overflow-hidden container -> OUTWARD ring.
- Controls with visible text get their accessible name from text (no aria-label). Icon-only controls NEED aria-label (KEEP existing). aria-pressed ONLY for toggle/segmented controls conveying state ONLY by bg.

PAGE: src/pages/chat/RecordingsPage.tsx (276 lines, chat sub-page reached via in-app nav, plain <div> root [NO SwipeBackContainer/NO SEOHead]). Lists call recordings (RLS-gated `video_call_recordings` + joined `video_call_sessions`); play() resolves a signed URL + opens inline player overlay, download() opens signed download URL, remove() confirm()+delete. useState rows/loading/playingUrl/playingType/busyId. Layout: sticky <header> (RAW back button + "Recordings" h1); a body (loading spinner / empty-state <p> / a <ul> of <li> recording rows = icon tile + name/meta + RAW Play + RAW Download + RAW Delete); a conditional inline-player overlay (fixed inset-0 bg-black/95 div w/ onClick-dismiss holding a native <audio>/<video controls>).

FOUR edits — all 4 are RAW icon-only <button type="button"> with an EXISTING aria-label, a hover:bg color, and NO transition/scale/ring:

(A) Back button L167 — RAW icon-only ArrowLeft, aria-label="Back" (KEEP), onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/chat"))}. className = "p-2 -ml-2 rounded-full hover:bg-muted". In <header> (not overflow-hidden).
Q-A: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — has hover:bg-muted; icon tier scale-95; KEEP aria-label; OUTWARD ring). Agree?

(B) Play button L211 — RAW icon-only (Play / Loader2 when busy), aria-label="Play" (KEEP), onClick={() => play(r)}, disabled={busyId === r.id}. className = "p-2 rounded-full hover:bg-muted disabled:opacity-50". In the p-3 <li> row (not overflow-hidden).
Q-B: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — has hover:bg-muted [disabled:opacity-50 is a disabled-attr snap, not a hover fade, but the hover:bg ALREADY mandates transition-all]; icon tier scale-95; KEEP aria-label; OUTWARD ring). Agree?

(C) Download button L224 — RAW icon-only Download, aria-label="Download" (KEEP), onClick={() => download(r)}. className = "p-2 rounded-full hover:bg-muted". Same row.
Q-C: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — has hover:bg-muted; icon scale-95; KEEP aria-label; OUTWARD ring). Agree?

(D) Delete button L232 — RAW icon-only Trash2, aria-label="Delete" (KEEP), onClick={() => remove(r)}. className = "p-2 rounded-full hover:bg-destructive/10 text-destructive". Same row.
Q-D: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — has hover:bg-destructive/10 color fade; icon scale-95; KEEP aria-label; OUTWARD ring). Agree?

SKIP (confirm): the <ul>/<li> recording rows (presentational containers, NO onClick — only the 3 inner buttons are controls); the icon tile div; the native <audio>/<video controls> in the player overlay (native media controls, not our buttons); all ArrowLeft/Loader2/VideoIcon/Download/Trash2/Play/Mic icons + h1/p text.
FLAG (do NOT fix): the inline-player overlay <div> L249 has onClick={() => setPlayingUrl(null)} (tap-to-dismiss) but is a non-button <div> with no role/tabIndex/onKeyDown -> keyboard-inaccessible dismiss. FLAG to owner (the native media controls + Esc are the practical paths; established overlay pattern).

============================================================
DELIVERABLE: Give the EXACT final className string (+ confirm attrs untouched) for (A)-(D). All four look like the same pattern (icon-only, hover:bg, fresh transition-all + scale-95 + outward ring, keep aria-label) — confirm that's right for each, esp. (B) given its disabled:opacity-50 (does it change transition-all-vs-transform? — NO, the hover:bg already mandates transition-all; disabled:opacity is just a disabled-attr snap), and (D) given hover:bg-destructive/10 (still a hover color fade -> transition-all). Confirm SKIP + FLAG lists. Note any keyboard/responsive flags. Keep it tight.
- files: src/pages/chat/RecordingsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx
- files: src/pages/chat/RecordingsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Four RAW icon-only `<button>`s, all identical pattern: existing `aria-label`, `hover:bg` color, no transition/scale/ring. Each gets the same token append: fresh `transition-all` (mandated by the hover color), `active:scale-95` (icon tier), `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (outward — no `overflow-hidden` ancestor). All attrs (`aria-label`, `disabled`, `onClick`) preserved byte-identically. 4 line-swaps, 0 logic, 0 new attributes.

The `disabled:opacity-50` on (B) does **not** change the call — it's a disabled-attr state snap, not a hover fade; the `hover:bg-muted` already mandates `transition-all`. The `hover:bg-destructive/10` + `text-destructive` on (D) also doesn't change the call — still a hover color fade → `transition-all`.

---

## Proposed Diff — `src/pages/chat/RecordingsPage.tsx`

```diff
--- a/src/pages/chat/RecordingsPage.tsx
+++ b/src/pages/chat/RecordingsPage.tsx
@@ line 167 (A) Back button @@
-          className="p-2 -ml-2 rounded-full hover:bg-muted"
+          className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

@@ line 211 (B) Play button @@
-                    className="p-2 rounded-full hover:bg-muted disabled:opacity-50"
+                    className="p-2 rounded-full hover:bg-muted disabled:opacity-50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

@@ line 224 (C) Download button @@
-                    className="p-2 rounded-full hover:bg-muted"
+                    className="p-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

@@ line 232 (D) Delete button @@
-                    className="p-2 rounded-full hover:bg-destructive/10 text-destructive"
+                    className="p-2 rounded-full hover:bg-destructive/10 text-destructive transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### Exact final classNames (attrs untouched)

| Control | Attrs preserved | Final className |
|---------|----------------|-----------------|
| **(A) Back** | `aria-label="Back"`, `onClick` | `p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **(B) Play** | `aria-label="Play"`, `disabled={busyId === r.id}`, `onClick` | `p-2 rounded-full hover:bg-muted disabled:opacity-50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **(C) Download** | `aria-label="Download"`, `onClick` | `p-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **(D) Delete** | `aria-label="Delete"`, `onClick` | `p-2 rounded-full hover:bg-destructive/10 text-destructive transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |

### SKIP (confirmed — presentational / non-interactive / ship-tokens)
- `<ul>` / `<li>` rows — presentational containers (no `onClick`; only the 3 inner buttons are controls)
- Icon tile `<div>` — decorative
- Native `<audio controls>` / `<video controls>` — native media controls
- All Lucide icons (ArrowLeft, Loader2, VideoIcon, Mic, Play, Download, Trash2) + `<h1>` / `<p>` text — decorative
- Loading spinner `<div>`, empty-state `<p>` — non-interactive

### FLAG (do NOT fix)
- **Player overlay `<div>` (L249)** — `onClick={() => setPlayingUrl(null)}` on a plain `<div>` with no `role`/`tabIndex`/`onKeyDown` → keyboard users cannot dismiss by clicking the backdrop. Native media controls + Escape are the practical paths. Established overlay pattern — flag for future a11y sweep.

### Diff counts
- **4 className line-swaps** (A/B/C/D), **0 new attributes**, **0 logic lines touched**
- 4 rings added (all `ring-ring`, all outward), 4 `active:scale-95` (icon tier), 4 fresh `transition-all` (each has `hover:bg` color), 0 `ring-inset` (no `overflow-hidden` ancestors), 0 `aria-pressed` (no toggles), 0 `aria-label` changed (all preserved)

### Responsive / keyboard
- **Responsive 375/768/1280 — clean.** Each `<li>` row: `p-3` (12px) + icon tile 40px + `gap-3` (12px) + `flex-1 min-w-0` text (truncated) + 3 buttons × 32px (`p-2` + 16px icon) + ~8px inter-button gaps ≈ 280px non-text, leaving ~95px for text at 375px inner → `truncate` handles gracefully. At 768+ within `max-w-2xl` the row has comfortable breathing room.
- **No keyboard gaps.** All 4 controls are native `<button type="button">` (Tab-focusable); added `focus-visible` rings functional; all have existing `aria-label` for accessible names.
- **Sub-44px tap targets to FLAG** (repo-wide compact pattern): all four buttons are `p-2` (8px×2) + 16px icon = 32px total.

### Verify
Run `npm run update` — must pass (type-check + worker type-check + production build) with TRUE EXIT 0.
