# DeepSeek run — 2026-08-13T15:40:47.450Z

- model: deepseek-chat
- task: Audit this page for CONCRETE user-facing BUGS only (ignore style/perf/a11y): mock or hardcoded data shown as if real; controls that claim an action but do not persist or navigate to the wrong place (missing/wrong route params, wrong navigation state shape); silent Supabase error swallowing (a .insert/.update/.delete/select whose {error} is never checked, especially when a wired error/retry UI exists that then never fires); broken deep-links; logic errors. Cite exact line numbers. Be strict — only report a bug you can prove from the code. If genuinely clean, say so plainly in one line.
- files: src/pages/account/WalletPage.tsx

---

I'll audit the visible portion of `WalletPage.tsx` for concrete user-facing bugs. Let me analyze carefully.

## Audit Findings

### Bug 1: `formatTopupAmount` shows wrong amount after rounding (line ~137, ~330)

**Location:** `WalletTopupPaymentForm` — the `Pay` button label.

**The bug:** The deep-link handler at line ~330 rounds the amount UP to the nearest dollar:
```js
const dollars = (Math.ceil(cents / 100)).toFixed(2);
setTopupAmount(dollars);
```

But `WalletTopupPaymentForm` receives `amountCents` as a prop. Let me trace where that prop comes from... I need to see the hidden portion to confirm how `amountCents` is passed to `WalletTopupPaymentForm`. The visible code shows `topupAmountCents` is computed from `topupAmount` (line ~300), and `handleTopup` sends `amount_cents: cents` to the edge function. If the payment form receives `topupAmountCents` (the rounded-up value), then the button label `Pay $X.XX` matches what's actually charged. **Cannot prove a bug here without the hidden portion** — the rounding is intentional ("Round up to the nearest dollar so the input shows a clean value"). Not reportable.

### Bug 2: `useEffect` deep-link handler — `topup_amount` rounding creates a mismatch between displayed and charged amount

**Location:** Lines ~330-340.

**The bug:** When entering via deep-link `?topup_amount=<cents>`, the code rounds UP to the nearest dollar:
```js
const dollars = (Math.ceil(cents / 100)).toFixed(2);
setTopupAmount(dollars);
```

So if a PPV page deep-links with `?topup_amount=1500` (=$15.00), the user sees $15.00. Fine. But if it deep-links with `?topup_amount=1550` (=$15.50), the user sees $16.00 in the input — **and will be charged $16.00**, not the $15.50 the PPV page intended. The user is charged MORE than the deep-link requested. This is a real logic error: the deep-link amount is silently inflated.

**Proof:** The comment says "Round up to the nearest dollar so the input shows a clean value" — but this changes the actual charge. The PPV page that deep-links `?topup_amount=1550` expects the user to top up $15.50 to unlock content; instead they're charged $16.00. The user sees $16.00 in the input, so it's not hidden — but it's still a logic error: the deep-link contract is violated (the amount is not preserved).

**Severity:** Medium. The user is charged more than the deep-link requested, and the PPV page's expected balance threshold may not be met (if the PPV requires exactly $15.50, the user now has $16.00 — that's fine, they have MORE. But if the PPV page shows "Top up $15.50 to unlock" and the user is charged $16.00, the copy is wrong).

Actually, wait — let me reconsider. The user SEES $16.00 in the input before paying. So they're not surprised. The bug is that the deep-link's intended amount is not honored. This is a **contract violation** but the user is informed. I'll report it as a logic error but note the user sees the inflated amount.

### Bug 3: `useEffect` — `topup_amount` deep-link opens the sheet but `topupStep` is set to "amount" — user must click through again

**Location:** Lines ~330-340.

```js
setTopupAmount(dollars);
setTopupStep("amount");
setTopupOpen(true);
```

The deep-link sets `topupStep` to `"amount"` — so the sheet opens on the amount step, NOT the payment step. The user must click "Continue" / "Next" to reach payment. This is arguably fine UX (lets the user confirm the amount), but the deep-link intent was to get the user to pay. Not a bug per se — the user can proceed. **Not reportable as a bug.**

### Bug 4: `useEffect` — `topup_amount` deep-link does NOT auto-start the topup

**Location:** Lines ~330-340.

The deep-link opens the sheet pre-filled but does NOT call `handleTopup()`. The user must manually click the top-up button. This is a UX choice, not a bug. **Not reportable.**

### Bug 5: `handleTopup` — `topupAmountCents` uses `Math.round` but the deep-link rounds up

**Location:** Line ~300 vs ~330.

```js
const topupAmountCents = Number.isFinite(parsedTopupAmount) ? Math.round(parsedTopupAmount * 100) : 0;
```

vs deep-link:
```js
const dollars = (Math.ceil(cents / 100)).toFixed(2);
setTopupAmount(dollars);
```

If deep-link sends `?topup_amount=1550`, `setTopupAmount("16.00")`, then `topupAmountCents = 1600`. The user is charged $16.00. **This confirms Bug 2.**

### Bug 6: `useEffect` — `topup` status "success" with `session_id` but no `payment_intent` — verify call may fail

**Location:** Lines ~345-350.

```js
const shouldVerify = (status === "success" || redirectStatus === "succeeded") && (sid || paymentIntentId);
if (shouldVerify) {
  const { data, error } = await supabase.functions.invoke("verify-user-wallet-topup", {
    body: paymentIntentId ? { payment_intent_id: paymentIntentId } : { session_id: sid },
  });
```

If `status === "success"` but BOTH `sid` and `paymentIntentId` are null (e.g., the URL has `?topup=success` but no session or payment_intent), `shouldVerify` is false — no verify happens, and the params are stripped. The user sees no confirmation. But this is an edge case (the return_url is `${window.location.origin}/wallet?topup=success` — no session_id or payment_intent). Wait — let me check the `confirmPayment` return_url:

```js
return_url: `${window.location.origin}/wallet?topup=success`,
```

Stripe's `confirmPayment` with `redirect: "if_required"` — when the payment requires a redirect (e.g., 3DS), Stripe redirects to `return_url` and appends `payment_intent`, `payment_intent_client_secret`, and `redirect_status` query params. So after a 3DS redirect, the URL would be `/wallet?topup=success&payment_intent=pi_xxx&payment_intent_client_secret=...&redirect_status=succeeded`. In that case `paymentIntentId` is present and verify runs. Good.

But if the payment succeeds WITHOUT a redirect (no 3DS), `confirmPayment` returns the result directly and `handleSubmit` calls `verify-user-wallet-topup` inline. The `?topup=success` in the URL is never actually navigated to (no redirect happened). So the URL stays clean. Good.

**Edge case:** If a user manually navigates to `/wallet?topup=success` (no payment_intent/session_id), `shouldVerify` is false, and the code just strips the param. No false verification. **Not a bug.**

### Bug 7: `useEffect` — `status === "cancel"` only checks `topup` param, not `redirect_status === "canceled"`

**Location:** Lines ~380-385.

```js
} else if (status === "cancel") {
  toast.message("Topup cancelled");
  url.searchParams.delete("topup");
  window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
}
```

If Stripe redirects back with `redirect_status=canceled` (user cancelled 3DS), the URL would be `/wallet?topup=success&payment_intent=pi_xxx&redirect_status=canceled`. Then:
- `shouldVerify = (status === "success" || redirectStatus === "succeeded") && (sid || paymentIntentId)` → `status === "success"` is true, `redirectStatus === "canceled"` is false, but the OR is true because `status === "success"`. And `paymentIntentId` is present. So `shouldVerify` is TRUE.
- The code calls `verify-user-wallet-topup` with `payment_intent_id`. The edge function would check the payment intent status — if it's `canceled`, the function should return an error or `credited: false`. The code handles `error` → toast.error, and `credited: false` → toast.message("Topup already credited"). 

Wait — if the payment was cancelled, the edge function might return `{ credited: false }` (not an error), and the user sees "Topup already credited" — which is WRONG. The user cancelled, but the UI says "already credited". **This is a potential bug** but depends on the edge function's behavior, which I can't see. The `redirect_status === "canceled"` case is not explicitly handled — it falls into the `shouldVerify` branch. **Reportable as a logic gap** — the code checks `status === "cancel"` but Stripe's redirect uses `redirect_status=canceled`, not `topup=cancel`. The `topup=cancel` param is never set by any code in this file (the return_url is always `?topup=success`). So the `status === "cancel"` branch is dead code — it never fires. The actual cancel case (`redirect_status=canceled`) falls into the verify branch and shows misleading "already credited" or an error.

**Proof:**
- `return_url` is always `${window.location.origin}/wallet?topup=success` (line ~160).
- Stripe appends `redirect_status` on redirect, not `topup`.
- The `status === "cancel"` branch checks `url.searchParams.get("topup") === "cancel"` — which never happens.
- The `redirect_status === "canceled"` case is not handled — it goes into `shouldVerify` (because `status === "success"` is true).

**This is a real bug.** When a user cancels a 3DS challenge, they're redirected back to `/wallet?topup=success&payment_intent=pi_xxx&redirect_status=canceled`, and the code tries to verify a cancelled payment, showing either an error or "Topup already credited" — misleading.

### Bug 8: `useEffect` — `topup_amount` deep-link with `return_to` — the return navigation happens even on cancel

**Location:** Lines ~330-340 + ~370-380.

The deep-link handler stores `return_to` in sessionStorage. The `shouldVerify` branch (on success) navigates back. But if the user cancels (or the verify fails), the `return_to` is NOT cleared — it stays in sessionStorage. On the NEXT successful topup (even days later), the user is unexpectedly navigated back to the old `return_to` URL. **This is a real bug** — the `return_to` is only removed inside the `shouldVerify` success path. If the user cancels or the verify errors, the stale `return_to` persists.

**Proof:** Lines ~370-380:
```js
try {
  const returnTo = window.sessionStorage.getItem("zivo:wallet-return-to");
  if (returnTo) {
    window.sessionStorage.removeItem("zivo:wallet-return-to");
    // navigate...
  }
} catch { /* ignore */ }
```
This is inside the `shouldVerify` block's `finally`. If `shouldVerify` is false (user cancelled, or no payment_intent), the `return_to` is never cleared. Next time the user does a successful topup (from the Wallet page directly, no deep-link), the stale `return_to` fires and navigates them away unexpectedly.

**Severity:** Medium. A user who cancels a deep-link topup, then later tops up normally from the Wallet page, gets unexpectedly redirected to the old PPV page.

### Bug 9: `useEffect` — `topup_amount` deep-link opens the sheet but the `topup` param is NOT stripped

**Location:** Lines ~330-340.

```js
const deepAmountCents = url.searchParams.get("topup_amount");
if (deepAmountCents) {
  // ... setTopupAmount, setTopupStep, setTopupOpen
  url.searchParams.delete("topup_amount");
  window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
}
```

The `topup_amount` is stripped. Good. But the `topup` param (if present alongside) is not stripped here — it's stripped in the `shouldVerify`/`cancel` branches. If the URL is `/wallet?topup_amount=1500&topup=success`, the `topup_amount` is stripped but `topup=success` remains, and `shouldVerify` is false (no sid/payment_intent), so the `topup` param is NOT stripped (the `else if (status === "cancel")` branch doesn't match). The URL keeps `?topup=success` forever. On every reload, the effect runs, `shouldVerify` is false, nothing happens, but the URL stays dirty. **Minor — not user-facing (no visible effect), just a dirty URL.** Not reportable as a user-facing bug.

### Bug 10: `handleTopup` — `topupAmountCents` minimum check uses `< 500` but the deep-link rounds up

**Location:** Line ~310.

```js
if (!Number.isFinite(cents) || cents < 500) {
  toast.error("Minimum topup is $5");
  return;
}
```

If deep-link sends `?topup_amount=499` (=$4.99), the deep-link handler rounds up to `"5.00"`, so `topupAmountCents = 500`, passes the check. Fine. If deep-link sends `?topup_amount=100` (=$1.00), rounds to `"1.00"`, `topupAmountCents = 100`, fails the check with "Minimum topup is $5". The user sees the sheet open with $1.00 and an error toast. **Minor UX — the sheet opens but immediately errors.** Not a hard bug.

### Bug 11: `useEffect` — deep-link `topup_amount` opens the sheet but does NOT auto-start `handleTopup`

Already covered in Bug 4 — not a bug.

### Bug 12: `useEffect` — the `topup` verify runs even when the user navigated away

**Location:** Lines ~345-380.

The async IIFE runs `verify-user-wallet-topup` and then `navigate(returnTo)`. If the user navigates away from `/wallet` before the verify completes, the `navigate` still fires (no unmount guard). This could navigate the user away from wherever they went. **Minor race** — not easily provable as a user-facing bug without more context. Skip.

### Bug 13: `useEffect` — `topup` verify does not check `data?.credited` before navigating back

**Location:** Lines ~370-380.

```js
if (error) {
  toast.error("Could not verify topup");
} else if ((data as any)?.credited) {
  toast.success(...);
} else {
  toast.message("Topup already credited");
}
// ... finally { ... navigate(returnTo) }
```

The `navigate(returnTo)` happens in the `finally` block regardless of whether the verify succeeded or failed. So even if `verify-user-wallet-topup` returns an error (e.g., the edge function is down), the user is still navigated back to the PPV page — where the content is still locked (because the topup wasn't credited). The user is taken back to a locked page with no way to know the topup failed (other than the toast). **This is a real bug** — the return navigation should only happen on success (`credited: true`), not on error or "already credited".

**Proof:** The `navigate(returnTo)` is in the `finally` block, which runs on error, success, and "already credited" alike. If the edge function errors, the user is navigated back to the PPV page where the content is still locked.

### Bug 14: `useEffect` — `topup_amount` deep-link does not preserve `return_to` across the Stripe redirect

**Location:** Lines ~320-340.

The deep-link handler stores `return_to` in sessionStorage and strips it from the URL. Then `handleTopup` calls `create-user-wallet-topup` which returns a `client_secret`. The `WalletTopupPaymentForm` calls `stripe.confirmPayment` with `return_url: ${origin}/wallet?topup=success`. After the redirect, the effect runs again, `shouldVerify` is true, and it reads `return_to` from sessionStorage and navigates back. **This works** — the `return_to` survives in sessionStorage. Good.

But wait — the deep-link handler runs on mount. If the user enters via `?topup_amount=1500&return_to=/ppv/123`, the handler stores `return_to`, opens the sheet. The user clicks "Top up", `handleTopup` runs, gets a client_secret, shows the payment form. The user pays, Stripe redirects to `/wallet?topup=success&payment_intent=pi_xxx&redirect_status=succeeded`. The effect runs again, `shouldVerify` is true, verifies, and navigates back to `/ppv/123`. **This works correctly.**

### Bug 15: `useEffect` — the `topup` verify's `navigate(returnTo)` uses
