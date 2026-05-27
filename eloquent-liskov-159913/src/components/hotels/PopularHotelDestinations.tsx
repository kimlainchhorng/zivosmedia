/**
 * Popular Hotel Destinations Grid
 * 1:1 photo tiles for high conversion
 */

import { Link } from "react-router-dom";
import { destinationPhotos } from "@/config/photos";
import type { DestinationCity } from "@/config/photos";
import { Sparkles } from "lucide-react";

const popularCities: { city: string; slug: DestinationCity }[] = [
  { city: "New York", slug: "new-york" },
  { city: "Los Angeles", slug: "los-angeles" },
  { city: "Miami", slug: "miami" },
  { city: "Las Vegas", slug: "las-vegas" },
  { city: "Paris", slug: "paris" },
  { city: "Tokyo", slug: "tokyo" },
  { city: "London", slug: "london" },
  { city: "Dubai", slug: "dubai" },
];

export default function PopularHotelDestinations() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-bold">Popular Destinations</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {popularCities.map(({ city, slug }) => {
            const photo = destinationPhotos[slug];
            return (
              <Link
                key={slug}
                to={`/hotels?destination=${encodeURIComponent(city)}`}
                className="group relative aspect-square rounded-xl overflow-hidden"
              >
                {/* Image */}
                <img
                  src={photo?.src || `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=400&fit=crop&q=75&fm=webp`}
                  alt={`Hotels in ${city}`}
	                  className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-700"
	                  loading="lazy"
	                  decoding="async"
	                  width={400}
                  height={400}
                />
                
                {/* Multi-layer overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-primary-foreground font-bold text-lg">{city}</h3>
                  <p className="text-primary-foreground/70 text-sm">{photo?.country || 'Explore hotels'}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
