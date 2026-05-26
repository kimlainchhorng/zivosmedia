import { Sparkles, Waves, Mountain, Building2, Heart, Utensils, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Import images
import hotelLuxuryPool from "@/assets/hotel-luxury-pool.jpg";
import hotelBeachResort from "@/assets/hotel-beach-resort.jpg";
import hotelMountainLodge from "@/assets/hotel-mountain-lodge.jpg";
import hotelBoutique from "@/assets/hotel-boutique.jpg";
import hotelSpa from "@/assets/hotel-spa.jpg";
import hotelRoomLuxury from "@/assets/hotel-room-luxury.jpg";

/**
 * HOTEL EXPERIENCE GALLERY
 * Immersive visual showcase of hotel experiences
 * Inspires travelers with stunning imagery
 */

const experiences = [
  {
    id: 1,
    title: "Beach & Resort",
    subtitle: "Tropical paradise awaits",
    image: hotelBeachResort,
    icon: Waves,
    properties: "2,340+",
    color: "from-cyan-500 to-blue-500",
  },
  {
    id: 2,
    title: "Mountain Retreats",
    subtitle: "Alpine escapes",
    image: hotelMountainLodge,
    icon: Mountain,
    properties: "1,850+",
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: 3,
    title: "City Hotels",
    subtitle: "Urban adventures",
    image: hotelRoomLuxury,
    icon: Building2,
    properties: "5,200+",
    color: "from-violet-500 to-purple-500",
  },
  {
    id: 4,
    title: "Boutique Stays",
    subtitle: "Unique charm",
    image: hotelBoutique,
    icon: Heart,
    properties: "980+",
    color: "from-pink-500 to-rose-500",
  },
  {
    id: 5,
    title: "Spa & Wellness",
    subtitle: "Rejuvenate your soul",
    image: hotelSpa,
    icon: Sparkles,
    properties: "1,450+",
    color: "from-amber-500 to-orange-500",
  },
  {
    id: 6,
    title: "Luxury Resorts",
    subtitle: "Ultimate indulgence",
    image: hotelLuxuryPool,
    icon: Utensils,
    properties: "890+",
    color: "from-yellow-500 to-amber-500",
  },
];

interface HotelExperienceGalleryProps {
  onCategorySelect?: (category: string) => void;
  className?: string;
}

export default function HotelExperienceGallery({ onCategorySelect, className }: HotelExperienceGalleryProps) {
  return (
    <section className={cn("py-12 sm:py-16 lg:py-20 bg-muted/20", className)}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Discover Experiences
          </div>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            Find Your <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Perfect Stay</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From beachfront villas to mountain chalets, discover accommodations for every travel style
          </p>
        </div>

        {/* Experience Grid - Masonry-like */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {experiences.map((exp, index) => {
            const Icon = exp.icon;
            const isLarge = index === 0 || index === 5;
            
            return (
              <div
                key={exp.id}
                className={cn(
                  "group relative overflow-hidden rounded-xl sm:rounded-2xl cursor-pointer",
                  "transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5",
                  isLarge ? "row-span-2 h-64 sm:h-80 md:h-full" : "h-32 sm:h-40 md:h-48"
                )}
                onClick={() => onCategorySelect?.(exp.title)}
              >
                {/* Background Image */}
                <img
                  src={exp.image}
	                  alt={exp.title}
	                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
	                  loading="lazy"
	                  decoding="async"
	                />
                
                {/* Overlay */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-t opacity-80 group-hover:opacity-90 transition-opacity",
                  exp.color.replace('from-', 'from-').replace('to-', 'via-') + '/60 to-black/80'
                )} />
                
                {/* Content */}
                <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end">
                  {/* Icon Badge */}
                  <div className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 backdrop-blur-sm",
                    "bg-white/20 group-hover:bg-white/30 transition-all duration-200"
                  )}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="font-display text-base sm:text-lg lg:text-xl font-bold text-primary-foreground mb-0.5">
                    {exp.title}
                  </h3>
                  <p className="text-primary-foreground/70 text-xs sm:text-sm mb-2 hidden sm:block">
                    {exp.subtitle}
                  </p>
                  
                  {/* Properties Count */}
                  <div className="flex items-center justify-between">
                    <Badge className="bg-white/20 text-primary-foreground border-0 text-xs">
                      {exp.properties} properties
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-primary-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
                
                {/* Hover Ring */}
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl ring-2 ring-transparent group-hover:ring-white/30 transition-all" />
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <Button 
            variant="outline" 
            size="lg"
            className="gap-2 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50"
          >
            View All Categories
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
