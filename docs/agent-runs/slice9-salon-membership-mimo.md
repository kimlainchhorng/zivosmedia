# MiMo run — 2026-06-13T22:37:20.425Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze src/pages/salon/PublicSalonMembershipPage.tsx (customer-facing PUBLIC salon membership signup landing, route /salon/:slug/membership — lists tiers via salon_public_get_membership_tiers RPC; Subscribe mints a Stripe Checkout Session via subscribe-salon-membership edge function) for PREMIUM interaction-polish parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change supabase queries, the salon_public_get_membership_tiers RPC, the subscribe-salon-membership invoke, mutations, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. CONTEXT: shadcn <Button>/<Input>/<Label> ALREADY include active:scale + focus-visible:ring, so DO NOT propose edits to those (Subscribe / Not-available / Cancel / Continue-to-Stripe buttons + email/name Inputs). Focus ONLY on RAW interactive elements with ZERO active:scale and ZERO focus rings. I believe the ONLY raw control is the 'Back to {store.name}' <Link> (~L165) className 'mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'. Propose exact className: link press = active:scale-[0.97], add transition-all + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring + rounded-sm. IMPORTANT: confirm the tier <Card> (~L194) is NOT clickable (NO onClick — the selected ring is set by the Subscribe <Button> inside), so it gets NOTHING. Confirm no other raw <button>/<a>. Flag any fetched-but-unused fields (Tier: id/name/description/monthly_price_cents/billing_interval/service_discount_percent/has_stripe_price; StoreLite: id/name/slug). Check responsive at 375/768/1280 (single max-w-md column). Return a CONCISE line-referenced punch list. Under ~800 tokens.
- files: src/pages/salon/PublicSalonMembershipPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Punch list — `PublicSalonMembershipPage.tsx`

### (1) Plan

This page is extremely clean — one raw control, all shadcn otherwise, all fetched fields used, single-column layout. The only edit is the back-link className.

### (2) Control inventory

| Control | Type | Has `active:scale`? | Has `focus-visible:ring`? | Action |
|---|---|---|---|---|
| **"Back to {store.name}"** ~L165 | raw `<Link>` | ❌ | ❌ | **Edit** |
| Tier `<Card>` ~L194 | `<div>` (Card) | N/A — **not clickable** (no `onClick`; selection driven by inner Subscribe Button) | N/A | **Skip** |
| Subscribe / Not available / Cancel / Continue to Stripe | shadcn `<Button>` | ✅ built-in | ✅ built-in | **Skip** |
| Email / Name inputs | shadcn `<Input>` | ✅ | ✅ | **Skip** |

**No other raw `<button>` or `<a>` in the file.**

### (3) Proposed diff — single className swap

**File:** `src/pages/salon/PublicSalonMembershipPage.tsx` — line 165

```diff
         <Link
           to={`/salon/${store.slug}`}
-          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
+          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
         >
```

That's **1 insertion / 1 deletion**, className-only. No logic touched.

### (4) Fetched-but-unused fields

**None.** Every field on both interfaces is rendered or consumed:
- `Tier`: `id` (key + selection), `name`, `description`, `monthly_price_cents`, `billing_interval`, `service_discount_percent`, `has_stripe_price` — all used.
- `StoreLite`: `id` (RPC param), `name` (heading + empty state), `slug` (back link) — all used.

### (5) Responsive

Single `max-w-md px-4` centered column — no grid, no sidebar, no horizontal scroll. The Cancel/Continue `flex gap-2` row holds fine at 375px. No crush risk at any breakpoint.

### Owner action

Verify `npm run update` passes after the single-line className edit. Preview at `/salon/:slug/membership` — confirm the back-link shows a ring on Tab focus and scales on click/tap.
