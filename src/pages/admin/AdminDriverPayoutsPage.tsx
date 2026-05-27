import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ban, CheckCircle2, Copy, Loader2, Search, WalletCards } from "lucide-react";
import { formatBakongBillId } from "@/lib/khqr";

type DriverPayoutTab = "manual" | "stripe" | "resolved" | "all";
type PayoutDecision = "manual_paid" | "stripe_paid" | "waived";

interface DriverPayoutRow {
  id: string;
  driver_id: string;
  ride_request_id: string | null;
  earning_type: string;
  base_amount: number;
  platform_fee: number | null;
  net_amount: number;
  currency: string;
  payment_method: string | null;
  payout_status: string;
  payout_reference: string | null;
  description: string | null;
  created_at: string;
  driver?: {
    user_id: string | null;
    full_name: string | null;
    phone: string | null;
    vehicle_type: string | null;
    vehicle_model: string | null;
    vehicle_plate: string | null;
  } | null;
  ride_request?: {
    id: string;
    customer_name: string | null;
    customer_phone: string | null;
    pickup_address: string | null;
    dropoff_address: string | null;
    bakong_reference: string | null;
    bakong_amount_khr: number | null;
    payment_status: string | null;
    payment_currency: string | null;
    completed_at: string | null;
    created_at: string | null;
  } | null;
}

interface DriverPayoutMethod {
  id: string;
  user_id: string;
  method_type: string;
  label: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  aba_account_id: string | null;
  is_default: boolean | null;
  is_verified: boolean | null;
  verification_status?: string | null;
}

const statusColors: Record<string, string> = {
  manual_pending: "bg-amber-500/15 text-amber-700",
  stripe_pending: "bg-sky-500/15 text-sky-700",
  manual_paid: "bg-emerald-500/15 text-emerald-700",
  stripe_paid: "bg-emerald-500/15 text-emerald-700",
  cash_collected: "bg-muted text-muted-foreground",
  waived: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/15 text-amber-700",
};

function formatAmount(amount: number, currency: string) {
  const resolvedCurrency = String(currency || "USD").toUpperCase();
  if (resolvedCurrency === "KHR") return `${Math.round(Number(amount || 0)).toLocaleString("en-US")} KHR`;
  return `$${Number(amount || 0).toFixed(2)}`;
}

function shortId(id: string | null | undefined) {
  return id ? id.slice(0, 8) : "-";
}

function humanStatus(status: string) {
  return String(status || "pending").replaceAll("_", " ");
}

function statusesForTab(tab: DriverPayoutTab) {
  if (tab === "manual") return ["manual_pending"];
  if (tab === "stripe") return ["stripe_pending"];
  if (tab === "resolved") return ["manual_paid", "stripe_paid", "cash_collected", "waived"];
  return [];
}

export default function AdminDriverPayoutsPage() {
  const [tab, setTab] = useState<DriverPayoutTab>("manual");
  const [items, setItems] = useState<DriverPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DriverPayoutRow | null>(null);
  const [payoutMethodsByUser, setPayoutMethodsByUser] = useState<Record<string, DriverPayoutMethod[]>>({});
  const [search, setSearch] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    let query = (supabase.from("driver_earnings") as any)
      .select(`
        id, driver_id, ride_request_id, earning_type, base_amount, platform_fee, net_amount,
        currency, payment_method, payout_status, payout_reference, description, created_at,
        driver:drivers(user_id, full_name, phone, vehicle_type, vehicle_model, vehicle_plate),
        ride_request:ride_requests(id, customer_name, customer_phone, pickup_address, dropoff_address, bakong_reference, bakong_amount_khr, payment_status, payment_currency, completed_at, created_at)
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    const statuses = statusesForTab(tab);
    if (statuses.length > 0) query = query.in("payout_status", statuses);

    const { data, error } = await query;
    if (error) {
      toast.error(error.message || "Could not load driver payouts");
      setItems([]);
      setPayoutMethodsByUser({});
    } else {
      const rows = ((data as DriverPayoutRow[]) || []);
      setItems(rows);

      const userIds = Array.from(new Set(rows.map((row) => row.driver?.user_id).filter(Boolean))) as string[];
      if (userIds.length > 0) {
        const { data: methods, error: methodsError } = await (supabase.from("customer_payout_methods") as any)
          .select("id, user_id, method_type, label, bank_name, account_number, account_holder_name, aba_account_id, is_default, is_verified, verification_status")
          .in("user_id", userIds)
          .is("store_id", null)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });

        if (methodsError) {
          console.warn("[AdminDriverPayoutsPage] payout method load failed", methodsError);
          setPayoutMethodsByUser({});
        } else {
          const grouped = ((methods as DriverPayoutMethod[]) || []).reduce<Record<string, DriverPayoutMethod[]>>((acc, method) => {
            acc[method.user_id] = acc[method.user_id] || [];
            acc[method.user_id].push(method);
            return acc;
          }, {});
          setPayoutMethodsByUser(grouped);
        }
      } else {
        setPayoutMethodsByUser({});
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [tab]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const currency = String(item.currency || "USD").toUpperCase();
        if (currency === "KHR") acc.khr += Number(item.net_amount || 0);
        else acc.usd += Number(item.net_amount || 0);
        return acc;
      },
      { khr: 0, usd: 0 },
    );
  }, [items]);

  const searchQuery = search.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter((item) => {
      const billId = formatBakongBillId(item.ride_request?.bakong_reference);
      return [
        item.id,
        item.ride_request_id,
        shortId(item.ride_request_id),
        item.driver?.full_name,
        item.driver?.phone,
        item.driver?.vehicle_plate,
        item.ride_request?.customer_name,
        item.ride_request?.customer_phone,
        item.ride_request?.pickup_address,
        item.ride_request?.dropoff_address,
        item.payout_status,
        item.payout_reference,
        item.ride_request?.bakong_reference,
        billId,
      ].some((value) => String(value || "").toLowerCase().includes(searchQuery));
    });
  }, [items, searchQuery]);

  const openDrawer = (row: DriverPayoutRow) => {
    setSelected(row);
    setReference(row.payout_reference || row.ride_request?.bakong_reference || "");
    setNotes("");
  };

  const closeDrawer = () => {
    setSelected(null);
    setReference("");
    setNotes("");
  };

  const resolvePayout = async (decision: PayoutDecision) => {
    if (!selected) return;
    const preferredAbaMethod = decision === "manual_paid" && selected.driver?.user_id
      ? (payoutMethodsByUser[selected.driver.user_id] || []).find((method) => method.method_type === "aba")
      : null;

    setBusy(true);
    const { data, error } = await supabase.functions.invoke("resolve-driver-earning-payout", {
      body: {
        earning_id: selected.id,
        decision,
        reference,
        notes,
        payout_method_id: preferredAbaMethod?.id ?? null,
      },
    });
    setBusy(false);

    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Could not update payout");
      return;
    }

    toast.success(decision === "waived" ? "Driver payout closed" : `Payout recorded: ${(data as any)?.display_amount || formatAmount(selected.net_amount, selected.currency)}`);
    if ((data as any)?.payout_method_warning) {
      toast.warning((data as any).payout_method_warning);
    } else if ((data as any)?.payout_method_verified_id) {
      toast.success("Driver ABA payout account verified");
    }
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

  const selectedCurrency = String(selected?.currency || "USD").toUpperCase();
  const selectedPayoutMethods = selected?.driver?.user_id ? payoutMethodsByUser[selected.driver.user_id] || [] : [];
  const selectedRideBillId = selected ? formatBakongBillId(selected.ride_request?.bakong_reference) : null;
  const selectedPaymentReference = selected?.payout_reference || selected?.ride_request?.bakong_reference || "";
  const canResolveManual = selected && selectedCurrency === "KHR" && ["manual_pending", "pending"].includes(selected.payout_status);
  const canResolveStripe = selected && selectedCurrency === "USD" && selected.payout_status === "stripe_pending";
  const canWaive = selected && ["manual_pending", "stripe_pending", "pending"].includes(selected.payout_status);

  return (
    <AdminLayout title="Driver Payouts">
      <div className="max-w-6xl space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Driver payout queue</h2>
            <p className="text-sm text-muted-foreground">Track Bakong manual payouts and card payout handoffs for completed rides.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <WalletCards className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Rows</p>
            <p className="text-2xl font-bold">{searchQuery ? `${filteredItems.length}/${items.length}` : items.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">KHR owed</p>
            <p className="text-2xl font-bold">{formatAmount(totals.khr, "KHR")}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">USD owed</p>
            <p className="text-2xl font-bold">{formatAmount(totals.usd, "USD")}</p>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as DriverPayoutTab)}>
          <TabsList>
            <TabsTrigger value="manual">Bakong</TabsTrigger>
            <TabsTrigger value="stripe">Stripe</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search driver, customer, ride, Bill ID, or full ref"
                className="pl-9"
              />
            </div>
            <Card className="overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">{searchQuery ? "No driver payouts match your search" : "No driver payouts in this queue"}</div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredItems.map((item) => {
                    const driverMethods = item.driver?.user_id ? payoutMethodsByUser[item.driver.user_id] || [] : [];
                    const preferredMethod = driverMethods[0];
                    const rideBillId = formatBakongBillId(item.ride_request?.bakong_reference);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => openDrawer(item)}
                        className="w-full text-left p-4 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-sm font-semibold">{formatAmount(item.net_amount, item.currency)}</span>
                              <Badge className={statusColors[item.payout_status] || "bg-muted"}>{humanStatus(item.payout_status)}</Badge>
                              <Badge variant="secondary">{String(item.payment_method || "card").replaceAll("_", " ")}</Badge>
                              {preferredMethod && <Badge variant="outline">{preferredMethod.method_type === "aba" ? "ABA saved" : "Payout method saved"}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.driver?.full_name || "Unknown driver"} - Ride {shortId(item.ride_request_id)} - {new Date(item.created_at).toLocaleString()}
                            </p>
                            <p className="text-xs text-foreground/80 mt-1 truncate">
                              Gross {formatAmount(item.base_amount, item.currency)} - Fee {formatAmount(Number(item.platform_fee || 0), item.currency)} - Bill {rideBillId || "missing"}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground sm:text-right">
                            {preferredMethod?.method_type === "aba"
                              ? `ABA ${preferredMethod.aba_account_id || ""}`
                              : preferredMethod?.account_number
                                ? `${preferredMethod.bank_name || "Bank"} ...${preferredMethod.account_number.slice(-4)}`
                                : item.driver?.vehicle_plate || item.driver?.phone || ""}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && closeDrawer()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Driver payout</SheetTitle>
          </SheetHeader>

          {selected && (
            <div className="space-y-4 mt-4">
              <Card className="p-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Net payout</span><span className="font-semibold">{formatAmount(selected.net_amount, selected.currency)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Gross fare</span><span>{formatAmount(selected.base_amount, selected.currency)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Platform fee</span><span>{formatAmount(Number(selected.platform_fee || 0), selected.currency)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Status</span><Badge className={statusColors[selected.payout_status] || "bg-muted"}>{humanStatus(selected.payout_status)}</Badge></div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Ride bill ID</span>
                  <button
                    type="button"
                    onClick={() => void copyPaymentValue(selectedRideBillId, "Ride bill ID")}
                    className="flex items-center gap-1 text-foreground hover:text-primary"
                  >
                    <code className="text-xs font-semibold">{selectedRideBillId || "missing"}</code>
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Full ref</span>
                  <button
                    type="button"
                    onClick={() => void copyPaymentValue(selectedPaymentReference, "Full reference")}
                    className="flex min-w-0 items-center justify-end gap-1 text-foreground hover:text-primary"
                  >
                    <code className="text-xs text-right break-all">{selectedPaymentReference || "missing"}</code>
                    <Copy className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </div>
              </Card>

              <Card className="p-4 space-y-2 text-xs">
                <div className="font-semibold text-sm mb-1">Driver</div>
                <div><span className="text-muted-foreground">Name:</span> {selected.driver?.full_name || "Unknown"}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selected.driver?.phone || "-"}</div>
                <div><span className="text-muted-foreground">Vehicle:</span> {[selected.driver?.vehicle_type, selected.driver?.vehicle_model, selected.driver?.vehicle_plate].filter(Boolean).join(" - ") || "-"}</div>
              </Card>

              <Card className="p-4 space-y-2 text-xs">
                <div className="font-semibold text-sm mb-1">Saved payout method</div>
                {selectedPayoutMethods.length === 0 ? (
                  <p className="text-muted-foreground">No personal payout method saved by this driver.</p>
                ) : (
                  selectedPayoutMethods.map((method) => (
                    <div key={method.id} className="rounded-md border border-border/60 p-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{method.label || (method.method_type === "aba" ? "ABA Account" : "Bank Account")}</span>
                        <Badge variant={method.is_verified || method.verification_status === "verified" ? "default" : "outline"}>{method.verification_status || (method.is_verified ? "verified" : "pending")}</Badge>
                      </div>
                      <div><span className="text-muted-foreground">Holder:</span> {method.account_holder_name || "-"}</div>
                      {method.method_type === "aba" ? (
                        <div><span className="text-muted-foreground">ABA ID / phone:</span> {method.aba_account_id || "-"}</div>
                      ) : (
                        <div><span className="text-muted-foreground">Bank:</span> {method.bank_name || "-"} {method.account_number ? `...${method.account_number.slice(-4)}` : ""}</div>
                      )}
                      {canResolveManual && method.method_type === "aba" && !(method.is_verified || method.verification_status === "verified") && (
                        <div className="text-muted-foreground">This account will be marked verified when the payout is recorded.</div>
                      )}
                    </div>
                  ))
                )}
              </Card>

              <Card className="p-4 space-y-2 text-xs">
                <div className="font-semibold text-sm mb-1">Ride</div>
                <div><span className="text-muted-foreground">Customer:</span> {selected.ride_request?.customer_name || "Unknown"} {selected.ride_request?.customer_phone ? `(${selected.ride_request.customer_phone})` : ""}</div>
                <div><span className="text-muted-foreground">Pickup:</span> {selected.ride_request?.pickup_address || "-"}</div>
                <div><span className="text-muted-foreground">Dropoff:</span> {selected.ride_request?.dropoff_address || "-"}</div>
                <div><span className="text-muted-foreground">Completed:</span> {selected.ride_request?.completed_at ? new Date(selected.ride_request.completed_at).toLocaleString() : "-"}</div>
              </Card>

              {(canResolveManual || canResolveStripe || canWaive) ? (
                <Card className="p-4 space-y-3">
                  <div className="space-y-2">
                    <Label>{canResolveManual ? "ABA payout reference" : "Payout reference"}</Label>
                    <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID, ABA note, or transfer reference" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal payout notes..." />
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    {canResolveManual && (
                      <Button onClick={() => resolvePayout("manual_paid")} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600">
                        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Mark Bakong payout paid
                      </Button>
                    )}
                    {canResolveStripe && (
                      <Button onClick={() => resolvePayout("stripe_paid")} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600">
                        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Mark Stripe payout paid
                      </Button>
                    )}
                    {canWaive && (
                      <Button onClick={() => resolvePayout("waived")} disabled={busy} variant="outline">
                        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
                        Close without payout
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="p-4 text-xs space-y-1">
                  <div><span className="text-muted-foreground">Status:</span> {humanStatus(selected.payout_status)}</div>
                  {selected.payout_reference && <div><span className="text-muted-foreground">Reference:</span> <code>{selected.payout_reference}</code></div>}
                  {selected.description && <div className="pt-2 border-t border-border/30 whitespace-pre-wrap">{selected.description}</div>}
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
