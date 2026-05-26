/**
 * HeroSection — Cinematic 4D crossfade hero with reactive service cards
 * Smooth crossfade (no flash), cards & CTAs sync with slide changes
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Search from "lucide-react/dist/esm/icons/search";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import ArrowDown from "lucide-react/dist/esm/icons/arrow-down";
import Plane from "lucide-react/dist/esm/icons/plane";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import CarFront from "lucide-react/dist/esm/icons/car-front";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";

import heroMaldives from "@/assets/hero-maldives.jpg";
import heroSantorini from "@/assets/hero-santorini.jpg";
import heroDubai from "@/assets/hero-dubai.jpg";
import heroBali from "@/assets/hero-bali.jpg";

import svcFlights from "@/assets/svc-flights-premium.jpg";
import svcHotels from "@/assets/svc-hotels-premium.jpg";
import svcCars from "@/assets/svc-cars-premium.jpg";
import svcRides from "@/assets/svc-rides-premium.jpg";
import svcEats from "@/assets/svc-eats-premium.jpg";

const heroSlides = [
  { src: heroMaldives, alt: "Luxury Maldives overwater bungalows", tagline: "Paradise awaits you", location: "Maldives", accent: "196 100% 47%" },
  { src: heroSantorini, alt: "Santorini sunset with blue domes", tagline: "Explore iconic destinations", location: "Santorini", accent: "25 95% 55%" },
  { src: heroDubai, alt: "Dubai skyline at night", tagline: "Experience the extraordinary", location: "Dubai", accent: "45 93% 58%" },
  { src: heroBali, alt: "Bali rice terraces at sunrise", tagline: "Discover hidden wonders", location: "Bali", accent: "142 70% 45%" },
];

const floatingServices = [
  { icon: Plane, label: "Flights", image: svcFlights, href: "/flights", cssVar: "var(--flights)", cta: "Search Flights" },
  { icon: Hotel, label: "Hotels", image: svcHotels, href: "/hotels", cssVar: "var(--hotels)", cta: "Find Hotels" },
  { icon: CarFront, label: "Rental", image: svcCars, href: "/rent-car", cssVar: "var(--cars)", cta: "Rent a Car" },
  { icon: Car, label: "Rides", image: svcRides, href: "/rides/hub", cssVar: "var(--rides)", cta: "Book Ride" },
  { icon: UtensilsCrossed, label: "Food", image: svcEats, href: "/eats", cssVar: "var(--eats)", cta: "Order Food" },
];

const stats = [
  { value: "500+", label: "Airlines" },
  { value: "190", label: "Countries" },
  { value: "2M+", label: "Travelers" },
];

const SLIDE_DURATION = 5000;

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isCambodia = (typeof localStorage !== "undefined" && localStorage.getItem("zivo_country") === "KH");
  const visibleFloatingServices = isCambodia ? floatingServices : floatingServices.filter((s) => s.label !== "Rides");

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.3, 0.7]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    setProgress(0);
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval || progressInterval) return;
      interval = setInterval(nextSlide, SLIDE_DURATION);
      progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 100 / (SLIDE_DURATION / 50), 100));
      }, 50);
    };
    const stop = () => {
      if (interval) { clearInterval(interval); interval = null; }
      if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start(); else stop();
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [nextSlide, currentSlide]);

  const goToSlide = (i: number) => { setCurrentSlide(i); setProgress(0); };

  const scrollToSearch = () => {
    const el = document.getElementById("hero-search-card");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const slide = heroSlides[currentSlide];

  return (
    <section ref={containerRef} className="relative overflow-hidden bg-background" aria-label="Hero banner">
      {/* ─── MOBILE ─── */}
      <div className="lg:hidden relative min-h-[85vh] flex flex-col justify-end" style={{ perspective: "1200px" }}>
        {/* Crossfade: all images stacked, only active one is opacity-1 */}
        {heroSlides.map((s, i) => (
          <motion.img
            key={i}
            src={s.src}
            alt={s.alt}
            animate={{ opacity: i === currentSlide ? 1 : 0, scale: i === currentSlide ? 1.02 : 1.08 }}
            transition={{ opacity: { duration: 1.2, ease: "easeInOut" }, scale: { duration: 6, ease: "linear" } }}
            className="absolute inset-0 w-full h-full object-cover will-change-[opacity,transform]"
            style={{ zIndex: i === currentSlide ? 1 : 0 }}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : undefined}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-[2]" />

        <div className="relative z-10 px-5 pb-8 pt-20">
          <AnimatePresence mode="wait">
            <motion.p
              key={`m-tag-${currentSlide}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="text-primary text-sm font-semibold tracking-widest uppercase mb-3"
            >
              {slide.tagline}
            </motion.p>
          </AnimatePresence>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-3xl sm:text-4xl font-black text-foreground leading-[1.1] tracking-tight mb-4"
          >
            Flights. Hotels. Cars.{"\n"}
            <span className="text-primary">All in One Place.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex gap-3"
          >
            <Button size="lg" onClick={scrollToSearch} className="flex-1 h-13 text-base font-semibold rounded-xl gap-2 touch-manipulation">
              <Search className="w-5 h-5" /> Search Now <ArrowDown className="w-4 h-4" />
            </Button>
          </motion.div>

          <div className="flex gap-2 mt-6 justify-center">
            {heroSlides.map((_, i) => (
              <button type="button" key={i} onClick={() => goToSlide(i)} className="relative rounded-full overflow-hidden touch-manipulation min-w-[24px] min-h-[24px] flex items-center justify-center" aria-label={`Slide ${i + 1}`}>
                <div className={`transition-all duration-300 ${i === currentSlide ? "w-8 h-2.5 bg-primary/30" : "w-2.5 h-2.5 bg-muted-foreground/30"} rounded-full`} />
                {i === currentSlide && <div className="absolute left-0 top-0 h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── DESKTOP — Full 3D/4D Cinematic ─── */}
      <div className="hidden lg:block relative min-h-[95vh]" style={{ perspective: "1400px" }}>
        {/* Crossfade background — all images stacked, smooth opacity blend */}
        <motion.div className="absolute inset-0" style={{ y: bgY }}>
          {heroSlides.map((s, i) => (
            <motion.img
              key={i}
              src={s.src}
              alt={s.alt}
              animate={{
                opacity: i === currentSlide ? 1 : 0,
                scale: i === currentSlide ? 1.05 : 1.12,
              }}
              transition={{
                opacity: { duration: 1.4, ease: [0.4, 0, 0.2, 1] },
                scale: { duration: 8, ease: "linear" },
              }}
              className="absolute inset-0 w-full h-full object-cover will-change-[opacity,transform]"
              style={{ zIndex: i === currentSlide ? 1 : 0 }}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
            />
          ))}
        </motion.div>

        {/* Depth overlays */}
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-background/85 via-background/40 to-transparent" />
        <motion.div className="absolute inset-0 z-[2]" style={{ opacity: overlayOpacity, background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 50%)" }} />
        <div className="absolute inset-0 z-[2]" style={{ background: "radial-gradient(ellipse at 80% 50%, transparent 30%, hsl(var(--background) / 0.4) 100%)" }} />

        {/* Animated color wash that syncs with slide — 4D depth layer */}
        <motion.div
          key={`wash-${currentSlide}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.12 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 z-[3] pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 70% 60%, hsl(${slide.accent} / 0.4), transparent 70%)` }}
        />

        {/* Floating 3D service cards — reactive to slide changes */}
        <div className="absolute right-12 xl:right-24 top-1/2 -translate-y-1/2 z-20 hidden xl:flex flex-col gap-4" style={{ perspective: "800px" }}>
          {visibleFloatingServices.map((svc, i) => (
            <motion.div
              key={svc.label}
              initial={{ opacity: 0, x: 80, rotateY: -25 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 0.7, delay: 0.6 + i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <Link to={svc.href}>
                <motion.div
                  whileHover={{ scale: 1.1, rotateY: 10, rotateX: -3, z: 40 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    y: [0, -5 - i * 0.5, 0],
                    rotateX: [0, 0.8, 0],
                    rotateZ: [0, 0.3, 0],
                  }}
                  transition={{
                    y: { duration: 2.5 + i * 0.4, repeat: Infinity, ease: "easeInOut" },
                    rotateX: { duration: 3.5 + i * 0.3, repeat: Infinity, ease: "easeInOut" },
                    rotateZ: { duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut" },
                    scale: { type: "spring", stiffness: 400, damping: 20 },
                  }}
                  className="relative w-[185px] h-[82px] rounded-2xl overflow-hidden cursor-pointer group"
                  style={{
                    transformStyle: "preserve-3d",
                    boxShadow: `0 10px 40px -8px hsl(${svc.cssVar} / 0.4), 0 4px 12px -4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.15)`,
                  }}
                >
	                  <img src={svc.image} alt={svc.label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-115" loading="lazy" decoding="async" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, hsl(${svc.cssVar} / 0.55), hsl(${svc.cssVar} / 0.2))` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* Holographic shimmer on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                    background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 45%, rgba(255,255,255,0.1) 50%, transparent 55%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s ease-in-out infinite",
                  }} />

                  {/* Reactive pulse on slide change */}
                  <motion.div
                    key={`pulse-${currentSlide}-${i}`}
                    initial={{ opacity: 0.6, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.3 }}
                    transition={{ duration: 0.8, delay: i * 0.08 }}
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ border: `2px solid hsl(${svc.cssVar} / 0.5)` }}
                  />

                  <div className="relative z-10 flex items-center gap-3 p-4 h-full">
                    <motion.div
                      key={`icon-${currentSlide}-${i}`}
                      animate={{ rotate: [0, -8, 0] }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
                    >
                      <svc.icon className="w-5 h-5 text-white drop-shadow-md" />
                    </motion.div>
                    <div>
                      <p className="text-white font-bold text-sm drop-shadow-md">{svc.label}</p>
                      <p className="text-white/70 text-[10px] font-medium">Explore →</p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Main content — parallax text layer */}
        <motion.div className="relative z-10 h-full min-h-[95vh] flex items-center" style={{ y: textY }}>
          <div className="container mx-auto px-8 xl:px-16">
            <div className="max-w-2xl" style={{ transformStyle: "preserve-3d" }}>
              {/* Location pill — syncs with slide */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-8"
                style={{
                  background: "hsl(var(--primary) / 0.15)",
                  border: "1px solid hsl(var(--primary) / 0.25)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentSlide}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm font-semibold text-primary tracking-wide"
                  >
                    📍 {slide.location} — Trending Now
                  </motion.span>
                </AnimatePresence>
              </motion.div>

              {/* Headline with synced tagline */}
              <motion.h1
                initial={{ opacity: 0, y: 40, rotateX: -10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl xl:text-7xl font-black text-foreground leading-[1.05] tracking-tighter mb-6"
                style={{ textShadow: "0 4px 30px hsl(var(--background) / 0.5)", transformStyle: "preserve-3d" }}
              >
                <span className="block mt-2">
                  Flights. Hotels. Cars.
                </span>
                <span className="block text-3xl xl:text-4xl font-bold text-muted-foreground/80 mt-1">
                  Rides. Food. & More.
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-lg"
              >
                Compare real-time prices from 500+ airlines and trusted travel partners. 
                Book rides, order food, rent cars — all in one super app.
              </motion.p>

              {/* CTA buttons — reactive glow syncs with slide accent */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.55 }}
                className="flex flex-wrap gap-4 mb-12"
              >
                <motion.div
                  key={`cta-glow-${currentSlide}`}
                  animate={{ boxShadow: [
                    `0 8px 32px -4px hsl(var(--primary) / 0.3)`,
                    `0 12px 48px -4px hsl(${slide.accent} / 0.5)`,
                    `0 8px 32px -4px hsl(var(--primary) / 0.3)`,
                  ]}}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="rounded-2xl"
                >
                  <Button
                    size="lg"
                    onClick={scrollToSearch}
                    className="relative h-14 px-10 text-lg font-bold rounded-2xl gap-3 overflow-hidden"
                  >
                    <Search className="w-5 h-5" />
                    Search Flights
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </motion.div>
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="h-14 px-8 text-base font-semibold rounded-2xl"
                  style={{
                    background: "hsl(var(--background) / 0.3)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid hsl(var(--border) / 0.4)",
                  }}
                >
                  <Link to="/hotels">
                    <Hotel className="w-4 h-4 mr-2" />
                    Browse Hotels
                  </Link>
                </Button>
              </motion.div>

              {/* Stats with 3D hover */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex items-center gap-8"
              >
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className="flex items-center gap-3"
                    whileHover={{ y: -4, scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    {i > 0 && <div className="w-px h-8 bg-border/30" />}
                    <div className={i > 0 ? "pl-3" : ""}>
                      <div className="text-2xl font-black text-foreground tracking-tight">{stat.value}</div>
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Progress indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {heroSlides.map((s, i) => (
            <button type="button"
              key={i}
              onClick={() => goToSlide(i)}
              className="group relative rounded-full overflow-hidden touch-manipulation flex items-center"
              aria-label={`View ${s.location}`}
            >
              <div className={`transition-all duration-300 ${
                i === currentSlide ? "w-16 h-3.5 bg-primary/20" : "w-3.5 h-3.5 bg-foreground/20 hover:bg-foreground/40"
              } rounded-full`} />
              {i === currentSlide && (
                <>
                  <div className="absolute left-0 top-0 h-full bg-primary rounded-full shadow-[0_0_12px_hsl(var(--primary)/0.5)]" style={{ width: `${progress}%`, transition: "none" }} />
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {s.location}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-8 right-8 z-20"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2 text-muted-foreground/50"
          >
            <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
            <ArrowDown className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </div>

      {/* Shimmer animation keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </section>
  );
}
