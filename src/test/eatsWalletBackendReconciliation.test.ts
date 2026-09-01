import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const paymentStatus = read(
  "supabase/functions/eats-payment-status-update/index.ts",
);
const cancellation = read("supabase/functions/cancel-eats-order/index.ts");
const migration = read(
  "supabase/migrations/20260830183748_eats_wallet_backend_reconciliation.sql",
);

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThan(-1);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("Eats wallet backend reconciliation", () => {
  it("verifies the exact wallet debit before confirming payment", () => {
    expect(paymentStatus).toContain("order.customer_id !== user.id");
    expect(paymentStatus).not.toContain("order.user_id !== user.id");
    expect(paymentStatus).toContain('.from("customer_wallet_transactions")');
    expect(paymentStatus).toContain(
      ".or(`reference_id.eq.${orderId},order_id.eq.${orderId}`)",
    );
    expect(paymentStatus).toContain('.in("type", ["purchase", "payment"])');
    expect(paymentStatus).toContain(
      '.eq("amount_cents", -expectedAmountCents)',
    );
    expect(paymentStatus).toContain("Wallet payment ledger not found");

    const walletBranch = sliceBetween(
      paymentStatus,
      'if (action === "wallet_paid") {',
      '} else {\n          if (order.payment_type !== "cash")',
    );
    expect(walletBranch.indexOf("hasWalletPaymentLedger(")).toBeLessThan(
      walletBranch.indexOf('paymentUpdate.payment_status = "paid"'),
    );
  });

  it("persists dispatch recovery before calling the service-role dispatcher", () => {
    const reconciliation = sliceBetween(
      paymentStatus,
      'if (action === "wallet_paid" || action === "cash_on_delivery") {',
      'if (action === "card_processing") {',
    );

    expect(reconciliation).toContain(
      "last_payment_error: DISPATCH_PENDING_ERROR",
    );
    expect(reconciliation).toContain('payment_status = "cash_on_delivery"');
    expect(reconciliation).toContain('payment_provider = "cash"');
    expect(reconciliation.indexOf(".update(paymentUpdate)")).toBeLessThan(
      reconciliation.indexOf("await dispatchOrder("),
    );
    expect(reconciliation.indexOf("await dispatchOrder(")).toBeLessThan(
      reconciliation.indexOf("last_payment_error: null"),
    );

    expect(paymentStatus).toContain(
      "`${supabaseUrl}/functions/v1/dispatch-eats-order`",
    );
    expect(paymentStatus).toContain("Authorization: `Bearer ${serviceKey}`");
    expect(paymentStatus).toContain("apikey: serviceKey");
    expect(paymentStatus).toContain("!response.ok || payload?.ok !== true");
  });

  it("returns explicit confirmed and retryable states and only notifies wallet orders", () => {
    const reconciliation = sliceBetween(
      paymentStatus,
      'if (action === "wallet_paid" || action === "cash_on_delivery") {',
      'if (action === "card_processing") {',
    );

    expect(reconciliation).toContain('state: "retryable"');
    expect(reconciliation).toContain('code: "dispatch_pending"');
    expect(reconciliation).toContain("payment_confirmed: true");
    expect(reconciliation).toContain("dispatch_pending: true");
    expect(reconciliation).toContain('state: "confirmed"');
    expect(reconciliation).toContain("order: reconciledOrder");
    expect(reconciliation).toContain(
      '"id, payment_status, payment_provider, last_payment_error"',
    );

    const notificationIndex = reconciliation.indexOf(
      'await notifyEatsOrderConfirmed(admin, orderId, "ZIVO Wallet")',
    );
    const walletNotificationGuard = reconciliation.lastIndexOf(
      'if (action === "wallet_paid") {',
      notificationIndex,
    );
    expect(notificationIndex).toBeGreaterThan(-1);
    expect(walletNotificationGuard).toBeGreaterThan(-1);
    expect(reconciliation.indexOf("last_payment_error: null")).toBeLessThan(
      notificationIndex,
    );
  });

  it("recovers a pending wallet order through the atomic refund RPC", () => {
    expect(cancellation).toContain(
      "status, payment_type, payment_status, payment_provider",
    );
    expect(cancellation).toContain("const isWallet =");
    expect(cancellation).toContain("walletDebit.found ||");
    expect(cancellation).toContain('(order as any).payment_type === "wallet"');
    expect(cancellation).toContain('.in("type", ["purchase", "payment"])');
    expect(cancellation).toContain('.lt("amount_cents", 0)');
    expect(cancellation).toContain(
      'admin.rpc("claim_eats_wallet_cancellation", {',
    );
    expect(cancellation).toContain("claim.wallet_refund_required === true");
    expect(cancellation).toContain('admin.rpc("process_eats_wallet_refund", {');
    expect(cancellation).toContain('error: "wallet_refund_pending"');
    expect(cancellation).not.toMatch(
      /from\("customer_wallet_transactions"\)[\s\S]{0,500}\.insert\(/,
    );

    const rpcIndex = cancellation.indexOf(
      'admin.rpc("process_eats_wallet_refund", {',
    );
    const claimIndex = cancellation.indexOf(
      'admin.rpc("claim_eats_wallet_cancellation", {',
    );
    expect(claimIndex).toBeGreaterThan(-1);
    expect(claimIndex).toBeLessThan(rpcIndex);
  });

  it("keeps Stripe cancellation refunds provider-valid and server-idempotent", () => {
    expect(cancellation).toContain("order_id: orderId");
    expect(cancellation).toContain("payment_intent_id: paymentId");
    expect(cancellation).toContain('type: "eats"');
    expect(cancellation).toContain("String(claim.refund_idempotency_key)");
    expect(cancellation).toContain(
      "p_refund_amount_cents: evidence.amountCents",
    );
    expect(cancellation).toContain("p_refund_currency: evidence.currency");
    expect(cancellation).not.toMatch(
      /stripe\.refunds\.create\(\{[\s\S]{0,240}\n\s*order_id,\n/,
    );
  });

  it("serializes wallet debits and rechecks reference idempotency after the lock", () => {
    const debit = sliceBetween(
      migration.toLowerCase(),
      "create or replace function public.process_customer_wallet_payment(",
      "comment on function public.process_customer_wallet_payment",
    );
    const orderLockIndex = debit.indexOf("from public.food_orders as food");
    const orderRowLockIndex = debit.indexOf("for update", orderLockIndex);
    const walletLookupIndex = debit.indexOf(
      "from public.customer_wallets as wallet",
      orderLockIndex,
    );
    const lockIndex = debit.indexOf("for update", walletLookupIndex);
    const idempotencyIndex = debit.indexOf(
      "from public.customer_wallet_transactions as tx",
      lockIndex,
    );

    expect(orderLockIndex).toBeGreaterThan(-1);
    expect(orderRowLockIndex).toBeGreaterThan(orderLockIndex);
    expect(walletLookupIndex).toBeGreaterThan(orderRowLockIndex);
    expect(walletLookupIndex).toBeGreaterThan(orderLockIndex);
    expect(lockIndex).toBeGreaterThan(-1);
    expect(idempotencyIndex).toBeGreaterThan(lockIndex);
    expect(debit).toContain("wallet_payment_user_mismatch");
    expect(debit).toContain("food.customer_id");
    expect(debit).not.toContain("food.user_id");
    expect(debit).toContain("order_is_not_wallet_payment");
    expect(debit).toContain("order_can_no_longer_be_charged");
    expect(debit).toContain("wallet_payment_order_amount_mismatch");
    expect(debit).toContain("wallet_payment_reference_amount_mismatch");
    expect(debit).toContain("payment_status = 'paid'");
    expect(debit).toContain("payment_provider = 'wallet'");
    expect(debit).toContain("last_payment_error = 'delivery_dispatch_pending'");
    expect(debit).toContain("v_current_balance - p_amount_cents");
    expect(debit).toContain("balance_after_cents");
    expect(debit).toContain("'purchase'");
    expect(debit).toContain("reference_id");
    expect(debit).toContain("order_id");
    expect(debit).toContain("from public, anon, authenticated");
    expect(debit).toContain("to service_role");
  });

  it("derives refunds from the original debit and rechecks after the wallet lock", () => {
    const refund = sliceBetween(
      migration.toLowerCase(),
      "create or replace function public.process_eats_wallet_refund(",
      "comment on function public.process_eats_wallet_refund",
    );
    const debitLookupIndex = refund.indexOf(
      "from public.customer_wallet_transactions as tx",
    );
    const walletLockIndex = refund.indexOf("for update", debitLookupIndex);
    const refundLookupIndex = refund.indexOf(
      "and tx.type = 'refund'",
      walletLockIndex,
    );

    expect(debitLookupIndex).toBeGreaterThan(-1);
    expect(walletLockIndex).toBeGreaterThan(debitLookupIndex);
    expect(refundLookupIndex).toBeGreaterThan(walletLockIndex);
    expect(refund).toContain("original_wallet_debit_not_found");
    expect(refund).toContain("wallet_refund_amount_mismatch");
    expect(refund).toContain("v_current_balance + v_refund_cents");
    expect(refund).toContain("balance_after_cents");
    expect(refund).toContain("payment_status = 'refunded'");
    expect(refund).toContain("status = 'cancelled'");
    expect(refund).toContain("from public, anon, authenticated");
    expect(refund).toContain("to service_role");
  });

  it("removes browser wallet-write authority while preserving owner reads", () => {
    const lower = migration.toLowerCase();

    expect(lower).toContain(
      'drop policy if exists "cw_update_own" on public.customer_wallets',
    );
    expect(lower).toContain(
      "revoke insert, update, delete on table public.customer_wallets",
    );
    expect(lower).toContain(
      "revoke insert, update, delete on table public.customer_wallet_transactions",
    );
    expect(lower).toContain("customer_wallets_block_direct_insert");
    expect(lower).toContain("customer_wallets_block_direct_update");
    expect(lower).toContain("customer_wallets_block_direct_delete");
    expect(lower).toContain("customer_wallet_transactions_block_direct_insert");
    expect(lower).toContain("customer_wallet_transactions_block_direct_update");
    expect(lower).toContain("customer_wallet_transactions_block_direct_delete");
    expect(lower).not.toMatch(/revoke\s+select/);
  });
});
