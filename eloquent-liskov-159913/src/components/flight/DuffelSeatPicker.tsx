/**
 * DuffelSeatPicker — Premium 3D Spatial seat map powered by Duffel API
 * Immersive cabin layout with depth, glassmorphism, and spatial interaction
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Armchair, Check, X, Loader2, Sparkles, PlaneTakeoff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDuffelSeatMaps, type SeatElement, type SeatMap } from "@/hooks/useDuffelSeatMaps";

interface SelectedSeat {
  designator: string;
  serviceId: string;
  passengerId: string;
  price: number;
  currency: string;
}

interface DuffelSeatPickerProps {
  offerId: string | null;
  passengerIds: string[];
  className?: string;
  onSeatsSelected?: (seats: SelectedSeat[]) => void;
}

export default function DuffelSeatPicker({
  offerId,
  passengerIds,
  className,
  onSeatsSelected,
}: DuffelSeatPickerProps) {
  const { data, isLoading, error } = useDuffelSeatMaps(offerId);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);
  const [activePassengerIdx, setActivePassengerIdx] = useState(0);
  const [selectedSeats, setSelectedSeats] = useState<Map<string, SelectedSeat>>(new Map());

  const seatMaps = data?.seat_maps || [];
  const available = data?.available ?? false;
  const activeSeatMap = seatMaps[activeSegmentIdx];

  const seatInfo = useMemo(() => {
    if (!activeSeatMap) return { rows: [], minPrice: 0, maxPrice: 0 };
    const passengerId = passengerIds[activePassengerIdx];
    const allSeats: { designator: string; price: number; currency: string; serviceId: string }[] = [];

    for (const cabin of activeSeatMap.cabins) {
      for (const row of cabin.rows) {
        for (const section of row.sections) {
          for (const el of section.elements) {
            if (el.type === "seat" && el.is_available) {
              const svc = el.available_services.find(s => s.passenger_id === passengerId);
              if (svc) {
                allSeats.push({
                  designator: el.designator!,
                  price: svc.price,
                  currency: svc.currency,
                  serviceId: svc.id,
                });
              }
            }
          }
        }
      }
    }

    const prices = allSeats.map(s => s.price);
    return {
      rows: allSeats,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
    };
  }, [activeSeatMap, passengerIds, activePassengerIdx]);

  const handleSeatClick = (element: SeatElement) => {
    if (!element.is_available || !element.designator) return;
    const passengerId = passengerIds[activePassengerIdx];
    const svc = element.available_services.find(s => s.passenger_id === passengerId);

    const key = `${activeSegmentIdx}-${passengerId}`;
    const newMap = new Map(selectedSeats);
    const existing = newMap.get(key);

    if (existing?.designator === element.designator) {
      newMap.delete(key);
    } else {
      newMap.set(key, {
        designator: element.designator,
        serviceId: svc?.id || "",
        passengerId: svc?.passenger_id || passengerId,
        price: svc?.price || 0,
        currency: svc?.currency || "USD",
      });
    }

    setSelectedSeats(newMap);
    onSeatsSelected?.(Array.from(newMap.values()));

    if (!existing && activePassengerIdx < passengerIds.length - 1) {
      setTimeout(() => setActivePassengerIdx(prev => prev + 1), 300);
    }
  };

  const getSelectedForSegmentPassenger = () => {
    const key = `${activeSegmentIdx}-${passengerIds[activePassengerIdx]}`;
    return selectedSeats.get(key);
  };

  const totalSeatCost = useMemo(() => {
    return Array.from(selectedSeats.values()).reduce((sum, s) => sum + s.price, 0);
  }, [selectedSeats]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("rounded-3xl border border-[hsl(var(--flights))]/15 bg-gradient-to-b from-card to-card/80 p-8 shadow-[0_8px_32px_-8px_hsl(var(--flights)/0.1)]", className)}>
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--flights))]/10 flex items-center justify-center backdrop-blur-sm">
              <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--flights))]" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-[hsl(var(--flights))]/5 animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Loading cabin layout...</p>
        </div>
      </div>
    );
  }

  // Not available
  if (error || !available || seatMaps.length === 0) {
    return (
      <div className={cn("rounded-3xl border border-border/20 bg-card/60 backdrop-blur-xl p-6 shadow-sm", className)}>
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-muted/30 flex items-center justify-center">
            <Armchair className="w-5 h-5 text-muted-foreground/60" />
          </div>
          <div>
            <p className="text-sm font-bold">Seat Selection</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Not available for this flight. Choose your seat after booking through the airline.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentSel = getSelectedForSegmentPassenger();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "rounded-3xl overflow-hidden",
        "bg-gradient-to-b from-card via-card to-card/95",
        "border border-[hsl(var(--flights))]/15",
        "shadow-[0_8px_40px_-12px_hsl(var(--flights)/0.12),0_2px_8px_-2px_rgba(0,0,0,0.06)]",
        className
      )}
      style={{ perspective: "1200px" }}
    >
      {/* === 3D Header with depth layers === */}
      <div className="relative overflow-hidden">
        {/* Background gradient with depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--flights))]/8 via-[hsl(var(--flights))]/4 to-transparent" />
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[hsl(var(--flights))]/5 blur-3xl -translate-y-1/2 translate-x-1/4" />
        
        <div className="relative px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--flights))]/10 border border-[hsl(var(--flights))]/20 flex items-center justify-center backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                  <Armchair className="w-5 h-5 text-[hsl(var(--flights))]" />
                </div>
                {totalSeatCost > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[hsl(var(--flights))] flex items-center justify-center"
                  >
                    <Check className="w-2 h-2 text-white" />
                  </motion.div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Choose Your Seat</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Interactive cabin layout</p>
              </div>
            </div>
            
            {totalSeatCost > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Badge className="bg-[hsl(var(--flights))]/10 text-[hsl(var(--flights))] border border-[hsl(var(--flights))]/20 text-xs font-bold px-3 py-1 rounded-xl shadow-sm">
                  +${totalSeatCost.toFixed(2)}
                </Badge>
              </motion.div>
            )}
          </div>

          {/* Segment tabs */}
          {seatMaps.length > 1 && (
            <div className="flex gap-2 mt-3.5">
              {seatMaps.map((_, idx) => {
                const isActive = idx === activeSegmentIdx;
                return (
                  <motion.button
                    key={idx}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveSegmentIdx(idx)}
                    className={cn(
                      "relative text-[11px] font-semibold px-4 py-1.5 rounded-xl transition-all",
                      isActive
                        ? "bg-[hsl(var(--flights))] text-white shadow-[0_4px_12px_-2px_hsl(var(--flights)/0.4)]"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-border/30"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <PlaneTakeoff className="w-3 h-3" />
                      Flight {idx + 1}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Passenger selector */}
          {passengerIds.length > 1 && (
            <div className="flex gap-2 mt-3">
              {passengerIds.map((_, idx) => {
                const key = `${activeSegmentIdx}-${passengerIds[idx]}`;
                const hasSeat = selectedSeats.has(key);
                const isActive = idx === activePassengerIdx;
                return (
                  <motion.button
                    key={idx}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActivePassengerIdx(idx)}
                    className={cn(
                      "text-[11px] font-semibold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5",
                      isActive
                        ? "bg-[hsl(var(--flights))]/12 text-[hsl(var(--flights))] border border-[hsl(var(--flights))]/25 shadow-sm"
                        : "bg-muted/20 text-muted-foreground border border-transparent hover:bg-muted/40",
                      hasSeat && !isActive && "ring-1 ring-emerald-400/40"
                    )}
                  >
                    {hasSeat && <Check className="w-3 h-3 text-emerald-500" />}
                    Passenger {idx + 1}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom border glow */}
        <div className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--flights))]/20 to-transparent" />
      </div>

      {/* === 3D Cabin Seat Map === */}
      <div className="px-4 py-5 overflow-x-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeSegmentIdx}-${activePassengerIdx}`}
            initial={{ opacity: 0, rotateX: -2 }}
            animate={{ opacity: 1, rotateX: 0 }}
            exit={{ opacity: 0, rotateX: 2 }}
            transition={{ duration: 0.3 }}
          >
            {activeSeatMap?.cabins.map((cabin, cabinIdx) => (
              <div key={cabinIdx} className="mb-5 last:mb-0">
                {/* Cabin class label */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/40" />
                  <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] px-3 py-1 rounded-full bg-muted/20 border border-border/20">
                    {cabin.cabin_class.replace("_", " ")}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/40" />
                </div>

                {/* Fuselage container */}
                <div className="relative">
                  {/* Fuselage side walls */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-border/20 via-border/10 to-border/20" />
                  <div className="absolute right-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-border/20 via-border/10 to-border/20" />

                  {/* Nose of plane */}
                  <div className="flex justify-center mb-3">
                    <div className="w-20 h-5 rounded-t-[2rem] bg-gradient-to-b from-muted/30 to-muted/10 border border-border/20 border-b-0 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest">Front</span>
                    </div>
                  </div>

                  {/* Column labels */}
                  {cabin.rows[0] && (
                    <div className="flex justify-center gap-0 mb-2 sticky top-0 safe-area-top z-10">
                      <span className="w-5 mr-1" />
                      {cabin.rows[0].sections.map((section, sIdx) => (
                        <div key={sIdx} className="flex gap-[4px]">
                          {sIdx > 0 && <div className="w-6" />}
                          {section.elements.map((el, eIdx) => (
                            <div key={eIdx} className="w-9 text-center">
                              <span className="text-[9px] font-bold text-[hsl(var(--flights))]/40">
                                {el.designator?.replace(/\d/g, "") || ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Seat rows */}
                  <div className="space-y-[4px]">
                    {cabin.rows.map((row, rowIdx) => {
                      const rowNum = row.sections[0]?.elements[0]?.designator?.replace(/\D/g, "") || String(rowIdx + 1);
                      const isWingRow = cabin.wings
                        ? (rowIdx >= cabin.wings.first_row_index && rowIdx <= cabin.wings.last_row_index)
                        : false;

                      // Check if this row has any non-empty, non-seat elements (like exit indicators)
                      const hasExitRow = row.sections.some(s => s.elements.some(e => e.type === "exit_row"));

                      return (
                        <motion.div
                          key={rowIdx}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: rowIdx * 0.015, duration: 0.2 }}
                          className={cn(
                            "flex items-center justify-center gap-0 py-[1px] rounded-lg transition-colors",
                            isWingRow && "bg-[hsl(var(--flights))]/[0.02]",
                            hasExitRow && "py-1.5"
                          )}
                        >
                          {/* Row number */}
                          <span className={cn(
                            "text-[9px] w-5 text-right mr-1 tabular-nums shrink-0 font-semibold",
                            isWingRow ? "text-[hsl(var(--flights))]/30" : "text-muted-foreground/40"
                          )}>
                            {rowNum}
                          </span>

                          {row.sections.map((section, sIdx) => (
                            <div key={sIdx} className="flex gap-[4px]">
                              {/* Aisle gap */}
                              {sIdx > 0 && (
                                <div className="w-6 flex items-center justify-center">
                                  {isWingRow && (
                                    <div className="w-[1.5px] h-5 rounded-full bg-[hsl(var(--flights))]/10" />
                                  )}
                                </div>
                              )}
                              {section.elements.map((el, eIdx) => {
                                const passId = passengerIds[activePassengerIdx];
                                const svc = el.available_services.find(s => s.passenger_id === passId);
                                const isSelected = currentSel?.designator === el.designator;
                                const isOtherPassengerSeat = Array.from(selectedSeats.values()).some(
                                  s => s.designator === el.designator && s.passengerId !== passId
                                );

                                if (el.type === "empty") {
                                  return <div key={eIdx} className="w-9 h-9" />;
                                }

                                if (el.type !== "seat") {
                                  return (
                                    <div key={eIdx} className="w-9 h-9 flex items-center justify-center">
                                      {el.type === "lavatory" && <span className="text-[9px] opacity-40">🚻</span>}
                                      {el.type === "galley" && <span className="text-[9px] opacity-40">🍽</span>}
                                      {el.type === "exit_row" && (
                                        <div className="w-7 h-0.5 rounded-full bg-amber-400/40" />
                                      )}
                                    </div>
                                  );
                                }

                                const isFree = !svc || svc.price === 0;
                                const isAvail = el.is_available && !isOtherPassengerSeat;

                                return (
                                  <motion.button
                                    key={eIdx}
                                    whileTap={isAvail ? { scale: 0.88, rotateZ: -2 } : undefined}
                                    whileHover={isAvail ? { scale: 1.08, y: -1 } : undefined}
                                    onClick={() => isAvail && handleSeatClick(el)}
                                    disabled={!isAvail}
                                    className={cn(
                                      "w-9 h-9 rounded-lg text-[8px] font-bold transition-all flex items-center justify-center relative",
                                      // Selected: glowing 3D button
                                      isSelected && [
                                        "bg-[hsl(var(--flights))] text-white",
                                        "shadow-[0_4px_14px_-3px_hsl(var(--flights)/0.5),inset_0_1px_0_rgba(255,255,255,0.2)]",
                                        "ring-2 ring-[hsl(var(--flights))]/25 ring-offset-1 ring-offset-background",
                                        "border border-[hsl(var(--flights))]",
                                      ],
                                      // Other passenger
                                      !isSelected && isOtherPassengerSeat && [
                                        "bg-emerald-500/15 text-emerald-600",
                                        "border border-emerald-400/30",
                                        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                                      ],
                                      // Available with price
                                      !isSelected && !isOtherPassengerSeat && isAvail && !isFree && [
                                        "bg-card border border-border/50",
                                        "text-foreground/80",
                                        "hover:border-[hsl(var(--flights))]/40 hover:bg-[hsl(var(--flights))]/5",
                                        "hover:shadow-[0_2px_8px_-2px_hsl(var(--flights)/0.15)]",
                                        "shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.6)]",
                                      ],
                                      // Available free — green tinted
                                      !isSelected && !isOtherPassengerSeat && isAvail && isFree && [
                                        "bg-emerald-500/10 border border-emerald-400/30",
                                        "text-emerald-600 dark:text-emerald-400",
                                        "hover:bg-emerald-500/20 hover:border-emerald-400/50",
                                        "hover:shadow-[0_2px_8px_-2px_rgba(16,185,129,0.2)]",
                                        "shadow-[0_1px_3px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.4)]",
                                      ],
                                      // Unavailable
                                      !isSelected && !isOtherPassengerSeat && !isAvail && [
                                        "bg-muted/10 text-muted-foreground/20 cursor-not-allowed",
                                      ],
                                    )}
                                    title={
                                      el.designator
                                        ? `${el.designator}${svc ? ` - $${svc.price}` : " - Unavailable"}`
                                        : ""
                                    }
                                  >
                                    {/* Selection shine effect */}
                                    {isSelected && (
                                      <motion.div
                                        className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                                      </motion.div>
                                    )}

                                    {isSelected ? (
                                      <motion.div
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                      >
                                        <Check className="w-4 h-4" />
                                      </motion.div>
                                    ) : isOtherPassengerSeat ? (
                                      <span className="text-[8px] font-bold">
                                        P{Array.from(selectedSeats.entries()).findIndex(([, v]) => v.designator === el.designator) + 1}
                                      </span>
                                    ) : !isAvail ? (
                                      <X className="w-3 h-3" />
                                    ) : (
                                      <span className="tabular-nums leading-none">
                                        {isFree ? (
                                          <span className="text-[8px]">Free</span>
                                        ) : (
                                          <span className="text-[7.5px]">${svc?.price ?? 0}</span>
                                        )}
                                      </span>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          ))}

                          {/* Wing indicator */}
                          {isWingRow && (
                            <span className="text-[8px] text-[hsl(var(--flights))]/20 ml-1.5 font-mono">▸</span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Tail of plane */}
                  <div className="flex justify-center mt-3">
                    <div className="w-14 h-4 rounded-b-[1.5rem] bg-gradient-to-t from-muted/20 to-muted/10 border border-border/20 border-t-0" />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* === 3D Legend & Summary Footer === */}
      <div className="relative">
        <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
        
        <div className="px-5 py-4 bg-gradient-to-b from-muted/5 to-muted/15 space-y-3">
          {/* Legend - 3D pill style */}
          <div className="flex flex-wrap gap-2.5 text-[10px]">
            <span className="flex items-center gap-1.5 bg-card/80 px-2.5 py-1 rounded-lg border border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="w-4 h-4 rounded bg-emerald-500/10 border border-emerald-400/30" />
              <span className="text-muted-foreground font-medium">Free</span>
            </span>
            <span className="flex items-center gap-1.5 bg-card/80 px-2.5 py-1 rounded-lg border border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="w-4 h-4 rounded bg-card border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.6)]" />
              <span className="text-muted-foreground font-medium">Paid</span>
            </span>
            <span className="flex items-center gap-1.5 bg-card/80 px-2.5 py-1 rounded-lg border border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="w-4 h-4 rounded-[5px] bg-[hsl(var(--flights))] shadow-[0_2px_6px_-1px_hsl(var(--flights)/0.4)]" />
              <span className="text-muted-foreground font-medium">Selected</span>
            </span>
            <span className="flex items-center gap-1.5 bg-card/80 px-2.5 py-1 rounded-lg border border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="w-4 h-4 rounded bg-muted/20 flex items-center justify-center">
                <X className="w-2.5 h-2.5 text-muted-foreground/30" />
              </div>
              <span className="text-muted-foreground font-medium">Taken</span>
            </span>
          </div>

          {/* Selected seats summary */}
          <AnimatePresence>
            {selectedSeats.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl bg-card/80 border border-[hsl(var(--flights))]/10 p-3 space-y-1.5 shadow-[0_2px_8px_-3px_hsl(var(--flights)/0.08)]">
                  {Array.from(selectedSeats.entries()).map(([key, seat]) => {
                    const [segIdx] = key.split("-");
                    return (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-[hsl(var(--flights))]/10 flex items-center justify-center">
                            <Armchair className="w-3 h-3 text-[hsl(var(--flights))]" />
                          </div>
                          <span className="text-muted-foreground font-medium">
                            {seatMaps.length > 1 ? `Flight ${Number(segIdx) + 1} · ` : ""}
                            Seat <span className="text-foreground font-bold">{seat.designator}</span>
                          </span>
                        </div>
                        <span className="font-bold tabular-nums text-[hsl(var(--flights))]">
                          {seat.price === 0 ? "Free" : `+$${seat.price.toFixed(2)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[9px] text-muted-foreground/50 text-center">
            Seat selection is optional. Seats will be assigned at check-in if not selected.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
