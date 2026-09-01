export interface EatsPayoutOrderSnapshot {
  id: string;
  total_amount: number | string | null;
  currency: string | null;
  status: string | null;
  payment_status: string | null;
  payment_provider: string | null;
  payment_type: string | null;
  last_payment_error: string | null;
  refund_status: string | null;
  refunded_at: string | null;
  payout_hold: boolean | null;
  payout_eligible_at: string | null;
  commission_percent: number | string | null;
  commission_amount_cents: number | null;
  restaurant_payout_cents: number | null;
}

export interface EatsPayoutLedgerSnapshot {
  order_id: string;
  amount_cents: number;
  direction: string;
  status: string;
  stripe_reversal_id: string | null;
}

export interface EatsPayoutRequestSnapshot {
  amount_cents: number;
  status: string | null;
}

export interface EatsManualPayoutSummary {
  eligibleOrderIds: string[];
  grossCents: number;
  platformFeeCents: number;
  earnedCents: number;
  automaticReservedCents: number;
  manualReservedCents: number;
  availableCents: number;
  commissionPercent: number | null;
  usesMixedCommissionRates: boolean;
}

const TERMINAL_FULFILLMENT_STATUSES = new Set(["completed", "delivered"]);
const SETTLED_PAYMENT_STATUSES = new Set(["paid", "cash_on_delivery"]);
const MANUAL_PAYOUT_PROVIDERS = new Set(["cash", "wallet", "paypal", "square"]);
const NON_OBLIGATING_REQUEST_STATUSES = new Set([
  "cancelled",
  "failed",
  "rejected",
]);
const NON_BLOCKING_REFUND_STATUSES = new Set(["", "none", "not_required"]);

function normalized(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function safeCents(value: number | null | undefined): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0
    ? Number(value)
    : null;
}

function resolvedProvider(order: EatsPayoutOrderSnapshot): string {
  const provider = normalized(order.payment_provider);
  if (provider) return provider;
  const paymentType = normalized(order.payment_type);
  return paymentType === "card" ? "stripe" : paymentType;
}

function isEligibleManualOrder(
  order: EatsPayoutOrderSnapshot,
  nowMs: number,
): boolean {
  if (normalized(order.currency) !== "usd") return false;
  const status = normalized(order.status);
  const isNoRefundCancellation =
    status === "cancelled" &&
    normalized(order.payment_status) === "paid" &&
    normalized(order.last_payment_error) === "cancelled_no_refund";
  if (!TERMINAL_FULFILLMENT_STATUSES.has(status) && !isNoRefundCancellation)
    return false;
  if (!SETTLED_PAYMENT_STATUSES.has(normalized(order.payment_status)))
    return false;
  if (!MANUAL_PAYOUT_PROVIDERS.has(resolvedProvider(order))) return false;
  if (order.payout_hold === true) return false;
  if (!NON_BLOCKING_REFUND_STATUSES.has(normalized(order.refund_status)))
    return false;
  if (order.refunded_at) return false;

  if (!order.payout_eligible_at) return false;
  const eligibleAt = Date.parse(order.payout_eligible_at);
  if (!Number.isFinite(eligibleAt) || eligibleAt > nowMs) return false;
  return true;
}

/**
 * Browser display estimate for the manual Eats payout balance.
 *
 * The Edge Function and transactional database RPC remain authoritative. This
 * helper deliberately uses immutable per-order payout snapshots and fails
 * closed when any otherwise-eligible order has inconsistent money fields.
 */
export function calculateEatsManualPayoutSummary(
  orders: EatsPayoutOrderSnapshot[],
  ledger: EatsPayoutLedgerSnapshot[],
  requests: EatsPayoutRequestSnapshot[],
  nowMs = Date.now(),
): EatsManualPayoutSummary {
  const eligibleOrderIds: string[] = [];
  const commissionRates = new Set<number>();
  let grossCents = 0;
  let platformFeeCents = 0;
  let earnedCents = 0;

  for (const order of orders) {
    if (!isEligibleManualOrder(order, nowMs)) continue;

    const total = Number(order.total_amount);
    const orderGrossCents = Number.isFinite(total)
      ? Math.round(total * 100)
      : -1;
    const commissionPercent = Number(order.commission_percent);
    const commissionCents = safeCents(order.commission_amount_cents);
    const payoutCents = safeCents(order.restaurant_payout_cents);
    const expectedCommissionCents = Number.isFinite(commissionPercent)
      ? Math.round((orderGrossCents * commissionPercent) / 100)
      : -1;

    if (
      !order.id ||
      !Number.isSafeInteger(orderGrossCents) ||
      orderGrossCents <= 0 ||
      !Number.isFinite(commissionPercent) ||
      commissionPercent < 0 ||
      commissionPercent > 100 ||
      commissionCents === null ||
      payoutCents === null ||
      commissionCents !== expectedCommissionCents ||
      commissionCents + payoutCents !== orderGrossCents
    ) {
      throw new Error("An eligible order has an invalid payout snapshot");
    }

    eligibleOrderIds.push(order.id);
    commissionRates.add(commissionPercent);
    grossCents += orderGrossCents;
    platformFeeCents += commissionCents;
    earnedCents += payoutCents;
  }

  const eligibleIds = new Set(eligibleOrderIds);
  const automaticReservedCents = ledger.reduce((sum, transfer) => {
    if (!eligibleIds.has(transfer.order_id)) return sum;
    if (
      normalized(transfer.direction) !== "transfer" ||
      !["queued", "created", "failed"].includes(normalized(transfer.status))
    ) {
      return sum;
    }

    const amount = safeCents(transfer.amount_cents);
    if (amount === null) {
      throw new Error("A payout ledger entry has an invalid amount");
    }

    const hasExactCompletedReversal = ledger.some((reversal) => {
      if (
        reversal.order_id !== transfer.order_id ||
        normalized(reversal.direction) !== "reversal" ||
        normalized(reversal.status) !== "created" ||
        !normalized(reversal.stripe_reversal_id)
      ) {
        return false;
      }
      const reversalAmount = safeCents(reversal.amount_cents);
      if (reversalAmount === null) {
        throw new Error("A payout ledger entry has an invalid amount");
      }
      return reversalAmount === amount;
    });

    return hasExactCompletedReversal ? sum : sum + amount;
  }, 0);

  const manualReservedCents = requests.reduce((sum, request) => {
    if (NON_OBLIGATING_REQUEST_STATUSES.has(normalized(request.status)))
      return sum;
    const amount = safeCents(request.amount_cents);
    if (amount === null) {
      throw new Error("A payout request has an invalid amount");
    }
    return sum + amount;
  }, 0);

  const rates = [...commissionRates];
  return {
    eligibleOrderIds,
    grossCents,
    platformFeeCents,
    earnedCents,
    automaticReservedCents,
    manualReservedCents,
    availableCents: Math.max(
      0,
      earnedCents - automaticReservedCents - manualReservedCents,
    ),
    commissionPercent: rates.length === 1 ? rates[0] : null,
    usesMixedCommissionRates: rates.length > 1,
  };
}
