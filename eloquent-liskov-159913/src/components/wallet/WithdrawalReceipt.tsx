/**
 * WithdrawalReceipt — success modal shown after process-withdrawal returns.
 * Displays amount, method, reference id, and expected arrival date.
 */
import { CheckCircle2, Copy, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/ui/responsive-modal";

export interface WithdrawalReceiptData {
  transaction_id: string;
  amount_cents: number;
  method: string;
  method_type: "bank_transfer" | "aba" | string;
  estimated_arrival: string;
  estimated_business_days: number;
  payout_label?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: WithdrawalReceiptData | null;
  onViewHistory?: () => void;
}

export default function WithdrawalReceipt({ open, onOpenChange, data, onViewHistory }: Props) {
  if (!data) return null;

  const amount = (data.amount_cents / 100).toFixed(2);
  const arrival = (() => {
    try {
      return format(new Date(data.estimated_arrival), "EEE, MMM d");
    } catch {
      return "1–3 business days";
    }
  })();
  const shortRef = data.transaction_id.slice(0, 8).toUpperCase();

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(data.transaction_id);
      toast.success("Reference ID copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title=""
      footer={
        <div className="flex gap-2 w-full">
          {onViewHistory && (
            <Button
              variant="outline"
              className="flex-1 rounded-xl font-semibold"
              onClick={() => {
                onOpenChange(false);
                onViewHistory();
              }}
            >
              View History
            </Button>
          )}
          <Button
            className="flex-1 rounded-xl font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      }
    >
      <div className="px-1 py-2 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-3"
        >
          <CheckCircle2 className="w-9 h-9 text-emerald-500" strokeWidth={2.5} />
        </motion.div>
        <h2 className="text-lg font-extrabold tracking-tight">Withdrawal submitted</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We're processing your transfer. You'll get a notification when it lands.
        </p>

        <div className="mt-5 rounded-2xl bg-muted/30 border border-border/40 p-4 text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Amount</span>
            <span className="font-bold tabular-nums">${amount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Method</span>
            <span className="font-semibold text-sm">
              {data.payout_label || data.method}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" /> Expected arrival
            </span>
            <span className="font-semibold text-sm">{arrival}</span>
          </div>
          <div className="border-t border-border/40 pt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Reference</span>
            <button type="button"
              onClick={copyRef}
              className="font-mono text-xs font-semibold flex items-center gap-1.5 hover:text-emerald-600 transition-colors"
            >
              {shortRef}
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/70 mt-3">
          Keep your reference ID in case you need to contact support.
        </p>
      </div>
    </ResponsiveModal>
  );
}
