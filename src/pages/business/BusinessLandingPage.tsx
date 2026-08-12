/**
 * ZIVO Software landing page
 * /business
 */

import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Headphones,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MessageCircle,
  PackageCheck,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STORE_CATEGORY_OPTIONS } from "@/config/groceryStores";
import { goCrossDomain } from "@/lib/crossDomainSSO";
import { ZIVO_MEDIA_ORIGIN } from "@/config/autoRepairDomain";
import { ZIVO_CHAT_ORIGIN } from "@/config/zivoChatDomain";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import bgOffice from "@/assets/bg-office.jpg";

// Carry the active session back to the Zivosmedia identity hub. Software signs in
// against its own Supabase project but shares the Zivosmedia account; this is the
// branded cross-app entry the live audit flagged as missing on every domain.
function continueWithZivosmedia() {
  void goCrossDomain(ZIVO_MEDIA_ORIGIN, "/business");
}

const allowedGroups = ["Software"];

const groupImages: Record<string, string> = {
  Software: bgOffice,
};

const groupIcons: Record<string, typeof LayoutDashboard> = {
  Software: LayoutDashboard,
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
    copy: "Create the software business profile, invite staff, and connect the workspace.",
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
      <span className="relative flex h-16 w-16 items-center justify-center rounded-[18px] bg-zinc-950 shadow-[0_24px_58px_rgba(15,23,42,0.18)]">
        <span className="absolute -right-1.5 -top-1.5 h-6 w-6 rounded-[8px] bg-emerald-400 shadow-[0_10px_20px_rgba(52,211,153,0.36)]" />
        <span className="absolute bottom-3 left-3 h-4 w-4 rounded-full bg-sky-400" />
        <span className="text-5xl font-black leading-none text-transparent bg-clip-text bg-ig-gradient">Z</span>
      </span>
      <span className="hidden sm:block leading-tight">
        <span className="block text-[28px] font-black tracking-[0.26em] text-zinc-950">ZIVO</span>
        <span className="block text-[15px] font-black tracking-[0.42em] text-emerald-600">SOFTWARE</span>
      </span>
    </Link>
  );
}

function BusinessHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/88 backdrop-blur-2xl">
      <div className="mx-auto flex h-[138px] w-full max-w-[1400px] items-center gap-6 px-10">
        <ZivoSoftwareLogo />
        <div className="ml-auto flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={continueWithZivosmedia}
            className="hidden h-14 rounded-full px-7 text-[22px] font-bold lg:inline-flex"
          >
            Continue with Zivosmedia
          </Button>
          <Button asChild variant="ghost" className="hidden h-14 rounded-full px-7 text-[22px] font-bold sm:inline-flex">
            <Link to={authPath("/login")}>Log in</Link>
          </Button>
          <Button asChild className="h-[72px] rounded-full bg-zinc-950 px-10 text-[22px] font-bold text-white hover:bg-zinc-800">
            <Link to={authPath("/signup")}>Sign up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export default function BusinessLandingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Business lead capture. Routes through the shared, server-gated
  // marketing-interest-submit edge function (no direct table writes from the
  // client) — same trusted intake path the other business pages use.
  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const email = String(data.get("email") || "");
    const company = String(data.get("company") || "");
    const message = `Name: ${data.get("name") || ""}\nMessage: ${data.get("message") || ""}`;
    try {
      const { error } = await supabase.functions.invoke("marketing-interest-submit", {
        body: {
          category: "business_inquiry",
          subject: "ZIVO Software business inquiry",
          email,
          company,
          message,
          context: "business_landing",
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
      });
      if (error) throw error;
      toast.success("Thanks! The ZIVO Software team will be in touch soon.");
      form.reset();
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>ZIVO Software | Business Workspaces</title>
        <meta
          name="description"
          content="Launch a software-only ZIVO Business Page with setup, dashboard access, customer records, invoices, reports, and secure team workflows."
        />
      </Helmet>

      <div className="min-h-screen bg-[#fbfbfc] text-zinc-950">
        <BusinessHeader />

        <main>
          <section className="relative overflow-hidden border-b border-zinc-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#ffffff_100%)]">
            <div className="mx-auto min-h-[920px] max-w-[1400px] px-10 pb-14 pt-24">
              <div>
                <div className="mb-16 flex justify-between gap-8 overflow-hidden">
                  {groupedCategories.map((entry) => {
                    const Icon = groupIcons[entry.group] || LayoutDashboard;
                    return (
                      <a key={entry.group} href="#industries" className="group text-center">
                        <span className="ring-ig-gradient inline-flex h-[120px] w-[120px] items-center justify-center rounded-full p-[4px]">
                          <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
                            <Icon className="h-11 w-11 text-zinc-950" />
                          </span>
                        </span>
                        <span className="mt-4 block max-w-[130px] truncate text-[20px] font-bold text-zinc-600 group-hover:text-zinc-950">
                          {entry.group}
                        </span>
                      </a>
                    );
                  })}
                </div>

                <p className="mb-9 inline-flex items-center gap-4 rounded-full border border-zinc-200 bg-white px-7 py-4 text-[23px] font-black shadow-sm">
                  <Sparkles className="h-7 w-7 text-pink-500" />
                  Desktop-first Software Business Page
                </p>
                <h1 className="max-w-[1230px] text-[86px] font-black leading-[0.93] tracking-normal text-zinc-950 md:text-[118px]">
                  ZIVO Software for one focused business page
                </h1>
                <p className="mt-16 max-w-[1220px] text-[31px] font-medium leading-[1.55] text-zinc-600">
                  Build a software-only business workspace with setup, dashboard, bookings, work orders, payments,
                  customers, employees, reports, and secure account access from one clean website.
                </p>
                <div className="mt-16 flex flex-col gap-6 sm:flex-row">
                  <Button asChild size="lg" className="h-[90px] rounded-full bg-zinc-950 px-12 text-[27px] font-black text-white hover:bg-zinc-800">
                    <Link to="/business/new">
                      Create Business Software
                      <ArrowRight className="ml-6 h-8 w-8" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-[90px] rounded-full border-zinc-300 bg-white px-12 text-[27px] font-black">
                    <a href="#industries">View Business Page</a>
                  </Button>
                </div>
                <div className="mt-12 grid max-w-[600px] grid-cols-3 gap-4">
                  {[
                    ["1", "Business page"],
                    ["1", "Software setup"],
                    ["1", "Software domain"],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-[22px] border border-zinc-200 bg-white p-5 shadow-sm">
                      <p className="text-3xl font-black">{value}</p>
                      <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
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
                    The website path guides owners from sign up to setup, then sends them into the software dashboard for their Business Page.
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
                <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-600">Business Page</p>
                <h2 className="mt-3 text-4xl font-black tracking-normal">Only the Software Business Page you asked for</h2>
              </div>
              <div className="grid gap-5 lg:grid-cols-7">
                {groupedCategories.map((entry) => {
                  const Icon = groupIcons[entry.group] || LayoutDashboard;
                  return (
                    <article key={entry.group} className="overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-sm lg:col-span-1">
                      <div className="relative h-28">
                        <img
                          src={groupImages[entry.group]}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
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
                  {["Owner signs in", "Setup opens", "Dashboard opens software tools", "Backend checks role and store access"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-[18px] bg-white/[0.07] px-4 py-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      <span className="font-bold text-white/82">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section id="contact" className="border-t border-zinc-200 bg-[#fbfbfc] py-20">
            <div className="mx-auto grid max-w-[1280px] gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-600">Talk to us</p>
                <h2 className="mt-3 text-4xl font-black tracking-normal">Bring ZIVO Software to your business</h2>
                <p className="mt-5 max-w-xl text-lg font-medium leading-8 text-zinc-600">
                  Tell us about your business and what you want to run on ZIVO Software. The team will
                  reach out to help you set up the right workspace.
                </p>
                <div className="mt-8 flex items-center gap-3 text-zinc-600">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-zinc-950 text-white">
                    <Mail className="h-5 w-5" />
                  </span>
                  <span className="font-bold">We reply to every business inquiry.</span>
                </div>
              </div>

              <form
                onSubmit={handleInquiry}
                className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="biz-name">Your name</Label>
                    <Input id="biz-name" name="name" placeholder="Jane Owner" required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="biz-company">Business name</Label>
                    <Input id="biz-company" name="company" placeholder="Acme Co." required className="mt-1.5" />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="biz-email">Work email</Label>
                  <Input id="biz-email" name="email" type="email" placeholder="jane@acme.com" required className="mt-1.5" />
                </div>
                <div className="mt-4">
                  <Label htmlFor="biz-message">What do you want to run on ZIVO Software? (optional)</Label>
                  <Textarea
                    id="biz-message"
                    name="message"
                    rows={4}
                    placeholder="Bookings, invoices, staff, reports…"
                    className="mt-1.5"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-6 h-12 w-full rounded-full bg-zinc-950 text-base font-bold text-white hover:bg-zinc-800"
                >
                  {isSubmitting ? (
                    "Sending…"
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" /> Send business inquiry
                    </>
                  )}
                </Button>
                <p className="mt-4 text-center text-xs font-medium text-zinc-500">
                  We'll only contact you about ZIVO Software. No spam. See our{" "}
                  <Link to="/legal/privacy" className="underline underline-offset-2">Privacy Policy</Link>{" "}
                  and{" "}
                  <Link to="/legal/terms" className="underline underline-offset-2">Terms</Link>.
                </p>
              </form>
            </div>
          </section>
        </main>

        <footer className="border-t border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-600">One ZIVO identity</p>
              <h2 className="mt-2 text-2xl font-black">Already on ZIVO? Keep your account.</h2>
              <p className="mt-2 max-w-xl text-sm font-medium text-zinc-600">
                Zivo Software uses your Zivosmedia identity. Continue with Zivosmedia, or reach support in ZivoChat.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={continueWithZivosmedia} className="h-12 rounded-full bg-zinc-950 px-7 font-bold text-white hover:bg-zinc-800">
                Continue with Zivosmedia
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-zinc-300 px-7 font-bold">
                <Link to="/support">
                  <Headphones className="mr-2 h-5 w-5" /> Get support
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-zinc-300 px-7 font-bold">
                <a href={ZIVO_CHAT_ORIGIN} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-5 w-5" /> Chat on ZivoChat
                </a>
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
