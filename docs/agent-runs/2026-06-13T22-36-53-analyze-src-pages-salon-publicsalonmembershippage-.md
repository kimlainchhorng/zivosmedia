# DeepSeek run — 2026-06-13T22:36:53.750Z

- model: deepseek-chat
- task: Analyze src/pages/salon/PublicSalonMembershipPage.tsx (customer-facing PUBLIC salon membership signup landing, route /salon/:slug/membership — lists active membership tiers via salon_public_get_membership_tiers RPC, store looked up via store_profiles by slug; Subscribe mints a Stripe Checkout Session via the subscribe-salon-membership edge function) for PREMIUM interaction-polish parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change supabase queries, the salon_public_get_membership_tiers RPC, the subscribe-salon-membership invoke, mutations, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. CONTEXT: shadcn <Button>/<Input>/<Label> ALREADY include active:scale + focus-visible:ring, so DO NOT propose edits to those (Subscribe / Not-available / Cancel / Continue-to-Stripe buttons + the email/name Inputs). Focus ONLY on RAW interactive elements with ZERO active:scale and ZERO focus rings. I believe the ONLY raw interactive control is the 'Back to {store.name}' <Link> (~L165) className 'mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'. Propose exact className: link press = active:scale-[0.97], add transition-all + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring + rounded-sm. IMPORTANT: confirm the tier <Card> (~L194) is NOT clickable (it has NO onClick — the 'selected' ring state is set by the Subscribe <Button> inside it), so it should get NOTHING (a focus ring on a non-focusable div is dead CSS, and active:scale on a non-interactive card is wrong). Confirm there are no other raw <button>/<a> controls. Flag any fetched-but-unused fields (Tier: id/name/description/monthly_price_cents/billing_interval/service_discount_percent/has_stripe_price; StoreLite: id/name/slug). Check responsive at 375/768/1280 (single max-w-md column, tier list space-y-3). Return a CONCISE line-referenced punch list. Under ~800 tokens.
- files: src/pages/salon/PublicSalonMembershipPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Analysis & Plan

**File:** `src/pages/salon/PublicSalonMembershipPage.tsx`

**Confirmed:** The **only** raw interactive element missing interaction tokens is the "Back to {store.name}" `<Link>` at ~L165.

**Confirmed:** The tier `<Card>` (~L194) has **no `onClick`** — it's a non-interactive container. Adding `active:scale` or `focus-visible:ring` would be dead CSS. **Skip it.**

**Confirmed:** No other raw `<button>`/`<a>` controls exist. All other interactive elements are shadcn `<Button>`/`<Input>`/`<Label>` which already ship the tokens.

**Fetched-but-unused fields check:**
- `Tier`: `id` (used as key), `name` (rendered), `description` (rendered), `monthly_price_cents` (rendered), `billing_interval` (rendered), `service_discount_percent` (rendered), `has_stripe_price` (used for disabled state) — **all used.**
- `StoreLite`: `id` (used for RPC call), `name` (rendered), `slug` (used for back link) — **all used.**

**Responsive:** Single `max-w-md` column with `space-y-3` tier list — clean at all breakpoints. No crush.

## Proposed Change

**File:** `src/pages/salon/PublicSalonMembershipPage.tsx`, line ~165

**Before:**
```tsx
<Link
  to={`/salon/${store.slug}`}
  className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
>
```

**After:**
```tsx
<Link
  to={`/salon/${store.slug}`}
  className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
>
```

**Diff summary:** 1 insertion, 1 deletion — pure className addition.

## Verification

1. Run `npm run update` — must pass (type-check + worker type-check + production build).
2. Preview at `/salon/:slug/membership` on the dev server — verify the back link has `active:scale-[0.97]` press feedback and keyboard focus ring.
3. Check at 375/768/1280 — single column layout unchanged.

**No deploy needed** — this is a className-only change that ships with the next build.
