/**
 * Results Container
 * Two-column layout with sidebar filters (desktop) and results list
 * Premium, consistent design system across Flights, Hotels, Cars
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ResultsContainerProps {
  filters?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ResultsContainer({ filters, children, className }: ResultsContainerProps) {
  return (
    <div className={cn("flex gap-6", className)}>
      {/* Filters Sidebar (Desktop) */}
      {filters && (
        <aside className="hidden lg:block w-72 shrink-0">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="sticky top-36 space-y-4 bg-card/60 backdrop-blur-xl rounded-2xl border border-border/40 p-5 shadow-lg shadow-black/[0.03]"
          >
            {filters}
          </motion.div>
        </aside>
      )}

      {/* Results List */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// Results header with count, sort, filter trigger, and chips slot
interface ResultsHeaderProps {
  count: number;
  itemName: string;
  isLoading?: boolean;
  indicativePrice?: boolean;
  sortElement?: ReactNode;
  filterTrigger?: ReactNode;
  filterChips?: ReactNode;
  className?: string;
}

export function ResultsHeader({
  count,
  itemName,
  isLoading = false,
  indicativePrice = false,
  sortElement,
  filterTrigger,
  filterChips,
  className,
}: ResultsHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("mb-5", className)}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {isLoading ? (
            <div className="h-6 w-32 bg-muted animate-pulse rounded-lg" />
          ) : (
            <>
              <h2 className="text-lg font-semibold">
                <span className="text-foreground">{count}</span>{" "}
                <span className="text-muted-foreground">
                  {itemName}
                  {count !== 1 ? "s" : ""} found
                </span>
              </h2>
              {indicativePrice && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Prices may change until booking is completed with the provider.
                </p>
              )}
            </>
          )}
        </div>

        {/* Mobile: Sticky sort/filter controls */}
        <div className="flex items-center gap-2">
          {filterTrigger}
          {sortElement}
        </div>
      </div>
      
      {/* Filter chips row */}
      {filterChips}
    </motion.div>
  );
}
