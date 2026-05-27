import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, MapPin, Package, Utensils, Car, Plane, Hotel, AlertCircle, Loader2, Sparkles, Zap } from "lucide-react";

// Status Step for Linear Progress
interface StatusStep {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  time?: string;
}

interface StatusTrackerProps {
  steps: StatusStep[];
  currentStep: number;
  color?: "rides" | "eats" | "sky" | "amber" | "primary" | "emerald" | "violet";
  orientation?: "horizontal" | "vertical";
  animated?: boolean;
  compact?: boolean;
}

const colorClasses = {
  rides: { 
    active: "bg-rides", 
    text: "text-rides", 
    glow: "shadow-[0_0_20px_hsl(var(--rides)/0.5)]",
    gradient: "from-rides to-green-400",
    ring: "ring-rides/30",
    bgGlow: "from-rides/20 to-rides/5"
  },
  eats: { 
    active: "bg-eats", 
    text: "text-eats", 
    glow: "shadow-[0_0_20px_hsl(var(--eats)/0.5)]",
    gradient: "from-eats to-orange-400",
    ring: "ring-eats/30",
    bgGlow: "from-eats/20 to-eats/5"
  },
  sky: { 
    active: "bg-sky-500", 
    text: "text-sky-400", 
    glow: "shadow-[0_0_20px_rgb(56,189,248,0.5)]",
    gradient: "from-muted to-muted",
    ring: "ring-sky-500/30",
    bgGlow: "from-sky-500/20 to-sky-500/5"
  },
  amber: { 
    active: "bg-amber-500", 
    text: "text-amber-400", 
    glow: "shadow-[0_0_20px_rgb(251,191,36,0.5)]",
    gradient: "from-amber-500 to-orange-400",
    ring: "ring-amber-500/30",
    bgGlow: "from-amber-500/20 to-amber-500/5"
  },
  primary: { 
    active: "bg-primary", 
    text: "text-primary", 
    glow: "shadow-[0_0_20px_hsl(var(--primary)/0.5)]",
    gradient: "from-primary to-teal-400",
    ring: "ring-primary/30",
    bgGlow: "from-primary/20 to-primary/5"
  },
  emerald: {
    active: "bg-emerald-500",
    text: "text-emerald-400",
    glow: "shadow-[0_0_20px_rgb(16,185,129,0.5)]",
    gradient: "from-emerald-500 to-green-400",
    ring: "ring-emerald-500/30",
    bgGlow: "from-emerald-500/20 to-emerald-500/5"
  },
  violet: {
    active: "bg-violet-500",
    text: "text-violet-400",
    glow: "shadow-[0_0_20px_rgb(139,92,246,0.5)]",
    gradient: "from-muted to-muted",
    ring: "ring-violet-500/30",
    bgGlow: "from-violet-500/20 to-violet-500/5"
  },
};

export const StatusTracker: React.FC<StatusTrackerProps> = ({
  steps,
  currentStep,
  color = "primary",
  orientation = "horizontal",
  animated = true,
  compact = false,
}) => {
  const colors = colorClasses[color];

  if (orientation === "vertical") {
    return (
      <div className="space-y-0">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div key={step.id} className="flex gap-4">
              {/* Line and dot */}
              <div className="flex flex-col items-center">
                <motion.div
                  initial={animated ? { scale: 0, rotate: -180 } : false}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 300 }}
                  className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 relative",
                    isCompleted && cn("bg-gradient-to-br", colors.gradient, "text-primary-foreground", colors.glow),
                    isCurrent && cn("bg-gradient-to-br", colors.gradient, "text-primary-foreground", colors.glow, "ring-4", colors.ring),
                    isPending && "bg-muted/50 text-muted-foreground border border-border/50"
                  )}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Check className="w-5 h-5" />
                    </motion.div>
                  ) : isCurrent ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    step.icon || <span className="text-sm font-bold">{index + 1}</span>
                  )}
                  
                  {/* Sparkle for current */}
                  {isCurrent && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-1 -right-1"
                    >
                      <Sparkles className={cn("w-4 h-4", colors.text)} />
                    </motion.div>
                  )}
                </motion.div>
                {index < steps.length - 1 && (
                  <div className="w-0.5 h-14 bg-muted/50 relative overflow-hidden rounded-full">
                    <motion.div
                      initial={{ height: "0%" }}
                      animate={{ height: isCompleted ? "100%" : "0%" }}
                      transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
                      className={cn("absolute top-0 left-0 right-0 bg-gradient-to-b rounded-full", colors.gradient)}
                    />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="pb-10">
                <p className={cn(
                  "font-bold transition-colors text-base",
                  (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                )}
                {step.time && (
                  <div className={cn("flex items-center gap-1.5 text-xs mt-2 font-medium", colors.text)}>
                    <Clock className="w-3 h-3" />
                    {step.time}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal orientation - Enhanced
  return (
    <div className={cn(
      "flex items-start justify-between gap-2",
      compact && "items-center"
    )}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-3 flex-1">
              <motion.div
                initial={animated ? { scale: 0, rotate: -180 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 300 }}
                className={cn(
                  "rounded-2xl flex items-center justify-center transition-all duration-500 relative",
                  compact ? "w-10 h-10" : "w-12 h-12 sm:w-14 sm:h-14",
                  isCompleted && cn("bg-gradient-to-br", colors.gradient, "text-primary-foreground", colors.glow),
                  isCurrent && cn("bg-gradient-to-br", colors.gradient, "text-primary-foreground", colors.glow, "ring-4", colors.ring),
                  isPending && "bg-muted/50 text-muted-foreground border border-border/50"
                )}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Check className={cn(compact ? "w-4 h-4" : "w-5 h-5")} />
                  </motion.div>
                ) : isCurrent ? (
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {step.icon || <span className="text-sm font-bold">{index + 1}</span>}
                  </motion.div>
                ) : (
                  step.icon || <span className="text-sm font-bold">{index + 1}</span>
                )}
                
                {/* Current step pulse */}
                {isCurrent && (
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                      "absolute inset-0 rounded-2xl",
                      colors.active
                    )}
                  />
                )}
              </motion.div>
              
              {!compact && (
                <div className="text-center max-w-[100px]">
                  <p className={cn(
                    "text-xs sm:text-sm font-semibold transition-colors leading-tight",
                    (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                  {step.time && isCurrent && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn("text-xs font-medium mt-1", colors.text)}
                    >
                      {step.time}
                    </motion.p>
                  )}
                </div>
              )}
            </div>

            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-1 rounded-full bg-muted/50 relative overflow-hidden",
                compact ? "mx-1 mt-5" : "mx-2 mt-6 sm:mt-7"
              )}>
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ 
                    width: isCompleted ? "100%" : isCurrent ? "50%" : "0%" 
                  }}
                  transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
                  className={cn("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r", colors.gradient)}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Live Location Pulse - Enhanced
interface LivePulseProps {
  color?: "rides" | "eats" | "sky" | "amber" | "primary" | "emerald";
  size?: "sm" | "md" | "lg";
  label?: string;
  showRing?: boolean;
}

export const LivePulse: React.FC<LivePulseProps> = ({
  color = "primary",
  size = "md",
  label,
  showRing = false,
}) => {
  const bgColors = {
    rides: "bg-rides",
    eats: "bg-eats",
    sky: "bg-sky-500",
    amber: "bg-amber-500",
    primary: "bg-primary",
    emerald: "bg-emerald-500",
  };

  const textColors = {
    rides: "text-rides",
    eats: "text-eats",
    sky: "text-sky-400",
    amber: "text-amber-400",
    primary: "text-primary",
    emerald: "text-emerald-400",
  };

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const ringClasses = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  };

  return (
    <div className="flex items-center gap-2">
      <span className={cn(
        "relative flex items-center justify-center",
        showRing && ringClasses[size]
      )}>
        <motion.span
          animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(
            "absolute inline-flex rounded-full",
            bgColors[color],
            sizeClasses[size]
          )}
        />
        <span className={cn(
          "relative inline-flex rounded-full",
          bgColors[color],
          sizeClasses[size]
        )} />
        {showRing && (
          <motion.span
            animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={cn(
              "absolute inset-0 rounded-full border-2",
              `border-current ${textColors[color]}`
            )}
          />
        )}
      </span>
      {label && (
        <span className={cn("text-sm font-bold uppercase tracking-wide", textColors[color])}>
          {label}
        </span>
      )}
    </div>
  );
};

// ETA Display - Premium
interface ETADisplayProps {
  minutes: number;
  label?: string;
  color?: "rides" | "eats" | "sky" | "amber" | "primary";
  showProgress?: boolean;
  totalMinutes?: number;
  variant?: "default" | "compact" | "large";
}

export const ETADisplay: React.FC<ETADisplayProps> = ({
  minutes,
  label = "Arriving in",
  color = "primary",
  showProgress = false,
  totalMinutes,
  variant = "default",
}) => {
  const colors = colorClasses[color];
  const progress = totalMinutes ? ((totalMinutes - minutes) / totalMinutes) * 100 : 0;

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 bg-card/80 backdrop-blur-xl px-4 py-3 rounded-2xl border border-border/50">
        <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", colors.bgGlow)}>
          <Clock className={cn("w-5 h-5", colors.text)} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <motion.p
            key={minutes}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-lg font-bold"
          >
            {minutes} <span className="text-sm font-normal text-muted-foreground">min</span>
          </motion.p>
        </div>
        <LivePulse color={color} size="sm" />
      </div>
    );
  }

  if (variant === "large") {
    return (
      <div className="relative glass-card p-6 rounded-3xl overflow-hidden">
        {/* Background glow */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none",
          colors.bgGlow
        )} />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", colors.gradient, colors.glow)}>
                <Clock className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-sm text-muted-foreground font-medium">{label}</span>
                <LivePulse color={color} size="sm" label="Live" />
              </div>
            </div>
          </div>
          
          <motion.div
            key={minutes}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-baseline gap-2"
          >
            <span className={cn("text-6xl font-bold bg-gradient-to-r bg-clip-text text-transparent", colors.gradient)}>
              {minutes}
            </span>
            <span className="text-xl text-muted-foreground font-medium">minutes</span>
          </motion.div>
          
          {showProgress && totalMinutes && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={cn("h-full rounded-full bg-gradient-to-r", colors.gradient)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="glass-card p-5 rounded-2xl relative overflow-hidden">
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-30 pointer-events-none",
        colors.bgGlow
      )} />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className={cn("w-5 h-5", colors.text)} />
            <span className="text-sm text-muted-foreground font-medium">{label}</span>
          </div>
          <LivePulse color={color} size="sm" label="Live" />
        </div>
        <motion.p
          key={minutes}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn("text-4xl font-bold", colors.text)}
        >
          {minutes} <span className="text-lg font-normal text-muted-foreground">min</span>
        </motion.p>
        {showProgress && totalMinutes && (
          <div className="mt-4 h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className={cn("h-full rounded-full bg-gradient-to-r", colors.gradient)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Order/Trip Status Badge - Enhanced
interface StatusBadgeProps {
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "delayed";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  showIcon?: boolean;
}

const statusConfig = {
  pending: { 
    label: "Pending", 
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20", 
    icon: Clock,
    gradient: "from-amber-500 to-orange-500"
  },
  confirmed: { 
    label: "Confirmed", 
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20", 
    icon: Check,
    gradient: "from-muted to-muted"
  },
  in_progress: { 
    label: "In Progress", 
    color: "bg-primary/10 text-primary border-primary/20", 
    icon: Loader2,
    gradient: "from-primary to-teal-400"
  },
  completed: { 
    label: "Completed", 
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", 
    icon: Check,
    gradient: "from-emerald-500 to-green-500"
  },
  cancelled: { 
    label: "Cancelled", 
    color: "bg-red-500/10 text-red-400 border-red-500/20", 
    icon: AlertCircle,
    gradient: "from-muted to-muted"
  },
  delayed: {
    label: "Delayed",
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    icon: Clock,
    gradient: "from-orange-500 to-amber-500"
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
  animated = true,
  showIcon = true,
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3.5 py-1.5 text-sm gap-2",
    lg: "px-4 py-2 text-base gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <motion.span 
      initial={animated ? { scale: 0.9, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center font-semibold rounded-xl border backdrop-blur-sm",
        config.color,
        sizeClasses[size]
      )}
    >
      {showIcon && (
        status === "in_progress" && animated ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Icon className={iconSizes[size]} />
          </motion.div>
        ) : (
          <Icon className={iconSizes[size]} />
        )
      )}
      {config.label}
    </motion.span>
  );
};

// Quick Status Indicator
interface QuickStatusProps {
  type: "active" | "idle" | "offline" | "busy";
  showLabel?: boolean;
}

export const QuickStatus: React.FC<QuickStatusProps> = ({
  type,
  showLabel = false,
}) => {
  const config = {
    active: { color: "bg-emerald-500", label: "Active", animate: true },
    idle: { color: "bg-amber-500", label: "Idle", animate: false },
    offline: { color: "bg-muted", label: "Offline", animate: false },
    busy: { color: "bg-red-500", label: "Busy", animate: true },
  };

  const { color, label, animate } = config[type];

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        {animate && (
          <motion.span
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={cn("absolute inline-flex h-full w-full rounded-full", color)}
          />
        )}
        <span className={cn("relative inline-flex rounded-full h-3 w-3", color)} />
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  );
};
