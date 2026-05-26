/**
 * ZivoPlusBadge - Small badge indicator for Plus members
 */

import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ZivoPlusBadgeProps {
  variant?: "default" | "small" | "inline";
  className?: string;
}

export function ZivoPlusBadge({ variant = "default", className }: ZivoPlusBadgeProps) {
  if (variant === "small") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center cursor-pointer",
              className
            )}>
              <Crown className="w-3 h-3 text-primary-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">ZIVO Plus Member</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "inline") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-amber-500",
        className
      )}>
        <Crown className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">Plus</span>
      </span>
    );
  }

  return (
    <Badge className={cn(
      "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 border-amber-500/30 gap-1",
      className
    )}>
      <Crown className="w-3 h-3" />
      ZIVO Plus
    </Badge>
  );
}

export default ZivoPlusBadge;
