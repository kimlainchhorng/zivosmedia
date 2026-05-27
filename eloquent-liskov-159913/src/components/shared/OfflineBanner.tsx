/**
 * OfflineBanner
 * Shown below header when the user loses connectivity.
 */
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  isOffline: boolean;
  className?: string;
}

export default function OfflineBanner({ isOffline, className }: OfflineBannerProps) {
  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
           className={cn(
            "overflow-hidden border-b",
            "bg-amber-50 dark:bg-amber-950/30",
            "border-amber-200 dark:border-amber-800",
            className
          )}
        >
          <div className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm safe-area-top">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-700 dark:text-amber-300 font-medium">
              You are offline. Some features may be limited.
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
