import { useNavigate } from "react-router-dom";
import { 
  Plane, 
  Hotel, 
  Car, 
  UtensilsCrossed, 
  Ticket, 
  Shield,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Recommendation {
  id: string;
  service: "flight" | "hotel" | "car" | "food" | "events" | "insurance";
  title: string;
  description: string;
  reason: string;
  savings?: string;
  urgency?: "low" | "medium" | "high";
  href: string;
}

interface ServiceRecommendationsProps {
  context: "flight" | "hotel" | "car" | "home";
  destination?: string;
  className?: string;
}

const serviceIcons = {
  flight: Plane,
  hotel: Hotel,
  car: Car,
  food: UtensilsCrossed,
  events: Ticket,
  insurance: Shield
};

const serviceColors = {
  flight: "text-sky-500 bg-sky-500/10",
  hotel: "text-amber-500 bg-amber-500/10",
  car: "text-emerald-500 bg-emerald-500/10",
  food: "text-orange-500 bg-orange-500/10",
  events: "text-pink-500 bg-pink-500/10",
  insurance: "text-blue-500 bg-blue-500/10"
};

const getRecommendations = (context: string, destination?: string): Recommendation[] => {
  const base: Recommendation[] = [];
  
  if (context === "flight") {
    base.push(
      {
        id: "hotel-rec",
        service: "hotel",
        title: `Hotels in ${destination || "your destination"}`,
        description: "Book together and save 20%",
        reason: "Based on your flight dates",
        savings: "-$89",
        urgency: "high",
        href: "/book-hotel"
      },
      {
        id: "car-rec",
        service: "car",
        title: "Airport Car Rental",
        description: "Pick up at arrival terminal",
        reason: "Seamless airport transfer",
        savings: "-$45",
        urgency: "medium",
        href: "/rent-car"
      },
      {
        id: "insurance-rec",
        service: "insurance",
        title: "Travel Protection",
        description: "Comprehensive coverage",
        reason: "Protect your trip investment",
        href: "/travel-insurance"
      }
    );
  } else if (context === "hotel") {
    base.push(
      {
        id: "car-rec",
        service: "car",
        title: "Rental Car",
        description: "Explore at your own pace",
        reason: "Popular with hotel guests",
        savings: "-$35",
        urgency: "medium",
        href: "/rent-car"
      },
      {
        id: "food-rec",
        service: "food",
        title: "Local Restaurants",
        description: "Curated dining experiences",
        reason: "Near your hotel",
        href: "/food"
      },
      {
        id: "events-rec",
        service: "events",
        title: "Local Events & Tours",
        description: "Concerts, shows & experiences",
        reason: "During your stay",
        urgency: "high",
        href: "/events"
      }
    );
  } else if (context === "car") {
    base.push(
      {
        id: "insurance-rec",
        service: "insurance",
        title: "Rental Insurance",
        description: "Full damage coverage",
        reason: "Peace of mind driving",
        savings: "-$25",
        href: "/travel-insurance"
      },
      {
        id: "hotel-rec",
        service: "hotel",
        title: "Roadside Hotels",
        description: "For your road trip",
        reason: "Along your route",
        href: "/book-hotel"
      }
    );
  } else {
    // Home context
    base.push(
      {
        id: "flight-deal",
        service: "flight",
        title: "Flash Flight Deals",
        description: "Limited time offers",
        reason: "Trending destinations",
        savings: "-$150",
        urgency: "high",
        href: "/book-flight"
      },
      {
        id: "hotel-deal",
        service: "hotel",
        title: "Weekend Getaways",
        description: "Last-minute availability",
        reason: "Book for this weekend",
        savings: "-$75",
        urgency: "medium",
        href: "/book-hotel"
      },
      {
        id: "car-deal",
        service: "car",
        title: "Road Trip Ready",
        description: "SUVs & convertibles available",
        reason: "Perfect weather forecast",
        href: "/rent-car"
      }
    );
  }
  
  return base;
};

const ServiceRecommendations = ({ 
  context, 
  destination,
  className 
}: ServiceRecommendationsProps) => {
  const navigate = useNavigate();
  const recommendations = getRecommendations(context, destination);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-secondary">
            <Sparkles className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Recommended For You</CardTitle>
            <p className="text-sm text-muted-foreground">Complete your experience</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 space-y-3">
        {recommendations.map((rec) => {
          const Icon = serviceIcons[rec.service];
          const colorClasses = serviceColors[rec.service];
          
          return (
            <button type="button"
              key={rec.id}
              onClick={() => navigate(rec.href)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/50 hover:border-primary/20 transition-all group text-left"
            >
              <div className={cn("p-2.5 rounded-xl shrink-0", colorClasses)}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm truncate">{rec.title}</span>
                  {rec.urgency === "high" && (
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                      Limited
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{rec.description}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <TrendingUp className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-primary font-medium">{rec.reason}</span>
                </div>
              </div>
              
              <div className="text-right shrink-0">
                {rec.savings && (
                  <span className="text-sm font-bold text-primary block">{rec.savings}</span>
                )}
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all ml-auto" />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ServiceRecommendations;
