/**
 * Flight Mobile Results Bar
 * Sticky bottom bar for mobile with Filter + Sort buttons
 * Replaces or works alongside StickyBookingCTA
 */

import { useState } from "react";
import { SlidersHorizontal, ArrowUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { FLIGHT_DISCLAIMERS } from "@/config/flightCompliance";
import { flightSortOptions, type SortOption } from "@/components/results/SortSelect";

interface FlightMobileResultsBarProps {
  sortOptions?: SortOption[];
  currentSort?: string;
  onSortChange?: (value: string) => void;
  onOpenFilters?: () => void;
  filterCount?: number;
  show?: boolean;
  className?: string;
}

export default function FlightMobileResultsBar({
  sortOptions = flightSortOptions,
  currentSort = "price",
  onSortChange,
  onOpenFilters,
  filterCount = 0,
  show = true,
  className,
}: FlightMobileResultsBarProps) {
  const [sortOpen, setSortOpen] = useState(false);

  if (!show) return null;

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
      "bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-lg",
      "border-t border-border/50 shadow-2xl shadow-black/10",
      className
    )}
    style={{ paddingBottom: "var(--zivo-safe-bottom,8px)" }}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex gap-3">
          {/* Filter Button */}
          <Button
            variant="outline"
            onClick={onOpenFilters}
            className="flex-1 h-12 min-h-[48px] rounded-2xl gap-2 font-semibold relative touch-manipulation active:scale-[0.98]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
            {filterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-foreground text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </Button>

          {/* Sort Button */}
          <Sheet open={sortOpen} onOpenChange={setSortOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 h-12 min-h-[48px] rounded-2xl gap-2 font-semibold touch-manipulation active:scale-[0.98]"
              >
                <ArrowUpDown className="w-4 h-4" />
                Sort
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl" style={{ paddingBottom: "var(--zivo-safe-bottom,16px)" }}>
              <SheetHeader className="pb-4">
                <SheetTitle>Sort by</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-2">
                {sortOptions.map((option) => (
                  <button type="button"
                    key={option.value}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all touch-manipulation active:scale-[0.98] min-h-[56px]",
                      currentSort === option.value
                        ? "border-sky-500 bg-sky-500/10"
                        : "border-border/50 hover:border-border"
                    )}
                    onClick={() => {
                      onSortChange?.(option.value);
                      setSortOpen(false);
                    }}
                  >
                    <span className="font-medium">{option.label}</span>
                    {currentSort === option.value && (
                      <Check className="w-5 h-5 text-foreground" />
                    )}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Compliance Disclaimer */}
        <p className="text-[9px] text-muted-foreground text-center mt-2 leading-tight">
          {FLIGHT_DISCLAIMERS.ticketingShort}
        </p>
      </div>
    </div>
  );
}
