/**
 * Admin Notification Analytics
 * ----------------------------
 * Cross-channel deliverability dashboard backed by:
 *   • push_notification_logs   (FCM / APNs / VAPID)
 *   • email_send_log           (Resend)
 *   • sms_send_log             (Twilio)
 *
 * Shows totals, success rate, top events, and a 7-day delivery trend.
 * Read-only — no mutating actions on this page.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Bell,
  Mail,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Smartphone,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import AdminLayout from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";

type Range = "24h" | "7d" | "30d";

const RANGE_HOURS: Record<Range, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

function sinceIso(range: Range): string {
  const d = new Date();
  d.setHours(d.getHours() - RANGE_HOURS[range]);
  return d.toISOString();
}

interface LogRow {
  id: string;
  status: string;
  notification_type?: string | null;
  template_name?: string | null;
  event_type?: string | null;
  created_at: string;
}

type Diagnostics = { fcm: boolean; apns: boolean; vapid: boolean; resend: boolean; twilio: boolean };

export default function AdminNotificationAnalyticsPage() {
  const [range, setRange] = useState<Range>("7d");
  const [testing, setTesting] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const since = useMemo(() => sinceIso(range), [range]);

  const sendTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-test-notification", {
        body: {},
      });
      if (error) throw error;
      setDiagnostics((data as { diagnostics?: Diagnostics })?.diagnostics ?? null);
      const dispatch = (data as { dispatch?: { results?: Record<string, { ok?: boolean; skipped?: boolean }> } }).dispatch;
      const results = dispatch?.results ?? {};
      const sent = Object.entries(results)
        .filter(([, v]) => v.ok)
        .map(([k]) => k);
      toast.success(
        sent.length > 0
          ? `Test sent — ${sent.join(", ")}`
          : "Test fired but every channel was skipped (check diagnostics)",
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Test send failed");
    } finally {
      setTesting(false);
    }
  };

  const pushQ = useQuery({
    queryKey: ["notif-analytics-push", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_notification_logs")
        .select("id, status, notification_type, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  const emailQ = useQuery({
    queryKey: ["notif-analytics-email", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("id, status, template_name, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) {
        console.warn("[notif-analytics] email_send_log unavailable", error.message);
        return [] as LogRow[];
      }
      return (data ?? []) as LogRow[];
    },
  });

  const smsQ = useQuery({
    queryKey: ["notif-analytics-sms", range],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sms_send_log")
        .select("id, status, event_type, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) {
        console.warn("[notif-analytics] sms_send_log unavailable", error.message);
        return [] as LogRow[];
      }
      return (data ?? []) as LogRow[];
    },
  });

  const refresh = () => {
    pushQ.refetch();
    emailQ.refetch();
    smsQ.refetch();
  };

  const push = pushQ.data ?? [];
  const email = emailQ.data ?? [];
  const sms = smsQ.data ?? [];

  return (
    <AdminLayout title="Notification Analytics">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notification analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Push, email, and SMS delivery across all super-app events.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
              <TabsList>
                <TabsTrigger value="24h">24h</TabsTrigger>
                <TabsTrigger value="7d">7 days</TabsTrigger>
                <TabsTrigger value="30d">30 days</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button size="sm" onClick={sendTest} disabled={testing}>
              <Send className={cn("h-3.5 w-3.5 mr-1.5", testing && "animate-pulse")} />
              {testing ? "Sending…" : "Send test"}
            </Button>
          </div>
        </div>

        {diagnostics && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Provider configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(
                  [
                    ["FCM (Android)", diagnostics.fcm],
                    ["APNs (iOS)", diagnostics.apns],
                    ["VAPID (Web)", diagnostics.vapid],
                    ["Resend (Email)", diagnostics.resend],
                    ["Twilio (SMS)", diagnostics.twilio],
                  ] as const
                ).map(([label, ok]) => (
                  <div
                    key={label}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                      ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5",
                    )}
                  >
                    {ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    )}
                    <span className="font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChannelKpi icon={Bell} label="Push" rows={push} tone="from-violet-500/15 to-violet-400/5 text-violet-500" />
          <ChannelKpi icon={Mail} label="Email" rows={email} tone="from-sky-500/15 to-sky-400/5 text-sky-500" />
          <ChannelKpi icon={MessageSquare} label="SMS" rows={sms} tone="from-emerald-500/15 to-emerald-400/5 text-emerald-500" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Delivery over time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={buildTrend(range, push, email, sms)}>
                  <defs>
                    <linearGradient id="pushG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(263, 70%, 60%)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(263, 70%, 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="emailG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="smsG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="push" stroke="hsl(263, 70%, 60%)" fill="url(#pushG)" />
                  <Area type="monotone" dataKey="email" stroke="hsl(217, 91%, 60%)" fill="url(#emailG)" />
                  <Area type="monotone" dataKey="sms" stroke="hsl(142, 71%, 45%)" fill="url(#smsG)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TopEvents title="Top push events" rows={push} keyOf={(r) => r.notification_type} />
          <TopEvents title="Top email templates" rows={email} keyOf={(r) => r.template_name} />
        </div>
      </div>
    </AdminLayout>
  );
}

function ChannelKpi({
  icon: Icon,
  label,
  rows,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  rows: LogRow[];
  tone: string;
}) {
  const total = rows.length;
  const sent = rows.filter((r) => r.status === "sent").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const pending = rows.filter((r) => r.status === "pending" || r.status === "queued").length;
  const rate = total === 0 ? 0 : Math.round((sent / total) * 1000) / 10;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center", tone)}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {total.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {sent.toLocaleString()} sent
          </span>
          {failed > 0 && (
            <span className="flex items-center gap-1.5 text-rose-600">
              <XCircle className="h-3.5 w-3.5" />
              {failed.toLocaleString()}
            </span>
          )}
          {pending > 0 && (
            <span className="flex items-center gap-1.5 text-amber-600">
              <Clock className="h-3.5 w-3.5" />
              {pending.toLocaleString()}
            </span>
          )}
        </div>
        <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
            style={{ width: `${rate}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {rate}% delivery rate
        </p>
      </CardContent>
    </Card>
  );
}

function TopEvents({
  title,
  rows,
  keyOf,
}: {
  title: string;
  rows: LogRow[];
  keyOf: (r: LogRow) => string | null | undefined;
}) {
  const grouped = useMemo(() => {
    const m = new Map<string, { sent: number; failed: number; total: number }>();
    for (const r of rows) {
      const k = keyOf(r) || "(unknown)";
      const cur = m.get(k) ?? { sent: 0, failed: 0, total: 0 };
      cur.total += 1;
      if (r.status === "sent") cur.sent += 1;
      if (r.status === "failed") cur.failed += 1;
      m.set(k, cur);
    }
    return [...m.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 12);
  }, [rows, keyOf]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No data in range</p>
        ) : (
          <div className="space-y-1.5">
            {grouped.map(([k, v]) => {
              const rate = v.total === 0 ? 0 : Math.round((v.sent / v.total) * 100);
              return (
                <div key={k} className="flex items-center gap-3 text-sm py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[12px] truncate">{k}</p>
                    <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          rate >= 95 ? "bg-emerald-500" : rate >= 80 ? "bg-amber-500" : "bg-rose-500",
                        )}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant="secondary" className="tabular-nums shrink-0">
                    {v.total}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Build a per-bucket time series. Bucket size adapts to range.
function buildTrend(range: Range, push: LogRow[], email: LogRow[], sms: LogRow[]) {
  const bucketHours = range === "24h" ? 1 : range === "7d" ? 6 : 24;
  const now = Date.now();
  const totalHours = RANGE_HOURS[range];
  const buckets: { ts: number; bucket: string; push: number; email: number; sms: number }[] = [];
  for (let h = totalHours; h > 0; h -= bucketHours) {
    const ts = now - h * 3_600_000;
    buckets.push({
      ts,
      bucket:
        range === "24h"
          ? new Date(ts).toLocaleTimeString([], { hour: "2-digit" })
          : new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" }),
      push: 0,
      email: 0,
      sms: 0,
    });
  }
  const fillBucket = (rows: LogRow[], key: "push" | "email" | "sms") => {
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      for (let i = buckets.length - 1; i >= 0; i--) {
        if (t >= buckets[i].ts) {
          buckets[i][key] += 1;
          break;
        }
      }
    }
  };
  fillBucket(push, "push");
  fillBucket(email, "email");
  fillBucket(sms, "sms");
  return buckets;
}
