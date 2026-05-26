import { Scale, X, Plus, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface CompareFlight {
  id: string;
  airline: string;
  route: string;
  price: number;
  duration: string;
  stops: number;
  departure: string;
  arrival: string;
  amenities: string[];
}

interface FlightCompareWidgetProps {
  compareList: CompareFlight[];
  onRemove: (id: string) => void;
}

const FlightCompareWidget = ({ compareList, onRemove }: FlightCompareWidgetProps) => {
  const navigate = useNavigate();

  return (
    <section className="py-12 px-4 bg-gradient-to-b from-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-secondary text-foreground border-border">
            <Scale className="w-3 h-3 mr-1" /> Smart Compare
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Compare Flights Side by Side
          </h2>
        </div>

        {compareList.length === 0 && (
          <div className="text-center py-14 text-muted-foreground">
            <Scale className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-sm">No flights selected to compare</p>
            <p className="text-xs mt-1 max-w-xs mx-auto">Search for flights and tap <strong>Compare</strong> on up to 3 results to compare them here side by side.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {compareList.map((flight, index) => (
            <div key={flight.id} className="relative bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-4">
              <button type="button"
                onClick={() => onRemove(flight.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all duration-200 active:scale-[0.90] touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>

              <Badge className="mb-3" variant="secondary">{flight.airline}</Badge>
              <div className="text-center mb-4">
                <p className="text-lg font-bold">{flight.route}</p>
                <p className="text-sm text-muted-foreground">{flight.stops === 0 ? "Nonstop" : `${flight.stops} stop`}</p>
              </div>

              <div className="flex justify-between items-center mb-4 text-sm">
                <div className="text-center">
                  <p className="font-bold">{flight.departure}</p>
                  <p className="text-xs text-muted-foreground">Depart</p>
                </div>
                <div className="flex-1 px-4">
                  <div className="flex items-center gap-1 justify-center text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">{flight.duration}</span>
                  </div>
                  <div className="h-px bg-border my-1" />
                </div>
                <div className="text-center">
                  <p className="font-bold">{flight.arrival}</p>
                  <p className="text-xs text-muted-foreground">Arrive</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {flight.amenities.map((amenity) => (
                  <Badge key={amenity} variant="outline" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
              </div>

              <div className="text-center mb-4">
                <span className="text-3xl font-bold text-foreground">${flight.price}</span>
              </div>

              <Button className="w-full" variant={index === 0 ? "default" : "outline"}>
                {index === 0 ? "Best Price" : "Select"}
              </Button>
            </div>
          ))}

          {compareList.length < 3 && compareList.length > 0 && (
            <button type="button"
              onClick={() => {
                toast.info("Search for flights to add", { description: "Tap the compare icon on a flight in the search results." });
                navigate("/book-flight");
              }}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/50 rounded-2xl hover:border-border hover:bg-secondary transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-foreground" />
              </div>
              <p className="font-semibold">Add Flight to Compare</p>
              <p className="text-sm text-muted-foreground">Up to 3 flights</p>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default FlightCompareWidget;
