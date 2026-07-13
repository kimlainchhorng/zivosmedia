import { Link } from "react-router-dom";
import { UserRound, Luggage, Wallet, CreditCard, ChevronRight, LogOut, LogIn, BadgeCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { TravelUtilityShell } from "@/components/zivo-travel/TravelUtilityShell";

const SECTIONS = [
  { label: "My Trips", to: "/my-trips", icon: Luggage, desc: "Upcoming & past bookings" },
  { label: "Wallet", to: "/wallet", icon: Wallet, desc: "Balance & rewards" },
  { label: "Payment Methods", to: "/payment-methods", icon: CreditCard, desc: "Saved cards" },
];

export default function ZivoTravelAccount() {
  const { user, signOut } = useAuth();
  const { data: profile } = useUserProfile();

  const displayName =
    profile?.full_name || profile?.username || user?.email?.split("@")[0] || "Traveler";
  const email = profile?.email || user?.email || "";
  const avatarUrl = profile?.avatar_url;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <TravelUtilityShell
      eyebrow="Your travel"
      title="Account"
      icon={UserRound}
      subtitle="Manage your trips, wallet, and payment methods — all in one place."
    >
      {!user ? (
        <div className="zt-glass zt-depth relative flex flex-col items-center overflow-hidden rounded-3xl px-6 py-14 text-center">
          <div className="zt-aurora" aria-hidden />
          <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/20 via-sky-500/20 to-violet-500/20">
            <LogIn className="h-8 w-8 text-sky-600" />
          </span>
          <h2 className="relative mt-5 text-xl font-black text-slate-900">Sign in to your account</h2>
          <p className="relative mt-2 max-w-md text-sm text-slate-600">Log in to see your trips, wallet balance, and saved cards.</p>
          <Link
            to="/login?redirect=/account"
            className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          >
            <LogIn className="h-4 w-4" /> Log in
          </Link>
        </div>
      ) : (
        <>
          {/* Profile card */}
          <div className="zt-glass zt-depth relative overflow-hidden rounded-3xl p-6">
            <div className="zt-aurora" aria-hidden />
            <div className="relative flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 via-sky-500 to-violet-600 text-2xl font-black text-white ring-2 ring-white/60">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  initial
                )}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-lg font-black text-slate-900">
                  {displayName}
                  {profile?.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 fill-sky-500 text-white" />}
                </p>
                {email && <p className="truncate text-sm text-slate-500">{email}</p>}
              </div>
            </div>
          </div>

          {/* Section links */}
          <div className="mt-4 space-y-3">
            {SECTIONS.map((s) => (
              <Link
                key={s.label}
                to={s.to}
                className="zt-glass group flex items-center gap-3 rounded-2xl px-4 py-4 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400/15 via-sky-500/15 to-violet-500/15">
                  <s.icon className="h-5 w-5 text-sky-600" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{s.label}</p>
                  <p className="text-xs text-slate-500">{s.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <button
            type="button"
            onClick={() => void signOut()}
            className="zt-glass mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-bold text-rose-600 transition hover:bg-rose-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </>
      )}
    </TravelUtilityShell>
  );
}
