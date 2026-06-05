import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type PanInfo,
} from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bus,
  CalendarDays,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Code2,
  CreditCard,
  Globe2,
  Headphones,
  Hotel,
  Landmark,
  LockKeyhole,
  Luggage,
  MapPin,
  Plane,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import flightImage from "@/assets/flight-hero-luxury.jpg";
import hotelImage from "@/assets/hero-beach-resort.jpg";
import carImage from "@/assets/hero-cars.jpg";
import busImage from "@/assets/destination-mountains.jpg";
import airplane3d from "@/assets/airplane-3d.png";
import ambientImage from "@/assets/city-hero-glass-sunset.jpg";
import beachImage from "@/assets/destination-tropical-beach.jpg";
import destParis from "@/assets/hero-city-paris.jpg";
import destDubai from "@/assets/hero-city-dubai.jpg";
import destBali from "@/assets/hero-bali.jpg";
import destNewYork from "@/assets/hero-city-newyork.jpg";
import destLondon from "@/assets/hero-city-london.jpg";
import destBarcelona from "@/assets/hero-city-barcelona.jpg";
import destCancun from "@/assets/hero-city-cancun.jpg";
import { zivoTravelSupabase } from "@/integrations/supabase/travelClient";
import { goCrossDomain } from "@/lib/crossDomainSSO";
import { ZIVO_MEDIA_ORIGIN } from "@/config/autoRepairDomain";
import { cn } from "@/lib/utils";

type TravelService = "flight" | "hotel" | "rental_car" | "bus";

type ServiceConfig = {
  id: TravelService;
  label: string;
  nav: string;
  href: string;
  icon: typeof Plane;
  accent: string;
  ring: string;
  chip: string;
  image: string;
  overlay: string;
  tagline: string;
  priceFrom: string;
  fromLabel: string;
  toLabel: string;
  fromPlaceholder: string;
  toPlaceholder: string;
  fromValue: string;
  toValue: string;
};

const services: ServiceConfig[] = [
  {
    id: "flight",
    label: "Flights",
    nav: "Flights",
    href: "/flights",
    icon: Plane,
    accent: "text-sky-300",
    ring: "ring-sky-400/30",
    chip: "bg-sky-500/90",
    image: flightImage,
    overlay: "linear-gradient(180deg,rgba(2,6,23,0.10),rgba(2,6,23,0.78))",
    tagline: "Compare cabins and routes worldwide.",
    priceFrom: "from $189",
    fromLabel: "From",
    toLabel: "To",
    fromPlaceholder: "Origin airport",
    toPlaceholder: "Destination airport",
    fromValue: "New York, JFK",
    toValue: "Paris, CDG",
  },
  {
    id: "hotel",
    label: "Hotels",
    nav: "Hotels",
    href: "/hotels",
    icon: Hotel,
    accent: "text-violet-300",
    ring: "ring-violet-400/30",
    chip: "bg-violet-500/90",
    image: hotelImage,
    overlay: "linear-gradient(180deg,rgba(2,6,23,0.10),rgba(2,6,23,0.78))",
    tagline: "Resorts, rooms, and stays you'll love.",
    priceFrom: "from $74 / night",
    fromLabel: "Destination",
    toLabel: "Area",
    fromPlaceholder: "City or hotel",
    toPlaceholder: "Neighborhood",
    fromValue: "Santorini",
    toValue: "Ocean view",
  },
  {
    id: "rental_car",
    label: "Rental Car",
    nav: "Cars",
    href: "/cars",
    icon: CarFront,
    accent: "text-emerald-300",
    ring: "ring-emerald-400/30",
    chip: "bg-emerald-500/90",
    image: carImage,
    overlay: "linear-gradient(180deg,rgba(2,6,23,0.10),rgba(2,6,23,0.78))",
    tagline: "Pick up and drive in minutes.",
    priceFrom: "from $29 / day",
    fromLabel: "Pickup",
    toLabel: "Drop-off",
    fromPlaceholder: "Pickup city",
    toPlaceholder: "Return city",
    fromValue: "Los Angeles",
    toValue: "LAX Airport",
  },
  {
    id: "bus",
    label: "Booking Bus",
    nav: "Bus",
    href: "/bus",
    icon: Bus,
    accent: "text-orange-300",
    ring: "ring-orange-400/30",
    chip: "bg-orange-500/90",
    image: busImage,
    overlay: "linear-gradient(180deg,rgba(2,6,23,0.10),rgba(2,6,23,0.80))",
    tagline: "Routes, seats, and tickets made simple.",
    priceFrom: "from $9",
    fromLabel: "From",
    toLabel: "To",
    fromPlaceholder: "Departure city",
    toPlaceholder: "Arrival city",
    fromValue: "Bangkok",
    toValue: "Chiang Mai",
  },
];

const destinations = [
  { name: "Paris", country: "France", image: destParis, tag: "Flights + stays" },
  { name: "Bali", country: "Indonesia", image: destBali, tag: "Beach escapes" },
  { name: "Dubai", country: "UAE", image: destDubai, tag: "City + luxury" },
  { name: "New York", country: "USA", image: destNewYork, tag: "City breaks" },
  { name: "Cancún", country: "Mexico", image: destCancun, tag: "All-inclusive" },
  { name: "London", country: "UK", image: destLondon, tag: "Culture trips" },
  { name: "Barcelona", country: "Spain", image: destBarcelona, tag: "Sun + tapas" },
];

const workflow: { title: string; body: string; icon: typeof Search; color: string; href: string }[] = [
  { title: "Search", body: "Flights, hotels, cars, and bus seats.", icon: Search, color: "text-teal-300", href: "#booking" },
  { title: "Compare", body: "Prices, policies, timing, and routes.", icon: TrendingUp, color: "text-sky-300", href: "#booking" },
  { title: "Pay", body: "Secure Stripe checkout, deposits, refunds.", icon: CreditCard, color: "text-emerald-300", href: "/travel/checkout" },
  { title: "Trip wallet", body: "Cards, credits, and receipts.", icon: WalletCards, color: "text-teal-300", href: "/wallet" },
  { title: "Cash out", body: "Partner payouts & instant cash-out.", icon: Landmark, color: "text-orange-300", href: "/wallet" },
];

const ops: { title: string; body: string; icon: typeof Code2; color: string; href: string }[] = [
  { title: "API access", body: "Developer-first bridge to build and scale.", icon: Code2, color: "bg-fuchsia-500", href: "/connect-website" },
  { title: "SSO & security", body: "Auth, session safety, and audit-ready access.", icon: LockKeyhole, color: "bg-blue-500", href: "/login" },
  { title: "SEO optimized", body: "Search-ready service and city pages.", icon: TrendingUp, color: "bg-emerald-500", href: "/guides/cheap-flights" },
  { title: "Global network", body: "A travel layer under Zivos Media.", icon: Globe2, color: "bg-rose-500", href: "/connect-website" },
  { title: "Real-time ops", body: "Live status, alerts, and support.", icon: Headphones, color: "bg-sky-500", href: "/support" },
];

function getTravelSessionId() {
  const key = "zivo_travel_session_id";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next = `zt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `zt_${Date.now()}`;
  }
}

/** Pointer-driven 3D tilt wrapper. Falls back to flat when reduced motion is on. */
function TiltCard({
  children,
  className,
  intensity = 12,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [intensity, -intensity]), { stiffness: 150, damping: 16 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-intensity, intensity]), { stiffness: 150, damping: 16 });

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div className="[perspective:1200px]">
      <motion.div
        onMouseMove={handleMove}
        onMouseLeave={reset}
        style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={className}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Scroll-into-view reveal. */
function Reveal({
  children,
  className,
  y = 26,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

type Slot = { x: string; z: number; rotateY: number; scale: number; opacity: number; zIndex: number };

function slotForOffset(offset: number): Slot {
  switch (offset) {
    case 0:
      return { x: "0%", z: 60, rotateY: 0, scale: 1, opacity: 1, zIndex: 50 };
    case 1:
      return { x: "58%", z: -130, rotateY: -34, scale: 0.84, opacity: 0.92, zIndex: 30 };
    case 3:
      return { x: "-58%", z: -130, rotateY: 34, scale: 0.84, opacity: 0.92, zIndex: 30 };
    default:
      return { x: "0%", z: -280, rotateY: 0, scale: 0.66, opacity: 0.35, zIndex: 10 };
  }
}

/** Draggable / swipeable 3D coverflow carousel of travel services. */
function ServiceCarousel3D({
  index,
  onSelect,
  onLaunch,
  onHoverChange,
}: {
  index: number;
  onSelect: (next: number) => void;
  onLaunch: (service: ServiceConfig) => void;
  onHoverChange: (hovering: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const total = services.length;

  const go = (dir: -1 | 1) => onSelect((index + dir + total) % total);

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.18;
    if (swipe < -70) go(1);
    else if (swipe > 70) go(-1);
  };

  return (
    <div
      className="relative h-[440px] w-full sm:h-[480px] [perspective:1600px]"
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
        drag={reduce ? false : "x"}
        dragSnapToOrigin
        dragElastic={0.16}
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={() => onHoverChange(true)}
        onDragEnd={handleDragEnd}
      >
        {services.map((service, i) => {
          const offset = ((i - index) % total + total) % total;
          const slot = slotForOffset(offset);
          const isCenter = offset === 0;
          const Icon = service.icon;
          return (
            <motion.button
              key={service.id}
              type="button"
              onClick={() => (isCenter ? onLaunch(service) : onSelect(i))}
              className="absolute inset-y-2 left-0 right-0 mx-auto w-[268px] overflow-hidden rounded-[2rem] border border-white/15 text-left shadow-[0_44px_90px_rgba(2,6,23,0.55)] will-change-transform sm:w-[320px]"
              style={{ zIndex: slot.zIndex, transformStyle: "preserve-3d" }}
              animate={{ x: slot.x, z: slot.z, rotateY: slot.rotateY, scale: slot.scale, opacity: slot.opacity }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              aria-label={isCenter ? `Search ${service.label}` : `Show ${service.label}`}
              aria-hidden={slot.opacity < 0.5}
              tabIndex={isCenter ? 0 : -1}
            >
              <img src={service.image} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" draggable={false} />
              <div className="absolute inset-0" style={{ background: service.overlay }} />
              <div className="absolute inset-0 flex flex-col justify-between p-6 text-white">
                <div className="flex items-center justify-between">
                  <span className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide text-white", service.chip)}>
                    <Icon className="h-3.5 w-3.5" />
                    {service.label}
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur">{service.priceFrom}</span>
                </div>
                <div>
                  <p className="text-2xl font-black leading-tight">{service.label}</p>
                  <p className="mt-1 text-sm font-semibold text-white/80">{service.tagline}</p>
                  {isCenter && (
                    <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-zinc-950">
                      Search {service.label}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <button
        type="button"
        onClick={() => go(-1)}
        className="absolute left-1 top-1/2 z-[60] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20"
        aria-label="Previous service"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className="absolute right-1 top-1/2 z-[60] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20"
        aria-label="Next service"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-0 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2">
        {services.map((service, i) => (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(i)}
            className={cn("h-2 rounded-full transition-all", i === index ? "w-8 bg-white" : "w-2 bg-white/40")}
            aria-label={`Show ${service.label}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function ZivoTravelHome() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [from, setFrom] = useState(services[0].fromValue);
  const [to, setTo] = useState(services[0].toValue);
  const [dateStart, setDateStart] = useState("2026-07-10");
  const [dateEnd, setDateEnd] = useState("2026-07-17");
  const [travelers, setTravelers] = useState("1");
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeService = services[index] || services[0];
  const railRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const ambientY = useTransform(scrollYProgress, [0, 1], ["0%", "26%"]);
  const planeY = useTransform(scrollYProgress, [0, 1], ["0%", "-38%"]);
  const planeRotate = useTransform(scrollYProgress, [0, 1], [0, -8]);

  const [engaged, setEngaged] = useState(false);
  const [carouselHover, setCarouselHover] = useState(false);

  const applyServiceDefaults = (i: number) => {
    setFrom(services[i].fromValue);
    setTo(services[i].toValue);
  };

  // Manual selection (header nav, tabs, dots, arrows, carousel cards, destinations rail).
  // Marks the session engaged so autoplay never clobbers what the user is doing.
  const selectService = (next: number) => {
    const safe = (next + services.length) % services.length;
    if (!engaged) applyServiceDefaults(safe);
    setEngaged(true);
    setIndex(safe);
  };

  // Pre-engagement autoplay: rotates the carousel and previews each service's
  // example route. Stops permanently once the user engages or hovers the deck.
  useEffect(() => {
    if (reduce || engaged || carouselHover) return;
    const timer = window.setInterval(() => {
      const i = (index + 1) % services.length;
      setIndex(i);
      applyServiceDefaults(i);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [index, engaged, carouselHover, reduce]);

  // The shared static index.html bakes zivosmedia.com SEO into every host
  // (canonical, OG/Twitter, JSON-LD). This page's <Helmet> appends correct travel
  // tags *after* them, leaving duplicates. After Helmet flushes (double rAF),
  // de-dupe singleton SEO tags keeping the last (Helmet's), drop any JSON-LD that
  // isn't travel-branded, and remove off-brand parent-company social images.
  useEffect(() => {
    const reconcile = () => {
      const head = document.head;
      const keepLast = (selector: string, keyOf: (el: Element) => string) => {
        const seen = new Map<string, Element>();
        head.querySelectorAll(selector).forEach((el) => {
          const key = keyOf(el);
          const prev = seen.get(key);
          if (prev) prev.remove();
          seen.set(key, el);
        });
      };
      keepLast('link[rel="canonical"]', () => "canonical");
      keepLast('link[rel="alternate"][hreflang]', (el) => el.getAttribute("hreflang") || "");
      keepLast('meta[name="description"]', () => "description");
      keepLast('meta[name="apple-itunes-app"]', () => "apple-itunes-app");
      keepLast('meta[property^="og:"]', (el) => el.getAttribute("property") || "");
      keepLast('meta[name^="twitter:"]', (el) => el.getAttribute("name") || "");
      head.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        if (!(script.textContent || "").includes("zivostravel")) script.remove();
      });
      head
        .querySelectorAll(
          'meta[property="og:image"], meta[name="twitter:image"], meta[name="twitter:image:alt"], meta[name="twitter:site"], meta[name="twitter:creator"]',
        )
        .forEach((el) => {
          const value = el.getAttribute("content") || "";
          if (value.includes("zivosmedia") || value === "ZIVO" || value.startsWith("@Zivo") || value.includes("ZIVO -")) {
            el.remove();
          }
        });
    };
    const raf = requestAnimationFrame(() => requestAnimationFrame(reconcile));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Each engine landing page reads its own query keys, so emit per-service params
  // the destination page already understands (see deep-link contracts):
  //  flight  -> /flights?from&to&start&end&travelers   (FlightLanding deep-link hook)
  //  hotel   -> /hotels?city&ci&co&adults              (HotelsLandingPage)
  //  car     -> /cars?city&pickup_date&return_date      (Cars)
  //  bus     -> /bus?from&to&date                        (BusBookingPage)
  const buildServiceQuery = (service: ServiceConfig): string => {
    const params = new URLSearchParams();
    const fromText = from.trim();
    const toText = to.trim();
    const pax = String(Number.parseInt(travelers, 10) || 1);
    switch (service.id) {
      case "hotel":
        if (fromText) params.set("city", fromText);
        if (dateStart) params.set("ci", dateStart);
        if (dateEnd) params.set("co", dateEnd);
        params.set("adults", pax);
        break;
      case "rental_car":
        if (fromText) params.set("city", fromText);
        if (dateStart) params.set("pickup_date", dateStart);
        if (dateEnd) params.set("return_date", dateEnd);
        break;
      case "bus":
        if (fromText) params.set("from", fromText);
        if (toText) params.set("to", toText);
        if (dateStart) params.set("date", dateStart);
        break;
      default: // flight
        if (fromText) params.set("from", fromText);
        if (toText) params.set("to", toText);
        if (dateStart) params.set("start", dateStart);
        if (dateEnd) params.set("end", dateEnd);
        params.set("travelers", pax);
    }
    const query = params.toString();
    return `${service.href}${query ? `?${query}` : ""}`;
  };

  const queryHref = useMemo(
    () => buildServiceQuery(activeService),
    // buildServiceQuery reads the live form state captured below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeService, dateEnd, dateStart, from, to, travelers],
  );

  const logAndGo = (service: ServiceConfig, href: string) => {
    const payload = {
      session_id: getTravelSessionId(),
      service_type: service.id,
      origin: service.id === "hotel" ? null : from.trim() || null,
      destination: service.id === "hotel" ? from.trim() || null : to.trim() || null,
      pickup: service.id === "rental_car" ? from.trim() || null : null,
      dropoff: service.id === "rental_car" ? to.trim() || null : null,
      date_start: dateStart || null,
      date_end: dateEnd || null,
      travelers: Number.parseInt(travelers, 10) || 1,
      rooms: service.id === "hotel" ? 1 : null,
      source_host: typeof window !== "undefined" ? window.location.hostname : "zivostravel.com",
      filters: { mode: service.label, queryHref: href },
    };
    void zivoTravelSupabase
      .from("zivo_travel_search_events")
      .insert(payload)
      .then(({ error }) => {
        if (error) console.warn("[zivo-travel] search event skipped", error.message);
      });
    navigate(href);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    logAndGo(activeService, queryHref);
  };

  const scrollRail = (dir: -1 | 1) => {
    railRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Helmet>
        <title>Zivo Travel | Flights, Hotels, Rental Cars, and Bus Booking</title>
        <meta
          name="description"
          content="Zivo Travel connects flights, hotels, rental cars, and bus booking in one travel workflow with secure payments, partner payouts, API access, SSO, and SEO-ready trip pages."
        />
        <link rel="canonical" href="https://zivostravel.com/" />
        <link rel="alternate" hrefLang="x-default" href="https://zivostravel.com/" />
        <link rel="alternate" hrefLang="en" href="https://zivostravel.com/" />
        <link rel="alternate" hrefLang="km" href="https://zivostravel.com/?lang=km" />
        <link rel="alternate" hrefLang="ar" href="https://zivostravel.com/?lang=ar" />
        <link rel="alternate" hrefLang="fr" href="https://zivostravel.com/?lang=fr" />
        <meta name="apple-itunes-app" content="app-id=6759480121, app-argument=https://zivostravel.com" />
        <meta property="og:title" content="Zivo Travel" />
        <meta property="og:description" content="Flights, hotels, rental cars, and bus booking in one connected workflow." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://zivostravel.com/" />
        <meta property="og:image" content="https://zivostravel.com/og-zivo-travel.jpg" />
        <meta property="og:image:alt" content="Zivo Travel - Flights, Hotels, Rental Cars, and Bus Booking" />
        <meta property="og:site_name" content="Zivo Travel" />
        <meta property="og:locale" content="en_US" />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Zivo Travel" />
        <meta name="twitter:description" content="Flights, hotels, rental cars, and bus booking in one connected workflow." />
        <meta name="twitter:image" content="https://zivostravel.com/og-zivo-travel.jpg" />
        <meta name="twitter:image:alt" content="Zivo Travel - Flights, Hotels, Rental Cars, and Bus Booking" />
        <meta name="theme-color" content="#09090b" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Zivo Travel",
            url: "https://zivostravel.com/",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://zivostravel.com/flights?from={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Zivo Travel",
            url: "https://zivostravel.com/",
            parentOrganization: { "@type": "Organization", name: "Zivos Media" },
          })}
        </script>
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-3" aria-label="Zivo Travel home">
            <span className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 via-sky-500 to-violet-600 text-3xl font-black leading-none text-white shadow-[0_18px_45px_rgba(16,185,129,0.35)]">
              <span className="relative z-10">Z</span>
              <span className="absolute -right-1 -top-1 h-4 w-4 rounded-md bg-white/80" />
              <span className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-[1.15rem] border border-white/40 transition group-hover:rotate-[18deg]" />
            </span>
            <span>
              <span className="block text-xl font-black leading-none tracking-[0.18em]">ZIVO</span>
              <span className="block bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-sm font-black leading-none tracking-[0.38em] text-transparent">
                TRAVEL
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-bold text-zinc-300 lg:flex">
            {services.map((service, i) => (
              <button
                key={service.id}
                type="button"
                onClick={() => selectService(i)}
                className={cn("flex items-center gap-2 transition hover:text-white", index === i && service.accent)}
              >
                <service.icon className="h-4 w-4" />
                {service.nav}
              </button>
            ))}
            <Link to="/my-trips" className="flex items-center gap-2 transition hover:text-white">
              <Luggage className="h-4 w-4" />
              Trips
            </Link>
            <Link to="/wallet" className="flex items-center gap-2 transition hover:text-white">
              <WalletCards className="h-4 w-4" />
              Wallet
            </Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button type="button" className="flex h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold text-zinc-200">
              <Globe2 className="h-4 w-4" />
              USD
            </button>
            <Link to="/login" className="h-11 rounded-full border border-white/15 px-6 py-3 text-sm font-black text-white transition hover:border-white">
              Log in
            </Link>
            <a href="#booking" className="h-11 rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-zinc-950 shadow-[0_16px_32px_rgba(16,185,129,0.32)] transition hover:bg-emerald-400">
              Start booking
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-black md:hidden"
          >
            Menu
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-white/10 bg-zinc-950 px-4 py-4 md:hidden">
            <div className="grid gap-2">
              {services.map((service, i) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    selectService(i);
                    setMobileOpen(false);
                  }}
                  className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-black"
                >
                  <span className="flex items-center gap-2"><service.icon className="h-4 w-4" />{service.label}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ))}
              <Link
                to="/wallet"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-black"
              >
                <span className="flex items-center gap-2"><WalletCards className="h-4 w-4" />Wallet & cash-out</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" onClick={() => setMobileOpen(false)} className="mt-1 rounded-2xl bg-emerald-500 px-4 py-3 text-center text-sm font-black text-zinc-950">
                Log in
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden">
        <motion.div
          aria-hidden
          style={reduce ? undefined : { y: ambientY }}
          className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-30"
        >
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ambientImage})` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/85 to-zinc-950" />
        </motion.div>
        <div className="absolute -left-32 top-10 -z-10 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute right-0 top-40 -z-10 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-24 lg:pt-16">
          <div className="relative z-10 flex flex-col justify-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                One travel workflow
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-5 max-w-3xl text-6xl font-black leading-[0.92] sm:text-7xl lg:text-8xl">
                Zivo{" "}
                <span className="bg-gradient-to-r from-emerald-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">Travel</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-2xl text-xl leading-8 text-zinc-300 sm:text-2xl">
                Flights, hotels, rental cars, and bus booking in one connected, 3D travel experience for every journey.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <form
                id="booking"
                onSubmit={submitSearch}
                onFocusCapture={() => setEngaged(true)}
                className={cn("mt-9 rounded-[2rem] border border-white/10 bg-white/[0.06] p-1 shadow-[0_28px_80px_rgba(2,6,23,0.55)] ring-4 backdrop-blur-xl", activeService.ring)}
              >
                <div className="grid grid-cols-2 gap-1 rounded-[1.7rem] bg-white/5 p-1 md:grid-cols-4">
                  {services.map((service, i) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => selectService(i)}
                      className={cn(
                        "flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-black transition",
                        index === i ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/10",
                      )}
                    >
                      <service.icon className="h-4 w-4" />
                      {service.label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-2 p-3 md:grid-cols-[1fr_1fr_1fr_0.8fr]">
                  <label className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3">
                    <span className="text-[11px] font-black uppercase text-zinc-400">{activeService.fromLabel}</span>
                    <span className="mt-1 flex items-center gap-2">
                      <MapPin className={cn("h-4 w-4", activeService.accent)} />
                      <input
                        value={from}
                        onChange={(event) => setFrom(event.target.value)}
                        placeholder={activeService.fromPlaceholder}
                        className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-zinc-500"
                      />
                    </span>
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3">
                    <span className="text-[11px] font-black uppercase text-zinc-400">{activeService.toLabel}</span>
                    <span className="mt-1 flex items-center gap-2">
                      <Route className="h-4 w-4 text-zinc-400" />
                      <input
                        value={to}
                        onChange={(event) => setTo(event.target.value)}
                        placeholder={activeService.toPlaceholder}
                        className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-zinc-500"
                      />
                    </span>
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3">
                    <span className="text-[11px] font-black uppercase text-zinc-400">Depart</span>
                    <span className="mt-1 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-zinc-400" />
                      <input
                        type="date"
                        value={dateStart}
                        onChange={(event) => setDateStart(event.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-white outline-none [color-scheme:dark]"
                      />
                    </span>
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3">
                    <span className="text-[11px] font-black uppercase text-zinc-400">Travelers</span>
                    <span className="mt-1 flex items-center gap-2">
                      <Users className="h-4 w-4 text-zinc-400" />
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={travelers}
                        onChange={(event) => setTravelers(event.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-white outline-none"
                      />
                    </span>
                  </label>
                </div>

                <div className="grid gap-2 px-3 pb-3 md:grid-cols-[1fr_1.4fr]">
                  <label className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3">
                    <span className="text-[11px] font-black uppercase text-zinc-400">Return</span>
                    <span className="mt-1 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-zinc-400" />
                      <input
                        type="date"
                        value={dateEnd}
                        onChange={(event) => setDateEnd(event.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-white outline-none [color-scheme:dark]"
                      />
                    </span>
                  </label>
                  <button
                    type="submit"
                    className="group flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-6 text-base font-black text-zinc-950 shadow-[0_22px_40px_rgba(16,185,129,0.3)] transition hover:bg-emerald-400"
                  >
                    Search {activeService.label}
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-950/15 transition group-hover:translate-x-1">
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  </button>
                </div>
              </form>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-6 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-3">
                {[
                  { title: "Secure payments", body: "PCI-ready flows", icon: ShieldCheck },
                  { title: "24/7 support", body: "Around the world", icon: Headphones },
                  { title: "Trusted partners", body: "Travel network", icon: BadgeCheck },
                ].map((item) => (
                  <div key={item.title} className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-emerald-300" />
                    <div>
                      <p className="text-xs font-black">{item.title}</p>
                      <p className="text-xs text-zinc-400">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* 3D service carousel */}
          <div className="relative z-10 flex items-center justify-center">
            <motion.img
              src={airplane3d}
              alt=""
              aria-hidden
              style={reduce ? undefined : { y: planeY, rotate: planeRotate }}
              className="pointer-events-none absolute -top-6 right-2 z-[60] hidden w-40 drop-shadow-[0_20px_40px_rgba(2,6,23,0.5)] lg:block"
            />
            <ServiceCarousel3D
              index={index}
              onSelect={selectService}
              onLaunch={(service) => logAndGo(service, buildServiceQuery(service))}
              onHoverChange={setCarouselHover}
            />
          </div>
        </div>
      </section>

      {/* Destinations rail (drag / scroll left + right) */}
      <section className="border-t border-white/10 bg-zinc-950 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black sm:text-4xl">Trending destinations</h2>
              <p className="mt-2 max-w-xl text-zinc-400">Swipe through hand-picked cities — flights, hotels, cars, and bus routes ready to book.</p>
            </div>
            <div className="hidden gap-2 sm:flex">
              <button type="button" onClick={() => scrollRail(-1)} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5 transition hover:bg-white/10" aria-label="Scroll left">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => scrollRail(1)} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5 transition hover:bg-white/10" aria-label="Scroll right">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </Reveal>

          <div
            ref={railRef}
            className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {destinations.map((destination) => (
              <button
                key={destination.name}
                type="button"
                onClick={() => selectService(0)}
                className="group relative h-72 w-64 shrink-0 snap-start overflow-hidden rounded-[1.8rem] border border-white/10 text-left"
              >
                <img
                  src={destination.image}
                  alt={`${destination.name}, ${destination.country}`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-wide backdrop-blur">{destination.tag}</span>
                  <p className="mt-3 text-2xl font-black">{destination.name}</p>
                  <p className="text-sm font-semibold text-zinc-300">{destination.country}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-t border-white/10 bg-zinc-950 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[280px_1fr]">
          <Reveal>
            <h2 className="text-4xl font-black leading-none">One workflow. Every journey.</h2>
            <p className="mt-5 text-base leading-7 text-zinc-400">
              From search to payout, Zivo Travel keeps customer booking, partner operations, and trip records connected — on web and app.
            </p>
            <a href="#booking" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-emerald-300">
              See how it works <ArrowRight className="h-4 w-4" />
            </a>
          </Reveal>

          <div className="space-y-10">
            <div className="grid gap-4 md:grid-cols-5">
              {workflow.map((step, i) => {
                const card = (
                  <TiltCard className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/25">
                    <span className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-zinc-900">
                      <step.icon className={cn("h-6 w-6", step.color)} />
                    </span>
                    <p className="mt-4 flex items-center gap-1 text-sm font-black">
                      {step.title}
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{step.body}</p>
                  </TiltCard>
                );
                return (
                  <Reveal key={step.title} delay={i * 0.05}>
                    {step.href.startsWith("#") ? (
                      <a href={step.href} className="block h-full">{card}</a>
                    ) : (
                      <Link to={step.href} className="block h-full">{card}</Link>
                    )}
                  </Reveal>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              {ops.map((item, i) => (
                <Reveal key={item.title} delay={i * 0.05}>
                  <Link to={item.href} className="block h-full">
                    <TiltCard className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/25">
                      <span className={cn("grid h-11 w-11 place-items-center rounded-2xl text-white", item.color)}>
                        <item.icon className="h-5 w-5" />
                      </span>
                      <p className="mt-4 text-sm font-black">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">{item.body}</p>
                    </TiltCard>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Under Zivos Media */}
      <section className="relative overflow-hidden border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(${beachImage})` }} />
        <div className="absolute inset-0 -z-10 bg-zinc-950/80" />
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1fr]">
          <Reveal>
            <h2 className="text-4xl font-black sm:text-5xl">Built under Zivos Media, focused for travel.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
              Zivo Travel runs as its own website and app surface on zivostravel.com while staying connected to the larger Zivos Media account, auth, payment, and partner ecosystem.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#booking" className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-zinc-950 transition hover:bg-emerald-400">Start a trip</a>
              <Link to="/wallet" className="rounded-full border border-white/20 px-6 py-3 text-sm font-black transition hover:border-white">Wallet &amp; cash-out</Link>
              <Link to="/connect-website" className="rounded-full border border-white/20 px-6 py-3 text-sm font-black transition hover:border-white">Partner API</Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Customer domain", value: "zivostravel.com" },
                { label: "Backend", value: "Zivos Media network" },
                { label: "Core services", value: "Flights · Hotels · Cars · Bus" },
                { label: "Payments", value: "Secure checkout + payouts" },
              ].map((item) => (
                <TiltCard key={item.label} className="rounded-2xl border border-white/12 bg-white/[0.06] p-5">
                  <p className="text-xs font-black uppercase text-emerald-300">{item.label}</p>
                  <p className="mt-2 text-lg font-black">{item.value}</p>
                </TiltCard>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 via-sky-500 to-violet-600 text-2xl font-black">Z</span>
            <span className="text-sm font-black tracking-[0.3em]">ZIVO TRAVEL</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-bold text-zinc-400">
            {services.map((service) => (
              <button key={service.id} type="button" onClick={() => navigate(service.href)} className="transition hover:text-white">
                {service.label}
              </button>
            ))}
            <Link to="/terms-of-service" className="transition hover:text-white">Terms</Link>
            <Link to="/privacy-policy" className="transition hover:text-white">Privacy</Link>
            <button
              type="button"
              onClick={() => { void goCrossDomain(ZIVO_MEDIA_ORIGIN, "/"); }}
              className="transition hover:text-white"
              title="Continue to Zivos Media with your session"
            >
              Zivos Media ↗
            </button>
          </div>
          <p className="text-xs text-zinc-500">© {new Date().getFullYear()} Zivo Travel · A Zivos Media company</p>
        </div>
      </footer>
    </main>
  );
}
