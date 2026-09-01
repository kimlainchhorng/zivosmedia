import { ShieldAlert } from "lucide-react";

interface Props {
  balanceDollars: number;
}

/**
 * The previous Stripe Connect and PayPal actions moved provider funds before
 * the wallet debit and settlement evidence were durably committed. Keep every
 * caller truthful and non-actionable until one atomic payout authority owns the
 * reservation, provider result, and compensation path.
 */
export default function UnifiedPayoutCard({ balanceDollars }: Props) {
  return (
    <div
      role="status"
      data-wallet-balance-cents={Math.round(balanceDollars * 100)}
      className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-bold">Wallet payouts are paused</p>
          <p className="mt-1 text-xs leading-relaxed opacity-85">
            Stripe and PayPal cash out are temporarily unavailable while secure
            payout tracking is completed. Your wallet balance is unchanged.
          </p>
        </div>
      </div>
    </div>
  );
}
