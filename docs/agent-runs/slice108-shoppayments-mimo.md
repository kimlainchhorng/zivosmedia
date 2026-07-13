# MiMo run — 2026-06-14T09:56:11.267Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Audit Result: ✅ BOTH EDITS CORRECT — ZERO fixes needed, ZERO missed controls

### Edit A — L33 BACK button

| Check | Verdict |
|-------|---------|
| FLIP no-transition→`transition-all` | ✅ `hover:bg-muted/50` ON ITSELF + new `active:scale-95` both animate |
| `active:scale-95` icon tier | ✅ child is sole `<ArrowLeft>` — icon-only |
| OUTWARD `ring-ring` | ✅ parent is `bg-background/95` neutral sticky header, no overflow-hidden → not inset |
| Kept pre-existing `aria-label="Back to dashboard"` | ✅ no churn, no duplication |

**Final className:** `p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
**aria:** `aria-label="Back to dashboard"` (pre-existing, unchanged)

---

### Edit B — L57 "Open my shop" CTA button

| Check | Verdict |
|-------|---------|
| `scale-[0.97]` pill tier | ✅ auto-width `px-5 rounded-full` pill, NOT `w-full` → `[0.97]` (not `[0.98]`) |
| FLIP no-transition→`transition-all` | ✅ `hover:bg-emerald-600` ON ITSELF + new `active:scale-[0.97]` both animate |
| OUTWARD `ring-ring` against neutral parent | ✅ parent is `bg-background` empty-state → ring renders against neutral, NOT emerald, NOT inset |
| NO aria-label | ✅ visible text "Open my shop" — not icon-only |

**Final className:** `h-10 px-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
**aria:** none (visible text)

---

### Answers to the three flagged questions

1. **B — pill `[0.97]` vs full-width `[0.98]`**: `[0.97]` is correct. The button is `h-10 px-5 rounded-full` — intrinsic auto-width, not `w-full`. Pill tier = `[0.97]`.
2. **B — OUTWARD ring-ring on emerald-fill button**: Correct. The ring is OUTWARD, so it renders against the *parent* surface (`bg-background` neutral), not the button's own fill. No inset needed (no overflow-hidden ancestor).
3. **A — kept pre-existing aria-label**: Correct. Don't churn a control that already has the right label.

### Leave list — confirmed

- `AppLayout` (own tokens), `<StorePaymentSection>` (separate file, out of scope), `Loader2`/`CreditCard` (decorative), `h1`/`<p>` (non-interactive text). No clickable divs. No raw `<a>`.

### Missed controls scan

Scanned every element in the 72-line file. Only two interactive controls exist: the two `<button>` elements (A and B). **ZERO missed raw interactive controls.**

### Guard grep

| Token | Count | Expected |
|-------|-------|----------|
| `focus-visible:ring-2` | 2 | 2 ✅ |
| `ring-ring` | 2 | 2 (both OUTWARD) ✅ |
| `ring-inset` | 0 | 0 ✅ |
| `active:scale-95` | 1 (A) | ✅ |
| `active:scale-[0.97]` | 1 (B) | ✅ |
| `transition-all` | 2 (both FLIPs) | ✅ |
| `aria-label` | 1 (A, pre-existing) | ✅ |
| `aria-pressed` / `aria-expanded` | 0 | 0 ✅ |
| Second competing press added | 0 | ✅ |
| `disabled` touched | 0 | ✅ |
| Logic lines touched | 0 | ✅ |

**Verdict: File is byte-correct as shown. No diff needed. No further changes. Ready for `npm run update`.**
