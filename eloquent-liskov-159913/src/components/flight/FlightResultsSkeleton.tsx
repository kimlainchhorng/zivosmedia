/**
 * Flight Results Skeleton — 2026 Spatial UI
 * Content-aware shimmer matching actual flight card layout
 */
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function FlightResultsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {/* Searching indicator */}
      <div className="flex items-center gap-3 py-3 px-1">
        <div className="w-5 h-5 rounded-full border-2 border-[hsl(var(--flights))]/30 border-t-[hsl(var(--flights))] animate-spin" />
        <span className="text-sm text-muted-foreground animate-pulse">Searching 500+ airlines...</span>
      </div>

      {/* Flight card skeletons */}
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="bg-card/60 backdrop-blur-sm border-border/30"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <CardContent className="p-3.5 sm:p-5">
            <div className="space-y-3">
              {/* Top row: airline + price */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-9 h-9 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
                <div className="space-y-1.5 text-right">
                  <Skeleton className="h-6 w-16 ml-auto" />
                  <Skeleton className="h-2 w-12 ml-auto" />
                </div>
              </div>

              {/* Route timeline */}
              <div className="flex items-center gap-3">
                <div className="space-y-1.5 min-w-[52px]">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-2.5 w-8" />
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <Skeleton className="h-2.5 w-10" />
                  <Skeleton className="w-full h-px" />
                  <Skeleton className="h-2.5 w-8" />
                </div>
                <div className="space-y-1.5 min-w-[52px]">
                  <Skeleton className="h-5 w-12 ml-auto" />
                  <Skeleton className="h-2.5 w-8 ml-auto" />
                </div>
              </div>

              {/* Tags + button */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
