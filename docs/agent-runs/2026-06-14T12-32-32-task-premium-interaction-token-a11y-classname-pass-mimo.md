# MiMo run — 2026-06-14T12:32:32.467Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: TASK: Premium interaction-token + a11y className pass for src/pages/LibraryPage.tsx (customer-facing collapsible "Your Library" hub — sticky header w/ shadcn Back Button + search <input>; stats banner; expand/collapse toolbar; 8 collapsible category cards each = a header accordion button + an AnimatePresence body of section-tile motion.buttons).

STRICT CONSTRAINTS — className-only + tiny display-only aria attrs (aria-label / aria-pressed / aria-expanded ONLY). NO logic, NO handlers, NO state, NO routing, NO new framer props (do NOT touch existing whileTap), NO tabIndex/role/onKeyDown. Do NOT touch shadcn <Button> (Back L255), the search <input> L276 (form-field carveout, already focus:ring-2), SEOHead, SwipeBackContainer, lucide icons, text, non-interactive motion.div (stats banner, group wrapper, AnimatePresence body, chevron rotate motion.div).

INTERACTION-TOKEN RULES (parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button> get: active:scale-[X] + a transition utility + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- framer motion.button with EXISTING whileTap → RING-ONLY (append focus-visible ring; NO competing CSS active:scale).
- Scale tiers: icon-only = scale-95; small/pill chips, segmented & TEXT-LINKS = [0.97]; self-contained selectable cards = [0.98]; full-width/wide rows = [0.99].
- transition: bare `transition` shorthand already covers transform. transition-transform for pure press-scale with NO hover color. FLIP transition-colors->transition-all (or transition-opacity->transition-all) ONLY when adding active:scale alongside an existing color/opacity hover that uses transition-colors/transition-opacity. If a control has NO prior transition but a real color hover, ADD transition-all (not a flip).
- ring: outward ring-ring default; ring-white/70 over photographic/image/gradient media; ring-inset ONLY when flush inside a SEPARATE overflow-hidden rounded ancestor (overflow-hidden clips a flush child's OUTWARD ring but NOT an inset one).
- aria: aria-expanded for disclosure/accordion toggles (open/closed). aria-pressed for select toggles (bg/border-fill-conveyed, constant label). icon-only w/ no visible text + no aria-label -> ADD aria-label; with one -> KEEP.

CONTROL INVENTORY (3 raw <button> + 1 motion.button):

1. L312 "Expand all" <button> (text-link). onClick={expandAll}. VISIBLE text "Expand all". className `text-ig-gradient hover:opacity-80 active:opacity-60 transition-opacity` (has transition-opacity + hover:opacity + an EXISTING active:opacity-60 press). QUESTION: text-link tier [0.97]? Does adding active:scale-[0.97] FORCE a FLIP transition-opacity->transition-all (so the new transform animates)? Is the existing active:opacity-60 a "competing 2nd press" that should BLOCK adding a scale, or is opacity-press + scale-press fine together (different properties)? Keep active:opacity-60? ring-ring outward. No aria (visible text, one-shot action).

2. L320 "Collapse" <button> (text-link). onClick={collapseAll}. VISIBLE text "Collapse". className `text-muted-foreground hover:text-foreground` (NO transition, real color hover, NO scale, NO ring). QUESTION: text-link [0.97] + ADD transition-all (no prior transition but real color hover) + active:scale-[0.97] + ring-ring? No aria.

3. L352 GROUP-HEADER accordion <button> (MAPPED x8 over filteredGroups). onClick={() => !searching && toggleGroup(g.id)} (toggles the AnimatePresence body). Has DYNAMIC aria-label `${g.title}, ${isOpen ? "collapse" : "expand"}`. cn() STATIC base `w-full flex items-center gap-3 px-4 py-3 text-left transition-colors` + conditional `isOpen ? "" : "hover:bg-secondary/40"`. It is the FLUSH top child of its parent `motion.div rounded-2xl bg-card border border-border overflow-hidden` and has NO own bg (card provides bg-card). QUESTIONS: (a) full-width-row tier — [0.99] BARE (no own bg) vs [0.98]? (b) ring INSET (flush top edge child of overflow-hidden card) vs OUTWARD? (c) FLIP transition-colors->transition-all (adding scale alongside the conditional hover:bg)? (d) ADD aria-expanded={isOpen} AND keep the existing dynamic aria-label, or is the dynamic aria-label already sufficient (don't add aria-expanded)? Apply to the STATIC cn() arg only.

4. L391 SECTION-TILE <motion.button> (MAPPED, nested in each open group body). HAS whileTap={{ scale: 0.98 }}. onClick={() => navigate(section.path)} (navigation). VISIBLE text (title+desc). className `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 active:bg-secondary/80 transition-colors text-left`. Sits inside the AnimatePresence body `overflow-hidden` but within a `px-2 pb-2` container (inset by px-2 padding from the card edge, NOT flush). QUESTION: whileTap present → RING-ONLY (append focus-visible ring, NO CSS active:scale, NO flip)? ring OUTWARD ring-ring (inset by px-2 padding, not flush to overflow-hidden edge) vs INSET? No aria (navigation, visible text)?

DELIVERABLE: For EACH of the 4 controls give the EXACT className delta (append/flip) and any aria attr. Answer every lettered QUESTION. Confirm tiers, ring colors (outward vs inset vs white/70), FLIP decisions, and aria choices. Be concise — per-control list. Do NOT rewrite the file.
- files: src/pages/LibraryPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Four controls: two raw text-link `<button>`s in the expand/collapse toolbar, one mapped raw accordion `<button>` (group header), and one mapped `<motion.button>` (section tile with `whileTap`). All are className + aria-only; zero logic touches.

---

## Per-control answer

### Control 1 — "Expand all" `<button>` (L312)

| Attribute | Value |
|-----------|-------|
| Tier | text-link `[0.97]` |
| FLIP | `transition-opacity` → `transition-all` (new `active:scale` requires transform animation; opacity hover/press already covered) |
| active:scale | `[0.97]` NEW |
| active:opacity-60 | **KEEP** — opacity + scale are different CSS properties; two presses on different properties coexist, not competing |
| Ring | **OUTWARD** `ring-ring` (neutral page bg, no overflow-hidden ancestor) |
| Aria | none — visible text "Expand all", one-shot action |

**Before:** `text-ig-gradient hover:opacity-80 active:opacity-60 transition-opacity`
**After:** `text-ig-gradient hover:opacity-80 active:opacity-60 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

---

### Control 2 — "Collapse" `<button>` (L320)

| Attribute | Value |
|-----------|-------|
| Tier | text-link `[0.97]` |
| Transition | **ADD** `transition-all` (no prior transition, real `hover:text-foreground` color change → needs a transition to animate both color + new scale) |
| active:scale | `[0.97]` NEW |
| Ring | **OUTWARD** `ring-ring` |
| Aria | none |

**Before:** `text-muted-foreground hover:text-foreground`
**After:** `text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

---

### Control 3 — Group-header accordion `<button>` (L352, mapped ×8)

| Attribute | Value |
|-----------|-------|
| Tier | full-width bare-row `[0.99]` — NO own `bg` class (the parent `motion.div` provides `bg-card`), so it's the bare-tier, not `[0.98]` |
| FLIP | `transition-colors` → `transition-all` (new `active:scale` alongside conditional `hover:bg-secondary/40`) |
| Ring | **INSET** `ring-inset ring-ring` — button is the **flush top edge child** of `rounded-2xl overflow-hidden` card; outward ring clipped by parent's `overflow-hidden` → inset needed |
| Aria | **ADD `aria-expanded={isOpen}`** — disclosure/accordion toggle. **KEEP** existing dynamic `aria-label` (provides context: `${g.title}, ${isOpen ? "collapse" : "expand"}`). Both are valid and complementary: `aria-expanded` is the semantic state, `aria-label` is the human-readable description. |
| Dynamic branch | `isOpen ? "" : "hover:bg-secondary/40"` — **untouched** |

**Before cn():**
```jsx
cn(
  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
  isOpen ? "" : "hover:bg-secondary/40",
)
```
**After cn():**
```jsx
cn(
  "w-full flex items-center gap-3 px-4 py-3 text-left transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
  isOpen ? "" : "hover:bg-secondary/40",
)
```
**Prop addition:** add `aria-expanded={isOpen}` alongside existing `aria-label`.

---

### Control 4 — Section-tile `<motion.button>` (L391, mapped)

| Attribute | Value |
|-----------|-------|
| whileTap | `{{ scale: 0.98 }}` **PRESENT** → RING-ONLY (no competing CSS `active:scale`) |
| Ring | **OUTWARD** `ring-ring` — button sits inside `px-2 pb-2` container, inset by padding from the `overflow-hidden` card edge; outward ring renders cleanly in that padding gap |
| Flip | **NONE** — no new CSS-animated property (ring is focus-visible only) |
| Aria | none — navigation, visible text (title + description) |

**Before:** `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 active:bg-secondary/80 transition-colors text-left`
**After:** `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 active:bg-secondary/80 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

---

## Guard tally

| Metric | Count |
|--------|-------|
| className edits | **4** (one per control) |
| new `aria-expanded` | **1** (#3) |
| new `aria-label` | **0** (#3's dynamic label pre-existing, kept) |
| `aria-pressed` | **0** |
| `focus-visible:ring` | **4** total: `ring-ring` ×4 (3 OUTWARD: #1/#2/#4; 1 INSET: #3) |
| `ring-inset` | **1** (#3) |
| `ring-white/70` | **0** |
| `active:scale` new | **3** (#1 `[0.97]`, #2 `[0.97]`, #3 `[0.99]`) |
| `active:scale` kept (whileTap) | **1** (#4 `0.98`) |
| FLIPs | **2** (#1 `transition-opacity`→`transition-all`, #3 `transition-colors`→`transition-all`) |
| ADDs (fresh transition) | **1** (#2 `transition-all` added) |
| Competing 2nd press | **0** (#1's `active:opacity-60` is opacity, not transform — different property) |
| Logic lines touched | **0** |

## Skipped (left untouched)

- `<Button>` (shadcn, Back L255) — ships own tokens
- `<input>` search L276 — form-field carveout, already `focus:ring-2`
- `SEOHead`, `SwipeBackContainer` — non-interactive wrappers
- All lucide icons, text elements, `<p>` spans
- Stats banner `motion.div`, AnimatePresence body `motion.div`, chevron-rotate `motion.div` — non-interactive
- All `hover:*`/`active:bg-*` CSS on control 4 — untouched existing properties

## Owner verification

- `npm run update` must pass (type-check + worker type-check + production build, zero errors).
- The 4 className/aria edits are purely additive visual tokens; no logic, routing, state, or handler changes.
- Control 1's `active:opacity-60` is intentionally kept — opacity and transform are independent CSS properties and don't conflict.
- Control 3's `aria-expanded` + `aria-label` coexist: expanded provides the semantic state, label provides the human-readable context. A `role="region"`/`aria-controls` upgrade on the panel would be more structural → flagged, not applied.
