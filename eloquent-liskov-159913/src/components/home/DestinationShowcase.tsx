import { useState } from "react";
import { Link } from "react-router-dom";
import Plane from "lucide-react/dist/esm/icons/plane";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Heart from "lucide-react/dist/esm/icons/heart";
import { motion } from "framer-motion";
import { toast } from "sonner";

import imgNewYork from "@/assets/dest-newyork.jpg";
import imgParis from "@/assets/dest-paris.jpg";
import imgTokyo from "@/assets/dest-tokyo.jpg";
import imgDubai from "@/assets/dest-dubai.jpg";
import imgCancun from "@/assets/dest-cancun.jpg";
import imgLondon from "@/assets/dest-london.jpg";

const destinations = [
  { city: "New York", country: "USA", code: "US", tagline: "The city that never sleeps", image: imgNewYork, from: "$89", trending: true },
  { city: "Paris", country: "France", code: "FR", tagline: "Romance and culture", image: imgParis, from: "$299", trending: true },
  { city: "Tokyo", country: "Japan", code: "JP", tagline: "Where tradition meets future", image: imgTokyo, from: "$449" },
  { city: "Dubai", country: "UAE", code: "AE", tagline: "Luxury beyond limits", image: imgDubai, from: "$379" },
  { city: "Cancún", country: "Mexico", code: "MX", tagline: "Paradise beaches await", image: imgCancun, from: "$199" },
  { city: "London", country: "UK", code: "GB", tagline: "History and charm", image: imgLondon, from: "$279" },
];

export default function DestinationShowcase() {
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const toggleSave = (e: React.MouseEvent, city: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(city)) {
        next.delete(city);
        toast("Removed from saved", { duration: 1500 });
      } else {
        next.add(city);
        toast.success(`${city} saved to wishlist!`, { duration: 1500 });
      }
      return next;
    });
  };

  return (
    <section className="py-16 sm:py-20" aria-label="Popular destinations" style={{ perspective: "1200px" }}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
        >
          <div>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-2"
            >
              Explore the world
            </motion.span>
            <h2 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">
              Popular <span className="text-primary">Destinations</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Explore the world's most popular cities with flights starting from unbelievably low fares.
            </p>
          </div>
          <motion.div whileHover={{ x: 4 }}>
            <Link to="/flights" className="text-primary font-semibold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all shrink-0">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((dest, i) => (
            <motion.div
              key={dest.city}
              initial={{ opacity: 0, y: 30, rotateX: -5 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{
                y: -8,
                rotateX: 2,
                rotateY: -1,
                scale: 1.02,
                transition: { type: "spring", stiffness: 300, damping: 20 },
              }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <Link
                to={`/flights?to=${encodeURIComponent(dest.city)}`}
                className="group relative rounded-3xl overflow-hidden aspect-[4/3] block touch-manipulation active:scale-[0.99]"
                style={{
                  boxShadow: [
                    "0 20px 50px -15px hsl(var(--foreground) / 0.1)",
                    "0 4px 12px -2px hsl(var(--primary) / 0.04)",
                    "inset 0 1px 1px hsl(var(--background) / 0.3)",
                  ].join(", "),
                  border: "1px solid hsl(var(--border) / 0.2)",
                }}
              >
                <img
	                  src={dest.image}
	                  alt={`${dest.city}, ${dest.country} — ${dest.tagline}`}
	                  loading="lazy"
	                  decoding="async"
	                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Depth gradient */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(180deg, transparent 30%, hsl(var(--background) / 0.3) 60%, hsl(var(--background) / 0.85) 100%)",
                  }}
                />
                {/* Glass shine */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--background) / 0.15) 0%, transparent 50%)",
                  }}
                />

                {/* Trending badge — 3D float */}
                {dest.trending && (
                  <motion.span
                    className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1"
                    style={{
                      boxShadow: "0 4px 12px -2px hsl(var(--primary) / 0.4), inset 0 1px 1px hsl(var(--background) / 0.15)",
                      transform: "translateZ(20px)",
                    }}
                  >
                    <TrendingUp className="w-3 h-3" /> Trending
                  </motion.span>
                )}

                {/* Save + Explore — glassmorphic */}
                <div className="absolute top-4 right-4 flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 sm:translate-y-2 sm:group-hover:translate-y-0">
                  <motion.button
                    onClick={(e) => toggleSave(e, dest.city)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center active:scale-90 transition-all touch-manipulation"
                    style={{
                      background: "hsl(var(--card) / 0.7)",
                      backdropFilter: "blur(12px)",
                      boxShadow: "0 4px 12px -2px hsl(var(--foreground) / 0.1), inset 0 1px 1px hsl(var(--background) / 0.4)",
                    }}
                    aria-label={`Save ${dest.city}`}
                  >
                    <Heart className={`w-4 h-4 transition-colors ${saved.has(dest.city) ? "text-destructive fill-current" : "text-foreground"}`} />
                  </motion.button>
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    className="px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5"
                    style={{
                      background: "hsl(var(--primary))",
                      color: "hsl(var(--primary-foreground))",
                      boxShadow: "0 4px 14px -2px hsl(var(--primary) / 0.4), inset 0 1px 1px hsl(var(--background) / 0.15)",
                    }}
                  >
                    Explore <ArrowRight className="w-3 h-3" />
                  </motion.span>
                </div>

                {/* Content — elevated layer */}
                <div className="absolute bottom-0 left-0 right-0 p-5" style={{ transform: "translateZ(10px)" }}>
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-foreground font-bold text-xl tracking-tight" style={{ textShadow: "0 2px 8px hsl(var(--background) / 0.5)" }}>
                        {dest.city}
                      </h3>
                      <p className="text-muted-foreground text-sm">{dest.code} · {dest.country} · {dest.tagline}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs flex items-center gap-1">
                        <Plane className="w-3 h-3" /> Flights from
                      </p>
                      <p className="text-foreground font-black text-xl" style={{ textShadow: "0 2px 8px hsl(var(--background) / 0.5)" }}>
                        {dest.from}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
