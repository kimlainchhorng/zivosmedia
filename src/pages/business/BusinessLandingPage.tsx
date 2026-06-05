/**
 * ZIVO Software landing page
 * /business
 */

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarCheck,
  Car,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Hotel,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  PackageCheck,
  Plus,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Utensils,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { STORE_CATEGORY_OPTIONS } from "@/config/groceryStores";
import bgCafe from "@/assets/bg-cafe.jpg";
import bgOffice from "@/assets/bg-office.jpg";
import hotelResort from "@/assets/hotel-resort.jpg";
import serviceCars from "@/assets/service-cars.jpg";
import serviceShopping from "@/assets/service-shopping.png";
import serviceTire from "@/assets/service-tire.jpg";
import zivoShopping from "@/assets/zivo-shopping.webp";

const allowedGroups = [
  "Hotels & Resorts",
  "Food & Drink",
  "Shopping & Markets",
  "Auto",
  "Transport",
  "Beauty & Wellness",
  "Services",
];

const groupImages: Record<string, string> = {
  "Hotels & Resorts": hotelResort,
  "Food & Drink": bgCafe,
  "Shopping & Markets": zivoShopping,
  Auto: serviceCars,
  Transport: serviceShopping,
  "Beauty & Wellness": bgOffice,
  Services: serviceTire,
};

const groupIcons: Record<string, typeof Store> = {
  "Hotels & Resorts": Hotel,
  "Food & Drink": Utensils,
  "Shopping & Markets": ShoppingBag,
  Auto: Car,
  Transport: Store,
  "Beauty & Wellness": Scissors,
  Services: Wrench,
};

const groupedCategories = allowedGroups
  .map((group) => ({
    group,
    categories: STORE_CATEGORY_OPTIONS.filter((option) => option.group === group),
  }))
  .filter((entry) => entry.categories.length > 0);

const workflow = [
  {
    title: "Setup",
    copy: "Create the business profile, choose an industry, invite staff, and connect the workspace.",
    icon: Plus,
  },
  {
    title: "Operate",
    copy: "Run bookings, work orders, inventory, payments, employees, customers, and messages.",
    icon: LayoutDashboard,
  },
  {
    title: "Grow",
    copy: "Review revenue, promotions, reports, customer activity, and repeat-business tools.",
    icon: BarChart3,
  },
];

const dashboardTiles = [
  { label: "Bookings", value: "42", icon: CalendarCheck, tone: "bg-emerald-400" },
  { label: "Revenue", value: "$18.4k", icon: CreditCard, tone: "bg-zinc-950 text-white" },
  { label: "Work orders", value: "17", icon: Wrench, tone: "bg-sky-400" },
  { label: "Messages", value: "128", icon: MessageCircle, tone: "bg-pink-400" },
];

const featureCards = [
  {
    title: "Daily operations",
    copy: "Bookings, orders, invoices, schedules, customer records, and staff activity in one workspace.",
    icon: ClipboardList,
  },
  {
    title: "Payments and receipts",
    copy: "Track paid invoices, pending balances, deposits, refunds, and daily revenue reports.",
    icon: CreditCard,
  },
  {
    title: "Team access",
    copy: "Invite employees, manage roles, and keep each workspace tied to the right business account.",
    icon: BadgeCheck,
  },
  {
    title: "Secure dashboard",
    copy: "Signed-in dashboards, protected admin actions, hardened RPC access, and edge security headers.",
    icon: ShieldCheck,
  },
  {
    title: "Customer workflows",
    copy: "Booking links, review requests, estimates, invoices, service messages, and loyalty tools.",
    icon: MessageCircle,
  },
  {
    title: "Desktop-ready software",
    copy: "Business workspaces are designed for computer screens where owners do serious daily work.",
    icon: PackageCheck,
  },
];

function authPath(path: "/login" | "/signup") {
  const redirect = path === "/login" ? "/business" : "/business/new";
  return `${path}?redirect=${encodeURIComponent(redirect)}`;
}

function ZivoSoftwareLogo() {
  return (
    <Link to="/business" className="group inline-flex items-center gap-3" aria-label="ZIVO Software home">
      <span className="relative flex h-12 w-12 items-center justify-center rounded-[14px] bg-zinc-950 shadow-[0_18px_38px_rgba(15,23,42,0.16)]">
        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-[5px] bg-emerald-400 shadow-[0_8px_18px_rgba(52,211,153,0.36)]" />
        <span className="absolute bottom-2 left-2 h-3 w-3 rounded-full bg-sky-400" />
        <span className="text-3xl font-black leading-none text-transparent bg-clip-text bg-ig-gradient">Z</span>
      </span>
      <span className="hidden sm:block leading-tight">
        <span className="block text-[18px] font-black tracking-[0.22em] text-zinc-950">ZIVO</span>
        <span className="block text-[12px] font-black tracking-[0.32em] text-emerald-600">SOFTWARE</span>
      </span>
    </Link>
  );
}

function BusinessHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/88 backdrop-blur-2xl">
      <div className="mx-auto flex h-[78px] w-full max-w-[1400px] items-center gap-6 px-6">
        <ZivoSoftwareLogo />
        <nav aria-label="ZIVO Software sections" className="hidden flex-1 items-center justify-center gap-8 lg:flex">
          {[
            ["Software", "#software"],
            ["Workflow", "#workflow"],
            ["Industries", "#industries"],
            ["Security", "#security"],
          ].map(([label, href]) => (
            <a key={label} href={href} className="text-[15px] font-bold text-zinc-700 transition-colors hover:text-zinc-950">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Button asChild variant="ghost" className="hidden h-11 rounded-full px-5 text-[15px] font-bold sm:inline-flex">
            <Link to={authPath("/login")}>Log in</Link>
          </Button>
          <Button asChild className="h-11 rounded-full bg-zinc-950 px-5 text-[15px] font-bold text-white hover:bg-zinc-800">
            <Link to={authPath("/signup")}>Sign up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function DashboardGraphic() {
  return (
    <div className="relative mx-auto h-[520px] w-full max-w-[620px]" aria-hidden="true">
      <div className="absolute left-10 top-8 h-[430px] w-[360px] rotate-[-8deg] rounded-[36px] border border-zinc-200 bg-white shadow-[0_34px_90px_rgba(15,23,42,0.16)]" />
      <div className="absolute left-24 top-20 h-[430px] w-[360px] rotate-[9deg] overflow-hidden rounded-[36px] border border-zinc-200 bg-white shadow-[0_42px_110px_rgba(15,23,42,0.2)]">
        <img src={serviceCars} alt="" className="h-36 w-full object-cover" loading="eager" />
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-zinc-400">Workspace</p>
              <p className="text-2xl font-black text-zinc-950">Auto Repair</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Live</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {dashboardTiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <div key={tile.label} className="rounded-[18px] border border-zinc-100 bg-zinc-50 p-3 shadow-sm">
                  <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-[12px] ${tile.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-black text-zinc-950">{tile.value}</p>
                  <p className="text-xs font-semibold text-zinc-500">{tile.label}</p>
                </div>
              );
            })}
          </div>
          <div className="rounded-[20px] bg-zinc-950 p-4 text-white">
            <div className="flex items-center justify-between text-xs font-bold text-white/60">
              <span>Today</span>
              <span>92%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-[92%] rounded-full bg-ig-gradient" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute right-3 top-36 rotate-[7deg] rounded-[22px] border border-zinc-200 bg-white p-4 shadow-[0_22px_52px_rgba(15,23,42,0.16)]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-400">
            <CheckCircle2 className="h-5 w-5 text-zinc-950" />
          </span>
          <div>
            <p className="font-black text-zinc-950">Secure sign-in</p>
            <p className="text-sm font-semibold text-zinc-500">team access ready</p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-20 left-0 rotate-[-10deg] rounded-[22px] border border-zinc-200 bg-white p-4 shadow-[0_22px_52px_rgba(15,23,42,0.16)]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-sky-400">
            <FileText className="h-5 w-5 text-zinc-950" />
          </span>
          <div>
            <p className="font-black text-zinc-950">Invoices</p>
            <p className="text-sm font-semibold text-zinc-500">paid and unpaid</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BusinessLandingPage() {
  return (
    <>
      <Helmet>
        <title>ZIVO Software | Business Workspaces</title>
        <meta
          name="description"
          content="Launch a ZIVO Software workspace for hotels, food, retail, auto, transport, wellness, and local service businesses."
        />
      </Helmet>

      <div className="min-h-screen bg-[#fbfbfc] text-zinc-950">
        <BusinessHeader />

        <main>
          <section className="relative overflow-hidden border-b border-zinc-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#ffffff_100%)]">
            <div className="mx-auto grid min-h-[720px] max-w-[1400px] items-center gap-10 px-6 pb-14 pt-12 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="max-w-2xl">
                <div className="mb-8 flex gap-4 overflow-hidden">
                  {groupedCategories.map((entry) => {
                    const Icon = groupIcons[entry.group] || Store;
                    return (
                      <a key={entry.group} href="#industries" className="group text-center">
                        <span className="ring-ig-gradient inline-flex h-[74px] w-[74px] items-center justify-center rounded-full p-[3px]">
                          <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
                            <Icon className="h-7 w-7 text-zinc-950" />
                          </span>
                        </span>
                        <span className="mt-2 block max-w-[86px] truncate text-xs font-bold text-zinc-600 group-hover:text-zinc-950">
                          {entry.group}
                        </span>
                      </a>
                    );
                  })}
                </div>

                <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black shadow-sm">
                  <Sparkles className="h-4 w-4 text-pink-500" />
                  Desktop-first software for local operators
                </p>
                <h1 className="max-w-[850px] text-[58px] font-black leading-[0.96] tracking-normal text-zinc-950 md:text-[72px]">
                  ZIVO Software for every local business workflow
                </h1>
                <p className="mt-7 max-w-2xl text-xl font-medium leading-9 text-zinc-600">
                  Build a business workspace with setup, dashboard, bookings, work orders, payments,
                  customers, employees, reports, and secure account access from one clean website.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="h-14 rounded-full bg-zinc-950 px-7 text-base font-black text-white hover:bg-zinc-800">
                    <Link to="/business/new">
                      Create Business Software
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-14 rounded-full border-zinc-300 bg-white px-7 text-base font-black">
                    <a href="#industries">Explore industries</a>
                  </Button>
                </div>
                <div className="mt-10 grid max-w-[600px] grid-cols-3 gap-4">
                  {[
                    ["7", "Industry groups"],
                    ["30+", "Business types"],
                    ["1", "Software domain"],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-[22px] border border-zinc-200 bg-white p-5 shadow-sm">
                      <p className="text-3xl font-black">{value}</p>
                      <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <DashboardGraphic />
            </div>
          </section>

          <section id="software" className="py-20">
            <div className="mx-auto max-w-[1280px] px-6">
              <div className="mb-10 flex items-end justify-between gap-8">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-600">Software</p>
                  <h2 className="mt-3 text-4xl font-black tracking-normal">Everything owners expect on a computer screen</h2>
                </div>
                <Button asChild variant="outline" className="hidden rounded-full border-zinc-300 bg-white font-black lg:inline-flex">
                  <Link to="/login?redirect=%2Fbusiness">Open Dashboard</Link>
                </Button>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {featureCards.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <article key={feature.title} className="rounded-[26px] border border-zinc-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
                      <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-zinc-950 text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-5 text-xl font-black">{feature.title}</h3>
                      <p className="mt-3 text-sm font-medium leading-6 text-zinc-600">{feature.copy}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="workflow" className="border-y border-zinc-200 bg-white py-20">
            <div className="mx-auto max-w-[1280px] px-6">
              <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-pink-600">Workflow</p>
                  <h2 className="mt-3 text-4xl font-black tracking-normal">Setup, operate, and grow without leaving the workspace</h2>
                  <p className="mt-5 text-lg font-medium leading-8 text-zinc-600">
                    The website path guides owners from sign up to setup, then sends them into the dashboard that matches their business type.
                  </p>
                </div>
                <div className="grid gap-5 md:grid-cols-3">
                  {workflow.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <article key={step.title} className="rounded-[26px] border border-zinc-200 bg-[#fbfbfc] p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-ig-gradient text-white">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-4xl font-black text-zinc-200">0{index + 1}</span>
                        </div>
                        <h3 className="mt-6 text-xl font-black">{step.title}</h3>
                        <p className="mt-3 text-sm font-medium leading-6 text-zinc-600">{step.copy}</p>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section id="industries" className="py-20">
            <div className="mx-auto max-w-[1280px] px-6">
              <div className="mb-10">
                <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-600">Industries</p>
                <h2 className="mt-3 text-4xl font-black tracking-normal">Only the business software categories you asked for</h2>
              </div>
              <div className="grid gap-5 lg:grid-cols-7">
                {groupedCategories.map((entry) => {
                  const Icon = groupIcons[entry.group] || Store;
                  return (
                    <article key={entry.group} className="overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-sm lg:col-span-1">
                      <div className="relative h-28">
                        <img src={groupImages[entry.group]} alt="" className="h-full w-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/65 to-transparent" />
                        <Icon className="absolute bottom-3 left-3 h-6 w-6 text-white" />
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-black">{entry.group}</h3>
                        <div className="mt-3 space-y-2">
                          {entry.categories.map((category) => (
                            <Link
                              key={category.value}
                              to={`/business/new?category=${encodeURIComponent(category.value)}`}
                              className="flex items-center justify-between rounded-full border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600 transition-colors hover:border-zinc-950 hover:text-zinc-950"
                            >
                              <span className="truncate">{category.label}</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="security" className="border-t border-zinc-200 bg-zinc-950 py-20 text-white">
            <div className="mx-auto grid max-w-[1280px] gap-10 px-6 lg:grid-cols-[1fr_0.8fr]">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">Security</p>
                <h2 className="mt-3 text-4xl font-black tracking-normal">Login, setup, dashboard, and backend protected together</h2>
                <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-white/65">
                  ZIVO Software uses signed-in dashboards, protected business setup, edge security headers,
                  rate limits, and restricted backend RPC access for business operations.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {["Cloudflare edge guard", "Supabase RLS", "Signed-in dashboards", "Service-role backend"].map((item) => (
                    <span key={item} className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-bold text-white/80">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-[30px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.28)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-emerald-400 text-zinc-950">
                    <LockKeyhole className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-2xl font-black">Workspace access</p>
                    <p className="text-sm font-semibold text-white/55">login and sign up on the top bar</p>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {["Owner signs in", "Setup opens", "Dashboard routes by business type", "Backend checks role and store access"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-[18px] bg-white/[0.07] px-4 py-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      <span className="font-bold text-white/82">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
