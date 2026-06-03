import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, CheckCircle2, Download, RadioTower, Send, XCircle } from "lucide-react";

type Range = 7 | 30 | 90;
type JsonRecord = Record<string, unknown>;

type CampaignRow = {
  platform?: string | null;
  total_spend_cents?: number | null;
  conversions?: number | null;
};

type ConversionRow = {
  id: string;
  currency: string | null;
  event_name: string;
  external_id: string | null;
  payload: unknown;
  response: unknown;
  sent_at: string;
  source: string;
  status: string | null;
  value_cents: number | null;
};

type AnalyticsEventRow = {
  id: string;
  created_at: string | null;
  event_name: string;
  page: string | null;
  traffic_source: string | null;
  value: number | null;
  meta: unknown;
};

type PlatformMetrics = {
  spend: number;
  campaignConversions: number;
  providerEvents: number;
  revenue: number;
  failed: number;
  browserOnly: number;
};

type ReadinessItem = {
  label: string;
  detail: string;
  ready: boolean;
};

type TestEventStatus = {
  state: "idle" | "sending" | "sent" | "failed";
  message: string;
};

const PROVIDERS = [
  "google_ads",
  "meta",
  "tiktok_browser_pixel",
  "x_browser_pixel",
] as const;

function platformLabel(source: string): string {
  const labels: Record<string, string> = {
    google: "Google Ads",
    google_ads: "Google Ads",
    meta: "Meta",
    facebook: "Meta",
    tiktok_browser_pixel: "TikTok",
    x_browser_pixel: "X",
  };
  return labels[source.toLowerCase()] ?? source.replace(/_/g, " ");
}

function normalizeSource(source: string | null | undefined): string {
  const value = (source ?? "unknown").toLowerCase();
  if (value === "google") return "google_ads";
  if (value === "facebook") return "meta";
  return value;
}

function valueCents(row: ConversionRow): number {
  return Number(row.value_cents ?? 0);
}

function jsonSummary(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as JsonRecord;
  const message = record.message ?? record.error ?? record.reason ?? record.status;
  return typeof message === "string" ? message : "";
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function envReady(value: string | undefined, pattern?: RegExp): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.includes("...") || trimmed.startsWith("<")) return false;
  return pattern ? pattern.test(trimmed) : true;
}

export default function AdminAdsAnalyticsPage() {
  const [range, setRange] = useState<Range>(30);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [marketingEvents, setMarketingEvents] = useState<AnalyticsEventRow[]>([]);
  const [adsTxtReady, setAdsTxtReady] = useState<boolean | null>(null);
  const [testEventStatus, setTestEventStatus] = useState<TestEventStatus>({
    state: "idle",
    message: "Send a safe test lead to verify analytics insert and provider audit logging without firing real ad-platform conversions.",
  });
  const [loading, setLoading] = useState(true);

  const loadDiagnostics = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - range * 86400_000).toISOString();
    const [c, e, a] = await Promise.all([
      supabase.from("ad_campaigns").select("*").gte("created_at", since),
      supabase.from("conversion_events").select("*").gte("sent_at", since).order("sent_at", { ascending: false }).limit(200),
      supabase
        .from("analytics_events")
        .select("id,created_at,event_name,page,traffic_source,value,meta")
        .like("event_name", "marketing_%")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setCampaigns((c.data ?? []) as CampaignRow[]);
    setConversions((e.data ?? []) as ConversionRow[]);
    setMarketingEvents((a.data ?? []) as AnalyticsEventRow[]);
    setLoading(false);
  }, [range]);

  useEffect(() => {
    void loadDiagnostics();
  }, [loadDiagnostics]);

  useEffect(() => {
    let active = true;
    fetch("/ads.txt", { cache: "no-store" })
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        if (!active) return;
        setAdsTxtReady(
          /google\.com,\s*pub-\d{12,},\s*DIRECT,\s*f08c47fec0942fa0/i.test(text) &&
            !text.includes("pub-0000000000000000"),
        );
      })
      .catch(() => {
        if (active) setAdsTxtReady(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const byPlatform: Record<string, PlatformMetrics> = Object.fromEntries(
      PROVIDERS.map((provider) => [
        provider,
        {
          spend: 0,
          campaignConversions: 0,
          providerEvents: 0,
          revenue: 0,
          failed: 0,
          browserOnly: 0,
        },
      ]),
    );
    campaigns.forEach((c) => {
      const p = normalizeSource(c.platform);
      if (!byPlatform[p]) {
        byPlatform[p] = { spend: 0, campaignConversions: 0, providerEvents: 0, revenue: 0, failed: 0, browserOnly: 0 };
      }
      byPlatform[p].spend += c.total_spend_cents ?? 0;
      byPlatform[p].campaignConversions += c.conversions ?? 0;
    });
    conversions.forEach((e) => {
      const p = normalizeSource(e.source);
      if (!byPlatform[p]) {
        byPlatform[p] = { spend: 0, campaignConversions: 0, providerEvents: 0, revenue: 0, failed: 0, browserOnly: 0 };
      }
      byPlatform[p].providerEvents += 1;
      byPlatform[p].revenue += valueCents(e);
      if ((e.status ?? "").toLowerCase() === "failed") byPlatform[p].failed += 1;
      if ((e.status ?? "").toLowerCase() === "browser_only") byPlatform[p].browserOnly += 1;
    });
    const totals = Object.values(byPlatform).reduce(
      (a, b) => ({
        spend: a.spend + b.spend,
        campaignConversions: a.campaignConversions + b.campaignConversions,
        providerEvents: a.providerEvents + b.providerEvents,
        revenue: a.revenue + b.revenue,
        failed: a.failed + b.failed,
        browserOnly: a.browserOnly + b.browserOnly,
      }),
      { spend: 0, campaignConversions: 0, providerEvents: 0, revenue: 0, failed: 0, browserOnly: 0 },
    );
    const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
    const cpt = totals.campaignConversions > 0 ? totals.spend / totals.campaignConversions : 0;
    return { byPlatform, totals, roas, cpt };
  }, [campaigns, conversions]);

  const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const readiness = useMemo<ReadinessItem[]>(() => [
    {
      label: "Google Analytics",
      detail: "VITE_GOOGLE_ANALYTICS_ID",
      ready: envReady(import.meta.env.VITE_GOOGLE_ANALYTICS_ID, /^G-[A-Z0-9]+$/),
    },
    {
      label: "Google Ads Tag",
      detail: "VITE_GOOGLE_ADS_ID",
      ready: envReady(import.meta.env.VITE_GOOGLE_ADS_ID, /^AW-\d+$/),
    },
    {
      label: "Meta Pixel",
      detail: "VITE_META_PIXEL_ID",
      ready: envReady(import.meta.env.VITE_META_PIXEL_ID),
    },
    {
      label: "TikTok Pixel",
      detail: "VITE_TIKTOK_PIXEL_ID",
      ready: envReady(import.meta.env.VITE_TIKTOK_PIXEL_ID),
    },
    {
      label: "X Pixel",
      detail: "VITE_X_PIXEL_ID",
      ready: envReady(import.meta.env.VITE_X_PIXEL_ID),
    },
    {
      label: "AdSense Client",
      detail: "VITE_GOOGLE_ADSENSE_CLIENT",
      ready: envReady(import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT, /^ca-pub-\d+$/),
    },
    {
      label: "AdSense Slots",
      detail: "home, search, article placements",
      ready: envReady(import.meta.env.VITE_ADSENSE_SLOT_HOME_FEED, /^\d{5,}$/) &&
        envReady(import.meta.env.VITE_ADSENSE_SLOT_SEARCH_RESULTS, /^\d{5,}$/) &&
        envReady(import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_INLINE, /^\d{5,}$/),
    },
    {
      label: "ads.txt",
      detail: "public seller authorization",
      ready: adsTxtReady === true,
    },
  ], [adsTxtReady]);

  const readyCount = readiness.filter((item) => item.ready).length;

  const exportCsv = () => {
    const header = "sent_at,event_name,source,status,value_cents,currency,external_id,response\n";
    const rows = conversions
      .map((e) =>
        [
          e.sent_at,
          e.event_name,
          e.source,
          e.status ?? "",
          e.value_cents ?? 0,
          e.currency ?? "",
          e.external_id ?? "",
          jsonSummary(e.response),
        ].map(csvCell).join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ads-analytics-${range}d.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const sendTestEvent = async () => {
    const eventId = `admin-test-${Date.now()}`;
    setTestEventStatus({
      state: "sending",
      message: "Sending safe diagnostic lead through marketing-event-track...",
    });

    try {
      const { data, error } = await supabase.functions.invoke("marketing-event-track", {
        body: {
          event_name: "Lead",
          event_id: eventId,
          page: "/admin/ads/analytics",
          value: 0,
          currency: "USD",
          content_type: "diagnostic",
          content_id: "admin-marketing-pipeline-test",
          content_name: "Admin marketing pipeline test",
          source: "admin_diagnostics",
          external_id: eventId,
          meta: {
            diagnostic: true,
            triggered_from: "AdminAdsAnalyticsPage",
          },
        },
      });

      if (error) throw error;

      setTestEventStatus({
        state: "sent",
        message: `Test event sent. Analytics id: ${String((data as { analytics_event_id?: unknown } | null)?.analytics_event_id ?? "recorded")}`,
      });
      await loadDiagnostics();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test event failed";
      setTestEventStatus({
        state: "failed",
        message,
      });
    }
  };

  return (
    <div className="container max-w-6xl py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ads Analytics</h1>
          <p className="text-sm text-muted-foreground">Marketing diagnostics for Google, Meta, TikTok, X, and internal attribution.</p>
        </div>
        <div className="flex gap-2 items-center">
          {[7, 30, 90].map((r) => (
            <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r as Range)}>
              {r}d
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => void loadDiagnostics()}>
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} className="gap-2"><Download className="w-4 h-4" />CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Spend</div><div className="text-2xl font-bold">{fmtUsd(metrics.totals.spend)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Revenue</div><div className="text-2xl font-bold">{fmtUsd(metrics.totals.revenue)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">ROAS</div><div className="text-2xl font-bold">{metrics.roas.toFixed(2)}x</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Provider Events</div><div className="text-2xl font-bold">{metrics.totals.providerEvents}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Cost / Trip</div><div className="text-2xl font-bold">{fmtUsd(metrics.cpt)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Monetization Readiness</CardTitle>
            <Badge variant={readyCount === readiness.length ? "default" : "secondary"}>
              {readyCount}/{readiness.length} ready
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {readiness.map((item) => (
              <div key={item.label} className="flex items-start gap-2 rounded-md border p-3">
                {item.ready ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground break-words">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Pipeline Test</CardTitle>
            <Button
              size="sm"
              onClick={() => void sendTestEvent()}
              disabled={testEventStatus.state === "sending"}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {testEventStatus.state === "sending" ? "Sending" : "Send Test Lead"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 rounded-md border p-3 text-sm">
            {testEventStatus.state === "sent" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : testEventStatus.state === "failed" ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            ) : (
              <RadioTower className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            )}
            <div>
              <div className="font-medium">marketing-event-track diagnostic</div>
              <div className="text-muted-foreground">{testEventStatus.message}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><RadioTower className="h-5 w-5 text-blue-600" /><div><div className="text-xs text-muted-foreground uppercase">Internal Events</div><div className="text-2xl font-bold">{marketingEvents.length}</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><div className="text-xs text-muted-foreground uppercase">Sent / Audited</div><div className="text-2xl font-bold">{metrics.totals.providerEvents - metrics.totals.failed}</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Activity className="h-5 w-5 text-amber-600" /><div><div className="text-xs text-muted-foreground uppercase">Browser Only</div><div className="text-2xl font-bold">{metrics.totals.browserOnly}</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><XCircle className="h-5 w-5 text-red-600" /><div><div className="text-xs text-muted-foreground uppercase">Failed</div><div className="text-2xl font-bold">{metrics.totals.failed}</div></div></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        {Object.entries(metrics.byPlatform).map(([p, m]) => (
          <Card key={p}>
            <CardHeader className="pb-2"><CardTitle className="text-base">{platformLabel(p)}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-sm">
              <div><div className="text-xs text-muted-foreground">Spend</div><div className="font-semibold">{fmtUsd(m.spend)}</div></div>
              <div><div className="text-xs text-muted-foreground">Revenue</div><div className="font-semibold">{fmtUsd(m.revenue)}</div></div>
              <div><div className="text-xs text-muted-foreground">Events</div><div className="font-semibold">{m.providerEvents}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Provider Delivery Log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Time</TableHead><TableHead>Event</TableHead><TableHead>Provider</TableHead><TableHead>Status</TableHead><TableHead>Value</TableHead><TableHead>External ID</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>}
              {!loading && conversions.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">No conversion events in this period.</TableCell></TableRow>}
              {conversions.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.sent_at).toLocaleString()}</TableCell>
                  <TableCell>{e.event_name}</TableCell>
                  <TableCell><Badge variant="outline">{platformLabel(e.source)}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={(e.status ?? "").toLowerCase() === "failed" ? "destructive" : "secondary"}>
                      {e.status ?? "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>{fmtUsd(valueCents(e))}</TableCell>
                  <TableCell className="font-mono text-xs">{e.external_id ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Internal Marketing Events</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Time</TableHead><TableHead>Event</TableHead><TableHead>Page</TableHead><TableHead>Traffic Source</TableHead><TableHead>Value</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow>}
              {!loading && marketingEvents.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">No marketing analytics events in this period.</TableCell></TableRow>}
              {marketingEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-xs">{event.created_at ? new Date(event.created_at).toLocaleString() : "—"}</TableCell>
                  <TableCell>{event.event_name.replace(/^marketing_/, "")}</TableCell>
                  <TableCell className="text-xs">{event.page ?? "—"}</TableCell>
                  <TableCell>{event.traffic_source ?? "—"}</TableCell>
                  <TableCell>{event.value == null ? "—" : fmtUsd(Math.round(Number(event.value) * 100))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
