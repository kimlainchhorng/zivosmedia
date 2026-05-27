import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Check, 
  Info, 
  Sparkles, 
  Zap, 
  Star, 
  Crown, 
  Gift, 
  Rocket, 
  Heart, 
  TrendingUp,
  Shield,
  Award,
  ArrowRight,
  ChevronRight,
  Clock,
  Users
} from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";

// Feature Highlight Component
interface FeatureHighlightProps {
  features: string[];
  variant?: "check" | "bullet" | "numbered" | "premium";
  columns?: 1 | 2 | 3;
  className?: string;
  accentColor?: "primary" | "emerald" | "amber" | "sky" | "eats" | "violet";
  animated?: boolean;
  size?: "sm" | "md" | "lg";
}

const colorClasses = {
  primary: {
    icon: "text-primary",
    bg: "bg-primary/10",
    bullet: "bg-primary",
    gradient: "from-primary to-teal-400",
    glow: "shadow-primary/30",
  },
  emerald: {
    icon: "text-emerald-500",
    bg: "bg-emerald-500/10",
    bullet: "bg-emerald-500",
    gradient: "from-emerald-500 to-green-400",
    glow: "shadow-emerald-500/30",
  },
  amber: {
    icon: "text-amber-500",
    bg: "bg-amber-500/10",
    bullet: "bg-amber-500",
    gradient: "from-amber-500 to-orange-400",
    glow: "shadow-amber-500/30",
  },
  sky: {
    icon: "text-sky-500",
    bg: "bg-sky-500/10",
    bullet: "bg-sky-500",
    gradient: "from-muted to-muted",
    glow: "shadow-sky-500/30",
  },
  eats: {
    icon: "text-eats",
    bg: "bg-eats/10",
    bullet: "bg-eats",
    gradient: "from-eats to-orange-400",
    glow: "shadow-eats/30",
  },
  violet: {
    icon: "text-violet-500",
    bg: "bg-violet-500/10",
    bullet: "bg-violet-500",
    gradient: "from-muted to-muted",
    glow: "shadow-violet-500/30",
  },
};

const sizeClasses = {
  sm: { text: "text-xs", icon: "w-4 h-4", checkIcon: "w-2.5 h-2.5", gap: "gap-2" },
  md: { text: "text-sm", icon: "w-5 h-5", checkIcon: "w-3 h-3", gap: "gap-3" },
  lg: { text: "text-base", icon: "w-6 h-6", checkIcon: "w-3.5 h-3.5", gap: "gap-4" },
};

export const FeatureHighlight = ({
  features,
  variant = "check",
  columns = 1,
  className,
  accentColor = "primary",
  animated = true,
  size = "md",
}: FeatureHighlightProps) => {
  const colors = colorClasses[accentColor];
  const sizes = sizeClasses[size];

  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  };

  const renderIndicator = (index: number) => {
    switch (variant) {
      case "check":
        return (
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={cn(
              "rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
              colors.bg,
              sizes.icon
            )}
          >
            <Check className={cn(colors.icon, sizes.checkIcon)} />
          </motion.div>
        );
      case "bullet":
        return (
          <div className={cn(
            "w-2 h-2 rounded-full flex-shrink-0 mt-1.5 shadow-lg",
            colors.bullet,
            colors.glow
          )} />
        );
      case "numbered":
        return (
          <motion.div 
            whileHover={{ scale: 1.1 }}
            className={cn(
              "rounded-xl flex items-center justify-center flex-shrink-0 font-bold shadow-sm",
              colors.bg,
              colors.icon,
              sizes.icon,
              size === "lg" ? "text-sm" : "text-xs"
            )}
          >
            {index + 1}
          </motion.div>
        );
      case "premium":
        return (
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={cn(
              "rounded-xl flex items-center justify-center flex-shrink-0 text-primary-foreground shadow-lg bg-gradient-to-br",
              colors.gradient,
              colors.glow,
              sizes.icon
            )}
          >
            <Sparkles className={sizes.checkIcon} />
          </motion.div>
        );
    }
  };

  const FeatureItem = ({ feature, index }: { feature: string; index: number }) => {
    const content = (
      <motion.div 
        whileHover={{ x: 4 }}
        className={cn("flex items-start", sizes.gap)}
      >
        {renderIndicator(index)}
        <span className={cn(sizes.text, "leading-relaxed")}>{feature}</span>
      </motion.div>
    );

    if (!animated) return <div key={feature}>{content}</div>;

    return (
      <motion.div
        key={feature}
        initial={{ opacity: 0, x: -15 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.06, type: "spring", stiffness: 300 }}
      >
        {content}
      </motion.div>
    );
  };

  return (
    <div className={cn("grid gap-4", gridClasses[columns], className)}>
      {features.map((feature, index) => (
        <FeatureItem key={feature} feature={feature} index={index} />
      ))}
    </div>
  );
};

// Info card with icon and description
interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  variant?: "default" | "success" | "warning" | "info" | "premium";
  action?: {
    label: string;
    onClick: () => void;
  };
}

const variantClasses = {
  default: {
    border: "border-border/50",
    bg: "bg-muted/30",
    iconBg: "bg-muted",
  },
  success: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    iconBg: "bg-emerald-500/20",
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    iconBg: "bg-amber-500/20",
  },
  info: {
    border: "border-sky-500/30",
    bg: "bg-sky-500/10",
    iconBg: "bg-sky-500/20",
  },
  premium: {
    border: "border-amber-500/30",
    bg: "bg-gradient-to-r from-amber-500/10 to-orange-500/10",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
  },
};

export const InfoCard = ({
  icon,
  title,
  description,
  className,
  variant = "default",
  action,
}: InfoCardProps) => {
  const config = variantClasses[variant];
  const isPremium = variant === "premium";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -2 }}
      className={cn(
        "flex items-start gap-4 p-5 rounded-2xl border shadow-lg",
        config.border,
        config.bg,
        className
      )}
    >
      <motion.div 
        whileHover={{ scale: 1.1, rotate: 5 }}
        className={cn(
          "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
          config.iconBg,
          isPremium && "text-primary-foreground"
        )}
      >
        {icon}
      </motion.div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-base mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        {action && (
          <motion.button
            onClick={action.onClick}
            whileHover={{ x: 4 }}
            className="flex items-center gap-1.5 mt-3 text-sm font-semibold text-primary hover:underline"
          >
            {action.label}
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

// Feature Spotlight Component
interface FeatureSpotlightProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  emoji?: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "premium" | "new" | "trending" | "special";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const spotlightVariants = {
  default: {
    gradient: "from-primary/20 via-primary/10 to-teal-500/20",
    accent: "from-primary to-teal-400",
    icon: Sparkles,
    glow: "shadow-primary/20",
    badge: null,
  },
  premium: {
    gradient: "from-amber-500/20 via-amber-500/10 to-orange-500/20",
    accent: "from-amber-500 to-orange-500",
    icon: Crown,
    glow: "shadow-amber-500/20",
    badge: "Premium",
  },
  new: {
    gradient: "from-muted to-muted",
    accent: "from-violet-500 to-purple-500",
    icon: Rocket,
    glow: "shadow-violet-500/20",
    badge: "New",
  },
  trending: {
    gradient: "from-muted to-muted",
    accent: "from-rose-500 to-pink-500",
    icon: TrendingUp,
    glow: "shadow-rose-500/20",
    badge: "Trending",
  },
  special: {
    gradient: "from-emerald-500/20 via-emerald-500/10 to-teal-500/20",
    accent: "from-emerald-500 to-teal-500",
    icon: Gift,
    glow: "shadow-emerald-500/20",
    badge: "Limited",
  },
};

const spotlightSizeConfig = {
  sm: {
    container: "p-4",
    icon: "w-10 h-10",
    iconInner: "w-5 h-5",
    title: "text-base",
    description: "text-xs",
    button: "h-8 text-xs",
  },
  md: {
    container: "p-5",
    icon: "w-12 h-12",
    iconInner: "w-6 h-6",
    title: "text-lg",
    description: "text-sm",
    button: "h-10 text-sm",
  },
  lg: {
    container: "p-6",
    icon: "w-16 h-16",
    iconInner: "w-8 h-8",
    title: "text-xl",
    description: "text-base",
    button: "h-12",
  },
};

export const FeatureSpotlight: React.FC<FeatureSpotlightProps> = ({
  title,
  description,
  icon,
  emoji,
  cta,
  variant = "default",
  size = "md",
  className,
}) => {
  const config = spotlightVariants[variant];
  const sizes = spotlightSizeConfig[size];
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-card/95 to-card shadow-xl",
        config.glow,
        sizes.container,
        className
      )}
    >
      {/* Background decoration */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", config.gradient)} />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full" />
      
      {/* Badge */}
      {config.badge && (
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-4 right-4"
        >
          <Badge className={cn("bg-gradient-to-r text-primary-foreground border-0 font-bold shadow-lg", config.accent, config.glow)}>
            <Sparkles className="w-3 h-3 mr-1" />
            {config.badge}
          </Badge>
        </motion.div>
      )}

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <motion.div
          whileHover={{ rotate: 5, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400 }}
          className={cn(
            "rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-xl shrink-0",
            config.accent,
            config.glow,
            sizes.icon
          )}
        >
          {emoji ? (
            <span className={cn("text-2xl", size === "lg" && "text-3xl")}>{emoji}</span>
          ) : icon ? (
            <div className="text-primary-foreground">{icon}</div>
          ) : (
            <IconComponent className={cn("text-primary-foreground", sizes.iconInner)} />
          )}
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-bold mb-1", sizes.title)}>{title}</h3>
          <p className={cn("text-muted-foreground leading-relaxed", sizes.description)}>{description}</p>
          
          {cta && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4"
            >
              <Button 
                onClick={cta.onClick}
                className={cn(
                  "bg-gradient-to-r text-primary-foreground border-0 rounded-xl font-bold gap-2",
                  config.accent,
                  config.glow,
                  sizes.button
                )}
              >
                {cta.label}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Urgency Banner
interface UrgencyBannerProps {
  message: string;
  submessage?: string;
  icon?: React.ReactNode;
  variant?: "warning" | "info" | "success" | "limited";
  countdown?: {
    minutes: number;
    onExpire?: () => void;
  };
  className?: string;
}

export const UrgencyBanner: React.FC<UrgencyBannerProps> = ({
  message,
  submessage,
  icon,
  variant = "warning",
  countdown,
  className,
}) => {
  const [timeLeft, setTimeLeft] = React.useState(countdown?.minutes ? countdown.minutes * 60 : 0);

  React.useEffect(() => {
    if (!countdown) return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          countdown.onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const variantConfig = {
    warning: {
      gradient: "from-amber-500/15 to-orange-500/15",
      border: "border-amber-500/30",
      text: "text-amber-600 dark:text-amber-400",
      icon: Clock,
    },
    info: {
      gradient: "from-primary/15 to-teal-500/15",
      border: "border-primary/30",
      text: "text-primary",
      icon: Sparkles,
    },
    success: {
      gradient: "from-emerald-500/15 to-green-500/15",
      border: "border-emerald-500/30",
      text: "text-emerald-600 dark:text-emerald-400",
      icon: Check,
    },
    limited: {
      gradient: "from-muted to-muted",
      border: "border-red-500/30",
      text: "text-red-500",
      icon: Zap,
    },
  };

  const config = variantConfig[variant];
  const IconComponent = icon ? null : config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r border",
        config.gradient,
        config.border,
        className
      )}
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className={cn("w-10 h-10 rounded-xl bg-white/50 dark:bg-black/20 flex items-center justify-center", config.text)}
        >
          {icon || (IconComponent && <IconComponent className="w-5 h-5" />)}
        </motion.div>
        <div>
          <p className={cn("font-bold text-sm", config.text)}>{message}</p>
          {submessage && <p className="text-xs text-muted-foreground">{submessage}</p>}
        </div>
      </div>
      
      {countdown && (
        <motion.div
          key={timeLeft}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className={cn("text-xl font-bold font-mono", config.text)}
        >
          {formatTime(timeLeft)}
        </motion.div>
      )}
    </motion.div>
  );
};

// Social Proof Component
interface SocialProofProps {
  rating: number;
  reviewCount: number;
  userCount?: number;
  avatars?: string[];
  variant?: "compact" | "detailed";
  className?: string;
}

export const SocialProof: React.FC<SocialProofProps> = ({
  rating,
  reviewCount,
  userCount,
  avatars = ["👤", "👤", "👤"],
  variant = "compact",
  className,
}) => {
  if (variant === "detailed") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-muted/40 to-muted/20 border border-white/10",
          className
        )}
      >
        {/* Avatar stack */}
        <div className="flex -space-x-2">
          {avatars.slice(0, 4).map((avatar, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-background shadow-lg"
            >
              <span className="text-lg">{avatar}</span>
            </motion.div>
          ))}
          {userCount && userCount > 4 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 }}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold border-2 border-background shadow-lg"
            >
              +{(userCount - 4).toLocaleString()}
            </motion.div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-4 h-4",
                    i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>
            <span className="font-bold">{rating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {reviewCount.toLocaleString()} reviews
            {userCount && ` • ${userCount.toLocaleString()}+ users`}
          </p>
        </div>
      </motion.div>
    );
  }

  // Compact variant
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("flex items-center gap-3", className)}
    >
      <div className="flex -space-x-2">
        {avatars.slice(0, 3).map((avatar, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border-2 border-background text-sm"
          >
            {avatar}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
        <span className="font-bold">{rating.toFixed(1)}</span>
        <span className="text-muted-foreground">({reviewCount.toLocaleString()})</span>
      </div>
    </motion.div>
  );
};

export default FeatureHighlight;
