/**
 * Security Badge Strip — horizontal trust indicators for checkout vault
 */
import { Lock, ShieldCheck, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHECKOUT_TRUST_SIGNALS } from "@/config/checkoutCompliance";

interface CheckoutSecurityStripProps {
  className?: string;
}

const badges = [
  { icon: Lock, label: CHECKOUT_TRUST_SIGNALS.ssl },
  { icon: ShieldCheck, label: CHECKOUT_TRUST_SIGNALS.pci },
  { icon: Fingerprint, label: CHECKOUT_TRUST_SIGNALS.secure },
];

export default function CheckoutSecurityStrip({ className }: CheckoutSecurityStripProps) {
  return (
    <div className={cn("flex items-center justify-center gap-4 py-3 px-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15", className)}>
      {badges.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{label}</span>
        </div>
      ))}
    </div>
  );
}
