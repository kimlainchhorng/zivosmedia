import { Plane, Clock, Coffee, ShoppingBag, Wifi, Car, Train, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const airports = [
  {
    code: "LAX",
    name: "Los Angeles International",
    terminals: 9,
    tips: "Allow 2-3 hours. Tom Bradley Terminal has best dining.",
    transport: ["Metro", "FlyAway Bus", "Rideshare"],
    amenities: ["Lounges", "Duty Free", "Spas"],
  },
  {
    code: "JFK",
    name: "John F. Kennedy International",
    terminals: 6,
    tips: "Terminals not connected. Check terminal before arrival.",
    transport: ["AirTrain", "Subway", "LIRR"],
    amenities: ["Premium Lounges", "Art Exhibits", "Fine Dining"],
  },
  {
    code: "ORD",
    name: "Chicago O'Hare International",
    terminals: 4,
    tips: "One of busiest. Book express security if available.",
    transport: ["L Train", "Pace Bus", "Metra"],
    amenities: ["Yoga Room", "Kids Play Area", "Pet Relief"],
  },
  {
    code: "LHR",
    name: "London Heathrow",
    terminals: 5,
    tips: "Heathrow Express fastest to central London.",
    transport: ["Heathrow Express", "Elizabeth Line", "Coaches"],
    amenities: ["Luxury Shopping", "Spas", "Hotels"],
  },
];

const FlightAirportGuide = () => {
  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-transparent to-transparent">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-4">
            <MapPin className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium text-foreground">Airport Guides</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            Major Airport Tips
          </h2>
          <p className="text-muted-foreground">Navigate airports like a pro</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {airports.map((airport, index) => (
            <div
              key={airport.code}
              className={cn(
                "p-5 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm",
                "animate-in fade-in slide-in-from-bottom-4"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-secondary">
                  <span className="text-lg font-bold text-primary-foreground">{airport.code}</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{airport.name}</h3>
                  <p className="text-sm text-muted-foreground">{airport.terminals} Terminals</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-secondary border border-border mb-4">
                <p className="text-sm font-medium">Tip: {airport.tips}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Train className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Transport</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {airport.transport.map((t) => (
                      <span key={t} className="px-2 py-1 text-xs rounded-xl bg-muted/50">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Coffee className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Amenities</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {airport.amenities.map((a) => (
                      <span key={a} className="px-2 py-1 text-xs rounded-xl bg-muted/50">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlightAirportGuide;
