/**
 * Hotel Results Skeleton
 * Shimmer loading state matching hotel card layout
 */
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function HotelResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden animate-pulse">
          <Skeleton className="aspect-[16/10] w-full" />
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-10 rounded-lg shrink-0" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-16 ml-1" />
            </div>
            <div className="flex items-end justify-between pt-1">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
