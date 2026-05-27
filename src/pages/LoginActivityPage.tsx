/**
 * LoginActivityPage — Historical security event log for your account.
 * Backed by `login_alerts` (orphan). RLS allows owner to view own events.
 * Distinct from DevicesPage (current sessions) — this is the audit trail.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck, Sparkles, LogIn, LogOut, Key, Smartphone, AlertTriangle, MapPin, Monitor, Tablet, ShieldOff, Filter, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type LoginEvent = "login" | "logout" | "session_revoked" | "two_step_changed" | "password_changed" | "suspicious";
type Tab = "all" | "login" | "security" | "suspicious";

interface LoginAlertRow {
  id: string;
  user_id: string;
  event: LoginEvent;
  device_name: string | null;
  platform: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const EVENT_META: Record<LoginEvent, { label: string; icon: typeof LogIn; tone: string; bg: string; security: boolean }> = {
  login:             { label: "Signed in",       icon: LogIn,         tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15", security: false },
  logout:            { label: "Signed out",      icon: LogOut,        tone: "text-muted-foreground",                  bg: "bg-secondary",      security: false },
  session_revoked:   { label: "Session revoked", icon: ShieldOff,     tone: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-500/15",    security: true  },
  two_step_changed:  { label: "2FA changed",     icon: ShieldCheck,   tone: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/15",    security: true  },
  password_changed:  { label: "Password changed",icon: Key,           tone: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/15",    security: true  },
  suspicious:        { label: "Suspicious",      icon: AlertTriangle, tone: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-500/15",    security: true  },
};

function deviceIcon(platform: string | null): typeof Monitor {
  const p = (platform ?? "").toLowerCase();
  if (p.includes("ios") || p.includes("iphone") || p.includes("android") || p.includes("mobile")) return Smartphone;
  if (p.includes("ipad") || p.includes("tablet")) return Tablet;
  return Monitor;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatLocation(city: string | null, country: string | null): string {
  if (city && country) return `${city}, ${country}`;
  return city || country || "Unknown location";
}

export default function LoginActivityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["login-alerts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as LoginAlertRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: LoginAlertRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("login_alerts")
        .select("id, user_id, event, device_name, platform, ip, country, city, user_agent, metadata, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => ({
    total: events.length,
    suspicious: events.filter((e) => e.event === "suspicious").length,
    securityChanges: events.filter((e) => EVENT_META[e.event]?.security && e.event !== "suspicious").length,
    countries: new Set(events.filter((e) => e.country).map((e) => e.country)).size,
  }), [events]);

  const filtered = useMemo(() => {
    if (tab === "all") return events;
    if (tab === "login") return events.filter((e) => e.event === "login" || e.event === "logout");
    if (tab === "security") return events.filter((e) => EVENT_META[e.event]?.security && e.event !== "suspicious");
    if (tab === "suspicious") return events.filter((e) => e.event === "suspicious" || e.event === "session_revoked");
    return events;
  }, [events, tab]);

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "all",        label: "All",       count: events.length },
    { id: "login",      label: "Sign-ins",  count: events.filter((e) => e.event === "login" || e.event === "logout").length },
    { id: "security",   label: "Security",  count: stats.securityChanges },
    { id: "suspicious", label: "Suspicious",count: events.filter((e) => e.event === "suspicious" || e.event === "session_revoked").length },
  ];

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Login Activity · ZIVO" description="Security and login audit log." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Login Activity</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Account security</p>
          <p className="text-3xl font-bold mt-1">{stats.total} {stats.total === 1 ? "event" : "events"}</p>
          <p className="text-sm text-white/80 mt-1">
            from {stats.countries} {stats.countries === 1 ? "location" : "locations"}
            {stats.suspicious > 0 && ` · ${stats.suspicious} flagged suspicious`}
          </p>
        </motion.div>

        {/* Suspicious banner — surface threats prominently */}
        {stats.suspicious > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-3.5 bg-rose-500/10 border border-rose-500/30 flex items-start gap-3"
          >
            <div className="shrink-0 h-9 w-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                {stats.suspicious} suspicious sign-in attempt{stats.suspicious === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                Review the flagged events below. If anything wasn't you, change your password and sign out other devices.
              </p>
              <button
                type="button"
                onClick={() => navigate("/devices")}
                className="mt-2 h-7 px-3 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-rose-500/30 active:scale-95 transition-all"
              >
                <ShieldOff className="h-3 w-3" /> Manage devices
              </button>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
                tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              <span>{t.label}</span>
              <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-white/20" : "bg-background/60")}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No activity recorded</p>
            <p className="text-xs text-muted-foreground">Sign-ins, security changes, and flagged events will appear here.</p>
          </div>
        )}

        {!isLoading && events.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Filter className="h-6 w-6 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nothing in this tab.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((e, idx) => {
              const meta = EVENT_META[e.event] ?? EVENT_META.login;
              const Icon = meta.icon;
              const Device = deviceIcon(e.platform);
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-2xl bg-card border",
                    e.event === "suspicious" ? "border-rose-500/30 bg-rose-500/[0.02]" : "border-border",
                  )}
                >
                  <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", meta.bg)}>
                    <Icon className={cn("h-4 w-4", meta.tone)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-foreground">{meta.label}</p>
                      {e.event === "suspicious" && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full">
                          Review
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {formatRelative(e.created_at)}
                      </span>
                      {(e.city || e.country) && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" /> {formatLocation(e.city, e.country)}
                          </span>
                        </>
                      )}
                    </div>
                    {(e.device_name || e.platform) && (
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                        <Device className="h-3 w-3" />
                        <span>
                          {e.device_name || "Unknown device"}
                          {e.platform && ` · ${e.platform}`}
                        </span>
                      </div>
                    )}
                    {e.ip && (
                      <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{e.ip}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {!isLoading && events.length > 0 && (
          <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            <span>Showing up to 200 most recent events</span>
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
