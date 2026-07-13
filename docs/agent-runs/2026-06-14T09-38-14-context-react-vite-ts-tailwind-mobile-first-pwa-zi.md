# DeepSeek run — 2026-06-14T09:38:14.088Z

- model: deepseek-chat
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

## Review of ShopProductsPage.tsx — 4 edits

### Verdict: ALL 4 CORRECT. No changes needed.

---

### A) BACK button — **CORRECT**

**Final className:** `p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**Final aria:** `aria-label="Go back"`

✅ FLIP no-transition→`transition-all` correct (hover:bg ON THE ELEMENT + new scale)
✅ `active:scale-95` correct (icon-only tier)
✅ OUTWARD `ring-ring` on neutral `bg-background/95` header correct
✅ `aria-label="Go back"` correct (icon-only control)

---

### B) X CLOSE button — **CORRECT**

**Final className:** `p-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**Final aria:** `aria-label="Close"`

✅ `aria-label="Close"` is **sufficient** — the sheet heading `<h2>New Product</h2>` provides context, so "Close" is unambiguous. "Close new product form" would be overly verbose for a sheet with a visible heading. House standard: `aria-label="Close"` on sheet/modal close buttons is the established pattern.

---

### C) STOCK TOGGLE — **CORRECT**

**Final className:** `p-1.5 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**Final aria:** `aria-label={product.in_stock ? "Mark out of stock" : "Mark in stock"}`

✅ **DYNAMIC action aria-label + NO aria-pressed is the correct house pattern.** Rationale:
- This is a **binary action toggle** (click toggles state), NOT a **persistent state indicator** (like a segmented filter where multiple buttons reflect current selection).
- The dynamic `aria-label` tells the user what the button WILL DO ("Mark out of stock" / "Mark in stock"), which is the correct pattern for action buttons.
- `aria-pressed` would announce the CURRENT state ("pressed" / "not pressed"), which conflicts with the action-oriented label and would double-announce.
- This matches the **slice-138 mute-toggle precedent** exactly (dynamic swapping `aria-label`, no `aria-pressed`).

✅ FLIP `transition-colors`→`transition-all` correct (hover:bg ON THE ELEMENT + new scale)
✅ `active:scale-95` correct (icon-only tier)
✅ OUTWARD `ring-ring` on neutral `bg-card` item parent correct

---

### D) DELETE button — **CORRECT**

**Final className:** `p-1.5 rounded-lg hover:bg-destructive/10 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**Final aria:** `aria-label="Delete product"`

✅ FLIP `transition-colors`→`transition-all` **correct** — the button's own `hover:bg-destructive/10` IS on the element itself (the `<button>`), so it + the new scale must both animate. The child icon's `hover:text-destructive` does NOT count toward the button's own transition (per the rule: "A hover on a CHILD element does NOT count toward the button's own transition").
✅ `active:scale-95` correct (icon-only tier)
✅ OUTWARD `ring-ring` on neutral `bg-card` item parent correct
✅ Leaving the destructive action without a confirm dialog is existing logic — **FLAG not fix** (out of scope)

---

### Controls to LEAVE (confirmed)

| Control | Line | Reason |
|---------|------|--------|
| `AppLayout` shell | L1 | Own tokens |
| shadcn `<Button>` "Add" | L118 | Own tokens |
| shadcn `<Button>` "Add Product" | L149 | Own tokens + `disabled` |
| shadcn `<Input>` ×5 | L125/143/145/146 | Own tokens |
| shadcn `<Textarea>` | L148 | Own tokens |
| shadcn `<Badge>` | L183 | Non-interactive |
| Backdrop `motion.div` | L133 | **No `onClick`** — adding click-outside-to-dismiss would be a **logic change** (FLAG, out of scope) |
| Sheet panel `motion.div` | L135 | Non-interactive container |
| Product row `motion.div` | L171 | No `onClick` |
| Product `<img>` | L175 | Has `alt` |
| All lucide icons | — | Decorative |
| Loading skeleton | L161 | Non-interactive |
| Empty state | L165 | Non-interactive |
| Footer count | L198 | Non-interactive |

### No other raw interactive controls missed

The page has exactly 4 raw interactive controls (A/B/C/D), all edited. No clickable `<div>`s, no raw `<a>` tags, no native form fields outside shadcn components.

---

### Summary

| Edit | Status | Final className | Final aria |
|------|--------|----------------|------------|
| A) Back | ✅ CORRECT | `p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label="Go back"` |
| B) Close | ✅ CORRECT | `p-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label="Close"` |
| C) Stock toggle | ✅ CORRECT | `p-1.5 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label={product.in_stock ? "Mark out of stock" : "Mark in stock"}` |
| D) Delete | ✅ CORRECT | `p-1.5 rounded-lg hover:bg-destructive/10 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label="Delete product"` |

**The file as shown already has all 4 edits applied correctly.** No diff needed — the working tree matches the final state. Run `npm run update` to verify.
