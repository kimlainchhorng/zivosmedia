# MiMo run — 2026-06-15T17:35:38.541Z

- model: mimo-v2.5-pro
- api_format: openai
- task: Review this code change for correctness, race conditions, and error handling. It wires an inline post-order Cancel button to the real cancel+refund edge function. Be concise; flag only real bugs with severity.
- files: docs/agent-runs/_review-brief-eats-inline-cancel.md

---

## Review: Inline Cancel Button → Real Cancel+Refund Flow

### Verdict: **Correct — no real bugs.** A few minor observations below, none severity-worthy.

---

### What's right

1. **Same edge function, same contract** — mirrors `EatsTrackingPage`'s `CancelOrderButton` exactly (same `invoke` call, same error unwrap, same refund toast). No divergence to drift.

2. **Guard against double-fire** — `if (!trackedOrderId || cancellingOrder) return;` prevents the user from tapping twice while the invoke is in-flight. The button also gets `disabled={cancellingOrder}` visually.

3. **Error path keeps overlay open** — on failure (409 already-terminal, network error, etc.) the `catch` toasts the error and the overlay stays, so the order remains trackable. Correct.

4. **Success path is clean** — `setTrackedOrderId(null)` + `setStep("browse")` immediately closes the overlay. The realtime subscription on `food_orders` is a backstop (if the user navigates away before the toast, the subscription still cleans up).

5. **Countdown guard** — the button only renders while `cancelCountdown > 0 && statusStep === 0`, so the 60-second window is enforced at the UI level. The edge function also enforces status-based eligibility server-side (pending/confirmed only → full refund), so even if the countdown drifts, the backend is the real gate.

6. **`finally` resets `cancellingOrder`** — so the button re-enables on error. No stuck state.

---

### Minor observations (not bugs)

| # | Observation | Severity | Action |
|---|-------------|----------|--------|
| 1 | **`setStep("browse")` vs `setStep("cart")`** — the old code went back to `"cart"`, the new code goes to `"browse"`. This is intentional (cancelled order → go browse, not back to a stale cart), but confirm the cart was already cleared after `placeOrder` succeeded (the brief says it was: "clears the cart + localStorage"). If so, `"browse"` is correct. | Info | Confirm |
| 2 | **Realtime race** — if the edge function returns 200 and the realtime subscription fires `status === "cancelled"` before `setTrackedOrderId(null)` executes in the `try` block, both paths set `trackedOrderId = null`. This is harmless (React batches, `null → null` is a no-op). No bug. | None | — |
| 3 | **409 "already_inactive"** — the edge function returns HTTP 409 with `{ error: "already_inactive", current_status }`. The `catch` block will toast `"already_inactive"` (or whatever the message is). This is technically the edge function's error string, not a user-friendly message. But it's the same behavior as `EatsTrackingPage`'s `CancelOrderButton`, so consistency is maintained. If you ever want friendlier messages, that's a separate pass on both surfaces. | Cosmetic | — |
| 4 | **`Loader2` import** — the brief says it's already imported. Confirm it's in the `lucide-react` import block at the top of `EatsLanding.tsx`. If not, add it. | Info | Confirm |
| 5 | **`cancellingOrder` state placement** — the brief places it next to the other order-tracker state (~line 217). This is correct; it doesn't need to be in a ref since the component doesn't unmount during the invoke (the overlay is visible). | None | — |

---

### What the owner must verify

1. **`Loader2` is imported** in `EatsLanding.tsx` (add to the lucide import if missing).
2. **`setStep("browse")` is the correct post-cancel landing** — confirm the cart is already empty after `placeOrder` so the user doesn't land on an empty cart screen.
3. **Do NOT run an end-to-end cancel test** — the Stripe key is live. Code review only.
4. Run `npm run update` after applying the diff (type-check + build must pass).

---

### Proposed diff

The brief's three changes are clean and minimal. Here's the unified diff for `src/pages/EatsLanding.tsx`:

```diff
--- a/src/pages/EatsLanding.tsx
+++ b/src/pages/EatsLanding.tsx
@@ -217,6 +217,7 @@
   const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
   const [statusStep, setStatusStep] = useState(0);
   const [cancelCountdown, setCancelCountdown] = useState(60);
+  const [cancellingOrder, setCancellingOrder] = useState(false);
 
   // ... (existing handlePlaceOrder) ...
 
+  // Reuses the REAL cancel + refund path (cancel-eats-order edge function),
+  // the same one EatsTrackingPage's CancelOrderButton calls.
+  const handleCancelTrackedOrder = async () => {
+    if (!trackedOrderId || cancellingOrder) return;
+    setCancellingOrder(true);
+    try {
+      const { data, error } = await supabase.functions.invoke("cancel-eats-order", {
+        body: { order_id: trackedOrderId, reason: "customer_initiated" },
+      });
+      if (error) throw error;
+      if ((data as any)?.error) throw new Error((data as any).error);
+      const r = data as { refund_cents?: number; payment_status?: string; provider?: string };
+      if (r?.refund_cents && r.refund_cents > 0) {
+        toast.success("Order cancelled", {
+          description: `$${(r.refund_cents / 100).toFixed(2)} refund ${r.payment_status === "refunded" ? "issued" : "in progress"} via ${r.provider || "your payment method"}.`,
+        });
+      } else {
+        toast.success("Order cancelled");
+      }
+      setTrackedOrderId(null);
+      setStep("browse");
+    } catch (e: any) {
+      toast.error(e?.message || "Cancellation failed");
+    } finally {
+      setCancellingOrder(false);
+    }
+  };
+
@@ -2645,10 +2646,14 @@
   {cancelCountdown > 0 && statusStep === 0 && (
-    <button type="button"
-      onClick={() => { setTrackedOrderId(null); setStep("cart"); }}
-      className="text-[12px] text-muted-foreground underline-offset-2 hover:underline">
-      Cancel order ({cancelCountdown}s)
+    <button type="button"
+      onClick={handleCancelTrackedOrder}
+      disabled={cancellingOrder}
+      className="flex items-center gap-1.5 text-[12px] text-muted-foreground underline-offset-2 hover:underline disabled:opacity-60 disabled:no-underline">
+      {cancellingOrder && <Loader2 className="w-3 h-3 animate-spin" />}
+      {cancellingOrder ? "Cancelling…" : `Cancel order (${cancelCountdown}s)`}
     </button>
   )}
```

**Apply this, confirm the two info items above, then run `npm run update`.**
