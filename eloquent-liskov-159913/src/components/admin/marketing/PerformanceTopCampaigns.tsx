/**
 * PerformanceTopCampaigns — sortable, channel-filterable top performers table.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "revenue" | "roas" | "ctr" | "conversions";
type Channel = "all" | "ads" | "marketing";

export interface CampaignRow {
  id: string;
  name: string;
  channel: "ads" | "marketing";
  revenueCents: number;
  spendCents: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface Props {
  storeId: string;
  fromIso: string;
}

export default function PerformanceTopCampaigns({ storeId, fromIso }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [channel, setChannel] = useState<Channel>("all");

  const { data: rows = [], isLoading } = useQuery<CampaignRow[]>({
    queryKey: ["perf-top-campaigns", storeId, fromIso],
    enabled: !!storeId,
    staleTime: 60_000,
    queryFn: async () => {
      const [adsRes, mktRes, eventsRes] = await Promise.all([
        supabase
          .from("store_ad_campaigns" as any)
          .select("id, name")
          .eq("store_id", storeId)
          .limit(50),
        supabase
          .from("marketing_campaigns" as any)
          .select("id, name, campaign_type")
          .limit(50),
        supabase
          .from("ads_studio_events")
          .select("creative_id, event_type, revenue_cents, created_at")
          .eq("store_id", storeId)
          .gte("created_at", fromIso)
          .limit(5000),
      ]);

      const ads = ((adsRes.data as any[]) || []).map((c) => {
        const events = ((eventsRes.data as any[]) || []).filter(
          (e) => e.creative_id === c.id
        );
        const impressions = events.filter((e) => e.event_type === "impression").length;
        const clicks = events.filter((e) => e.event_type === "click").length;
        const conversions = events.filter((e) => e.event_type === "purchase").length;
        const revenueCents = events
          .filter((e) => e.event_type === "purchase")
          .reduce((s, e) => s + (e.revenue_cents || 0), 0);
        return {
          id: c.id,
          name: c.name || "Untitled",
          channel: "ads" as const,
          revenueCents,
          spendCents: 0,
          impressions,
          clicks,
          conversions,
        };
      });

      const mkt = ((mktRes.data as any[]) || []).map((c) => ({
        id: c.id,
        name: c.name || "Untitled",
        channel: "marketing" as const,
        revenueCents: 0,
        spendCents: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      }));

      return [...ads, ...mkt];
    },
  });

  const filtered = useMemo(() => {
    const f = channel === "all" ? rows : rows.filter((r) => r.channel === channel);
    const sorted = [...f].sort((a, b) => {
      const av =
        sortKey === "revenue"
          ? a.revenueCents
          : sortKey === "roas"
          ? a.spendCents > 0
            ? a.revenueCents / a.spendCents
            : 0
          : sortKey === "ctr"
          ? a.impressions > 0
            ? a.clicks / a.impressions
            : 0
          : a.conversions;
      const bv =
        sortKey === "revenue"
          ? b.revenueCents
          : sortKey === "roas"
          ? b.spendCents > 0
            ? b.revenueCents / b.spendCents
            : 0
          : sortKey === "ctr"
          ? b.impressions > 0
            ? b.clicks / b.impressions
            : 0
          : b.conversions;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return sorted.slice(0, 10);
  }, [rows, channel, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? (
      <ArrowUpDown className="w-3 h-3 inline opacity-40" />
    ) : sortDir === "desc" ? (
      <ArrowDown className="w-3 h-3 inline" />
    ) : (
      <ArrowUp className="w-3 h-3 inline" />
    );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm">Top campaigns</CardTitle>
          <div className="flex items-center gap-1">
            {(["all", "ads", "marketing"] as Channel[]).map((c) => (
              <Button
                key={c}
                size="sm"
                variant={channel === c ? "default" : "outline"}
                className="h-6 px-2 text-[10px] capitalize"
                onClick={() => setChannel(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No campaigns in this range
          </div>
        ) : (
          <div className="overflow-x-auto -mx-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left font-medium px-3 py-1.5">Campaign</th>
                  <th
                    className="text-right font-medium px-2 py-1.5 cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("revenue")}
                  >
                    Revenue <SortIcon k="revenue" />
                  </th>
                  <th
                    className="text-right font-medium px-2 py-1.5 cursor-pointer hover:text-foreground hidden sm:table-cell"
                    onClick={() => toggleSort("roas")}
                  >
                    ROAS <SortIcon k="roas" />
                  </th>
                  <th
                    className="text-right font-medium px-2 py-1.5 cursor-pointer hover:text-foreground hidden md:table-cell"
                    onClick={() => toggleSort("ctr")}
                  >
                    CTR <SortIcon k="ctr" />
                  </th>
                  <th
                    className="text-right font-medium px-3 py-1.5 cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("conversions")}
                  >
                    Conv <SortIcon k="conversions" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const roas = r.spendCents > 0 ? r.revenueCents / r.spendCents : 0;
                  const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              r.channel === "ads" ? "bg-primary" : "bg-emerald-500"
                            )}
                          />
                          <span className="truncate font-medium max-w-[160px]">
                            {r.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold">
                        ${(r.revenueCents / 100).toFixed(0)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums hidden sm:table-cell">
                        {roas.toFixed(2)}x
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums hidden md:table-cell">
                        {ctr.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.conversions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
