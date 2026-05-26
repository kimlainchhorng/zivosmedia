import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Zap, 
  Crown, 
  TrendingUp, 
  Shield, 
  Star, 
  Clock,
  Leaf,
  Flame,
  Heart
} from "lucide-react";

type BadgeVariant = 
  | "best-value" 
  | "popular" 
  | "sale" 
  | "new" 
  | "premium" 
  | "verified"
  | "fast"
  | "eco"
  | "hot"
  | "favorite"
  | "limited";

interface PremiumBadgeProps {
  variant: BadgeVariant;
  className?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

const badgeConfig: Record<BadgeVariant, { 
  icon: React.ElementType; 
  label: string; 
  colors: string;
  iconColors: string;
}> = {
  "best-value": {
    icon: Sparkles,
    label: "Best Value",
    colors: "from-emerald-500 to-emerald-600 text-primary-foreground shadow-emerald-500/30",
    iconColors: "text-primary-foreground"
  },
  "popular": {
    icon: TrendingUp,
    label: "Popular",
    colors: "from-amber-500 to-orange-500 text-primary-foreground shadow-amber-500/30",
    iconColors: "text-primary-foreground"
  },
  "sale": {
    icon: Zap,
    label: "Sale",
    colors: "from-red-500 to-rose-600 text-primary-foreground shadow-red-500/30",
    iconColors: "text-primary-foreground"
  },
  "new": {
    icon: Sparkles,
    label: "New",
    colors: "from-blue-500 to-indigo-600 text-primary-foreground shadow-blue-500/30",
    iconColors: "text-primary-foreground"
  },
  "premium": {
    icon: Crown,
    label: "Premium",
    colors: "from-amber-400 to-amber-600 text-primary-foreground shadow-amber-500/30",
    iconColors: "text-primary-foreground"
  },
  "verified": {
    icon: Shield,
    label: "Verified",
    colors: "from-emerald-500 to-teal-600 text-primary-foreground shadow-emerald-500/30",
    iconColors: "text-primary-foreground"
  },
  "fast": {
    icon: Zap,
    label: "Fast",
    colors: "from-sky-500 to-cyan-600 text-primary-foreground shadow-sky-500/30",
    iconColors: "text-primary-foreground"
  },
  "eco": {
    icon: Leaf,
    label: "Eco",
    colors: "from-green-500 to-emerald-600 text-primary-foreground shadow-green-500/30",
    iconColors: "text-primary-foreground"
  },
  "hot": {
    icon: Flame,
    label: "Hot Deal",
    colors: "from-orange-500 to-red-500 text-primary-foreground shadow-orange-500/30",
    iconColors: "text-primary-foreground"
  },
  "favorite": {
    icon: Heart,
    label: "Top Pick",
    colors: "from-pink-500 to-rose-500 text-primary-foreground shadow-pink-500/30",
    iconColors: "text-primary-foreground"
  },
  "limited": {
    icon: Clock,
    label: "Limited",
    colors: "from-purple-500 to-violet-600 text-primary-foreground shadow-purple-500/30",
    iconColors: "text-primary-foreground"
  }
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
  lg: "px-3 py-1.5 text-sm gap-2"
};

const iconSizeClasses = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-4 h-4"
};

export const PremiumBadge = ({ 
  variant, 
  className, 
  size = "md",
  animated = true 
}: PremiumBadgeProps) => {
  const config = badgeConfig[variant];
  const Icon = config.icon;

  const Badge = (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full",
        "bg-gradient-to-r shadow-lg",
        sizeClasses[size],
        config.colors,
        className
      )}
    >
      <Icon className={cn(iconSizeClasses[size], config.iconColors)} />
      {config.label}
    </span>
  );

  if (!animated) return Badge;

  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className="inline-block"
    >
      {Badge}
    </motion.span>
  );
};

// Discount badge with percentage
interface DiscountBadgeProps {
  percentage: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const DiscountBadge = ({ percentage, className, size = "md" }: DiscountBadgeProps) => {
  return (
    <motion.span
      initial={{ scale: 0, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={cn(
        "inline-flex items-center font-bold rounded-xl",
        "bg-gradient-to-r from-red-500 to-rose-600 text-primary-foreground shadow-lg shadow-red-500/30",
        sizeClasses[size],
        className
      )}
    >
      {percentage}% OFF
    </motion.span>
  );
};

// Rating badge with stars
interface RatingBadgeProps {
  rating: number;
  reviews?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  showReviews?: boolean;
}

export const RatingBadge = ({ 
  rating, 
  reviews, 
  className, 
  size = "md",
  showReviews = true 
}: RatingBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-xl",
        "bg-amber-500/20 text-amber-600 dark:text-amber-400",
        sizeClasses[size],
        className
      )}
    >
      <Star className={cn(iconSizeClasses[size], "fill-amber-500 text-amber-500")} />
      <span>{rating.toFixed(1)}</span>
      {showReviews && reviews && (
        <span className="text-muted-foreground font-normal">({reviews})</span>
      )}
    </span>
  );
};

export default PremiumBadge;
