import { useState } from "react";
import { Armchair, Crown, Star, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const seatRows = [
  { row: 1, type: "first", seats: ["A", "B", null, "C", "D"] },
  { row: 2, type: "first", seats: ["A", "B", null, "C", "D"] },
  { row: 3, type: "business", seats: ["A", "B", null, "C", "D"] },
  { row: 4, type: "business", seats: ["A", "B", null, "C", "D"] },
  { row: 5, type: "economy-plus", seats: ["A", "B", "C", null, "D", "E", "F"] },
  { row: 6, type: "economy-plus", seats: ["A", "B", "C", null, "D", "E", "F"] },
  { row: 7, type: "economy", seats: ["A", "B", "C", null, "D", "E", "F"] },
  { row: 8, type: "economy", seats: ["A", "B", "C", null, "D", "E", "F"] },
  { row: 9, type: "economy", seats: ["A", "B", "C", null, "D", "E", "F"] },
  { row: 10, type: "economy", seats: ["A", "B", "C", null, "D", "E", "F"] },
];

const occupiedSeats = ["1A", "2B", "3C", "5A", "5B", "7D", "8E", "9A", "10F"];

const seatPrices: Record<string, number> = {
  first: 150,
  business: 75,
  "economy-plus": 35,
  economy: 0,
};

const FlightSeatMap = () => {
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  const getSeatStatus = (row: number, seat: string) => {
    const seatId = `${row}${seat}`;
    if (occupiedSeats.includes(seatId)) return "occupied";
    if (selectedSeat === seatId) return "selected";
    return "available";
  };

  const getSeatColor = (type: string, status: string) => {
    if (status === "occupied") return "bg-muted/50 text-muted-foreground cursor-not-allowed";
    if (status === "selected") return "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background";
    
    switch (type) {
      case "first": return "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30";
      case "business": return "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30";
      case "economy-plus": return "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30";
      default: return "bg-card hover:bg-muted/50";
    }
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-secondary text-foreground border-border">
            <Armchair className="w-3 h-3 mr-1" /> Seat Selection
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Choose Your Perfect Seat
          </h2>
          <p className="text-muted-foreground">Select your preferred seat for maximum comfort</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Seat Map */}
          <div className="bg-card/60 backdrop-blur-xl rounded-2xl border border-border/50 p-6">
            <div className="flex justify-center mb-6">
              <div className="bg-muted/30 rounded-t-full px-8 py-2 text-sm text-muted-foreground">
                Front of Aircraft
              </div>
            </div>

            <div className="space-y-2">
              {seatRows.map((row) => (
                <div key={row.row} className="flex items-center justify-center gap-1">
                  <span className="w-6 text-xs text-muted-foreground text-right">{row.row}</span>
                  {row.seats.map((seat, idx) => (
                    seat === null ? (
                      <div key={idx} className="w-8 h-8" />
                    ) : (
                      <button type="button"
                        key={`${row.row}${seat}`}
                        onClick={() => {
                          const seatId = `${row.row}${seat}`;
                          if (!occupiedSeats.includes(seatId)) {
                            setSelectedSeat(selectedSeat === seatId ? null : seatId);
                          }
                        }}
                        className={cn(
                          "w-8 h-8 rounded-md text-xs font-medium transition-all",
                          getSeatColor(row.type, getSeatStatus(row.row, seat))
                        )}
                        disabled={occupiedSeats.includes(`${row.row}${seat}`)}
                      >
                        {seat}
                      </button>
                    )
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border/50">
              <div className="flex flex-wrap justify-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-500/20" />
                  <span>First Class (+$150)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-secondary" />
                  <span>Business (+$75)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-secondary" />
                  <span>Economy+ (+$35)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-card border border-border" />
                  <span>Economy (Free)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-muted/50" />
                  <span>Occupied</span>
                </div>
              </div>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="space-y-4">
            <div className="bg-card/60 backdrop-blur-xl rounded-2xl border border-border/50 p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                Your Selection
              </h3>
              
              {selectedSeat ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border border-primary/30">
                    <div>
                      <p className="font-bold text-lg">Seat {selectedSeat}</p>
                      <p className="text-sm text-muted-foreground">
                        {seatRows.find(r => r.row === parseInt(selectedSeat))?.type.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())} Class
                      </p>
                    </div>
                    <Check className="w-6 h-6 text-primary" />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-green-400">
                      <Check className="w-4 h-4" /> Extra legroom
                    </div>
                    <div className="flex items-center gap-2 text-green-400">
                      <Check className="w-4 h-4" /> Priority boarding
                    </div>
                    <div className="flex items-center gap-2 text-green-400">
                      <Check className="w-4 h-4" /> Window/Aisle access
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-muted-foreground">Seat upgrade</span>
                      <span className="font-bold text-lg">
                        +${seatPrices[seatRows.find(r => r.row === parseInt(selectedSeat))?.type || "economy"]}
                      </span>
                    </div>
                    <Button className="w-full bg-secondary">
                      Confirm Selection
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Armchair className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a seat from the map</p>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20 p-4">
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Premium Seat Tip</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rows 5-6 offer extra legroom at a fraction of business class price!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightSeatMap;
