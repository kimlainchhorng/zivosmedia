import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface StarRatingProps {
  value: number;
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
  showValue?: boolean;
  reviewCount?: number;
  tooltip?: boolean;
  className?: string;
}

const sizeMap = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

const valueTextSize = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
} as const;

export function StarRating({
  value,
  max = 5,
  size = "sm",
  showValue = false,
  reviewCount,
  tooltip = true,
  className,
}: StarRatingProps) {
  const numeric = typeof value === "number" ? value : Number(value);
  const safe = Number.isFinite(numeric)
    ? Math.max(0, Math.min(max, numeric))
    : 0;

  const iconSize = sizeMap[size];

  const stars = Array.from({ length: max }).map((_, i) => {
    const isFull = safe >= i + 1;
    const isHalf = !isFull && safe >= i + 0.5;
    if (isFull) {
      return (
        <Star
          key={i}
          className={cn(iconSize, "fill-amber-400 text-amber-400")}
        />
      );
    }
    if (isHalf) {
      return (
        <span key={i} className={cn("relative inline-block", iconSize)}>
          <Star
            className={cn(
              iconSize,
              "absolute inset-0 fill-muted text-muted-foreground/30",
            )}
          />
          <StarHalf
            className={cn(
              iconSize,
              "absolute inset-0 fill-amber-400 text-amber-400",
            )}
          />
        </span>
      );
    }
    return (
      <Star
        key={i}
        className={cn(iconSize, "fill-muted text-muted-foreground/30")}
      />
    );
  });

  const content = (
    <span
      className={cn("inline-flex items-center gap-0.5 align-middle", className)}
      aria-label={`Rating: ${safe.toFixed(1)} out of ${max}`}
    >
      {stars}
      {showValue && (
        <span
          className={cn(
            "ml-1 font-semibold text-foreground",
            valueTextSize[size],
          )}
        >
          {safe.toFixed(1)}
        </span>
      )}
    </span>
  );

  if (!tooltip) return content;

  const tooltipText =
    `${safe.toFixed(1)} out of ${max}` +
    (typeof reviewCount === "number" && reviewCount > 0
      ? ` • ${reviewCount.toLocaleString()} review${reviewCount === 1 ? "" : "s"}`
      : "");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help">{content}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}

export default StarRating;
