 import { motion, type Variants } from "framer-motion";
import { Shield, Clock, Globe, Plane, Hotel, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { destinationPhotos, wideCityHeroPhotos } from "@/config/photos";
import type { DestinationCity } from "@/config/photos";
import cityHeroGlassSunset from "@/assets/city-hero-glass-sunset.jpg";

/**
 * Premium animated hero for SEO city landing pages
 * Features Ken Burns zoom effect on background image
 */

type ServiceType = "flights" | "hotels" | "combined";

interface AnimatedCityHeroProps {
  city: string;
  citySlug: string;
  serviceType: ServiceType;
  subtitle?: string;
  children?: React.ReactNode;
}

const serviceConfig = {
  flights: {
    icon: Plane,
    tagline: "NDC flights",
    color: "text-flights",
    bgColor: "bg-flights/10",
    borderColor: "border-flights/20",
  },
  hotels: {
    icon: Hotel,
    tagline: "hand-picked hotels",
    color: "text-hotels",
    bgColor: "bg-hotels/10",
    borderColor: "border-hotels/20",
  },
  combined: {
    icon: Globe,
    tagline: "flights and hotels",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
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
  combined: [
    { icon: Shield, text: "Secure Booking" },
    { icon: Globe, text: "500+ Airlines" },
    { icon: CheckCircle, text: "Best Price Guarantee" },
  ],
};

export default function AnimatedCityHero({
  city,
  citySlug,
  serviceType,
  subtitle,
  children,
}: AnimatedCityHeroProps) {
  const config = serviceConfig[serviceType];
  const badges = trustBadges[serviceType];
  
  // Get the current year + 1 for forward-looking SEO
  const dynamicYear = new Date().getFullYear() + 1;
  
  // Prefer wide 16:9 hero, fall back to square destination photo, then generic
  const wideHero = wideCityHeroPhotos[citySlug as DestinationCity];
  const cityPhoto = destinationPhotos[citySlug as DestinationCity];
  const heroSrc = wideHero?.src || cityPhoto?.src || cityHeroGlassSunset;
  const heroAlt = wideHero?.alt || cityPhoto?.alt || `Modern ${city} cityscape at sunset`;

  // Default subtitle based on service type
  const defaultSubtitle = `Book the best ${config.tagline} in ${city} via ZIVO.`;

  return (
    <section className="relative h-[60vh] min-h-[400px] flex items-end overflow-hidden">
      {/* Background Image with Ken Burns Animation */}
      {heroSrc && (
        <motion.img
          src={heroSrc}
          alt={heroAlt}
          className="absolute inset-0 w-full h-full object-cover"
           initial={{ scale: 1, x: 0, y: 0 }}
           animate={{ 
             scale: [1, 1.05, 1.03],
             x: [0, "-1%", "-2%"],
             y: [0, "-0.5%", "-1%"],
           }}
           transition={{ 
             duration: 20,
             ease: "easeInOut",
             repeat: Infinity,
             repeatType: "reverse"
           }}
          loading="eager"
          fetchPriority="high"
        />
      )}
      
      {/* Gradient Overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-background/30" />

      {/* Content */}
      <div className="relative z-10 w-full p-8 sm:p-12">
        <div className="container mx-auto max-w-7xl">
          {/* Main Title with Year Badge */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-primary-foreground uppercase tracking-tighter mb-4">
            {city}{" "}
            <span className={cn(
              serviceType === "flights" && "text-flights",
              serviceType === "hotels" && "text-hotels",
              serviceType === "combined" && "text-primary"
            )}>
              {dynamicYear}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-primary-foreground/80 max-w-xl mb-6">
            {subtitle || defaultSubtitle}
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap gap-4 sm:gap-6">
            {badges.map((badge) => (
              <div
                key={badge.text}
                className="flex items-center gap-2 text-sm text-primary-foreground/70"
              >
                <badge.icon className={cn("w-4 h-4", config.color)} />
                <span>{badge.text}</span>
              </div>
            ))}
          </div>

          {/* Optional children (search form overlay) */}
          {children && (
            <div className="mt-8">
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
