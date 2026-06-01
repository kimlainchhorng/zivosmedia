import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ZIVO SERVICE BUTTON
 * Product-specific CTAs with consistent styling
 * Use for all travel booking actions
 */

const serviceButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      service: {
        flights: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg",
        hotels: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg",
        cars: "bg-ig-gradient hover:opacity-90 text-primary-foreground shadow-lg",
        primary: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-8",
        xl: "h-14 px-10 text-lg",
      },
    },
    defaultVariants: {
      service: "primary",
      size: "default",
    },
  }
);

export interface ServiceButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof serviceButtonVariants> {
  asChild?: boolean;
  showExternalIcon?: boolean;
}

const ServiceButton = React.forwardRef<HTMLButtonElement, ServiceButtonProps>(
  ({ className, service, size, asChild = false, showExternalIcon = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(serviceButtonVariants({ service, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
        {showExternalIcon && <ExternalLink className="w-4 h-4" />}
      </Comp>
    );
  }
);
ServiceButton.displayName = "ServiceButton";

export { ServiceButton, serviceButtonVariants };
