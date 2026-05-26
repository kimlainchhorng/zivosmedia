/**
 * AdminDriverModerationPage — Review low ratings, abuse reports, and active driver flags
 */
import { useEffect, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Ban, Clock, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const FLAG_DURATIONS = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
  { label: "Permanent", hours: null },
];

export default function AdminDriverModerationPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [lowRatings, setLowRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [r, f, lr] = await Promise.all([
      (supabase as any).from("abuse_reports").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("driver_flags").select("*, drivers(full_name, phone)").eq("active", true).order("created_at", { ascending: false }),
      (supabase as any).from("ride_requests").select("id, assigned_driver_id, drivers(full_name)").lte("driver_rating" as any, 2).order("created_at", { ascending: false }).limit(50),
    ]);
    setReports(r.data || []);
    setFlags(f.data || []);
    setLowRatings(lr.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flagDriver = async (driverId: string, hours: number | null, reason: string, reportId?: string) => {
    const flagged_until = hours ? new Date(Date.now() + hours * 3600_000).toISOString() : null;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("driver_flags").insert({
      driver_id: driverId,
      reason,
      flagged_by: user?.id,
      flagged_until,
      related_report_id: reportId,
    });
    if (error) return toast.error(error.message);
    toast.success(`Driver flagged ${hours ? `for ${hours}h` : "permanently"}`);
    load();
  };

  const dismissReport = async (reportId: string) => {
    await (supabase as any).from("abuse_reports").update({ status: "dismissed", resolved_at: new Date().toISOString() }).eq("id", reportId);
    toast.success("Report dismissed");
    load();
  };

  const unflag = async (flagId: string) => {
    await (supabase as any).from("driver_flags").update({ active: false }).eq("id", flagId);
    toast.success("Flag removed");
    load();
  };

  return (
    <AppLayout title="Driver Moderation" showBack hideNav>
      <div className="p-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Driver Safety & Moderation</h1>
        </div>

        <Tabs defaultValue="reports">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
            <TabsTrigger value="ratings">Low Ratings ({lowRatings.length})</TabsTrigger>
            <TabsTrigger value="flags">Active Flags ({flags.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-3 mt-4">
            {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
            {!loading && reports.length === 0 && <p className="text-muted-foreground text-sm">No open reports.</p>}
            {reports.map((r) => (
              <Card key={r.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="destructive" className="mb-1">{r.category}</Badge>
                    <p className="text-sm">{r.description || "No description"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => dismissReport(r.id)}>Dismiss</Button>
                  {r.reported_driver_id && FLAG_DURATIONS.map(d => (
                    <Button key={d.label} size="sm" variant="destructive"
                      onClick={() => flagDriver(r.reported_driver_id, d.hours, `Report: ${r.category}`, r.id)}>
                      <Ban className="h-3 w-3 mr-1" /> {d.label}
                    </Button>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="ratings" className="space-y-3 mt-4">
            {lowRatings.map((rr: any) => (
              <Card key={rr.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{rr.drivers?.full_name || "Driver"}</p>
                    <p className="text-xs text-muted-foreground">Trip {rr.id.slice(0, 8)}</p>
                  </div>
                  <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Low rating</Badge>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="flags" className="space-y-3 mt-4">
            {flags.map((f: any) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{f.drivers?.full_name || "Driver"}</p>
                    <p className="text-xs text-muted-foreground">{f.reason}</p>
                    <p className="text-xs flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {f.flagged_until ? `Until ${new Date(f.flagged_until).toLocaleString()}` : "Permanent"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => unflag(f.id)}>Unflag</Button>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
