/**
 * Important Booking Notice Component
 * Pre-booking trust builder with variant-specific copy
 */

import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHECKOUT_NOTICE } from "@/config/checkoutCompliance";

interface ImportantBookingNoticeProps {
  variant: "flights" | "hotels" | "cars";
  className?: string;
  compact?: boolean;
}

export default function ImportantBookingNotice({
  variant,
  className,
  compact = false,
}: ImportantBookingNoticeProps) {
  const noticeContent = CHECKOUT_NOTICE[variant];

  if (compact) {
    return (
      <div className={cn(
        "text-xs text-muted-foreground bg-muted/30 rounded-xl p-3",
        className
      )}>
        <p className="font-medium mb-1 flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          {CHECKOUT_NOTICE.title}
        </p>
        <p>{noticeContent.disclaimer}</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 md:p-5",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-2 text-foreground">
            {CHECKOUT_NOTICE.title}
          </h3>
          <ul className="space-y-1.5 mb-3">
            {noticeContent.items.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-amber-600 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground/80 border-t border-amber-500/20 pt-3">
            {noticeContent.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
