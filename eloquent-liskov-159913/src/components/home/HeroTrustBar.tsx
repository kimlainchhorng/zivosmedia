/**
 * HeroTrustBar - Clean trust chips
 */
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import { cn } from "@/lib/utils";

const trustItems = [
  "Secure Checkout",
  "Instant Confirmation", 
  "24/7 Support",
  "No Hidden Fees",
];

interface HeroTrustBarProps {
  className?: string;
  variant?: "default" | "compact";
}

export default function HeroTrustBar({ className, variant = "default" }: HeroTrustBarProps) {
  return (
    <div className={cn(
      "flex flex-wrap items-center justify-center gap-3 sm:gap-4",
      variant === "default" && "py-2",
      className
    )}>
      {trustItems.map((item) => (
         <div
          key={item}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-default touch-manipulation px-2 py-1 rounded-xl hover:bg-muted/30"
        >
          <CheckCircle className="w-3.5 h-3.5 shrink-0 text-primary" />
          <span className={cn(
            "font-medium whitespace-nowrap",
            variant === "default" ? "text-xs sm:text-sm" : "text-xs"
          )}>
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}
