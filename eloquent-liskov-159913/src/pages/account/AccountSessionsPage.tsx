import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldAlert, LogOut, Loader2, CheckCircle2, XCircle, RefreshCw, Smartphone, Globe, MapPin, Clock, ShieldCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { getDeviceFingerprint } from "@/lib/security/deviceFingerprint";

type LoginRow = {
  id: string;
  device_fingerprint: string | null;
  success: boolean;
  blocked_before_attempt: boolean;
  risk_score: number;
  risk_labels: string[];
  created_at: string;
};

type ActiveSession = {
  id: string;
  label: string;
  device_type: string | null;
  ip: string | null;
  location: string | null;
  is_trusted: boolean;
  is_current: boolean;
  last_activity: string | null;
  created_at: string;
  expires_at: string | null;
};

type TrustedDevice = {
  id: string;
  device_fingerprint: string;
  device_name: string | null;
  device_type: string | null;
  last_used: string | null;
  is_active: boolean;
  created_at: string;
};

export default function AccountSessionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const thisDeviceFp = useMemo<string | null>(() => {
    try { return getDeviceFingerprint(); } catch { return null; }
  }, []);

  const list = useQuery({
    queryKey: ["my-recent-logins"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_my_recent_logins", {
        _limit: 50, _hours: 24 * 30,
      });
      if (error) throw error;
      return (data || []) as LoginRow[];
    },
  });

  // Active sessions — currently-signed-in devices via the list-my-sessions
  // edge function. Each row carries a sessionId we can pass to revoke-session.
  const activeSessions = useQuery({
    queryKey: ["my-active-sessions", thisDeviceFp],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("list-my-sessions", {
        headers: thisDeviceFp ? { "x-device-fingerprint": thisDeviceFp } : undefined,
      });
      if (error) throw error;
      return ((data as any)?.sessions || []) as ActiveSession[];
    },
  });

  // Trusted devices — independent from login_sessions; this is the list of
  // devices the user has explicitly marked "trusted" (the OS/browser combos
  // that skip the new-device 6-digit OTP challenge on next sign-in). Users
  // typically want to occasionally clear out old phones / borrowed laptops.
  const trustedDevices = useQuery({
    queryKey: ["my-trusted-devices", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trusted_devices")
        .select("id, device_fingerprint, device_name, device_type, last_used, is_active, created_at")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("last_used", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as TrustedDevice[];
    },
  });

  const removeTrust = useMutation({
    mutationFn: async (fingerprint: string) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await (supabase as any).rpc("remove_trusted_device", {
        _user_id: user.id,
        _device_fingerprint: fingerprint,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Device trust removed");
      queryClient.invalidateQueries({ queryKey: ["my-trusted-devices"] });
    },
    onError: (e: any) => toast.error(e?.message || "Could not remove device trust"),
  });

  const revokeOne = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.functions.invoke("revoke-session", {
        body: { sessionId },
        headers: thisDeviceFp ? { "x-device-fingerprint": thisDeviceFp } : undefined,
      });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error || "Could not sign out that session");
      return (data as any)?.revoked as number;
    },
    onSuccess: (n) => {
      toast.success(n === 1 ? "Session signed out" : `${n} sessions signed out`);
      queryClient.invalidateQueries({ queryKey: ["my-active-sessions"] });
    },
    onError: (e: any) => toast.error(e?.message || "Could not sign out that session"),
  });

  const signOutOthers = useMutation({
    mutationFn: async () => {
      // Use the new edge function so it both updates login_sessions and
      // revokes Supabase refresh tokens server-side.
      const { data, error } = await supabase.functions.invoke("revoke-session", {
        body: { sessionId: "all_others" },
        headers: thisDeviceFp ? { "x-device-fingerprint": thisDeviceFp } : undefined,
      });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error || "Sign-out failed");
      return (data as any)?.revoked as number;
    },
    onSuccess: (n) => {
      toast.success(n > 0 ? `Signed out ${n} other ${n === 1 ? "device" : "devices"}` : "No other devices to sign out");
      queryClient.invalidateQueries({ queryKey: ["my-recent-logins"] });
      queryClient.invalidateQueries({ queryKey: ["my-active-sessions"] });
    },
    onError: (e: any) => toast.error(e?.message || "Sign-out failed"),
  });

  const rows = list.data || [];
  const stats = useMemo(() => {
    const successes = rows.filter((r) => r.success).length;
    const failures  = rows.filter((r) => !r.success).length;
    const distinctDevices = new Set(
      rows.filter((r) => r.success && r.device_fingerprint).map((r) => r.device_fingerprint)
    ).size;
    return { successes, failures, distinctDevices };
  }, [rows]);

  const fpShort = (fp: string | null) => (fp ? `${fp.slice(0, 12)}…` : "unknown");

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-3 pb-24 sm:p-4 lg:p-6 safe-area-top">
      <SEOHead title="Active sessions" description="See where you're signed in and revoke other sessions." />
      <header className="flex items-center gap-2">
        <Link to="/account" className="rounded-full p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Active sessions</h1>
          <p className="text-sm text-muted-foreground">Recent sign-ins to your account.</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Successful sign-ins</p>
          <p className="text-2xl font-semibold text-emerald-600">{stats.successes}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Failed attempts</p>
          <p className={`text-2xl font-semibold ${stats.failures > 0 ? "text-red-600" : ""}`}>{stats.failures}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Distinct devices</p>
          <p className="text-2xl font-semibold">{stats.distinctDevices}</p>
        </CardContent></Card>
      </div>

      {/* Active sessions — currently-signed-in devices, one card each.
          Each row offers per-device "Sign out". The current device shows a
          green badge. The "Sign out everywhere else" button sits at the top
          for quick access. */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-foreground" />
            Where you're signed in
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => activeSessions.refetch()}
            className="gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${activeSessions.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeSessions.isLoading && (
            <p className="text-sm text-muted-foreground">Loading active sessions…</p>
          )}
          {activeSessions.isError && (
            <p className="text-sm text-red-600">Could not load sessions. Tap refresh to retry.</p>
          )}
          {!activeSessions.isLoading && (activeSessions.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No other active sessions on file.</p>
          )}
          {(activeSessions.data || []).map((s) => (
            <div
              key={s.id}
              className={`rounded-md border p-3 text-sm flex items-start gap-3 ${
                s.is_current ? "border-rose-400/60 bg-rose-50/40 dark:bg-rose-950/20" : ""
              }`}
            >
              <div className="mt-0.5 shrink-0">
                <Smartphone className="h-5 w-5 text-zinc-500" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-sm truncate max-w-[16rem]">{s.label || "Unknown device"}</p>
                  {s.is_current && (
                    <Badge className="bg-secondary text-foreground dark:text-foreground border-border">
                      This device
                    </Badge>
                  )}
                  {s.is_trusted && !s.is_current && (
                    <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400">trusted</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {s.location && (
                    <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.location}</p>
                  )}
                  {s.ip && (
                    <p className="flex items-center gap-1 font-mono"><Globe className="h-3 w-3" /> {s.ip}</p>
                  )}
                  <p className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Active {formatDistanceToNow(new Date(s.last_activity || s.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              {!s.is_current && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={revokeOne.isPending && revokeOne.variables === s.id}
                  onClick={() => {
                    const label = s.label || "this device";
                    toast(`Sign out ${label}?`, {
                      description: "The session will be ended immediately.",
                      action: { label: "Sign out", onClick: () => revokeOne.mutate(s.id) },
                      cancel: { label: "Cancel", onClick: () => {} },
                    });
                  }}
                >
                  {revokeOne.isPending && revokeOne.variables === s.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Sign out"
                  )}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trusted devices — these are the OS/browser combos that skip the
          new-device 6-digit OTP challenge on next sign-in. Distinct from
          login_sessions: a device can be "trusted" without being currently
          signed in. Removing trust just forces the next sign-in from that
          device to go through the OTP step again. */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Trusted devices
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => trustedDevices.refetch()}
            className="gap-1"
            aria-label="Refresh trusted devices"
          >
            <RefreshCw className={`h-4 w-4 ${trustedDevices.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Devices you&apos;ve marked as trusted skip the 6-digit code on sign-in. Remove any you no longer recognize or use.
          </p>
          {trustedDevices.isLoading && (
            <p className="text-sm text-muted-foreground">Loading trusted devices…</p>
          )}
          {trustedDevices.isError && (
            <p className="text-sm text-red-600">Could not load trusted devices. Tap refresh to retry.</p>
          )}
          {!trustedDevices.isLoading && (trustedDevices.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No trusted devices yet. The next time you sign in from a new device, choose &ldquo;Trust this device&rdquo; to add it here.</p>
          )}
          {(trustedDevices.data || []).map((d) => {
            const isThis = thisDeviceFp && d.device_fingerprint === thisDeviceFp;
            return (
              <div
                key={d.id}
                className={`rounded-md border p-3 text-sm flex items-start gap-3 ${
                  isThis ? "border-emerald-500/60 bg-emerald-500/5" : ""
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm truncate max-w-[16rem]">
                      {d.device_name || d.device_type || "Trusted device"}
                    </p>
                    {isThis && (
                      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-400/40">This device</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {d.last_used
                        ? `Last used ${formatDistanceToNow(new Date(d.last_used), { addSuffix: true })}`
                        : `Trusted ${formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}`}
                    </p>
                    <p className="font-mono text-[11px]">device: {fpShort(d.device_fingerprint)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={removeTrust.isPending && removeTrust.variables === d.device_fingerprint}
                  onClick={() => {
                    const label = d.device_name || d.device_type || "this device";
                    toast(`Remove trust from ${label}?`, {
                      description: "Next sign-in from that device will require the 6-digit code again.",
                      action: {
                        label: "Remove",
                        onClick: () => removeTrust.mutate(d.device_fingerprint),
                      },
                      cancel: { label: "Cancel", onClick: () => {} },
                    });
                  }}
                >
                  {removeTrust.isPending && removeTrust.variables === d.device_fingerprint ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Remove
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-orange-600" />
            Sign out from all other devices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            If you see a sign-in you don&apos;t recognize, sign out everywhere else and change your password from{" "}
            <Link to="/account/security" className="underline">Security</Link>.
          </p>
          <Button
            variant="destructive"
            className="gap-2"
            disabled={signOutOthers.isPending}
            onClick={() => signOutOthers.mutate()}
          >
            {signOutOthers.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Sign out other sessions
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">Recent activity (last 30 days)</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => list.refetch()} className="gap-1">
            <RefreshCw className={`h-4 w-4 ${list.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!list.isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No recorded sign-ins.</p>
          )}
          {rows.map((r) => {
            const isThis = thisDeviceFp && r.device_fingerprint === thisDeviceFp;
            return (
              <div
                key={r.id}
                className={`rounded-md border p-3 text-sm ${isThis ? "border-emerald-500/60 bg-emerald-500/5" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {r.success
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : <XCircle className="h-4 w-4 text-red-600" />}
                  <span className="text-xs font-medium">
                    {r.success ? "Success" : "Failed"}
                  </span>
                  {isThis && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-400/40">This device</Badge>}
                  {r.blocked_before_attempt && <Badge variant="outline" className="text-orange-700">blocked early</Badge>}
                  {r.risk_score >= 50 && (
                    <Badge variant="outline" className="text-red-700">risk {r.risk_score}</Badge>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  device: {fpShort(r.device_fingerprint)}
                </p>
                {r.risk_labels.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.risk_labels.map((l) => (
                      <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}
