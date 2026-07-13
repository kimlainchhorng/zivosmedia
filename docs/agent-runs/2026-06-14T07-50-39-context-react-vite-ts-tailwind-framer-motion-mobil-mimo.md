# MiMo run — 2026-06-14T07:50:39.590Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/AutoRepairPage.tsx (280-line "Auto Repair" — browse & book auto-repair shops. REAL Supabase `useQuery` over store_profiles (live shops) with a static fallback; `useState search/activeFilter`; `displayShops` filtered by search + activeFilter; navigate to `/store/${slug}`. Layout: desktop NavBar + mobile sticky header [raw icon Back + Wrench + "Auto Repair"] + dark hero [ShieldCheck badge + headline + shadcn Search Input] + a horizontal SERVICE_FILTERS chip row + a "How it works" 3-step grid + shop-count line + a shops grid [each shop = a clickable `<div onClick>` card] + Footer). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setSearch/setActiveFilter, useQuery/Supabase, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Input> (own focus tokens). Don't renumber an existing scale. Don't add role/tabIndex/onKeyDown (those are logic/semantics changes — out of scope; FLAG instead).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when control is a flush edge child of a rounded overflow-hidden PARENT, OR a flush media tile in a near-gapless grid.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT = ring-white/70. A gradient-FILLED chip (bg-ig-gradient) selected state on a NEUTRAL parent still uses ring-ring.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab active:scale-[0.97]; wide full-width row/button WITH own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. ALREADY transition-all → append without flipping. NO transition + scale-only + NO hover ON THE BUTTON → transition-transform NEW.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a PERSISTENT single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, clear).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L108 HEADER BACK button (raw <button>, icon-only ChevronLeft, ALREADY `aria-label="Go back"`, one-shot `onClick={() => navigate(-1)}`, base `min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors touch-manipulation`, has hover:bg + transition-colors, NO scale/focus). Parent = mobile sticky header `bg-background/95 backdrop-blur-xl` (neutral). → my plan: KEEP existing `aria-label="Go back"` (don't churn) + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` AND FLIP `transition-colors`→`transition-all` (icon-only tier scale-95; FLIP REQUIRED — transition-colors GAINING a new active:scale MUST flip to transition-all, the hover:bg-muted/60 keeps animating; OUTWARD ring-ring on the neutral header). Confirm the FLIP + scale-95 + keep-existing-aria.

B) L150 SERVICE-FILTER chip (raw <button>, mapped over SERVICE_FILTERS [All/Oil Change/Brakes/Tires/Engine/…], single-select filter, selection bg-conveyed `bg-ig-gradient text-white shadow-sm` [active] vs `bg-muted/50 text-muted-foreground hover:bg-muted` [inactive], one-shot `onClick={() => setActiveFilter(f)}`, VISIBLE text = filter name; className via `cn(` with a static FIRST arg `shrink-0 min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap touch-manipulation` then the active/inactive conditional; ALREADY transition-all, NO scale/focus/aria). Container = `flex gap-2 overflow-x-auto` chip row on the page `bg-background` (neutral). → my plan: ADD `aria-pressed={activeFilter === f}` (persistent single-select segmented filter, bg-conveyed) + APPEND into the cn() static FIRST arg `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (segmented-filter tier [0.97]; NO flip — transition-all already present; OUTWARD ring-ring — selected bg-ig-gradient fill renders the ring against the neutral page bg-background container; single edit hits all chips). Confirm tier [0.97] + aria-pressed + no-flip + OUTWARD ring-ring.

C) L195 "CLEAR FILTERS" text-link button (raw <button>, shown in the empty state, one-shot `onClick={() => { setSearch(""); setActiveFilter("All"); }}`, VISIBLE text "Clear filters", base `text-xs text-primary font-semibold`, NO transition/scale/hover/focus/aria). Parent = the empty-state column on bg-background (neutral). → my plan: APPEND `active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (small inline text-link tier [0.97]; transition-transform NEW — scale is the SOLE animated prop, NO hover on the button, NO prior transition → NEW not a flip; OUTWARD ring-ring on the neutral empty-state bg-background; NO aria — visible text, one-shot clear). Confirm tier [0.97] + transition-transform NEW + OUTWARD ring-ring + no-aria. (OPEN: should a bare text-link ring get a `rounded` so it isn't a hard rectangle? — advise.)

D) OPEN QUESTION — L218 SHOP CARD (a clickable `<div onClick={() => navigate(shop.slug ? `/store/${shop.slug}` : `/auto-repair`)}>`, NOT a <button>, base `group block rounded-2xl bg-card border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 transition-all duration-300 touch-manipulation active:scale-[0.99] cursor-pointer`, ALREADY `active:scale-[0.99]` + `transition-all` + hover effects, NO focus/aria/role/tabIndex — it's a div, NOT keyboard-focusable). Per the HARD RULE I may only touch className + aria-* (NOT add role/tabIndex/onKeyDown). A `focus-visible:ring` on a div with no tabIndex/role is dead weight (the div can't receive keyboard focus), so adding ONLY a ring would be misleading. → my lean: LEAVE the className as-is (it already has the press scale + transition-all) and FLAG for the owner that this card should be a real <button>/<a> or get role="button"+tabIndex={0}+onKeyDown (a logic/semantics fix, out of scope for a className/aria-only pass). Confirm LEAVE+FLAG vs any className-only improvement that's actually useful.

ALSO CONFIRM I should LEAVE these: the shadcn Search <Input> L135 (own focus tokens); NavBar/Footer/SEOHead (wrappers/nav/non-visual); all motion.div wrappers (hero L121, shop-card wrapper L212, the AnimatePresence grid L199 — entrance anim, NO onClick); the "How it works" 3-step <div>s L172 (non-interactive presentational); the Verified badge <span> + service-tag <span>s + rating <span> + "Book Now" <span> (non-interactive); ChevronLeft/Search/Star/MapPin/Clock/Wrench/ShieldCheck/ArrowRight/Loader2 icons (decorative); the shop <img> (has alt).

Be concise and exact. Return the precise final className after-string per control + any aria attr. B is a mapped cn() (single edit hits all chips). Resolve: A the transition-colors→transition-all FLIP; C transition-transform-NEW + the bare-text-link `rounded` question; D LEAVE+FLAG (clickable div, no button semantics, can't be keyboard-focused — ring alone is dead weight).
- files: src/pages/AutoRepairPage.tsx

---

All four assessments are correct. Here's the exact plan:

---

## Plan — 3 edits, 1 LEAVE+FLAG

| Control | Edits | FLIP | Ring | aria |
|---------|-------|------|------|------|
| **A** Back button | className edit + keep `aria-label` | `transition-colors`→`transition-all` | OUTWARD `ring-ring` (neutral header) | KEEP existing |
| **B** Filter chip (mapped) | cn() static arg edit + attr | none | OUTWARD `ring-ring` (neutral page) | ADD `aria-pressed` |
| **C** Clear filters | className edit | none (NEW) | OUTWARD `ring-ring` (neutral bg) | none |
| **D** Shop card | **LEAVE** | — | — | — |

**Guard counts:** 3 `−`/`+` className edits · 1 aria attr added (`aria-pressed`) · 1 FLIP (A) · `active:scale-95`×1 (A) · `active:scale-[0.97]`×2 (B,C) · `transition-transform` NEW×1 (C) · `ring-ring` OUTWARD×3 · `ring-inset`×0 · 0 logic lines touched

---

## Proposed Diff — `src/pages/AutoRepairPage.tsx`

### A — Header Back button (L108)

**Before:**
```tsx
className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors touch-manipulation"
```

**After:**
```tsx
className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-full hover:bg-muted/60 transition-all touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- **FLIP confirmed:** `transition-colors` → `transition-all` — gaining `active:scale-95`; `hover:bg-muted/60` keeps animating under `transition-all`.
- **Scale:** `active:scale-95` icon-only tier ✓
- **Ring:** OUTWARD `ring-ring` — parent is neutral `bg-background/95 backdrop-blur-xl` header.
- **aria:** KEEP existing `aria-label="Go back"` — don't churn.

---

### B — Service-filter chip (cn() static first arg, single edit × all chips)

**Before (static first arg of `cn()`):**
```tsx
"shrink-0 min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap touch-manipulation"
```

**After (static first arg of `cn()`):**
```tsx
"shrink-0 min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Also ADD** `aria-pressed={activeFilter === f}` on the `<button>` opening tag (alongside existing `type`, `key`, `onClick`):

```tsx
<button type="button"
  key={f}
  aria-pressed={activeFilter === f}
  onClick={() => setActiveFilter(f)}
```

- **No FLIP** — `transition-all` already present.
- **Scale:** `active:scale-[0.97]` segmented-filter tier ✓
- **Ring:** OUTWARD `ring-ring` — selected `bg-ig-gradient` fill renders the ring against the neutral page `bg-background`; the unselected `bg-muted/50` is also neutral.
- **aria:** `aria-pressed` — persistent single-select segmented filter, bg-conveyed state ✓

---

### C — "Clear filters" text-link button (L195)

**Before:**
```tsx
className="text-xs text-primary font-semibold"
```

**After:**
```tsx
className="text-xs text-primary font-semibold rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- **`transition-transform` NEW** — scale is the sole animated prop; no hover, no prior transition → NEW, not a flip.
- **Scale:** `active:scale-[0.97]` small inline text-link tier ✓
- **Ring:** OUTWARD `ring-ring` — neutral empty-state `bg-background`.
- **`rounded` added** — on a bare text-only button the focus ring traces the element's bounding box; without `rounded` it's a hard-cornered rectangle; `rounded` (4px radius) gives the ring a subtle rounded rect that looks intentional. Net positive, minimal cost.
- **aria:** NONE — visible text ("Clear filters"), one-shot clear action.

---

### D — Shop card `<div onClick>` — **LEAVE + FLAG**

**No className change.** The card already has `active:scale-[0.99]` + `transition-all` + `hover:` effects + `cursor-pointer`.

**Owner flag:** This is a clickable `<div>` with no keyboard semantics — no `role="button"`, no `tabIndex={0}`, no `onKeyDown` Enter/Space handler. Adding `focus-visible:ring` alone is dead weight (the div can't receive keyboard focus without `tabIndex`). Converting to a real `<a>`/`<button>` or adding `role="button"` + `tabIndex={0}` + `onKeyDown` is a logic/semantics fix, out of scope for a className/aria-only pass.

---

### LEAVE list (confirmed — no touch)

- shadcn `<Input>` L135 — own focus tokens
- `NavBar` / `Footer` / `SEOHead` — wrappers/nav/non-visual
- All `motion.div` wrappers (hero L121, shop-card wrapper L212, AnimatePresence grid L199) — entrance anim, NO onClick
- "How it works" 3-step `<div>`s L172 — non-interactive presentational
- `Verified` badge `<span>`, service-tag `<span>`s, rating `<span>`, "Book Now" `<span>` — non-interactive
- All icons (ChevronLeft/Search/Star/MapPin/Clock/Wrench/ShieldCheck/ArrowRight/Loader2) — decorative
- Shop `<img>` — has `alt`

---

### Owner must verify

1. `npm run update` — must pass (0 type errors + worker type-check + production build).
2. Preview at 375/768/1280 — filter chips scroll horizontally on narrow, shop cards stack, hero centered.
3. Keyboard: tab to Back → ring appears; tab to filter chips → ring + `aria-pressed` on the active chip; tab to "Clear filters" (only visible in empty state) → ring. The shop cards are **not keyboard-focusable** (flagged above).
