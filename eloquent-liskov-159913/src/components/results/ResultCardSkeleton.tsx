/**
 * Universal Result Card Skeleton
 * Consistent loading states across all services
 */

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ResultCardSkeletonProps {
  variant?: "flight" | "hotel" | "car";
}

export function ResultCardSkeleton({ variant = "flight" }: ResultCardSkeletonProps) {
  if (variant === "hotel") {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Image */}
            <Skeleton className="w-full sm:w-48 h-48 sm:h-auto rounded-none" />
            
            {/* Content */}
            <div className="flex-1 p-4 space-y-3">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-12 rounded-xl" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded" />
                <Skeleton className="h-6 w-20 rounded" />
                <Skeleton className="h-6 w-14 rounded" />
              </div>
              <div className="flex items-end justify-between pt-3 border-t border-border/50">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="h-10 w-28 rounded-xl" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "car") {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Image */}
            <div className="sm:w-48 h-32 sm:h-auto p-6 flex items-center justify-center">
              <Skeleton className="w-32 h-20 rounded" />
            </div>
            
            {/* Content */}
            <div className="flex-1 p-4 space-y-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded" />
                <Skeleton className="h-6 w-20 rounded" />
              </div>
            </div>
            
            {/* Price */}
            <div className="sm:w-44 p-4 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-border/50">
              <div className="space-y-1 text-center">
                <Skeleton className="h-3 w-10 mx-auto" />
                <Skeleton className="h-8 w-20 mx-auto" />
                <Skeleton className="h-3 w-24 mx-auto" />
              </div>
              <Skeleton className="h-10 w-full mt-3 rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Flight skeleton (default)
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Airline */}
          <div className="p-4 lg:p-5 flex items-center gap-4 lg:w-48 border-b lg:border-b-0 lg:border-r border-border/50">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>

          {/* Times */}
          <div className="flex-1 p-4 lg:p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="text-center space-y-1">
                <Skeleton className="h-7 w-14 mx-auto" />
                <Skeleton className="h-4 w-10 mx-auto" />
              </div>
              <div className="flex-1 px-4">
                <Skeleton className="h-0.5 w-full" />
                <div className="flex justify-center gap-2 mt-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <Skeleton className="h-7 w-14 mx-auto" />
                <Skeleton className="h-4 w-10 mx-auto" />
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="p-4 lg:p-5 lg:w-44 border-t lg:border-t-0 lg:border-l border-border/50 flex flex-row lg:flex-col items-center justify-between lg:justify-center gap-4 bg-muted/20">
            <div className="space-y-1 text-center">
              <Skeleton className="h-3 w-10 mx-auto" />
              <Skeleton className="h-8 w-20 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Multiple skeletons
export function ResultsSkeletonList({ 
  count = 5, 
  variant = "flight" 
}: { 
  count?: number; 
  variant?: "flight" | "hotel" | "car";
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ResultCardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
}
