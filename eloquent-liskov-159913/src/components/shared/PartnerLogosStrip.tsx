/**
 * PARTNER LOGOS STRIP
 * Scrolling partner logos for trust building
 * Supports flights, hotels, and cars
 */

import { cn } from "@/lib/utils";

interface PartnerLogosStripProps {
  service: "flights" | "hotels" | "cars";
  title?: string;
  className?: string;
}

// Partner logos by service (using text-based logos for now)
const partnerLogos = {
  flights: [
    { name: "Delta", color: "#001689" },
    { name: "United", color: "#002244" },
    { name: "American", color: "#0C2340" },
    { name: "Southwest", color: "#304CB2" },
    { name: "JetBlue", color: "#003876" },
    { name: "Alaska", color: "#01426A" },
    { name: "Spirit", color: "#FFCD00" },
    { name: "Frontier", color: "#008522" },
    { name: "British Airways", color: "#075AAA" },
    { name: "Lufthansa", color: "#05164D" },
    { name: "Emirates", color: "#D71921" },
    { name: "Air France", color: "#002157" },
  ],
  hotels: [
    { name: "Marriott", color: "#A6093D" },
    { name: "Hilton", color: "#104C97" },
    { name: "Hyatt", color: "#000000" },
    { name: "IHG", color: "#00AA4F" },
    { name: "Wyndham", color: "#004990" },
    { name: "Best Western", color: "#003366" },
    { name: "Radisson", color: "#003366" },
    { name: "Four Seasons", color: "#1E1E1E" },
    { name: "Accor", color: "#1E2548" },
    { name: "Choice Hotels", color: "#0033A0" },
  ],
  cars: [
    { name: "Hertz", color: "#FFD100" },
    { name: "Enterprise", color: "#006341" },
    { name: "Avis", color: "#D42323" },
    { name: "Budget", color: "#FF6900" },
    { name: "National", color: "#006341" },
    { name: "Alamo", color: "#E31837" },
    { name: "Dollar", color: "#D41C35" },
    { name: "Thrifty", color: "#0066B3" },
    { name: "Sixt", color: "#FF5F00" },
    { name: "Europcar", color: "#008243" },
  ],
};

const serviceColors = {
  flights: "text-sky-400",
  hotels: "text-amber-400",
  cars: "text-violet-400",
};

export default function PartnerLogosStrip({
  service,
  title,
  className,
}: PartnerLogosStripProps) {
  const partners = partnerLogos[service];
  const defaultTitle = service === "flights" 
    ? "Compare prices from 500+ airlines" 
    : service === "hotels" 
      ? "Search across top hotel brands" 
      : "Rent from trusted providers";

  return (
    <section className={cn("py-10 overflow-hidden", className)}>
      <div className="container mx-auto px-4 mb-6">
        <p className="text-center text-sm text-muted-foreground">
          {title || defaultTitle}
        </p>
      </div>

      {/* Scrolling Container */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        {/* Scrolling logos */}
        <div className="flex animate-marquee">
          {[...partners, ...partners].map((partner, index) => (
            <div
              key={`${partner.name}-${index}`}
              className={cn(
                "flex-shrink-0 mx-6 px-5 py-3 rounded-xl",
                "bg-muted/50 border border-border/50",
                "text-sm font-semibold text-muted-foreground",
                "hover:text-foreground hover:border-border transition-all duration-200",
                "grayscale hover:grayscale-0"
              )}
            >
              {partner.name}
            </div>
          ))}
        </div>
      </div>

      {/* Add marquee animation to global styles */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
