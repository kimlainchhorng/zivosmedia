/**
 * Desktop Filters Sidebar
 * Reusable sticky sidebar wrapper with service-specific styling
 */

import type { ReactNode } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DesktopFiltersSidebarProps {
  children: ReactNode;
  activeCount: number;
  onClearAll: () => void;
  service?: "flights" | "hotels" | "cars" | "eats" | "rides" | "delivery";
  className?: string;
}

const serviceColors: Record<string, string> = {
  flights: "text-sky-500",
  hotels: "text-amber-500",
  cars: "text-violet-500",
  eats: "text-orange-500",
  rides: "text-emerald-500",
  delivery: "text-violet-500",
};

export function DesktopFiltersSidebar({
  children,
  activeCount,
  onClearAll,
  service = "flights",
  className,
}: DesktopFiltersSidebarProps) {
  const accentColor = serviceColors[service];

  return (
    <aside className={cn("hidden lg:block w-72 shrink-0", className)}>
      <div className="sticky top-36 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="font-semibold flex items-center gap-2">
            <Filter className={cn("w-4 h-4", accentColor)} />
            Filters
            {activeCount > 0 && (
              <span className="text-xs text-muted-foreground">({activeCount})</span>
            )}
          </h3>
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="w-3 h-3" />
              Clear all
            </Button>
          )}
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="p-4">{children}</div>
        </ScrollArea>
      </div>
    </aside>
  );
}
