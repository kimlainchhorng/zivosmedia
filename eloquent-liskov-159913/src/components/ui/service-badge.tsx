import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { TrendingUp, Sparkles, Tag, Flame, Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ZIVO SERVICE BADGE
 * Consistent badges across all products
 * Use for Hot, New, Save, Popular indicators
 */

const serviceBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        hot: "bg-red-500/90 text-primary-foreground",
        new: "bg-emerald-500/90 text-primary-foreground",
        save: "bg-amber-500/90 text-primary-foreground",
        popular: "bg-sky-500/90 text-primary-foreground",
        featured: "bg-violet-500/90 text-primary-foreground",
        trending: "bg-gradient-to-r from-orange-500 to-red-500 text-primary-foreground",
        // Product-specific
        flights: "bg-sky-500/20 text-sky-400 border border-sky-500/30",
        hotels: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        cars: "bg-violet-500/20 text-violet-400 border border-violet-500/30",
        // Utility
        outline: "bg-transparent border border-border text-muted-foreground",
        muted: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-2.5 py-1",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "muted",
      size: "default",
    },
  }
);

const badgeIcons = {
  hot: Flame,
  new: Sparkles,
  save: Tag,
  popular: Star,
  featured: Star,
  trending: TrendingUp,
};

export interface ServiceBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof serviceBadgeVariants> {
  showIcon?: boolean;
}

const ServiceBadge = React.forwardRef<HTMLDivElement, ServiceBadgeProps>(
  ({ className, variant, size, showIcon = true, children, ...props }, ref) => {
    const IconComponent = variant && badgeIcons[variant as keyof typeof badgeIcons];
    
    return (
      <div
        ref={ref}
        className={cn(serviceBadgeVariants({ variant, size, className }))}
        {...props}
      >
        {showIcon && IconComponent && <IconComponent className="w-3 h-3" />}
        {children}
      </div>
    );
  }
);
ServiceBadge.displayName = "ServiceBadge";

export { ServiceBadge, serviceBadgeVariants };
