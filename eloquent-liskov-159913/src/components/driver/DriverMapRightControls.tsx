/**
 * DriverMapRightControls - Recenter, layers, demand heatmap toggle
 */
import { Layers, Navigation, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  isFollowing: boolean;
  showDemandHeatmap: boolean;
  onRecenter: () => void;
  onToggleMapStyle: () => void;
  onToggleDemandHeatmap: () => void;
}

export default function DriverMapRightControls({ isFollowing, showDemandHeatmap, onRecenter, onToggleMapStyle, onToggleDemandHeatmap }: Props) {
  return (
    <div className="absolute right-3 bottom-48 z-[1500] flex flex-col gap-2">
      <Button
        variant="secondary"
        size="icon"
        onClick={onToggleDemandHeatmap}
        className={`w-12 h-12 rounded-full shadow-lg border-0 transition-all ${
          showDemandHeatmap
            ? "bg-gradient-to-br from-destructive to-warning text-primary-foreground"
            : "bg-card/90 text-foreground hover:bg-card backdrop-blur-xl"
        }`}
        aria-label={showDemandHeatmap ? "Hide demand" : "Show demand"}
      >
        <Flame className={`w-5 h-5 ${showDemandHeatmap ? "fill-current" : ""}`} />
      </Button>

      <Button
        variant="secondary"
        size="icon"
        onClick={onRecenter}
        className={`w-12 h-12 rounded-full shadow-lg border-0 transition-all ${
          isFollowing ? "bg-primary text-primary-foreground" : "bg-card/90 text-foreground hover:bg-card backdrop-blur-xl"
        }`}
        aria-label={isFollowing ? "Following" : "Recenter"}
      >
        <Navigation className={`w-5 h-5 ${isFollowing ? "fill-current" : ""}`} />
      </Button>

      <Button
        variant="secondary"
        size="icon"
        onClick={onToggleMapStyle}
        className="w-12 h-12 rounded-full bg-card/90 text-foreground shadow-lg border-0 hover:bg-card backdrop-blur-xl"
        aria-label="Map layers"
      >
        <Layers className="w-5 h-5" />
      </Button>
    </div>
  );
}
