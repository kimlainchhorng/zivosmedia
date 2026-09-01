import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGoBack } from "@/hooks/useGoBack";
import { ArrowLeft, Shield, RefreshCw, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LockoutRow {
  identifier: string;
  failed_streak: number;
  blocked_until: string | null;
  updated_at: string;
}

// Mirrors public.login_attempts, the table production's auth lockout actually
// uses. The old auth_login_events design (auth_shield_lockout) was superseded
// and never deployed, so risk_score / risk_labels / blocked_before_attempt have
// no source; they stay optional rather than being invented.
interface LoginEventRow {
  id: string;
  identifier: string;
  success: boolean;
  device_fingerprint: string | null;
  created_at: string;
  risk_score?: number;
  risk_labels?: string[];
  blocked_before_attempt?: boolean;
}

export default function AdminAuthShieldPage() {
  const navigate = useNavigate();
  const goBack = useGoBack("/");

  const {
    data: lockouts = [],
    isLoading: lockoutsLoading,
    refetch: refetchLockouts,
    isFetching: lockoutsFetching,
  } = useQuery({
    queryKey: ["admin-auth-shield-lockouts"],
    queryFn: async () => {
      // admin_auth_lockouts derives the lockout from login_attempts using the
      // exact thresholds auth_precheck_login enforces, so this console cannot
      // drift from the lockout a user actually hits.
      const { data, error } = await (supabase as any).rpc(
        "admin_auth_lockouts",
        { _limit: 200 },
      );
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
        .from("login_attempts")
        .select("id, identifier, success, device_fingerprint, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data || []) as LoginEventRow[];
    },
  });

  const legacyFutureLockouts = lockouts.filter(
    (item) => item.blocked_until && new Date(item.blocked_until) > new Date(),
  ).length;
  // login_attempts records the attempt, not whether the precheck rejected it,
  // so count distinct identifiers under pressure rather than showing a zero
  // that looks like "nothing is being blocked".
  const blockedAttempts = new Set(
    loginEvents.filter((e) => !e.success).map((e) => e.identifier),
  ).size;
  const failedAttempts = loginEvents.filter((e) => !e.success).length;

  const topTargets = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of loginEvents) {
      if (event.success) continue;
      map.set(event.identifier, (map.get(event.identifier) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [loginEvents]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            aria-label="Back"
            variant="outline"
            size="icon"
            onClick={goBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-ig-gradient">
              Auth Security History
            </h1>
            <p className="text-muted-foreground">
              Historical custom lockout data and provider-auth status
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            void refetchLockouts();
            void refetchEvents();
          }}
          disabled={lockoutsFetching}
        >
          <RefreshCw
            className={`h-4 w-4 ${lockoutsFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex gap-3 pt-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-medium">
              Custom Auth Shield enforcement is unavailable
            </p>
            <p className="text-sm text-muted-foreground">
              Browser-written failed-attempt reporting and ZIVO quarantine are
              not enforced on direct password sign-in. Supabase Auth provider
              throttling remains active. The counts below are historical and may
              be stale; do not use them as proof that an account is blocked.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Shield className="h-7 w-7 text-red-600" />
            <div>
              <p className="text-2xl font-bold">{legacyFutureLockouts}</p>
              <p className="text-xs text-muted-foreground">
                Legacy Future Lock Rows
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{failedAttempts}</p>
              <p className="text-xs text-muted-foreground">
                Recorded Failures (historical)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{blockedAttempts}</p>
              <p className="text-xs text-muted-foreground">
                Legacy Target Rows
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historical Failed Targets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {topTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No historical failed targets recorded.
            </p>
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
          <CardTitle>Historical Lockout / Risk Table</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lockoutsLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading lockout data...
            </p>
          ) : lockouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No historical lockout rows or elevated failed streaks.
            </p>
          ) : (
            lockouts.map((item) => (
              <div key={item.identifier} className="rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground break-all">
                    {item.identifier}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Failed streak: {item.failed_streak}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.blocked_until
                      ? `Legacy blocked-until timestamp ${formatDistanceToNow(new Date(item.blocked_until), { addSuffix: true })}`
                      : "No legacy blocked-until timestamp"}
                  </p>
                </div>
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
            <p className="text-sm text-muted-foreground">
              Loading login events...
            </p>
          ) : loginEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recent login events found.
            </p>
          ) : (
            loginEvents.slice(0, 50).map((event) => (
              <div key={event.id} className="rounded-lg border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-foreground truncate">
                      {event.identifier}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={event.success ? "secondary" : "destructive"}
                    >
                      {event.success ? "Success" : "Failed"}
                    </Badge>
                    {(event.risk_score ?? 0) > 0 && (
                      <Badge variant="outline">Risk {event.risk_score}</Badge>
                    )}
                    {event.blocked_before_attempt && (
                      <Badge variant="outline">Precheck Blocked</Badge>
                    )}
                  </div>
                </div>
                {(event.risk_labels || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(event.risk_labels || []).map((label) => (
                      <Badge
                        key={`${event.id}-${label}`}
                        variant="secondary"
                        className="text-[10px]"
                      >
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
