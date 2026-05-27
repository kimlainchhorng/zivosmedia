/**
 * NewPostsPill — floating "N new posts" badge that animates in when realtime
 * delivers new feed content while the user is scrolled mid-feed.
 */
import { motion, AnimatePresence } from "framer-motion";
import ArrowUp from "lucide-react/dist/esm/icons/arrow-up";
import { useHaptic } from "@/hooks/useHaptic";

interface Props {
  count: number;
  onClick: () => void;
}

export default function NewPostsPill({ count, onClick }: Props) {
  const haptic = useHaptic();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          type="button"
          onClick={() => { haptic("light"); onClick(); }}
          initial={{ y: -40, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -40, opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", damping: 18, stiffness: 360 }}
          className="absolute left-1/2 z-50 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 sm:px-5 py-2.5 sm:py-2 text-sm sm:text-[13px] md:text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-600 active:scale-95 transition-all min-h-[44px] sm:min-h-0"
          style={{ top: "calc(var(--zivo-safe-top,0px) + 80px)" }}
          aria-label={`Show ${count} new posts`}
        >
          <ArrowUp className="h-4 w-4" />
          {count} new {count === 1 ? "post" : "posts"}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
