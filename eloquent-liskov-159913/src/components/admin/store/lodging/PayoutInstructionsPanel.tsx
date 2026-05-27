/**
 * PayoutInstructionsPanel
 * -----------------------
 * Country-aware fees, processing time, and required-field guidance for both
 * hosts and admins so everyone understands how money actually moves.
 */
import { Info, Clock, Wallet, CheckCircle2, ShieldCheck } from "lucide-react";
import { normalizeCountry, recommendedRail, RAIL_LABELS } from "@/lib/payouts/payoutRails";

interface Props { country?: string | null; }

export default function PayoutInstructionsPanel({ country }: Props) {
  const c = normalizeCountry(country);
  const rail = recommendedRail(c);
  const copy = COPY[c] || COPY.DEFAULT;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{copy.title}</p>
        <span className="ml-auto text-[11px] text-muted-foreground">
          Default rail: <span className="font-medium">{RAIL_LABELS[rail]}</span>
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Row icon={Wallet} label="Fees" value={copy.fees} />
        <Row icon={Clock} label="Processing time" value={copy.processing} />
        <Row icon={CheckCircle2} label="Required fields" value={copy.required} />
      </div>

      {copy.adminNote && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-900 dark:text-amber-200">
            <span className="font-semibold">Admin note: </span>{copy.adminNote}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Info; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/60 p-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3" />{label}
      </div>
      <p className="mt-1 text-xs leading-snug">{value}</p>
    </div>
  );
}

const COPY: Record<string, { title: string; fees: string; processing: string; required: string; adminNote?: string }> = {
  KH: {
    title: "Cambodia (ABA / KHQR) payouts",
    fees: "ZIVO covers ABA transfer fees. Net = booking total − 2% platform fee.",
    processing: "Manual ABA transfer within 1 business day after request.",
    required: "ABA account number, account holder full name, phone linked to ABA.",
    adminNote: "Each payout request triggers a Telegram alert to the ZIVO finance team for manual processing.",
  },
  US: {
    title: "United States payouts",
    fees: "Stripe Express handles transfers. Net = booking total − 2% platform fee.",
    processing: "Automated bank deposit in 2 business days after Stripe payout.",
    required: "Stripe Connect onboarding (SSN/EIN, bank account). 1099-K issued by Stripe.",
  },
  DEFAULT: {
    title: "International payouts",
    fees: "Net = booking total − 2% platform fee. SWIFT or correspondent fees may apply for bank wires.",
    processing: "Stripe (where supported) 2 business days. Manual bank wire / PayPal: 2–3 business days.",
    required: "Account holder name, IBAN/SWIFT (wire) or verified PayPal email.",
    adminNote: "Manual rails are reviewed and processed by ZIVO finance after each payout request.",
  },
};
