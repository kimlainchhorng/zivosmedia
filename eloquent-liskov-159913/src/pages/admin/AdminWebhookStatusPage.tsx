import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Copy, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const WEBHOOK_URL = "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/stripe-ride-webhook";

export default function AdminWebhookStatusPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [mismatches, setMismatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [eventsRes, ridesRes] = await Promise.all([
      supabase.from("webhook_events").select("*").order("received_at", { ascending: false }).limit(50),
      supabase
        .from("ride_requests")
        .select("id, payment_status, stripe_payment_intent_id, created_at")
        .not("stripe_payment_intent_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    setEvents(eventsRes.data ?? []);

    const counts: Record<string, number> = {};
    (ridesRes.data ?? []).forEach((r: any) => {
      const k = r.payment_status ?? "unknown";
      counts[k] = (counts[k] ?? 0) + 1;
    });
    setStatusCounts(counts);

    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const mm = (ridesRes.data ?? []).filter((r: any) => {
      const created = new Date(r.created_at).getTime();
      return created < fiveMinAgo && (!r.payment_status || r.payment_status === "pending");
    });
    setMismatches(mm.slice(0, 20));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const copyUrl = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    toast.success("Webhook URL copied");
  };

  return (
    <div className="container max-w-6xl py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Stripe Webhook Status</h1>
        <p className="text-sm text-muted-foreground">Monitor PaymentIntent webhook deliveries and ride payment sync.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Setup</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">Register this endpoint in <strong>Stripe Dashboard → Developers → Webhooks → Add endpoint</strong>:</div>
          <div className="flex gap-2">
            <code className="flex-1 p-2 rounded bg-muted text-xs break-all">{WEBHOOK_URL}</code>
            <Button size="sm" variant="outline" onClick={copyUrl}><Copy className="w-4 h-4" /></Button>
          </div>
          <div className="text-sm">Select events:</div>
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
            <li>payment_intent.succeeded</li>
            <li>payment_intent.payment_failed</li>
            <li>payment_intent.canceled</li>
            <li>payment_intent.amount_capturable_updated</li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(statusCounts).map(([k, v]) => (
          <Card key={k}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase">{k}</div>
              <div className="text-2xl font-bold">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mismatches.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertCircle className="w-4 h-4 text-amber-500" />Mismatch alerts ({mismatches.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">Rides with PaymentIntent but no webhook update &gt;5min old.</div>
            <div className="space-y-1 text-sm font-mono">
              {mismatches.map((r) => <div key={r.id}>{r.id.slice(0, 8)} · {r.stripe_payment_intent_id?.slice(0, 16)}…</div>)}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Last 50 webhook events</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Time</TableHead><TableHead>Event</TableHead><TableHead>Ride</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={4}>Loading…</TableCell></TableRow>}
              {!loading && events.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground">No webhook events yet. Register the endpoint in Stripe.</TableCell></TableRow>}
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.received_at).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{e.event_type}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{e.ride_request_id ? e.ride_request_id.slice(0, 8) : "—"}</TableCell>
                  <TableCell className="text-xs">{e.status ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
