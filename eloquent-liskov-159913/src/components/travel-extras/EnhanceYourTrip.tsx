import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  Ticket, 
  Wifi, 
  Luggage, 
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
  MapPin,
  Scale
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AFFILIATE_DISCLOSURE_TEXT } from "@/config/affiliateLinks";

/**
 * ENHANCE YOUR TRIP - Unified Travel Add-ons Section
 * Appears after search results on Flights, Hotels, and Car Rental pages
 * 
 * IMPORTANT: This component NO LONGER contains direct partner links.
 * All partner links are consolidated on /extras page.
 * This component only shows category previews that link to /extras.
 */

export type CurrentService = "flights" | "hotels" | "cars";

interface EnhanceYourTripProps {
  currentService: CurrentService;
  destination?: string;
  className?: string;
  compact?: boolean;
}

interface CategoryPreview {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  borderColor: string;
  showFor: CurrentService[];
}

export default function EnhanceYourTrip({ 
  currentService, 
  destination,
  className = '',
  compact = false
}: EnhanceYourTripProps) {
  
  // Category previews - no direct partner links, just internal navigation
  const allCategories: CategoryPreview[] = [
    {
      id: "transfers",
      title: "Airport Transfers",
      description: "Book airport pickups & rides",
      icon: Car,
      gradient: "from-amber-500/10 to-orange-500/10",
      borderColor: "hover:border-amber-500/50",
      showFor: ["flights", "hotels"],
    },
    {
      id: "activities",
      title: "Tours & Activities",
      description: "Discover local experiences",
      icon: Ticket,
      gradient: "from-emerald-500/10 to-teal-500/10",
      borderColor: "hover:border-emerald-500/50",
      showFor: ["flights", "hotels", "cars"],
    },
    {
      id: "esim",
      title: "Travel eSIM",
      description: "Stay connected abroad",
      icon: Wifi,
      gradient: "from-muted to-muted",
      borderColor: "hover:border-cyan-500/50",
      showFor: ["flights", "hotels", "cars"],
    },
    {
      id: "luggage",
      title: "Luggage Storage",
      description: "Store bags securely",
      icon: Luggage,
      gradient: "from-muted to-muted",
      borderColor: "hover:border-purple-500/50",
      showFor: ["flights", "hotels"],
    },
    {
      id: "compensation",
      title: "Flight Compensation",
      description: "Claim up to €600",
      icon: Scale,
      gradient: "from-muted to-muted",
      borderColor: "hover:border-rose-500/50",
      showFor: ["flights"],
    },
  ];

  // Filter categories for current service
  const categories = allCategories.filter(cat => cat.showFor.includes(currentService));

  if (compact) {
    return (
      <section className={cn("py-8 border-t border-border/50", className)}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Enhance Your Trip</h3>
            </div>
            <Link to="/extras" className="text-sm text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categories.slice(0, 4).map((category) => (
              <Link to="/extras" key={category.id}>
                <Card 
                  className={cn(
                    "group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg h-full active:scale-[0.98] touch-manipulation rounded-2xl",
                    category.borderColor
                  )}
                >
                  <CardContent className="p-4 text-center">
                    <div className={cn(
                      "w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center",
                      `bg-gradient-to-br ${category.gradient}`
                    )}>
                      <category.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <h4 className="font-medium text-sm mb-1">{category.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{category.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-4">
            {AFFILIATE_DISCLOSURE_TEXT.short}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("py-12 sm:py-16 border-t border-border/50 bg-gradient-to-b from-transparent to-muted/20", className)}>
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-10">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/30">
            <Sparkles className="w-3 h-3 mr-1" />
            Complete Your Trip
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            Enhance Your{" "}
            <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
              {destination || "Travel"} Experience
            </span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Add transfers, activities, and essentials to your trip
          </p>
        </div>

        {/* Categories Grid - Links to /extras */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {categories.map((category, index) => (
            <Link to="/extras" key={category.id}>
              <Card
                className={cn(
                  "group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border-border/50 h-full active:scale-[0.98] touch-manipulation rounded-2xl",
                  category.borderColor,
                  "animate-in fade-in slide-in-from-bottom-4"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform",
                      `bg-gradient-to-br ${category.gradient}`
                    )}>
                      <category.icon className="w-6 h-6 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base mb-1 group-hover:text-primary transition-colors">
                        {category.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {category.description}
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full gap-2 text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 touch-manipulation rounded-xl min-h-[36px]"
                      >
                        View Options
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Trusted partners</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Instant confirmation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-foreground" />
            <span>Worldwide coverage</span>
          </div>
        </div>

        {/* Disclosure */}
        <p className="text-xs text-muted-foreground text-center mt-6 max-w-lg mx-auto">
          {AFFILIATE_DISCLOSURE_TEXT.short}
        </p>
        
        {/* View All Link */}
        <div className="text-center mt-6">
          <Link to="/extras">
            <Button className="gap-2 bg-gradient-to-r from-primary to-teal-500 rounded-2xl h-12 px-8 font-semibold touch-manipulation active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/20">
              View All Travel Extras
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
