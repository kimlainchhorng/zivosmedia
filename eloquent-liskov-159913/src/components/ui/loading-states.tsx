import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "./button";

// Premium Spinner
interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "white" | "muted" | "brand";
  className?: string;
}

const spinnerSizes = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-10 h-10",
  xl: "w-14 h-14",
};

const spinnerColors = {
  primary: "text-primary",
  white: "text-primary-foreground",
  muted: "text-muted-foreground",
  brand: "text-[#dc2743]",
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  color = "primary",
  className,
}) => {
  return (
    <Loader2 className={cn(
      "animate-spin",
      spinnerSizes[size],
      spinnerColors[color],
      className
    )} />
  );
};

// Pulse Loader (three dots)
interface PulseLoaderProps {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "white" | "muted" | "brand";
  className?: string;
}

export const PulseLoader: React.FC<PulseLoaderProps> = ({
  size = "md",
  color = "primary",
  className,
}) => {
  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
  };

  const dotColors = {
    primary: "bg-primary",
    white: "bg-white",
    muted: "bg-muted-foreground",
    brand: "bg-ig-gradient",
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn("rounded-full", dotSizes[size], dotColors[color])}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
};

// Progress Bar Loader
interface ProgressLoaderProps {
  progress?: number;
  indeterminate?: boolean;
  label?: string;
  showPercentage?: boolean;
  color?: "primary" | "green" | "amber" | "sky";
  className?: string;
}

const progressColors = {
  primary: "bg-ig-gradient",
  green: "bg-gradient-to-r from-emerald-500 to-green-400",
  amber: "bg-gradient-to-r from-amber-500 to-orange-400",
  sky: "bg-gradient-to-r from-sky-500 to-blue-400",
};

export const ProgressLoader: React.FC<ProgressLoaderProps> = ({
  progress = 0,
  indeterminate = false,
  label,
  showPercentage = true,
  color = "primary",
  className,
}) => {
  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm text-muted-foreground">{label}</span>}
          {showPercentage && !indeterminate && (
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        {indeterminate ? (
          <motion.div
            className={cn("h-full w-1/3 rounded-full", progressColors[color])}
            animate={{ x: ["0%", "200%", "0%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : (
          <motion.div
            className={cn("h-full rounded-full", progressColors[color])}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>
    </div>
  );
};

// Skeleton Variants
interface SkeletonLoaderProps {
  variant?: "text" | "avatar" | "card" | "list" | "table";
  lines?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = "text",
  lines = 3,
  className,
}) => {
  if (variant === "avatar") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("p-4 rounded-xl border border-border/50", className)}>
        <div className="h-32 bg-muted animate-pulse rounded-xl mb-4" />
        <div className="space-y-2">
          <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="grid grid-cols-4 gap-4 p-3 bg-muted/30 rounded-lg">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-muted animate-pulse rounded" />
          ))}
        </div>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 p-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-4 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Default text variant
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-muted animate-pulse rounded",
            i === lines - 1 && "w-3/4"
          )}
        />
      ))}
    </div>
  );
};

// Full Page Loader
interface PageLoaderProps {
  message?: string;
  submessage?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  message = "Loading...",
  submessage,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="relative mb-6">
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.15, 0.35] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-2xl bg-ig-gradient blur-xl"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="relative w-16 h-16 rounded-2xl bg-ig-gradient flex items-center justify-center shadow-lg shadow-black/10"
        >
          <Spinner size="lg" color="white" />
        </motion.div>
      </div>
      <p className="text-lg font-semibold tracking-tight">{message}</p>
      {submessage && (
        <p className="text-sm text-muted-foreground mt-1">{submessage}</p>
      )}
    </motion.div>
  );
};

// Overlay Loader
interface OverlayLoaderProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export const OverlayLoader: React.FC<OverlayLoaderProps> = ({
  isLoading,
  message,
  children,
}) => {
  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg z-10"
          >
            <Spinner size="lg" />
            {message && <p className="text-sm text-muted-foreground mt-3">{message}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Status Loader with states
interface StatusLoaderProps {
  status: "loading" | "success" | "error" | "idle";
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}

export const StatusLoader: React.FC<StatusLoaderProps> = ({
  status,
  loadingMessage = "Loading...",
  successMessage = "Success!",
  errorMessage = "Something went wrong",
  onRetry,
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)}>
      <AnimatePresence mode="wait">
        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-2xl bg-ig-gradient opacity-25 blur-md animate-pulse" />
              <div className="relative w-14 h-14 rounded-2xl bg-ig-gradient flex items-center justify-center shadow-md shadow-black/10">
                <Spinner size="lg" color="white" />
              </div>
            </div>
            <p className="text-muted-foreground">{loadingMessage}</p>
          </motion.div>
        )}
        
        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4"
            >
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </motion.div>
            <p className="font-medium text-emerald-500">{successMessage}</p>
          </motion.div>
        )}
        
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="font-medium text-red-500 mb-3">{errorMessage}</p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
                <RefreshCcw className="w-4 h-4" />
                Try Again
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Button with loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg";
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  loadingText,
  children,
  disabled,
  className,
  ...props
}) => {
  return (
    <Button
      disabled={isLoading || disabled}
      className={className}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Spinner size="sm" color="white" />
          <span>{loadingText || "Loading..."}</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
};

export default Spinner;
