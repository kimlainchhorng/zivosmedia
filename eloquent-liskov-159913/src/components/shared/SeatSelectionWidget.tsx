import { useState, useMemo } from "react";
import { Armchair, Check, X, Info, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SeatStatus = "available" | "selected" | "occupied" | "premium" | "exit";

interface Seat {
  id: string;
  row: number;
  position: string;
  status: SeatStatus;
  price: number;
}

interface SeatSelectionWidgetProps {
  className?: string;
  rows?: number;
  premiumRows?: number;
  exitRow?: number;
  standardPrice?: number;
  premiumPrice?: number;
  exitPrice?: number;
  occupancyRate?: number;
  currency?: string;
  preSelectedSeat?: string;
  onSeatSelect?: (seat: Seat | null) => void;
  onConfirm?: (seat: Seat) => void;
}

const SeatSelectionWidget = ({ 
  className,
  rows = 6,
  premiumRows = 2,
  exitRow = 3,
  standardPrice = 0,
  premiumPrice = 45,
  exitPrice = 35,
  occupancyRate = 0.3,
  currency = "$",
  preSelectedSeat,
  onSeatSelect,
  onConfirm
}: SeatSelectionWidgetProps) => {
  const seats = useMemo(() => {
    const generatedSeats: Seat[] = [];
    const positions = ["A", "B", "C", "D", "E", "F"];
    
    for (let row = 1; row <= rows; row++) {
      positions.forEach((pos) => {
        const isExit = row === exitRow;
        const isPremium = row <= premiumRows;
        // Use deterministic "random" based on seat position
        const seedValue = (row * 7 + pos.charCodeAt(0)) % 100;
        const isOccupied = seedValue < occupancyRate * 100;
        
        generatedSeats.push({
          id: `${row}${pos}`,
          row,
          position: pos,
          status: isOccupied ? "occupied" : isExit ? "exit" : isPremium ? "premium" : "available",
          price: isPremium ? premiumPrice : isExit ? exitPrice : standardPrice,
        });
      });
    }
    return generatedSeats;
  }, [rows, premiumRows, exitRow, standardPrice, premiumPrice, exitPrice, occupancyRate]);

  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(
    preSelectedSeat ? seats.find(s => s.id === preSelectedSeat) || null : null
  );

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === "occupied") return;
    const newSelection = seat.id === selectedSeat?.id ? null : seat;
    setSelectedSeat(newSelection);
    onSeatSelect?.(newSelection);
  };

  const handleConfirm = () => {
    if (selectedSeat) {
      onConfirm?.(selectedSeat);
    }
  };

  const getSeatStyles = (seat: Seat) => {
    const isSelected = selectedSeat?.id === seat.id;
    
    if (seat.status === "occupied") {
      return "bg-muted/50 text-muted-foreground/30 cursor-not-allowed";
    }
    if (isSelected) {
      return "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background";
    }
    if (seat.status === "premium") {
      return "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 cursor-pointer";
    }
    if (seat.status === "exit") {
      return "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer";
    }
    return "bg-muted/30 hover:bg-muted/50 cursor-pointer";
  };

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Armchair className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Seat Selection</h3>
        </div>
        {selectedSeat && (
          <Badge className="bg-primary/10 text-primary">
            Seat {selectedSeat.id} • {selectedSeat.price > 0 ? `${currency}${selectedSeat.price}` : "Free"}
          </Badge>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted/30" />
          <span className="text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-amber-500/20" />
          <span className="text-muted-foreground">Premium ({currency}{premiumPrice})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-emerald-500/20" />
          <span className="text-muted-foreground">Exit Row ({currency}{exitPrice})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted/50">
            <X className="w-3 h-3 m-0.5 text-muted-foreground/50" />
          </div>
          <span className="text-muted-foreground">Occupied</span>
        </div>
      </div>

      {/* Seat Map */}
      <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
        {/* Plane nose indicator */}
        <div className="flex justify-center mb-3">
          <div className="w-16 h-6 rounded-t-full bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground">
            FRONT
          </div>
        </div>

        {/* Seats Grid */}
        <div className="space-y-2">
          {Array.from({ length: rows }, (_, i) => i + 1).map((row) => (
            <div key={row} className="flex items-center justify-center gap-1">
              {/* Left section (A, B, C) */}
              <div className="flex gap-1">
                {seats
                  .filter((s) => s.row === row && ["A", "B", "C"].includes(s.position))
                  .map((seat) => (
                    <button type="button"
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      disabled={seat.status === "occupied"}
                      className={cn(
                        "w-8 h-8 rounded text-[10px] font-medium flex items-center justify-center transition-all",
                        getSeatStyles(seat)
                      )}
                    >
                      {seat.status === "occupied" ? (
                        <X className="w-3 h-3" />
                      ) : selectedSeat?.id === seat.id ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        seat.id
                      )}
                    </button>
                  ))}
              </div>

              {/* Aisle */}
              <div className="w-6 flex items-center justify-center text-[10px] text-muted-foreground">
                {row}
              </div>

              {/* Right section (D, E, F) */}
              <div className="flex gap-1">
                {seats
                  .filter((s) => s.row === row && ["D", "E", "F"].includes(s.position))
                  .map((seat) => (
                    <button type="button"
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      disabled={seat.status === "occupied"}
                      className={cn(
                        "w-8 h-8 rounded text-[10px] font-medium flex items-center justify-center transition-all",
                        getSeatStyles(seat)
                      )}
                    >
                      {seat.status === "occupied" ? (
                        <X className="w-3 h-3" />
                      ) : selectedSeat?.id === seat.id ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        seat.id
                      )}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selection Summary */}
      {selectedSeat && (
        <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Seat {selectedSeat.id}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedSeat.status === "premium" && "Extra legroom, priority boarding"}
                  {selectedSeat.status === "exit" && "Extra legroom, emergency exit"}
                  {selectedSeat.status === "available" && "Standard seat"}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={handleConfirm}>
              Confirm {selectedSeat.price > 0 ? `${currency}${selectedSeat.price}` : "Free"}
            </Button>
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="flex items-start gap-2 mt-3 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p>Window seats (A, F) are great for views. Aisle seats (C, D) offer easier access.</p>
      </div>
    </div>
  );
};

export default SeatSelectionWidget;
