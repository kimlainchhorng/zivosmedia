/**
 * Zivo Driver landing page — served at "/" on zivodriver.com.
 *
 * Before this page existed, zivodriver.com fell through to the generic ZIVO
 * super-app feed (it has no host branch in the worker). This is the dedicated
 * driver front door: what the product is, how to start driving, and a branded
 * "Continue with Zivosmedia" handoff so driver accounts stay on the shared
 * identity. Mirrors the ZivoTravelHome host-landing pattern.
 */

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  ClipboardCheck,
  Headphones,
  MapPin,
  MessageCircle,
  Route,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import ContinueWithZivosmediaButton from "@/components/cross-app/ContinueWithZivosmediaButton";
import { ZIVO_CHAT_ORIGIN } from "@/config/zivoChatDomain";

const steps = [
  {
    title: "Apply and verify",
    copy: "Sign up, upload your license and vehicle documents, and get verified for ride and delivery work.",
    icon: ClipboardCheck,
  },
  {
    title: "Go online",
    copy: "Accept ride, delivery, and shopping jobs near you with live navigation and trip details.",
    icon: MapPin,
  },
  {
    title: "Earn and cash out",
    copy: "Track earnings per trip and request payouts to your Zivo wallet on your schedule.",
    icon: Wallet,
  },
];

const features = [
  {
    title: "Ride & delivery trips",
    copy: "One driver app for rides, food, grocery, and parcel delivery across the Zivo network.",
    icon: CarFront,
  },
  {
    title: "Live navigation",
    copy: "Turn-by-turn routing to pickups and drop-offs with real-time trip status.",
    icon: Route,
  },
  {
    title: "Transparent earnings",
    copy: "See the fare, distance, and payout for every trip, plus weekly earnings and payout history.",
    icon: Wallet,
  },
  {
    title: "Verified & protected",
    copy: "Document verification, account security, and in-trip support keep every driver protected.",
    icon: ShieldCheck,
  },
];

export default function ZivoDriverHome() {
  return (
    <>
      <Helmet>
        <title>Zivo Driver | Drive, deliver, and earn with ZIVO</title>
        <meta
          name="description"
          content="Drive and deliver with Zivo Driver: accept rides, food, grocery, and parcel trips, follow live navigation, track transparent earnings, and cash out to your Zivo wallet."
        />
        <meta property="og:site_name" content="Zivo Driver" />
        <meta property="og:title" content="Zivo Driver | Drive, deliver, and earn with ZIVO" />
        <meta
          property="og:description"
          content="Accept rides and deliveries, follow live navigation, and track earnings — the driver side of the ZIVO network."
        />
        <link rel="canonical" href="https://zivodriver.com/" />
      </Helmet>

      <div className="min-h-screen bg-[#fbfbfc] text-zinc-950">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/88 backdrop-blur-2xl">
          <div className="mx-auto flex h-20 w-full max-w-[1200px] items-center gap-4 px-6">
            <Link to="/" className="group inline-flex items-center gap-3" aria-label="Zivo Driver home">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-[14px] bg-zinc-950">
                <span className="absolute -right-1 -top-1 h-4 w-4 rounded-[6px] bg-emerald-400" />
                <CarFront className="h-6 w-6 text-white" />
              </span>
              <span className="leading-tight">
                <span className="block text-xl font-black tracking-[0.22em] text-zinc-950">ZIVO</span>
                <span className="block text-xs font-black tracking-[0.4em] text-emerald-600">DRIVER</span>
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <Button asChild variant="ghost" className="hidden h-11 rounded-full px-5 font-bold sm:inline-flex">
                <Link to="/login">Driver sign in</Link>
              </Button>
              <Button asChild className="h-12 rounded-full bg-zinc-950 px-6 font-bold text-white hover:bg-zinc-800">
                <Link to="/driver-signup">Become a driver</Link>
              </Button>
            </div>
          </div>
        </header>

        <main>
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-zinc-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f3fbf6_60%,#ffffff_100%)]">
            <div className="mx-auto max-w-[1200px] px-6 pb-20 pt-20">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700">
                <BadgeCheck className="h-4 w-4" /> The driver side of ZIVO
              </span>
              <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
                Drive, deliver, and earn with{" "}
                <span className="text-transparent bg-clip-text bg-ig-gradient">Zivo Driver</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-medium text-zinc-600">
                Accept rides, food, grocery, and parcel trips from one app. Follow live navigation, see
                transparent earnings on every trip, and cash out to your Zivo wallet.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild className="h-14 rounded-full bg-zinc-950 px-8 text-lg font-bold text-white hover:bg-zinc-800">
                  <Link to="/driver-signup">
                    Start driving <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <ContinueWithZivosmediaButton className="h-14 rounded-full border-zinc-300 px-8 text-lg font-bold" />
              </div>
              <p className="mt-4 text-sm font-semibold text-zinc-500">
                Already use ZIVO? Your Zivosmedia account works here — no new sign-up needed.
              </p>
            </div>
          </section>

          {/* How it works */}
          <section className="mx-auto max-w-[1200px] px-6 py-20">
            <h2 className="text-3xl font-black tracking-tight">Start earning in three steps</h2>
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

          {/* Features */}
          <section className="border-y border-zinc-200/70 bg-white">
            <div className="mx-auto max-w-[1200px] px-6 py-20">
              <h2 className="text-3xl font-black tracking-tight">Everything a Zivo driver needs</h2>
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

          {/* Support / network */}
          <section className="mx-auto max-w-[1200px] px-6 py-20">
            <div className="rounded-[32px] border border-zinc-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#134e4a_100%)] p-10 text-white sm:p-14">
              <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                Connected to the whole ZIVO network
              </h2>
              <p className="mt-4 max-w-2xl text-lg font-medium text-white/80">
                Driver accounts, wallet, and trips stay connected to Zivosmedia. Need help? Reach support
                or message the team in ZivoChat.
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
            <span>© ZIVO Driver — part of the Zivosmedia network</span>
            <div className="flex flex-wrap gap-5">
              <Link to="/driver-signup" className="hover:text-zinc-900">Become a driver</Link>
              <Link to="/login" className="hover:text-zinc-900">Driver sign in</Link>
              <Link to="/support" className="hover:text-zinc-900">Support</Link>
              <Link to="/legal/privacy" className="hover:text-zinc-900">Privacy</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
