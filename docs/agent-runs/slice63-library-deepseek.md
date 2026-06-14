# DeepSeek run — 2026-06-14T12:31:19.880Z

- model: deepseek-chat
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

# Plan: LibraryPage premium interaction + a11y pass

**4 controls, className-only + display aria, 0 logic touched.**

---

## Control-by-control analysis

### 1. L312 "Expand all" `<button>` (text-link)

- **Tier:** text-link → `[0.97]`
- **Existing press:** `active:opacity-60` (opacity-only, different property from scale)
- **FLIP?** YES — `transition-opacity` → `transition-all` (scale needs to animate alongside opacity)
- **Competing press?** NO — opacity + scale are different CSS properties, both can coexist
- **Ring:** OUTWARD `ring-ring` (neutral page bg)
- **Aria:** none needed (visible text, one-shot action)

**Delta:**
```
- className="text-ig-gradient hover:opacity-80 active:opacity-60 transition-opacity"
+ className="text-ig-gradient hover:opacity-80 active:opacity-60 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### 2. L320 "Collapse" `<button>` (text-link)

- **Tier:** text-link → `[0.97]`
- **Existing press:** none (no `active:` class)
- **Prior transition:** none, but has real color hover (`hover:text-foreground`)
- **ADD:** `transition-all` (no prior transition, real color hover → need it for smooth scale + color)
- **Ring:** OUTWARD `ring-ring`
- **Aria:** none needed

**Delta:**
```
- className="text-muted-foreground hover:text-foreground"
+ className="text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### 3. L352 GROUP-HEADER accordion `<button>` (MAPPED ×8)

- **Tier:** full-width row, NO own bg (card provides `bg-card`) → BARE row `[0.99]`
- **Existing press:** conditional `hover:bg-secondary/40` (color-only, no scale)
- **FLIP?** YES — `transition-colors` → `transition-all` (adding scale alongside the hover bg)
- **Ring:** **INSET** `ring-ring` — flush top child of `rounded-2xl overflow-hidden` card; outward would be clipped
- **Aria:** **ADD `aria-expanded={isOpen}`** — this is a disclosure/accordion toggle (open/closed). The existing dynamic `aria-label` is good for screen-reader context but `aria-expanded` is the canonical semantic for accordion toggles. Keep both.

**Delta (apply to the STATIC cn() base only, NOT the conditional branch):**
```
// STATIC cn() base changes:
- "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
+ "w-full flex items-center gap-3 px-4 py-3 text-left transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"

// aria addition on the element:
- aria-label={`${g.title}, ${isOpen ? "collapse" : "expand"}`}
+ aria-label={`${g.title}, ${isOpen ? "collapse" : "expand"}`} aria-expanded={isOpen}
```

### 4. L391 SECTION-TILE `<motion.button>` (MAPPED, nested)

- **Existing framer prop:** `whileTap={{ scale: 0.98 }}` → **RING-ONLY** (no competing CSS `active:scale`)
- **Ring:** **OUTWARD** `ring-ring` — sits inside `px-2 pb-2` container (inset by padding from the card's `overflow-hidden` edge), so outward ring is NOT clipped
- **No flip needed** — only a ring added (no new animated CSS prop)
- **No aria** (navigation, visible text)

**Delta:**
```
// Append to existing className:
- className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 active:bg-secondary/80 transition-colors text-left"
+ className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 active:bg-secondary/80 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Summary table

| # | Control | Tier | Scale | Ring | FLIP | Aria |
|---|---------|------|-------|------|------|------|
| 1 | "Expand all" | text-link | `[0.97]` | OUTWARD `ring-ring` | `transition-opacity`→`transition-all` | none |
| 2 | "Collapse" | text-link | `[0.97]` | OUTWARD `ring-ring` | ADD `transition-all` (no prior) | none |
| 3 | Group header accordion | BARE row `[0.99]` | `[0.99]` | **INSET** `ring-ring` | `transition-colors`→`transition-all` | **ADD `aria-expanded={isOpen}`** (keep existing aria-label) |
| 4 | Section tile `motion.button` | whileTap 0.98 → RING-ONLY | none | OUTWARD `ring-ring` | none | none |

---

## Diff

```diff
--- a/src/pages/LibraryPage.tsx
+++ b/src/pages/LibraryPage.tsx
@@ -309,11 +309,11 @@ export default function LibraryPage() {
             <div className="flex gap-1">
               <button
                 type="button"
                 onClick={expandAll}
-                className="text-ig-gradient hover:opacity-80 active:opacity-60 transition-opacity"
+                className="text-ig-gradient hover:opacity-80 active:opacity-60 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 Expand all
               </button>
               <span className="text-muted-foreground/60">·</span>
               <button
                 type="button"
                 onClick={collapseAll}
-                className="text-muted-foreground hover:text-foreground"
+                className="text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 Collapse
               </button>
@@ -349,11 +349,12 @@ export default function LibraryPage() {
               <button
                 type="button"
                 onClick={() => !searching && toggleGroup(g.id)}
                 className={cn(
-                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
+                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                   isOpen ? "" : "hover:bg-secondary/40",
                 )}
                 aria-label={`${g.title}, ${isOpen ? "collapse" : "expand"}`}
+                aria-expanded={isOpen}
               >
                 <div className="shrink-0 h-9 w-9 rounded-xl bg-ig-gradient flex items-center justify-center shadow-sm">
@@ -388,11 +389,11 @@ export default function LibraryPage() {
                           <motion.button
                             key={section.path}
                             type="button"
                             initial={{ opacity: 0, y: 4 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ delay: idx * 0.02, duration: 0.15 }}
                             whileTap={{ scale: 0.98 }}
                             onClick={() => navigate(section.path)}
-                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 active:bg-secondary/80 transition-colors text-left"
+                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 active:bg-secondary/80 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                           >
```

---

## Owner verification

1. **Run `npm run update`** — must pass (type-check + worker + build)
2. **Preview at 375/768/1280** — the accordion headers + section tiles should render cleanly at all widths
3. **Key judgment calls to confirm:**
   - Control 3 (accordion header): **INSET ring** — the button is flush to the `rounded-2xl overflow-hidden` card edge; outward would be clipped. Verified by both advisors.
   - Control 4 (section tile): **OUTWARD ring** — sits inside `px-2 pb-2` padding, not flush to overflow edge. Verified.
   - Control 1: `active:opacity-60` kept alongside new `active:scale-[0.97]` — different properties, no conflict.
