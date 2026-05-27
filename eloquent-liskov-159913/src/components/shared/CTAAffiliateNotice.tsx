/**
 * CTA Affiliate Notice
 * Small disclosure near outbound CTAs on results pages
 * Required for affiliate compliance
 */

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CTAAffiliateNoticeProps {
  className?: string;
  variant?: "inline" | "card";
}

export default function CTAAffiliateNotice({ 
  className,
  variant = "inline" 
}: CTAAffiliateNoticeProps) {
  if (variant === "card") {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-xl",
        "bg-muted/30 border border-border/50",
        "text-[10px] sm:text-xs text-muted-foreground",
        className
      )}>
        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
        <span>
          Continue to partner site to complete booking. Prices may change. ZIVO may earn a commission.
        </span>
      </div>
    );
  }

  // Default inline
  return (
    <p className={cn(
      "flex items-center gap-1.5 text-[10px] text-muted-foreground",
      className
    )}>
      <ExternalLink className="w-3 h-3 shrink-0" />
      <span>Continue to Partner · ZIVO may earn a commission.</span>
    </p>
  );
}
