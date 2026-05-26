/**
 * Secure Checkout Button Component
 * Unified CTA with trust signals and subtext
 */

import { motion } from "framer-motion";
import { Lock, Shield, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHECKOUT_CTA } from "@/config/checkoutCompliance";

interface SecureCheckoutButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: "flights" | "hotels" | "cars" | "default";
  showSubtext?: boolean;
  showIcon?: boolean;
  buttonText?: string;
  className?: string;
}

export default function SecureCheckoutButton({
  onClick,
  isLoading = false,
  disabled = false,
  variant = "default",
  showSubtext = true,
  showIcon = true,
  buttonText,
  className,
}: SecureCheckoutButtonProps) {
  const variantColors = {
    flights: "bg-flights hover:bg-flights/90",
    hotels: "bg-hotels hover:bg-hotels/90",
    cars: "bg-cars hover:bg-cars/90",
    default: "bg-primary hover:bg-primary/90",
  };

  return (
    <div className={cn("space-y-2", className)}>
      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          onClick={onClick}
          disabled={disabled || isLoading}
          className={cn(
            "w-full h-12 md:h-14 text-base font-bold gap-2 text-primary-foreground rounded-2xl touch-manipulation transition-all duration-200 shadow-lg min-h-[48px]",
            variantColors[variant]
          )}
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {showIcon && <Lock className="w-5 h-5" />}
              {buttonText || CHECKOUT_CTA.button}
            </>
          )}
        </Button>
      </motion.div>
      
      {showSubtext && !isLoading && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-center text-muted-foreground"
        >
          {CHECKOUT_CTA.subtext}
        </motion.p>
      )}
    </div>
  );
}
