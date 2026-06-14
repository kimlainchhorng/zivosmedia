# DeepSeek run — 2026-06-14T09:55:31.968Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopPaymentsPage.tsx (72-line merchant "Payments" page in <AppLayout>; @tanstack/react-query useQuery "my-store-payments" (store_profiles eq owner_id maybeSingle); renders <StorePaymentSection storeId market> when store exists, else an empty-state with a CTA; loading guard). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, react-query keys byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition (add ring only). Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn AppLayout (own tokens). The <StorePaymentSection> child component (components/admin/StorePaymentSection) is a SEPARATE FILE — out of scope for this slice, LEAVE.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF.
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover/active color/bg/border ON ITSELF → use transition-all (FLIP).
- For bare icon/text-link buttons/anchors add a rounded/rounded-full so the ring traces tightly.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle. aria-expanded on a disclosure.

TWO edits applied — confirm each CORRECT or NEEDS-FIX:

A) L33 BACK button — was `p-2 -ml-2 rounded-full hover:bg-muted/50` + ALREADY had `aria-label="Back to dashboard"` (icon-only ArrowLeft; onClick navigate("/shop-dashboard"); hover:bg ON ITSELF; NO transition, NO scale, NO ring; rounded-full present; inside sticky bg-background/95 backdrop-blur-xl header neutral) → ADDED FLIP (no-transition→transition-all) + `active:scale-95` + ring (kept existing aria-label, did NOT duplicate it). Final: `p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Back to dashboard"`. Confirm: (1) FLIP no-transition→transition-all correct (hover:bg ON ITSELF + new scale); (2) active:scale-95 icon tier; (3) OUTWARD ring-ring on neutral sticky header; (4) kept existing aria-label (no churn).

B) L57 "Open my shop" CTA button (no-store empty state) — was `h-10 px-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm` (has VISIBLE text "Open my shop"; onClick navigate("/store/setup"); auto-width pill with its OWN colored surface bg-emerald-500; hover:bg-emerald-600 ON ITSELF; NO transition, NO scale, NO ring; rounded-full present; centered in the empty-state on bg-background neutral) → ADDED `active:scale-[0.97]` (pill tier — auto-width, NOT full-width) + FLIP (no-transition→transition-all) + ring; NO aria (visible text). Final: `h-10 px-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: (1) scale-[0.97] pill tier correct (auto-width px-5 pill, not full-width → NOT scale-[0.98]); (2) FLIP no-transition→transition-all correct (hover:bg-emerald-600 ON ITSELF + new scale); (3) OUTWARD ring-ring correct — even though the button's own fill is emerald, the OUTWARD ring renders against the empty-state's bg-background neutral parent → ring-ring (NOT a tinted/emerald ring, NOT ring-inset); (4) NO aria-label correct (visible text).

ALSO CONFIRM I should LEAVE: AppLayout shell; the <StorePaymentSection storeId market> child component L66 (separate file components/admin/StorePaymentSection — out of scope this slice); the loading Loader2 + the CreditCard empty-state icon (decorative); the h1 "Payments" + empty-state <p> text (non-interactive). No clickable divs with onClick. No raw <a>.

Be concise and exact. Return the precise final className after-string for A + B + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) B — pill tier scale-[0.97] (auto-width) vs full-width scale-[0.98] — which is correct? (2) B — OUTWARD ring-ring against the neutral empty-state parent even though the button fill is emerald — correct (not a colored/inset ring)? (3) A — kept the pre-existing aria-label without churn — correct?
- files: src/pages/app/shop/ShopPaymentsPage.tsx

---

## Plan

Two edits already applied correctly in the file. Both are textbook house-standard patterns. No missed controls. No corrections needed.

## Edit A — Back button (L33)

**Before:**
```
className="p-2 -ml-2 rounded-full hover:bg-muted/50"
```
**After:**
```
className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**Aria:** kept existing `aria-label="Back to dashboard"` (unchanged)

**Verdict: ✅ CORRECT**
1. FLIP `no-transition→transition-all` — correct (`hover:bg-muted/50` ON ITSELF + new `active:scale-95` both animate)
2. `active:scale-95` — correct icon-only tier
3. OUTWARD `ring-ring` — correct (neutral `bg-background/95` sticky header parent)
4. Kept existing `aria-label` — correct (no churn)

## Edit B — "Open my shop" CTA button (L57)

**Before:**
```
className="h-10 px-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm"
```
**After:**
```
className="h-10 px-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**Aria:** none (visible text — correct)

**Verdict: ✅ CORRECT**
1. `active:scale-[0.97]` — correct pill tier (auto-width `px-5` pill, NOT full-width → NOT `scale-[0.98]`)
2. FLIP `no-transition→transition-all` — correct (`hover:bg-emerald-600` ON ITSELF + new scale both animate)
3. OUTWARD `ring-ring` — correct. Even though the button's own fill is `bg-emerald-500`, the OUTWARD ring renders against the empty-state's `bg-background` neutral parent → `ring-ring` (NOT a tinted/emerald ring, NOT `ring-inset`)
4. No `aria-label` — correct (visible text "Open my shop")

## Controls to LEAVE (confirmed)

| Control | Reason |
|---------|--------|
| `AppLayout` shell | shadcn — own tokens |
| `<StorePaymentSection storeId market>` (L66) | Separate file — out of scope |
| `Loader2` spinner | Decorative |
| `CreditCard` icon | Decorative |
| `<h1>Payments</h1>` | Non-interactive |
| Empty-state `<p>` text | Non-interactive |

## Missed controls scan

**NONE.** The page has exactly 2 raw interactive controls — both edited. No clickable divs with `onClick`. No raw `<a>`. No native form fields. No `cursor-pointer`/`role="button"` divs.

## Guard grep (over the diff)

| Guard | Count | Status |
|-------|-------|--------|
| `focus-visible:ring` | 2 | ✅ |
| `ring-ring` | 2 (both OUTWARD) | ✅ |
| `ring-inset` | 0 | ✅ |
| `aria-label` | 0 new (1 pre-existing kept) | ✅ |
| `aria-pressed` | 0 | ✅ |
| `aria-expanded` | 0 | ✅ |
| `active:scale-95` | 1 (A, icon-only) | ✅ |
| `active:scale-[0.97]` | 1 (B, pill) | ✅ |
| FLIPs | 2 (both no-transition→transition-all) | ✅ |
| Competing 2nd press | 0 | ✅ |
| `disabled` touched | 0 | ✅ |
| Logic lines touched | 0 | ✅ |

## Owner verification

- **File:** `src/pages/app/shop/ShopPaymentsPage.tsx` — the file already has both edits applied in the provided context. No further changes needed.
- **Build gate:** Run `npm run update` — must pass (type-check + worker type-check + production build).
- **Preview:** The page hits live Supabase (auth/RLS-gated, requires a signed-in store owner). The empty-state CTA is safe to preview without auth. The `<StorePaymentSection>` child requires a store row + Stripe Connect setup.
- **Commit:** Ready to commit as-is.
