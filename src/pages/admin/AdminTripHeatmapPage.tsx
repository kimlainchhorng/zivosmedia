/**
 * AdminTripHeatmapPage — Trip density and cancellation hotspots
 */
import { useEffect, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Flame } from "lucide-react";

export default function AdminTripHeatmapPage() {
  const [days, setDays] = useState(7);
  const [buckets, setBuckets] = useState<{ lat: number; lng: number; completed: number; cancelled: number }[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      const { data } = await (supabase as any).from("ride_requests")
        .select("pickup_lat, pickup_lng, status")
        .gte("created_at", since)
        .not("pickup_lat", "is", null)
        .limit(2000);
      const map = new Map<string, { lat: number; lng: number; completed: number; cancelled: number }>();
      (data || []).forEach((r: any) => {
        const lat = Math.round(r.pickup_lat * 1000) / 1000;
        const lng = Math.round(r.pickup_lng * 1000) / 1000;
        const key = `${lat},${lng}`;
        const b = map.get(key) || { lat, lng, completed: 0, cancelled: 0 };
        if (r.status === "completed") b.completed++;
        else if (r.status === "cancelled") b.cancelled++;
        map.set(key, b);
      });
      setBuckets(Array.from(map.values()).sort((a, b) => (b.completed + b.cancelled) - (a.completed + a.cancelled)));
    })();
  }, [days]);

  return (
    <AppLayout title="Trip Heatmap" showBack hideNav>
      <div className="p-4 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2"><Flame className="h-5 w-5 text-primary" /> Operational Hotspots</h1>
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <TabsList><TabsTrigger value="7">7d</TabsTrigger><TabsTrigger value="30">30d</TabsTrigger></TabsList>
          </Tabs>
        </div>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-3">{buckets.length} location buckets · last {days} days</p>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {buckets.slice(0, 50).map((b, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border border-border/40 text-sm">
                <span className="font-mono text-xs">{b.lat.toFixed(3)}, {b.lng.toFixed(3)}</span>
                <div className="flex gap-3">
                  <span className="text-emerald-500">✓ {b.completed}</span>
                  <span className="text-destructive">✕ {b.cancelled}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
