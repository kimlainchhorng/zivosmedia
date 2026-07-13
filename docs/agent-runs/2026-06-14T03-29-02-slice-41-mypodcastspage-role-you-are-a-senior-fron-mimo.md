# MiMo run — 2026-06-14T03:29:02.457Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## MyPodcastsPage — Interaction Token Plan (2 edits)

### SKIP list — confirmed ✓

All 8 items correctly identified: shadcn back Button (L71), shadcn "Browse podcasts" Button (L91), hero stat `motion.div` (L79), loading skeletons (L86), empty-state card (L88), subscription-row `motion.div` (L99), cover `<img>`/Mic tile (L100), all icons + `<p>` text. **No additions needed.**

---

### (A) Content/title button (L101)

**Tier verdict: [0.99] is correct.** This is a `flex-1 min-w-0` wide row-content tap target — functionally a menu-row/wide-row, not a standalone card surface. The token rules map: `full-width/menu-rows/wide-rows → [0.99]`; `wide/card → [0.98]` would be for standalone card surfaces (e.g. a coverflow card, a `w-full rounded-2xl bg-card p-4` block). The precedent is consistent with `JobPostingDetailPage`'s close/reopen gig button (`active:scale-[0.99]`, wide full-width).

**Transition: `transition-transform`.** The button has zero hover color/opacity — pure press-scale. `transition-all` would add unnecessary overhead easing nothing extra. `transition-transform` covers exactly the one animated property.

```diff
# src/pages/MyPodcastsPage.tsx  — L101
- className="flex-1 min-w-0 text-left"
+ className="flex-1 min-w-0 text-left transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

No `aria-label` (rich visible text: title + description + meta). No `aria-pressed` (navigational, not a toggle). Outward ring (flex-1 child in `p-3` non-`overflow-hidden` row).

---

### (B) Unsubscribe button (L111)

**FLIP `transition-colors` → `transition-all`.** The existing `transition-colors` eases `hover:text-rose-500` + `hover:bg-rose-500/10` but does NOT cover the new `active:scale-95` transform. `transition-all` (superset) eases both the color fades and the press-scale. `transition-transform` would regress the hover fades to an instant snap → rejected.

```diff
# src/pages/MyPodcastsPage.tsx  — L111
- className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
+ className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

`aria-label="Unsubscribe"` — **KEPT** (icon-only needs accessible name). No `aria-pressed` (one-shot destructive action, not a persistent toggle). Outward ring (icon button in `p-3` non-`overflow-hidden` row).

---

### Diff summary

| Metric | Count |
|--------|-------|
| `className` edits | 2 |
| Rings added | 2 |
| `active:scale` added | 2 (`[0.99]` + `-95`) |
| Transition changes | 1 flip (B: `transition-colors` → `transition-all`) + 1 fresh add (A: `transition-transform`) |
| `aria-pressed` added | 0 |
| `aria-label` changed | 0 (B's kept as-is) |
| `ring-inset` | 0 |
| Logic lines touched | 0 |
| Net lines | ~0 (2 ins / 2 del, same-length edits) |

### Responsive / keyboard flags

- **Responsive 375/768/1280 — clean:** `max-w-2xl mx-auto px-4` → ~343px inner at 375px. Row: cover tile 56px + `gap-3` (12px) + content `flex-1 min-w-0` (title `line-clamp-1` + desc `line-clamp-1` + meta flex-wrap) + Unsubscribe `h-8 w-8` (32px) + `gap-3` (12px) → content ~231px → no crush.
- **Keyboard — clean:** both are real `<button>` elements (natively Tab-focusable); added focus-visible rings are functional; A has visible text for accessible name, B has `aria-label="Unsubscribe"`.
- **Owner flag (established pattern):** sub-44px tap target — Unsubscribe `h-8 w-8` ~32px.

### Verify

Run `npm run update` (type-check + worker type-check + production build — must pass 0 errors). Preview at `/my-podcasts` signed in with podcast subscriptions to confirm the two buttons respond to keyboard focus and press.
