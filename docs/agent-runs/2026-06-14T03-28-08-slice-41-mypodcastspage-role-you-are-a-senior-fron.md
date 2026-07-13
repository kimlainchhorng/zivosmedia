# DeepSeek run — 2026-06-14T03:28:08.589Z

- model: deepseek-chat
- task: SLICE 41 — MyPodcastsPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props (do NOT add/remove whileTap). If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it (do NOT fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for PURE icon/press-scale with NO hover color. If transition-all already present, just append the missing tokens (DON'T-CHURN). If a raw control has transition-colors AND a hover color AND we are adding active:scale, FLIP transition-colors -> transition-all. If a control has NO transition but HAS a hover color and we add active:scale -> add transition-all fresh.
- shadcn <Button> already ships tokens -> DO NOT add className tokens.
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset only when a focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor. A control in a padded (p-3) non-overflow-hidden row -> OUTWARD ring.
- Controls with visible text get their accessible name from text (no aria-label); icon-only controls NEED aria-label. aria-pressed ONLY for toggle/segmented controls whose pressed-state is conveyed ONLY by background.

PAGE: src/pages/MyPodcastsPage.tsx (120 lines, reached via in-app nav, useAuth + SwipeBackContainer + SEOHead noIndex). "My Podcasts" your podcast subscriptions backed by `podcast_subscriptions` joined w/ `podcasts` (keys ["my-podcast-subs", user?.id] + ["my-podcast-meta", ids]; unsubscribe() optimistic delete). Layout: sticky header (shadcn back Button + Headphones badge + "My Podcasts" title); gradient hero stat motion.div (subs.length, NO onClick); loading skeletons; empty-state card (shadcn "Browse podcasts" Button); then a list of subscription rows (each a presentational motion.div [entrance anim, NO onClick]: a cover <img>/Mic fallback tile + a RAW content button [title/desc/meta, navigates to the podcast] + a RAW icon-only Unsubscribe button).

SKIP (confirm): shadcn back Button L71 (aria-label="Back", ships tokens); shadcn "Browse podcasts" Button L91 (visible text, ships tokens); hero stat motion.div L79 (entrance anim, NO onClick -> presentational); loading skeletons L86; empty-state card L88; each subscription-row motion.div L99 (entrance anim, NO onClick -> presentational; only the two buttons inside are controls); cover <img>/Mic tile L100; all ArrowLeft/Mic/Sparkles/Clock/Trash2/Headphones icons + p text.

TWO edits to resolve:

(A) Content/title button, L101 — RAW <button type="button" onClick={() => navigate(`/podcasts/${s.podcast_id}`)}>, visible text (podcast title line-clamp-1 + optional description + a meta row [eps · category · "Subscribed Nd ago"]). className = "flex-1 min-w-0 text-left" (NO transition, NO hover color, NO ring). It's the wide tappable content column of the row (the row motion.div is `flex items-start gap-3 p-3 rounded-2xl bg-card border` between a 56px cover tile and the icon-only Unsubscribe button); NOT overflow-hidden.
Q-A: add `transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: scale tier — this is a wide row-content tap area → [0.99] (full-width/wide-row tier) vs [0.98] (card)?; transition-transform (PURE press-scale, the button has NO hover:bg/text color fade → transition-transform, NOT transition-all); visible text → NO aria-label; NOT a toggle → NO aria-pressed; OUTWARD ring (flex-1 child in a p-3 non-overflow-hidden row). Agree, and is [0.99] the right tier (vs [0.98])?

(B) Unsubscribe button, L111 — RAW <button type="button" aria-label="Unsubscribe" onClick={() => unsubscribe(s.id)}>, icon-only (Trash2). className = "h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors". Same row (NOT overflow-hidden).
Q-B: FLIP `transition-colors`->`transition-all` + append `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`; KEEP aria-label="Unsubscribe"; NO aria-pressed. Confirm: scale-95 (icon-only tier), FLIP to transition-all (existing transition-colors eases hover:text-rose-500 + hover:bg-rose-500/10 but not the new transform -> transition-all superset; transition-transform would regress the hover fades to a snap), RAW <button> gets the full set, KEEP aria-label, OUTWARD ring (icon button in p-3 non-overflow-hidden row). Agree?

============================================================
DELIVERABLE: Give the EXACT final className string + attrs for (A) and (B). Resolve: (A) scale tier [0.99]-vs-[0.98], transition-transform-vs-all (no hover color), no aria; (B) icon-only scale tier, transition flip, keep aria-label, ring outward-vs-inset. Confirm the SKIP list. Note any keyboard/responsive flags. Keep it tight.
- files: src/pages/MyPodcastsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 41 — MyPodcastsPage: Plan & Diff

## Plan

Two RAW `<button>` controls need the standard interaction-token + a11y pass:

1. **Content/title button (L101)** — wide row-content tap area → `[0.99]` tier, `transition-transform` (no hover color), outward ring, no aria attributes.
2. **Unsubscribe button (L111)** — icon-only → `scale-95`, flip `transition-colors`→`transition-all`, outward ring, keep `aria-label="Unsubscribe"`.

## Scale tier resolution

**`[0.99]` is correct** for (A). The button is a `flex-1 min-w-0` content column inside a `p-3` row — it's a **wide-row tap area** (full width of the row minus the cover tile and unsubscribe button), not a card. The `JobPostingDetailPage.tsx` reference uses `[0.99]` for its full-width owner control button and `[0.98]` for the apply button (which is a card-like standalone CTA). This button maps to the `[0.99]` wide-row tier.

## Proposed diff

**File:** `src/pages/MyPodcastsPage.tsx`

```diff
--- a/src/pages/MyPodcastsPage.tsx
+++ b/src/pages/MyPodcastsPage.tsx
@@ -98,7 +98,7 @@ export default function MyPodcastsPage() {
                   {p?.cover_url ? <img src={p.cover_url} alt="" className="shrink-0 h-14 w-14 rounded-xl object-cover" loading="lazy" decoding="async" /> : <div className="shrink-0 h-14 w-14 rounded-xl bg-ig-gradient/10 flex items-center justify-center"><Mic className="h-5 w-5 text-ig-gradient" /></div>}
-                  <button type="button" onClick={() => navigate(`/podcasts/${s.podcast_id}`)} className="flex-1 min-w-0 text-left">
+                  <button type="button" onClick={() => navigate(`/podcasts/${s.podcast_id}`)} className="flex-1 min-w-0 text-left transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     <p className="text-sm font-bold text-foreground line-clamp-1">{p?.title ?? "Podcast"}</p>
@@ -108,7 +108,7 @@ export default function MyPodcastsPage() {
                   </button>
-                  <button type="button" aria-label="Unsubscribe" onClick={() => unsubscribe(s.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
+                  <button type="button" aria-label="Unsubscribe" onClick={() => unsubscribe(s.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="h-3.5 w-3.5" /></button>
                 </motion.div>
```

## Summary of changes

| Control | Change | Rationale |
|---------|--------|-----------|
| **(A)** Content button L101 | Add `transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | Wide-row tier `[0.99]`, `transition-transform` (pure press-scale, no hover color), outward ring (parent row is `p-3` non-`overflow-hidden`), no aria (visible text) |
| **(B)** Unsubscribe button L111 | Flip `transition-colors`→`transition-all`, append `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | Icon-only tier `scale-95`, flip to `transition-all` (covers hover color fades + new transform), keep `aria-label="Unsubscribe"`, outward ring (same non-`overflow-hidden` row) |

## Skip list confirmed

- ✅ shadcn back Button L71 (ships tokens, labeled)
- ✅ shadcn "Browse podcasts" Button L91 (ships tokens, visible text)
- ✅ Hero stat `motion.div` L79 (presentational, no `onClick`)
- ✅ Loading skeletons L86
- ✅ Empty-state card L88
- ✅ Subscription-row `motion.div` L99 (presentational, no `onClick`)
- ✅ Cover `<img>`/Mic tile L100
- ✅ All icons + `<p>` text (decorative/display)

## Keyboard/responsive flags

- **No keyboard gaps** — both controls are native `<button>`s (natively focusable; added rings functional; (B) already has `aria-label="Unsubscribe"`).
- **Owner flag (established repo pattern):** Unsubscribe button `h-8 w-8` (~32px) is below the 44px WCAG touch target minimum. This is consistent across the codebase (DevicesPage, DownloadedPacksPage, etc.) — not a per-page fix.
- **Responsive at 375px:** Row layout is `flex items-start gap-3 p-3` with cover tile `h-14 w-14` (56px) + `gap-3` (12px) + content `flex-1 min-w-0` + unsubscribe `h-8 w-8` (32px) + `gap-3` (12px) → content column gets ~231px at 375px (`343px - 56px - 12px - 32px - 12px`), which is fine for `line-clamp-1` text. No crush.

## Verify gate

Run `npm run update` before marking done. The diff is 2 lines changed, 0 lines added/removed — should pass cleanly.
