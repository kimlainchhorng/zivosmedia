/**
 * Zivo Business landing page — served at "/" on zivobusiness.com.
 *
 * "Zivo Business" owns the business profile and billing ownership: software
 * subscriptions, invoices, and team access (per docs/PLATFORM_RELATIONSHIPS.md
 * and BUSINESS_SOFTWARE_FLOW.md). This is distinct from zivosoftware.com, which
 * is the software catalog. Before this page existed the host fell through to the
 * generic super-app feed. Mirrors the host-landing pattern of ZivoDriverHome.
 */

import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CreditCard,
  Headphones,
  LayoutDashboard,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { goCrossDomain } from "@/lib/crossDomainSSO";
import { ZIVO_MEDIA_ORIGIN } from "@/config/autoRepairDomain";
import { ZIVO_CHAT_ORIGIN } from "@/config/zivoChatDomain";

const steps = [
  {
    title: "Create your business",
    copy: "Set up your business profile, claim your business page, and invite your team.",
    icon: Building2,
  },
  {
    title: "Add software",
    copy: "Subscribe to the ZIVO Software products your business runs on, billed to one account.",
    icon: LayoutDashboard,
  },
  {
    title: "Manage billing",
    copy: "See active subscriptions, invoices, and payment history in one business billing profile.",
    icon: ReceiptText,
  },
];

const features = [
  {
    title: "Business profile",
    copy: "One profile owns your business pages, software, and team across the ZIVO network.",
    icon: Building2,
  },
  {
    title: "Subscriptions & invoices",
    copy: "Track active software subscriptions, billing periods, paid and pending invoices.",
    icon: CreditCard,
  },
  {
    title: "Team access",
    copy: "Invite employees, manage roles, and keep each workspace tied to the right business account.",
    icon: Users,
  },
  {
    title: "Secure & connected",
    copy: "Protected dashboards, hardened admin actions, and shared Zivosmedia identity.",
    icon: ShieldCheck,
  },
];

export default function ZivoBusinessHome() {
  const continueWithZivosmedia = useCallback(() => {
    void goCrossDomain(ZIVO_MEDIA_ORIGIN, "/");
  }, []);

  return (
    <>
      <Helmet>
        <title>Zivo Business | Run your business on ZIVO</title>
        <meta
          name="description"
          content="Zivo Business owns your business profile and billing: subscribe to ZIVO Software, manage invoices and subscriptions, and give your team access — all on one connected account."
        />
        <meta property="og:site_name" content="Zivo Business" />
        <meta property="og:title" content="Zivo Business | Run your business on ZIVO" />
        <meta
          property="og:description"
          content="Your business profile, software subscriptions, invoices, and team — managed in one place on the ZIVO network."
        />
        <link rel="canonical" href="https://zivobusiness.com/" />
      </Helmet>

      <div className="min-h-screen bg-[#fbfbfc] text-zinc-950">
        <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/88 backdrop-blur-2xl">
          <div className="mx-auto flex h-20 w-full max-w-[1200px] items-center gap-4 px-6">
            <Link to="/" className="group inline-flex items-center gap-3" aria-label="Zivo Business home">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-[14px] bg-zinc-950">
                <span className="absolute -right-1 -top-1 h-4 w-4 rounded-[6px] bg-emerald-400" />
                <Building2 className="h-6 w-6 text-white" />
              </span>
              <span className="leading-tight">
                <span className="block text-xl font-black tracking-[0.22em] text-zinc-950">ZIVO</span>
                <span className="block text-xs font-black tracking-[0.4em] text-emerald-600">BUSINESS</span>
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <Button asChild variant="ghost" className="hidden h-11 rounded-full px-5 font-bold sm:inline-flex">
                <Link to="/login?redirect=%2Fbusiness">Log in</Link>
              </Button>
              <Button asChild className="h-12 rounded-full bg-zinc-950 px-6 font-bold text-white hover:bg-zinc-800">
                <Link to="/business/new">Create business</Link>
              </Button>
            </div>
          </div>
        </header>

        <main>
          <section className="relative overflow-hidden border-b border-zinc-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f3fbf6_60%,#ffffff_100%)]">
            <div className="mx-auto max-w-[1200px] px-6 pb-20 pt-20">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700">
                <BadgeCheck className="h-4 w-4" /> The business account for ZIVO
              </span>
              <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
                Run your business on{" "}
                <span className="text-transparent bg-clip-text bg-ig-gradient">Zivo Business</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-medium text-zinc-600">
                Own your business profile, subscribe to the ZIVO Software you run on, and keep
                subscriptions, invoices, and your team in one connected account.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild className="h-14 rounded-full bg-zinc-950 px-8 text-lg font-bold text-white hover:bg-zinc-800">
                  <Link to="/business/new">
                    Create your business <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={continueWithZivosmedia}
                  className="h-14 rounded-full border-zinc-300 px-8 text-lg font-bold"
                >
                  Continue with Zivosmedia
                </Button>
              </div>
              <p className="mt-4 text-sm font-semibold text-zinc-500">
                Already use ZIVO? Your Zivosmedia account works here — no new sign-up needed.
              </p>
            </div>
          </section>

          <section className="mx-auto max-w-[1200px] px-6 py-20">
            <h2 className="text-3xl font-black tracking-tight">Set up your business in three steps</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-3xl border border-zinc-200/80 bg-white p-7 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="text-sm font-black tracking-[0.3em] text-zinc-400">0{i + 1}</span>
                    </div>
                    <h3 className="mt-5 text-xl font-black">{step.title}</h3>
                    <p className="mt-2 font-medium text-zinc-600">{step.copy}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="border-y border-zinc-200/70 bg-white">
            <div className="mx-auto max-w-[1200px] px-6 py-20">
              <h2 className="text-3xl font-black tracking-tight">One account for your whole business</h2>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.title} className="rounded-3xl border border-zinc-200/80 bg-[#fbfbfc] p-7">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                        <Icon className="h-6 w-6" />
                      </span>
                      <h3 className="mt-5 text-lg font-black">{feature.title}</h3>
                      <p className="mt-2 text-sm font-medium text-zinc-600">{feature.copy}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-[1200px] px-6 py-20">
            <div className="rounded-[32px] border border-zinc-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#134e4a_100%)] p-10 text-white sm:p-14">
              <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                Connected to the whole ZIVO network
              </h2>
              <p className="mt-4 max-w-2xl text-lg font-medium text-white/80">
                Your business account, software, and billing stay connected to Zivosmedia. Need help?
                Reach support or message the team in ZivoChat.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="h-12 rounded-full bg-white px-7 py-3 font-bold text-zinc-950 hover:bg-zinc-100">
                  <Link to="/support">
                    <Headphones className="mr-2 h-5 w-5" /> Get support
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-full border-white/40 bg-transparent px-7 py-3 font-bold text-white hover:bg-white/10"
                >
                  <a href={ZIVO_CHAT_ORIGIN} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 h-5 w-5" /> Chat on ZivoChat
                  </a>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-zinc-200/70 bg-white">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-6 py-10 text-sm font-medium text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <span>© ZIVO Business — part of the Zivosmedia network</span>
            <div className="flex flex-wrap gap-5">
              <Link to="/business/new" className="hover:text-zinc-900">Create business</Link>
              <Link to="/business" className="hover:text-zinc-900">Business dashboard</Link>
              <Link to="/support" className="hover:text-zinc-900">Support</Link>
              <Link to="/legal/privacy" className="hover:text-zinc-900">Privacy</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
