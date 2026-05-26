/**
 * BoardingPass3D — Premium 3D boarding pass visualization
 * Multi-carrier aware with enhanced holographic depth
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Plane } from "lucide-react";
import { type DuffelOffer } from "@/hooks/useDuffelFlights";
import { AirlineLogo } from "@/components/flight/AirlineLogo";
import { cn } from "@/lib/utils";

interface BoardingPass3DProps {
  offer: DuffelOffer;
  className?: string;
}

export default function BoardingPass3D({ offer, className }: BoardingPass3DProps) {
  const depCode = offer.departure.code;
  const arrCode = offer.arrival.code;
  const depTime = offer.departure.time;
  const arrTime = offer.arrival.time;

  // Build multi-carrier label
  const carrierNames = useMemo(() => {
    if (!offer.carriers?.length) return offer.airline;
    const unique = [...new Set(offer.carriers.map(c => c.name))];
    return unique.join(" + ");
  }, [offer.carriers, offer.airline]);

  const carrierCodes = useMemo(() => {
    if (!offer.carriers?.length) return [offer.airlineCode];
    return [...new Set(offer.carriers.map(c => c.code))];
  }, [offer.carriers, offer.airlineCode]);

  // Deterministic barcode widths from offer id
  const barWidths = useMemo(() => {
    const seed = offer.id || "default";
    return Array.from({ length: 32 }).map((_, i) => {
      const charCode = seed.charCodeAt(i % seed.length) || 42;
      return { w: charCode % 2 === 0 ? 2 : 1, h: 10 + (charCode % 10) };
    });
  }, [offer.id]);

  return (
    <motion.div
      initial={{ rotateX: -12, opacity: 0, y: 8 }}
      animate={{ rotateX: 0, opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ perspective: "1000px" }}
      className={cn("relative", className)}
    >
      <div
        className="relative rounded-xl overflow-hidden shadow-lg shadow-[hsl(var(--flights))]/8"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Holographic foil — animated shimmer */}
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-40"
          style={{
            background: "linear-gradient(135deg, transparent 20%, hsl(var(--flights) / 0.15) 40%, transparent 50%, hsl(199 95% 73% / 0.1) 70%, transparent 80%)",
            backgroundSize: "200% 200%",
            animation: "foilShimmer 4s ease-in-out infinite",
          }}
        />
        {/* Fine line texture */}
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-[0.08]"
          style={{
            background: "repeating-linear-gradient(45deg, transparent, transparent 2px, currentColor 2px, currentColor 3px)",
          }}
        />

        {/* Top band — multi-carrier */}
        <div className="bg-gradient-to-r from-[hsl(var(--flights))] via-[hsl(199_89%_48%)] to-[hsl(var(--flights))] px-3 py-2 flex items-center justify-between relative overflow-hidden">
          {/* Subtle light streak */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
          
          <div className="flex items-center gap-2 relative z-10">
            <div className="flex -space-x-1.5">
              {carrierCodes.slice(0, 3).map((code, i) => (
                <AirlineLogo
                  key={code}
                  iataCode={code}
                  airlineName=""
                  size={18}
                  className={cn(
                    "border border-primary-foreground/30 bg-primary-foreground/90 shadow-sm",
                    i > 0 && "relative"
                  )}
                />
              ))}
            </div>
            <span className="text-[9px] font-bold text-primary-foreground tracking-wider uppercase truncate max-w-[160px]">
              {carrierNames}
            </span>
          </div>
          <span className="text-[8px] font-mono text-primary-foreground/70 relative z-10 shrink-0">
            {offer.flightNumber}
          </span>
        </div>

        {/* Main pass body */}
        <div className="bg-card px-3 py-3 relative">
          {/* Route display */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-center min-w-[48px]">
              <p className="text-xl font-extrabold tracking-tight leading-none">{depCode}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">{depTime}</p>
            </div>

            <div className="flex-1 flex items-center justify-center px-2 relative h-6">
              <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-border/60 via-[hsl(var(--flights))]/30 to-border/60" />
              {/* Animated plane */}
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                className="relative z-10 bg-card px-0.5"
              >
                <Plane className="w-3.5 h-3.5 text-[hsl(var(--flights))]" />
              </motion.div>
            </div>

            <div className="text-center min-w-[48px]">
              <p className="text-xl font-extrabold tracking-tight leading-none">{arrCode}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">{arrTime}</p>
            </div>
          </div>

          {/* Info grid — 3 columns with subtle separators */}
          <div className="grid grid-cols-3 text-center relative">
            <div className="py-1">
              <p className="text-[7px] text-muted-foreground uppercase tracking-[0.15em]">Duration</p>
              <p className="text-[11px] font-bold mt-0.5">{offer.duration}</p>
            </div>
            <div className="py-1 border-x border-border/20">
              <p className="text-[7px] text-muted-foreground uppercase tracking-[0.15em]">Class</p>
              <p className="text-[11px] font-bold capitalize mt-0.5">{offer.cabinClass.replace("_", " ")}</p>
            </div>
            <div className="py-1">
              <p className="text-[7px] text-muted-foreground uppercase tracking-[0.15em]">Stops</p>
              <p className="text-[11px] font-bold mt-0.5">{offer.stops === 0 ? "Direct" : `${offer.stops}`}</p>
            </div>
          </div>
        </div>

        {/* Perforated tear line */}
        <div className="relative h-5 bg-card">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-muted/50" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-muted/50" />
          <div className="absolute inset-x-5 top-1/2 border-t border-dashed border-border/40" />
        </div>

        {/* Bottom — barcode strip */}
        <div className="bg-card px-3 pb-2 pt-0 flex items-end justify-between">
          <div className="flex-1 flex gap-[1px] items-end">
            {barWidths.map((b, i) => (
              <div
                key={i}
                className="bg-foreground/60 rounded-[0.5px]"
                style={{ width: `${b.w}px`, height: `${b.h}px` }}
              />
            ))}
          </div>
          <p className="text-[7px] text-muted-foreground font-mono ml-2 pb-0.5">
            ZIVO-{offer.id?.slice(-6).toUpperCase() || "XXXX"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
