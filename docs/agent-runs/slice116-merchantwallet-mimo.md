# MiMo run — 2026-06-14T10:39:39.389Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Audit: MerchantWalletPage.tsx — ZERO-EDIT CONFIRMED

### (1) Plan

Full scan of every interactive control in the file. Confirm each is either a shadcn primitive (own tokens, skip) or already has proper aria. Flag structural follow-ups.

### (2) Interactive control inventory

| Line | Element | Classification | Action |
|------|---------|---------------|--------|
| 138 | `<Button aria-label="Back" variant="outline" size="icon">` | shadcn, **already has aria-label** | **SKIP** |
| 178 | `<Button className="w-full rounded-xl gap-2">` Request Payout | shadcn, visible text | **SKIP** |
| 196 | `<Input type="number">` amount | shadcn | **SKIP** |
| 203 | `<Input>` bank name | shadcn | **SKIP** |
| 212 | `<Button className="w-full rounded-xl">` Submit | shadcn, `disabled={requestPayout.isPending}` | **SKIP** |
| 262 | `<Badge variant="outline">` status | shadcn, presentational | **SKIP** |
| 255 | `<div key={p.id} className="flex items-center ...">` | **plain div, NO onClick** | presentational — SKIP |
| 148, 192 | `<motion.div>` wrappers | animation only, no onClick | **SKIP** |
| All | lucide icons (`Wallet`, `ArrowUpRight`, `ArrowDownLeft`, etc.) | decorative | **SKIP** |
| All | `<h1>`, `<p>`, `<span>` text | non-interactive | **SKIP** |

**Scan for missed controls:**
- ❌ No raw `<button>` anywhere
- ❌ No raw `<a>` anywhere
- ❌ No `<div onClick={...}>` or `cursor-pointer` divs
- ❌ No `role="button"` elements
- ❌ Every interactive control is a shadcn `Button`, `Input`, or `Badge`

### ✅ Verdict: ZERO-EDIT SLICE

Every interactive control on this page is a shadcn primitive with its own design tokens. The single non-shadcn back button (L138) already ships `aria-label="Back"`. No className edits, no aria additions needed.

### (3) Structural a11y flags (follow-up, not this pass)

| Flag | Detail |
|------|--------|
| **Decorative icons lack `aria-hidden`** | The lucide icons inside buttons/badges (e.g., `ArrowLeft`, `Send`, `CheckCircle`) are inside interactive controls and fine. But the stat icons (`ArrowDownLeft`, `Percent`, `ArrowUpRight` at L168–185) and the `Wallet` icon (L153) are purely decorative and could benefit from `aria-hidden="true"`. Similarly the info-row `Percent` (L226). Structural — FLAG, don't fix. |
| **Payout rows non-interactive** | The payout history rows (L255) are plain `<div>`s with no click handler. If future detail navigation is planned, they'll need `role="button"` + `tabIndex={0}` + `onKeyDown` + a click wrapper. Currently purely presentational — correct as-is. |
| **Form inputs shadcn** | The two `<Input>` fields have shadcn's own focus styling. Native form field a11y is adequate. |

**No proposed diff. No changes to apply. File is clean as-is.** Ready for owner to commit the existing state (if this was part of a batch) or simply mark the audit complete.

**Verify gate:** Since zero files were edited, no `npm run update` run is needed for this slice specifically. If it's bundled with other changes in a commit, that commit's gate run covers it.
