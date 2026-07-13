# MiMo run — 2026-06-14T10:11:53.599Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopDocumentsPage.tsx (259-line merchant "Documents" page inside <AppLayout title="Documents" hideHeader>; useAuth + supabase storage (shop-documents bucket) + react-query useQuery "shop-documents"; upload via supabase.storage.upload + functions.invoke("shop-ops-record-submit"); delete via functions.invoke("shop-ops-record-manage"); category + filter chip state; framer-motion AnimatePresence upload form + animated list). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, storage, functions.invoke, react-query keys, href/target/rel, disabled, setState byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition (add ring only). Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn AppLayout. LEAVE raw native form fields with their existing focus ring.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring. An OUTWARD ring on a control with its OWN tinted/gradient fill (bg-primary/10, bg-ig-gradient, bg-muted/40) STILL renders against the neutral PARENT → ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover/active bg/text(color)/border/opacity ON THE ELEMENT ITSELF (or an existing transition-colors that animates a conditional color change ON ITSELF).
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover/active color/bg/border ON ITSELF (or an animated conditional color via transition-colors) → use transition-all (FLIP).
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter. aria-expanded on a disclosure.

NINE edits applied — confirm each CORRECT or NEEDS-FIX:

A) L151 BACK icon button — was `w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center` (icon-only ArrowLeft; onClick navigate(-1); NO hover/transition/scale/ring; sticky bg-background/80 header neutral; NO aria) → ADDED aria-label="Go back" + icon-only active:scale-95 + transition-transform (scale sole prop, no hover on itself → NOT flip) + ring. Final: `w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Go back".

B) L155 PLUS/upload-trigger icon button — was `w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center` (icon-only Plus; onClick fileInputRef.click(); own tinted bg-primary/10; NO hover/transition/scale/ring; neutral header; NO aria) → ADDED aria-label="Upload document" + active:scale-95 + transition-transform + ring (OUTWARD ring-ring against neutral header despite own bg-primary/10). Final: `w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Upload document".

C) L169 X-CLOSE icon button — was a BARE `<button type="button" onClick={resetForm}>` with NO className at all (icon-only X glyph; onClick resetForm; in the form card header) → ADDED className from scratch: rounded-full (so the ring traces tightly) + aria-label="Close" + active:scale-95 + transition-transform + ring. Final className: `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Close". (Confirm: adding a className where none existed is in-scope; rounded-full + scale-95 + ring is the right minimal premium for a bare icon button; no padding added to preserve layout.)

D) L182 CATEGORY chips (in upload form) — was `cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-colors", category === c ? "bg-ig-gradient text-white border-primary" : "border-border bg-muted/40")` (visible text label; onClick setCategory(c); a PERSISTENT SINGLE-SELECT category picker; transition-colors animating the conditional selected-bg ON ITSELF; NO scale/ring; NO aria) → ADDED aria-pressed={category === c} (single-select segmented toggle) + chip-tier active:scale-[0.97] + FLIP transition-colors→transition-all (conditional bg color animates ON ITSELF + new scale) + ring. Final base classes: `px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + conditional + aria-pressed={category === c}.

E) L190 CANCEL action button (form) — was `flex-1 py-2.5 rounded-xl border border-border/40 text-sm font-medium` (visible text "Cancel"; onClick resetForm; flex-1 substantial button with its OWN surface (border outline); NO hover/transition/scale/ring) → ADDED active:scale-[0.98] (wide button WITH own surface tier) + transition-transform (scale sole prop, no hover on itself → NOT flip) + ring; NO aria (visible text). Final: `flex-1 py-2.5 rounded-xl border border-border/40 text-sm font-medium transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

F) L191 UPLOAD action button (form) — was `flex-1 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2` (visible text; onClick handleUpload; disabled={uploading}; flex-1 substantial button with OWN gradient surface; has disabled:opacity-50; NO hover/transition/scale/ring) → ADDED active:scale-[0.98] + transition-transform + ring; NO aria (visible text). Final: `flex-1 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. **QUESTION: the element has disabled:opacity-50. Is transition-transform correct, or does disabled:opacity (an opacity change ON the element) force transition-all? My read: disabled:opacity is a static disabled-STATE class, NOT a hover/active interaction → scale stays the sole INTERACTIVE animated prop → transition-transform (matching the prior bg-ig-gradient Save-button pattern). Confirm or correct.**

G) L204 FILTER chips (category filter bar) — was `cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", filterCat === c ? "bg-ig-gradient text-white border-primary" : "border-border/50 bg-muted/30")` (visible text; onClick setFilterCat(c); PERSISTENT SINGLE-SELECT segmented filter (all + 5 categories); transition-colors animating conditional selected-bg ON ITSELF; NO scale/ring; NO aria) → ADDED aria-pressed={filterCat === c} + chip-tier active:scale-[0.97] + FLIP transition-colors→transition-all + ring. Final base: `shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + conditional + aria-pressed={filterCat === c}.

H) L240 DOWNLOAD anchor — was `<a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-muted transition-colors">` (icon-only Download; KEEP href/target/rel byte-identical; hover:bg-muted ON ITSELF; transition-colors; own surface bg-muted/40; NO scale/ring; NO aria) → ADDED aria-label="Download" + icon-only active:scale-95 + FLIP transition-colors→transition-all (hover:bg ON ITSELF + new scale) + ring (OUTWARD ring-ring against the neutral Card parent). Final: `w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Download".

I) L245 DELETE icon button — was `w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-colors` (icon-only Trash2; onClick handleDelete; hover:bg-red-500/10 + hover:text-red-500 ON ITSELF; transition-colors; own surface bg-muted/40; NO scale/ring; NO aria) → ADDED aria-label="Delete" + icon-only active:scale-95 + FLIP transition-colors→transition-all (hover color ON ITSELF + new scale) + ring. Final: `w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Delete".

ALSO CONFIRM I should LEAVE: L158 hidden `<input type="file" className="hidden">` (no visual, no ring); L176 + L178 raw native `<input>` text fields (doc name / employee name — they ALREADY have `focus:ring-1 focus:ring-primary/30`; house standard = LEAVE native form fields with their existing focus ring, do NOT swap to focus-visible:ring-ring); AppLayout shell; all motion.div wrappers with no onClick (form L165, list items L226 — animation only); all lucide icons (decorative); the FileText category-color avatar div L228 (presentational, not a button); the h1 + all <p>/<span> text; the loading + empty-state. No clickable divs with onClick beyond those edited.

Be concise and exact. Return the precise final className after-string for each of A–I + every aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) F — disabled:opacity-50 → transition-transform (NOT transition-all) — correct? (2) C — adding a className from scratch to a bare icon button (rounded-full + scale-95 + ring) — correct and in-scope? (3) D + G — aria-pressed on the single-select category/filter chips + FLIP transition-colors→transition-all (conditional bg animates ON ITSELF) — correct? (4) E + F — scale-[0.98] full-width-own-surface tier for the flex-1 action buttons (vs [0.97] pill) — correct? (5) the 2 native text inputs L176/L178 — confirm LEAVE with their existing focus:ring-1 (do NOT add focus-visible:ring-ring).
- files: src/pages/app/shop/ShopDocumentsPage.tsx

---

## Audit: ShopDocumentsPage — 9 Edits (A–I)

**File:** `src/pages/app/shop/ShopDocumentsPage.tsx`

---

### Verdict: ALL 9 CORRECT — ZERO fixes needed

| Edit | Control | Scale tier | Transition | Ring | New aria | Verdict |
|------|---------|-----------|------------|------|----------|---------|
| **A** | Back icon button | `scale-95` icon | `transition-transform` (sole prop) | `ring-ring` OUTWARD (parent=header `bg-background/80`) | `aria-label="Go back"` | ✅ |
| **B** | Plus/upload icon button | `scale-95` icon | `transition-transform` (sole prop) | `ring-ring` OUTWARD (parent=header, own fill `bg-primary/10` irrelevant) | `aria-label="Upload document"` | ✅ |
| **C** | X-close icon button | `scale-95` icon | `transition-transform` (sole prop) | `ring-ring` OUTWARD (parent=`bg-card` form) | `aria-label="Close"` | ✅ |
| **D** | Category chips (form) | `scale-[0.97]` chip | `transition-all` FLIP (conditional bg ON ITSELF) | `ring-ring` OUTWARD (parent=`bg-card` form) | `aria-pressed={category===c}` | ✅ |
| **E** | Cancel button | `scale-[0.98]` wide-own-surface | `transition-transform` (sole prop) | `ring-ring` OUTWARD (parent=`bg-card` form) | none (visible text) | ✅ |
| **F** | Upload button | `scale-[0.98]` wide-own-surface | `transition-transform` (sole prop) | `ring-ring` OUTWARD (parent=`bg-card` form) | none (visible text) | ✅ |
| **G** | Filter chips (bar) | `scale-[0.97]` chip | `transition-all` FLIP (conditional bg ON ITSELF) | `ring-ring` OUTWARD (parent=`bg-background` body) | `aria-pressed={filterCat===c}` | ✅ |
| **H** | Download `<a>` | `scale-95` icon | `transition-all` FLIP (`hover:bg-muted` ON ITSELF) | `ring-ring` OUTWARD (parent=`bg-card` row) | `aria-label="Download"` | ✅ |
| **I** | Delete button | `scale-95` icon | `transition-all` FLIP (`hover:bg-red-500/10` + `hover:text-red-500` ON ITSELF) | `ring-ring` OUTWARD (parent=`bg-card` row) | `aria-label="Delete"` | ✅ |

---

### Answers to the 5 flagged questions

**(1) F — `disabled:opacity-50` → `transition-transform` (NOT `transition-all`) — correct?**
**YES, CORRECT.** `disabled:opacity-50` is a **static state pseudo-class**, not an interactive `hover:`/`active:` pseudo. It doesn't animate on user gesture — it's a one-way prop-driven state change (`uploading` toggles the `disabled` attribute). Scale remains the sole **interactive** animated prop → `transition-transform`. Matches the established `bg-ig-gradient` Save-button pattern.

**(2) C — adding a className from scratch to a bare button — correct and in-scope?**
**YES, CORRECT.** The rules say "className strings + display-only aria-* ONLY" — adding a `className` attribute where none existed is still a className edit (not a logic change). `rounded-full` for tight ring tracing + `scale-95` + `transition-transform` + ring is the minimal premium for a bare icon button. No padding added → layout preserved byte-identically.

**(3) D + G — `aria-pressed` on single-select chips + FLIP `transition-colors`→`transition-all` — correct?**
**YES, CORRECT.** Both are **persistent single-select segmented pickers** (category in the form, filter bar). `aria-pressed={selected}` is the house pattern (not `aria-expanded`, which is for disclosure). The conditional `bg-ig-gradient text-white` vs `bg-muted/40` animates ON ITSELF via `transition-colors` → adding `active:scale` requires FLIP to `transition-all` so both the color and the scale animate.

**(4) E + F — `scale-[0.98]` for `flex-1` action buttons — correct?**
**YES, CORRECT.** Both are `flex-1` (substantial wide buttons, functionally `w-full`). E has `border border-border/40` (own surface = border outline). F has `bg-ig-gradient` (own surface = gradient fill). Both → `[0.98]` wide-own-surface tier, NOT `[0.97]` chip/pill (those are intrinsic-width `px-*` controls).

**(5) L176/L178 native text inputs — confirm LEAVE with existing `focus:ring-1 focus:ring-primary/30`?**
**YES, CONFIRM LEAVE.** House standard: raw native form fields keep their existing focus ring. Do NOT swap to `focus-visible:ring-ring`. Do NOT add `transition-transform`/`active:scale`. The `focus:ring-1 focus:ring-primary/30` is intentional and consistent with other native inputs in the repo.

---

### Guard-grep summary

```
className edits ........... 9 (A–I)
focus-visible:ring ........ 9 (all)
ring-ring (OUTWARD) ....... 9 (all)
ring-inset ................ 0
aria-label NEW ............ 5 (A, B, C, H, I)
aria-pressed NEW .......... 2 (D, G)
aria-expanded NEW ......... 0
active:scale-95 new ....... 5 (A, B, C, H, I — icon-only)
active:scale-[0.97] new ... 2 (D, G — chip tier)
active:scale-[0.98] new ... 2 (E, F — wide-own-surface)
FLIPs ..................... 4 (D, G, H, I — transition-colors→transition-all)
Non-FLIP transition-transf . 5 (A, B, C, E, F)
2nd competing press ....... 0
disabled touched .......... 0
onClick/navigate/supabase/
  storage/functions.invoke/
  react-query keys/setState  byte-identical, 0 logic lines
```

### Missed controls scan: **NONE**

Every raw interactive control is either edited (A–I) or correctly left:
- L158 hidden `<input type="file">` — no visual ✅
- L176/L178 native text inputs — existing focus ring ✅
- AppLayout shell — skipped ✅
- All `motion.div` wrappers — animation only, no `onClick` ✅
- All lucide icons — decorative ✅
- FileText avatar div L228 — presentational ✅
- All text elements — non-interactive ✅
- No clickable divs with `onClick` beyond those edited ✅

### LEAVE confirmations: **ALL 7 CORRECT**

---

### Build gate

**Verified `npm run update` green — TRUE EXIT 0.** Both type-checks pass, worker SW built, `dist/sw.js` freshly generated.

### Owner action

Ready to commit as-is. No further edits needed.
