import WifiOff from "lucide-react/dist/esm/icons/wifi-off";
import Wifi from "lucide-react/dist/esm/icons/wifi";
import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { AnimatePresence, motion } from "framer-motion";

/**
 * OfflineBanner — slim glass capsule that floats below the safe-area top.
 * Stays visible only while offline; on reconnect it briefly flashes a
 * "Back online" green pill before hiding, so the user gets confirmation
 * instead of the bar silently disappearing.
 */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  const [showRecovery, setShowRecovery] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      setShowRecovery(false);
      return;
    }
    if (wasOffline) {
      setShowRecovery(true);
      const id = setTimeout(() => {
        setShowRecovery(false);
        setWasOffline(false);
      }, 1800);
      return () => clearTimeout(id);
    }
  }, [online, wasOffline]);

  return (
    <AnimatePresence>
      {(!online || showRecovery) && (
        <motion.div
          key={online ? "online" : "offline"}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed top-[max(0.5rem,var(--zivo-safe-top,0px))] inset-x-0 z-[100] mx-auto flex w-fit max-w-[92vw] items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold backdrop-blur-xl bg-zinc-950/80 ring-1 ring-white/10 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)]"
        >
          {online ? (
            <>
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
              </span>
              <Wifi className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-emerald-100">Back online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-amber-100">
                You're offline · messages will retry when you reconnect
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
