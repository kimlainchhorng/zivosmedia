import { useState } from "react";
import { 
  MapPin, 
  Plus, 
  X, 
  ArrowRight,
  Calendar,
  GripVertical,
  Plane,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface City {
  id: string;
  name: string;
  code: string;
  nights: number;
}

interface MultiCityPlannerProps {
  className?: string;
}

const MultiCityPlanner = ({ className }: MultiCityPlannerProps) => {
  const [cities, setCities] = useState<City[]>([
    { id: "1", name: "New York", code: "JFK", nights: 0 },
    { id: "2", name: "Paris", code: "CDG", nights: 3 },
    { id: "3", name: "Rome", code: "FCO", nights: 4 },
  ]);
  const [newCity, setNewCity] = useState("");

  const addCity = () => {
    if (newCity.trim()) {
      setCities(prev => [...prev, {
        id: Date.now().toString(),
        name: newCity,
        code: newCity.slice(0, 3).toUpperCase(),
        nights: 2
      }]);
      setNewCity("");
    }
  };

  const removeCity = (id: string) => {
    if (cities.length > 2) {
      setCities(prev => prev.filter(c => c.id !== id));
    }
  };

  const updateNights = (id: string, nights: number) => {
    setCities(prev => prev.map(c => 
      c.id === id ? { ...c, nights: Math.max(0, nights) } : c
    ));
  };

  const totalNights = cities.reduce((sum, c) => sum + c.nights, 0);
  const totalFlights = cities.length - 1;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-teal-500/20">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Multi-City Trip</CardTitle>
              <p className="text-sm text-muted-foreground">
                Plan your route across multiple destinations
              </p>
            </div>
          </div>
          <Badge variant="secondary">
            {totalFlights} flights • {totalNights} nights
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-4">
        {/* Cities List */}
        <div className="space-y-2">
          {cities.map((city, index) => (
            <div key={city.id} className="relative">
              {/* Connection Line */}
              {index < cities.length - 1 && (
                <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 to-primary/20 z-0" />
              )}
              
              <div className="relative flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                {/* Drag Handle */}
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                
                {/* City Number */}
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                
                {/* City Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{city.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {city.code}
                    </Badge>
                  </div>
                  {index > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Stay:</span>
                      <div className="flex items-center gap-1">
                        <button type="button"
                          onClick={() => updateNights(city.id, city.nights - 1)}
                          className="w-5 h-5 rounded bg-muted hover:bg-muted/80 flex items-center justify-center text-xs"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{city.nights}</span>
                        <button type="button"
                          onClick={() => updateNights(city.id, city.nights + 1)}
                          className="w-5 h-5 rounded bg-muted hover:bg-muted/80 flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                        <span className="text-xs text-muted-foreground">nights</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Flight Info (between cities) */}
                {index < cities.length - 1 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Plane className="w-3 h-3" />
                    <span>~2h</span>
                  </div>
                )}

                {/* Remove Button */}
                {cities.length > 2 && index > 0 && index < cities.length - 1 && (
                  <button type="button"
                    onClick={() => removeCity(city.id)}
                    className="p-1 rounded-xl hover:bg-destructive/10 transition-all duration-200 active:scale-[0.90] touch-manipulation"
                  >
                    <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add City */}
        <div className="flex gap-2">
          <Input
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            placeholder="Add another city..."
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && addCity()}
          />
          <Button 
            variant="outline" 
            size="icon"
            aria-label="Add city"
            onClick={addCity}
            disabled={!newCity.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Trip Summary */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-teal-500/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Trip Overview</p>
              <p className="text-xs text-muted-foreground">
                {cities[0]?.name} → {cities[cities.length - 1]?.name}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium">{totalNights} nights</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Plane className="w-3 h-3" />
                <span>{totalFlights} flights</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            <Calendar className="w-4 h-4 mr-2" />
            Set Dates
          </Button>
          <Button className="flex-1 bg-gradient-to-r from-primary to-teal-500">
            Search Flights
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MultiCityPlanner;
