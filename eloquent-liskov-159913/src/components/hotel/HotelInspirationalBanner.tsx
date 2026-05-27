import { Sparkles, ArrowRight, Star, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Import image
import hotelLuxuryPool from "@/assets/hotel-luxury-pool.jpg";

/**
 * HOTEL INSPIRATIONAL BANNER
 * Full-width visual CTA banner with stunning imagery
 */

interface HotelInspirationalBannerProps {
  className?: string;
}

export default function HotelInspirationalBanner({ className }: HotelInspirationalBannerProps) {
  return (
    <section className={cn("relative overflow-hidden", className)}>
      {/* Full-width Background Image */}
      <div className="relative h-[400px] sm:h-[500px] lg:h-[600px]">
        <img
          src={hotelLuxuryPool}
          alt="Luxury resort pool"
	          className="absolute inset-0 w-full h-full object-cover"
	          loading="eager"
	          decoding="async"
	          fetchPriority="high"
	        />
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 text-amber-300 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Limited Time Offer
            </div>
            
            {/* Headline */}
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
              Your Dream <br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Getaway Awaits
              </span>
            </h2>
            
            {/* Description */}
            <p className="text-primary-foreground/80 text-base sm:text-lg mb-6 max-w-md">
              Compare prices from 100+ booking sites and find the perfect hotel at the best rate. No hidden fees, no surprises.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 text-primary-foreground/70 text-sm">
                <Star className="w-4 h-4 text-amber-400" />
                <span>4.8/5 Rating</span>
              </div>
              <div className="flex items-center gap-2 text-primary-foreground/70 text-sm">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Secure Booking</span>
              </div>
              <div className="flex items-center gap-2 text-primary-foreground/70 text-sm">
                <Clock className="w-4 h-4 text-foreground" />
                <span>24/7 Support</span>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-primary-foreground shadow-lg shadow-amber-500/30 gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Explore Deals
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-white/30 text-primary-foreground hover:bg-white/10 backdrop-blur-sm"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>
    </section>
  );
}
