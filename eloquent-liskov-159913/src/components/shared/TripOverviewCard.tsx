import { 
  Plane, 
  Hotel, 
  Car, 
  MapPin,
  Calendar,
  Users,
  ArrowRight,
  Edit,
  Share2,
  Download,
  MoreHorizontal
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TripService {
  type: "flight" | "hotel" | "car";
  title: string;
  subtitle: string;
  price: number;
  confirmed: boolean;
}

interface TripOverviewCardProps {
  tripName?: string;
  destination?: string;
  dates?: { start: string; end: string };
  travelers?: number;
  services?: TripService[];
  savings?: number;
  className?: string;
}

const serviceIcons = {
  flight: Plane,
  hotel: Hotel,
  car: Car,
};

const serviceColors = {
  flight: "text-sky-500 bg-sky-500/10 border-sky-500/30",
  hotel: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  car: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
};

const TripOverviewCard = ({
  tripName = "Paris Adventure",
  destination = "Paris, France",
  dates = { start: "Mar 15", end: "Mar 22" },
  travelers = 2,
  services = [
    { type: "flight", title: "NYC → Paris", subtitle: "Delta Airlines", price: 890, confirmed: true },
    { type: "hotel", title: "Grand Plaza Hotel", subtitle: "4 nights", price: 756, confirmed: true },
    { type: "car", title: "Compact SUV", subtitle: "Hertz", price: 180, confirmed: false },
  ],
  savings = 125,
  className,
}: TripOverviewCardProps) => {
  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
  const confirmedServices = services.filter(s => s.confirmed).length;

  return (
    <Card className={cn(
      "overflow-hidden border-2 border-primary/20",
      className
    )}>
      {/* Header with gradient */}
      <div className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-teal-500/10">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg">{tripName}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {destination}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {dates.start} - {dates.end}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {travelers}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Trip options">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Edit Trip
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Services */}
        <div className="space-y-2">
          {services.map((service, index) => {
            const Icon = serviceIcons[service.type];
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border",
                  serviceColors[service.type]
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl",
                  serviceColors[service.type].split(" ")[1]
                )}>
                  <Icon className={cn("w-4 h-4", serviceColors[service.type].split(" ")[0])} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{service.title}</p>
                  <p className="text-xs text-muted-foreground">{service.subtitle}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">${service.price}</p>
                  {service.confirmed ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 text-[10px]">
                      Confirmed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="p-3 rounded-xl bg-muted/30 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${totalPrice + savings}</span>
          </div>
          {savings > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-500">Bundle savings</span>
              <span className="text-emerald-500">-${savings}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t border-border pt-2">
            <span>Total</span>
            <span>${totalPrice}</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {confirmedServices}/{services.length} services confirmed
          </div>
          <Button className="bg-gradient-to-r from-primary to-teal-500">
            {confirmedServices === services.length ? "View Itinerary" : "Complete Booking"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TripOverviewCard;
