/**
 * SwipeableRow — Telegram-style swipe-to-reveal actions.
 * Swipe left → reveals right-side actions (Archive / Delete).
 * Swipe right → reveals left-side actions (Pin / Read).
 */
import { useRef } from "react";
import type { ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SwipeAction {
  key: string;
  label: string;
  icon: ReactNode;
  onPress: () => void;
  className?: string; // bg + text classes
}

interface Props {
  leftActions?: SwipeAction[]; // shown when swiping right
  rightActions?: SwipeAction[]; // shown when swiping left
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

const ACTION_WIDTH = 64;

export default function SwipeableRow({ leftActions = [], rightActions = [], children, className, disabled }: Props) {
  const x = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);

  const leftWidth = leftActions.length * ACTION_WIDTH;
  const rightWidth = rightActions.length * ACTION_WIDTH;

  const leftOpacity = useTransform(x, [0, 20, leftWidth || 1], [0, 1, 1]);
  const rightOpacity = useTransform(x, [-(rightWidth || 1), -20, 0], [1, 1, 0]);

  const snap = (to: number) => animate(x, to, { type: "spring", stiffness: 400, damping: 35 });

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset < -rightWidth / 2 || velocity < -500) {
      snap(-rightWidth);
    } else if (offset > leftWidth / 2 || velocity > 500) {
      snap(leftWidth);
    } else {
      snap(0);
    }
  };

  return (
    <div ref={ref} className={cn("relative overflow-hidden rounded-2xl", className)}>
      {/* Left action panel (revealed on swipe-right) */}
      {leftActions.length > 0 && (
        <motion.div
          style={{ opacity: leftOpacity }}
          className="absolute inset-y-0 left-0 flex items-stretch z-0"
        >
          {leftActions.map((a) => (
            <button type="button"
              key={a.key}
              onClick={() => {
                snap(0);
                a.onPress();
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[10px] font-semibold",
                a.className || "bg-primary text-primary-foreground"
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {a.icon}
              <span>{a.label}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Right action panel (revealed on swipe-left) */}
      {rightActions.length > 0 && (
        <motion.div
          style={{ opacity: rightOpacity }}
          className="absolute inset-y-0 right-0 flex items-stretch z-0"
        >
          {rightActions.map((a) => (
            <button type="button"
              key={a.key}
              onClick={() => {
                snap(0);
                a.onPress();
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[10px] font-semibold",
                a.className || "bg-destructive text-destructive-foreground"
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {a.icon}
              <span>{a.label}</span>
            </button>
          ))}
        </motion.div>
      )}

      <motion.div
        drag={disabled ? false : "x"}
        style={{ x, touchAction: "pan-y" }}
        dragConstraints={{ left: -rightWidth, right: leftWidth }}
        dragElastic={0.08}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        className="relative z-10 bg-transparent"
      >
        {children}
      </motion.div>
    </div>
  );
}
