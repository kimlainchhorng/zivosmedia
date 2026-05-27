import { Minus, Plus, Users, Crown, Plane, Star, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import seatEconomy from "@/assets/seat-economy.png";
import seatPremium from "@/assets/seat-premium.png";
import seatBusiness from "@/assets/seat-business.png";
import seatFirst from "@/assets/seat-first.png";

const cabinOptions = [
  { value: "economy", label: "Economy", icon: Plane, desc: "Standard seating", img: seatEconomy },
  { value: "premium", label: "Premium Economy", icon: Star, desc: "Extra legroom", img: seatPremium },
  { value: "business", label: "Business", icon: Crown, desc: "Lie-flat seats", img: seatBusiness },
  { value: "first", label: "First Class", icon: Gem, desc: "Ultimate luxury", img: seatFirst },
] as const;

interface MobilePassengerCabinSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passengers: number;
  cabin: string;
  onPassengersChange: (value: number) => void;
  onCabinChange: (value: "economy" | "premium" | "business" | "first") => void;
}

export default function MobilePassengerCabinSheet({
  open,
  onOpenChange,
  passengers,
  cabin,
  onPassengersChange,
  onCabinChange,
}: MobilePassengerCabinSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-0 bg-transparent border-0 shadow-none"
        style={{ paddingBottom: "var(--zivo-safe-bottom,16px)" }}
      >
        {/* 3D Floating Card */}
        <div
          className="mx-3 mb-2 rounded-[28px] overflow-hidden animate-scale-in"
          style={{
            background: "hsl(var(--card))",
            boxShadow: `
              0 -1px 0 0 hsl(var(--border) / 0.1),
              0 16px 48px -8px hsl(var(--foreground) / 0.18),
              0 32px 80px -12px hsl(var(--foreground) / 0.1),
              inset 0 1px 0 0 hsl(0 0% 100% / 0.08)
            `,
            transform: "perspective(1000px) rotateX(0.6deg)",
            transformOrigin: "bottom center",
          }}
        >
          {/* Header — frosted feel */}
          <SheetHeader className="px-6 pt-6 pb-4 text-left">
            <SheetTitle className="flex items-center gap-3 text-[17px] font-bold tracking-tight">
              <div
                className="w-11 h-11 rounded-[14px] flex items-center justify-center relative"
                style={{
                  background: "linear-gradient(150deg, hsl(160 84% 42%), hsl(160 75% 36%))",
                  boxShadow: "0 4px 16px hsl(160 84% 39% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.25), inset 0 -1px 0 hsl(160 84% 25% / 0.2)",
                }}
              >
                <Users className="h-[18px] w-[18px] text-white drop-shadow-sm" />
                {/* Shine */}
                <div
                  className="absolute inset-0 rounded-[14px] pointer-events-none"
                  style={{ background: "linear-gradient(135deg, hsl(0 0% 100% / 0.2) 0%, transparent 40%)" }}
                />
              </div>
              Travelers & Cabin
            </SheetTitle>
          </SheetHeader>

          <div className="mx-6 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

          <div className="space-y-5 px-5 py-5">
            {/* Passenger counter — deeply recessed 3D surface */}
            <div
              className="rounded-[18px] p-4"
              style={{
                background: "linear-gradient(180deg, hsl(var(--muted) / 0.5), hsl(var(--background)))",
                boxShadow: "inset 0 3px 10px hsl(var(--foreground) / 0.05), inset 0 0 0 1px hsl(var(--border) / 0.35), 0 1px 0 hsl(0 0% 100% / 0.04)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-[15px] text-foreground tracking-tight">Travelers</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Up to 9 passengers</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Minus — 3D raised button */}
                  <button
                    type="button"
                    aria-label="Decrease travelers"
                    className="h-11 w-11 rounded-[14px] flex items-center justify-center transition-all duration-150 active:scale-[0.88] active:shadow-none touch-manipulation"
                    style={passengers > 1 ? {
                      background: "linear-gradient(180deg, hsl(var(--card)), hsl(var(--card) / 0.9))",
                      boxShadow: "0 4px 10px hsl(var(--foreground) / 0.08), 0 1px 3px hsl(var(--foreground) / 0.06), inset 0 1px 0 hsl(0 0% 100% / 0.08), inset 0 -1px 0 hsl(var(--foreground) / 0.04)",
                    } : {
                      background: "hsl(var(--muted) / 0.3)",
                    }}
                    onClick={() => onPassengersChange(Math.max(1, passengers - 1))}
                    disabled={passengers <= 1}
                  >
                    <Minus className={cn("h-4 w-4", passengers <= 1 ? "text-muted-foreground/25" : "text-foreground")} />
                  </button>

                  {/* Count — glowing pill */}
                  <div
                    className="w-[52px] h-11 flex items-center justify-center text-[19px] font-extrabold rounded-[14px] tabular-nums"
                    style={{
                      background: "linear-gradient(150deg, hsl(160 84% 42%), hsl(160 75% 36%))",
                      color: "white",
                      boxShadow: "0 4px 14px hsl(160 84% 39% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.2), inset 0 -1px 0 hsl(160 84% 25% / 0.2)",
                      textShadow: "0 1px 2px hsl(160 84% 20% / 0.3)",
                    }}
                  >
                    {passengers}
                  </div>

                  {/* Plus — 3D raised button */}
                  <button
                    type="button"
                    aria-label="Increase travelers"
                    className="h-11 w-11 rounded-[14px] flex items-center justify-center transition-all duration-150 active:scale-[0.88] active:shadow-none touch-manipulation"
                    style={passengers < 9 ? {
                      background: "linear-gradient(180deg, hsl(var(--card)), hsl(var(--card) / 0.9))",
                      boxShadow: "0 4px 10px hsl(var(--foreground) / 0.08), 0 1px 3px hsl(var(--foreground) / 0.06), inset 0 1px 0 hsl(0 0% 100% / 0.08), inset 0 -1px 0 hsl(var(--foreground) / 0.04)",
                    } : {
                      background: "hsl(var(--muted) / 0.3)",
                    }}
                    onClick={() => onPassengersChange(Math.min(9, passengers + 1))}
                    disabled={passengers >= 9}
                  >
                    <Plus className={cn("h-4 w-4", passengers >= 9 ? "text-muted-foreground/25" : "text-foreground")} />
                  </button>
                </div>
              </div>
            </div>

            {/* Cabin class — 3D card grid */}
            <div>
              <p className="mb-3 text-[12px] font-bold text-muted-foreground tracking-widest uppercase">Cabin class</p>
              <div className="grid grid-cols-2 gap-3">
                {cabinOptions.map((option) => {
                  const isSelected = cabin === option.value;
                  const Icon = option.icon;
                  return (
                    <button type="button"
                      key={option.value}
                      className="relative rounded-[18px] p-4 pb-3.5 text-left transition-all duration-200 active:scale-[0.94] touch-manipulation overflow-hidden min-h-[120px] flex flex-col justify-between"
                      style={isSelected ? {
                        background: "linear-gradient(150deg, hsl(160 84% 42%), hsl(160 70% 38%))",
                        boxShadow: "0 8px 24px hsl(160 84% 39% / 0.4), 0 2px 6px hsl(160 84% 39% / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.2), inset 0 -2px 0 hsl(160 84% 25% / 0.15)",
                        transform: "translateY(-1px)",
                      } : {
                        background: "linear-gradient(180deg, hsl(var(--card)), hsl(var(--card) / 0.95))",
                        boxShadow: "0 3px 10px hsl(var(--foreground) / 0.06), 0 1px 3px hsl(var(--foreground) / 0.04), inset 0 1px 0 hsl(0 0% 100% / 0.06), inset 0 0 0 1px hsl(var(--border) / 0.4)",
                      }}
                      onClick={() => onCabinChange(option.value)}
                    >
                      {/* Seat image — positioned bottom-right */}
                      <img
	                        src={option.img}
	                        alt=""
	                        loading="lazy"
	                        decoding="async"
	                        className={cn(
                          "absolute bottom-0 right-0 w-[80px] h-[80px] object-contain pointer-events-none transition-all duration-300",
                          isSelected ? "opacity-30 scale-105" : "opacity-[0.12]"
                        )}
                        draggable={false}
                      />

                      {/* Glass shine on selected */}
                      {isSelected && (
                        <div
                          className="absolute inset-0 pointer-events-none rounded-[18px]"
                          style={{
                            background: "linear-gradient(135deg, hsl(0 0% 100% / 0.18) 0%, transparent 45%)",
                          }}
                        />
                      )}

                      {/* Top: icon */}
                      <div className="relative z-10">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center",
                            isSelected ? "bg-white/20" : "bg-muted/70"
                          )}
                          style={isSelected ? {
                            boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.15)",
                          } : undefined}
                        >
                          <Icon className={cn(
                            "h-4 w-4",
                            isSelected ? "text-white drop-shadow-sm" : "text-muted-foreground"
                          )} />
                        </div>
                      </div>

                      {/* Bottom: text */}
                      <div className="relative z-10 mt-auto">
                        <p className={cn(
                          "text-[13px] font-bold leading-tight",
                          isSelected ? "text-white" : "text-foreground"
                        )}>
                          {option.label}
                        </p>
                        <p className={cn(
                          "text-[10px] mt-0.5 leading-tight font-medium",
                          isSelected ? "text-white/60" : "text-muted-foreground/60"
                        )}>
                          {option.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Done — 3D gradient button with depth */}
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-[54px] w-full rounded-[16px] text-white font-bold text-[15px] border-0 active:scale-[0.97] active:shadow-none transition-all duration-150 tracking-wide relative overflow-hidden"
              style={{
                background: "linear-gradient(150deg, hsl(160 84% 42%), hsl(160 70% 38%))",
                boxShadow: "0 8px 24px hsl(160 84% 39% / 0.35), 0 2px 8px hsl(160 84% 39% / 0.2), inset 0 1px 0 hsl(160 84% 60% / 0.3), inset 0 -2px 0 hsl(160 84% 28% / 0.2)",
                textShadow: "0 1px 2px hsl(160 84% 20% / 0.3)",
              }}
            >
              {/* Button shine */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(135deg, hsl(0 0% 100% / 0.12) 0%, transparent 40%)" }}
              />
              <span className="relative z-10">Done</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
