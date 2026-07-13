# MiMo run — 2026-06-14T06:51:13.249Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/MonetizationArticlesPage.tsx (919-line "ZIVO Creator Academy" — a static articles hub: sticky header [Back icon + Creator-Academy title that swaps to a borderless inline SEARCH input + a Search-toggle icon] + a horizontally-scrolling TAB rail [10 single-select category tabs, border-b-2 underline style] + an animated tab/search content area + sections of article rows; each article row is a motion.button inside a bordered overflow-hidden card; tapping a row navigates to the article detail page). NO Supabase — pure static-data + client-side search filter + react-router navigate. RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState (setActiveTab/setSearchOpen/setSearchQuery), the article-slug navigate target, byte-identical. Don't add a SECOND competing press effect. Don't churn already-polished controls. Don't renumber an existing scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when the control is a flush edge child of a rounded overflow-hidden PARENT (so an outward box-shadow ring would be clipped).
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT = ring-white/70.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab active:scale-[0.97]; wide full-width row/card WITH its own bordered/filled surface active:scale-[0.98]; BARE full-width row NO own surface (relies on a parent card) active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border OR there's an existing active:bg color wash. FLIP RULE: a control with transition-colors GAINING a NEW active:scale MUST flip to transition-all. An active:bg-* press wash is a COLOR press (NOT a competing scale) → adding active:scale alongside it is fine (not a "second competing press"); the "no second press" rule is about framer whileTap vs CSS active:scale (two transforms).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter/tab OR a two-way toggle whose on/off is bg-conveyed. aria-expanded on a disclosure trigger that reveals/hides UI. NOT aria-pressed on one-shot actions (nav, set-value).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L795 Header Back button (raw `<button>`, icon-only, onClick navigate(-1)): `p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation`. NO transition/scale/focus/label. Parent sticky header `bg-background/80` (neutral). → plan: ADD aria-label="Back" + APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only 95; transition-all — hover:bg + new scale; OUTWARD ring-ring neutral header). Confirm.

B) L810 Search-toggle button (raw `<button>`, icon-only Search icon [constant, not dynamic], onClick `setSearchOpen(!searchOpen); setSearchQuery("")` — toggles the inline search input open/closed, swapping the title↔input): `p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation`. NO transition/scale/focus/label. → plan: ADD aria-label="Search" + APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only 95; transition-all; OUTWARD ring-ring). ARIA QUESTION: it reveals/hides the search input — is `aria-expanded={searchOpen}` warranted (disclosure that toggles UI visibility), or is plain aria-label enough (the Search icon is constant, NOT a dynamic Open/Close label)? Decide aria-expanded vs none.

C) L822 TAB button (raw `<button>`, mapped over TABS, single-select category tab, border-b-2 underline style, selection bg-conveyed `border-foreground text-foreground` [active] vs `border-transparent text-muted-foreground`, onClick setActiveTab(tab.id)): base `shrink-0 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap`. Has transition-colors, NO scale/focus/aria. Parent neutral header rail (`overflow-x-auto`). → plan: ADD `aria-pressed={activeTab === tab.id}` (persistent single-select segmented tab — NO role=tablist/tab structure present, so aria-pressed is the house pattern over aria-selected) + FLIP transition-colors→transition-all + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (segmented filter/tab 0.97; FLIP — transition-colors gaining new scale; OUTWARD ring-ring neutral header). Confirm aria-pressed (vs aria-selected/none) + FLIP + tier.

D) L890 Article ROW (`motion.button`, mapped over section.articles, NO whileTap, one-shot navigate to the article slug, full-width row that is a FLUSH child of a `rounded-2xl border border-border/40 bg-card overflow-hidden divide-y divide-border/30` card container [the row has NO own border/fill — the card is the surface; the row has an `active:bg-muted/20` press wash]): base `w-full flex items-start gap-3 p-4 text-left touch-manipulation active:bg-muted/20 transition-colors`. Has transition-colors + active:bg wash, NO scale/focus/aria. → plan: FLIP transition-colors→transition-all + APPEND `active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` (BARE full-width row in a parent card → tier [0.99]; FLIP — transition-colors gaining new scale [active:bg wash is a color press, not a competing scale, so adding scale is fine]; **ring-INSET** because the row is a flush edge child of the rounded `overflow-hidden` card → an outward box-shadow ring would be clipped at the card edges; ring-ring neutral bg-card; NO aria — one-shot nav). Confirm tier [0.99] vs [0.98], ring-inset vs outward, FLIP, and that adding active:scale alongside the existing active:bg is NOT a "second competing press".

ALSO CONFIRM I should LEAVE these: the borderless inline SEARCH `<input>` L799 (raw `<input>` with `outline-none` and NO focus-ring — a transparent flush field in the header; adding a box ring would visually change a borderless inline search field — flag as a11y gap but LEAVE to avoid churn? or is a focus-visible ring warranted?); the subtab pills `<span>` L856 (non-interactive, NO onClick — purely visual category labels); ZivoMobileNav (own component, own tokens); all article icons/iconBg tiles + SEOHead (decorative/non-visual).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Note C/D are mapped templates (single edit hits every tab / every article row); A/B are one each.
- files: src/pages/MonetizationArticlesPage.tsx

---

## Plan

Four mapped/one-off controls to edit, two aria attrs to add. One structural aria question resolved. One LEAVE with flag. Clean pass.

---

## (1) Per-control decisions

### A — Header Back button (icon-only `navigate(-1)`)
- **APPEND:** `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **ADD:** `aria-label="Back"`
- Press tier: icon-only `95` ✓
- Transition: `transition-all` (hover:bg + new scale both animate) ✓
- Ring: OUTWARD `ring-ring` — parent sticky header `bg-background/80` neutral ✓
- No FLIP needed — no prior transition class ✓

### B — Search-toggle button (disclosure for inline search)
- **APPEND:** `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **ADD:** `aria-label="Search"` + `aria-expanded={searchOpen}`
- **Decision: YES `aria-expanded`** — this is a disclosure trigger. It reveals/hides the inline search input (swapping the title with a `<input>`). `aria-expanded` is the correct semantic for a button that toggles UI visibility, regardless of whether the icon label is dynamic or constant. The icon being constant Search doesn't negate the disclosure pattern.
- Press tier: icon-only `95` ✓
- Transition: `transition-all` (hover:bg + new scale) ✓
- Ring: OUTWARD `ring-ring` neutral header ✓

### C — TAB button (mapped, single-select category tab)
- **FLIP:** `transition-colors` → `transition-all`
- **APPEND:** `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **ADD:** `aria-pressed={activeTab === tab.id}`
- Press tier: segmented filter/tab `[0.97]` ✓
- FLIP: mandatory — `transition-colors` gaining new `active:scale` ✓
- Ring: OUTWARD `ring-ring` — parent neutral header rail ✓
- **`aria-pressed` confirmed over `aria-selected`** — no `role="tablist"`/`role="tab"` structure exists; `aria-pressed` is the established house pattern for bg-conveyed single-selects on pages that don't use semantic tab roles (matches every other tab/filter pattern across 90+ slices). Single edit hits all 10 tabs.

### D — Article ROW (`motion.button`, mapped, flush child of `rounded-2xl overflow-hidden` card)
- **FLIP:** `transition-colors` → `transition-all`
- **APPEND:** `active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`
- Press tier: BARE full-width row (NO own border/fill — relies on parent card) → `[0.99]` ✓ (NOT `[0.98]` which is for rows WITH their own bordered/filled surface)
- FLIP: mandatory — `transition-colors` gaining new `active:scale`; the existing `active:bg-muted/20` is a COLOR press, not a competing scale → adding `active:scale` alongside it is fine per house rules (the "no second press" rule is about framer `whileTap` vs CSS `active:scale`, NOT two CSS properties) ✓
- Ring: **INSET** — the row is a flush edge child of a `rounded-2xl ... overflow-hidden` card; an outward `box-shadow` ring would be clipped at the rounded card corners ✓
- Ring color: `ring-ring` — parent card `bg-card` neutral ✓
- NO aria — one-shot navigation ✓
- Single edit hits every article row in every section/tab.

---

## (2) LEAVE list

| Control | Decision | Reason |
|---------|----------|--------|
| `<input>` L799 (inline search) | **LEAVE** | Has `outline-none`, no focus-ring. Adding a box-shadow ring would visually change a borderless inline search field. **A11y gap flagged**: keyboard users get no focus indicator. Fix separately (e.g., a subtle `focus-visible:bg-muted/30` wash that doesn't break the borderless design, or accept the browser's native outline after removing `outline-none`). |
| Subtab pills `<span>` L856 | LEAVE | Non-interactive, no `onClick` |
| ZivoMobileNav | LEAVE | Own component, own tokens |
| Article iconBg/iconColor tiles | LEAVE | Decorative |
| SEOHead | LEAVE | Non-visual |

---

## (3) Proposed diff — `src/pages/MonetizationArticlesPage.tsx`

### A — Back button (~L795)

**Before:**
```tsx
<button
  onClick={() => navigate(-1)}
  className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation"
>
```

**After:**
```tsx
<button
  onClick={() => navigate(-1)}
  aria-label="Back"
  className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
```

### B — Search-toggle (~L810)

**Before:**
```tsx
<button
  onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}
  className="p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation"
>
```

**After:**
```tsx
<button
  onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}
  aria-label="Search"
  aria-expanded={searchOpen}
  className="p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
```

### C — TAB button (mapped template, ~L822) — single edit hits all 10

**Before:**
```tsx
<button
  key={tab.id}
  onClick={() => setActiveTab(tab.id)}
  className={`shrink-0 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${
    activeTab === tab.id
      ? "border-foreground text-foreground"
      : "border-transparent text-muted-foreground"
  }`}
>
```

**After:**
```tsx
<button
  key={tab.id}
  onClick={() => setActiveTab(tab.id)}
  aria-pressed={activeTab === tab.id}
  className={`shrink-0 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all whitespace-nowrap active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    activeTab === tab.id
      ? "border-foreground text-foreground"
      : "border-transparent text-muted-foreground"
  }`}
>
```

Changes: `transition-colors` → `transition-all` (FLIP), append `active:scale-[0.97]` + focus ring into the static base (before the ternary), add `aria-pressed`.

### D — Article ROW (mapped template) — single edit hits every article in every section

**Before:**
```tsx
<motion.button
  key={article.title}
  onClick={() => navigate(`/monetization/articles/${article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`)}
  className="w-full flex items-start gap-3 p-4 text-left touch-manipulation active:bg-muted/20 transition-colors"
>
```

**After:**
```tsx
<motion.button
  key={article.title}
  onClick={() => navigate(`/monetization/articles/${article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`)}
  className="w-full flex items-start gap-3 p-4 text-left touch-manipulation active:bg-muted/20 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
>
```

Changes: `transition-colors` → `transition-all` (FLIP), append `active:scale-[0.99]` + inset focus ring. The `active:bg-muted/20` press wash remains as-is (color press, not competing scale).

---

## (4) Guard summary

| Metric | Count |
|--------|-------|
| `−`/`+` className edits | **4** (A, B, C, D) |
| New aria attrs | **3** (A `aria-label`, B `aria-label` + `aria-expanded`) |
| `aria-pressed` | 1 (C — template, all 10 tabs) |
| `aria-expanded` | 1 (B) |
| `aria-label` | 2 (A + B) |
| `focus-visible:ring` | 4, all `ring-ring` |
| `ring-inset` | 1 (D only — flush child of `overflow-hidden` rounded card) |
| `ring-white/70` | 0 |
| FLIPs | 2 (C + D `transition-colors`→`transition-all`) |
| `active:scale-95` | 2 (A + B icon-only) |
| `active:scale-[0.97]` | 1 (C segmented tab) |
| `active:scale-[0.99]` | 1 (D bare row) |
| Logic lines touched | **0** |

---

## (5) Verify / deploy

- Run `npm run update` (type-check + worker type-check + production build) — must pass at 0 errors.
- Preview at 375/768/1280: tab rail scrolls horizontally, article rows focus-ring visible on keyboard nav, Back/Search get press scale + ring.
- **Owner must commit/deploy.** Don't `git commit` without owner approval.
