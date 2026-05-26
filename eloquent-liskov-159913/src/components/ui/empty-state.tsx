import { type ComponentType, type ReactNode, type SVGProps } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** Icon component (e.g. a lucide icon). Renders inside a soft gradient halo. */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Big title — keep it under ~40 chars. */
  title: string;
  /** Body copy — under ~120 chars reads best. */
  description?: ReactNode;
  /** Primary action element (Button, Link, etc.). */
  action?: ReactNode;
  /** Secondary action shown next to the primary one. */
  secondaryAction?: ReactNode;
  /** Tone hint — adjusts the halo gradient color. Defaults to "brand". */
  tone?: "brand" | "muted" | "success" | "warning";
  /** Compact sizing for small panels and embedded contexts. */
  compact?: boolean;
  className?: string;
}

const toneGradient: Record<NonNullable<EmptyStateProps["tone"]>, string> = {
  brand: "from-fuchsia-500/25 via-rose-400/15 to-amber-300/10",
  muted: "from-foreground/15 via-foreground/8 to-foreground/0",
  success: "from-emerald-400/25 via-teal-400/15 to-sky-300/10",
  warning: "from-amber-400/25 via-orange-400/15 to-rose-300/10",
};

/**
 * EmptyState — opinionated, reusable empty/zero-data UI.
 *
 * - Soft animated gradient halo behind a centered icon
 * - Spring-pop entry so empty doesn't feel like a hang
 * - Slot for primary + secondary actions
 *
 * Usage:
 *   <EmptyState icon={MessageCircle} title="No messages yet" description="Start a conversation to see it here." action={<Button>New chat</Button>} />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  tone = "brand",
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4 gap-3" : "py-16 px-6 gap-4",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full",
            compact ? "w-14 h-14" : "w-20 h-20",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-full blur-2xl bg-gradient-to-br opacity-90",
              toneGradient[tone],
            )}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-background/60 ring-1 ring-border/40 backdrop-blur-md"
          />
          <Icon
            className={cn(
              "relative z-10 text-foreground/85",
              compact ? "w-6 h-6" : "w-8 h-8",
            )}
            strokeWidth={1.6}
          />
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 max-w-sm">
        <h3
          className={cn(
            "font-semibold tracking-tight text-foreground",
            compact ? "text-[15px]" : "text-lg",
          )}
        >
          {title}
        </h3>
        {description && (
          <p
            className={cn(
              "text-muted-foreground leading-snug",
              compact ? "text-[13px]" : "text-sm",
            )}
          >
            {description}
          </p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 pt-1">
          {action}
          {secondaryAction}
        </div>
      )}
    </motion.div>
  );
}

export default EmptyState;
