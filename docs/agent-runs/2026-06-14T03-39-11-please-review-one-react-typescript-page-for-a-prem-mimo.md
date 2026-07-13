# MiMo run — 2026-06-14T03:39:11.350Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/AffiliateLinksPage.tsx (a link-in-bio affiliate dashboard reached by in-app navigation; `useAuth` + one `useQuery` against the real `affiliate_links` table [key ["affiliate-links", user?.id], .eq("owner_id", user.id)]; `activeCategory` useState; `categories`/`filtered`/`totals` useMemo; `copyLink` helper [navigator.clipboard + sonner toast]. Layout: sticky header [shadcn back Button + Link2 icon + title]; a gradient earnings banner motion.div [NO onClick]; a 3-stat grid of plain divs; a horizontal-scroll category-chip row [RAW buttons, shown only if categories.length>1]; loading skeletons; an empty-state card; then a list of link-row motion.div cards [entrance anim, NO onClick] each holding a Copy RAW button + an Open RAW button.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: the `useQuery`, every `setActiveCategory`, `copyLink`, the `window.open(...)`, the `categories`/`filtered`/`totals` useMemo, `navigate(-1)`. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset). Use focus-visible:ring-inset when the control is a flush edge child of a rounded overflow-hidden parent.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the only animated property; transition-all when there is also a hover:bg/hover:text/hover:opacity that should animate alongside the press. If a control ALREADY ships transition-all, append the ring (don't re-add/re-flip).
- aria-label only on icon-only / image-only controls (a control with rich descriptive visible child text does NOT get an aria-label). aria-pressed on a segmented/toggle control with a persistent on/off selected state; NOT on a one-shot action or navigation.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale, keep it rather than re-adding/re-flipping.

COMPONENT-TYPE RULES we follow:
- shadcn <Button>/<Input>/<Textarea> ship built-in tokens -> leave untouched.
- A framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> (plain HTML) ships NO tokens.

MY PLANNED EDITS (please confirm each is right, or correct it):

1. Category chips, line ~168 (RAW <button> in categories.map, onClick={() => setActiveCategory(c)}, visible child = the category WORD [constant per chip, capitalize], cn() base "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize" + active/inactive conditional bg [bg-ig-gradient text-white vs bg-secondary hover:bg-muted]; parent row flex gap-2 overflow-x-auto scrollbar-hide):
   plan: ADD `aria-pressed={activeCategory === c}` + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() base. transition-all already present -> APPEND-only (don't re-flip). Segmented-chip tier -> [0.97]. aria-pressed valid (constant WORD, selection conveyed by bg). NO aria-label (visible text). OUTWARD ring (overflow-x-auto does not clip box-shadow).

2. Copy button, line ~248 (RAW <button>, visible "Copy" text + Copy icon, onClick={() => copyLink(l.slug)}, className "flex-1 h-8 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all" — ALREADY active:scale-95 + transition-all):
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY. NO aria-label (visible text). NO aria-pressed (one-shot action).

3. Open button, line ~255 (RAW <button>, visible "Open" text + ExternalLink icon, onClick={() => window.open(l.target_url, "_blank", "noopener,noreferrer")}, className "flex-1 h-8 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1 hover:opacity-90 active:scale-95 transition-all shadow-sm" — ALREADY active:scale-95 + transition-all; the hover:opacity-90 is already eased by transition-all):
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY. NO aria-label (visible text). NO aria-pressed.
   - QUESTION (Q3): the Open button sits on the bg-ig-gradient (the button itself is the gradient). The ring token `ring-ring` resolves to black in this app. Should this gradient-FILLED button use the standard `ring-ring` (black ring, visible on the warm gradient) or a white-tinted `ring-white/70` to match the card's design language? Note: on the same page's earnings BANNER (a separate gradient surface) there are no interactive controls; the only gradient-filled control is THIS Open button. Please advise the ring color.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- Header back button, line ~112 (shadcn <Button aria-label="Back" variant="ghost" size="icon">): ships tokens, labeled.
- Earnings banner motion.div (line ~126): entrance anim, NO onClick -> presentational.
- 3-stat grid divs (line ~142): plain non-interactive divs.
- Link-row motion.div cards (line ~206): entrance anim, NO onClick -> presentational (the row itself is not clickable; only the Copy/Open buttons inside are).
- All Link2/Copy/ExternalLink/TrendingUp/DollarSign/MousePointerClick/Target/Sparkles icons: decorative.

QUESTIONS:
Q1. Category chips (#1): aria-pressed + append-only (transition-all already) + active:scale-[0.97] + OUTWARD ring — correct & consistent with the segmented-filter-chip precedent?
Q2. Copy button (#2): ring-only append (already has active:scale-95 + transition-all), no aria — correct?
Q3. Open button (#3): ring-only append; AND what ring color for a gradient-FILLED button — standard ring-ring (black) or ring-white/70? Please give the exact token.
Q4. The link-row motion.div cards (#leave): confirm they are presentational (NO onClick on the row -> leave, do not add a ring to the card; only the inner Copy/Open buttons are interactive).
Q5. At 375px, do the 3-stat grid (grid-cols-3 gap-2), the category chip row, and the Copy+Open button pair (flex gap-1.5, two flex-1 buttons) lay out without crushing?

Please answer Q1-Q5 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/AffiliateLinksPage.tsx

---

## Review: `src/pages/AffiliateLinksPage.tsx` — Interaction polish pass

### Inventory (exhaustive, full-file read)

| # | Control | Type | Line | Has ring? | Has scale? | Has transition? | Has aria? | Action |
|---|---------|------|------|-----------|------------|-----------------|-----------|--------|
| 1 | Category chip | RAW `<button>` in `.map` | ~168 | ✗ | ✗ | `transition-all` ✓ | ✗ | **Edit** |
| 2 | Copy | RAW `<button>` | ~248 | ✗ | `active:scale-95` ✓ | `transition-all` ✓ | ✗ | **Edit** |
| 3 | Open | RAW `<button>` | ~255 | ✗ | `active:scale-95` ✓ | `transition-all` ✓ | ✗ | **Edit** |
| — | Header back | shadcn `<Button>` | ~112 | ✓ built-in | ✓ built-in | ✓ built-in | `aria-label="Back"` ✓ | **Skip** |
| — | Earnings banner | `motion.div` | ~126 | — | — | — | — | **Skip** (entrance, no onClick) |
| — | 3-stat grid | plain `div`s | ~142 | — | — | — | — | **Skip** (non-interactive) |
| — | Link-row cards | `motion.div` | ~206 | — | — | — | — | **Skip** (entrance, no onClick) |
| — | All icons | decorative children | various | — | — | — | — | **Skip** |

**3 RAW controls to edit, 1 shadcn skip, 4 presentational/non-interactive skips. Inventory is exhaustive.**

---

### Answers to Q1–Q5

**Q1 — Category chips: ✅ Correct and consistent.**
This is the exact segmented-filter-chip pattern applied identically in MindfulnessPage, PodcastsPage, FitnessActivitiesPage, PlacesPage, CouponsPage, ChallengesPage, and ~8 other slices. `aria-pressed` on constant-WORD chips where bg is the only selection cue, `[0.97]` tier, `transition-all` already present → append-only, `overflow-x-auto` parent does NOT clip `box-shadow` → outward ring. No corrections.

**Q2 — Copy button: ✅ Correct.**
Already has `active:scale-95` + `transition-all` → ring-only append is the right call. Visible "Copy" text → no `aria-label`. One-shot action → no `aria-pressed`. The `hover:bg-muted` color fade is already eased by the existing `transition-all`. Don't-churn honored.

**Q3 — Open button ring color: Use the standard `ring-ring` token.**
The ring renders **outside** the button's border-box, sitting against the parent card's `bg-card` surface (the row card is `rounded-2xl bg-card border border-border p-3.5`, NOT `overflow-hidden`). So the ring's contrast is against `bg-card`, not against the gradient fill. `ring-ring` is visible and consistent. Using `ring-white/70` would create a one-off color deviation that breaks the universal token pattern (every gradient-filled control in the app — `zivo-btn-signature` CTAs in DigitalProductsPage, HubScaffold, etc. — uses `ring-ring`). Exact token: **`focus-visible:ring-ring`**. The `shadow-sm` already present is fine alongside the ring (they are independent CSS properties; no conflict).

**Q4 — Link-row motion.div cards: ✅ Confirmed presentational, skip.**
Each `motion.div` has `initial={{ opacity: 0, y: 4 }}` / `animate={{ opacity: 1, y: 0 }}` entrance and NO `onClick`. They are containers; only the inner Copy/Open buttons are interactive. No ring needed on the row.

**Q5 — Responsive at 375px: ✅ Clean.**
- `max-w-2xl mx-auto px-4` → **~343px** inner
- **3-stat grid** `grid grid-cols-3 gap-2` → 3 × ~109px cards → icon (12px) + tiny label + 18px number inside `p-3` → no crush
- **Category chip row** `flex gap-2 overflow-x-auto` → chips `px-3.5 py-1.5` with short words → horizontal scroll if more than 2–3 visible → no crush
- **Copy+Open button pair** `flex gap-1.5` → two `flex-1 h-8` buttons → (343 − 6 padding − 1.5×2 gap) / 2 ≈ **~166px each** → "Copy" + 12px icon and "Open" + 12px icon at `text-xs` → generous room, no crush

---

### Proposed edits (3 className changes + 1 aria-pressed attribute)

**Edit 1 — Category chip** (`src/pages/AffiliateLinksPage.tsx`, the `<button>` inside `categories.map`)

BEFORE:
```tsx
<button
  key={c}
  type="button"
  onClick={() => setActiveCategory(c)}
  className={cn(
    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
    activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
  )}
>
```

AFTER:
```tsx
<button
  key={c}
  type="button"
  onClick={() => setActiveCategory(c)}
  aria-pressed={activeCategory === c}
  className={cn(
    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
  )}
>
```

Changes: +1 attribute (`aria-pressed`), base string append: ` active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (6 tokens). `transition-all` kept (append-only).

---

**Edit 2 — Copy button** (the first `<button>` in the actions row)

BEFORE:
```tsx
className="flex-1 h-8 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all"
```

AFTER:
```tsx
className="flex-1 h-8 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Changes: append 3 tokens. No attributes added. No tokens churned.

---

**Edit 3 — Open button** (the second `<button>` in the actions row)

BEFORE:
```tsx
className="flex-1 h-8 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1 hover:opacity-90 active:scale-95 transition-all shadow-sm"
```

AFTER:
```tsx
className="flex-1 h-8 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1 hover:opacity-90 active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Changes: append 3 tokens. No attributes added. No tokens churned. `ring-ring` standard (ring sits against `bg-card`, not the gradient).

---

### Diff summary

| Metric | Count |
|--------|-------|
| Lines changed | 3 |
| className edits | 3 (all append-only) |
| New `aria-pressed` attrs | 1 |
| New `aria-label` attrs | 0 |
| `active:scale-*` added | 1 (`[0.97]` on chips; the other 2 already had `-95`) |
| Transition flips | 0 (all 3 controls already had `transition-all`) |
| `ring-inset` | 0 (no overflow-hidden parents clipping rings) |
| Logic lines touched | 0 |

### Logic guard — must remain byte-identical
- `useQuery` key `["affiliate-links", user?.id]` + `.eq("owner_id", user.id).order("earnings_cents", …)`
- `setActiveCategory(c)` — the `onClick` handler string
- `copyLink(l.slug)` — the `onClick` handler string
- `window.open(l.target_url, "_blank", "noopener,noreferrer")` — the `onClick` handler string
- `categories` / `filtered` / `totals` useMemo blocks
- `navigate(-1)` in the back button
- `formatCents` / `formatCount` / `publicLinkFor` helpers
- All `useState` / `useAuth` / `useNavigate` hooks

---

### What the owner must verify

1. Run **`npm run update`** (type-check + worker type-check + production build) — must pass with 0 errors.
2. Preview at 375/768/1280 — confirm the category chip scroll, stat grid, and Copy/Open button pair lay out cleanly.
3. Keyboard-tab through the page — confirm the 3 new focus rings are visible on the category chips, Copy, and Open buttons.
4. This page is auth-gated (`useAuth`) — the link rows + buttons render only for a signed-in user with `affiliate_links` rows.
