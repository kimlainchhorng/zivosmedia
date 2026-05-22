import { Shield, CreditCard, Search, Clock, BadgeCheck, Headphones, RefreshCw, Zap, Lock, Award } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import trustAirlinesBg from "@/assets/trust-airlines-bg.jpg";
import trustPartnersBg from "@/assets/trust-partners-bg.jpg";
import trustPricesBg from "@/assets/trust-prices-bg.jpg";
import trustSupportBg from "@/assets/trust-support-bg.jpg";

/**
 * TRUST SECTION
 * Premium trust badges and value propositions
 * Conversion-focused design
 */

export type ServiceType = "flights" | "hotels" | "cars";

interface TrustPoint {
  icon: LucideIcon;
  title: string;
  description: string;
  bg: string;
  gradient: string;
  iconRing: string;
}

const serviceContent: Record<ServiceType, {
  title: string;
  points: TrustPoint[];
  accentColor: string;
}> = {
  flights: {
    title: "Why Search with ZIVO?",
    accentColor: "sky",
    points: [
      {
        icon: Search,
        title: "500+ Airlines",
        description: "Compare all major & low-cost carriers",
        bg: trustAirlinesBg,
        gradient: "from-muted to-muted",
        iconRing: "ring-sky-400/30",
      },
      {
        icon: CreditCard,
        title: "Trusted Partners",
        description: "Book through licensed travel partners",
        bg: trustPartnersBg,
        gradient: "from-teal-500/20 to-emerald-300/10",
        iconRing: "ring-teal-400/30",
      },
      {
        icon: Zap,
        title: "Real-Time Prices",
        description: "Live fares, always up to date",
        bg: trustPricesBg,
        gradient: "from-amber-500/20 to-yellow-300/10",
        iconRing: "ring-amber-400/30",
      },
      {
        icon: Headphones,
        title: "24/7 Support",
        description: "Get help with your booking anytime",
        bg: trustSupportBg,
        gradient: "from-muted to-muted",
        iconRing: "ring-violet-400/30",
      },
    ],
  },
  hotels: {
    title: "Why Search with ZIVO?",
    accentColor: "amber",
    points: [
      {
        icon: Search,
        title: "Compare Sites",
        description: "Booking.com, Hotels.com & more in one search",
        bg: trustAirlinesBg,
        gradient: "from-muted to-muted",
        iconRing: "ring-sky-400/30",
      },
      {
        icon: RefreshCw,
        title: "Free Cancellation",
        description: "Flexible booking options available",
        bg: trustPartnersBg,
        gradient: "from-teal-500/20 to-emerald-300/10",
        iconRing: "ring-teal-400/30",
      },
      {
        icon: BadgeCheck,
        title: "Verified Reviews",
        description: "Real guest reviews from trusted sources",
        bg: trustPricesBg,
        gradient: "from-amber-500/20 to-yellow-300/10",
        iconRing: "ring-amber-400/30",
      },
      {
        icon: Headphones,
        title: "Partner Support",
        description: "Customer service from booking partners",
        bg: trustSupportBg,
        gradient: "from-muted to-muted",
        iconRing: "ring-violet-400/30",
      },
    ],
  },
  cars: {
    title: "Why Search with ZIVO?",
    accentColor: "violet",
    points: [
      {
        icon: Search,
        title: "Compare Providers",
        description: "Hertz, Avis, Enterprise & more",
        bg: trustAirlinesBg,
        gradient: "from-muted to-muted",
        iconRing: "ring-sky-400/30",
      },
      {
        icon: CreditCard,
        title: "No Hidden Fees",
        description: "Transparent pricing shown upfront",
        bg: trustPartnersBg,
        gradient: "from-teal-500/20 to-emerald-300/10",
        iconRing: "ring-teal-400/30",
      },
      {
        icon: Clock,
        title: "24/7 Pickup",
        description: "Airport and city locations",
        bg: trustPricesBg,
        gradient: "from-amber-500/20 to-yellow-300/10",
        iconRing: "ring-amber-400/30",
      },
      {
        icon: Shield,
        title: "Insurance Options",
        description: "Full protection plans available",
        bg: trustSupportBg,
        gradient: "from-muted to-muted",
        iconRing: "ring-violet-400/30",
      },
    ],
  },
};

// Partner logos (text-based for now)
const partners = {
  flights: ["American Airlines", "Delta", "United", "Southwest", "JetBlue", "Spirit"],
  hotels: ["Booking.com", "Hotels.com", "Expedia", "Agoda", "Trip.com"],
  cars: ["Hertz", "Avis", "Enterprise", "Budget", "National", "Alamo"],
};

interface TrustSectionProps {
  service: ServiceType;
  className?: string;
}

export default function TrustSection({ service, className = '' }: TrustSectionProps) {
  const content = serviceContent[service];
  
  return (
    <section className={cn("py-12 sm:py-16", className)}>
      <div className="container mx-auto px-4">
        {/* Title */}
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-10">
          {content.title}
        </h2>

        {/* Trust points grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {content.points.map((point) => (
            <div 
              key={point.title}
              className={cn(
                "relative p-5 sm:p-6 rounded-2xl bg-card border border-border/30 overflow-hidden",
                "transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]",
                "group"
              )}
            >
              {/* Icon with photographic background */}
              <div className={cn(
                "relative w-12 h-12 rounded-xl flex items-center justify-center mb-4 overflow-hidden ring-1 shadow-md transition-transform duration-300 group-hover:scale-110",
                point.iconRing
              )}>
	                <img src={point.bg} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
                <div className={cn("absolute inset-0 bg-gradient-to-br", point.gradient)} />
                <point.icon className="w-6 h-6 relative z-10 text-foreground drop-shadow-sm" />
              </div>
              <h3 className="font-bold text-sm sm:text-base mb-1">{point.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {point.description}
              </p>
            </div>
          ))}
        </div>

        {/* Partners row */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
            Trusted Partners
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {partners[service].map((partner) => (
              <div 
                key={partner}
                className="px-4 py-2 rounded-xl bg-muted/50 text-xs sm:text-sm text-muted-foreground font-medium hover:bg-muted/70 transition-all duration-200"
              >
                {partner}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom disclaimer */}
        <div className="mt-10 pt-6 border-t border-border/50 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Secure ZIVO Checkout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>Licensed Ticketing Partners</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Protected Booking</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 max-w-2xl mx-auto">
            ZIVO sells flight tickets as a sub-agent of licensed ticketing providers. Tickets issued by authorized partners.
          </p>
        </div>
      </div>
    </section>
  );
}
