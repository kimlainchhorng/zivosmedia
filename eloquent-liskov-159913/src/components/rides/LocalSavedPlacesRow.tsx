/**
 * LocalSavedPlacesRow — Home / Work / custom saved places strip used on
 * the rides hub. Tap to drop the address into the booking funnel.
 *
 * Pulls from useLocalSavedPlaces (the after-ride save flow's source). Hidden
 * when the user has nothing saved yet.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Home from "lucide-react/dist/esm/icons/home";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import Star from "lucide-react/dist/esm/icons/star";
import type { LucideIcon } from "lucide-react";
import { useLocalSavedPlaces, type SavedPlaceKind } from "@/hooks/useLocalSavedPlaces";

const ICON: Record<SavedPlaceKind, LucideIcon> = {
  home: Home,
  work: Briefcase,
  custom: Star,
};
const TONE: Record<SavedPlaceKind, string> = {
  home: "bg-primary/10 text-primary border-primary/20",
  work: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  custom: "bg-violet-500/10 text-violet-700 border-violet-500/20",
};

export default function LocalSavedPlacesRow() {
  const navigate = useNavigate();
  const { places } = useLocalSavedPlaces();
  if (!places.length) return null;

  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {places.slice(0, 8).map((p, i) => {
        const Icon = ICON[p.kind];
        return (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() =>
              navigate(`/rides/hub?destination=${encodeURIComponent(p.address)}`)
            }
            className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 active:scale-[0.97] transition-transform touch-manipulation ${TONE[p.kind]}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[12px] font-bold leading-none">{p.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
