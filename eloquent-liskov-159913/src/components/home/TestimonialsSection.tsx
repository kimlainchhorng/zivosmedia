/**
 * Testimonials Section - Premium multi-card carousel with service accents
 */
import { useState, useCallback } from "react";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { motion, AnimatePresence } from "framer-motion";
import Star from "lucide-react/dist/esm/icons/star";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Quote from "lucide-react/dist/esm/icons/quote";
import { cn } from "@/lib/utils";

const serviceColorVars: Record<string, string> = {
  Flights: "--flights",
  "Price Alerts": "--primary",
  Hotels: "--hotels",
  "Car Rentals": "--cars",
  Support: "--success",
};

const testimonials = [
  { name: "Sarah Mitchell", role: "Frequent Flyer", rating: 5, text: "ZIVO made booking my family vacation incredibly easy. The price comparison saved us over $200 on flights alone. The checkout was seamless and secure.", avatar: "SM", service: "Flights" },
  { name: "Carlos Rivera", role: "Deal Hunter", rating: 5, text: "I love the price alerts feature. Got notified when my dream trip to Tokyo dropped in price and booked it instantly. Best travel platform I've used.", avatar: "CR", service: "Price Alerts" },
  { name: "Emily Thompson", role: "Weekend Explorer", rating: 5, text: "Finally a travel site that doesn't hide fees. What I saw was what I paid. The hotel options were excellent and booking took less than 2 minutes.", avatar: "ET", service: "Hotels" },
  { name: "James Kim", role: "Road Trip Enthusiast", rating: 4, text: "Great selection of car rentals. The flexible search with nearby airports found me a deal I wouldn't have found elsewhere. Highly recommend ZIVO.", avatar: "JK", service: "Car Rentals" },
  { name: "Aisha Patel", role: "Business Traveler", rating: 5, text: "Customer support was phenomenal when I needed to make changes to my booking. They responded within minutes. This is what premium service looks like.", avatar: "AP", service: "Support" },
  { name: "Marcus Johnson", role: "Points Optimizer", rating: 5, text: "Switched from Kayak and haven't looked back. The interface is cleaner, results are faster, and the ZIVO Miles program is an amazing bonus.", avatar: "MJ", service: "Flights" },
  { name: "Lisa Chen", role: "Spontaneous Traveler", rating: 5, text: "Booked a last-minute hotel in Barcelona through ZIVO and saved $150 compared to booking direct. The cancellation policy was clearly displayed too.", avatar: "LC", service: "Hotels" },
  { name: "David Martinez", role: "Family Planner", rating: 5, text: "The car rental comparison is unbeatable. Found a premium SUV for the price of a sedan. The partner checkout was smooth and transparent.", avatar: "DM", service: "Car Rentals" },
];

export default function TestimonialsSection() {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const itemsPerPage = 3;
  const totalPages = Math.ceil(testimonials.length / itemsPerPage);

  const goTo = useCallback((index: number) => {
    setDirection(index > page ? 1 : -1);
    setPage(index);
  }, [page]);

  const prev = useCallback(() => {
    setDirection(-1);
    setPage((p) => (p - 1 + totalPages) % totalPages);
  }, [totalPages]);

  const next = useCallback(() => {
    setDirection(1);
    setPage((p) => (p + 1) % totalPages);
  }, [totalPages]);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useVisibleInterval(next, reduceMotion ? null : 6000);

  const currentItems = testimonials.slice(page * itemsPerPage, page * itemsPerPage + itemsPerPage);

  return (
    <section className="py-16 sm:py-24 bg-muted/20 overflow-hidden" aria-label="Customer testimonials">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Loved by <span className="text-primary">travelers</span> everywhere
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Join thousands of happy travelers who book smarter with ZIVO.
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={page}
              custom={direction}
              initial={{ opacity: 0, x: direction * 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 80 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="grid grid-cols-1 md:grid-cols-3 gap-5"
            >
              {currentItems.map((t, i) => {
                const colorVar = serviceColorVars[t.service] || "--primary";
                return (
                  <motion.div
                    key={`${page}-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group"
                  >
                    <div className={cn(
                      "relative rounded-2xl bg-card border border-border/40 p-6 sm:p-7 h-full flex flex-col",
                      "hover:border-border/60 hover:shadow-lg transition-all duration-300"
                    )}>
                      {/* Top accent bar */}
                      <div
                        className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full"
                        style={{ backgroundColor: `hsl(var(${colorVar}))` }}
                      />

                      {/* Quote icon */}
                      <Quote
                        className="w-7 h-7 mb-4 opacity-30"
                        style={{ color: `hsl(var(${colorVar}))` }}
                      />

                      {/* Stars */}
                      <div className="flex gap-0.5 mb-4">
                        {Array.from({ length: 5 }).map((_, si) => (
                          <Star
                            key={si}
                            className={cn(
                              "w-4 h-4",
                              si < t.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"
                            )}
                          />
                        ))}
                      </div>

                      {/* Text */}
                      <p className="text-foreground/90 text-sm leading-relaxed flex-1 mb-6">
                        "{t.text}"
                      </p>

                      {/* Author */}
                      <div className="flex items-center gap-3 pt-4 border-t border-border/30">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
                          style={{ backgroundColor: `hsl(var(${colorVar}))` }}
                        >
                          {t.avatar}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{t.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground truncate">{t.role}</p>
                            <span
                              className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 text-primary-foreground"
                              style={{ backgroundColor: `hsl(var(${colorVar}))` }}
                            >
                              {t.service}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          <button type="button"
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-14 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-card border border-border/50 flex items-center justify-center hover:bg-muted hover:scale-110 active:scale-90 transition-all duration-200 shadow-sm touch-manipulation"
            aria-label="Previous testimonials"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button type="button"
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-14 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-card border border-border/50 flex items-center justify-center hover:bg-muted hover:scale-110 active:scale-90 transition-all duration-200 shadow-sm touch-manipulation"
            aria-label="Next testimonials"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button type="button"
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                "rounded-full transition-all duration-300 touch-manipulation min-w-[24px] min-h-[24px] flex items-center justify-center",
                i === page
                  ? "bg-primary w-8 h-2.5"
                  : "bg-muted-foreground/20 w-2.5 h-2.5 hover:bg-muted-foreground/40"
              )}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
