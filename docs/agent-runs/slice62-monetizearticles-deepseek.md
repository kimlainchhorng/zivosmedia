# DeepSeek run — 2026-06-14T06:50:23.833Z

- model: deepseek-chat
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

Looking at the file, I can see it's truncated at the end. Let me analyze the controls based on what's visible and the patterns described.

## Plan

Apply premium interaction + a11y tokens to 4 controls in `src/pages/MonetizationArticlesPage.tsx`:
- **A)** Header Back button (icon-only)
- **B)** Search-toggle button (icon-only, disclosure)
- **C)** TAB buttons (mapped, single-select segmented)
- **D)** Article ROW buttons (mapped, bare full-width in overflow-hidden card)

**LEAVE:** search `<input>` (borderless inline), subtab pills `<span>` (non-interactive), ZivoMobileNav, icons/SEOHead.

---

## Per-control analysis

### A) L795 Header Back `<button>`
**Before:** `p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation`
**After:** `p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
**Aria:** `aria-label="Back"`
**Ring:** OUTWARD `ring-ring` (neutral `bg-background/80` header parent)
**Tier:** icon-only `95`
**Transition:** `transition-all` (hover:bg + new scale, no prior transition → add `transition-all`)
**FLIP:** N/A (no prior transition class)

### B) L810 Search-toggle `<button>`
**Before:** `p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation`
**After:** `p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
**Aria:** `aria-label="Search"` + **`aria-expanded={searchOpen}`** — YES, warranted. This is a disclosure trigger that reveals/hides the inline search input (swapping title↔input). The Search icon is constant (not dynamic Open/Close), so `aria-expanded` correctly conveys the toggle state to AT.
**Ring:** OUTWARD `ring-ring` (neutral header)
**Tier:** icon-only `95`
**Transition:** `transition-all` (hover:bg + new scale)
**FLIP:** N/A

### C) L822 TAB `<button>` (mapped)
**Before:** `shrink-0 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap`
**After:** `shrink-0 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all whitespace-nowrap active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
**Aria:** `aria-pressed={activeTab === tab.id}` — YES. This is a persistent single-select segmented tab filter (no `role="tablist"`/`role="tab"` structure present, so `aria-pressed` is the correct house pattern over `aria-selected`).
**Ring:** OUTWARD `ring-ring` (neutral `overflow-x-auto` rail parent)
**Tier:** segmented filter/tab `[0.97]`
**Transition:** `transition-all` (FLIP from `transition-colors` — gaining new scale)
**FLIP:** YES — `transition-colors` → `transition-all`

### D) L890 Article ROW `<motion.button>` (mapped)
**Before:** `w-full flex items-start gap-3 p-4 text-left touch-manipulation active:bg-muted/20 transition-colors`
**After:** `w-full flex items-start gap-3 p-4 text-left touch-manipulation active:bg-muted/20 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`
**Aria:** none (one-shot nav)
**Ring:** **INSET** `ring-ring` — the row is a flush edge child of the `rounded-2xl overflow-hidden` card; an outward box-shadow ring would be clipped at the card edges.
**Tier:** BARE full-width row NO own surface (relies on parent card) → `[0.99]`
**Transition:** `transition-all` (FLIP from `transition-colors` — gaining new scale alongside existing `active:bg-muted/20` color press)
**FLIP:** YES — `transition-colors` → `transition-all`
**Second press check:** Adding `active:scale-[0.99]` alongside the existing `active:bg-muted/20` is NOT a "second competing press" — `active:bg` is a COLOR press wash, not a CSS transform. The "no second press" rule is about framer `whileTap` vs CSS `active:scale` (two transforms). This is fine.

---

## LEAVE confirmation

- **Search `<input>` L799** — borderless inline field with `outline-none`. Adding a focus-visible ring would visually change its appearance (a box ring around a flush inline input). **Flag as a11y gap but LEAVE** to avoid churn — the input is a transparent field in the header, not a standard form control.
- **Subtab pills `<span>` L856** — non-interactive, NO onClick. Purely visual category labels. **LEAVE.**
- **ZivoMobileNav** — own component with own tokens. **LEAVE.**
- **Icons/iconBg/SEOHead** — decorative/non-visual. **LEAVE.**

---

## Diff

```diff
--- a/src/pages/MonetizationArticlesPage.tsx
+++ b/src/pages/MonetizationArticlesPage.tsx
@@ -792,7 +792,7 @@ export default function MonetizationArticlesPage() {
         {/* Sticky header */}
         <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
           <div className="flex items-center justify-between px-4 h-14">
-            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
+            <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
               <ArrowLeft className="w-5 h-5" />
             </button>
 
@@ -807,7 +807,7 @@ export default function MonetizationArticlesPage() {
             )}
 
             {/* Search toggle */}
-            <button onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }} className="p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation">
+            <button onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }} aria-label="Search" aria-expanded={searchOpen} className="p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
               <Search className="w-5 h-5" />
             </button>
           </div>
@@ -819,7 +819,7 @@ export default function MonetizationArticlesPage() {
             {TABS.map((tab) => (
               <button
                 key={tab.id}
-                className={`shrink-0 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${
+                className={`shrink-0 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all whitespace-nowrap active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                   activeTab === tab.id
                     ? "border-foreground text-foreground"
                     : "border-transparent text-muted-foreground hover:text-foreground/80"
@@ -827,6 +827,7 @@ export default function MonetizationArticlesPage() {
                 onClick={() => setActiveTab(tab.id)}
+                aria-pressed={activeTab === tab.id}
               >
                 {tab.label}
               </button>
@@ -887,7 +888,7 @@ export default function MonetizationArticlesPage() {
                     <motion.button
                       key={article.title}
                       onClick={() => navigate(`/creator-academy/${article.title.toLowerCase().replace(/\s+/g, "-")}`)}
-                      className="w-full flex items-start gap-3 p-4 text-left touch-manipulation active:bg-muted/20 transition-colors"
+                      className="w-full flex items-start gap-3 p-4 text-left touch-manipulation active:bg-muted/20 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                       whileHover={{ x: 4 }}
                     >
```

---

## Summary

| Control | Edits | Aria | Ring | Tier | FLIP |
|---------|-------|------|------|------|------|
| A) Back button | 1 className + 1 aria | `aria-label="Back"` | OUTWARD ring-ring | `95` | No |
| B) Search toggle | 1 className + 2 aria | `aria-label="Search"` + `aria-expanded={searchOpen}` | OUTWARD ring-ring | `95` | No |
| C) TAB buttons (×10) | 1 className + 1 aria (single edit) | `aria-pressed={activeTab === tab.id}` | OUTWARD ring-ring | `[0.97]` | YES |
| D) Article rows (×many) | 1 className (single edit) | none | **INSET** ring-ring | `[0.99]` | YES |

**Total: 4 className edits + 4 aria attrs. 0 logic lines touched.**
