/**
 * LinkedDevicesPage — list of devices currently signed in to this account.
 * Groups by last activity, highlights "this device", supports search and
 * sign-out-from-all-other-sessions via Supabase Auth.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Smartphone, Monitor, Tablet, QrCode, ScanLine, Trash2, Search, X,
  Apple, Loader2, ShieldOff, MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import SEOHead from "@/components/SEOHead";
import { useLinkedDevices, type UserDevice } from "@/hooks/useLinkedDevices";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function deviceIcon(platform: string | null) {
  const p = (platform ?? "").toLowerCase();
  if (p.includes("ios")) return Apple;
  if (p.includes("ipad")) return Tablet;
  if (p.includes("android")) return Smartphone;
  if (p.includes("mac")) return Apple;
  if (p.includes("windows")) return Monitor;
  if (p.includes("linux")) return Monitor;
  return Monitor;
}

function platformAccent(platform: string | null) {
  const p = (platform ?? "").toLowerCase();
  if (p.includes("ios") || p.includes("mac")) return { bg: "bg-foreground/10", color: "text-foreground" };
  if (p.includes("android")) return { bg: "bg-emerald-500/10", color: "text-emerald-500" };
  if (p.includes("windows")) return { bg: "bg-sky-500/10", color: "text-sky-500" };
  if (p.includes("linux")) return { bg: "bg-amber-500/10", color: "text-amber-500" };
  return { bg: "bg-violet-500/10", color: "text-violet-500" };
}

type GroupKey = "active" | "today" | "week" | "older";
const GROUP_LABELS: Record<GroupKey, string> = {
  active: "Active now",
  today: "Active today",
  week: "Active this week",
  older: "Older activity",
};

function groupDevices(devices: UserDevice[]): Record<GroupKey, UserDevice[]> {
  const now = Date.now();
  const out: Record<GroupKey, UserDevice[]> = { active: [], today: [], week: [], older: [] };
  for (const d of devices) {
    const seen = new Date(d.last_seen_at).getTime();
    const ago = now - seen;
    if (ago < 5 * 60 * 1000) out.active.push(d);
    else if (ago < 24 * 60 * 60 * 1000) out.today.push(d);
    else if (ago < 7 * 24 * 60 * 60 * 1000) out.week.push(d);
    else out.older.push(d);
  }
  return out;
}

export default function LinkedDevicesPage() {
  const navigate = useNavigate();
  const { devices, loading, removeDevice, refresh } = useLinkedDevices();
  const [search, setSearch] = useState("");
  const [signingOutOthers, setSigningOutOthers] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return devices;
    const q = search.toLowerCase();
    return devices.filter((d) => {
      const label = (d.device_label ?? "").toLowerCase();
      const platform = (d.platform ?? "").toLowerCase();
      return label.includes(q) || platform.includes(q);
    });
  }, [devices, search]);

  // The most recently active device is treated as "This device"
  const currentDeviceId = useMemo(() => {
    if (devices.length === 0) return null;
    return [...devices].sort(
      (a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()
    )[0]?.id;
  }, [devices]);

  const grouped = useMemo(() => groupDevices(filtered), [filtered]);

  const handleSignOutOthers = async () => {
    setSigningOutOthers(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      toast.success("Signed out from all other devices");
      // Refresh device list (some entries may be invalidated server-side)
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Could not sign out other sessions");
    } finally {
      setSigningOutOthers(false);
    }
  };

  const renderDevice = (d: UserDevice, isCurrent: boolean) => {
    const Icon = deviceIcon(d.platform);
    const accent = platformAccent(d.platform);
    return (
      <motion.li
        key={d.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -8 }}
        layout
      >
        <Card className={cn(
          "transition-colors",
          isCurrent && "border-primary/40 bg-primary/[0.03]"
        )}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn("rounded-full p-2 shrink-0", accent.bg)}>
              <Icon className={cn("h-5 w-5", accent.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="truncate text-sm font-semibold">
                  {d.device_label ?? "Unknown device"}
                </span>
                {isCurrent && (
                  <span className="inline-flex items-center text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 px-1.5 py-0.5">
                    This device
                  </span>
                )}
                {d.platform && (
                  <span className="text-[10px] font-normal text-muted-foreground">{d.platform}</span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <span>Active {formatDistanceToNow(new Date(d.last_seen_at), { addSuffix: true })}</span>
              </div>
            </div>
            {!isCurrent && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                onClick={() => void removeDevice(d.id)}
                aria-label={`Remove ${d.device_label ?? "device"}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.li>
    );
  };

  const totalCount = devices.length;
  const otherCount = totalCount > 0 ? totalCount - 1 : 0;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Linked Devices · ZIVO" description="Manage devices signed in to your ZIVO account." />

      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 bg-background/85 px-4 backdrop-blur-xl safe-area-top"
        style={{ paddingTop: "calc(var(--zivo-safe-top,0px) + 12px)", paddingBottom: 12 }}
      >
        <button type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          className="-ml-2 rounded-full p-2 hover:bg-foreground/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold flex-1">Linked Devices</h1>
        {totalCount > 0 && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {totalCount} total
          </span>
        )}
      </header>

      <main className="mx-auto w-full max-w-xl space-y-4 px-4 py-5 pb-24">
        {/* Action tiles */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/account/link-device" className="block">
            <Card className="border-primary/30 bg-primary/5 transition hover:bg-primary/10">
              <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
                <QrCode className="h-7 w-7 text-primary" />
                <div className="text-sm font-semibold">Link a Device</div>
                <div className="text-[11px] text-muted-foreground">Show a QR code</div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/account/scan-device" className="block">
            <Card className="transition hover:bg-foreground/5">
              <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
                <ScanLine className="h-7 w-7 text-foreground/80" />
                <div className="text-sm font-semibold">Scan to Link</div>
                <div className="text-[11px] text-muted-foreground">Approve another device</div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Search + sign-out-all */}
        {totalCount > 1 && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search devices…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search devices"
                className="pl-9 pr-8 h-9 rounded-full bg-muted/40 border-border/40 text-xs"
              />
              {search && (
                <button type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:bg-muted/60"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full px-3 text-xs gap-1 shrink-0 text-foreground hover:bg-secondary hover:text-foreground border-border"
                  disabled={signingOutOthers || otherCount === 0}
                >
                  {signingOutOthers ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
                  <span className="hidden sm:inline">Sign out others</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out from all other devices?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will end your session on {otherCount} other device{otherCount === 1 ? "" : "s"}. You'll
                    stay signed in here. Use this if you suspect someone else has access to your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSignOutOthers} className="bg-foreground hover:bg-foreground">
                    Sign out others
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Devices */}
        {loading ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
        ) : filtered.length === 0 ? (
          totalCount === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No devices recorded yet.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Search className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No devices match "{search}"</p>
                <Button variant="link" size="sm" onClick={() => setSearch("")} className="mt-1 text-xs">
                  Clear search
                </Button>
              </CardContent>
            </Card>
          )
        ) : (
          <AnimatePresence>
            {(["active", "today", "week", "older"] as GroupKey[]).map((g) => {
              const items = grouped[g];
              if (items.length === 0) return null;
              return (
                <section key={g} className="space-y-2">
                  <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    {g === "active" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {GROUP_LABELS[g]}
                  </h2>
                  <ul className="space-y-2">
                    {items.map((d) => renderDevice(d, d.id === currentDeviceId))}
                  </ul>
                </section>
              );
            })}
          </AnimatePresence>
        )}

        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
          Removing a device only forgets it from this list. To force sign-out, use "Sign out others" above
          or change your password from <Link to="/account/security" className="text-primary underline">Account → Security</Link>.
        </p>
      </main>
    </div>
  );
}
