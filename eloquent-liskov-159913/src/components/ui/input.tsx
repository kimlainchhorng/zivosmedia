import * as React from "react";
import { cn } from "@/lib/utils";
import { X, AlertCircle, CheckCircle2, type LucideIcon } from "lucide-react";

export interface InputProps extends React.ComponentProps<"input"> {
  /** Icon to display on the left side */
  leftIcon?: LucideIcon;
  /** Icon to display on the right side */
  rightIcon?: LucideIcon;
  /** Show clear button when input has value */
  clearable?: boolean;
  /** Callback when clear button is clicked */
  onClear?: () => void;
  /** Validation state */
  validationState?: "default" | "success" | "error";
  /** Error message to display */
  errorMessage?: string;
  /** Success message to display */
  successMessage?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      clearable,
      onClear,
      validationState = "default",
      errorMessage,
      successMessage,
      value,
      ...props
    },
    ref
  ) => {
    const hasValue = value !== undefined && value !== "";
    const showClear = clearable && hasValue && !props.disabled;

    // Determine right-side content
    const getRightContent = () => {
      if (validationState === "error") {
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      }
      if (validationState === "success") {
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      }
      if (showClear) {
        return (
          <button
            type="button"
            onClick={onClear}
            className="p-0.5 rounded-full hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            tabIndex={-1}
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        );
      }
      if (RightIcon) {
        return <RightIcon className="w-4 h-4 text-muted-foreground" />;
      }
      return null;
    };

    const rightContent = getRightContent();
    const hasLeftIcon = !!LeftIcon;
    const hasRightContent = !!rightContent;

    return (
      <div className="w-full space-y-1">
        <div className="relative group">
          {/* Premium Glow Effect on Focus - Subtle */}
          <div className={cn(
            "absolute -inset-px rounded-xl opacity-0 blur-sm transition-all duration-300",
            "group-focus-within:opacity-100",
            validationState === "default" && "bg-gradient-to-r from-sky-500/20 via-primary/15 to-cyan-500/20",
            validationState === "error" && "bg-gradient-to-r from-destructive/20 to-red-500/20",
            validationState === "success" && "bg-gradient-to-r from-emerald-500/20 to-green-500/20"
          )} />
          
          {/* Left Icon - Compact */}
          {LeftIcon && (
            <div className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              <div className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                "bg-gradient-to-br from-sky-500/15 to-cyan-500/10 group-focus-within:from-sky-500/25 group-focus-within:to-cyan-500/20",
                validationState === "error" && "from-destructive/15 to-red-500/10",
                validationState === "success" && "from-emerald-500/15 to-green-500/10"
              )}>
                <LeftIcon className={cn(
                  "w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-200",
                  validationState === "default" && "text-sky-400 group-focus-within:text-sky-300",
                  validationState === "error" && "text-destructive",
                  validationState === "success" && "text-emerald-400"
                )} />
              </div>
            </div>
          )}

          {/* Input - Compact Mobile */}
          <input
            type={type}
            value={value}
            className={cn(
              // Base styles - Compact. Use a solid background and full-strength
              // border so inputs stay legible on light themes — the previous
              // bg-muted/50 + border-border/40 combo washed out on white cards.
              // Also pin the foreground colour explicitly so typed text never
              // inherits a faint placeholder colour, and override the WebKit
              // autofill text-fill colour for browser-saved values.
              "relative flex h-10 sm:h-11 w-full rounded-lg border text-sm font-medium transition-all duration-200",
              "bg-background text-foreground caret-foreground",
              "[-webkit-text-fill-color:hsl(var(--foreground))] [&:-webkit-autofill]:[-webkit-text-fill-color:hsl(var(--foreground))] [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_hsl(var(--background))_inset]",
              "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
              "placeholder:text-muted-foreground placeholder:font-normal placeholder:text-sm",
              // Focus styles
              "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-sky-500 focus-visible:bg-background",
              // Hover styles
              "hover:border-foreground/30 hover:bg-background",
              // Disabled styles
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30",
              // Validation states
              validationState === "default" && "border-border",
              validationState === "error" &&
                "border-destructive/50 focus-visible:border-destructive bg-destructive/5",
              validationState === "success" &&
                "border-emerald-500/50 focus-visible:border-emerald-500 bg-emerald-500/5",
              // Padding based on icons - compact
              hasLeftIcon ? "pl-11 sm:pl-12" : "px-3",
              hasRightContent ? "pr-9 sm:pr-10" : "pr-3",
              className
            )}
            ref={ref}
            {...props}
          />

          {/* Right Content */}
          {rightContent && (
            <div className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 flex items-center z-10">
              {rightContent}
            </div>
          )}
        </div>

        {/* Validation Messages - Compact */}
        {validationState === "error" && errorMessage && (
          <p className="text-xs text-destructive flex items-center gap-1 pl-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <AlertCircle className="w-3 h-3" />
            {errorMessage}
          </p>
        )}
        {validationState === "success" && successMessage && (
          <p className="text-xs text-emerald-400 flex items-center gap-1 pl-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <CheckCircle2 className="w-3 h-3" />
            {successMessage}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
