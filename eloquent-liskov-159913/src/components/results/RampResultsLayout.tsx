/**
 * Ramp-Style Results Page Layout
 * Clean 2-column layout with filters on left, results center
 * Premium SaaS travel UI
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RampResultsLayoutProps {
  filters: ReactNode;
  children: ReactNode;
  className?: string;
}

export function RampResultsLayout({ filters, children, className }: RampResultsLayoutProps) {
  return (
    <div className={cn("flex gap-8", className)}>
      {/* Left Sidebar - Filters (Desktop) */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-24 space-y-6">
          <div className="bg-card rounded-2xl border border-border/60 shadow-[var(--shadow-card)] p-6 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            {filters}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}

interface RampResultsHeaderProps {
  count: number;
  itemName: string;
  isLoading?: boolean;
  sortElement?: ReactNode;
  filterTrigger?: ReactNode;
}

export function RampResultsHeader({ 
  count, 
  itemName, 
  isLoading, 
  sortElement,
  filterTrigger 
}: RampResultsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <p className="text-lg font-semibold text-foreground">
          {isLoading ? (
            <span className="text-muted-foreground">Searching...</span>
          ) : (
            <>
              <span className="text-primary">{count}</span> {itemName}{count !== 1 ? "s" : ""} found
            </>
          )}
        </p>
        {!isLoading && count > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Prices may change until booking is completed with the provider.
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {/* Mobile filter trigger */}
        <div className="lg:hidden">
          {filterTrigger}
        </div>
        {sortElement}
      </div>
    </div>
  );
}

interface RampGlobalDisclaimerProps {
  className?: string;
}

export function RampGlobalDisclaimer({ className }: RampGlobalDisclaimerProps) {
  return (
    <div className={cn(
      "bg-muted/40 border border-border/40 rounded-xl px-4 py-3 text-center",
      className
    )}>
      <p className="text-xs text-muted-foreground">
        ZIVO compares prices from licensed travel partners. Bookings are completed on partner websites.
      </p>
    </div>
  );
}

interface RampIndicativeNoticeProps {
  className?: string;
}

export function RampIndicativeNotice({ className }: RampIndicativeNoticeProps) {
  return (
    <div className={cn(
      "bg-primary/5 border border-primary/10 rounded-xl px-4 py-3",
      className
    )}>
      <p className="text-sm text-foreground">
        <span className="font-medium">Compare prices</span> – Prices are provided by travel partners and may change until booking is completed. Click "Book with Provider" to view real-time pricing.
      </p>
    </div>
  );
}
