/**
 * VEHICLE TYPE GALLERY
 * Photo-based car/ride categories with 4:3 aspect ratio
 * Uses carCategoryPhotos config for real car photos
 */

import { useNavigate } from "react-router-dom";
import { carCategoryPhotos, type CarCategory } from "@/config/photos";
import { Users, Briefcase, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface VehicleTypeGalleryProps {
  service: "cars" | "rides";
  title?: string;
  subtitle?: string;
  className?: string;
  onCategorySelect?: (category: CarCategory) => void;
}

const serviceColors = {
  cars: {
    text: "text-violet-400",
    border: "border-violet-500/30",
    shadow: "shadow-violet-500/20",
    gradient: "from-muted to-muted",
    bg: "bg-violet-500/10",
  },
  rides: {
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    shadow: "shadow-emerald-500/20",
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-500/10",
  },
};

// Ride vehicle types with real photos
const rideVehicleTypes = [
  {
    type: "sedan" as const,
    label: "Sedan",
    passengers: 4,
    description: "Standard comfort",
    src: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&h=450&fit=crop&q=75&fm=webp&auto=format",
    alt: "Sedan ride - comfortable 4-passenger vehicle",
  },
  {
    type: "suv" as const,
    label: "SUV",
    passengers: 6,
    description: "Extra space",
    src: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=600&h=450&fit=crop&q=75&fm=webp&auto=format",
    alt: "SUV ride - spacious 6-passenger vehicle",
  },
  {
    type: "premium" as const,
    label: "Premium",
    passengers: 4,
    description: "Luxury experience",
    src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=450&fit=crop&q=75&fm=webp&auto=format",
    alt: "Premium ride - luxury sedan experience",
  },
  {
    type: "xl" as const,
    label: "XL",
    passengers: 8,
    description: "Group travel",
    src: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=450&fit=crop&q=75&fm=webp&auto=format",
    alt: "XL ride - spacious van for groups",
  },
];

// All car categories from config
const carCategories: CarCategory[] = ["economy", "compact", "suv", "luxury", "van", "electric"];

export default function VehicleTypeGallery({
  service,
  title = service === "cars" ? "Browse by Car Type" : "Choose Your Ride",
  subtitle,
  className,
  onCategorySelect,
}: VehicleTypeGalleryProps) {
  const navigate = useNavigate();
  const colors = serviceColors[service];

  // Build vehicle data from config
  const vehicles = service === "cars"
    ? carCategories.map((cat) => ({
        type: cat,
        label: carCategoryPhotos[cat].label,
        passengers: carCategoryPhotos[cat].passengers,
        bags: carCategoryPhotos[cat].bags,
        src: carCategoryPhotos[cat].src,
        alt: carCategoryPhotos[cat].alt,
        width: carCategoryPhotos[cat].width,
        height: carCategoryPhotos[cat].height,
        isElectric: cat === "electric",
      }))
    : rideVehicleTypes.map((v) => ({
        ...v,
        bags: 0,
        width: 600,
        height: 450,
        isElectric: false,
      }));

  const handleClick = (vehicleType: string) => {
    if (service === "cars") {
      if (onCategorySelect) {
        onCategorySelect(vehicleType as CarCategory);
      } else {
        navigate(`/rent-car?type=${vehicleType}`);
      }
    }
    // For rides, could scroll to form or pre-select vehicle type
  };

  return (
    <section className={cn("py-12", className)}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            {title.split(" ").slice(0, -1).join(" ")}{" "}
            <span className={colors.text}>{title.split(" ").slice(-1)}</span>
          </h2>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Grid - 3 columns on desktop, 2 on mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {vehicles.map((vehicle, index) => (
            <button type="button"
              key={vehicle.type}
              onClick={() => handleClick(vehicle.type)}
              className={cn(
                "group relative overflow-hidden rounded-2xl",
                "border border-border/50 bg-card/50",
                "hover:shadow-xl transition-all duration-200 hover:-translate-y-1.5",
                "hover:border-violet-500/50 hover:shadow-violet-500/10"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Photo (4:3 aspect) */}
              <div className="aspect-[4/3] relative overflow-hidden">
                <img
                  src={vehicle.src}
                  alt={vehicle.alt}
                  width={vehicle.width}
	                  height={vehicle.height}
	                  loading="lazy"
	                  decoding="async"
	                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
	                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                
                {/* Electric Badge */}
                {vehicle.isElectric && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-emerald-500/90 text-primary-foreground text-xs font-medium rounded-full">
                    <Zap className="w-3 h-3" />
                    EV
                  </div>
                )}
                
                {/* Info Overlay (bottom) */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-bold text-lg text-primary-foreground mb-1 group-hover:text-foreground transition-all duration-200">
                    {vehicle.label}
                  </h3>
                  
                  {/* Specs Row */}
                  <div className="flex items-center gap-3 text-xs text-primary-foreground/80">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{vehicle.passengers}</span>
                    </div>
                    {vehicle.bags > 0 && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>{vehicle.bags}</span>
                      </div>
                    )}
                    {"description" in vehicle && vehicle.description && (
                      <span className="text-xs opacity-75">{vehicle.description}</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
