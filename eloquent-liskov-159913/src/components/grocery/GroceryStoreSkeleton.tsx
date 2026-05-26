/**
 * GroceryStoreSkeleton — Premium skeleton loading states
 * Shimmer effect, staggered reveals, realistic layouts
 */
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const shimmerClass = "relative overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:animate-[shimmer_2s_infinite]";

export function GroceryHeroSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-4 mt-4 p-5 rounded-[24px] border border-border/20 bg-card/50"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32 rounded-xl" />
          <Skeleton className="h-3 w-48 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border/15"
          >
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-2 w-12" />
          </motion.div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <Skeleton className="h-7 w-32 rounded-lg" />
        <Skeleton className="h-7 w-28 rounded-lg" />
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
    </motion.div>
  );
}

export function GroceryGridSkeleton() {
  return (
    <div className="px-4 grid grid-cols-2 gap-2.5 mt-2">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 26 }}
          className="rounded-[20px] border border-border/20 bg-card/60 overflow-hidden"
        >
          <div className="aspect-[4/3.5] bg-muted/15 animate-pulse" />
          <div className="p-2.5 space-y-2">
            <Skeleton className="h-2 w-12 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-5 w-14 rounded" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function GroceryListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="px-4 space-y-2">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3.5 p-3.5 rounded-[18px] border border-border/20"
        >
          <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
        </motion.div>
      ))}
    </div>
  );
}

export function GroceryCarouselSkeleton() {
  return (
    <div className="pt-3 pb-1">
      <div className="flex items-center gap-2 mb-3 px-4">
        <Skeleton className="h-7 w-7 rounded-xl" />
        <Skeleton className="h-3.5 w-28" />
      </div>
      <div className="flex gap-2.5 px-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="shrink-0 w-[145px] rounded-2xl border border-border/20 overflow-hidden"
          >
            <div className="h-[105px] bg-muted/15 animate-pulse" />
            <div className="p-2.5 space-y-1.5">
              <Skeleton className="h-2.5 w-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
