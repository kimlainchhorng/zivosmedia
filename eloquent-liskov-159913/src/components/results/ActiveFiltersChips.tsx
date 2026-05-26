/**
 * Active Filters Chips
 * Shows applied filters as removable chips with animations
 */

import { X, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface FilterChip {
  id: string;
  label: string;
  category: string;
}

interface ActiveFiltersChipsProps {
  filters: FilterChip[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  service?: "flights" | "hotels" | "cars" | "eats" | "rides" | "delivery";
  resultsCount?: number;
  className?: string;
}

const chipColors: Record<string, string> = {
  flights: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/20",
  hotels: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
  cars: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20",
  eats: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/20",
  rides: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
  delivery: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20",
};

const clearButtonColors: Record<string, string> = {
  flights: "text-sky-600 dark:text-sky-400 hover:bg-sky-500/10",
  hotels: "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10",
  cars: "text-violet-600 dark:text-violet-400 hover:bg-violet-500/10",
  eats: "text-orange-600 dark:text-orange-400 hover:bg-orange-500/10",
  rides: "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10",
  delivery: "text-violet-600 dark:text-violet-400 hover:bg-violet-500/10",
};

export function ActiveFiltersChips({
  filters,
  onRemove,
  onClearAll,
  service = "flights",
  resultsCount,
  className,
}: ActiveFiltersChipsProps) {
  if (filters.length === 0) return null;

  const chipColor = chipColors[service];
  const clearColor = clearButtonColors[service];

  return (
    <div className={cn("flex flex-wrap items-center gap-2 py-3", className)}>
      <AnimatePresence mode="popLayout">
        {filters.map((filter) => (
          <motion.div
            key={filter.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            layout
          >
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 pr-1 cursor-pointer transition-colors font-medium",
                chipColor
              )}
              onClick={() => onRemove(filter.id)}
            >
              <span className="text-xs opacity-70">{filter.category}:</span>
              {filter.label}
              <X className="w-3 h-3 opacity-50 hover:opacity-100 transition-opacity" />
            </Badge>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Results count preview */}
      {resultsCount !== undefined && (
        <span className="text-xs text-muted-foreground ml-1">
          ({resultsCount} result{resultsCount !== 1 ? "s" : ""})
        </span>
      )}

      {/* Clear all button */}
      {filters.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className={cn("h-7 text-xs gap-1.5 rounded-xl active:scale-95 transition-all duration-200 touch-manipulation", clearColor)}
          >
            <Trash2 className="w-3 h-3" />
            Clear all
          </Button>
        </motion.div>
      )}
    </div>
  );
}
