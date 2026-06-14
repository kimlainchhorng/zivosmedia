# DeepSeek run — 2026-06-14T09:34:19.946Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopOrdersPage.tsx (191-line merchant "Orders" page rendered inside <AppLayout>; @tanstack/react-query useQuery my-store (store_profiles) + shop-orders (store_orders); useMutation updateStatus via supabase.functions.invoke store-order-state-update; supabase realtime channel for new-order INSERT toast + NEW badge; useState search/statusFilter/newOrderIds; useRef initialLoadDone; date-fns; cn()). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, react-query keys, mutation, realtime, setState byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition. Don't add role/tabIndex/onKeyDown (structural — FLAG). Don't touch disabled. SKIP shadcn Button/Input/Badge/AppLayout (own tokens). LEAVE native form fields.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface (even if the control's OWN fill is colored). Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF.
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover/active color/bg/border ON ITSELF → use transition-all (FLIP from transition-colors / no-transition).
- For bare icon/text-link buttons/anchors add a rounded/rounded-full so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter. aria-expanded on a disclosure.

TWO edits applied — confirm each CORRECT or NEEDS-FIX:

A) L112 BACK button — was `p-2 -ml-2 rounded-full hover:bg-muted/50` (icon-only ArrowLeft; hover:bg ON ITSELF; NO transition class, NO scale, NO ring; rounded-full present; NO aria-label; on the sticky bg-background/95 header neutral) → ADDED `aria-label="Go back"` + FLIP (no-transition→transition-all because hover:bg + new scale must both animate) + `active:scale-95` (icon-only tier) + ring. Final: `p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` plus `aria-label="Go back"`. Confirm: (1) aria-label correct (was missing on icon-only); (2) transition-all correct (hover:bg + new scale both animate — was no transition class); (3) scale-95 icon-only tier; (4) OUTWARD ring-ring on the neutral header.

B) L125 STATUS-FILTER segmented buttons (all/pending/confirmed/picked_up/delivered/cancelled) — was `cn("shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize", s === statusFilter ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground")` (persistent single-select segmented filter toggling setStatusFilter; transition-colors present for the active/inactive bg+text swap; NO scale, NO ring, NO aria-pressed; horizontal-scroll row; rounded-full present) → ADDED `active:scale-[0.97]` + FLIP transition-colors→transition-all + ring + `aria-pressed={s === statusFilter}`. Final className: `cn("shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-[0.97] capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", s === statusFilter ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground")` plus `aria-pressed={s === statusFilter}`. Confirm: (1) aria-pressed correct for a persistent single-select segmented filter; (2) scale-[0.97] chips/pills tier correct; (3) FLIP transition-colors→transition-all correct (new scale + existing bg/text color swap both animate); (4) OUTWARD ring-ring (the active button's own fill is bg-foreground but the ring traces the neutral header parent).

ALSO CONFIRM I should LEAVE: AppLayout shell; shadcn <Input> L121 (search), shadcn <Badge> L116 (pending count), shadcn <Button> L179 (Mark as next-status, has its own tokens + onClick mutation) — all own tokens, SKIP; the motion.div order cards L155 (no onClick — non-interactive container); the status pill div L167 (non-interactive); the NEW badge span L162; the loading-skeleton + empty-state divs; all lucide icons (decorative). No clickable divs with onClick. No native form fields besides the shadcn Input.

Be concise and exact. Return the precise final className after-string for EACH of A–B + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) A — aria-label add + FLIP no-transition→transition-all + scale-95 + ring on the Back button — correct? (2) B — aria-pressed + scale-[0.97] + FLIP transition-colors→transition-all + ring on the segmented status filter — correct? (3) leaving the shadcn Button "Mark as X" (L179) untouched — correct?
- files: src/pages/app/shop/ShopOrdersPage.tsx

---

## Review of ShopOrdersPage.tsx — Edits A & B

### Edit A — Back button (L112)

**CORRECT.** Final className:
```
p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
Plus `aria-label="Go back"`.

- ✅ `aria-label` correct (was missing on icon-only)
- ✅ `transition-all` correct (was no transition class; `hover:bg-muted/50` + new scale both animate)
- ✅ `active:scale-95` correct icon-only tier
- ✅ OUTWARD `ring-ring` on neutral `bg-background/95` header

### Edit B — Status-filter segmented buttons (L125)

**CORRECT.** Final className:
```
shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-[0.97] capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
Plus `aria-pressed={s === statusFilter}`.

- ✅ `aria-pressed` correct for persistent single-select segmented filter
- ✅ `active:scale-[0.97]` correct chips/pills tier
- ✅ `transition-all` correct (new scale + existing `bg-foreground`/`bg-muted/60` + `text-background`/`text-muted-foreground` swap all animate)
- ✅ OUTWARD `ring-ring` — the active button's `bg-foreground` fill is dark, but the ring traces the neutral `bg-background/95` header parent (correct)

### Leave list — CORRECT

| Control | Reason |
|---------|--------|
| `AppLayout` shell | Own tokens |
| `<Input>` L121 (search) | shadcn own tokens |
| `<Badge>` L116 (pending count) | shadcn own tokens |
| `<Button>` L179 (Mark as X) | shadcn own tokens + `onClick` mutation |
| `motion.div` order cards L155 | Non-interactive container (no `onClick`) |
| Status pill div L167 | Non-interactive |
| NEW badge span L162 | Non-interactive |
| Loading skeleton + empty state | Non-interactive |
| All lucide icons | Decorative |

### Missed controls scan

**No missed raw interactive controls.** The page has exactly 2 raw interactive sites:
1. Back button (A) — ✅ handled
2. Status filter buttons (B) — ✅ handled

No clickable divs with `onClick`. No native form fields besides the shadcn `<Input>`. The `<Button>` at L179 is shadcn — correctly left.

### Guard grep verification

| Token | Count | Notes |
|-------|-------|-------|
| `focus-visible:ring` | 2 | A + B |
| `ring-ring` | 2 | Both OUTWARD |
| `ring-inset` | 0 | Correct |
| `aria-label` | 1 new | A (was missing) |
| `aria-pressed` | 1 new | B |
| `aria-expanded` | 0 | Correct |
| `active:scale-95` | 1 new | A (icon-only) |
| `active:scale-[0.97]` | 1 new | B (chips/pills) |
| FLIPs | 2 | A (no-transition→transition-all), B (transition-colors→transition-all) |
| Competing 2nd press | 0 | Correct |
| `disabled` touched | 0 | Correct |
| Logic lines touched | 0 | Correct |

**Verdict: Both edits CORRECT. Ready to apply.**
