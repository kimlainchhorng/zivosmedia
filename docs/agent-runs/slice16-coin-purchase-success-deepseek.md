# DeepSeek run — 2026-06-13T23:49:43.424Z

- model: deepseek-chat
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

## Analysis

**Your audit is correct.** The only raw interactive control is the "Go to Wallet instead" `<button>` at ~L101. All three "Back to Wallet"/"Back to Live" controls are shadcn `<Button>` — skip. The gold-coin `<img>` has `alt=""` — correct (decorative, adjacent text carries meaning). No other raw controls exist.

**Tier choice is correct:** small text-link tier → `rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. `transition-all` is right because of the `underline` decoration.

**Responsive:** single `max-w-sm` centered card with `px-6` body padding — no crush risk at any breakpoint.

**Stray TAB:** confirmed on L89 (the `<img>` line has a tab before `<img`). Flagged, out of scope.

## Proposed change

**File:** `src/pages/CoinPurchaseSuccess.tsx`

**Line ~101** — the "Go to Wallet instead" `<button>`:

**Before:**
```tsx
className="mt-3 text-xs text-muted-foreground underline"
```

**After:**
```tsx
className="mt-3 text-xs text-muted-foreground underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

That's the only change — 1 insertion, 1 deletion, pure className swap.

## Owner verification

- Run `npm run update` to confirm type-check + build pass.
- The stray TAB on L89 (`<img>` line) is cosmetic — can fix separately.
- No logic, routing, or edge-function calls were touched.
