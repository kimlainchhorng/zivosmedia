/**
 * FitnessActivityCard — share a workout/run/walk into chat.
 */
import { motion } from "framer-motion";
import Activity from "lucide-react/dist/esm/icons/activity";
import Footprints from "lucide-react/dist/esm/icons/footprints";
import Flame from "lucide-react/dist/esm/icons/flame";

interface Props {
  activityType: string;
  durationSeconds?: number;
  distanceMeters?: number;
  steps?: number;
  calories?: number;
  recordedAt?: string;
}

export default function FitnessActivityCard({ activityType, durationSeconds, distanceMeters, steps, calories }: Props) {
  const minutes = durationSeconds ? Math.round(durationSeconds / 60) : null;
  const km = distanceMeters ? (distanceMeters / 1000).toFixed(2) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500/15 via-teal-500/15 to-sky-500/15 border border-border/40 p-4 max-w-[280px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-9 w-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center"><Activity className="w-4 h-4" /></div>
        <p className="text-base font-bold capitalize">{activityType}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {minutes != null && (<div><p className="text-xs text-muted-foreground">Min</p><p className="text-xl font-bold tabular-nums">{minutes}</p></div>)}
        {km && (<div><p className="text-xs text-muted-foreground">Km</p><p className="text-xl font-bold tabular-nums">{km}</p></div>)}
        {steps != null && (<div><p className="text-xs text-muted-foreground inline-flex items-center gap-0.5"><Footprints className="w-3 h-3" /></p><p className="text-xl font-bold tabular-nums">{steps.toLocaleString()}</p></div>)}
        {calories != null && (<div><p className="text-xs text-muted-foreground inline-flex items-center gap-0.5"><Flame className="w-3 h-3" /></p><p className="text-xl font-bold tabular-nums">{calories}</p></div>)}
      </div>
    </motion.div>
  );
}
