import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Hotel, 
  Car, 
  Plane,
  Sparkles,
  Shield,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

/**
 * TRAVEL EXTRAS CTA SECTION
 * Cross-sell section placed BELOW search results
 * "Enhance Your Trip" with related services
 */

export type ServiceType = "flights" | "hotels" | "cars";

interface ExtraService {
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
  color: string;
  gradient: string;
}

const getExtras = (currentService: ServiceType): ExtraService[] => {
  const allServices: Record<string, ExtraService> = {
    flights: {
      title: "Need a Flight?",
      description: "Compare 500+ airlines for the best prices",
      icon: Plane,
      link: "/flights",
      color: "text-sky-500",
      gradient: "from-muted to-muted",
    },
    hotels: {
      title: "Need a Hotel?",
      description: "Compare hotel prices from top booking sites",
      icon: Hotel,
      link: "/hotels",
      color: "text-amber-500",
      gradient: "from-amber-500/10 to-orange-500/10",
    },
    cars: {
      title: "Need a Car?",
      description: "Compare rental cars from trusted providers",
      icon: Car,
      link: "/rent-car",
      color: "text-violet-500",
      gradient: "from-muted to-muted",
    },
    insurance: {
      title: "Travel Insurance",
      description: "Protect your trip with comprehensive coverage",
      icon: Shield,
      link: "#",
      color: "text-emerald-500",
      gradient: "from-emerald-500/10 to-teal-500/10",
    },
  };

  // Return services except the current one
  return Object.entries(allServices)
    .filter(([key]) => key !== currentService)
    .map(([_, value]) => value)
    .slice(0, 3);
};

interface TravelExtrasCTAProps {
  currentService: ServiceType;
  destination?: string;
  className?: string;
}

export default function TravelExtrasCTA({ 
  currentService, 
  destination,
  className = '' 
}: TravelExtrasCTAProps) {
  const extras = getExtras(currentService);

  return (
    <section className={cn("py-12 border-t border-border/50 relative overflow-hidden", className)}>
      {/* Shimmer background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-parallax-float" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-primary/20 text-primary border-primary/30">
            <Sparkles className="w-3 h-3 mr-1" />
            Enhance Your Trip
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            Complete Your Travel Plans
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {destination 
              ? `Add more to your ${destination} trip`
              : "Add flights, hotels, and car rentals to your trip"
            }
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {extras.map((extra) => (
            <Link key={extra.title} to={extra.link}>
              <Card className="h-full group cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1.5 hover:border-primary/30 overflow-hidden relative">
                <CardContent className="p-5 relative z-10">
                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-slide-left" style={{ animationDuration: '3s' }} />
                  </div>
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                    `bg-gradient-to-br ${extra.gradient}`
                  )}>
                    <extra.icon className={cn("w-6 h-6", extra.color)} />
                  </div>
                  <h3 className="font-bold text-base mb-1 group-hover:text-primary transition-colors">
                    {extra.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {extra.description}
                  </p>
                  <div className="flex items-center gap-1 text-sm font-medium text-primary">
                    Search now
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          All services redirect to our trusted travel partners for booking
        </p>
      </div>
    </section>
  );
}
