import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RefundReq {
  id: string;
  ride_request_id: string;
  requester_id: string;
  reason_category: string;
  description: string | null;
  requested_amount_cents: number;
  approved_amount_cents: number | null;
  status: string;
  created_at: string;
  decided_at: string | null;
  stripe_refund_id: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  processed: "bg-emerald-500/15 text-emerald-600",
  denied: "bg-destructive/15 text-destructive",
};

export default function AdminRefundsPage() {
  const [tab, setTab] = useState<string>("pending");
  const [items, setItems] = useState<RefundReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RefundReq | null>(null);
  const [rideContext, setRideContext] = useState<any>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("ride_refund_requests").select("*").order("created_at", { ascending: false }).limit(200);
    if (tab !== "all") q = q.eq("status", tab);
    const { data } = await q;
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const openDrawer = async (r: RefundReq) => {
    setSelected(r);
    setApproveAmount(((r.approved_amount_cents ?? r.requested_amount_cents) / 100).toFixed(2));
    setNotes("");
    const { data } = await supabase
      .from("ride_requests")
      .select("id, pickup_address, dropoff_address, captured_amount_cents, payment_amount, payment_intent_id, stripe_payment_intent_id, surcharge_amount_cents, completed_at, status")
      .eq("id", r.ride_request_id)
      .maybeSingle();
    setRideContext(data);
  };

  const decide = async (decision: "approve" | "partial" | "deny") => {
    if (!selected) return;
    setBusy(true);
    const body: any = { request_id: selected.id, decision, notes };
    if (decision === "partial") body.approved_amount_cents = Math.round(Number(approveAmount) * 100);
    const { data, error } = await supabase.functions.invoke("process-refund", { body });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }
    toast.success(decision === "deny" ? "Refund denied" : `Refund issued: ${(data as any).stripe_refund_id ?? "ok"}`);
    setSelected(null);
    load();
  };

  return (
    <AdminLayout title="Refund Requests">
      <div className="max-w-6xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Ride refund requests</h2>
          <p className="text-sm text-muted-foreground">Review, approve, or deny rider-initiated refunds. Approvals trigger a real Stripe refund.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="processed">Processed</TabsTrigger>
            <TabsTrigger value="denied">Denied</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            <Card className="overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-sm text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
              ) : items.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">No refund requests</div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((r) => (
                    <button type="button" key={r.id} onClick={() => openDrawer(r)} className="w-full text-left p-4 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold">${(r.requested_amount_cents / 100).toFixed(2)}</span>
                            <Badge className={statusColors[r.status] || "bg-muted"}>{r.status}</Badge>
                            <span className="text-xs text-muted-foreground capitalize">{r.reason_category.replace("_", " ")}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">Ride {r.ride_request_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}</p>
                          {r.description && <p className="text-xs text-foreground/80 mt-1 truncate">{r.description}</p>}
                        </div>
                        {r.stripe_refund_id && <code className="text-[10px] text-muted-foreground">{r.stripe_refund_id}</code>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Refund request</SheetTitle></SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              <Card className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Requested</span><span className="font-semibold">${(selected.requested_amount_cents / 100).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Reason</span><span className="capitalize">{selected.reason_category.replace("_", " ")}</span></div>
                {selected.description && <div className="text-xs text-foreground/80 pt-2 border-t border-border/30">{selected.description}</div>}
              </Card>

              {rideContext && (
                <Card className="p-4 space-y-2 text-xs">
                  <div className="font-semibold text-sm mb-1">Ride context</div>
                  <div><span className="text-muted-foreground">Pickup:</span> {rideContext.pickup_address}</div>
                  <div><span className="text-muted-foreground">Dropoff:</span> {rideContext.dropoff_address}</div>
                  <div><span className="text-muted-foreground">Captured:</span> ${((rideContext.captured_amount_cents ?? 0) / 100).toFixed(2)}</div>
                  <div><span className="text-muted-foreground">Payment Intent:</span> <code>{rideContext.payment_intent_id || rideContext.stripe_payment_intent_id || "—"}</code></div>
                </Card>
              )}

              {selected.status === "pending" && (
                <Card className="p-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Partial amount (USD)</Label>
                    <Input type="number" step="0.01" value={approveAmount} onChange={(e) => setApproveAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal/customer notes..." />
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <Button onClick={() => decide("approve")} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600">
                      {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Approve full (${(selected.requested_amount_cents / 100).toFixed(2)})
                    </Button>
                    <Button onClick={() => decide("partial")} disabled={busy} variant="outline">Approve partial (${approveAmount})</Button>
                    <Button onClick={() => decide("deny")} disabled={busy} variant="destructive">Deny</Button>
                  </div>
                </Card>
              )}

              {selected.status !== "pending" && (
                <Card className="p-4 text-xs space-y-1">
                  <div><span className="text-muted-foreground">Status:</span> {selected.status}</div>
                  {selected.approved_amount_cents != null && <div><span className="text-muted-foreground">Approved:</span> ${(selected.approved_amount_cents / 100).toFixed(2)}</div>}
                  {selected.stripe_refund_id && <div><span className="text-muted-foreground">Stripe Refund:</span> <code>{selected.stripe_refund_id}</code></div>}
                  {selected.decided_at && <div><span className="text-muted-foreground">Decided:</span> {new Date(selected.decided_at).toLocaleString()}</div>}
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
