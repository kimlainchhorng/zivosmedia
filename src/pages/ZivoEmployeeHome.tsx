/**
 * Zivo Employee landing page — served at "/" on zivoemployee.com.
 *
 * "Zivo Employee" is the staff-facing side of a business (schedules, time clock,
 * payroll info, onboarding/training). Its dedicated backend and repo ownership
 * are still undecided (docs/OPEN_QUESTIONS.md), so this landing is intentionally
 * informational: it identifies the product and offers shared-identity sign-in
 * and support, without wiring an undecided backend. Before this page existed the
 * host fell through to the generic super-app feed. Mirrors ZivoDriverHome.
 */

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  GraduationCap,
  Headphones,
  IdCard,
  MessageCircle,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import ContinueWithZivosmediaButton from "@/components/cross-app/ContinueWithZivosmediaButton";
import { ZIVO_CHAT_ORIGIN } from "@/config/zivoChatDomain";

const features = [
  {
    title: "Schedules & shifts",
    copy: "See your upcoming shifts, clock in and out, and request time off from one place.",
    icon: CalendarClock,
  },
  {
    title: "Pay & records",
    copy: "View pay details, hours worked, and your employment records as a Zivo employee.",
    icon: Wallet,
  },
  {
    title: "Onboarding & training",
    copy: "Complete onboarding tasks and training assigned by the business you work for.",
    icon: GraduationCap,
  },
  {
    title: "One ZIVO identity",
    copy: "Sign in with your Zivosmedia account — the same identity across every ZIVO app.",
    icon: ShieldCheck,
  },
];

export default function ZivoEmployeeHome() {
  return (
    <>
      <Helmet>
        <title>Zivo Employee | Your work, schedule, and pay on ZIVO</title>
        <meta
          name="description"
          content="Zivo Employee is the staff-facing side of ZIVO: view your schedule, clock in and out, see pay and records, and complete onboarding — signed in with your Zivosmedia account."
        />
        <meta property="og:site_name" content="Zivo Employee" />
        <meta property="og:title" content="Zivo Employee | Your work, schedule, and pay on ZIVO" />
        <meta
          property="og:description"
          content="Schedules, shifts, pay, and onboarding for staff across the ZIVO network."
        />
        <link rel="canonical" href="https://zivoemployee.com/" />
      </Helmet>

      <div className="min-h-screen bg-[#fbfbfc] text-zinc-950">
        <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/88 backdrop-blur-2xl">
          <div className="mx-auto flex h-20 w-full max-w-[1200px] items-center gap-4 px-6">
            <Link to="/" className="group inline-flex items-center gap-3" aria-label="Zivo Employee home">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-[14px] bg-zinc-950">
                <span className="absolute -right-1 -top-1 h-4 w-4 rounded-[6px] bg-emerald-400" />
                <IdCard className="h-6 w-6 text-white" />
              </span>
              <span className="leading-tight">
                <span className="block text-xl font-black tracking-[0.22em] text-zinc-950">ZIVO</span>
                <span className="block text-xs font-black tracking-[0.4em] text-emerald-600">EMPLOYEE</span>
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <Button asChild className="h-12 rounded-full bg-zinc-950 px-6 font-bold text-white hover:bg-zinc-800">
                <Link to="/login">Employee sign in</Link>
              </Button>
            </div>
          </div>
        </header>

        <main>
          <section className="relative overflow-hidden border-b border-zinc-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f3fbf6_60%,#ffffff_100%)]">
            <div className="mx-auto max-w-[1200px] px-6 pb-20 pt-20">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700">
                <BadgeCheck className="h-4 w-4" /> The staff side of ZIVO
              </span>
              <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
                Your work, schedule, and pay on{" "}
                <span className="text-transparent bg-clip-text bg-ig-gradient">Zivo Employee</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-medium text-zinc-600">
                See your shifts, clock in and out, check pay and records, and complete onboarding for the
                business you work for — all with your Zivosmedia account.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild className="h-14 rounded-full bg-zinc-950 px-8 text-lg font-bold text-white hover:bg-zinc-800">
                  <Link to="/login">
                    Sign in to your work <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <ContinueWithZivosmediaButton className="h-14 rounded-full border-zinc-300 px-8 text-lg font-bold" />
              </div>
              <p className="mt-4 text-sm font-semibold text-zinc-500">
                Your employer adds you to Zivo Employee. Sign in with the Zivosmedia account you already use.
              </p>
            </div>
          </section>

          <section className="border-y border-zinc-200/70 bg-white">
            <div className="mx-auto max-w-[1200px] px-6 py-20">
              <h2 className="text-3xl font-black tracking-tight">What you can do as a Zivo employee</h2>
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
                Your employee profile uses the same Zivosmedia identity as the rest of ZIVO. Need help?
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
            <span>© ZIVO Employee — part of the Zivosmedia network</span>
            <div className="flex flex-wrap gap-5">
              <Link to="/login" className="hover:text-zinc-900">Employee sign in</Link>
              <Link to="/support" className="hover:text-zinc-900">Support</Link>
              <Link to="/legal/privacy" className="hover:text-zinc-900">Privacy</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
