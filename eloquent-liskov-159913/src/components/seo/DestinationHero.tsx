import { Badge } from "@/components/ui/badge";
import { Shield, Clock, Globe, Plane, Hotel, Car, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Premium photo hero for destination SEO pages
 */

type ServiceType = 'flights' | 'hotels' | 'cars';

interface DestinationHeroProps {
  serviceType: ServiceType;
  title: string;
  subtitle: string;
  backgroundImage?: string;
  children?: React.ReactNode;
}

const serviceConfig = {
  flights: {
    icon: Plane,
    badge: "Search Flights",
    color: "text-flights",
    bgColor: "bg-flights/10",
    borderColor: "border-flights/20",
    overlayGradient: "from-slate-950/90 via-blue-950/60 to-slate-950/50"
  },
  hotels: {
    icon: Hotel,
    badge: "Compare Hotel Prices",
    color: "text-hotels",
    bgColor: "bg-hotels/10",
    borderColor: "border-hotels/20",
    overlayGradient: "from-slate-950/90 via-amber-950/60 to-slate-950/50"
  },
  cars: {
    icon: Car,
    badge: "Compare Rental Cars",
    color: "text-cars",
    bgColor: "bg-cars/10",
    borderColor: "border-cars/20",
    overlayGradient: "from-slate-950/90 via-violet-950/60 to-slate-950/50"
  }
};

const trustBadges = {
  flights: [
    { icon: Shield, text: "Secure Booking" },
    { icon: Globe, text: "500+ Airlines" },
    { icon: Clock, text: "24/7 Support" },
  ],
  hotels: [
    { icon: Shield, text: "Secure Booking" },
    { icon: CheckCircle, text: "No Booking Fees" },
    { icon: Clock, text: "24/7 Support" },
  ],
  cars: [
    { icon: Shield, text: "Secure Booking" },
    { icon: CheckCircle, text: "No Booking Fees" },
    { icon: Clock, text: "Free Cancellation" },
  ]
};

export default function DestinationHero({
  serviceType,
  title,
  subtitle,
  backgroundImage,
  children
}: DestinationHeroProps) {
  const config = serviceConfig[serviceType];
  const Icon = config.icon;
  const badges = trustBadges[serviceType];

  return (
    <section className="relative min-h-[500px] py-16 sm:py-24 overflow-hidden">
      {/* Background Image with Overlay */}
      {backgroundImage && (
        <>
          <div className="absolute inset-0">
            <img
              src={backgroundImage}
	              alt={`${title} destination`}
	              className="w-full h-full object-cover"
	              loading="eager"
	              decoding="async"
	              fetchPriority="high"
	            />
          </div>
          <div className={cn(
            "absolute inset-0 bg-gradient-to-b",
            config.overlayGradient
          )} />
        </>
      )}
      
      {/* Fallback solid background */}
      {!backgroundImage && (
        <div className={cn(
          "absolute inset-0",
          serviceType === 'flights' && "bg-flights-light",
          serviceType === 'hotels' && "bg-hotels-light",
          serviceType === 'cars' && "bg-cars-light"
        )} />
      )}

      <div className="container mx-auto px-4 relative z-10">
        {/* Page Title */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6",
            config.bgColor,
            config.borderColor,
            "border backdrop-blur-sm"
          )}>
            <Icon className={cn("w-4 h-4", config.color)} />
            <span className={backgroundImage ? "text-primary-foreground/80" : "text-muted-foreground"}>
              {config.badge}
            </span>
          </div>
          
          <h1 className={cn(
            "text-display mb-4",
            backgroundImage && "text-primary-foreground"
          )}>
            {title}
          </h1>
          
          <p className={cn(
            "text-body-lg mb-8",
            backgroundImage ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {subtitle}
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-4">
            {badges.map((badge) => (
              <div
                key={badge.text}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  backgroundImage ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                <badge.icon className={cn("w-4 h-4", config.color)} />
                <span>{badge.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search Form (passed as children) */}
        {children}
      </div>
    </section>
  );
}
