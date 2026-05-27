import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Wifi, Coffee, Utensils, Armchair, ShowerHead, Newspaper, Wine, Plane, Building2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const lounges = [
  {
    id: 1,
    name: "ZIVO Premier Lounge",
    airport: "JFK Terminal 4",
    rating: 4.9,
    price: 59,
    amenities: ["Premium Bar", "Hot Meals", "Shower Suites", "Spa Services"],
    icon: "premier" as const,
    isPremium: true
  },
  {
    id: 2,
    name: "Sky Club Access",
    airport: "LAX Terminal B",
    rating: 4.7,
    price: 45,
    amenities: ["Buffet", "WiFi", "Quiet Zone", "Workstations"],
    icon: "sky" as const,
    isPremium: false
  },
  {
    id: 3,
    name: "First Class Lounge",
    airport: "LHR Terminal 5",
    rating: 4.8,
    price: 79,
    amenities: ["Fine Dining", "Champagne Bar", "Private Suites", "Concierge"],
    icon: "first" as const,
    isPremium: true
  }
];

const amenityIcons: Record<string, React.ReactNode> = {
  "Premium Bar": <Wine className="w-3 h-3" />,
  "Hot Meals": <Utensils className="w-3 h-3" />,
  "Shower Suites": <ShowerHead className="w-3 h-3" />,
  "Spa Services": <Armchair className="w-3 h-3" />,
  "Buffet": <Coffee className="w-3 h-3" />,
  "WiFi": <Wifi className="w-3 h-3" />,
  "Quiet Zone": <Armchair className="w-3 h-3" />,
  "Workstations": <Newspaper className="w-3 h-3" />,
  "Fine Dining": <Utensils className="w-3 h-3" />,
  "Champagne Bar": <Wine className="w-3 h-3" />,
  "Private Suites": <Crown className="w-3 h-3" />,
  "Concierge": <Crown className="w-3 h-3" />
};

export default function FlightLoungeAccess() {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Airport Lounge Access</CardTitle>
              <p className="text-sm text-muted-foreground">Relax before your flight</p>
            </div>
          </div>
          <Badge variant="outline" className="text-amber-400 border-amber-500/30">
            Premium
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lounges.map((lounge) => (
          <div
            key={lounge.id}
            className={cn(
              "p-4 rounded-xl border transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5",
              lounge.isPremium 
                ? "bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border-amber-500/30" 
                : "bg-muted/30 border-border/50"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", lounge.isPremium ? "bg-amber-500/15" : "bg-sky-500/15")}>
                  {lounge.icon === "premier" ? <Building2 className="w-5 h-5 text-amber-400" /> : lounge.icon === "first" ? <Crown className="w-5 h-5 text-amber-400" /> : <Plane className="w-5 h-5 text-foreground" />}
                </div>
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    {lounge.name}
                    {lounge.isPremium && (
                      <Crown className="w-3 h-3 text-amber-400" />
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">{lounge.airport}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">${lounge.price}</p>
                <p className="text-xs text-muted-foreground">per person</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {lounge.amenities.map((amenity) => (
                <Badge
                  key={amenity}
                  variant="secondary"
                  className="text-xs gap-1"
                >
                  {amenityIcons[amenity]}
                  {amenity}
                </Badge>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-sm font-medium">{lounge.rating}</span>
              </div>
              <Button size="sm" variant={lounge.isPremium ? "default" : "outline"}>
                Book Access
              </Button>
            </div>
          </div>
        ))}

        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center hover:bg-primary/15 transition-all duration-200">
          <p className="text-sm text-muted-foreground">
            <Crown className="w-4 h-4 inline mr-1 text-primary" />
            ZIVO Miles members get <span className="text-primary font-medium">20% off</span> all lounge bookings
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
