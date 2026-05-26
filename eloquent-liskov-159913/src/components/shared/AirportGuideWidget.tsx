import { 
  MapPin, 
  Coffee, 
  Wifi, 
  ShoppingBag, 
  Utensils,
  Clock,
  ArrowRight,
  Star,
  Armchair
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Amenity {
  name: string;
  type: string;
  location: string;
  rating?: number;
  icon: React.ElementType;
}

interface AirportStats {
  securityWait?: string;
  loungesAvailable?: number;
  diningOptions?: number;
}

interface AirportGuideWidgetProps {
  className?: string;
  airportCode?: string;
  airportName?: string;
  terminal?: string;
  gate?: string;
  hasFreeWifi?: boolean;
  amenities?: Amenity[];
  stats?: AirportStats;
  onViewMap?: () => void;
  onBookLounge?: () => void;
}

const defaultAmenities: Amenity[] = [
  { name: "Sky Lounge", type: "Lounge", location: "Gate B12", rating: 4.5, icon: Armchair },
  { name: "Blue Bottle Coffee", type: "Cafe", location: "Gate B8", rating: 4.2, icon: Coffee },
  { name: "Hudson News", type: "Shopping", location: "Main Hall", icon: ShoppingBag },
  { name: "Shake Shack", type: "Dining", location: "Food Court", rating: 4.0, icon: Utensils },
];

const AirportGuideWidget = ({ 
  className, 
  airportCode = "JFK",
  airportName = "John F. Kennedy International",
  terminal = "Terminal 4",
  gate,
  hasFreeWifi = true,
  amenities = defaultAmenities,
  stats = { securityWait: "~15 min", loungesAvailable: 3, diningOptions: 24 },
  onViewMap,
  onBookLounge
}: AirportGuideWidgetProps) => {
  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Airport Guide</h3>
        </div>
        <Badge variant="secondary" className="text-xs">{airportCode}</Badge>
      </div>

      {/* Airport Info */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/30 mb-4">
        <p className="font-semibold">{airportName}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>{terminal}</span>
          {gate && (
            <>
              <span>•</span>
              <span>Gate {gate}</span>
            </>
          )}
          {hasFreeWifi && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3" /> Free WiFi
              </span>
            </>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 rounded-xl bg-muted/20 text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs font-medium">Security</p>
          <p className="text-[10px] text-muted-foreground">{stats.securityWait} wait</p>
        </div>
        <div className="p-2 rounded-xl bg-muted/20 text-center">
          <Armchair className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs font-medium">Lounges</p>
          <p className="text-[10px] text-muted-foreground">{stats.loungesAvailable} available</p>
        </div>
        <div className="p-2 rounded-xl bg-muted/20 text-center">
          <Utensils className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs font-medium">Dining</p>
          <p className="text-[10px] text-muted-foreground">{stats.diningOptions} options</p>
        </div>
      </div>

      {/* Nearby Amenities */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">
          {gate ? `Near Gate ${gate}` : "Near Your Gate"}
        </p>
        <div className="space-y-2">
          {amenities.map((amenity, i) => {
            const Icon = amenity.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/20 transition-all duration-200 cursor-pointer group"
              >
                <div className="p-1.5 rounded-xl bg-primary/10">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{amenity.name}</p>
                    {amenity.rating && (
                      <div className="flex items-center gap-0.5 text-amber-400">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[10px]">{amenity.rating}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{amenity.location}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onViewMap}>
          <MapPin className="w-3 h-3 mr-1" />
          Terminal Map
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onBookLounge}>
          <Armchair className="w-3 h-3 mr-1" />
          Book Lounge
        </Button>
      </div>
    </div>
  );
};

export default AirportGuideWidget;
