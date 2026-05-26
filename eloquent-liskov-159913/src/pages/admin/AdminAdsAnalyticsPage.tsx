import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";

type Range = 7 | 30 | 90;

export default function AdminAdsAnalyticsPage() {
  const [range, setRange] = useState<Range>(30);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - range * 86400_000).toISOString();
      const [c, e] = await Promise.all([
        supabase.from("ad_campaigns").select("*").gte("created_at", since),
        supabase.from("conversion_events").select("*").gte("sent_at", since).order("sent_at", { ascending: false }).limit(200),
      ]);
      setCampaigns(c.data ?? []);
      setConversions(e.data ?? []);
      setLoading(false);
    })();
  }, [range]);

  const metrics = useMemo(() => {
    const byPlatform: Record<string, { spend: number; conversions: number; revenue: number }> = {
      google: { spend: 0, conversions: 0, revenue: 0 },
      meta: { spend: 0, conversions: 0, revenue: 0 },
    };
    campaigns.forEach((c) => {
      const p = (c.platform ?? "google").toLowerCase();
      if (!byPlatform[p]) byPlatform[p] = { spend: 0, conversions: 0, revenue: 0 };
      byPlatform[p].spend += c.total_spend_cents ?? 0;
      byPlatform[p].conversions += c.conversions ?? 0;
    });
    conversions.forEach((e) => {
      const p = (e.source ?? "google").toLowerCase();
      if (!byPlatform[p]) byPlatform[p] = { spend: 0, conversions: 0, revenue: 0 };
      byPlatform[p].revenue += Number(e.value ?? 0) * 100;
    });
    const totals = Object.values(byPlatform).reduce(
      (a, b) => ({ spend: a.spend + b.spend, conversions: a.conversions + b.conversions, revenue: a.revenue + b.revenue }),
      { spend: 0, conversions: 0, revenue: 0 },
    );
    const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
    const cpt = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
    return { byPlatform, totals, roas, cpt };
  }, [campaigns, conversions]);

  const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const exportCsv = () => {
    const header = "sent_at,event_name,source,value,external_id\n";
    const rows = conversions.map((e) => `${e.sent_at},${e.event_name},${e.source},${e.value ?? 0},${e.external_id ?? ""}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ads-analytics-${range}d.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container max-w-6xl py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ads Analytics</h1>
          <p className="text-sm text-muted-foreground">Unified Google + Meta performance & revenue attribution.</p>
        </div>
        <div className="flex gap-2 items-center">
          {[7, 30, 90].map((r) => (
            <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r as Range)}>
              {r}d
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={exportCsv} className="gap-2"><Download className="w-4 h-4" />CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Spend</div><div className="text-2xl font-bold">{fmtUsd(metrics.totals.spend)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Revenue</div><div className="text-2xl font-bold">{fmtUsd(metrics.totals.revenue)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">ROAS</div><div className="text-2xl font-bold">{metrics.roas.toFixed(2)}x</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Conversions</div><div className="text-2xl font-bold">{metrics.totals.conversions}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Cost / Trip</div><div className="text-2xl font-bold">{fmtUsd(metrics.cpt)}</div></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {Object.entries(metrics.byPlatform).map(([p, m]) => (
          <Card key={p}>
            <CardHeader className="pb-2"><CardTitle className="capitalize text-base">{p}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-sm">
              <div><div className="text-xs text-muted-foreground">Spend</div><div className="font-semibold">{fmtUsd(m.spend)}</div></div>
              <div><div className="text-xs text-muted-foreground">Revenue</div><div className="font-semibold">{fmtUsd(m.revenue)}</div></div>
              <div><div className="text-xs text-muted-foreground">Conversions</div><div className="font-semibold">{m.conversions}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent conversion events</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Time</TableHead><TableHead>Event</TableHead><TableHead>Source</TableHead><TableHead>Value</TableHead><TableHead>Ride</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>}
              {!loading && conversions.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">No conversion events in this period.</TableCell></TableRow>}
              {conversions.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.sent_at ?? e.created_at).toLocaleString()}</TableCell>
                  <TableCell>{e.event_name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{e.source}</Badge></TableCell>
                  <TableCell>${Number(e.value ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-xs">{e.external_id ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
