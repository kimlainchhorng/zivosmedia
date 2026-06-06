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
  Layers3,
  LockKeyhole,
  Luggage,
  MapPin,
  Plane,
  ReceiptText,
  Route,
  Search,
  ShieldCheck,
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
import { recordZivoTravelSearchEvent } from "@/integrations/supabase/travelClient";
import { goCrossDomain } from "@/lib/crossDomainSSO";
import { ZIVO_MEDIA_ORIGIN } from "@/config/autoRepairDomain";
import { cn } from "@/lib/utils";
import {
  HorizontalRail,
  ScrollTurn,
  TiltCard as TravelTiltCard,
} from "@/components/zivo-travel/scroll3d";
import { PageTransition } from "@/components/zivo-travel/PageTransition";
import { TravelPullToRefresh } from "@/components/zivo-travel/TravelPullToRefresh";

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

const TRAVEL_THEME_COLOR = "#f8fbff";

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

const popularSearches = [
  {
    title: "New York to Paris",
    body: "Flights with flexible travel dates.",
    icon: Plane,
    href: "/flights?from=New%20York%2C%20JFK&to=Paris%2C%20CDG&start=2026-07-10&end=2026-07-17&travelers=1",
    tone: "bg-sky-100 text-sky-700",
  },
  {
    title: "Santorini stays",
    body: "Hotels near the ocean view.",
    icon: Hotel,
    href: "/hotels?city=Santorini&ci=2026-07-10&co=2026-07-17&adults=2",
    tone: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    title: "LAX rental car",
    body: "Pickup and return at the airport.",
    icon: CarFront,
    href: "/cars?city=Los%20Angeles&pickup_date=2026-07-10&return_date=2026-07-17",
    tone: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Bangkok to Chiang Mai",
    body: "Bus route with easy seat booking.",
    icon: Bus,
    href: "/bus?from=Bangkok&to=Chiang%20Mai&date=2026-07-10",
    tone: "bg-orange-100 text-orange-700",
  },
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

const quickActions = [
  { title: "My trips", body: "Tickets, bookings, and saved plans.", icon: Luggage, href: "/my-trips", tone: "bg-sky-100 text-sky-700" },
  { title: "Wallet", body: "Receipts, cards, credits, and cash-out.", icon: WalletCards, href: "/wallet", tone: "bg-emerald-100 text-emerald-700" },
  { title: "Checkout", body: "Continue secure payment flow.", icon: CreditCard, href: "/travel/checkout", tone: "bg-violet-100 text-violet-700" },
  { title: "Support", body: "Help before, during, and after travel.", icon: Headphones, href: "/support", tone: "bg-orange-100 text-orange-700" },
];

const travelAssurance = [
  {
    title: "Clear tickets",
    body: "Every booking keeps the route, traveler, payment status, and receipt in one place.",
    icon: ReceiptText,
    href: "/my-trips",
    tone: "from-sky-100 to-cyan-50 text-sky-700",
  },
  {
    title: "Secure checkout",
    body: "Pay with a familiar checkout path and keep receipts ready for changes or refunds.",
    icon: ShieldCheck,
    href: "/travel/checkout",
    tone: "from-emerald-100 to-lime-50 text-emerald-700",
  },
  {
    title: "Trip wallet",
    body: "Cards, credits, receipts, and partner cash-out stay easy to find after checkout.",
    icon: WalletCards,
    href: "/wallet",
    tone: "from-violet-100 to-fuchsia-50 text-violet-700",
  },
  {
    title: "Real support",
    body: "Help is visible before booking, during travel, and after the trip is complete.",
    icon: Headphones,
    href: "/support",
    tone: "from-orange-100 to-amber-50 text-orange-700",
  },
];

const serviceShowcase = [
  {
    service: "Flights",
    title: "3D cabin search",
    body: "Route arcs, dates, cabin cards, and trip wallet records stay connected from search to checkout.",
    image: flightImage,
    icon: Plane,
    tone: "from-sky-400/30 to-cyan-300/10",
    href: "/flights",
    bullets: ["IATA-ready deep links", "Seat and fare upsell layer", "Wallet receipt after pay"],
  },
  {
    service: "Hotels",
    title: "Stay layer",
    body: "Hotel search lands with city, check-in, check-out, rooms, payment, and future payout workflow.",
    image: hotelImage,
    icon: Hotel,
    tone: "from-fuchsia-400/25 to-sky-300/10",
    href: "/hotels",
    bullets: ["City SEO pages", "Room card motion", "Partner booking records"],
  },
  {
    service: "Rental car",
    title: "Drive layer",
    body: "Pickup, return, vehicle class, insurance, checkout, and operator settlement in one flow.",
    image: carImage,
    icon: CarFront,
    tone: "from-emerald-400/30 to-lime-300/10",
    href: "/cars",
    bullets: ["Pickup and return sync", "Vehicle media cards", "Deposit-ready checkout"],
  },
  {
    service: "Booking bus",
    title: "Seat-first bus flow",
    body: "Routes, seats, promos, tickets, receipts, and reviews stay simple from search to arrival.",
    image: busImage,
    icon: Bus,
    tone: "from-orange-400/30 to-rose-300/10",
    href: "/bus",
    bullets: ["Pick routes fast", "Choose seats clearly", "Keep tickets in wallet"],
  },
];

const tripStack = [
  {
    service: services[0],
    title: "JFK to Paris",
    detail: "Round trip · Economy · Jul 10",
    price: "$189",
    layer: "Air layer",
  },
  {
    service: services[1],
    title: "Santorini ocean stay",
    detail: "7 nights · Breakfast · Flexible",
    price: "$518",
    layer: "Stay layer",
  },
  {
    service: services[2],
    title: "LAX premium pickup",
    detail: "EV sedan · Insurance ready",
    price: "$29/day",
    layer: "Drive layer",
  },
  {
    service: services[3],
    title: "Bangkok to Chiang Mai",
    detail: "Seat hold · QR ticket · Promo ready",
    price: "$9",
    layer: "Bus layer",
  },
];

const itineraryPreview = [
  {
    service: services[0],
    title: "Air",
    route: "JFK -> Paris CDG",
    detail: "Jul 10, round trip",
    status: "Offer held",
    price: "$189",
    href: "/flights?from=JFK&to=CDG&start=2026-07-10&end=2026-07-17&travelers=1",
  },
  {
    service: services[1],
    title: "Stay",
    route: "Paris center hotel",
    detail: "7 nights, flexible",
    status: "Rooms ready",
    price: "$518",
    href: "/hotels?city=Paris&ci=2026-07-10&co=2026-07-17&adults=1",
  },
  {
    service: services[2],
    title: "Drive",
    route: "Paris pickup",
    detail: "EV sedan, insured",
    status: "Deposit ready",
    price: "$29/day",
    href: "/cars?city=Paris&pickup_date=2026-07-10&return_date=2026-07-17",
  },
  {
    service: services[3],
    title: "Bus",
    route: "Phnom Penh -> Siem Reap",
    detail: "Seat hold, QR ticket",
    status: "Ticket ready",
    price: "$9",
    href: "/bus?from=Phnom%20Penh&to=Siem%20Reap&date=2026-07-10",
  },
];

const journeyCommand = [
  {
    title: "Search live inventory",
    body: "Customer compares flight, hotel, car, and bus offers from one Zivo Travel session.",
    detail: "Deep links stay mapped to the existing engine so every service can open with the right query.",
    icon: Search,
    href: "#booking",
    signal: "Customer",
    accent: "from-sky-400/35 to-cyan-300/10",
  },
  {
    title: "Reserve and pay",
    body: "Checkout, wallet receipt, refunds, and payment methods remain connected to the shared live flow.",
    detail: "No live payment provider is switched during UI work; checkout routes stay reusable and guarded.",
    icon: CreditCard,
    href: "/travel/checkout",
    signal: "Payments",
    accent: "from-emerald-400/35 to-lime-300/10",
  },
  {
    title: "Ticket and support",
    body: "Trip records, support touchpoints, receipts, and partner messages are visible after booking.",
    detail: "This prepares the customer-facing timeline for mobile app, web, and cross-domain SSO handoff.",
    icon: ReceiptText,
    href: "/wallet",
    signal: "Trip wallet",
    accent: "from-violet-400/35 to-sky-300/10",
  },
  {
    title: "Partner payout",
    body: "Operators can settle revenue, cash out, and keep booking records tied to the customer trip.",
    detail: "Partners can track bookings, see settlement status, and keep service records tied to each trip.",
    icon: Landmark,
    href: "/wallet",
    signal: "Partner",
    accent: "from-orange-400/35 to-rose-300/10",
  },
];

const launchLayers = [
  { label: "Flights", icon: Plane, color: "text-sky-600", bg: "bg-sky-100/80" },
  { label: "Hotels", icon: Hotel, color: "text-fuchsia-600", bg: "bg-fuchsia-100/80" },
  { label: "Cars", icon: CarFront, color: "text-emerald-600", bg: "bg-emerald-100/80" },
  { label: "Bus", icon: Bus, color: "text-orange-600", bg: "bg-orange-100/80" },
];

const appHandoffSteps = [
  { label: "Web booking", value: "Search and reserve on zivostravel.com", icon: Globe2, tone: "from-sky-400/30 to-cyan-300/10" },
  { label: "App trip sync", value: "Trips stay ready for mobile check-in", icon: Luggage, tone: "from-violet-400/30 to-fuchsia-300/10" },
  { label: "Wallet receipt", value: "Payment, refunds, and credits stay attached", icon: WalletCards, tone: "from-emerald-400/30 to-lime-300/10" },
  { label: "Partner payout", value: "Operators can track settlement and cash-out", icon: Landmark, tone: "from-orange-400/30 to-rose-300/10" },
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

function hasSeenTravelLaunch() {
  try {
    return sessionStorage.getItem("zivo_travel_launch_seen") === "true";
  } catch {
    return false;
  }
}

function markTravelLaunchSeen() {
  try {
    sessionStorage.setItem("zivo_travel_launch_seen", "true");
  } catch {
    // Ignore storage failures in private/restricted contexts.
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
              className="zt-on-media absolute inset-y-2 left-0 right-0 mx-auto w-[268px] overflow-hidden rounded-[2rem] border border-white/15 text-left shadow-[0_44px_90px_rgba(2,6,23,0.55)] will-change-transform sm:w-[320px]"
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

function FloatingTravelStack({ activeService }: { activeService: ServiceConfig }) {
  const reduce = useReducedMotion();
  const ActiveIcon = activeService.icon;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-20 hidden overflow-hidden lg:block" aria-hidden>
      <motion.div
        className="absolute right-[8%] top-4 z-[5] h-28 w-28 rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-[0_34px_80px_rgba(2,6,23,0.48)] backdrop-blur-xl"
        animate={reduce ? undefined : { y: [0, -16, 0], rotate: [-8, -3, -8] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <ActiveIcon className={cn("h-12 w-12", activeService.accent)} />
        <div className="mt-3 h-2 rounded-full bg-white/20" />
      </motion.div>
      <motion.div
        className="absolute left-[5%] top-40 z-[5] w-48 rounded-[1.5rem] border border-white/15 bg-zinc-950/55 p-4 shadow-[0_30px_80px_rgba(2,6,23,0.5)] backdrop-blur-xl"
        animate={reduce ? undefined : { x: [0, 18, 0], rotate: [6, 10, 6] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-emerald-300" />
          <span className="text-xs font-black uppercase tracking-wide text-white/80">One trip</span>
        </div>
        <div className="mt-4 grid gap-2">
          {["Flight", "Hotel", "Car", "Bus"].map((item, i) => (
            <div key={item} className="flex items-center justify-between rounded-xl bg-white/[0.08] px-3 py-2">
              <span className="text-xs font-bold text-white/70">{item}</span>
              <span className={cn("h-2 w-8 rounded-full", i === 0 ? "bg-sky-300" : i === 1 ? "bg-fuchsia-300" : i === 2 ? "bg-emerald-300" : "bg-orange-300")} />
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div
        className="absolute bottom-10 right-[33%] z-[5] w-56 rounded-[1.6rem] border border-white/15 bg-white/10 p-4 shadow-[0_34px_90px_rgba(2,6,23,0.45)] backdrop-blur-xl"
        animate={reduce ? undefined : { y: [0, 12, 0], rotate: [4, 0, 4] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-white">Wallet ready</span>
          <CreditCard className="h-4 w-4 text-emerald-300" />
        </div>
        <div className="mt-4 h-16 rounded-2xl bg-gradient-to-br from-emerald-300 via-sky-300 to-white p-3 text-zinc-950">
          <p className="text-[10px] font-black uppercase tracking-wide">Zivo Travel</p>
          <p className="mt-2 text-sm font-black">Pay, refund, cash out</p>
        </div>
      </motion.div>
    </div>
  );
}

function ServiceLayerShowcase() {
  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-zinc-950 px-4 py-16 sm:px-6 lg:px-8">
      <div className="zt-aurora opacity-80" aria-hidden />
      <div className="mx-auto max-w-7xl">
        <Reveal className="max-w-3xl">
          <h2 className="text-4xl font-black leading-none sm:text-5xl">Four booking products, one 3D travel layer.</h2>
          <p className="mt-5 text-lg leading-8 text-zinc-400">
            Each surface keeps its own workflow, pictures, search path, checkout route, and wallet record so Zivo Travel feels simple from the first tap.
          </p>
        </Reveal>

        <HorizontalRail className="mt-9 gap-6" ariaLabel="Zivo Travel service layers">
          {serviceShowcase.map((item, i) => {
            const Icon = item.icon;
            return (
              <ScrollTurn key={item.service} axis={i % 2 === 0 ? "y" : "x"} rotate={i % 2 === 0 ? 13 : -10} className="w-[82vw] max-w-[390px] sm:w-[390px]">
                <Link to={item.href} className="group block">
                  <TravelTiltCard className="zt-on-media relative h-[520px] overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.055] p-4 shadow-[0_36px_90px_rgba(2,6,23,0.45)] backdrop-blur-xl">
                    <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-105" loading="lazy" />
                    <div className={cn("absolute inset-0 bg-gradient-to-b", item.tone)} />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-zinc-950/5" />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-white/15 backdrop-blur">
                          <Icon className="h-7 w-7 text-white" />
                        </span>
                        <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/80 backdrop-blur">
                          Ready to book
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-wide text-emerald-300">{item.service}</p>
                        <h3 className="mt-2 text-3xl font-black leading-none">{item.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-white/78">{item.body}</p>
                        <div className="mt-5 grid gap-2">
                          {item.bullets.map((bullet) => (
                            <span key={bullet} className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-white/82 backdrop-blur">
                              <BadgeCheck className="h-4 w-4 text-emerald-300" />
                              {bullet}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TravelTiltCard>
                </Link>
              </ScrollTurn>
            );
          })}
        </HorizontalRail>
      </div>
    </section>
  );
}

function QuickActionDock() {
  return (
    <section className="relative z-20 px-4 pb-12 sm:px-6 lg:px-8">
      <Reveal>
        <div className="mx-auto -mt-8 grid max-w-7xl gap-3 rounded-[2rem] border border-slate-900/10 bg-white/82 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                to={item.href}
                className="group flex min-h-28 items-center gap-4 rounded-[1.4rem] border border-slate-900/8 bg-white/72 p-4 text-left transition hover:-translate-y-1 hover:border-emerald-300/50 hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
              >
                <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", item.tone)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-black text-slate-950">
                    {item.title}
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600" />
                  </span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{item.body}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

function LiveItineraryBoard({ onSelectService }: { onSelectService: (next: number) => void }) {
  const [active, setActive] = useState(0);
  const current = itineraryPreview[active] || itineraryPreview[0];
  const CurrentIcon = current.service.icon;

  const selectLayer = (next: number) => {
    setActive(next);
    onSelectService(next);
  };

  return (
    <section className="relative overflow-hidden border-y border-slate-900/10 bg-[#f6fbff] px-4 py-14 text-slate-950 sm:px-6 lg:px-8">
      <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: `url(${beachImage})`, backgroundSize: "cover", backgroundPosition: "center" }} aria-hidden />
      <div className="absolute inset-0 bg-white/82" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <Reveal className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-white/78 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-700 shadow-sm backdrop-blur">
            <Layers3 className="h-4 w-4" />
            Live itinerary
          </span>
          <h2 className="mt-5 text-4xl font-black leading-none sm:text-5xl">See the whole booking before checkout.</h2>
          <p className="mt-5 text-base leading-7 text-slate-600">
            Zivo Travel keeps each service leg connected so customers can move from search into payment, tickets, wallet, and support without losing the trip context.
          </p>
          <div className="mt-7 grid max-w-lg grid-cols-3 gap-3">
            {[
              { label: "Services", value: "4" },
              { label: "Preview total", value: "$745" },
              { label: "Checkout", value: "Ready" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-900/10 bg-white/78 p-4 shadow-sm backdrop-blur">
                <p className="text-2xl font-black">{stat.value}</p>
                <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/travel/checkout" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(16,185,129,0.24)] transition hover:-translate-y-0.5 hover:bg-emerald-400">
              Continue checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/my-trips" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-slate-900/12 bg-white/78 px-5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5">
              View trips
              <Luggage className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        <Reveal className="relative z-10" delay={0.08}>
          <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr] lg:items-stretch">
            <div className="grid gap-3">
              {itineraryPreview.map((item, i) => {
                const ItemIcon = item.service.icon;
                const selected = active === i;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => selectLayer(i)}
                    className={cn(
                      "group flex items-center justify-between gap-3 rounded-[1.35rem] border p-4 text-left shadow-sm transition hover:-translate-y-0.5",
                      selected ? "border-emerald-400/50 bg-white shadow-[0_18px_45px_rgba(16,185,129,0.12)]" : "border-slate-900/10 bg-white/70 hover:bg-white",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", selected ? item.service.chip : "bg-slate-100 text-slate-700")}>
                        <ItemIcon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-black uppercase tracking-wide text-slate-500">{item.title}</span>
                        <span className="block truncate text-sm font-black text-slate-950">{item.route}</span>
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-sm font-black text-emerald-700">{item.price}</span>
                  </button>
                );
              })}
            </div>

            <TravelTiltCard className="relative min-h-[31rem] overflow-hidden rounded-[2rem] border border-white/70 bg-white/76 p-5 shadow-[0_34px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl">
              <img src={current.service.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-28" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-br from-white via-white/90 to-white/58" aria-hidden />
              <div className="relative flex min-h-[28rem] flex-col justify-between">
                <div className="flex items-center justify-between gap-3">
                  <span className={cn("grid h-14 w-14 place-items-center rounded-2xl text-white shadow-lg", current.service.chip)}>
                    <CurrentIcon className="h-7 w-7" />
                  </span>
                  <span className="rounded-full border border-emerald-500/18 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-700">
                    {current.status}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-emerald-700">{current.title} layer</p>
                  <h3 className="mt-2 text-4xl font-black leading-none sm:text-5xl">{current.route}</h3>
                  <p className="mt-3 text-base font-semibold text-slate-600">{current.detail}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="rounded-[1.35rem] border border-slate-900/10 bg-white/76 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Wallet record</p>
                    <div className="mt-3 grid gap-2">
                      {["Search saved", "Payment ready", "Receipt after checkout"].map((item, i) => (
                        <div key={item} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <span className={cn("h-2.5 w-2.5 rounded-full", i <= active ? "bg-emerald-500" : "bg-slate-300")} />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link to={current.href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-black text-slate-950 shadow-[0_18px_36px_rgba(16,185,129,0.28)] transition hover:bg-emerald-400">
                    Open layer
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </TravelTiltCard>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function TripStackBuilder({ onSelectService }: { onSelectService: (next: number) => void }) {
  const [active, setActive] = useState(0);
  const current = tripStack[active] || tripStack[0];
  const Icon = current.service.icon;

  const selectTripLayer = (next: number) => {
    setActive(next);
    onSelectService(next);
  };

  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-[#050b14] px-4 py-16 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(52,211,153,0.18),transparent_32%),radial-gradient(circle_at_85%_45%,rgba(14,165,233,0.16),transparent_34%)]" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <Reveal className="relative z-10">
          <h2 className="text-4xl font-black leading-none sm:text-5xl">Build the whole trip as one stack.</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-400">
            Flight, hotel, rental car, and bus each keep their own booking route while the customer sees one connected itinerary.
          </p>
          <div className="mt-7 grid max-w-xl gap-3">
            {tripStack.map((item, i) => {
              const LayerIcon = item.service.icon;
              const selected = active === i;
              return (
                <button
                  key={item.layer}
                  type="button"
                  onClick={() => selectTripLayer(i)}
                  className={cn(
                    "group flex items-center justify-between rounded-2xl border p-3 text-left transition",
                    selected ? "border-emerald-300/55 bg-emerald-300/10" : "border-white/10 bg-white/[0.04] hover:border-white/25",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10", item.service.accent)}>
                      <LayerIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-white">{item.title}</span>
                      <span className="block truncate text-xs font-semibold text-zinc-400">{item.detail}</span>
                    </span>
                  </span>
                  <span className="ml-3 whitespace-nowrap text-sm font-black text-emerald-200">{item.price}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <ScrollTurn className="relative z-10" rotate={9} lift={40}>
          <div className="relative min-h-[34rem] overflow-hidden rounded-[2.2rem] border border-white/12 bg-white/[0.06] p-5 shadow-[0_42px_110px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
            <img src={current.service.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-28" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950/84 to-zinc-950/50" aria-hidden />
            <div className="relative flex h-full min-h-[31rem] flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide text-white", current.service.chip)}>
                  <Icon className="h-4 w-4" />
                  {current.layer}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-white/80 backdrop-blur">
                  Trip ID ZT-2026
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_13rem] lg:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-emerald-300">Selected layer</p>
                  <h3 className="mt-2 text-4xl font-black leading-none sm:text-5xl">{current.title}</h3>
                  <p className="mt-4 max-w-lg text-base leading-7 text-zinc-300">{current.detail}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-wide text-zinc-400">Trip total preview</p>
                  <p className="mt-2 text-3xl font-black text-white">$745</p>
                  <p className="mt-1 text-xs font-semibold text-zinc-400">Includes selected travel layers</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {tripStack.map((item, i) => (
                  <Link
                    key={item.layer}
                    to={item.service.href}
                    className={cn(
                      "group rounded-2xl border p-3 transition",
                      active === i ? "border-emerald-300/55 bg-emerald-300/12" : "border-white/10 bg-white/[0.05] hover:border-white/25",
                    )}
                  >
                    <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">{item.service.nav}</p>
                    <p className="mt-2 flex items-center justify-between text-sm font-black">
                      Open
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </ScrollTurn>
      </div>
    </section>
  );
}

function JourneyCommandDeck() {
  const [active, setActive] = useState(0);
  const current = journeyCommand[active] || journeyCommand[0];
  const Icon = current.icon;

  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-[#060a12] px-4 py-16 sm:px-6 lg:px-8">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.14),transparent_30%),radial-gradient(circle_at_80%_65%,rgba(59,130,246,0.14),transparent_34%)]" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <Reveal className="relative z-10">
          <h2 className="text-4xl font-black leading-none sm:text-5xl">A command flow for every booking.</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-400">
            The travel front door now shows customers and partners what happens after the search button: reserve, pay, ticket, support, and settle.
          </p>
          <div className="mt-7 grid gap-3">
            {journeyCommand.map((step, i) => {
              const StepIcon = step.icon;
              const selected = active === i;
              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    "group flex items-center gap-4 rounded-2xl border p-4 text-left transition",
                    selected ? "border-emerald-300/55 bg-emerald-300/10 shadow-[0_18px_50px_rgba(16,185,129,0.12)]" : "border-white/10 bg-white/[0.04] hover:border-white/25",
                  )}
                >
                  <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", step.accent)}>
                    <StepIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-white">{step.title}</span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-zinc-400">{step.body}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <TravelTiltCard className="relative z-10 overflow-hidden rounded-[2.2rem] border border-white/12 bg-white/[0.06] p-5 shadow-[0_44px_120px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.18),transparent_36%)]" aria-hidden />
          <div className="relative min-h-[32rem]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-200">
                <Layers3 className="h-4 w-4" />
                Live journey command
              </span>
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-100">
                Shared engine protected
              </span>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_15rem] lg:items-end">
              <div>
                <span className={cn("grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br text-white shadow-xl", current.accent)}>
                  <Icon className="h-7 w-7" />
                </span>
                <p className="mt-6 text-sm font-black uppercase tracking-wide text-emerald-300">{current.signal}</p>
                <h3 className="mt-2 text-4xl font-black leading-none sm:text-5xl">{current.title}</h3>
                <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">{current.detail}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/12 bg-zinc-950/58 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-zinc-400">Trip status</p>
                <div className="mt-4 space-y-3">
                  {["Offer held", "Payment ready", "Wallet receipt", "Payout queued"].map((item, i) => (
                    <div key={item} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-3 py-2">
                      <span className="text-xs font-bold text-zinc-300">{item}</span>
                      <span className={cn("h-2.5 w-2.5 rounded-full", i <= active ? "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.75)]" : "bg-white/20")} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Link to="/travel/checkout" className="group rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:border-emerald-300/45">
                <CreditCard className="h-5 w-5 text-emerald-300" />
                <p className="mt-3 text-sm font-black">Checkout</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">Open payment flow</p>
              </Link>
              <Link to="/wallet" className="group rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:border-emerald-300/45">
                <WalletCards className="h-5 w-5 text-sky-300" />
                <p className="mt-3 text-sm font-black">Wallet</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">Receipts and cash-out</p>
              </Link>
              <a href="#booking" className="group rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:border-emerald-300/45">
                <Search className="h-5 w-5 text-violet-300" />
                <p className="mt-3 text-sm font-black">New search</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">Return to trip builder</p>
              </a>
            </div>
          </div>
        </TravelTiltCard>
      </div>
    </section>
  );
}

function TravelConfidenceBand() {
  return (
    <section className="relative overflow-hidden border-t border-slate-900/10 bg-gradient-to-b from-white to-sky-50/70 px-4 py-16 sm:px-6 lg:px-8">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" aria-hidden />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-sky-200/45 blur-3xl" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <Reveal>
          <h2 className="text-4xl font-black leading-none text-slate-950 sm:text-5xl">Book with confidence.</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Zivo Travel should feel easy after the search too: tickets, payment, wallet records, and support stay close to the customer.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/my-trips" className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-[0_18px_38px_rgba(15,23,42,0.18)] transition hover:bg-slate-800">
              View my trips
            </Link>
            <Link to="/support" className="rounded-full border border-slate-900/15 bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:border-emerald-400">
              Get support
            </Link>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2">
          {travelAssurance.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={i * 0.05}>
                <Link
                  to={item.href}
                  className="group block h-full rounded-[1.7rem] border border-slate-900/10 bg-white/82 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.1)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-300/55"
                >
                  <span className={cn("grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br shadow-inner", item.tone)}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="mt-5 flex items-center justify-between gap-3 text-lg font-black text-slate-950">
                    {item.title}
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600" />
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AppHandoffPanel() {
  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-[#06111e] px-4 py-16 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-cover bg-center opacity-[0.18]" style={{ backgroundImage: `url(${ambientImage})` }} aria-hidden />
      <div className="absolute inset-0 bg-[#06111e]/88" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-200">
            <ShieldCheck className="h-4 w-4" />
            Web + app handoff
          </span>
          <h2 className="mt-5 text-4xl font-black leading-none text-white sm:text-5xl">Book on web. Continue in the app.</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-300">
            Zivo Travel keeps the customer trip connected across website, app, wallet, support, and partner payout so the booking does not feel split across systems.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/my-trips" className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-zinc-950 shadow-[0_18px_38px_rgba(16,185,129,0.28)] transition hover:bg-emerald-400">
              Open trips
            </Link>
            <Link to="/wallet" className="rounded-full border border-white/20 px-6 py-3 text-sm font-black text-white transition hover:border-white">
              Wallet & cash-out
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="relative zt-perspective">
            <div className="absolute left-8 right-8 top-1/2 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" aria-hidden />
            <div className="grid gap-4 sm:grid-cols-2">
              {appHandoffSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <ScrollTurn key={step.label} rotate={i % 2 === 0 ? 7 : -7} lift={28}>
                    <div className="relative h-full overflow-hidden rounded-[1.7rem] border border-white/12 bg-white/[0.07] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
                      <div className={cn("absolute inset-0 bg-gradient-to-br", step.tone)} aria-hidden />
                      <div className="relative flex h-full min-h-44 flex-col justify-between">
                        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-white/[0.14] text-white">
                          <Icon className="h-6 w-6" />
                        </span>
                        <span className="mt-7 block">
                          <span className="block text-xs font-black uppercase tracking-wide text-emerald-200">{step.label}</span>
                          <span className="mt-2 block text-xl font-black leading-tight text-white">{step.value}</span>
                        </span>
                      </div>
                    </div>
                  </ScrollTurn>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PopularSearchesPanel() {
  return (
    <section className="border-t border-slate-900/10 bg-white px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-black leading-none text-slate-950 sm:text-4xl">Start with a popular search.</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Open a ready-made route, then adjust city, date, traveler, or vehicle details on the booking page.
            </p>
          </div>
          <a href="#booking" className="inline-flex items-center gap-2 text-sm font-black text-emerald-700">
            Build my own search
            <ArrowRight className="h-4 w-4" />
          </a>
        </Reveal>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {popularSearches.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={i * 0.05}>
                <Link
                  to={item.href}
                  className="group flex h-full flex-col justify-between rounded-[1.6rem] border border-slate-900/10 bg-gradient-to-br from-white to-sky-50/70 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.09)] transition hover:-translate-y-1 hover:border-emerald-300/60"
                >
                  <span className={cn("grid h-12 w-12 place-items-center rounded-2xl", item.tone)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mt-7 block">
                    <span className="block text-lg font-black text-slate-950">{item.title}</span>
                    <span className="mt-2 block text-sm leading-6 text-slate-600">{item.body}</span>
                  </span>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-slate-950">
                    Search now
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ZivoTravelLaunchLoader() {
  return (
    <motion.div
      className="zt-launch-loader fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#f8fbff] text-slate-950"
      role="status"
      aria-live="polite"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="zt-aurora opacity-90" aria-hidden />
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" aria-hidden />
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-6 text-center">
        <div className="relative zt-perspective">
          <div className="absolute -inset-20 rounded-full border border-emerald-400/20 zt-loader-orbit" aria-hidden />
          <div className="absolute -inset-12 rounded-full border border-sky-400/20 zt-loader-orbit [animation-direction:reverse]" aria-hidden />
          <div className="relative grid h-28 w-28 place-items-center rounded-[2rem] border border-slate-900/10 bg-white/80 shadow-[0_34px_80px_rgba(14,165,233,0.18)] backdrop-blur-xl zt-loader-float">
            <span className="text-6xl font-black leading-none zt-gradient-text">Z</span>
            <span className="absolute inset-x-3 bottom-4 h-1 overflow-hidden rounded-full bg-slate-900/10">
              <span className="block h-full w-1/2 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 zt-loader-scan" />
            </span>
          </div>
        </div>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.42em] text-emerald-600">Zivo Travel</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-black leading-none sm:text-5xl">Preparing your trip layers</h2>
        <div className="mt-7 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {launchLayers.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={cn("rounded-2xl border border-white/10 px-4 py-3 text-left shadow-xl backdrop-blur zt-loader-float", item.bg)}
                style={{ animationDelay: `${index * 0.18}s` }}
              >
                <Icon className={cn("h-5 w-5", item.color)} />
                <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-700">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default function ZivoTravelHome() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [booting, setBooting] = useState(() => !hasSeenTravelLaunch());
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

  useEffect(() => {
    if (reduce) {
      markTravelLaunchSeen();
      setBooting(false);
      return;
    }
    if (!booting) return;
    const timer = window.setTimeout(() => {
      markTravelLaunchSeen();
      setBooting(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [booting, reduce]);

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
  // tags *after* them, leaving duplicates. After Helmet/global tags settle,
  // de-dupe singleton SEO tags, drop any JSON-LD that isn't travel-branded,
  // and remove off-brand parent-company social images.
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
      const keepTravelThemeColor = () => {
        const nodes = Array.from(head.querySelectorAll('meta[name="theme-color"]'));
        const preferred =
          nodes.find((el) => el.getAttribute("content") === TRAVEL_THEME_COLOR) ||
          nodes[nodes.length - 1];

        if (!preferred) {
          const meta = document.createElement("meta");
          meta.setAttribute("name", "theme-color");
          meta.setAttribute("content", TRAVEL_THEME_COLOR);
          head.append(meta);
          return;
        }

        nodes.forEach((el) => {
          if (el !== preferred) el.remove();
        });
        preferred.setAttribute("content", TRAVEL_THEME_COLOR);
      };
      keepLast('link[rel="canonical"]', () => "canonical");
      keepLast('link[rel="alternate"][hreflang]', (el) => el.getAttribute("hreflang") || "");
      keepLast('meta[name="description"]', () => "description");
      keepLast('meta[name="apple-itunes-app"]', () => "apple-itunes-app");
      keepTravelThemeColor();
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
    const timers = [150, 600, 1400].map((delay) => window.setTimeout(reconcile, delay));
    const observer = new MutationObserver(reconcile);
    observer.observe(document.head, { childList: true, subtree: false });
    const observerStop = window.setTimeout(() => observer.disconnect(), 2500);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(observerStop);
      observer.disconnect();
    };
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
    void recordZivoTravelSearchEvent(payload);
    navigate(href);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    logAndGo(activeService, queryHref);
  };

  const scrollRail = (dir: -1 | 1) => {
    railRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  const handleRefresh = async () => {
    // Brief beat so the pull indicator is visible, then reload latest content.
    await new Promise((resolve) => setTimeout(resolve, 500));
    window.location.reload();
  };

  return (
    <main className="zivo-travel-3d zivo-travel-light min-h-screen bg-white text-slate-950">
      <AnimatePresence>{booting && <ZivoTravelLaunchLoader />}</AnimatePresence>
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
        <meta name="theme-color" content={TRAVEL_THEME_COLOR} />
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
            <a href="#booking" className="h-11 whitespace-nowrap rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-zinc-950 shadow-[0_16px_32px_rgba(16,185,129,0.32)] transition hover:bg-emerald-400">
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

      <TravelPullToRefresh onRefresh={handleRefresh}>
      <PageTransition className="relative">
      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden">
        <FloatingTravelStack activeService={activeService} />
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

        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="relative z-10 flex flex-col justify-center">
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
              className="pointer-events-none absolute -top-6 right-2 z-[60] hidden w-40 drop-shadow-[0_20px_40px_rgba(2,6,23,0.5)] xl:block"
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

      <QuickActionDock />

      <LiveItineraryBoard onSelectService={selectService} />

      <ServiceLayerShowcase />

      <TripStackBuilder onSelectService={selectService} />

      {/* Destinations rail (drag / scroll left + right) */}
      <section className="border-t border-white/10 bg-zinc-950 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black sm:text-4xl">Trending destinations</h2>
              <p className="mt-2 max-w-xl text-zinc-400">Hand-picked cities with flights, hotels, cars, and bus routes ready to book.</p>
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
                className="zt-on-media group relative h-72 w-64 shrink-0 snap-start overflow-hidden rounded-[1.8rem] border border-white/10 text-left"
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

      <PopularSearchesPanel />

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

      <JourneyCommandDeck />

      <AppHandoffPanel />

      <TravelConfidenceBand />

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
      </PageTransition>
      </TravelPullToRefresh>
    </main>
  );
}
