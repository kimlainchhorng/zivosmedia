import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, RefreshCw, Unlock, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface LockoutRow {
  identifier: string;
  failed_streak: number;
  blocked_until: string | null;
  updated_at: string;
}

interface LoginEventRow {
  id: string;
  identifier: string;
  success: boolean;
  blocked_before_attempt: boolean;
  risk_score: number;
  risk_labels: string[];
  created_at: string;
}

export default function AdminAuthShieldPage() {
  const navigate = useNavigate();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [quarantiningId, setQuarantiningId] = useState<string | null>(null);

  const {
    data: lockouts = [],
    isLoading: lockoutsLoading,
    refetch: refetchLockouts,
    isFetching: lockoutsFetching,
  } = useQuery({
    queryKey: ["admin-auth-shield-lockouts"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from("auth_login_protection")
        .select("identifier, failed_streak, blocked_until, updated_at")
        .or(`blocked_until.gt.${now},failed_streak.gte.3`)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as LockoutRow[];
    },
  });

  const {
    data: loginEvents = [],
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ["admin-auth-shield-events"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("auth_login_events")
        .select("id, identifier, success, blocked_before_attempt, risk_score, risk_labels, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data || []) as LoginEventRow[];
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const { error } = await (supabase as any).rpc("admin_clear_auth_lockout", { _identifier: identifier });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Auth lockout cleared");
      await Promise.all([refetchLockouts(), refetchEvents()]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to clear lockout");
    },
  });

  const quarantineMutation = useMutation({
    mutationFn: async ({ identifier, hours }: { identifier: string; hours: number }) => {
      const { error } = await (supabase as any).rpc("admin_force_auth_quarantine", {
        _identifier: identifier,
        _hours: hours,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Forced quarantine applied");
      await Promise.all([refetchLockouts(), refetchEvents()]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to force quarantine");
    },
  });

  const activeLockouts = lockouts.filter((item) => item.blocked_until && new Date(item.blocked_until) > new Date()).length;
  const blockedAttempts = loginEvents.filter((e) => e.blocked_before_attempt).length;
  const failedAttempts = loginEvents.filter((e) => !e.success).length;

  const topTargets = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of loginEvents) {
      if (event.success) continue;
      map.set(event.identifier, (map.get(event.identifier) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [loginEvents]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button aria-label="Back" variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-ig-gradient">Auth Shield Control</h1>
            <p className="text-muted-foreground">Login attack lockout monitoring and response</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => { void refetchLockouts(); void refetchEvents(); }} disabled={lockoutsFetching}>
          <RefreshCw className={`h-4 w-4 ${lockoutsFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Shield className="h-7 w-7 text-red-600" />
            <div>
              <p className="text-2xl font-bold">{activeLockouts}</p>
              <p className="text-xs text-muted-foreground">Active Lockouts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{failedAttempts}</p>
              <p className="text-xs text-muted-foreground">Failed Attempts (24h)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Unlock className="h-7 w-7 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{blockedAttempts}</p>
              <p className="text-xs text-muted-foreground">Blocked Prechecks (24h)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Failed Targets (24h)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {topTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No failed targets detected.</p>
          ) : (
            topTargets.map(([identifier, count]) => (
              <Badge key={identifier} variant="secondary" className="text-xs">
                {identifier} ({count})
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lockout / Risk Table</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lockoutsLoading ? (
            <p className="text-sm text-muted-foreground">Loading lockout data...</p>
          ) : lockouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active lockouts or elevated failed streaks.</p>
          ) : (
            lockouts.map((item) => (
              <div key={item.identifier} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground break-all">{item.identifier}</p>
                  <p className="text-xs text-muted-foreground">Failed streak: {item.failed_streak}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.blocked_until ? `Blocked until ${formatDistanceToNow(new Date(item.blocked_until), { addSuffix: true })}` : "Not currently blocked"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={unlockMutation.isPending && unlockingId === item.identifier}
                  onClick={() => {
                    setUnlockingId(item.identifier);
                    unlockMutation.mutate(item.identifier);
                  }}
                >
                  <Unlock className="h-4 w-4" />
                  Clear Lock
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1"
                  disabled={quarantineMutation.isPending && quarantiningId === item.identifier}
                  onClick={() => {
                    setQuarantiningId(item.identifier);
                    quarantineMutation.mutate({ identifier: item.identifier, hours: 6 });
                  }}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Force 6h
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Login Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {eventsLoading ? (
            <p className="text-sm text-muted-foreground">Loading login events...</p>
          ) : loginEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent login events found.</p>
          ) : (
            loginEvents.slice(0, 50).map((event) => (
              <div key={event.id} className="rounded-lg border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-foreground truncate">{event.identifier}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={event.success ? "secondary" : "destructive"}>
                      {event.success ? "Success" : "Failed"}
                    </Badge>
                    {event.risk_score > 0 && (
                      <Badge variant="outline">Risk {event.risk_score}</Badge>
                    )}
                    {event.blocked_before_attempt && <Badge variant="outline">Precheck Blocked</Badge>}
                  </div>
                </div>
                {(event.risk_labels || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {event.risk_labels.map((label) => (
                      <Badge key={`${event.id}-${label}`} variant="secondary" className="text-[10px]">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
