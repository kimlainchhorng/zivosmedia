import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import Star from "lucide-react/dist/esm/icons/star";
import HelpCircle from "lucide-react/dist/esm/icons/help-circle";
import type { LucideIcon } from "lucide-react";

interface PartnerOption {
  type: string;
  label: string;
  hook: string;
  benefits: string[];
  icon: LucideIcon;
  iconClass: string;
}

const OPTIONS: PartnerOption[] = [
  {
    type: "driver",
    label: "Drive with ZIVO",
    hook: "Earn weekly. Set your own hours.",
    benefits: ["Instant payouts", "Surge pricing alerts", "Eats deliveries too"],
    icon: Car,
    iconClass: "text-emerald-500",
  },
  {
    type: "restaurant",
    label: "List your restaurant",
    hook: "Take delivery + table reservations from day one.",
    benefits: ["Reservations", "Pickup & delivery", "Restaurant dashboard"],
    icon: UtensilsCrossed,
    iconClass: "text-orange-500",
  },
  {
    type: "lodging",
    label: "List your hotel",
    hook: "Reach travelers booking flights + cars in one place.",
    benefits: ["Channel manager", "Direct bookings", "Cross-sell to flights"],
    icon: BedDouble,
    iconClass: "text-violet-500",
  },
  {
    type: "property",
    label: "Rent out a property",
    hook: "Short-term stays, long-term tenants — your choice.",
    benefits: ["Smart pricing", "Verified guests", "ID + payment trust"],
    icon: Building2,
    iconClass: "text-foreground",
  },
  {
    type: "employer",
    label: "Post jobs & shifts",
    hook: "Hire, schedule, and manage your workforce in one place.",
    benefits: ["Job postings", "Shift scheduling", "Clock-in / clock-out"],
    icon: Briefcase,
    iconClass: "text-amber-500",
  },
];

const PILLARS = [
  { icon: TrendingUp, label: "Built-in audience", body: "Plug into the millions of riders, eaters & travelers already on ZIVO." },
  { icon: ShieldCheck, label: "Verified & secure", body: "ID checks, fraud detection, and dispute support handled for you." },
  { icon: Sparkles, label: "Cross-sell everywhere", body: "A flight booking can recommend your hotel. A reservation can recommend your ride." },
];

const TESTIMONIALS = [
  {
    name: "Marcus T.",
    role: "ZIVO Driver • Lagos",
    quote: "I cleared more in my first month driving with ZIVO than in three months with the old app. The surge alerts are a game-changer.",
    rating: 5,
  },
  {
    name: "Amara B.",
    role: "Restaurant Partner • Accra",
    quote: "We went from 20 to 80 daily orders within six weeks of joining. The dashboard makes it easy to manage everything.",
    rating: 5,
  },
  {
    name: "Kofi A.",
    role: "Hotel Partner • Nairobi",
    quote: "Cross-selling with ride bookings doubled our weekend occupancy. ZIVO brings guests we'd never reach on our own.",
    rating: 5,
  },
];

const FAQS = [
  {
    q: "How much does it cost to join?",
    a: "Joining ZIVO as a partner is free. We earn a small commission only when you earn — no upfront fees, no monthly charges.",
  },
  {
    q: "How long does verification take?",
    a: "Most applications are reviewed within 24–48 hours. Once approved, your listing goes live immediately.",
  },
  {
    q: "Can I manage multiple locations or vehicles?",
    a: "Yes. One ZIVO partner account can manage unlimited locations, properties, or driver profiles from a single dashboard.",
  },
  {
    q: "When and how do I get paid?",
    a: "Earnings are settled weekly via direct bank transfer or mobile money. Drivers can request instant payouts for an extra $0.50 fee.",
  },
  {
    q: "What support is available?",
    a: "Every partner gets a dedicated onboarding specialist plus 24/7 in-app chat. Enterprise partners get a named account manager.",
  },
];

const HOURLY_RATE = 18;

export default function BecomePartnerPage() {
  const navigate = useNavigate();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [hoursPerWeek, setHoursPerWeek] = useState(30);

  const weeklyEst = Math.round(hoursPerWeek * HOURLY_RATE);
  const monthlyEst = Math.round(weeklyEst * 4.3);

  return (
    <div className="min-h-[100dvh] bg-background pb-16">
      <SEOHead
        title="Become a Partner – Earn with ZIVO"
        description="Join ZIVO as a driver, restaurant, hotel, property owner, or employer. Access our super-app platform with unified dashboard, instant payouts, and millions of customers."
      />

      {/* Hero */}
      <section className="border-b border-border bg-background">
        <div className="max-w-screen-md mx-auto px-5 pt-12 pb-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border text-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
            <Sparkles className="w-3 h-3" /> Become a partner
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3 leading-tight">
            Grow with the only super-app that ties them all together.
          </h1>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base">
            Drivers, restaurants, hotels, property owners, and employers share one platform. One account,
            one dashboard, one network of customers across rides, eats, flights, and stays.
          </p>
        </div>
      </section>

      {/* Partner type cards */}
      <section className="max-w-screen-md mx-auto px-4 pt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
          Pick your path
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPTIONS.map((opt, i) => {
            const Icon = opt.icon;
            return (
              <motion.button
                key={opt.type}
                whileTap={{ scale: 0.98 }}
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/partner-with-zivo?type=${opt.type}`)}
                className="relative overflow-hidden rounded-3xl p-5 text-left bg-card border border-border hover:border-foreground/30 transition-colors touch-manipulation"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center">
                    <Icon className={`w-6 h-6 ${opt.iconClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold tracking-tight leading-tight text-foreground">{opt.label}</div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">{opt.hook}</div>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {opt.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-1.5 text-[12px] text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-foreground text-background px-3 py-1.5 text-[12px] font-bold">
                  Get started <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Driver earnings estimator */}
      <section className="max-w-screen-md mx-auto px-4 mt-10">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-bold">Driver Earnings Estimator</span>
          </div>
          <p className="text-[12px] text-muted-foreground mb-5">
            See how much you could earn based on hours driven per week.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Hours per week</span>
              <span className="font-bold text-foreground">{hoursPerWeek} hrs</span>
            </div>
            <input
              type="range" min={5} max={80} step={5}
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
              aria-label="Hours per week"
            />
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Weekly</p>
                <p className="text-2xl font-extrabold text-emerald-600">${weeklyEst.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Monthly</p>
                <p className="text-2xl font-extrabold text-emerald-600">${monthlyEst.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Estimate based on avg $18/hr after ZIVO commission. Actual earnings vary by location and demand.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/partner-with-zivo?type=driver")}
            className="mt-4 w-full rounded-2xl bg-ig-gradient text-white font-bold py-3 text-sm shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Start driving with ZIVO
          </button>
        </div>
      </section>

      {/* Why ZIVO pillars */}
      <section className="max-w-screen-md mx-auto px-4 mt-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
          Why partners choose ZIVO
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.label} className="rounded-2xl border border-border bg-card p-4">
                <div className="w-9 h-9 rounded-xl bg-secondary border border-border text-foreground flex items-center justify-center mb-2">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-sm font-bold text-foreground">{p.label}</div>
                <div className="text-[12px] text-muted-foreground mt-1">{p.body}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-screen-md mx-auto px-4 mt-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
          Partner stories
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-[12px] text-foreground leading-relaxed flex-1">"{t.quote}"</p>
              <div>
                <p className="text-[12px] font-bold text-foreground">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-screen-md mx-auto px-4 mt-10">
        <div className="flex items-center gap-2 mb-3 px-1">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Frequently asked questions
          </h2>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                type="button"
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-muted/20 transition-colors touch-manipulation"
              >
                <span className="text-[13px] font-semibold pr-4">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${faqOpen === i ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {faqOpen === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-[12px] text-muted-foreground leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-screen-md mx-auto px-4 mt-10">
        <div className="rounded-3xl bg-secondary border border-border p-5">
          <div className="text-base font-bold tracking-tight text-foreground">Not sure which fits?</div>
          <div className="text-[12px] text-muted-foreground mt-1">
            Talk to our partnerships team — we'll help you pick the right entry point.
          </div>
          <button
            type="button"
            onClick={() => navigate("/contact")}
            className="mt-3 inline-flex items-center gap-1 rounded-xl bg-foreground text-background font-bold px-4 py-2 text-sm active:scale-[0.98] transition-transform"
          >
            Contact sales <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
