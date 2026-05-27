/**
 * DriverWaitingBanner - Glass banner showing waiting status and demand level
 */
import { Radio, MapPinOff } from "lucide-react";

interface DriverWaitingBannerProps {
  isOnline: boolean;
  demandLevel: "high" | "medium" | "low";
  nearbyCount: number;
}

const glassStyle = {
  background: "hsl(var(--card) / 0.88)",
  backdropFilter: "saturate(180%) blur(20px)",
  WebkitBackdropFilter: "saturate(180%) blur(20px)",
  border: "0.5px solid hsl(var(--border) / 0.3)",
  boxShadow: "0 4px 24px -6px hsl(var(--foreground) / 0.12), inset 0 0.5px 0 0 hsl(var(--foreground) / 0.06)",
};

export default function DriverWaitingBanner({ isOnline, demandLevel, nearbyCount }: DriverWaitingBannerProps) {
  if (!isOnline) return null;

  const getDemandText = () => {
    switch (demandLevel) {
      case "high": return "You're in a high-demand area.";
      case "medium": return "You're in a medium-demand area.";
      case "low": return "You're in a low-demand area.";
    }
  };

  if (nearbyCount === 0) {
    return (
      <div className="pointer-events-none absolute left-0 right-0 top-20 z-20 mx-auto w-[92%] max-w-md rounded-2xl px-4 py-3 text-sm" style={glassStyle}>
        <div className="flex items-center gap-2">
          <MapPinOff className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground">No requests nearby</span>
        </div>
        <div className="text-muted-foreground mt-1">Try moving to a higher-demand area to receive requests.</div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-20 z-20 mx-auto w-[92%] max-w-md rounded-2xl px-4 py-3 text-sm" style={glassStyle}>
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-primary" />
        <span className="font-medium text-foreground">Waiting for requests…</span>
      </div>
      <div className="text-muted-foreground mt-1">{getDemandText()}</div>
      {demandLevel === "low" && (
        <div className="mt-1 text-muted-foreground text-xs">Moving toward commercial areas may increase requests.</div>
      )}
    </div>
  );
}
