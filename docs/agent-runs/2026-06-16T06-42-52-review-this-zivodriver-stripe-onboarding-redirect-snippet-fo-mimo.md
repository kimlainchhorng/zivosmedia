# MiMo advisor — Review this zivodriver Stripe-onboarding redirect snippet for REAL security/correctness issues only. Answer Q1 and Q2. Be concrete and skeptical; do not invent.

Files: /tmp/zd-payout-review.tsx

## Q1: `*.stripe.com` vs `connect.stripe.com`

Stripe Account Link URLs always resolve to **`connect.stripe.com`**. Pinning exactly `connect.stripe.com` is the correct move — it's stable and documented. `*.stripe.com` is safe (same trust domain) but overbroad; it would accept `dashboard.stripe.com`, `hooks.stripe.com`, etc., which have no business being a redirect target here. If Stripe ever changes the onboarding host (extremely unlikely), your validation fails **loudly** with a toast — that's the correct failure mode for a security guard. Pin `connect.stripe.com`.

## Q2: One real issue — **open redirect via client-supplied `return_url` / `refresh_url`**

`returnUrl` and `refreshUrl` are sent from the client into the edge function, and Stripe **will redirect the user there** after onboarding. The snippet doesn't show where they originate — if they're derived from user-controllable input (query params, deep link params) rather than hardcoded to e.g. `${origin}/driver/payout-complete`, then an attacker can craft a link like:

```
?return_url=https://evil.com
```

…and after Stripe onboarding the user is redirected to the attacker's site. This is a classic **open redirect via Stripe proxy**.

**Fix:** Validate `return_url`/`refresh_url` **server-side in the edge function** against the app's own origin (or allowlist), independent of whatever the client sends:

```ts
const allowedOrigin = "https://zivodriver.com";
const safeReturn = new URL(return_url).origin === allowedOrigin ? return_url : `${allowedOrigin}/driver/payout-complete`;
```

If those values are already hardcoded on the client and never from user input, disregard — but verify.
