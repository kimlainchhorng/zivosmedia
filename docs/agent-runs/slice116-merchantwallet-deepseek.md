# DeepSeek run — 2026-06-14T10:39:13.491Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token AUDIT on src/pages/app/shop/MerchantWalletPage.tsx (275-line self-service merchant wallet: balance, payouts, fee tracking; useAuth + useQuery (store_profiles, store_orders, merchant_payouts) + useMutation requestPayout via supabase.functions.invoke("merchant-payout-request") with Idempotency-Key header; framer-motion motion.div). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, onChange, navigate, supabase, functions.invoke, useState, useMutation, disabled, setState byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card/CardHeader/CardTitle/CardContent/Input/Badge (own tokens).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle. aria-expanded on a disclosure.

This appears to be a ZERO-EDIT AUDIT slice. Every interactive control is a shadcn primitive with its own tokens:
- L138 Back: shadcn <Button aria-label="Back" variant="outline" size="icon" onClick={() => navigate(-1)}> — SKIP (shadcn, ALREADY aria-label)
- L178 "Request Payout": shadcn <Button> (onClick setShowPayoutForm(!showPayoutForm), disabled={availableBalance < 5}) — SKIP
- L196/L203: shadcn <Input> (number amount; bank name) — SKIP
- L212 "Submit Payout Request": shadcn <Button> (onClick requestPayout.mutate(), disabled={requestPayout.isPending}) — SKIP
- L262 <Badge variant="outline"> status chip — SKIP (shadcn, presentational)
- L255 payout history rows: plain <div> with NO onClick — presentational
- All Card/CardContent/CardHeader/CardTitle — shadcn
- L148/L192 motion.div wrappers — animation only, no onClick
- All lucide icons — decorative; h1 + all <p>/<span> text — non-interactive; no-payouts empty-state — presentational

KEY QUESTIONS: (1) Confirm this is a clean ZERO-EDIT AUDIT — every interactive control is a shadcn primitive (Back already has aria-label), no raw <button>, no raw <a>, no onClick divs, no role="button"/cursor-pointer divs that need a className/aria edit. (2) Flag any raw interactive control I missed, or any structural a11y gap (role/tabIndex) you'd recommend as a follow-up. Be concise and exact.
- files: src/pages/app/shop/MerchantWalletPage.tsx

---

# MerchantWalletPage — Zero-Edit Audit

## (1) Short Plan

**Verdict: CLEAN ZERO-EDIT AUDIT.** Every interactive control is a shadcn primitive with its own design tokens. No raw `<button>`, no raw `<a>`, no `onClick` divs, no `role="button"`/`cursor-pointer` divs. No edits needed.

## (2) Proposed Change

**No diff.** Zero edits. The file is ready as-is.

## (3) Audit Confirmation

### Interactive controls — all shadcn, all SKIPPED:

| Line | Control | Why skipped |
|------|---------|-------------|
| L138 | `<Button aria-label="Back" variant="outline" size="icon">` | shadcn, **already has `aria-label`** |
| L178 | `<Button className="w-full rounded-xl gap-2" onClick={...} disabled={availableBalance < 5}>` | shadcn, visible text "Request Payout" |
| L196 | `<Input type="number" placeholder="Amount..." className="rounded-xl">` | shadcn, native form field |
| L203 | `<Input placeholder="Bank name..." className="rounded-xl">` | shadcn, native form field |
| L212 | `<Button className="w-full rounded-xl" onClick={...} disabled={requestPayout.isPending}>` | shadcn, visible text "Submit Payout Request" |
| L262 | `<Badge variant="outline" className={...}>` | shadcn, presentational status chip |

### Non-interactive elements — all correctly left:

- L148/L192: `motion.div` wrappers — animation only, no `onClick`
- L255: payout history `<div>` rows — presentational, no `onClick`
- All `Card`/`CardContent`/`CardHeader`/`CardTitle` — shadcn primitives
- All lucide icons — decorative (`aria-hidden` by default)
- `<h1>`, `<p>`, `<span>` text — non-interactive
- Empty-state "No payouts yet" — presentational

### Structural a11y flag (follow-up, not an edit):

The payout history rows (L255) are plain `<div>`s with no `role` or `tabIndex`. If these should be clickable in the future (e.g., to view payout details), they'd need `role="button"` + `tabIndex={0}` + `onKeyDown` + keyboard ring. Currently they're presentational — no action needed.

## (4) Owner Verification

Nothing to verify. The file is clean — every interactive control is a shadcn primitive with its own tokens. Ready to commit as-is.
