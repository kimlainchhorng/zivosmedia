/**
 * EngagementSkeleton — placeholder for the post action row + "View all comments"
 * link while a post's engagement counts hydrate. Matches the real row's spacing
 * (h-[44px] tap targets, px-3 horizontal padding) so swapping skeleton → real
 * row does not cause layout shift.
 */
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";

export function EngagementSkeleton() {
  return (
    <div aria-hidden className="px-3 pb-2 pt-1">
      <div className="zivo-social-share-preview mb-2 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="zivo-social-skeleton-chip h-7 w-7 shrink-0 rounded-xl" />
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="zivo-social-skeleton-chip h-2.5 w-24 rounded-full" />
            <Skeleton className="zivo-social-skeleton-chip h-2.5 w-36 rounded-full" />
          </div>
        </div>
        <Skeleton className="zivo-social-skeleton-chip h-6 w-14 shrink-0 rounded-full" />
      </div>
      <div className="zivo-social-engagement-skeleton flex h-[52px] items-center gap-2.5 rounded-2xl px-2.5">
        <Skeleton className="zivo-social-skeleton-chip h-9 w-20 rounded-full" />
        <Skeleton className="zivo-social-skeleton-chip h-9 w-20 rounded-full" />
        <Skeleton className="zivo-social-skeleton-chip h-9 w-14 rounded-full" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="zivo-social-skeleton-chip h-9 w-9 rounded-full" />
          <Skeleton className="zivo-social-skeleton-chip hidden h-9 w-9 rounded-full sm:block" />
        </div>
      </div>
      <div className="zivo-social-comment-preview mt-2 flex items-center gap-2 rounded-2xl px-2.5 py-2">
        <Skeleton className="zivo-social-skeleton-chip h-7 w-7 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="zivo-social-skeleton-chip h-2.5 w-40 rounded-full" />
          <Skeleton className="zivo-social-skeleton-chip h-2.5 w-24 rounded-full" />
        </div>
        <Skeleton className="zivo-social-skeleton-chip h-7 w-7 shrink-0 rounded-full" />
      </div>
      <div className="zivo-social-module-tile mt-2 rounded-2xl px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className="zivo-social-share-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Engagement loading</span>
              <span className="block truncate text-xs font-bold text-foreground">Preparing reactions and comments</span>
            </span>
          </span>
          <Skeleton className="zivo-social-skeleton-chip h-6 w-14 shrink-0 rounded-full" />
        </div>
        <div className="zivo-social-chip mt-2 h-1.5 overflow-hidden rounded-full p-0">
          <Skeleton className="zivo-social-skeleton-chip h-full w-2/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CommentRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden className="space-y-3 px-4 py-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="zivo-social-comment-row flex items-start gap-3 rounded-2xl p-2.5">
          <div className="relative shrink-0">
            <Skeleton className="zivo-social-skeleton-chip h-10 w-10 rounded-full" />
            <Skeleton className="zivo-social-skeleton-chip absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="zivo-social-skeleton-chip h-3 w-1/3 rounded-full" />
              <Skeleton className="zivo-social-skeleton-chip h-2.5 w-10 rounded-full" />
              {i === 0 && <Skeleton className="zivo-social-skeleton-chip h-4 w-12 rounded-full" />}
            </div>
            <Skeleton className="zivo-social-skeleton-chip h-3 w-11/12 rounded-full" />
            <Skeleton className="zivo-social-skeleton-chip h-3 w-2/3 rounded-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="zivo-social-skeleton-chip h-5 w-14 rounded-full" />
              <Skeleton className="zivo-social-skeleton-chip h-5 w-12 rounded-full" />
            </div>
          </div>
          <Skeleton className="zivo-social-skeleton-chip h-8 w-8 shrink-0 rounded-full" />
        </div>
      ))}
      <div className="zivo-social-comment-footer rounded-2xl px-3 py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="zivo-social-skeleton-chip h-8 w-8 rounded-full" />
          <Skeleton className="zivo-social-skeleton-chip h-8 flex-1 rounded-full" />
          <Skeleton className="zivo-social-skeleton-chip h-8 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default EngagementSkeleton;
