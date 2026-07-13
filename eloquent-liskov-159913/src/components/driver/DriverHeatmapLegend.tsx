/**
 * DriverHeatmapLegend - Color legend for demand heatmap
 */
import { motion } from "framer-motion";

export default function DriverHeatmapLegend({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-28 left-3 z-[1100]"
    >
      <div className="bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border shadow-md">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Demand Level</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-[10px] text-foreground font-medium">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-[10px] text-foreground font-medium">Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-[10px] text-foreground font-medium">Low</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
