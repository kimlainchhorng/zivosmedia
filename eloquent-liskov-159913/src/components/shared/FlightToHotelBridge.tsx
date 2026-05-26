import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plane, 
  Hotel, 
  ArrowRight, 
  MapPin, 
  Calendar,
  Users,
  Sparkles,
  Check,
  Star
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FlightToHotelBridgeProps {
  flightDestination?: string;
  arrivalDate?: Date;
  departureDate?: Date;
  passengers?: number;
  className?: string;
}

const suggestedHotels = [
  { id: "1", name: "Grand Plaza Hotel", rating: 4.8, price: 189, icon: "hotel" as const, discount: "-20%" },
  { id: "2", name: "City Center Suites", rating: 4.6, price: 145, icon: "hotel" as const, discount: "-15%" },
  { id: "3", name: "Boutique Inn", rating: 4.9, price: 210, icon: "hotel" as const, discount: "-25%" },
];

const FlightToHotelBridge = ({ 
  flightDestination = "Paris",
  arrivalDate,
  departureDate,
  passengers = 2,
  className 
}: FlightToHotelBridgeProps) => {
  const navigate = useNavigate();
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);

  const handleContinueToHotels = () => {
    navigate("/hotels");
  };

  return (
    <Card className={cn(
      "overflow-hidden border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-card to-orange-500/5",
      className
    )}>
      <CardContent className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-secondary">
              <Plane className="w-5 h-5 text-foreground" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className="p-2 rounded-xl bg-amber-500/20">
              <Hotel className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Complete Your Trip</h3>
            <p className="text-sm text-muted-foreground">
              Add a hotel in {flightDestination} & save up to 25%
            </p>
          </div>
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground">
            <Sparkles className="w-3 h-3 mr-1" />
            Bundle Deal
          </Badge>
        </div>

        {/* Trip Context */}
        <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-xl bg-muted/30">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{flightDestination}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <span>4 nights</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-primary" />
            <span>{passengers} guests</span>
          </div>
        </div>

        {/* Suggested Hotels */}
        <div className="space-y-2 mb-4">
          <p className="text-sm font-medium text-muted-foreground">Top picks for you:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {suggestedHotels.map((hotel) => (
              <button type="button"
                key={hotel.id}
                onClick={() => setSelectedHotel(hotel.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                  selectedHotel === hotel.id
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border hover:border-amber-500/30"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Hotel className="w-5 h-5 text-amber-500" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{hotel.name}</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-xs">{hotel.rating}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">${hotel.price}</p>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-primary/10 text-primary">
                    {hotel.discount}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/flights")}
          >
            Skip for now
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500"
            onClick={handleContinueToHotels}
          >
            Browse All Hotels
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FlightToHotelBridge;
