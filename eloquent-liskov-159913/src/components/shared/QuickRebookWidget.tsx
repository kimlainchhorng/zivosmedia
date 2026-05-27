import { 
  History, 
  Plane, 
  Hotel, 
  Car,
  ArrowRight,
  Repeat,
  Star,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface QuickRebookWidgetProps {
  className?: string;
  recentTrips?: PastTrip[];
}

interface PastTrip {
  id: string;
  type: "flight" | "hotel" | "car";
  title: string;
  details: string;
  lastBooked: string;
  price: number;
  isFavorite: boolean;
}

const defaultTrips: PastTrip[] = [
  { id: "1", type: "flight", title: "NYC → Paris", details: "Air France • Direct", lastBooked: "Mar 2024", price: 899, isFavorite: true },
  { id: "2", type: "hotel", title: "Le Grand Hotel", details: "Paris • 5 nights", lastBooked: "Mar 2024", price: 1250, isFavorite: false },
  { id: "3", type: "flight", title: "NYC → London", details: "British Airways • Direct", lastBooked: "Jan 2024", price: 750, isFavorite: true },
];

const typeConfig = {
  flight: { icon: Plane, color: "text-sky-500", bg: "bg-sky-500/10" },
  hotel: { icon: Hotel, color: "text-amber-500", bg: "bg-amber-500/10" },
  car: { icon: Car, color: "text-emerald-500", bg: "bg-emerald-500/10" },
};

const QuickRebookWidget = ({ 
  className,
  recentTrips = defaultTrips
}: QuickRebookWidgetProps) => {
  const trips = recentTrips.length > 0 ? recentTrips : defaultTrips;
  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Quick Rebook</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-7">
          View All
        </Button>
      </div>

      <div className="space-y-3">
        {trips.map((trip) => {
          const config = typeConfig[trip.type];
          const Icon = config.icon;
          
          return (
            <div
              key={trip.id}
              className="group p-3 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/30 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-xl", config.bg)}>
                  <Icon className={cn("w-4 h-4", config.color)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{trip.title}</span>
                    {trip.isFavorite && (
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{trip.details}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{trip.lastBooked}</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-sm">${trip.price}</p>
                  <Badge variant="outline" className="text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Repeat className="w-3 h-3 mr-1" />
                    Rebook
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Favorite Routes */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-400" />
          Favorite routes get price alerts
        </p>
        <Button variant="outline" size="sm" className="w-full text-xs">
          Manage Favorites
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default QuickRebookWidget;
