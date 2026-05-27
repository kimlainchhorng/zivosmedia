/**
 * Car Results Skeleton Loader
 * Premium skeleton cards for loading state
 */

import { cn } from "@/lib/utils";

interface CarResultsSkeletonProps {
  count?: number;
  className?: string;
}

function SkeletonCard() {
  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border/60",
      "shadow-[var(--shadow-card)]",
      "overflow-hidden animate-pulse"
    )}>
      <div className="flex flex-col sm:flex-row">
        {/* Image skeleton */}
        <div className="sm:w-56 h-44 sm:h-auto bg-muted/50" />

        {/* Details skeleton */}
        <div className="flex-1 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-2">
              <div className="h-6 w-32 bg-muted rounded-md" />
              <div className="h-4 w-24 bg-muted/70 rounded-md" />
            </div>
          </div>

          {/* Specs row skeleton */}
          <div className="flex gap-4 mb-4">
            <div className="h-4 w-16 bg-muted/60 rounded" />
            <div className="h-4 w-16 bg-muted/60 rounded" />
            <div className="h-4 w-20 bg-muted/60 rounded" />
            <div className="h-4 w-12 bg-muted/60 rounded" />
          </div>

          {/* Features skeleton */}
          <div className="flex gap-2">
            <div className="h-6 w-28 bg-muted/50 rounded-full" />
            <div className="h-6 w-24 bg-muted/50 rounded-full" />
            <div className="h-6 w-20 bg-muted/50 rounded-full" />
          </div>
        </div>

        {/* Price skeleton */}
        <div className="sm:w-52 p-5 sm:p-6 flex flex-col justify-between items-end border-t sm:border-t-0 sm:border-l border-border/40 bg-muted/20">
          <div className="text-right w-full space-y-2">
            <div className="h-4 w-20 bg-muted/60 rounded ml-auto" />
            <div className="h-8 w-28 bg-muted rounded ml-auto" />
            <div className="h-4 w-24 bg-muted/60 rounded ml-auto" />
          </div>
          <div className="h-10 w-full bg-muted rounded-xl mt-4" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="px-5 py-2.5 bg-muted/30 border-t border-border/30">
        <div className="h-3 w-64 bg-muted/50 rounded mx-auto" />
      </div>
    </div>
  );
}

export function CarResultsSkeleton({ count = 5, className }: CarResultsSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
