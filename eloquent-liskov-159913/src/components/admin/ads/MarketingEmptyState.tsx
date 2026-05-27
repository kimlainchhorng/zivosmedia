/**
 * MarketingEmptyState — shared empty-state UI for Marketing & Ads surfaces.
 * Compact on mobile, spacious on desktop.
 */
import { Megaphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mkBody, mkHeading } from "./marketing-tokens";

type Variant = "campaigns" | "default";

interface Props {
  icon?: LucideIcon;
  title?: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: Variant;
}

const VARIANT_PRESETS: Record<Exclude<Variant, "default">, { icon: LucideIcon; title: string; body: string }> = {
  campaigns: {
    icon: Megaphone,
    title: "No campaigns match",
    body: "Try a different filter, or create a new campaign to fill this view.",
  },
};

export default function MarketingEmptyState({ icon, title, body, action, className, variant = "default" }: Props) {
  const preset = variant !== "default" ? VARIANT_PRESETS[variant] : null;
  const Icon = icon ?? preset?.icon ?? Megaphone;
  const finalTitle = title ?? preset?.title ?? "Nothing here";
  const finalBody = body ?? preset?.body;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-muted/20",
        "p-4 sm:p-6 lg:p-8",
        className
      )}
    >
      <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-primary/5 mb-3 sm:mb-4">
        <Icon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-primary/60" />
      </div>
      <h3 className={cn(mkHeading, "mb-1.5")}>{finalTitle}</h3>
      {finalBody && <p className={cn(mkBody, "text-muted-foreground max-w-xs sm:max-w-sm")}>{finalBody}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
