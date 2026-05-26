/**
 * EngagementSkeleton — placeholder for the post action row + "View all comments"
 * link while a post's engagement counts hydrate. Matches the real row's spacing
 * (h-[44px] tap targets, px-3 horizontal padding) so swapping skeleton → real
 * row does not cause layout shift.
 */
import { Skeleton } from "@/components/ui/skeleton";

export function EngagementSkeleton() {
  return (
    <div aria-hidden className="px-3 pb-2 pt-1">
      <div className="flex items-center h-[44px] gap-3">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-8 rounded-full" />
        <Skeleton className="ml-auto h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="mt-1 h-3 w-32 rounded" />
    </div>
  );
}

export function CommentRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden className="px-4 py-3 space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3 rounded" />
            <Skeleton className="h-3 w-5/6 rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default EngagementSkeleton;
