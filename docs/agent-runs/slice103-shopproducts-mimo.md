# MiMo run — 2026-06-14T09:39:27.461Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopProductsPage.tsx (211-line merchant "Products" page rendered inside <AppLayout>; @tanstack/react-query useQuery my-store (store_profiles) + shop-products (store_products); useMutation toggleStock/deleteProduct/createProduct via supabase.functions.invoke store-product-manage; useState search/showAdd/newName/newPrice/newCategory/newDesc; framer-motion AnimatePresence add-product bottom sheet). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, react-query keys, mutations, setState byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition. Don't add role/tabIndex/onKeyDown (structural — FLAG). Don't touch disabled. SKIP shadcn Button/Input/Textarea/Badge/AppLayout (own tokens). LEAVE native form fields.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF. A hover on a CHILD element does NOT count toward the button's own transition.
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover/active color/bg/border ON ITSELF → use transition-all (FLIP).
- For bare icon/text-link buttons/anchors add a rounded/rounded-full so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter. aria-expanded on a disclosure. A toggle with a DYNAMIC swapping aria-label should NOT also get aria-pressed (double-announce) — established slice-138 mute-toggle precedent.

FOUR edits applied (all icon-only buttons) — confirm each CORRECT or NEEDS-FIX:

A) L114 BACK button — was `p-2 -ml-2 rounded-full hover:bg-muted/50` (icon-only ArrowLeft; hover:bg ON ITSELF; NO transition, NO scale, NO ring; rounded-full; NO aria-label; sticky bg-background/95 header neutral) → ADDED `aria-label="Go back"` + FLIP (no-transition→transition-all) + `active:scale-95` + ring. Final: `p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Go back"`. Confirm.

B) L139 X CLOSE button (add-product bottom sheet) — was `p-2 rounded-full hover:bg-muted` (icon-only X; hover:bg ON ITSELF; NO transition, NO scale, NO ring; rounded-full; NO aria-label; inside a bg-card rounded-t-3xl sheet neutral) → ADDED `aria-label="Close"` + FLIP (no-transition→transition-all) + `active:scale-95` + ring. Final: `p-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Close"`. Confirm: aria-label="Close" sufficient (vs "Close new product form")?

C) L187 STOCK TOGGLE icon button — was `p-1.5 rounded-lg hover:bg-muted/60 transition-colors` (icon-only; the child icon SWAPS ToggleRight green when in_stock / ToggleLeft gray when out; hover:bg ON ITSELF + transition-colors; NO scale, NO ring; NO aria-label) → ADDED a DYNAMIC `aria-label={product.in_stock ? "Mark out of stock" : "Mark in stock"}` + FLIP transition-colors→transition-all + `active:scale-95` + ring; did NOT add aria-pressed (the dynamic action-label conveys state; aria-pressed would double-announce — per slice-138 mute precedent). Final: `p-1.5 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + dynamic aria-label. Confirm: (1) is the DYNAMIC action aria-label + NO aria-pressed the correct house pattern for a binary stock toggle, OR should this instead be a STATIC aria-label (e.g. "Toggle stock availability") + `aria-pressed={!!product.in_stock}` (textbook toggle-button pattern)? (2) FLIP transition-colors→transition-all correct; (3) scale-95 + OUTWARD ring on the bg-card item parent correct.

D) L194 DELETE icon button — was `p-1.5 rounded-lg hover:bg-destructive/10 transition-colors` (icon-only Trash2; the BUTTON has hover:bg-destructive/10 ON ITSELF + transition-colors; the child Trash2 icon has hover:text-destructive ON THE CHILD; NO scale, NO ring; NO aria-label) → ADDED `aria-label="Delete product"` + FLIP transition-colors→transition-all + `active:scale-95` + ring. Final: `p-1.5 rounded-lg hover:bg-destructive/10 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Delete product"`. Confirm: (1) FLIP→transition-all correct (button's own hover:bg-destructive/10 + new scale animate; child icon hover:text doesn't count); (2) scale-95 + ring; (3) leaving the destructive action WITHOUT a confirm dialog is existing logic (out of scope — FLAG not fix)?

ALSO CONFIRM I should LEAVE: AppLayout shell; shadcn <Button> "Add" L118 + "Add Product" L149 (own tokens, the latter has disabled); shadcn <Input> L125/143/145/146 + <Textarea> L148 (own tokens); shadcn <Badge> L183 (non-interactive category tag); the AnimatePresence backdrop motion.div L133 (fixed inset-0 bg-background/80 — has NO onClick, no click-outside-to-dismiss, non-interactive — adding an onClick would be logic, FLAG); the sheet panel motion.div L135; the product-row motion.div L171 (no onClick); the product <img> L175 (has alt); all lucide icons (decorative); loading-skeleton + empty-state + footer count. No native form fields besides shadcn Inputs/Textarea.

Be concise and exact. Return the precise final className after-string for EACH of A–D + the exact aria attr for each. Flag any other in-scope raw interactive control I missed. Note especially: (1) C — DYNAMIC action aria-label + NO aria-pressed vs STATIC label + aria-pressed for the binary stock toggle — which is the correct house pattern? (2) B — is aria-label="Close" sufficient? (3) D — FLIP correct given the button hover:bg is ON ITSELF but the icon hover:text is on the child? (4) the backdrop motion.div L133 having no click-outside-dismiss — leave (FLAG) or is that in scope?
- files: src/pages/app/shop/ShopProductsPage.tsx

---

## Verdict: ALL FOUR CORRECT ✅

No changes needed. Each edit is verified against house standards.

---

### A) BACK button — ✅ CORRECT

**Final:** `p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Go back"`

- FLIP no-transition→`transition-all` correct (`hover:bg-muted/50` bg ON ITSELF + new scale both animate)
- `scale-95` icon-only, `rounded-full` traces ring, OUTWARD on `bg-background/95` header neutral ✅

---

### B) X CLOSE button — ✅ CORRECT

**Final:** `p-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Close"`

- **`aria-label="Close"` is sufficient.** The sheet title "New Product" + the X icon make it unambiguous. Matches the standard X-dismiss pattern across the codebase. "Close new product form" would be more specific but not required — no competing close mechanism in the sheet.

---

### C) STOCK TOGGLE — ✅ CORRECT

**Final:** `p-1.5 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label={product.in_stock ? "Mark out of stock" : "Mark in stock"}`

**(1) Dynamic action label + NO aria-pressed is the correct house pattern**, per the slice-138 mute-toggle precedent. The label communicates both state ("Mark **out of** stock" = currently in stock) and action. `aria-pressed` would double-announce — screen reader hears "in stock, pressed" AND "Mark out of stock" — redundant. If the owner later wants the textbook `aria-pressed` toggle pattern, that's a valid semantic enhancement but requires updating slice-138 for consistency. **Keep as-is.**

**(2)** FLIP `transition-colors`→`transition-all` correct — `hover:bg-muted/60` bg ON ITSELF + new scale both animate.

**(3)** `scale-95` icon-only + OUTWARD `ring-ring` on `bg-card` product row (no `overflow-hidden` on the row → no inset) ✅

---

### D) DELETE button — ✅ CORRECT

**Final:** `p-1.5 rounded-lg hover:bg-destructive/10 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Delete product"`

**(1)** FLIP→`transition-all` correct. The BUTTON owns `hover:bg-destructive/10` (bg ON ITSELF). The CHILD `Trash2` icon owns `hover:text-destructive` — per rule: "A hover on a CHILD element does NOT count toward the button's own transition." Button's animated set = `{bg, transform}` → `transition-all`.

**(2)** `scale-95` icon-only + OUTWARD `ring-ring` on `bg-card` parent ✅

**(3)** Destructive without confirm: **existing logic, OUT OF SCOPE — FLAG.** `deleteProduct.mutate(product.id)` fires immediately. Owner should consider a confirm step.

---

### Missed controls scan — NONE

All 4 raw `<button>` controls covered. Confirmed LEAVE list:
- AppLayout, 2 shadcn Buttons, 3 shadcn Inputs, 1 Textarea, 1 Badge — own tokens ✅
- Backdrop `motion.div` L133 (no `onClick` — non-interactive) ✅
- Sheet panel `motion.div` L135, product-row `motion.div` L171 — non-interactive containers ✅
- Product `<img>` has `alt={product.name}` ✅
- All lucide icons decorative ✅
- Loading skeleton + empty state + footer count — non-interactive ✅
- No clickable divs, no raw `<a>`, no native form fields outside shadcn ✅

### Guard grep summary

| Metric | Count |
|--------|-------|
| className edits | 4 (A, B, C, D) |
| New aria attrs | 4 (`aria-label` × 4) |
| `focus-visible:ring` | 4, all `ring-ring`, all OUTWARD, `ring-inset` 0 |
| `aria-pressed` | 0 (correct per slice-138) |
| `active:scale-95` | 4 (all icon-only) |
| FLIPs | 4 (all →`transition-all`) |
| Competing 2nd press | 0 |
| `disabled` touched | 0 |
| Logic lines touched | 0 |

### Owner flags (OUT OF SCOPE — FLAG, not fix)

1. **Destructive delete without confirm** (L194) — immediate `deleteProduct.mutate()`. Consider confirm dialog.
2. **Backdrop no click-outside-dismiss** (L133) — sheet only closes via X button. Consider adding `onClick={() => setShowAdd(false)}` to the backdrop `motion.div`. This is a UX improvement, not a bug.
3. **Structural a11y** — all 4 controls are real `<button>`s (natively focusable). The stock toggle pair could benefit from a `role="group"` wrapper in a future structural pass — FLAGGED.

### Verify

Run `npm run update` — must pass with 0 TypeScript errors + green build. The diff is className + aria-only (0 logic lines), so risk is minimal.
