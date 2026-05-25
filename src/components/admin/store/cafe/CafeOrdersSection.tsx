/**
 * CafeOrdersSection — full ticket list with status filter, payment, and
 * counter-style "new order" flow. The KDS tab is a narrower view focused on
 * preparing/ready tickets.
 */
import { useMemo, useState } from "react";
import {
  ClipboardList, Plus, Loader2, ArrowRight, X, Receipt, Banknote,
  CreditCard, QrCode as QrIcon, Wallet, Coffee, Download, Printer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCafeOrders, type CafeOrderStatus, type NewOrderItemDraft, type CafePayment } from "@/hooks/cafe/useCafeOrders";
import { useCafeMenu } from "@/hooks/cafe/useCafeMenu";
import { useCafeTables } from "@/hooks/cafe/useCafeTables";
import { useCafeSettings } from "@/hooks/cafe/useCafeSettings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props { storeId: string }

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const STATUS_OPTIONS: Array<{ value: CafeOrderStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "served", label: "Served" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_FLOW: Partial<Record<CafeOrderStatus, CafeOrderStatus>> = {
  pending: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "served",
  served: "completed",
};

const statusBadgeClass = (s: CafeOrderStatus) => {
  switch (s) {
    case "pending": return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300";
    case "accepted": return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
    case "preparing": return "bg-orange-500/15 text-orange-700 dark:text-orange-300";
    case "ready": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "served": return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
    case "completed": return "bg-muted text-muted-foreground";
    case "cancelled":
    case "refunded": return "bg-destructive/15 text-destructive";
  }
};

export default function CafeOrdersSection({ storeId }: Props) {
  const { orders, itemsByOrder, modifiersByItem, paymentsByOrder, loading, createOrder, setStatus, cancelOrder, addPayment, refundPayment, removeOrderItem } = useCafeOrders(storeId);
  const { items: menuItems, modifiers, links, categories } = useCafeMenu(storeId);
  const { tables } = useCafeTables(storeId);
  const { settings: cafeSettings, validateManagerPin } = useCafeSettings(storeId);

  const [filter, setFilter] = useState<CafeOrderStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newDialog, setNewDialog] = useState(false);
  const [payDialog, setPayDialog] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });
  const [refundDialog, setRefundDialog] = useState<{ open: boolean; paymentId: string | null; max: number; existing: number; method: string }>({ open: false, paymentId: null, max: 0, existing: 0, method: "" });
  const [refundAmount, setRefundAmount] = useState("");
  const [pinDialog, setPinDialog] = useState<{ open: boolean; pending: null | (() => void) }>({ open: false, pending: null });
  const [pinInput, setPinInput] = useState("");
  const [pinChecking, setPinChecking] = useState(false);

  // Gate that runs `fn` immediately if no PIN required, otherwise prompts.
  const gateWithPin = (fn: () => void) => {
    if (!cafeSettings.require_pin_for_refund || !cafeSettings.manager_pin_hash) { fn(); return; }
    setPinInput("");
    setPinDialog({ open: true, pending: fn });
  };

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const selected = selectedId ? orders.find((o) => o.id === selectedId) ?? null : null;

  // Escape a value for CSV (quote + double internal quotes when needed).
  const csvCell = (value: unknown) => {
    if (value == null) return "";
    const s = String(value);
    if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
      return `"${s.replace(/"/g, "\"\"")}"`;
    }
    return s;
  };

  const exportCsv = () => {
    const header = [
      "ticket", "placed_at", "status", "channel", "table",
      "customer", "items", "subtotal", "discount", "tax", "tip", "total", "paid",
    ];
    const rows = filtered.map((o) => {
      const items = (itemsByOrder[o.id] ?? [])
        .map((it) => `${it.quantity}× ${it.item_name}`)
        .join(" | ");
      const tableLabel = "—";
      return [
        o.ticket_number,
        new Date(o.placed_at).toISOString(),
        o.status,
        o.channel,
        tableLabel,
        o.customer_name ?? "",
        items,
        (o.subtotal_cents / 100).toFixed(2),
        (o.discount_cents / 100).toFixed(2),
        (o.tax_cents / 100).toFixed(2),
        (o.tip_cents / 100).toFixed(2),
        (o.total_cents / 100).toFixed(2),
        (o.paid_cents / 100).toFixed(2),
      ];
    });
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cafe-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} order${rows.length === 1 ? "" : "s"} exported.`);
  };

  // === New order draft ===
  const [draftItems, setDraftItems] = useState<NewOrderItemDraft[]>([]);
  const [draftTableId, setDraftTableId] = useState<string>("");
  const [draftCustomerName, setDraftCustomerName] = useState("");
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const filteredMenu = useMemo(() => menuItems.filter((m) => m.is_active && (!activeCatId || m.category_id === activeCatId)), [menuItems, activeCatId]);

  const draftTotal = useMemo(
    () => draftItems.reduce((acc, it) => acc + it.unit_price_cents * it.quantity, 0),
    [draftItems],
  );

  const addToDraft = (menuItemId: string) => {
    const item = menuItems.find((m) => m.id === menuItemId);
    if (!item) return;
    setDraftItems((prev) => {
      const existing = prev.find((p) => p.menu_item_id === menuItemId && (p.modifier_ids?.length ?? 0) === 0);
      if (existing) {
        return prev.map((p) => p === existing ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { menu_item_id: item.id, item_name: item.name, unit_price_cents: item.price_cents, quantity: 1, modifier_ids: [] }];
    });
  };

  const handleSubmitOrder = async () => {
    if (draftItems.length === 0) return;
    const order = await createOrder({
      channel: draftTableId ? "qr_table" : "counter",
      table_id: draftTableId || null,
      customer_name: draftCustomerName.trim() || null,
      items: draftItems,
    });
    if (order) {
      toast.success(`Ticket #${order.ticket_number} sent to kitchen.`);
      setNewDialog(false);
      setDraftItems([]); setDraftTableId(""); setDraftCustomerName("");
    }
  };

  // === Pay ===
  const [payMethod, setPayMethod] = useState<CafePayment["method"]>("cash");
  const [payAmount, setPayAmount] = useState("");
  const [payTip, setPayTip] = useState("");

  const openPay = (orderId: string) => {
    const o = orders.find((x) => x.id === orderId);
    if (!o) return;
    setPayMethod("cash");
    setPayAmount(((o.total_cents - o.paid_cents) / 100).toFixed(2));
    setPayTip("");
    setPayDialog({ open: true, orderId });
  };

  const submitPayment = async () => {
    if (!payDialog.orderId) return;
    const cents = Math.round(parseFloat(payAmount || "0") * 100);
    const tip = Math.round(parseFloat(payTip || "0") * 100);
    if (cents <= 0) return;
    await addPayment(payDialog.orderId, { method: payMethod, amount_cents: cents, tip_cents: tip });
    toast.success("Payment recorded.");
    setPayDialog({ open: false, orderId: null });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Orders</span>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as CafeOrderStatus | "all")}>
                <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0} title="Export current view as CSV" className="h-8">
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
              <Button size="sm" onClick={() => { setDraftItems([]); setActiveCatId(categories[0]?.id ?? null); setNewDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> New order
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No tickets in this view.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((o) => {
                const next = STATUS_FLOW[o.status];
                const tableLabel = o.table_id ? tables.find((t) => t.id === o.table_id)?.label : null;
                return (
                  <li key={o.id} className="py-2.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button type="button" onClick={() => setSelectedId(o.id === selectedId ? null : o.id)} className="font-mono text-xs text-muted-foreground hover:text-foreground">
                        #{o.ticket_number}
                      </button>
                      <Badge className={cn("text-[10px] uppercase font-semibold", statusBadgeClass(o.status))}>{o.status}</Badge>
                      {o.scheduled_for && (
                        <Badge variant="outline" className="text-[10px] gap-1 bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30">
                          📅 {new Date(o.scheduled_for).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </Badge>
                      )}
                      <span className="text-sm truncate min-w-0 flex-1">{o.customer_name || (tableLabel ? `Table ${tableLabel}` : o.channel.replace("_", " "))}</span>
                      <span className="tabular-nums text-sm font-medium shrink-0">{fmt(o.total_cents)}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{new Date(o.placed_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                      {next && (
                        <Button size="sm" variant="outline" onClick={() => setStatus(o.id, next)} className="h-7 text-[11px]">
                          {next} <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                      {(o.total_cents > o.paid_cents) && o.status !== "cancelled" && (
                        <Button size="sm" onClick={() => openPay(o.id)} className="h-7 text-[11px]">Pay</Button>
                      )}
                      <a
                        href={`/cafe/kitchen-ticket/${o.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Print kitchen ticket"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={`/cafe/receipt/${o.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Receipt"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                      </a>
                      {!["completed", "cancelled", "refunded"].includes(o.status) && (
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-destructive" onClick={() => { if (confirm("Cancel this order?")) cancelOrder(o.id, "owner_cancel"); }}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    {selectedId === o.id && (
                      <div className="mt-2 ml-2 rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-2">
                        {(() => {
                          const canEdit = !["completed", "cancelled", "refunded"].includes(o.status);
                          const lines = itemsByOrder[o.id] ?? [];
                          return lines.map((it) => (
                            <div key={it.id}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex-1 min-w-0">
                                  <span className="text-muted-foreground">{it.quantity}×</span> {it.item_name}
                                </span>
                                <span className="tabular-nums">{fmt(it.line_total_cents)}</span>
                                {canEdit && lines.length > 1 && (
                                  <Button
                                    size="icon" variant="ghost"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    title="Remove item"
                                    onClick={async () => {
                                      if (!confirm(`Remove ${it.quantity}× ${it.item_name}?`)) return;
                                      const res = await removeOrderItem(o.id, it.id);
                                      if (res.ok) toast.success("Item removed.");
                                      else toast.error(res.error ?? "Couldn't remove item.");
                                    }}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                              {(modifiersByItem[it.id] ?? []).length > 0 && (
                                <p className="text-[11px] text-muted-foreground pl-5">
                                  {(modifiersByItem[it.id] ?? []).map((m) => m.modifier_name).join(" · ")}
                                </p>
                              )}
                              {it.notes && <p className="text-[11px] italic text-muted-foreground pl-5">"{it.notes}"</p>}
                            </div>
                          ));
                        })()}
                        <div className="border-t border-border/60 pt-2 flex items-center justify-between">
                          <span className="text-muted-foreground">Paid</span>
                          <span className="tabular-nums">{fmt(o.paid_cents)} / {fmt(o.total_cents)}</span>
                        </div>
                        {(paymentsByOrder[o.id] ?? []).length > 0 && (
                          <div className="text-[11px] text-muted-foreground space-y-1">
                            {(paymentsByOrder[o.id] ?? []).map((p) => {
                              const remaining = p.amount_cents - p.refunded_cents;
                              const fullyRefunded = remaining <= 0;
                              return (
                                <div key={p.id} className="flex items-center justify-between gap-2">
                                  <span className="uppercase tracking-wide">{p.method}</span>
                                  <span className="flex items-center gap-2">
                                    <span className="tabular-nums">
                                      {fmt(remaining)}
                                      {p.refunded_cents > 0 && <span className="text-destructive ml-1">(−{fmt(p.refunded_cents)})</span>}
                                      {p.tip_cents ? ` + ${fmt(p.tip_cents)} tip` : ""}
                                    </span>
                                    {!fullyRefunded && (
                                      <Button
                                        size="sm" variant="ghost"
                                        className="h-6 text-[10px] text-destructive hover:text-destructive"
                                        onClick={() => gateWithPin(() => {
                                          setRefundAmount((remaining / 100).toFixed(2));
                                          setRefundDialog({ open: true, paymentId: p.id, max: remaining, existing: p.refunded_cents, method: p.method });
                                        })}
                                      >Refund</Button>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* New order dialog — counter POS */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>New order</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-[60vh]">
            <div className="md:col-span-2 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {categories.length > 0 && (
                  <Button size="sm" variant={activeCatId === null ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setActiveCatId(null)}>All</Button>
                )}
                {categories.map((c) => (
                  <Button key={c.id} size="sm" variant={activeCatId === c.id ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setActiveCatId(c.id)}>{c.name}</Button>
                ))}
              </div>
              {filteredMenu.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No items in this category.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredMenu.map((m) => (
                    <button key={m.id} type="button" onClick={() => addToDraft(m.id)} className="rounded-lg border border-border bg-card p-3 text-left hover:bg-muted transition-colors">
                      <p className="font-medium text-sm truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{fmt(m.price_cents)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border bg-card p-3 flex flex-col">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Ticket</div>
              <div className="flex-1 overflow-y-auto">
                {draftItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">Tap items on the left to add them.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {draftItems.map((d, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-2">
                        <span className="flex-1 min-w-0 truncate">{d.item_name}</span>
                        <Input
                          type="number" min={1} max={99}
                          value={d.quantity}
                          onChange={(e) => {
                            const q = Math.max(1, Math.min(99, parseInt(e.target.value || "1", 10)));
                            setDraftItems((p) => p.map((x, i) => i === idx ? { ...x, quantity: q } : x));
                          }}
                          className="h-7 w-14 text-xs"
                        />
                        <span className="tabular-nums shrink-0 w-14 text-right">{fmt(d.unit_price_cents * d.quantity)}</span>
                        <button type="button" className="text-destructive shrink-0" onClick={() => setDraftItems((p) => p.filter((_, i) => i !== idx))}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="border-t border-border/60 pt-2 mt-2 space-y-2">
                <div className="flex items-center justify-between font-semibold text-sm">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{fmt(draftTotal)}</span>
                </div>
                <Input placeholder="Customer name (optional)" value={draftCustomerName} onChange={(e) => setDraftCustomerName(e.target.value)} className="h-8 text-xs" />
                {tables.length > 0 && (
                  <Select value={draftTableId} onValueChange={setDraftTableId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="No table" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No table</SelectItem>
                      {tables.filter((t) => t.is_active).map((t) => <SelectItem key={t.id} value={t.id}>Table {t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitOrder} disabled={draftItems.length === 0}>Send to kitchen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={payDialog.open} onOpenChange={(v) => setPayDialog((d) => ({ ...d, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Take payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {([
                { v: "cash", label: "Cash", Icon: Banknote },
                { v: "card", label: "Card", Icon: CreditCard },
                { v: "qr", label: "QR", Icon: QrIcon },
                { v: "wallet", label: "Wallet", Icon: Wallet },
              ] as const).map(({ v, label, Icon }) => (
                <button key={v} type="button" onClick={() => setPayMethod(v)} className={cn(
                  "rounded-lg border p-3 flex flex-col items-center gap-1 transition-colors",
                  payMethod === v ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted",
                )}>
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Amount ($)</label>
                <Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tip ($)</label>
                <Input type="number" step="0.01" value={payTip} onChange={(e) => setPayTip(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayDialog({ open: false, orderId: null })}>Cancel</Button>
            <Button onClick={submitPayment}>Record payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manager PIN gate */}
      <Dialog open={pinDialog.open} onOpenChange={(v) => { if (!v) setPinDialog({ open: false, pending: null }); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Manager PIN</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Enter the manager PIN to continue.</p>
            <Input
              type="password" inputMode="numeric" autoFocus
              maxLength={8}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/[^\d]/g, ""))}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  setPinChecking(true);
                  const ok = await validateManagerPin(pinInput);
                  setPinChecking(false);
                  if (!ok) { toast.error("Incorrect PIN."); return; }
                  const fn = pinDialog.pending;
                  setPinDialog({ open: false, pending: null });
                  fn?.();
                }
              }}
              className="h-9 text-center text-lg font-mono tracking-widest"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPinDialog({ open: false, pending: null })}>Cancel</Button>
            <Button
              onClick={async () => {
                setPinChecking(true);
                const ok = await validateManagerPin(pinInput);
                setPinChecking(false);
                if (!ok) { toast.error("Incorrect PIN."); return; }
                const fn = pinDialog.pending;
                setPinDialog({ open: false, pending: null });
                fn?.();
              }}
              disabled={pinChecking || !pinInput}
            >
              {pinChecking && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund dialog */}
      <Dialog open={refundDialog.open} onOpenChange={(v) => setRefundDialog((d) => ({ ...d, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refund payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="uppercase font-semibold text-foreground">{refundDialog.method}</span> · refundable up to{" "}
              <span className="font-semibold text-foreground tabular-nums">{fmt(refundDialog.max)}</span>
              {refundDialog.existing > 0 && (
                <span className="text-[11px] block">{fmt(refundDialog.existing)} already refunded.</span>
              )}
            </p>
            <div>
              <label className="text-xs text-muted-foreground">Amount to refund ($)</label>
              <Input
                type="number" step="0.01" min="0"
                max={(refundDialog.max / 100).toString()}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Recorded against the original payment. Cash refunds happen at the till; card/QR refunds need to be issued through your processor too.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefundDialog({ open: false, paymentId: null, max: 0, existing: 0, method: "" })}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!refundDialog.paymentId) return;
                const cents = Math.round(parseFloat(refundAmount || "0") * 100);
                if (!cents || cents <= 0) { toast.error("Refund amount required."); return; }
                if (cents > refundDialog.max) { toast.error("Refund exceeds remaining payment."); return; }
                // The hook tracks cumulative refunded_cents; pass existing + new.
                await refundPayment(refundDialog.paymentId, refundDialog.existing + cents);
                toast.success(`${fmt(cents)} refunded.`);
                setRefundDialog({ open: false, paymentId: null, max: 0, existing: 0, method: "" });
                setRefundAmount("");
              }}
            >Refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
