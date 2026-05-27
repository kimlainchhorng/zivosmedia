/**
 * EXPERIENCE GALLERY
 * Horizontal scroll lifestyle photos for hotels and extras
 */

import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ExperienceGalleryProps {
  service: "hotels" | "extras";
  title?: string;
  subtitle?: string;
  className?: string;
}

// Experience photos by service
const experiencePhotos = {
  hotels: [
    {
      src: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop&q=75&fm=webp&auto=format",
      alt: "Luxury hotel pool at sunset",
      label: "Pool & Wellness",
    },
    {
      src: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop&q=75&fm=webp&auto=format",
      alt: "Hotel spa treatment room",
      label: "Spa & Relaxation",
    },
    {
      src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop&q=75&fm=webp&auto=format",
      alt: "Fine dining restaurant",
      label: "Fine Dining",
    },
    {
      src: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop&q=75&fm=webp&auto=format",
      alt: "Modern hotel lobby",
      label: "Modern Lobbies",
    },
    {
      src: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=300&fit=crop&q=75&fm=webp&auto=format",
      alt: "Luxury hotel room with view",
      label: "Stunning Views",
    },
    {
      src: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop&q=75&fm=webp&auto=format",
      alt: "Resort beach cabana",
      label: "Beach Access",
    },
  ],
  extras: [
    {
      src: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop&q=75&fm=webp&auto=format",
      alt: "Airport transfer vehicle",
      label: "Airport Transfers",
    },
    {
      src: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400&h=300&fit=crop&q=75&fm=webp&auto=format",
      alt: "Guided city tour",
      label: "City Tours",
    },
    {
      src: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=400&h=300&fit=crop&q=75&fm=webp&auto=format",
      alt: "Theme park adventure",
      label: "Attractions",
    },
    {
      src: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop&q=75&fm=webp&auto=format",
      alt: "Water sports activity",
      label: "Water Activities",
    },
    {
      src: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop&q=75&fm=webp&auto=format",
      alt: "Mountain hiking adventure",
      label: "Outdoor Adventures",
    },
    {
      src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop&q=75&fm=webp&auto=format",
      alt: "Food tour experience",
      label: "Food Tours",
    },
  ],
};

const serviceColors = {
  hotels: {
    text: "text-amber-400",
    gradient: "from-amber-500/20 to-orange-500/10",
  },
  extras: {
    text: "text-pink-400",
    gradient: "from-muted to-muted",
  },
};

export default function ExperienceGallery({
  service,
  title = service === "hotels" ? "Hotel Experiences" : "Popular Activities",
  subtitle,
  className,
}: ExperienceGalleryProps) {
  const photos = experiencePhotos[service];
  const colors = serviceColors[service];

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

        {/* Horizontal Scroll Gallery */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {photos.map((photo, index) => (
              <div
                key={index}
                className={cn(
                  "group relative flex-shrink-0 w-[280px] rounded-2xl overflow-hidden",
                  "border border-border/50 bg-card/50",
                  "hover:shadow-lg transition-all duration-200 hover:-translate-y-1.5"
                )}
              >
                {/* Photo */}
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    width={400}
	                    height={300}
	                    loading="lazy"
	                    decoding="async"
	                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
	                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  
                  {/* Label */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className={cn(
                      "font-semibold text-primary-foreground text-sm transition-colors",
                      `group-hover:${colors.text}`
                    )}>
                      {photo.label}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </section>
  );
}
