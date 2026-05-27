import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Shield, Globe, Zap, Headphones, Star, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useImagePreload } from "@/hooks/useImagePreload";

// Hero images (imported as ES6 modules)
import heroFlightsImg from "@/assets/hero-flights.jpg";
import heroHotelsImg from "@/assets/hero-hotels.jpg";
import heroCarsImg from "@/assets/hero-cars.jpg";
import heroRidesImg from "@/assets/hero-rides.jpg";
import heroEatsImg from "@/assets/hero-eats.jpg";

/**
 * PREMIUM IMAGE HERO SECTION
 * Google Flights / Booking.com / Expedia quality
 * Full-width background images with overlay
 */

export type ServiceType = "flights" | "hotels" | "cars" | "rides" | "eats";

const heroContent = {
  flights: {
    headline: "Compare Flights from 500+ Airlines — Book Securely with Partners",
    subheadline: "Find real-time prices, compare options, and complete your booking securely with licensed airline partners.",
    image: heroFlightsImg,
    overlayGradient: "from-background/95 via-background/80 to-background/70",
    accentColor: "sky",
    textGradient: "from-sky-400 via-cyan-400 to-blue-400",
  },
  hotels: {
    headline: "Find the Best Hotel Deals Anywhere",
    subheadline: "Compare hotels, resorts, and stays from trusted partners worldwide.",
    image: heroHotelsImg,
    overlayGradient: "from-background/95 via-background/75 to-background/60",
    accentColor: "amber",
    textGradient: "from-amber-400 via-orange-400 to-yellow-400",
  },
  cars: {
    headline: "Compare & Rent Cars Worldwide",
    subheadline: "Find the right car at the best price from trusted rental partners.",
    image: heroCarsImg,
    overlayGradient: "from-background/95 via-background/75 to-background/60",
    accentColor: "violet",
    textGradient: "from-violet-400 via-purple-400 to-fuchsia-400",
  },
  rides: {
    headline: "Your Ride, On Demand",
    subheadline: "Request a ride and we'll connect you with available drivers in your area.",
    image: heroRidesImg,
    overlayGradient: "from-background/95 via-background/75 to-background/60",
    accentColor: "emerald",
    textGradient: "from-emerald-400 via-teal-400 to-green-400",
  },
  eats: {
    headline: "Delicious Food, Delivered",
    subheadline: "Discover and order from local restaurants. Fast delivery to your door.",
    image: heroEatsImg,
    overlayGradient: "from-background/95 via-background/75 to-background/60",
    accentColor: "orange",
    textGradient: "from-orange-400 via-amber-400 to-yellow-400",
  },
};

const trustBadgesByService: Record<ServiceType, { icon: LucideIcon; text: string }[]> = {
  flights: [
    { icon: Shield, text: "Secure Partner Checkout" },
    { icon: Zap, text: "Real-Time Prices" },
    { icon: Globe, text: "No Hidden Fees from ZIVO" },
    { icon: Headphones, text: "Mobile-Friendly Booking" },
  ],
  hotels: [
    { icon: Shield, text: "Secure & Trusted" },
    { icon: Globe, text: "500+ Partners" },
    { icon: Zap, text: "Real-Time Prices" },
    { icon: Headphones, text: "24/7 Support" },
  ],
  cars: [
    { icon: Shield, text: "Secure & Trusted" },
    { icon: Globe, text: "500+ Partners" },
    { icon: Zap, text: "Real-Time Prices" },
    { icon: Headphones, text: "24/7 Support" },
  ],
  rides: [
    { icon: Shield, text: "Safe & Reliable" },
    { icon: Clock, text: "Quick Response" },
    { icon: Star, text: "Top-Rated Drivers" },
    { icon: Headphones, text: "24/7 Support" },
  ],
  eats: [
    { icon: Clock, text: "Fast Delivery" },
    { icon: Star, text: "Top Restaurants" },
    { icon: Shield, text: "Quality Assured" },
    { icon: Headphones, text: "24/7 Support" },
  ],
};

interface ImageHeroProps {
  service: ServiceType;
  icon: LucideIcon;
  children: ReactNode;
}

export default function ImageHero({ 
  service, 
  icon: Icon,
  children 
}: ImageHeroProps) {
  const content = heroContent[service];
  const trustBadges = trustBadgesByService[service];

  // Preload hero image for LCP optimization
  useImagePreload({ src: content.image, enabled: true });

  return (
    <section className="relative overflow-hidden">
      {/* Full-width background image */}
      <div className="absolute inset-0">
        <img 
          src={content.image} 
          alt={`ZIVO ${service.charAt(0).toUpperCase() + service.slice(1)} - ${content.subheadline}`}
          width={1920}
          height={1080}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ aspectRatio: "16/9" }}
        />
        {/* Gradient overlay for text readability */}
        <div 
          className={cn("absolute inset-0 bg-gradient-to-b", content.overlayGradient)} 
          aria-hidden="true"
        />
        {/* Additional vignette for depth */}
        <div 
          className="absolute inset-0" style={{ boxShadow: "inset 0 0 150px 60px hsl(var(--background) / 0.4)" }} 
          aria-hidden="true"
        />
        {/* Bottom fade to background */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent" 
          aria-hidden="true"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-8 sm:pt-16 lg:pt-20 pb-8">
        {/* Header content */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Service icon badge */}
          <div className="inline-flex items-center gap-2 mb-5">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-xl border border-foreground/20",
              content.accentColor === "sky" && "bg-sky-500/30 shadow-sky-500/30",
              content.accentColor === "amber" && "bg-amber-500/30 shadow-amber-500/30",
              content.accentColor === "violet" && "bg-violet-500/30 shadow-violet-500/30",
              content.accentColor === "emerald" && "bg-emerald-500/30 shadow-emerald-500/30",
              content.accentColor === "orange" && "bg-orange-500/30 shadow-orange-500/30"
            )}>
              <Icon className={cn(
                "w-7 h-7",
                content.accentColor === "sky" && "text-sky-300",
                content.accentColor === "amber" && "text-amber-300",
                content.accentColor === "violet" && "text-violet-300",
                content.accentColor === "emerald" && "text-emerald-300",
                content.accentColor === "orange" && "text-orange-300"
              )} />
            </div>
          </div>
          
          {/* Headlines */}
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 text-primary-foreground leading-tight tracking-tight drop-shadow-lg">
            {content.headline.split(' ').slice(0, -2).join(' ')}{' '}
            <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", content.textGradient)}>
              {content.headline.split(' ').slice(-2).join(' ')}
            </span>
          </h1>
          
          <p className="text-base sm:text-lg lg:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-6 drop-shadow-md">
            {content.subheadline}
          </p>

          {/* Trust badges row */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {trustBadges.map((badge) => (
              <div
                key={badge.text}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full",
                  "bg-foreground/10 backdrop-blur-xl border border-foreground/20",
                  "text-xs sm:text-sm text-primary-foreground/90 shadow-lg"
                )}
              >
                <badge.icon className={cn(
                  "w-4 h-4",
                  content.accentColor === "sky" && "text-sky-400",
                  content.accentColor === "amber" && "text-amber-400",
                  content.accentColor === "violet" && "text-violet-400",
                  content.accentColor === "emerald" && "text-emerald-400",
                  content.accentColor === "orange" && "text-orange-400"
                )} />
                <span className="font-medium">{badge.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search form (children) */}
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
          {children}
        </div>
      </div>
    </section>
  );
}
