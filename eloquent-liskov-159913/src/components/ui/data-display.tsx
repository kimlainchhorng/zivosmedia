import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Info, 
  ChevronRight,
  MoreHorizontal,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./tooltip";

// Stat Card Component - Enhanced
interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  color?: "primary" | "green" | "red" | "amber" | "sky" | "purple" | "rides" | "eats";
  size?: "sm" | "md" | "lg";
  variant?: "default" | "gradient" | "outline" | "minimal";
  onClick?: () => void;
  tooltip?: string;
  className?: string;
  animated?: boolean;
}

const colorConfig = {
  primary: {
    iconBg: "bg-gradient-to-br from-primary/25 to-primary/5",
    iconColor: "text-primary",
    valueTrend: "text-primary",
    gradient: "from-primary/10 to-primary/5",
    ring: "ring-primary/20",
  },
  green: {
    iconBg: "bg-gradient-to-br from-emerald-500/25 to-emerald-500/5",
    iconColor: "text-emerald-500",
    valueTrend: "text-emerald-500",
    gradient: "from-emerald-500/10 to-emerald-500/5",
    ring: "ring-emerald-500/20",
  },
  red: {
    iconBg: "bg-gradient-to-br from-red-500/25 to-red-500/5",
    iconColor: "text-red-500",
    valueTrend: "text-red-500",
    gradient: "from-red-500/10 to-red-500/5",
    ring: "ring-red-500/20",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-amber-500/25 to-amber-500/5",
    iconColor: "text-amber-500",
    valueTrend: "text-amber-500",
    gradient: "from-amber-500/10 to-amber-500/5",
    ring: "ring-amber-500/20",
  },
  sky: {
    iconBg: "bg-gradient-to-br from-sky-500/25 to-sky-500/5",
    iconColor: "text-sky-500",
    valueTrend: "text-sky-500",
    gradient: "from-muted to-muted",
    ring: "ring-sky-500/20",
  },
  purple: {
    iconBg: "bg-gradient-to-br from-violet-500/25 to-violet-500/5",
    iconColor: "text-violet-500",
    valueTrend: "text-violet-500",
    gradient: "from-muted to-muted",
    ring: "ring-violet-500/20",
  },
  rides: {
    iconBg: "bg-gradient-to-br from-rides/25 to-rides/5",
    iconColor: "text-rides",
    valueTrend: "text-rides",
    gradient: "from-rides/10 to-rides/5",
    ring: "ring-rides/20",
  },
  eats: {
    iconBg: "bg-gradient-to-br from-eats/25 to-eats/5",
    iconColor: "text-eats",
    valueTrend: "text-eats",
    gradient: "from-eats/10 to-eats/5",
    ring: "ring-eats/20",
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  changeLabel,
  icon,
  trend = "neutral",
  color = "primary",
  size = "md",
  variant = "default",
  onClick,
  tooltip,
  className,
  animated = true,
}) => {
  const config = colorConfig[color];
  
  const sizeClasses = {
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  };

  const valueSizes = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  };

  const iconSizes = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-14 h-14",
  };

  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  const variantStyles = {
    default: "bg-gradient-to-br from-card/95 to-card border border-white/10 shadow-xl",
    gradient: cn("bg-gradient-to-br border border-white/10 shadow-xl", config.gradient),
    outline: "bg-transparent border-2 border-white/15 hover:border-white/25",
    minimal: "bg-muted/20 hover:bg-muted/30",
  };

  return (
    <motion.div
      whileHover={onClick ? { y: -4, scale: 1.01 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      initial={animated ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-3xl transition-all duration-200 group",
        variantStyles[variant],
        onClick && "cursor-pointer",
        sizeClasses[size],
        className
      )}
    >
      {/* Background decoration */}
      <div className={cn(
        "absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-30 pointer-events-none transition-opacity duration-200 group-hover:opacity-50",
        config.iconBg
      )} />

      <div className="flex items-start justify-between relative">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            {icon && (
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={cn("rounded-2xl flex items-center justify-center shadow-lg", config.iconBg, iconSizes[size])}
              >
                <div className={config.iconColor}>{icon}</div>
              </motion.div>
            )}
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                </TooltipTrigger>
                <TooltipContent>{tooltip}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <motion.p
            key={value}
            initial={animated ? { scale: 0.8, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className={cn("font-bold", valueSizes[size])}
          >
            {value}
          </motion.p>
          <p className="text-sm text-muted-foreground mt-1 font-medium">{label}</p>
        </div>
        
        {change !== undefined && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold",
              trend === "up" && "bg-emerald-500/15 text-emerald-500",
              trend === "down" && "bg-red-500/15 text-red-500",
              trend === "neutral" && "bg-muted/50 text-muted-foreground"
            )}
          >
            <TrendIcon className="w-4 h-4" />
            <span>{Math.abs(change)}%</span>
          </motion.div>
        )}
      </div>

      {changeLabel && (
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {changeLabel}
        </p>
      )}
    </motion.div>
  );
};

// Data List Item - Enhanced
interface DataListItemProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  copyable?: boolean;
  link?: string;
  badge?: string;
  badgeColor?: "default" | "green" | "red" | "amber" | "primary";
  variant?: "default" | "card" | "minimal";
  className?: string;
}

export const DataListItem: React.FC<DataListItemProps> = ({
  label,
  value,
  icon,
  copyable,
  link,
  badge,
  badgeColor = "default",
  variant = "default",
  className,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (typeof value === "string") {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const badgeColors = {
    default: "bg-muted text-muted-foreground",
    green: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
    red: "bg-red-500/15 text-red-500 border-red-500/20",
    amber: "bg-amber-500/15 text-amber-500 border-amber-500/20",
    primary: "bg-primary/15 text-primary border-primary/20",
  };

  if (variant === "card") {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className={cn(
          "flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-muted/40 to-muted/20 border border-white/10 hover:border-white/20 transition-all",
          className
        )}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground">
              {icon}
            </div>
          )}
          <span className="text-sm text-muted-foreground font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <Badge className={cn("text-xs border", badgeColors[badgeColor])}>
              {badge}
            </Badge>
          )}
          <span className="text-sm font-bold">{value}</span>
          {copyable && typeof value === "string" && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 rounded-xl"
              onClick={handleCopy}
              aria-label="Copy value"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </Button>
          )}
          {link && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 rounded-xl"
              onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(link))}
              aria-label="Open link"
            >
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={cn(
      "flex items-center justify-between py-4 border-b border-white/10 last:border-0",
      className
    )}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
        )}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <Badge className={cn("text-xs border", badgeColors[badgeColor])}>
            {badge}
          </Badge>
        )}
        <span className="text-sm font-semibold">{value}</span>
        {copyable && typeof value === "string" && (
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 rounded-xl hover:bg-muted/50"
            onClick={handleCopy}
            aria-label="Copy value"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        )}
        {link && (
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 rounded-xl hover:bg-muted/50"
            onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(link))}
            aria-label="Open link"
          >
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  );
};

// Info Row Component - Enhanced
interface InfoRowProps {
  items: {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    color?: "primary" | "green" | "amber" | "sky";
  }[];
  variant?: "default" | "compact" | "cards" | "pills";
  className?: string;
}

export const InfoRow: React.FC<InfoRowProps> = ({
  items,
  variant = "default",
  className,
}) => {
  const itemColors = {
    primary: "bg-primary/10 border-primary/20",
    green: "bg-emerald-500/10 border-emerald-500/20",
    amber: "bg-amber-500/10 border-amber-500/20",
    sky: "bg-sky-500/10 border-sky-500/20",
  };

  if (variant === "pills") {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border",
              itemColors[item.color || "primary"]
            )}
          >
            {item.icon}
            <span className="text-sm font-semibold">{item.value}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-white/10 text-center"
          >
            {item.icon && (
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2 text-muted-foreground">
                {item.icon}
              </div>
            )}
            <p className="text-xl font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
          </motion.div>
        ))}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-4 text-sm flex-wrap", className)}>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <div className="flex items-center gap-1.5">
              {item.icon}
              <span className="text-muted-foreground">{item.label}:</span>
              <span className="font-semibold">{item.value}</span>
            </div>
            {index < items.length - 1 && (
              <span className="text-muted-foreground/50">•</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-muted/40 to-muted/20 border border-white/10", className)}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          {item.icon && (
            <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground">
              {item.icon}
            </div>
          )}
          <div>
            <p className="text-xl font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Progress List - Enhanced
interface ProgressItem {
  label: string;
  value: number;
  maxValue: number;
  color?: "primary" | "green" | "red" | "amber" | "sky" | "violet";
  icon?: React.ReactNode;
}

interface ProgressListProps {
  items: ProgressItem[];
  showPercentage?: boolean;
  variant?: "default" | "compact" | "detailed";
  className?: string;
}

const progressColors = {
  primary: "bg-gradient-to-r from-primary to-teal-400",
  green: "bg-gradient-to-r from-emerald-500 to-green-400",
  red: "bg-gradient-to-r from-red-500 to-orange-500",
  amber: "bg-gradient-to-r from-amber-500 to-yellow-400",
  sky: "bg-gradient-to-r from-sky-500 to-blue-400",
  violet: "bg-gradient-to-r from-violet-500 to-purple-400",
};

export const ProgressList: React.FC<ProgressListProps> = ({
  items,
  showPercentage = true,
  variant = "default",
  className,
}) => {
  return (
    <div className={cn("space-y-5", className)}>
      {items.map((item, index) => {
        const percentage = Math.min((item.value / item.maxValue) * 100, 100);
        
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {item.icon && (
                  <span className="text-muted-foreground">{item.icon}</span>
                )}
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{item.value}</span>
                <span> / {item.maxValue}</span>
                {showPercentage && (
                  <span className="ml-2 text-xs font-medium">({Math.round(percentage)}%)</span>
                )}
              </span>
            </div>
            <div className="h-3 bg-muted/40 rounded-full overflow-hidden border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full shadow-lg relative overflow-hidden",
                  progressColors[item.color || "primary"]
                )}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                />
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// Comparison Card - Enhanced
interface ComparisonCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  unit?: string;
  prefix?: string;
  icon?: React.ReactNode;
  color?: "primary" | "green" | "amber" | "sky";
  className?: string;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
  title,
  currentValue,
  previousValue,
  unit = "",
  prefix = "",
  icon,
  color = "primary",
  className,
}) => {
  const change = previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  const colorClasses = colorConfig[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={cn(
        "p-5 rounded-3xl bg-gradient-to-br from-card/95 to-card border border-white/10 shadow-xl overflow-hidden relative group",
        className
      )}
    >
      {/* Background decoration */}
      <div className={cn(
        "absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity",
        colorClasses.iconBg
      )} />

      <div className="flex items-center justify-between mb-4 relative">
        <span className="text-sm font-semibold text-muted-foreground">{title}</span>
        {icon && (
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colorClasses.iconBg)}>
            <span className={colorClasses.iconColor}>{icon}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-end gap-3 relative">
        <motion.span
          key={currentValue}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-4xl font-bold"
        >
          {prefix}{currentValue.toLocaleString()}{unit}
        </motion.span>
        
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold mb-1",
            isPositive && "bg-emerald-500/15 text-emerald-500",
            !isPositive && !isNeutral && "bg-red-500/15 text-red-500",
            isNeutral && "bg-muted/50 text-muted-foreground"
          )}
        >
          {isPositive ? <TrendingUp className="w-4 h-4" /> : isNeutral ? <Minus className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{isPositive && "+"}{change.toFixed(1)}%</span>
        </motion.div>
      </div>

      <p className="text-xs text-muted-foreground mt-3 relative">
        vs. previous: <span className="font-medium">{prefix}{previousValue.toLocaleString()}{unit}</span>
      </p>
    </motion.div>
  );
};

export default StatCard;
