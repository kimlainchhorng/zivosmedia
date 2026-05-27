/**
 * Content-aware skeleton loaders for lazy-loaded homepage sections
 * Replaces generic spinners with layout-matching placeholders
 */
import { cn } from "@/lib/utils";

const Bone = ({ className }: { className?: string }) => (
  <div className={cn("rounded-lg bg-muted/60 animate-pulse", className)} />
);

/** Cards grid — used for destinations, cars, hotels, eats */
export function CardGridSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <section className="section-padding">
      <div className="container mx-auto px-4">
        <Bone className="h-7 w-48 mb-2" />
        <Bone className="h-4 w-72 mb-8" />
        <div className={cn(
          "grid gap-4",
          columns === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        )}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/30 overflow-hidden">
              <Bone className="h-40 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Bone className="h-5 w-3/4" />
                <Bone className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Route cards — for popular routes */
export function RoutesSkeleton() {
  return (
    <section className="section-padding">
      <div className="container mx-auto px-4">
        <Bone className="h-7 w-56 mb-2" />
        <Bone className="h-4 w-80 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border/30">
              <Bone className="w-12 h-12 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/2" />
              </div>
              <Bone className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Steps / How It Works */
export function StepsSkeleton() {
  return (
    <section className="section-padding">
      <div className="container mx-auto px-4 text-center">
        <Bone className="h-7 w-48 mx-auto mb-2" />
        <Bone className="h-4 w-64 mx-auto mb-10" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-4">
              <Bone className="w-16 h-16 rounded-full" />
              <Bone className="h-5 w-32" />
              <Bone className="h-3 w-48" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Testimonials row */
export function TestimonialsSkeleton() {
  return (
    <section className="section-padding">
      <div className="container mx-auto px-4">
        <Bone className="h-7 w-56 mx-auto mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 rounded-xl border border-border/30 space-y-4">
              <div className="flex items-center gap-3">
                <Bone className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5">
                  <Bone className="h-4 w-24" />
                  <Bone className="h-3 w-16" />
                </div>
              </div>
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Banner — full-width promo */
export function BannerSkeleton() {
  return (
    <section className="section-padding">
      <div className="container mx-auto px-4">
        <Bone className="h-48 w-full rounded-2xl" />
      </div>
    </section>
  );
}

/** Partner logos row */
export function LogosSkeleton() {
  return (
    <section className="py-8">
      <div className="container mx-auto px-4 flex items-center justify-center gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bone key={i} className="w-24 h-8 rounded" />
        ))}
      </div>
    </section>
  );
}
