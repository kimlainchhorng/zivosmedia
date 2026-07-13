import { Plane, Coffee, Wifi, ShoppingBag, Car, Train, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const airports = {
  departure: {
    code: "JFK",
    name: "John F. Kennedy International",
    city: "New York",
    terminal: "Terminal 4",
    amenities: ["Premium Lounges", "Free WiFi", "Duty Free", "Fine Dining"],
    transport: ["AirTrain", "Taxi", "Uber/Lyft", "Long-term Parking"],
    tips: "Arrive 3 hours early for international flights. TSA PreCheck available at all terminals.",
  },
  arrival: {
    code: "LAX",
    name: "Los Angeles International",
    city: "Los Angeles",
    terminal: "Terminal B",
    amenities: ["Airport Spa", "Business Center", "Kids Play Area", "Pet Relief"],
    transport: ["FlyAway Bus", "Metro", "Rental Cars", "Rideshare"],
    tips: "Use the LAX-it lot for rideshare pickups. Free shuttle between terminals.",
  },
};

const FlightAirportInfo = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-secondary text-foreground border-border">
            <MapPin className="w-3 h-3 mr-1" /> Airport Guide
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Know Your Airports
          </h2>
          <p className="text-muted-foreground">Essential information for a smooth journey</p>
        </div>

        <Tabs defaultValue="departure" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="departure">Departure: {airports.departure.code}</TabsTrigger>
            <TabsTrigger value="arrival">Arrival: {airports.arrival.code}</TabsTrigger>
          </TabsList>

          {Object.entries(airports).map(([key, airport]) => (
            <TabsContent key={key} value={key}>
              <div className="bg-card/60 backdrop-blur-xl rounded-2xl border border-border/50 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-border/50">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Plane className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{airport.code}</h3>
                        <p className="text-sm text-muted-foreground">{airport.name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{airport.terminal}</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Amenities */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-primary" /> Amenities
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {airport.amenities.map((amenity, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-xl bg-muted/30">
                          {idx === 0 && <ShoppingBag className="w-4 h-4 text-amber-400" />}
                          {idx === 1 && <Wifi className="w-4 h-4 text-blue-400" />}
                          {idx === 2 && <ShoppingBag className="w-4 h-4 text-foreground" />}
                          {idx === 3 && <Coffee className="w-4 h-4 text-orange-400" />}
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transportation */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Car className="w-4 h-4 text-primary" /> Getting There
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {airport.transport.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-xl bg-muted/30">
                          {idx === 0 && <Train className="w-4 h-4 text-green-400" />}
                          {idx === 1 && <Car className="w-4 h-4 text-yellow-400" />}
                          {idx === 2 && <Car className="w-4 h-4 text-foreground" />}
                          {idx === 3 && <Car className="w-4 h-4 text-foreground" />}
                          <span>{option}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pro Tip */}
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 border border-primary/30">
                  <p className="text-sm">
                    <span className="font-semibold text-primary">Pro Tip:</span> {airport.tips}
                  </p>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};

export default FlightAirportInfo;
