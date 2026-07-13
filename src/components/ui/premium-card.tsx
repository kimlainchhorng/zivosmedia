import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowRight, Sparkles, Zap, Crown } from "lucide-react";

interface PremiumCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode;
  variant?: "glass" | "gradient" | "solid" | "outline" | "premium" | "neo";
  glowColor?: "rides" | "eats" | "sky" | "amber" | "primary" | "emerald" | "violet";
  hover?: "lift" | "glow" | "scale" | "border" | "tilt" | "none";
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
}

const glowColors = {
  rides: "hover:shadow-[0_0_50px_-12px_hsl(var(--rides)/0.6)]",
  eats: "hover:shadow-[0_0_50px_-12px_hsl(var(--eats)/0.6)]",
  sky: "hover:shadow-2xl hover:shadow-black/10",
  amber: "hover:shadow-2xl hover:shadow-black/10",
  primary: "hover:shadow-2xl hover:shadow-black/10",
  emerald: "hover:shadow-2xl hover:shadow-black/10",
  violet: "hover:shadow-2xl hover:shadow-black/10",
};

const borderColors = {
  rides: "hover:border-rides/50",
  eats: "hover:border-eats/50",
  sky: "hover:border-primary/50",
  amber: "hover:border-warning/50",
  primary: "hover:border-primary/50",
  emerald: "hover:border-success/50",
  violet: "hover:border-foreground/50",
};

const gradientBgs = {
  rides: "from-rides/10 via-rides/5 to-transparent",
  eats: "from-eats/10 via-eats/5 to-transparent",
  sky: "from-muted via-muted to-transparent",
  amber: "from-warning/10 via-warning/5 to-transparent",
  primary: "from-primary/10 via-primary/5 to-transparent",
  emerald: "from-success/10 via-success/5 to-transparent",
  violet: "from-muted via-muted to-transparent",
};

const sizes = {
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-6",
  lg: "p-6 sm:p-8",
  xl: "p-8 sm:p-10",
};

export const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ 
    className, 
    children, 
    variant = "glass", 
    glowColor = "primary",
    hover = "lift",
    size = "md",
    animated = false,
    ...props 
  }, ref) => {
    const baseStyles = "relative rounded-3xl overflow-hidden transition-all duration-500";
    
    const variantStyles = {
      glass: "glass-card backdrop-blur-xl border border-white/10",
      gradient: cn("bg-gradient-to-br border border-white/10", gradientBgs[glowColor]),
      solid: "bg-card border border-border/50",
      outline: "bg-transparent border-2 border-white/15",
      premium: cn(
        "bg-gradient-to-br from-card via-card to-card/80 border border-white/10",
        "shadow-xl shadow-black/5 dark:shadow-black/20"
      ),
      neo: "bg-card border border-border/50 shadow-[6px_6px_0px_0px_hsl(var(--primary)/0.15)]",
    };

    const hoverStyles = {
      lift: "hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/10",
      glow: glowColors[glowColor],
      scale: "hover:scale-[1.03]",
      border: borderColors[glowColor],
      tilt: "",
      none: "",
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          hoverStyles[hover],
          sizes[size],
          className
        )}
        whileHover={{ 
          scale: hover === "scale" ? 1.03 : hover === "lift" ? 1.01 : 1,
          rotateX: hover === "tilt" ? 5 : 0,
          rotateY: hover === "tilt" ? 5 : 0,
        }}
        whileTap={{ scale: 0.98 }}
        initial={animated ? { opacity: 0, y: 20 } : false}
        animate={animated ? { opacity: 1, y: 0 } : false}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

PremiumCard.displayName = "PremiumCard";

// Animated Stat Card - Enhanced
interface StatCardProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
  color?: "rides" | "eats" | "sky" | "amber" | "primary" | "emerald" | "violet";
  variant?: "default" | "compact" | "large" | "minimal";
  animated?: boolean;
}

const iconBgClasses = {
  rides: "text-rides bg-gradient-to-br from-rides/20 to-rides/5",
  eats: "text-eats bg-gradient-to-br from-eats/20 to-eats/5",
  sky: "text-primary bg-gradient-to-br from-primary/20 to-primary/5",
  amber: "text-warning bg-gradient-to-br from-warning/20 to-warning/5",
  primary: "text-primary bg-gradient-to-br from-primary/20 to-primary/5",
  emerald: "text-success bg-gradient-to-br from-success/20 to-success/5",
  violet: "text-ig-gradient bg-muted",
};

const valueGradients = {
  rides: "from-rides to-rides",
  eats: "from-eats to-eats",
  sky: "from-primary to-primary",
  amber: "from-warning to-warning",
  primary: "from-primary to-primary",
  emerald: "from-success to-success",
  violet: "from-foreground to-foreground",
};

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  icon,
  trend,
  color = "primary",
  variant = "default",
  animated = true,
}) => {
  if (variant === "minimal") {
    return (
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
        {icon && (
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBgClasses[color])}>
            {icon}
          </div>
        )}
        <div className="flex-1">
          <motion.p 
            className="text-2xl font-bold"
            initial={animated ? { opacity: 0, scale: 0.8 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {value}
          </motion.p>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
            trend.positive
              ? "text-success bg-success/10"
              : "text-destructive bg-destructive/10"
          )}>
            {trend.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}
          </div>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <PremiumCard hover="glow" glowColor={color} size="sm" className="relative">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconBgClasses[color])}>
              {icon}
            </div>
          )}
          <div>
            <motion.p 
              className="text-xl font-bold"
              initial={animated ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
            >
              {value}
            </motion.p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
        {trend && (
          <span className={cn(
            "absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full",
            trend.positive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
          )}>
            {trend.positive ? "+" : ""}{trend.value}
          </span>
        )}
      </PremiumCard>
    );
  }

  if (variant === "large") {
    return (
      <PremiumCard hover="glow" glowColor={color} size="lg" variant="gradient" className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full" />
        
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            {icon && (
              <motion.div 
                className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg", iconBgClasses[color])}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                {icon}
              </motion.div>
            )}
            {trend && (
              <div className={cn(
                "flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl",
                trend.positive
                  ? "text-success bg-success/10 border border-success/20"
                  : "text-destructive bg-destructive/10 border border-destructive/20"
              )}>
                {trend.positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {trend.value}
              </div>
            )}
          </div>
          
          <motion.p 
            className={cn("text-5xl sm:text-6xl font-bold bg-gradient-to-r bg-clip-text text-transparent", valueGradients[color])}
            initial={animated ? { scale: 0.5, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          >
            {value}
          </motion.p>
          <p className="text-base text-muted-foreground mt-2 font-medium">{label}</p>
        </div>
      </PremiumCard>
    );
  }

  // Default variant
  return (
    <PremiumCard hover="glow" glowColor={color} size="md" animated={animated}>
      <div className="flex items-start justify-between">
        {icon && (
          <motion.div 
            className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBgClasses[color])}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            {icon}
          </motion.div>
        )}
        {trend && (
          <span className={cn(
            "text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1",
            trend.positive
              ? "text-success bg-success/10"
              : "text-destructive bg-destructive/10"
          )}>
            {trend.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-5">
        <motion.p 
          className="text-3xl sm:text-4xl font-bold"
          initial={animated ? { scale: 0.5, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        >
          {value}
        </motion.p>
        <p className="text-sm text-muted-foreground mt-1 font-medium">{label}</p>
      </div>
    </PremiumCard>
  );
};

// Quick Action Button - Enhanced
interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  color?: "rides" | "eats" | "sky" | "amber" | "primary" | "emerald" | "violet";
  badge?: string;
  variant?: "default" | "compact" | "prominent";
  disabled?: boolean;
}

const actionGradients = {
  rides: "from-rides to-rides",
  eats: "from-eats to-eats",
  sky: "from-primary to-primary",
  amber: "from-warning to-warning",
  primary: "from-primary to-primary",
  emerald: "from-success to-success",
  violet: "from-primary to-primary",
};

export const QuickAction: React.FC<QuickActionProps> = ({
  icon,
  label,
  description,
  onClick,
  color = "primary",
  badge,
  variant = "default",
  disabled = false,
}) => {
  if (variant === "prominent") {
    return (
      <motion.button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative flex flex-col items-center gap-3 p-6 rounded-3xl border text-center group overflow-hidden transition-all duration-200",
          "bg-gradient-to-br from-card via-card/90 to-card/80 border-white/10",
          "hover:border-white/20 hover:shadow-2xl hover:shadow-black/10",
          disabled && "opacity-50 pointer-events-none"
        )}
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Background glow */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          `bg-gradient-to-br ${gradientBgs[color]}`
        )} />
        
        <motion.div 
          className={cn(
            "relative w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-xl",
            actionGradients[color]
          )}
          whileHover={{ rotate: 5, scale: 1.1 }}
        >
          <div className="text-primary-foreground">{icon}</div>
        </motion.div>
        
        <div className="relative">
          <p className="font-bold text-foreground group-hover:text-foreground transition-colors">
            {label}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        
        {badge && (
          <span className="absolute top-3 right-3 px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-eats to-eats text-primary-foreground rounded-full shadow-lg">
            {badge}
          </span>
        )}
      </motion.button>
    );
  }

  if (variant === "compact") {
    return (
      <motion.button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-2xl border border-border/50 bg-card/50 hover:bg-card transition-all group",
          disabled && "opacity-50 pointer-events-none"
        )}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 text-primary-foreground", actionGradients[color])}>
          {icon}
        </div>
        <span className="font-medium text-sm group-hover:text-primary transition-colors">{label}</span>
        <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.button>
    );
  }

  // Default variant
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex items-center gap-4 p-4 glass-card rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-200 w-full text-left group",
        disabled && "opacity-50 pointer-events-none"
      )}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div 
        className={cn(
          "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg text-primary-foreground",
          actionGradients[color]
        )}
        whileHover={{ scale: 1.1, rotate: 5 }}
      >
        {icon}
      </motion.div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
          {label}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground truncate">{description}</p>
        )}
      </div>
      {badge && (
        <span className="px-2.5 py-1 text-xs font-bold bg-gradient-to-r from-eats to-eats text-primary-foreground rounded-full shadow-md">
          {badge}
        </span>
      )}
      <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </motion.button>
  );
};

// Feature Card - New
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color?: "rides" | "eats" | "sky" | "amber" | "primary" | "emerald" | "violet";
  badge?: "new" | "popular" | "premium";
  onClick?: () => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  color = "primary",
  badge,
  onClick,
}) => {
  const badgeConfig = {
    new: { icon: Sparkles, label: "New", gradient: "from-success to-success" },
    popular: { icon: Zap, label: "Popular", gradient: "from-warning to-warning" },
    premium: { icon: Crown, label: "Premium", gradient: "from-muted to-muted" },
  };

  return (
    <motion.button
      onClick={onClick}
      className="relative flex flex-col p-6 rounded-3xl bg-gradient-to-br from-card via-card/95 to-card/90 border border-white/10 hover:border-white/20 text-left group overflow-hidden transition-all duration-500"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Subtle background gradient on hover */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        `bg-gradient-to-br ${gradientBgs[color]}`
      )} />
      
      {badge && (
        <span className={cn(
          "absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-primary-foreground rounded-full shadow-lg",
          `bg-gradient-to-r ${badgeConfig[badge].gradient}`
        )}>
          {React.createElement(badgeConfig[badge].icon, { className: "w-3 h-3" })}
          {badgeConfig[badge].label}
        </span>
      )}
      
      <motion.div 
        className={cn("relative w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg text-primary-foreground mb-5", actionGradients[color])}
        whileHover={{ rotate: 5, scale: 1.1 }}
      >
        {icon}
      </motion.div>
      
      <h3 className="relative font-bold text-lg mb-2 group-hover:text-primary transition-colors">{title}</h3>
      <p className="relative text-sm text-muted-foreground leading-relaxed">{description}</p>
      
      <div className="relative flex items-center gap-2 mt-4 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Learn more
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.button>
  );
};
