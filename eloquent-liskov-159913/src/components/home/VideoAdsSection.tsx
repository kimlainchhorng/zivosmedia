/**
 * VideoAdsSection - Service highlight carousel with design-token colors
 */
import { useState } from "react";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { motion, AnimatePresence } from "framer-motion";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import CarFront from "lucide-react/dist/esm/icons/car-front";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Car from "lucide-react/dist/esm/icons/car";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const serviceHighlights = [
  {
    id: "flights",
    title: "Search Flights",
    subtitle: "Compare available flight options from travel partners",
    cta: "Search Flights",
    href: "/flights",
    icon: Plane,
    colorVar: "--flights",
  },
  {
    id: "hotels",
    title: "Find Hotels",
    subtitle: "Compare available stays from lodging partners",
    cta: "Find Hotels",
    href: "/hotels",
    icon: Hotel,
    colorVar: "--hotels",
  },
  {
    id: "rides",
    title: "Request Rides",
    subtitle: "Book rides with route details and live availability",
    cta: "Book a Ride",
    href: "/rides/hub",
    icon: Car,
    colorVar: "--rides",
  },
  {
    id: "eats",
    title: "Order Eats",
    subtitle: "Browse restaurants, menus, and delivery options",
    cta: "Order Now",
    href: "/eats",
    icon: UtensilsCrossed,
    colorVar: "--eats",
  },
  {
    id: "cars",
    title: "Rent Cars",
    subtitle: "Browse available rental options for your trip",
    cta: "Rent a Car",
    href: "/rent-car",
    icon: CarFront,
    colorVar: "--cars",
  },
];

export default function VideoAdsSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useVisibleInterval(
    () => setActiveIndex((prev) => (prev + 1) % serviceHighlights.length),
    reduceMotion ? null : 5000,
  );

  const active = serviceHighlights[activeIndex];
  const Icon = active.icon;

  return (
    <section className="section-padding" aria-label="Featured services">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">Explore ZIVO</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Featured <span className="text-primary">Services</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Open the service you need and compare current options from ZIVO partners.
          </p>
        </motion.div>

        {/* Main service card */}
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden h-[280px] sm:h-[340px] border border-border/30">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 flex items-center"
                style={{
                  background: `linear-gradient(135deg, hsl(var(${active.colorVar}) / 0.9), hsl(var(${active.colorVar}) / 0.6))`,
                }}
              >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: "radial-gradient(circle at 50% 50%, white 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }} />

                {/* Content */}
                <div className="relative z-10 flex items-center justify-between w-full px-8 sm:px-12">
                  <div className="max-w-md">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                        style={{ backgroundColor: `hsl(var(${active.colorVar}))` }}
                      >
                        <Icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <h3 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-2">{active.title}</h3>
                      <p className="text-primary-foreground/80 text-lg mb-6">{active.subtitle}</p>
                      <Link
                        to={active.href}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-background text-foreground rounded-xl font-semibold hover:bg-background/90 transition-all active:scale-[0.97] touch-manipulation"
                      >
                        {active.cta}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </motion.div>
                  </div>

                  {/* Right side decorative icon */}
                  <div className="hidden sm:flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center">
                      <Icon className="w-16 h-16 text-primary-foreground/40" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots navigation */}
          <div className="flex items-center justify-center gap-2 mt-5">
            {serviceHighlights.map((promo, i) => (
              <button type="button"
                key={promo.id}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "rounded-full transition-all duration-300 touch-manipulation min-w-[24px] min-h-[24px] flex items-center justify-center",
                  i === activeIndex
                    ? "w-8 h-3"
                    : "bg-muted-foreground/20 hover:bg-muted-foreground/40 w-3 h-3"
                )}
                style={i === activeIndex ? { backgroundColor: `hsl(var(${promo.colorVar}))` } : undefined}
                aria-label={`View ${promo.title}`}
              />
            ))}
          </div>

          {/* Mini service cards row */}
          <div className="flex gap-3 mt-6 overflow-x-auto pb-2 scrollbar-hide">
            {serviceHighlights.map((promo, i) => {
              const PIcon = promo.icon;
              return (
                <button type="button"
                  key={promo.id}
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 touch-manipulation active:scale-[0.97]",
                    i === activeIndex
                      ? "bg-card/80 text-foreground"
                      : "border-border/50 bg-card/60 text-muted-foreground hover:border-border"
                  )}
                  style={i === activeIndex ? {
                    borderColor: `hsl(var(${promo.colorVar}) / 0.5)`,
                    color: `hsl(var(${promo.colorVar}))`,
                    backgroundColor: `hsl(var(${promo.colorVar}) / 0.08)`,
                  } : undefined}
                >
                  <PIcon className="w-4 h-4" />
                  <span className="text-sm font-medium whitespace-nowrap">{promo.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
