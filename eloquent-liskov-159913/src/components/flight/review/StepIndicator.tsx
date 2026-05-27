/**
 * StepIndicator — 3D Spatial progress bar
 * Premium floating steps with perspective depth and glow effects
 */
import { motion } from "framer-motion";
import { Globe, Ticket, Info, Users, CreditCard, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Search", icon: Globe },
  { label: "Results", icon: Ticket },
  { label: "Review", icon: Info },
  { label: "Travelers", icon: Users },
  { label: "Checkout", icon: CreditCard },
];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div
      className="flex items-center justify-between w-full py-3 px-2"
      style={{ perspective: "600px" }}
    >
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isDone = i < current;
        const isActive = i === current;
        return (
          <div key={step.label} className="flex items-center">
            <motion.div
              className="flex flex-col items-center gap-1.5 min-w-0 flex-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300",
                  isDone && "bg-[hsl(var(--flights))] text-[hsl(var(--background))]",
                  isActive && "bg-[hsl(var(--flights))]/15 text-[hsl(var(--flights))]",
                  !isDone && !isActive && "bg-muted/50 text-muted-foreground/50"
                )}
                style={{
                  transform: isActive ? "perspective(200px) translateZ(6px)" : "perspective(200px) translateZ(0px)",
                  boxShadow: isDone
                    ? "0 6px 16px -4px hsl(var(--flights)/0.35), inset 0 1px 0 hsl(var(--background)/0.2)"
                    : isActive
                      ? "0 8px 20px -6px hsl(var(--flights)/0.25), inset 0 1px 0 hsl(var(--background)/0.5), 0 0 0 2px hsl(var(--flights)/0.2)"
                      : "inset 0 1px 2px hsl(var(--foreground)/0.04)",
                  transition: "all 0.3s ease",
                }}
              >
                {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Icon className="w-3.5 h-3.5" />}
                {/* Shine on active */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
                )}
              </div>
              <span className={cn(
                "text-[9px] font-bold tracking-wide",
                isActive ? "text-[hsl(var(--flights))]" : isDone ? "text-foreground" : "text-muted-foreground/50"
              )}>
                {step.label}
              </span>
            </motion.div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-6 sm:w-8 h-[2px] rounded-full -mt-3 transition-all duration-300",
                  i < current ? "bg-[hsl(var(--flights))]" : "bg-border/20"
                )}
                style={{
                  boxShadow: i < current ? "0 2px 6px -2px hsl(var(--flights)/0.3)" : undefined,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
