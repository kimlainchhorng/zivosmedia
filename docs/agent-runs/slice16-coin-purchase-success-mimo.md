# MiMo run — 2026-06-13T23:50:17.035Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze a customer-facing post-purchase confirmation page — src/pages/CoinPurchaseSuccess.tsx (139 lines; route /wallet/coins/success; the Stripe checkout RETURN page that calls the verify-coin-purchase edge function to credit Z Coins, then shows one of four states: loading / success (with a +coins amount, new balance, a "Back to Wallet"/"Back to Live (countdown)" primary button, and — only when returning to a live stream — a "Go to Wallet instead" text link) / pending / error). It is being brought to PREMIUM + RESPONSIVE interaction-token parity with reference src/pages/hubs/JobPostingDetailPage.tsx.

HARD RULE: do NOT change any supabase call / edge-function invoke (verify-coin-purchase) / react-query key / navigation / routing / component or handler logic / the returnTo same-origin sanitization / the countdown auto-return effect. Propose ONLY JSX/Tailwind className changes plus, if genuinely needed, tiny display-only attrs (aria-label).

Interaction-token rules for this repo:
- RAW <button>/<a>/<Link> get the full token set appended: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. Tier scales: wide/card [0.98], small text-links [0.97] (+ rounded-sm for a clean ring radius on inline text), icon-only scale-95, full-width/menu-rows [0.99].
- transition-all when the control has hover:bg-* OR underline (so the color/decoration fades smoothly); transition-transform only for pure icon-scale with no hover color.
- shadcn <Button>/<Input>/<Textarea> ALREADY ship transition-all + focus-visible ring + active:scale-[0.98] — do NOT add tokens to them.
- framer-motion motion.button with whileTap gets the focus RING ONLY (no CSS active:scale — it double-applies against the motion transform). (Not expected on this page.)
- Non-interactive <div>/<span>/<p>/<img>/<h1> with no onClick get NOTHING.

My audit (confirm or correct it):
- The ONLY raw interactive control is the "Go to Wallet instead" <button> (~L101): className="mt-3 text-xs text-muted-foreground underline", onClick navigate("/wallet"), rendered only in the success+isLiveReturn branch. -> small text-link tier: append ` rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (transition-all because of the underline decoration).
- The 3 "Back to Wallet"/"Back to Live" controls (~L97 success, ~L118 pending, ~L131 error) are shadcn <Button> -> SKIP (already ship tokens).
- The gold-coin <img> (~L89) has alt="" (decorative; the adjacent +coins value carries the meaning) -> correct, leave it.
- Everything else (the Loader2 / Check / AlertCircle icons, the card <div>, headings, balance <p>) is non-interactive -> NOTHING.

Tasks:
(1) Confirm or correct the single-edit conclusion. Did I miss any raw control? Is the tier/transition choice right (rounded-sm + transition-all + active:scale-[0.97] + ring)?
(2) Responsive check at 375 / 768 / 1280: the page is a single max-w-sm centered card — any crush risk? (I believe none.)
(3) Flag any display-only polish you'd recommend (but keep the slice a pure interaction pass — flag, don't bundle).
(4) Note: there is a stray TAB character indenting L89 (the <img> line) — out of scope for an interaction pass, just flag if you see it.

Return a CONCISE line-referenced punch list with before/after className. Do NOT reprint the whole component. Keep under ~400 tokens.
- files: src/pages/CoinPurchaseSuccess.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Audit result: **confirmed — 1 edit**

Your control inventory is exhaustive. I found no additional raw controls. The tier/transition choice is correct.

### Punch list

**L101 — "Go to Wallet instead" raw `<button>`** (small text-link tier)

| | |
|---|---|
| **Before** | `className="mt-3 text-xs text-muted-foreground underline"` |
| **After** | `className="mt-3 text-xs text-muted-foreground underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |

**Why each token:**
- `rounded-sm` — clean ring radius on inline text (same as every small-text-link slice)
- `transition-all` — the `underline` text-decoration benefits from a smooth transition (matches `transition-transform`-for-pure-scale vs `transition-all`-for-hover/decoration rule)
- `active:scale-[0.97]` — small text-link tier
- `focus-visible:ring-2 focus-visible:ring-ring` — keyboard accessibility (was a **focus trap** — focusable but no visual indicator)

**Why NOT `ring-offset`:** the parent card is not `overflow-hidden`; a normal outward ring renders cleanly.

### Responsive: ✅ no crush

Single `max-w-sm` centered card. At 375px: card content area ≈263px (after `px-6` parent + `p-8` card padding). The edited button is inline text with `mt-3`, trivially fits. Zero risk at 768/1280.

### Flags (NOT applied — keeping the slice pure)

1. **Stray TAB** at L89 (the `<img>` line) — uses a tab character while surrounding lines use 2-space indent. Cosmetic only; flagged for a cleanup pass.
2. **`aria-hidden="true"` on decorative icons** — the `Loader2` (L72), `Check` (L82), `AlertCircle` (L125), and gold-coin `<img>` (L89, already `alt=""`) are decorative. Adding `aria-hidden` would prevent screen readers from announcing the raw SVG/image. Minor a11y polish, out of scope for this interaction pass.
3. **Countdown `aria-live`** — the "Back to Live (3)" button label counts down via state. A screen reader user won't hear the countdown change. An `aria-live="polite"` wrapper or `role="timer"` could help, but that's a display-logic change, not a className fix.

### Verify

Run `npm run update` (type-check + worker type-check + production build). Single className append — no logic risk.
