/**
 * MarketingSkeletons — bone shapes that mirror real Marketing & Ads layouts at the active breakpoint.
 */
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

export function WalletSkeleton() {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-9 rounded-md" />
          <Skeleton className="h-9 rounded-md" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export function WizardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 flex items-center gap-2">
            <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" />
            {i < 4 && <Skeleton className="h-0.5 flex-1" />}
          </div>
        ))}
      </div>
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function RecommendationsSkeleton() {
  const isMobile = useIsMobile();
  const count = isMobile ? 2 : 3;
  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-20" />
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-2.5 rounded-lg border border-border/60 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1" />
            </div>
            <Skeleton className="h-8 w-full" />
            <div className="flex justify-end gap-1">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-16" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function CampaignListSkeleton() {
  const isMobile = useIsMobile();
  return (
    <div className="space-y-2">
      {Array.from({ length: isMobile ? 2 : 4 }).map((_, i) => (
        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-border">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex gap-1 self-end sm:self-auto">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlatformTilesSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[88px] rounded-xl" />
      ))}
    </div>
  );
}

export function PerformanceChartSkeleton() {
  const isMobile = useIsMobile();
  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className={isMobile ? "aspect-[4/3] w-full" : "aspect-[16/7] w-full"} />
      </CardContent>
    </Card>
  );
}

export function BreakdownTableSkeleton() {
  const isMobile = useIsMobile();
  return (
    <div className="space-y-2">
      {Array.from({ length: isMobile ? 3 : 5 }).map((_, i) => (
        <Skeleton key={i} className={isMobile ? "h-24 w-full rounded-lg" : "h-10 w-full"} />
      ))}
    </div>
  );
}

export function AudienceBuilderSkeleton() {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-9 rounded-md" />
          <Skeleton className="h-9 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ABVariantCompareSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="aspect-video w-full rounded-lg" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function OAuthConnectSkeleton() {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-3 flex-1" />
          </div>
        ))}
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export function CampaignDetailsSkeleton() {
  const isMobile = useIsMobile();
  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: isMobile ? 3 : 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdsStatStripSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-2.5 sm:p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-2.5 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function OnboardingChecklistSkeleton() {
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-4 w-4" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  );
}

export function CampaignRowSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-7 w-7 rounded" />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function LedgerListSkeleton() {
  const isMobile = useIsMobile();
  return (
    <div className="space-y-1.5">
      {Array.from({ length: isMobile ? 4 : 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-2.5 rounded-md border border-border/40">
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
