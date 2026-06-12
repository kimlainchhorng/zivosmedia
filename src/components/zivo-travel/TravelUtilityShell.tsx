import type { ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Compass, Luggage, Wallet, CreditCard, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageTransition } from "./PageTransition";

/**
 * Shared chrome for the Zivo Travel utility pages (My Trips, Wallet, Payment
 * Methods). Provides the `.zivo-travel-3d` light theme scope, a glass header
 * with back + brand, an aurora hero with a gradient title, a footer, and a
 * floating bottom nav that ties the travel section together. The
 * `.zivo-travel-3d` class scopes the theme regardless of host, so these render
 * correctly on the travel host AND via the local `/zivo-travel/*` preview routes.
 */

const NAV_TABS: { label: string; clean: string; icon: LucideIcon }[] = [
  { label: "Home", clean: "/", icon: Compass },
  { label: "Trips", clean: "/my-trips", icon: Luggage },
  { label: "Wallet", clean: "/wallet", icon: Wallet },
  { label: "Cards", clean: "/payment-methods", icon: CreditCard },
  { label: "Account", clean: "/account", icon: UserRound },
];

export function TravelUtilityShell({
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  // In local preview we live under /zivo-travel/*; on the travel host the same
  // pages live at clean paths. Build nav links + active state for either context.
  const previewMode = location.pathname.startsWith("/zivo-travel");
  const cleanPath = location.pathname.replace(/^\/zivo-travel/, "") || "/";
  const hrefFor = (clean: string) => (previewMode ? (clean === "/" ? "/zivo-travel" : `/zivo-travel${clean}`) : clean);
  const isActive = (clean: string) =>
    clean === "/" ? cleanPath === "/" : cleanPath === clean || cleanPath.startsWith(`${clean}/`);

  return (
    <main className="zivo-travel-3d zivo-travel-light min-h-screen bg-white text-slate-950">
      <Helmet>
        <title>{title} | Zivo Travel</title>
        <meta name="description" content={subtitle || `${title} on Zivo Travel.`} />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-900/10 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-900/10 bg-white/60 text-slate-700 transition hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Link to={hrefFor("/")} className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 via-sky-500 to-violet-600 text-base font-black text-white">Z</span>
            <span className="text-sm font-black tracking-[0.25em] text-slate-900">ZIVO TRAVEL</span>
          </Link>
        </div>
      </header>

      <PageTransition>
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-10 pb-6">
          <div className="zt-aurora" aria-hidden />
          <div className="relative mx-auto max-w-5xl">
            {eyebrow && (
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
            )}
            <div className="flex items-center gap-3">
              <span className="zt-glass grid h-12 w-12 shrink-0 place-items-center rounded-2xl">
                <Icon className="h-6 w-6 text-sky-600" />
              </span>
              <h1 className="text-3xl font-black sm:text-4xl">
                <span className="zt-gradient-text">{title}</span>
              </h1>
            </div>
            {subtitle && <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">{subtitle}</p>}
          </div>
        </section>

        {/* Content */}
        <section className="px-4 pb-20">
          <div className="mx-auto max-w-5xl">{children}</div>
        </section>
      </PageTransition>

      {/* Footer (extra bottom space so it clears the floating nav) */}
      <footer className="border-t border-slate-900/10 px-4 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] text-center">
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} Zivo Travel · A Zivos Media company</p>
      </footer>

      {/* Floating bottom nav */}
      <nav
        aria-label="Travel navigation"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2"
      >
        <div className="zt-glass flex items-center gap-1 rounded-3xl px-2 py-1.5 shadow-xl shadow-slate-900/10">
          {NAV_TABS.map((tab) => {
            const active = isActive(tab.clean);
            return (
              <Link
                key={tab.label}
                to={hrefFor(tab.clean)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-1.5 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
                  active
                    ? "bg-gradient-to-br from-emerald-400/20 via-sky-500/20 to-violet-500/20 text-sky-700"
                    : "text-slate-400 hover:text-slate-700",
                )}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

export default TravelUtilityShell;
