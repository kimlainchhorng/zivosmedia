import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  KeyRound,
  Landmark,
  LockKeyhole,
  Luggage,
  MapPin,
  Plane,
  Route,
  Search,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import heroTravelImage from "@/assets/hero-travel-1.jpg";
import cityImage from "@/assets/hero-city-lasvegas.jpg";
import carImage from "@/assets/car-suv.jpg";
import beachImage from "@/assets/bg-beach.jpg";
import { zivoTravelSupabase } from "@/integrations/supabase/travelClient";
import { cn } from "@/lib/utils";

type TravelService = "flight" | "hotel" | "rental_car" | "bus";

const services: {
  id: TravelService;
  label: string;
  nav: string;
  href: string;
  icon: typeof Plane;
  accent: string;
  ring: string;
  fromLabel: string;
  toLabel: string;
  fromPlaceholder: string;
  toPlaceholder: string;
  fromValue: string;
  toValue: string;
}[] = [
  {
    id: "flight",
    label: "Flights",
    nav: "Flights",
    href: "/flights",
    icon: Plane,
    accent: "text-sky-600",
    ring: "ring-sky-500/20",
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
    accent: "text-violet-600",
    ring: "ring-violet-500/20",
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
    accent: "text-emerald-600",
    ring: "ring-emerald-500/20",
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
    accent: "text-orange-600",
    ring: "ring-orange-500/20",
    fromLabel: "From",
    toLabel: "To",
    fromPlaceholder: "Departure city",
    toPlaceholder: "Arrival city",
    fromValue: "Bangkok",
    toValue: "Chiang Mai",
  },
];

const workflow = [
  { title: "Search", body: "Find flights, hotels, cars, and bus seats.", icon: Search, color: "text-teal-600" },
  { title: "Compare", body: "Review prices, policies, timing, and routes.", icon: TrendingUp, color: "text-sky-600" },
  { title: "Pay", body: "Secure checkout, deposits, and refunds.", icon: CreditCard, color: "text-emerald-600" },
  { title: "Trip wallet", body: "Track bookings, credits, and receipts.", icon: WalletCards, color: "text-teal-700" },
  { title: "Payout / Cash out", body: "Partners get paid with transparent records.", icon: Landmark, color: "text-orange-600" },
];

const ops = [
  { title: "API access", body: "Developer-first bridge to build and scale.", icon: Code2, color: "bg-fuchsia-500" },
  { title: "SSO & security", body: "Auth, session safety, and audit-ready access.", icon: LockKeyhole, color: "bg-blue-500" },
  { title: "SEO optimized", body: "Search-ready service and city pages.", icon: TrendingUp, color: "bg-emerald-500" },
  { title: "Global network", body: "A travel layer under Zivos Media.", icon: Globe2, color: "bg-rose-500" },
  { title: "Real-time ops", body: "Live status, alerts, support, and performance.", icon: Headphones, color: "bg-sky-500" },
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

export default function ZivoTravelHome() {
  const navigate = useNavigate();
  const [active, setActive] = useState<TravelService>("flight");
  const [from, setFrom] = useState("New York, JFK");
  const [to, setTo] = useState("Paris, CDG");
  const [dateStart, setDateStart] = useState("2026-07-10");
  const [dateEnd, setDateEnd] = useState("2026-07-17");
  const [travelers, setTravelers] = useState("1");
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeIndex = services.findIndex((service) => service.id === active);
  const activeService = services[activeIndex] || services[0];

  const setService = (service: TravelService) => {
    const next = services.find((item) => item.id === service) || services[0];
    setActive(next.id);
    setFrom(next.fromValue);
    setTo(next.toValue);
  };

  const rotate = (direction: -1 | 1) => {
    const nextIndex = (activeIndex + direction + services.length) % services.length;
    setService(services[nextIndex].id);
  };

  const queryHref = useMemo(() => {
    const params = new URLSearchParams();
    if (from.trim()) params.set(active === "hotel" ? "destination" : "from", from.trim());
    if (to.trim()) params.set(active === "hotel" ? "area" : "to", to.trim());
    if (dateStart) params.set("start", dateStart);
    if (dateEnd) params.set("end", dateEnd);
    if (travelers) params.set("travelers", travelers);
    const query = params.toString();
    return `${activeService.href}${query ? `?${query}` : ""}`;
  }, [active, activeService.href, dateEnd, dateStart, from, to, travelers]);

  const submitSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      session_id: getTravelSessionId(),
      service_type: active,
      origin: active === "hotel" ? null : from.trim() || null,
      destination: active === "hotel" ? from.trim() || null : to.trim() || null,
      pickup: active === "rental_car" ? from.trim() || null : null,
      dropoff: active === "rental_car" ? to.trim() || null : null,
      date_start: dateStart || null,
      date_end: dateEnd || null,
      travelers: Number.parseInt(travelers, 10) || 1,
      rooms: active === "hotel" ? 1 : null,
      source_host: typeof window !== "undefined" ? window.location.hostname : "zivostravel.com",
      filters: {
        mode: activeService.label,
        queryHref,
      },
    };

    zivoTravelSupabase
      .from("zivo_travel_search_events")
      .insert(payload)
      .then(({ error }) => {
        if (error) console.warn("[zivo-travel] search event skipped", error.message);
      });

    navigate(queryHref);
  };

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <Helmet>
        <title>Zivo Travel | Flights, Hotels, Rental Cars, and Bus Booking</title>
        <meta
          name="description"
          content="Zivo Travel connects flights, hotels, rental cars, and bus booking in one travel workflow with payments, partner payouts, API access, SSO, and SEO-ready trip pages."
        />
        <link rel="canonical" href="https://zivostravel.com/" />
        <meta property="og:title" content="Zivo Travel" />
        <meta property="og:description" content="Flights, hotels, rental cars, and bus booking in one connected workflow." />
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-3" aria-label="Zivo Travel home">
            <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-zinc-950 text-3xl font-black leading-none text-white shadow-[0_18px_45px_rgba(9,9,11,0.18)]">
              Z
              <span className="absolute -right-1 -top-1 h-4 w-4 rounded-md bg-emerald-400" />
              <span className="absolute -bottom-1 left-2 h-3 w-3 rounded-full bg-sky-400" />
              <span className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-[1.15rem] border border-emerald-300/70 transition group-hover:rotate-12" />
            </span>
            <span>
              <span className="block text-xl font-black leading-none tracking-[0.18em]">ZIVO</span>
              <span className="block text-sm font-black leading-none tracking-[0.38em] text-emerald-600">TRAVEL</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-bold text-zinc-700 lg:flex">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => setService(service.id)}
                className={cn("flex items-center gap-2 transition hover:text-zinc-950", active === service.id && service.accent)}
              >
                <service.icon className="h-4 w-4" />
                {service.nav}
              </button>
            ))}
            <Link to="/my-trips" className="flex items-center gap-2 transition hover:text-zinc-950">
              <Luggage className="h-4 w-4" />
              Trips
            </Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button type="button" className="flex h-11 items-center gap-2 rounded-full border border-zinc-200 px-4 text-sm font-bold">
              <Globe2 className="h-4 w-4" />
              USD
            </button>
            <Link to="/login" className="h-11 rounded-full border border-zinc-200 px-6 py-3 text-sm font-black transition hover:border-zinc-950">
              Log in
            </Link>
            <a href="#booking" className="h-11 rounded-full bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-[0_16px_32px_rgba(16,185,129,0.24)] transition hover:bg-emerald-700">
              Start booking
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-black md:hidden"
          >
            Menu
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-zinc-200 bg-white px-4 py-4 md:hidden">
            <div className="grid gap-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setService(service.id);
                    setMobileOpen(false);
                  }}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3 text-left text-sm font-black"
                >
                  <span className="flex items-center gap-2"><service.icon className="h-4 w-4" />{service.label}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden border-b border-zinc-100">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(224,242,254,0.82))] lg:block" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:pb-20 lg:pt-16">
          <div className="relative z-10 flex flex-col justify-center">
            <h1 className="max-w-3xl text-6xl font-black leading-[0.9] text-zinc-950 sm:text-7xl lg:text-8xl">
              Zivo Travel
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-zinc-600 sm:text-2xl">
              Flights, hotels, rental cars, and bus booking in one connected workflow for every journey.
            </p>

            <form id="booking" onSubmit={submitSearch} className={cn("mt-9 rounded-[2rem] border border-zinc-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.10)] ring-8", activeService.ring)}>
              <div className="grid grid-cols-2 border-b border-zinc-200 md:grid-cols-4">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setService(service.id)}
                    className={cn(
                      "flex min-h-16 items-center justify-center gap-2 border-zinc-200 px-3 text-sm font-black transition md:border-r",
                      active === service.id ? `${service.accent} bg-zinc-50` : "text-zinc-600 hover:bg-zinc-50",
                    )}
                  >
                    <service.icon className="h-4 w-4" />
                    {service.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_0.8fr]">
                <label className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <span className="text-xs font-black uppercase text-zinc-500">{activeService.fromLabel}</span>
                  <span className="mt-2 flex items-center gap-2">
                    <MapPin className={cn("h-4 w-4", activeService.accent)} />
                    <input
                      value={from}
                      onChange={(event) => setFrom(event.target.value)}
                      placeholder={activeService.fromPlaceholder}
                      className="w-full bg-transparent text-sm font-black outline-none"
                    />
                  </span>
                </label>
                <label className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <span className="text-xs font-black uppercase text-zinc-500">{activeService.toLabel}</span>
                  <span className="mt-2 flex items-center gap-2">
                    <Route className="h-4 w-4 text-zinc-500" />
                    <input
                      value={to}
                      onChange={(event) => setTo(event.target.value)}
                      placeholder={activeService.toPlaceholder}
                      className="w-full bg-transparent text-sm font-black outline-none"
                    />
                  </span>
                </label>
                <label className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <span className="text-xs font-black uppercase text-zinc-500">Dates</span>
                  <span className="mt-2 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-zinc-500" />
                    <input
                      type="date"
                      value={dateStart}
                      onChange={(event) => setDateStart(event.target.value)}
                      className="w-full bg-transparent text-sm font-black outline-none"
                    />
                  </span>
                </label>
                <label className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <span className="text-xs font-black uppercase text-zinc-500">Travelers</span>
                  <span className="mt-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-zinc-500" />
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={travelers}
                      onChange={(event) => setTravelers(event.target.value)}
                      className="w-full bg-transparent text-sm font-black outline-none"
                    />
                  </span>
                </label>
              </div>

              <div className="grid gap-3 px-4 pb-4 md:grid-cols-[1fr_1fr_1.7fr]">
                <label className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <span className="text-xs font-black uppercase text-zinc-500">Return</span>
                  <span className="mt-2 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-zinc-500" />
                    <input
                      type="date"
                      value={dateEnd}
                      onChange={(event) => setDateEnd(event.target.value)}
                      className="w-full bg-transparent text-sm font-black outline-none"
                    />
                  </span>
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 text-sm font-black text-zinc-700">
                  <BadgeCheck className={cn("h-5 w-5", activeService.accent)} />
                  Direct workflow
                </div>
                <button
                  type="submit"
                  className="group flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 text-base font-black text-white shadow-[0_22px_40px_rgba(16,185,129,0.24)] transition hover:bg-emerald-700"
                >
                  Search {activeService.label}
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/14 transition group-hover:translate-x-1">
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </button>
              </div>
            </form>

            <div className="mt-6 grid gap-3 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-3">
              {[
                { title: "Secure payments", body: "PCI-ready flows", icon: ShieldCheck },
                { title: "24/7 support", body: "Around the world", icon: Headphones },
                { title: "Trusted partners", body: "Travel network", icon: BadgeCheck },
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-zinc-800" />
                  <div>
                    <p className="text-xs font-black">{item.title}</p>
                    <p className="text-xs text-zinc-500">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 min-h-[620px] overflow-visible lg:min-h-[670px]">
            <button
              type="button"
              onClick={() => rotate(-1)}
              className="absolute left-0 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 bg-white shadow-xl transition hover:scale-105"
              aria-label="Previous travel service"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => rotate(1)}
              className="absolute right-0 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 bg-white shadow-xl transition hover:scale-105"
              aria-label="Next travel service"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute inset-0 rounded-[3rem] bg-[radial-gradient(circle_at_68%_45%,rgba(14,165,233,0.16),transparent_38%),linear-gradient(180deg,rgba(240,249,255,0.74),rgba(255,255,255,0))]" />
            <motion.div
              className="absolute left-1/2 top-10 h-[560px] w-[620px] max-w-[96vw] -translate-x-1/2 [perspective:1300px]"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute left-[24%] top-0 h-44 w-72 rotate-[-6deg] rounded-[1.65rem] border border-white/80 bg-white/80 p-5 shadow-[0_28px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl">
                <p className="text-sm font-black text-zinc-500">Smart route</p>
                <div className="mt-4 flex items-center justify-between text-3xl font-black">
                  <span>JFK</span>
                  <ArrowRight className="h-7 w-7 text-zinc-400" />
                  <span>CDG</span>
                </div>
                <p className="mt-2 text-sm font-bold text-zinc-500">Jul 10 - 7 days - 1 Traveler</p>
              </div>

              <div className="absolute left-[12%] top-[118px] h-44 w-[440px] rotate-[4deg] overflow-hidden rounded-[1.7rem] border border-zinc-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.20)]">
                <div className="h-4 bg-emerald-500" />
                <div className="grid h-[calc(100%-1rem)] grid-cols-[1fr_0.58fr]">
                  <div className="p-5">
                    <p className="text-xs font-black uppercase text-zinc-500">Boarding pass</p>
                    <div className="mt-4 flex items-center justify-between text-3xl font-black">
                      <span>JFK</span>
                      <Plane className="h-8 w-8 text-zinc-800" />
                      <span>CDG</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-zinc-500">ZV102 - Seat 12A</p>
                  </div>
                  <div className="border-l border-dashed border-zinc-300 bg-zinc-50 p-5">
                    <div className="grid h-20 w-20 grid-cols-4 gap-1">
                      {Array.from({ length: 16 }).map((_, index) => (
                        <span key={index} className={cn("rounded-sm", index % 3 === 0 ? "bg-zinc-950" : "bg-zinc-300")} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="absolute left-[6%] top-[270px] h-24 w-[430px] rotate-[-5deg] overflow-hidden rounded-[1.4rem] border border-white bg-cover bg-center p-5 text-white shadow-[0_28px_70px_rgba(37,99,235,0.22)]"
                style={{ backgroundImage: `linear-gradient(90deg,rgba(49,46,129,0.86),rgba(49,46,129,0.28)),url(${heroTravelImage})` }}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/18 backdrop-blur">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase">Ocean View Hotel</p>
                    <p className="text-xs font-bold text-white/80">Santorini - 3 nights</p>
                  </div>
                </div>
              </div>

              <div className="absolute left-[1%] top-[360px] grid h-28 w-[500px] rotate-[2deg] grid-cols-[1fr_180px] overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
                <div className="p-5">
                  <p className="text-sm font-black">Compact SUV</p>
                  <p className="text-xs font-bold text-zinc-500">Toyota RAV4 or similar</p>
                  <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Pick-up ready</span>
                </div>
                <div className="bg-cover bg-center" style={{ backgroundImage: `url(${carImage})` }} />
              </div>

              <div className="absolute left-[16%] top-[465px] h-28 w-[390px] rotate-[8deg] overflow-hidden rounded-[1.4rem] border border-orange-100 bg-orange-50 shadow-[0_26px_70px_rgba(249,115,22,0.20)]">
                <div className="grid h-full grid-cols-[1fr_150px]">
                  <div className="p-5">
                    <p className="text-sm font-black uppercase text-zinc-700">Deluxe bus</p>
                    <p className="text-xs font-bold text-zinc-500">Bangkok to Chiang Mai</p>
                    <p className="mt-3 text-xs font-black text-orange-600">Seat 08A</p>
                  </div>
                  <div className="grid place-items-center bg-orange-500 text-white">
                    <Bus className="h-10 w-10" />
                  </div>
                </div>
              </div>

              <div
                className="absolute bottom-0 left-[14%] h-32 w-[520px] rotate-[-3deg] rounded-[1.6rem] border border-white bg-cover bg-center shadow-[0_30px_90px_rgba(8,47,73,0.24)]"
                style={{ backgroundImage: `linear-gradient(90deg,rgba(255,255,255,0.3),rgba(255,255,255,0.06)),url(${beachImage})` }}
              >
                <div className="absolute inset-x-12 top-1/2 h-1 -translate-y-1/2 rounded-full bg-cyan-400" />
                {[18, 38, 62, 82].map((left, index) => (
                  <span
                    key={left}
                    className={cn(
                      "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white shadow-lg",
                      index % 2 ? "bg-fuchsia-500" : "bg-emerald-500",
                    )}
                    style={{ left: `${left}%` }}
                  />
                ))}
              </div>
            </motion.div>

            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setService(service.id)}
                  className={cn("h-2 rounded-full transition-all", active === service.id ? "w-8 bg-emerald-600" : "w-2 bg-zinc-300")}
                  aria-label={`Show ${service.label}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[260px_1fr]">
          <div>
            <h2 className="text-4xl font-black leading-none">One workflow. Every journey.</h2>
            <p className="mt-5 text-base leading-7 text-zinc-600">
              From search to payout, Zivo Travel keeps customer booking, partner operations, and trip records connected.
            </p>
            <a href="#booking" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-emerald-700">
              See how it works <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-5">
              {workflow.map((step, index) => (
                <div key={step.title} className="relative">
                  <div className="flex items-start gap-3">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-zinc-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
                      <step.icon className={cn("h-6 w-6", step.color)} />
                    </span>
                    <span>
                      <span className="block text-sm font-black">{step.title}</span>
                      <span className="mt-2 block text-sm leading-6 text-zinc-600">{step.body}</span>
                    </span>
                  </div>
                  {index < workflow.length - 1 && (
                    <span className="absolute right-2 top-7 hidden h-px w-8 bg-zinc-300 md:block" />
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              {ops.map((item) => (
                <Link
                  key={item.title}
                  to={item.title === "SEO optimized" ? "/guides/cheap-flights" : item.title === "SSO & security" ? "/login" : "/connect-website"}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg"
                >
                  <span className={cn("grid h-11 w-11 place-items-center rounded-2xl text-white", item.color)}>
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="mt-4 block text-sm font-black">{item.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-zinc-600">{item.body}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-950 px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="text-4xl font-black">Built under Zivos Media, focused for travel.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
              Zivo Travel can run as its own website and app surface while staying connected to the larger Zivos Media account, auth, payment, and partner ecosystem.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Backend target", value: "xbllvmpomorawkcrtbcq" },
              { label: "Source bridge", value: "zivosmedia.com data" },
              { label: "Customer domain", value: "zivostravel.com" },
              { label: "Core services", value: "Flights, hotels, cars, bus" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/12 bg-white/8 p-5">
                <p className="text-xs font-black uppercase text-emerald-300">{item.label}</p>
                <p className="mt-2 text-lg font-black">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
