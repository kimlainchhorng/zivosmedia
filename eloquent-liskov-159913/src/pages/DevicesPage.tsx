/**
 * DevicesPage — Logins & devices (IG signature privacy feature).
 * Backed by the real `user_devices` table.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Smartphone, Monitor, Tablet, Shield, Clock, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DeviceInfoBag {
  platform?: string;
  os?: string;
  os_version?: string;
  model?: string;
  browser?: string;
  app?: string;
  city?: string;
  country?: string;
  ip?: string;
}

interface DeviceRow {
  id: string;
  device_id: string | null;
  device_info: DeviceInfoBag | null;
  last_seen_at: string | null;
  role: string;
  onesignal_player_id: string;
  created_at: string | null;
  updated_at: string | null;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function iconForPlatform(info: DeviceInfoBag | null): typeof Smartphone {
  const p = (info?.platform ?? info?.os ?? "").toLowerCase();
  if (p.includes("ipad") || p.includes("tablet")) return Tablet;
  if (p.includes("mac") || p.includes("win") || p.includes("linux") || p.includes("desktop") || p.includes("web")) return Monitor;
  return Smartphone;
}

function labelForDevice(d: DeviceRow): { primary: string; secondary: string } {
  const info = d.device_info ?? {};
  const primary = info.model ?? info.platform ?? info.os ?? info.browser ?? d.role ?? "Device";
  const bits: string[] = [];
  if (info.os && info.os_version) bits.push(`${info.os} ${info.os_version}`);
  else if (info.os) bits.push(info.os);
  if (info.app) bits.push(info.app);
  if (info.city || info.country) bits.push([info.city, info.country].filter(Boolean).join(", "));
  return { primary, secondary: bits.join(" · ") || "Active session" };
}

export default function DevicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["user-devices", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as DeviceRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: DeviceRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("user_devices")
        .select("id, device_id, device_info, last_seen_at, role, onesignal_player_id, created_at, updated_at")
        .eq("user_id", user.id)
        .order("last_seen_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          delete: () => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const { error } = await sb.from("user_devices").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Device removed");
      qc.invalidateQueries({ queryKey: ["user-devices", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not remove"),
  });

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Logins & devices · ZIVO" description="See where you're signed in." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Logins & devices</h1>
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
          <Shield className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Signed in</p>
          <p className="text-3xl font-bold mt-1">{devices.length} {devices.length === 1 ? "device" : "devices"}</p>
          <p className="text-sm text-white/80 mt-1">Remove any session you don't recognize.</p>
        </motion.div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && devices.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No tracked devices</p>
            <p className="text-xs text-muted-foreground">This device should appear here after your next push-token sync.</p>
          </div>
        )}

        {!isLoading && devices.length > 0 && (
          <div className="space-y-2">
            {devices.map((d, idx) => {
              const Icon = iconForPlatform(d.device_info);
              const labels = labelForDevice(d);
              const isFresh = d.last_seen_at && (Date.now() - new Date(d.last_seen_at).getTime()) < 5 * 60_000;
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border"
                >
                  <div className={cn(
                    "shrink-0 h-11 w-11 rounded-xl flex items-center justify-center",
                    isFresh ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground",
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{labels.primary}</p>
                      {isFresh && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-ig-gradient">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active now
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{labels.secondary}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 inline-flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> Last seen {formatRelative(d.last_seen_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove this device"
                    onClick={() => { if (confirm(`Sign out ${labels.primary}?`)) removeMutation.mutate(d.id); }}
                    disabled={removeMutation.isPending}
                    className="shrink-0 h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="rounded-xl border border-border bg-secondary/40 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">Don't recognize a device?</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Remove it, then change your password from <button type="button" onClick={() => navigate("/account/settings")} className="text-ig-gradient font-bold underline-offset-2 hover:underline">account settings</button>.
            </p>
          </div>
        </div>
      </div>
    </SwipeBackContainer>
  );
}
