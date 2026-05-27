/**
 * Checkout Sticky Footer — mobile-optimized sticky CTA with price
 */
import { motion } from "framer-motion";
import { Lock, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CheckoutStickyFooterProps {
  totalPrice: number;
  currency: string;
  isPaying: boolean;
  disabled: boolean;
  onPay: () => void;
  className?: string;
}

function formatPrice(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function CheckoutStickyFooter({
  totalPrice,
  currency,
  isPaying,
  disabled,
  onPay,
  className,
}: CheckoutStickyFooterProps) {
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
      "bg-background/95 backdrop-blur-xl border-t border-border/50",
      "safe-area-bottom",
      className
    )}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground">Total</p>
          <p className="text-lg font-bold text-foreground">{formatPrice(totalPrice, currency)}</p>
        </div>
        <motion.div whileTap={{ scale: 0.97 }} className="shrink-0">
          <Button
            onClick={onPay}
            disabled={disabled || isPaying}
            className="h-12 px-6 text-sm font-bold gap-2 bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90 rounded-2xl shadow-lg min-h-[48px]"
          >
            {isPaying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Pay Now
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
