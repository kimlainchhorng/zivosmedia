/**
 * RideNotificationCenter — Real notifications from DB + preferences + smart alerts
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, BellOff, BellRing, Clock, DollarSign, Tag, Car, MapPin,
  Shield, Zap, CheckCircle, ChevronRight, Sparkles, TrendingDown,
  Calendar, Volume2, Loader2, RefreshCw, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWebPush } from "@/hooks/useWebPush";

type NotifTab = "feed" | "prefs" | "alerts";

interface DBNotif {
  id: string;
  title: string;
  body: string;
  category: string | null;
  channel: string | null;
  is_read: boolean | null;
  created_at: string;
}

interface NotifPref {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
}

const defaultPrefs: NotifPref[] = [
  { id: "ride_updates",  label: "Ride Updates",          description: "Driver assigned, arrival, trip status",           icon: Car,          enabled: true },
  { id: "price_drops",   label: "Price Drop Alerts",      description: "Get notified when fares decrease on saved routes", icon: TrendingDown, enabled: true },
  { id: "promos",        label: "Promotions & Offers",    description: "Promo codes, deals, and seasonal offers",          icon: Tag,          enabled: true },
  { id: "reminders",     label: "Ride Reminders",         description: "Reminders for scheduled and recurring rides",      icon: Calendar,     enabled: true },
  { id: "safety",        label: "Safety Alerts",          description: "Route deviations, emergency notifications",        icon: Shield,       enabled: true },
  { id: "surge",         label: "Surge Notifications",    description: "Alert when surge pricing starts or ends",          icon: Zap,          enabled: false },
  { id: "sounds",        label: "Notification Sounds",    description: "Play sounds for incoming notifications",           icon: Volume2,      enabled: true },
];

const categoryIcon: Record<string, { icon: React.ElementType; color: string }> = {
  ride:     { icon: Car,          color: "text-primary bg-primary/10" },
  promo:    { icon: Tag,          color: "text-primary bg-primary/10" },
  price:    { icon: TrendingDown, color: "text-emerald-500 bg-emerald-500/10" },
  safety:   { icon: Shield,       color: "text-violet-500 bg-violet-500/10" },
  reminder: { icon: Clock,        color: "text-amber-500 bg-amber-500/10" },
  account:  { icon: Bell,         color: "text-muted-foreground bg-muted/40" },
};

function getIconForNotif(n: DBNotif) {
  const cat = (n.category || "").toLowerCase();
  for (const key of Object.keys(categoryIcon)) {
    if (cat.includes(key)) return categoryIcon[key];
  }
  return categoryIcon.account;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

export default function RideNotificationCenter() {
  const { user } = useAuth();
  const { subscription, subscribe, unsubscribe, permission } = useWebPush();
  const isSubscribed = !!subscription;
  const [activeTab, setActiveTab] = useState<NotifTab>("feed");
  const [notifs, setNotifs] = useState<DBNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [enablingPush, setEnablingPush] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertRoute, setAlertRoute] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("");

  // Load real notifications from Supabase
  const fetchNotifs = async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("notifications")
      .select("id, title, body, category, channel, is_read, created_at")
      .eq("to_value", user.id)
      .order("created_at", { ascending: false })
      .limit(40);
    setNotifs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotifs(); }, [user?.id]);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    if (!user?.id || unreadCount === 0) return;
    const unreadIds = notifs.filter(n => !n.is_read).map(n => n.id);
    await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
    setNotifs(ns => ns.map(n => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  const markRead = async (id: string) => {
    await (supabase as any).from("notifications").update({ is_read: true }).eq("id", id);
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleEnablePush = async () => {
    setEnablingPush(true);
    const ok = await subscribe();
    setEnablingPush(false);
    if (ok) toast.success("Push notifications enabled!");
    else toast.error("Could not enable notifications — check browser settings");
  };

  const handleDisablePush = async () => {
    setEnablingPush(true);
    await unsubscribe();
    setEnablingPush(false);
    toast.success("Push notifications disabled");
  };

  const togglePref = (id: string) =>
    setPrefs(ps => ps.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));

  const tabs = [
    { id: "feed" as const,   label: "Feed",         icon: BellRing, badge: unreadCount },
    { id: "prefs" as const,  label: "Preferences",  icon: Bell },
    { id: "alerts" as const, label: "Smart Alerts",  icon: Zap },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Notifications</h3>
            <p className="text-[10px] text-muted-foreground">{unreadCount} unread</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={fetchNotifs} className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" aria-label="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all relative",
                activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.badge ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {/* ── Feed ── */}
          {activeTab === "feed" && (
            <div className="space-y-2">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifs.length === 0 ? (
                <div className="text-center py-10">
                  <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm font-bold text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground mt-1">You'll see ride updates, promos, and alerts here</p>
                </div>
              ) : (
                notifs.map((n, i) => {
                  const { icon: TypeIcon, color } = getIconForNotif(n);
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn(
                        "rounded-2xl border p-3.5 transition-all cursor-pointer",
                        n.is_read ? "bg-card border-border/30" : "bg-primary/[0.02] border-primary/20"
                      )}
                      onClick={() => { if (!n.is_read) markRead(n.id); }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", color)}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground truncate">{n.title}</span>
                            {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                          <span className="text-[10px] text-muted-foreground mt-1.5 block">{timeAgo(n.created_at)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Preferences ── */}
          {activeTab === "prefs" && (
            <div className="space-y-3">
              {/* Push permission status */}
              <div className={cn(
                "rounded-2xl border p-4 flex items-center gap-3",
                isSubscribed ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/20 border-border/40"
              )}>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isSubscribed ? "bg-emerald-500/10" : "bg-muted/40")}>
                  <Smartphone className={cn("w-5 h-5", isSubscribed ? "text-emerald-500" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Push Notifications</p>
                  <p className="text-[10px] text-muted-foreground">
                    {permission === "denied"
                      ? "Blocked in browser — open browser settings to enable"
                      : isSubscribed
                        ? "Active — you'll receive real-time alerts"
                        : "Off — tap to enable real-time alerts"}
                  </p>
                </div>
                {permission !== "denied" && (
                  <Button
                    size="sm"
                    variant={isSubscribed ? "outline" : "default"}
                    className="h-9 text-xs font-bold rounded-xl shrink-0"
                    disabled={enablingPush}
                    onClick={isSubscribed ? handleDisablePush : handleEnablePush}
                  >
                    {enablingPush
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : isSubscribed ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                    {!enablingPush && (isSubscribed ? " Disable" : " Enable")}
                  </Button>
                )}
              </div>

              {/* Per-type toggles */}
              {prefs.map(pref => {
                const Icon = pref.icon;
                return (
                  <div key={pref.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/40">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", pref.enabled ? "bg-primary/10" : "bg-muted/40")}>
                      <Icon className={cn("w-4 h-4", pref.enabled ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-foreground">{pref.label}</span>
                      <p className="text-[10px] text-muted-foreground">{pref.description}</p>
                    </div>
                    <Switch checked={pref.enabled} onCheckedChange={() => togglePref(pref.id)} />
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Smart Alerts ── */}
          {activeTab === "alerts" && (
            <div className="space-y-4">
              {/* Price Watch */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-foreground">Price Watch</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set alerts for routes you ride frequently. We'll notify you when prices drop.
                </p>
                <div className="space-y-2">
                  {[
                    { route: "Home → Office",  currentPrice: "$12–15", threshold: "$10", active: true },
                    { route: "Home → Airport", currentPrice: "$28–35", threshold: "$25", active: true },
                  ].map(alert => (
                    <div key={alert.route} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/20">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-foreground">{alert.route}</span>
                        <p className="text-[10px] text-muted-foreground">
                          Alert below {alert.threshold} · Now {alert.currentPrice}
                        </p>
                      </div>
                      <Switch defaultChecked={alert.active} />
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-xl text-xs font-bold"
                  onClick={() => setShowAlertForm(v => !v)}
                >
                  <DollarSign className="w-3.5 h-3.5 mr-1.5" /> {showAlertForm ? "Cancel" : "Add Price Alert"}
                </Button>
                <AnimatePresence>
                  {showAlertForm && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                      <input value={alertRoute} onChange={e => setAlertRoute(e.target.value)} placeholder="Route (e.g. Home → Airport)"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" />
                      <div className="flex gap-2">
                        <input value={alertThreshold} onChange={e => setAlertThreshold(e.target.value)} placeholder="Alert below (e.g. $20)"
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        <button type="button" disabled={!alertRoute.trim() || !alertThreshold.trim()}
                          onClick={() => {
                            toast.success(`Alert set for ${alertRoute} below ${alertThreshold}`);
                            setAlertRoute(""); setAlertThreshold(""); setShowAlertForm(false);
                          }}
                          className="px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40">
                          Set
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Smart Reminders */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-foreground">Smart Reminders</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Pre-ride reminder",    desc: "30 min before scheduled rides",    enabled: true },
                    { label: "Weekly ride summary",  desc: "Sunday evening spending recap",     enabled: true },
                    { label: "Surge end alerts",     desc: "Notify when surge pricing drops",  enabled: false },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/20">
                      <div>
                        <span className="text-xs font-bold text-foreground">{r.label}</span>
                        <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                      </div>
                      <Switch defaultChecked={r.enabled} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
