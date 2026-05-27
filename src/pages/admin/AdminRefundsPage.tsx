import { useEffect, useMemo, useState } from "react";
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
import { Ban, CheckCircle2, Copy, Loader2, Search } from "lucide-react";
import { formatBakongBillId } from "@/lib/khqr";

const USD_TO_KHR = 4062.5;

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

interface ManualBakongRefund {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  pickup_address: string;
  dropoff_address: string;
  payment_amount: number | null;
  payment_currency: string | null;
  payment_status: string | null;
  refund_status: string | null;
  refunded_at: string | null;
  bakong_reference: string | null;
  bakong_amount_khr: number | null;
  cancel_fee_cents: number | null;
  cancelled_at: string | null;
  created_at: string;
  admin_notes: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  processed: "bg-emerald-500/15 text-emerald-600",
  denied: "bg-destructive/15 text-destructive",
  manual_refund_pending: "bg-amber-500/15 text-amber-600",
  manual_refunded: "bg-emerald-500/15 text-emerald-600",
  no_refund_due: "bg-muted text-muted-foreground",
};

function formatUsdCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatKhr(amount: number) {
  return `${Math.round(amount).toLocaleString("en-US")} KHR`;
}

function manualRefundMath(ride: ManualBakongRefund) {
  const paidKhr = Math.max(0, Math.round(Number(ride.bakong_amount_khr ?? ride.payment_amount ?? 0)));
  const feeKhr = Math.min(paidKhr, Math.round((Number(ride.cancel_fee_cents || 0) / 100) * USD_TO_KHR));
  return {
    paidKhr,
    feeKhr,
    refundKhr: Math.max(0, paidKhr - feeKhr),
  };
}

export default function AdminRefundsPage() {
  const [tab, setTab] = useState<string>("pending");
  const [items, setItems] = useState<RefundReq[]>([]);
  const [manualItems, setManualItems] = useState<ManualBakongRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RefundReq | null>(null);
  const [selectedManual, setSelectedManual] = useState<ManualBakongRefund | null>(null);
  const [rideContext, setRideContext] = useState<any>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);

  const load = async () => {
    setLoading(true);

    let refundQuery = supabase
      .from("ride_refund_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (tab !== "all") refundQuery = refundQuery.eq("status", tab);

    const manualStatuses =
      tab === "pending"
        ? ["manual_refund_pending"]
        : tab === "processed"
          ? ["manual_refunded", "no_refund_due"]
          : tab === "all"
            ? ["manual_refund_pending", "manual_refunded", "no_refund_due"]
            : [];

    const manualQuery = manualStatuses.length
      ? supabase
          .from("ride_requests")
          .select("id, customer_name, customer_phone, pickup_address, dropoff_address, payment_amount, payment_currency, payment_status, refund_status, refunded_at, bakong_reference, bakong_amount_khr, cancel_fee_cents, cancelled_at, created_at, admin_notes")
          .in("refund_status", manualStatuses)
          .order("cancelled_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] });

    const [{ data: refundData }, { data: manualData }] = await Promise.all([refundQuery, manualQuery]);
    setItems((refundData as any) || []);
    setManualItems((manualData as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [tab]);

  const closeDrawer = () => {
    setSelected(null);
    setSelectedManual(null);
    setRideContext(null);
  };

  const openDrawer = async (r: RefundReq) => {
    setSelectedManual(null);
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

  const openManualDrawer = (ride: ManualBakongRefund) => {
    setSelected(null);
    setRideContext(null);
    setManualNotes("");
    setSelectedManual(ride);
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
    closeDrawer();
    void load();
  };

  const resolveManual = async (decision: "refunded" | "no_refund_due") => {
    if (!selectedManual) return;
    setManualBusy(true);
    const { data, error } = await supabase.functions.invoke("resolve-bakong-ride-refund", {
      body: {
        ride_request_id: selectedManual.id,
        decision,
        notes: manualNotes,
      },
    });
    setManualBusy(false);

    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }

    const amount = Number((data as any)?.refund_amount_khr ?? manualRefundMath(selectedManual).refundKhr);
    toast.success(decision === "refunded" ? `Marked ${formatKhr(amount)} refunded` : "Manual refund closed");
    closeDrawer();
    void load();
  };

  const copyPaymentValue = async (value: string | null | undefined, label: string) => {
    const text = String(value || "").trim();
    if (!text) {
      toast.info(`${label} is missing`);
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const searchQuery = search.trim().toLowerCase();
  const filteredManualItems = useMemo(() => {
    if (!searchQuery) return manualItems;
    return manualItems.filter((ride) => {
      const billId = formatBakongBillId(ride.bakong_reference);
      return [
        ride.id,
        ride.id.slice(0, 8),
        ride.customer_name,
        ride.customer_phone,
        ride.pickup_address,
        ride.dropoff_address,
        ride.refund_status,
        ride.bakong_reference,
        billId,
      ].some((value) => String(value || "").toLowerCase().includes(searchQuery));
    });
  }, [manualItems, searchQuery]);
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter((request) => [
      request.id,
      request.ride_request_id,
      request.ride_request_id.slice(0, 8),
      request.reason_category,
      request.description,
      request.status,
      request.stripe_refund_id,
    ].some((value) => String(value || "").toLowerCase().includes(searchQuery)));
  }, [items, searchQuery]);
  const hasRows = filteredManualItems.length > 0 || filteredItems.length > 0;
  const selectedManualMath = selectedManual ? manualRefundMath(selectedManual) : null;
  const selectedManualBillId = selectedManual ? formatBakongBillId(selectedManual.bakong_reference) : null;

  return (
    <AdminLayout title="Refund Requests">
      <div className="max-w-6xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Ride refund requests</h2>
          <p className="text-sm text-muted-foreground">Review Stripe refund requests and close manual Bakong KHQR refunds for cancelled rides.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="processed">Processed</TabsTrigger>
            <TabsTrigger value="denied">Denied</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ride, customer, phone, Bill ID, or full ref"
                className="pl-9"
              />
            </div>
            <Card className="overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-sm text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
              ) : !hasRows ? (
                <div className="p-12 text-center text-sm text-muted-foreground">{searchQuery ? "No refund requests match your search" : "No refund requests"}</div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredManualItems.map((r) => {
                    const math = manualRefundMath(r);
                    const created = r.cancelled_at || r.created_at;
                    const billId = formatBakongBillId(r.bakong_reference);
                    return (
                      <button type="button" key={`manual-${r.id}`} onClick={() => openManualDrawer(r)} className="w-full text-left p-4 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-sm font-semibold">{formatKhr(math.refundKhr)}</span>
                              <Badge className="bg-sky-500/15 text-sky-700">Bakong manual</Badge>
                              <Badge className={statusColors[r.refund_status || ""] || "bg-muted"}>{(r.refund_status || "pending").replaceAll("_", " ")}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">Ride {r.id.slice(0, 8)} - {new Date(created).toLocaleString()}</p>
                            <p className="text-xs text-foreground/80 mt-1 truncate">
                              Paid {formatKhr(math.paidKhr)} - Fee kept {formatKhr(math.feeKhr)} - Bill {billId || "missing"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredItems.map((r) => (
                    <button type="button" key={r.id} onClick={() => openDrawer(r)} className="w-full text-left p-4 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold">{formatUsdCents(r.requested_amount_cents)}</span>
                            <Badge className={statusColors[r.status] || "bg-muted"}>{r.status}</Badge>
                            <span className="text-xs text-muted-foreground capitalize">{r.reason_category.replace("_", " ")}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">Ride {r.ride_request_id.slice(0, 8)} - {new Date(r.created_at).toLocaleString()}</p>
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

      <Sheet open={!!selected || !!selectedManual} onOpenChange={(open) => !open && closeDrawer()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{selectedManual ? "Bakong manual refund" : "Refund request"}</SheetTitle></SheetHeader>

          {selectedManual && selectedManualMath && (
            <div className="space-y-4 mt-4">
              <Card className="p-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Refund due</span><span className="font-semibold">{formatKhr(selectedManualMath.refundKhr)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Paid</span><span>{formatKhr(selectedManualMath.paidKhr)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Cancellation fee</span><span>{formatKhr(selectedManualMath.feeKhr)}</span></div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Bill ID</span>
                  <button
                    type="button"
                    onClick={() => void copyPaymentValue(selectedManualBillId, "Bill ID")}
                    className="flex items-center gap-1 text-foreground hover:text-primary"
                  >
                    <code className="text-xs font-semibold">{selectedManualBillId || "missing"}</code>
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Full ref</span>
                  <button
                    type="button"
                    onClick={() => void copyPaymentValue(selectedManual.bakong_reference, "Full reference")}
                    className="flex min-w-0 items-center justify-end gap-1 text-foreground hover:text-primary"
                  >
                    <code className="text-xs text-right break-all">{selectedManual.bakong_reference || "missing"}</code>
                    <Copy className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </div>
              </Card>

              <Card className="p-4 space-y-2 text-xs">
                <div className="font-semibold text-sm mb-1">Ride context</div>
                <div><span className="text-muted-foreground">Customer:</span> {selectedManual.customer_name || "Unknown"} {selectedManual.customer_phone ? `(${selectedManual.customer_phone})` : ""}</div>
                <div><span className="text-muted-foreground">Pickup:</span> {selectedManual.pickup_address}</div>
                <div><span className="text-muted-foreground">Dropoff:</span> {selectedManual.dropoff_address}</div>
                <div><span className="text-muted-foreground">Cancelled:</span> {selectedManual.cancelled_at ? new Date(selectedManual.cancelled_at).toLocaleString() : "Unknown"}</div>
                <div><span className="text-muted-foreground">Status:</span> {(selectedManual.refund_status || "pending").replaceAll("_", " ")}</div>
              </Card>

              {selectedManual.refund_status === "manual_refund_pending" ? (
                <Card className="p-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea rows={3} value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Manual payout reference, customer contact, or internal notes..." />
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <Button onClick={() => resolveManual("refunded")} disabled={manualBusy} className="bg-emerald-500 hover:bg-emerald-600">
                      {manualBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Mark refunded
                    </Button>
                    <Button onClick={() => resolveManual("no_refund_due")} disabled={manualBusy} variant="outline">
                      {manualBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
                      No refund due
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-4 text-xs space-y-1">
                  <div><span className="text-muted-foreground">Status:</span> {(selectedManual.refund_status || "resolved").replaceAll("_", " ")}</div>
                  {selectedManual.refunded_at && <div><span className="text-muted-foreground">Resolved:</span> {new Date(selectedManual.refunded_at).toLocaleString()}</div>}
                  {selectedManual.admin_notes && <div className="pt-2 border-t border-border/30 whitespace-pre-wrap">{selectedManual.admin_notes}</div>}
                </Card>
              )}
            </div>
          )}

          {selected && (
            <div className="space-y-4 mt-4">
              <Card className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Requested</span><span className="font-semibold">{formatUsdCents(selected.requested_amount_cents)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Reason</span><span className="capitalize">{selected.reason_category.replace("_", " ")}</span></div>
                {selected.description && <div className="text-xs text-foreground/80 pt-2 border-t border-border/30">{selected.description}</div>}
              </Card>

              {rideContext && (
                <Card className="p-4 space-y-2 text-xs">
                  <div className="font-semibold text-sm mb-1">Ride context</div>
                  <div><span className="text-muted-foreground">Pickup:</span> {rideContext.pickup_address}</div>
                  <div><span className="text-muted-foreground">Dropoff:</span> {rideContext.dropoff_address}</div>
                  <div><span className="text-muted-foreground">Captured:</span> {formatUsdCents(rideContext.captured_amount_cents ?? 0)}</div>
                  <div><span className="text-muted-foreground">Payment Intent:</span> <code>{rideContext.payment_intent_id || rideContext.stripe_payment_intent_id || "-"}</code></div>
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
                      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Approve full ({formatUsdCents(selected.requested_amount_cents)})
                    </Button>
                    <Button onClick={() => decide("partial")} disabled={busy} variant="outline">Approve partial (${approveAmount})</Button>
                    <Button onClick={() => decide("deny")} disabled={busy} variant="destructive">
                      <Ban className="w-4 h-4 mr-2" />
                      Deny
                    </Button>
                  </div>
                </Card>
              )}

              {selected.status !== "pending" && (
                <Card className="p-4 text-xs space-y-1">
                  <div><span className="text-muted-foreground">Status:</span> {selected.status}</div>
                  {selected.approved_amount_cents != null && <div><span className="text-muted-foreground">Approved:</span> {formatUsdCents(selected.approved_amount_cents)}</div>}
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
