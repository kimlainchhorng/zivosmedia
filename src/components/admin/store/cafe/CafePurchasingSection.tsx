/**
 * CafePurchasingSection — suppliers list + purchase orders with receive flow.
 * Receiving a line item auto-creates an inventory movement (via DB trigger),
 * which in turn updates on_hand_qty and the rolling weighted cost.
 */
import { useMemo, useState } from "react";
import {
  Truck, Plus, Loader2, Trash2, Building2, Phone, Mail, ChevronDown, ChevronRight,
  PackageCheck, X, Send, FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCafePurchasing, type CafeSupplierDraft, type CafePoStatus } from "@/hooks/cafe/useCafePurchasing";
import { useCafeInventory } from "@/hooks/cafe/useCafeInventory";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props { storeId: string }

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const STATUS_COLOR: Record<CafePoStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  partial: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  received: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-destructive/15 text-destructive",
};

const blankSupplier = (): CafeSupplierDraft => ({
  name: "", contact_name: null, phone: null, email: null, address: null, notes: null,
  payment_terms: null, lead_time_days: null, is_active: true,
});

interface NewPoLine {
  inventory_item_id: string;
  qty_ordered: number;
  unit_cost_cents: number;
}

export default function CafePurchasingSection({ storeId }: Props) {
  const purch = useCafePurchasing(storeId);
  const inv = useCafeInventory(storeId);

  // Supplier dialog
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [supplierDraft, setSupplierDraft] = useState<CafeSupplierDraft>(blankSupplier());
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  // New PO dialog
  const [poDialog, setPoDialog] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState<string>("");
  const [poExpected, setPoExpected] = useState<string>("");
  const [poNotes, setPoNotes] = useState("");
  const [poLines, setPoLines] = useState<NewPoLine[]>([]);

  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);

  // Receive dialog
  const [receiveDialog, setReceiveDialog] = useState<{ open: boolean; itemId: string | null }>({ open: false, itemId: null });
  const [receiveQty, setReceiveQty] = useState("");

  const stats = useMemo(() => {
    let openValue = 0, openCount = 0, totalSuppliers = purch.suppliers.length;
    for (const o of purch.orders) {
      if (o.status === "draft" || o.status === "sent" || o.status === "partial") {
        openValue += o.total_cents - 0;
        openCount++;
      }
    }
    return { openValue, openCount, totalSuppliers };
  }, [purch.orders, purch.suppliers]);

  // === Supplier handlers ===
  const submitSupplier = async () => {
    if (!supplierDraft.name.trim()) { toast.error("Name required."); return; }
    if (editingSupplierId) {
      await purch.updateSupplier(editingSupplierId, supplierDraft);
      toast.success("Saved.");
    } else {
      const c = await purch.createSupplier(supplierDraft);
      if (c) toast.success(`Added ${c.name}.`);
    }
    setSupplierDialog(false); setEditingSupplierId(null); setSupplierDraft(blankSupplier());
  };
  const openEditSupplier = (id: string) => {
    const s = purch.suppliers.find((x) => x.id === id);
    if (!s) return;
    setEditingSupplierId(id);
    setSupplierDraft({
      name: s.name, contact_name: s.contact_name, phone: s.phone, email: s.email,
      address: s.address, notes: s.notes, payment_terms: s.payment_terms,
      lead_time_days: s.lead_time_days, is_active: s.is_active,
    });
    setSupplierDialog(true);
  };

  // === PO handlers ===
  const activeInventory = inv.items.filter((i) => i.is_active);

  const addPoLine = () => {
    if (activeInventory.length === 0) { toast.error("Add inventory items first."); return; }
    const used = new Set(poLines.map((l) => l.inventory_item_id));
    const first = activeInventory.find((i) => !used.has(i.id));
    if (!first) { toast.info("All items added."); return; }
    setPoLines((p) => [...p, { inventory_item_id: first.id, qty_ordered: 1, unit_cost_cents: first.cost_per_unit_cents }]);
  };

  const poSubtotal = poLines.reduce((s, l) => s + Math.round(l.qty_ordered * l.unit_cost_cents), 0);

  const submitPo = async () => {
    if (poLines.length === 0) { toast.error("Add at least one item."); return; }
    const created = await purch.createOrder({
      supplier_id: poSupplierId || null,
      expected_at: poExpected || null,
      notes: poNotes.trim() || undefined,
      items: poLines,
    });
    if (created) {
      toast.success(`PO #${created.po_number} drafted.`);
      setPoDialog(false);
      setPoSupplierId(""); setPoExpected(""); setPoNotes(""); setPoLines([]);
    }
  };

  // === Receive ===
  const submitReceive = async () => {
    if (!receiveDialog.itemId) return;
    const orderItem = Object.values(purch.itemsByOrder).flat().find((i) => i.id === receiveDialog.itemId);
    if (!orderItem) return;
    const newTotal = Number(orderItem.qty_received) + parseFloat(receiveQty || "0");
    if (!parseFloat(receiveQty) || parseFloat(receiveQty) <= 0) { toast.error("Quantity required."); return; }
    const res = await purch.receiveItem(receiveDialog.itemId, newTotal);
    if (res.ok) {
      toast.success("Stock received & inventory updated.");
      setReceiveDialog({ open: false, itemId: null });
      setReceiveQty("");
    } else {
      toast.error(res.error || "Couldn't receive.");
    }
  };

  if (purch.loading || inv.loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Suppliers</p>
          <p className="text-2xl font-bold tabular-nums">{stats.totalSuppliers}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Open POs</p>
          <p className="text-2xl font-bold tabular-nums">{stats.openCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Outstanding value</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(stats.openValue)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Suppliers</span>
            <Button size="sm" onClick={() => { setEditingSupplierId(null); setSupplierDraft(blankSupplier()); setSupplierDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Supplier
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {purch.suppliers.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No suppliers yet — add one to create purchase orders.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {purch.suppliers.map((s) => (
                <li key={s.id} className="py-2.5 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{s.name}</span>
                      {!s.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                      {s.payment_terms && <Badge variant="outline" className="text-[10px]">{s.payment_terms}</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex flex-wrap gap-2">
                      {s.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                      {s.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                      {s.lead_time_days != null && <span>{s.lead_time_days}d lead</span>}
                    </div>
                  </div>
                  <Switch checked={s.is_active} onCheckedChange={(v) => purch.updateSupplier(s.id, { is_active: v })} />
                  <Button size="sm" variant="ghost" onClick={() => openEditSupplier(s.id)}>Edit</Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm(`Remove ${s.name}?`)) purch.removeSupplier(s.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Truck className="h-4 w-4" /> Purchase orders</span>
            <Button size="sm" onClick={() => { setPoLines([]); setPoDialog(true); }} disabled={activeInventory.length === 0}>
              <Plus className="h-4 w-4 mr-1" /> New PO
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {purch.orders.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {activeInventory.length === 0 ? "Add inventory items first." : "No purchase orders yet."}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {purch.orders.map((o) => {
                const supplier = o.supplier_id ? purch.suppliers.find((s) => s.id === o.supplier_id) : null;
                const lines = purch.itemsByOrder[o.id] ?? [];
                const isOpen = expandedPoId === o.id;
                const canSend = o.status === "draft" && lines.length > 0;
                return (
                  <li key={o.id} className="py-2.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" onClick={() => setExpandedPoId(isOpen ? null : o.id)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-muted/30 text-muted-foreground hover:bg-muted">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <span className="font-mono text-xs text-muted-foreground">PO #{o.po_number}</span>
                      <Badge className={cn("text-[10px] uppercase", STATUS_COLOR[o.status])}>{o.status}</Badge>
                      <span className="flex-1 min-w-0 truncate text-sm">{supplier?.name ?? "—"}</span>
                      {o.expected_at && <span className="text-[11px] text-muted-foreground">Expected {o.expected_at}</span>}
                      <span className="tabular-nums font-medium">{fmt(o.total_cents)}</span>
                      {canSend && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => purch.setOrderStatus(o.id, "sent")}>
                          <Send className="h-3 w-3 mr-1" /> Mark sent
                        </Button>
                      )}
                      {o.status !== "received" && o.status !== "cancelled" && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Cancel" onClick={() => { if (confirm(`Cancel PO #${o.po_number}?`)) purch.setOrderStatus(o.id, "cancelled"); }}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete" onClick={() => { if (confirm(`Delete PO #${o.po_number}?`)) purch.removeOrder(o.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {isOpen && (
                      <div className="ml-10 mt-2 rounded-lg border border-border bg-muted/20 p-3 space-y-2 text-sm">
                        {lines.length === 0 ? (
                          <p className="text-muted-foreground">No items on this PO.</p>
                        ) : (
                          lines.map((l) => {
                            const remaining = Number(l.qty_ordered) - Number(l.qty_received);
                            return (
                              <div key={l.id} className="flex items-center gap-3 flex-wrap">
                                <span className="flex-1 min-w-0 truncate">{l.item_name}</span>
                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                  {Number(l.qty_received).toFixed(2)} / {Number(l.qty_ordered).toFixed(2)} {l.unit}
                                </span>
                                <span className="tabular-nums text-muted-foreground w-20 text-right">{fmt(l.line_total_cents)}</span>
                                {remaining > 0 && o.status !== "cancelled" && (
                                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => { setReceiveQty(remaining.toString()); setReceiveDialog({ open: true, itemId: l.id }); }}>
                                    <PackageCheck className="h-3.5 w-3.5 mr-1" /> Receive
                                  </Button>
                                )}
                              </div>
                            );
                          })
                        )}
                        {o.notes && (
                          <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-2 flex items-start gap-1">
                            <FileText className="h-3 w-3 mt-0.5 shrink-0" /> {o.notes}
                          </p>
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

      {/* Supplier dialog */}
      <Dialog open={supplierDialog} onOpenChange={setSupplierDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSupplierId ? "Edit supplier" : "New supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Name</Label>
              <Input value={supplierDraft.name} onChange={(e) => setSupplierDraft({ ...supplierDraft, name: e.target.value })} placeholder="ABC Coffee Co." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact</Label>
                <Input value={supplierDraft.contact_name ?? ""} onChange={(e) => setSupplierDraft({ ...supplierDraft, contact_name: e.target.value || null })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={supplierDraft.phone ?? ""} onChange={(e) => setSupplierDraft({ ...supplierDraft, phone: e.target.value || null })} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={supplierDraft.email ?? ""} onChange={(e) => setSupplierDraft({ ...supplierDraft, email: e.target.value || null })} />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea rows={2} value={supplierDraft.address ?? ""} onChange={(e) => setSupplierDraft({ ...supplierDraft, address: e.target.value || null })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payment terms</Label>
                <Input value={supplierDraft.payment_terms ?? ""} onChange={(e) => setSupplierDraft({ ...supplierDraft, payment_terms: e.target.value || null })} placeholder="Net 30" />
              </div>
              <div>
                <Label>Lead time (days)</Label>
                <Input type="number" min={0} max={365} value={supplierDraft.lead_time_days ?? ""}
                  onChange={(e) => setSupplierDraft({ ...supplierDraft, lead_time_days: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10)) })} />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border p-2">
              <span className="text-sm">Active</span>
              <Switch checked={supplierDraft.is_active} onCheckedChange={(v) => setSupplierDraft({ ...supplierDraft, is_active: v })} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSupplierDialog(false)}>Cancel</Button>
            <Button onClick={submitSupplier} disabled={purch.saving}>{editingSupplierId ? "Save" : "Add supplier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New PO dialog */}
      <Dialog open={poDialog} onOpenChange={setPoDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New purchase order</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Supplier</Label>
                <Select value={poSupplierId} onValueChange={setPoSupplierId}>
                  <SelectTrigger><SelectValue placeholder="(no supplier)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">(no supplier)</SelectItem>
                    {purch.suppliers.filter((s) => s.is_active).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expected date</Label>
                <Input type="date" value={poExpected} onChange={(e) => setPoExpected(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={poNotes} onChange={(e) => setPoNotes(e.target.value)} />
            </div>
            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between p-2 border-b border-border/60">
                <span className="text-sm font-semibold">Line items</span>
                <Button size="sm" variant="outline" onClick={addPoLine}><Plus className="h-3.5 w-3.5 mr-1" /> Item</Button>
              </div>
              {poLines.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">Add items below.</p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {poLines.map((line, idx) => {
                    const inventory = activeInventory.find((i) => i.id === line.inventory_item_id);
                    return (
                      <li key={idx} className="p-2 flex flex-wrap items-center gap-2">
                        <Select value={line.inventory_item_id} onValueChange={(v) => {
                          const chosen = activeInventory.find((i) => i.id === v);
                          setPoLines((p) => p.map((l, i) => i === idx ? { ...l, inventory_item_id: v, unit_cost_cents: chosen?.cost_per_unit_cents ?? l.unit_cost_cents } : l));
                        }}>
                          <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {activeInventory.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="number" step="0.01" min="0" value={String(line.qty_ordered)}
                          onChange={(e) => setPoLines((p) => p.map((l, i) => i === idx ? { ...l, qty_ordered: Math.max(0, parseFloat(e.target.value || "0")) } : l))}
                          className="h-8 w-20 tabular-nums" placeholder="qty" />
                        <span className="text-[11px] text-muted-foreground">{inventory?.unit ?? ""}</span>
                        <Input type="number" step="0.01" min="0" value={(line.unit_cost_cents / 100).toString()}
                          onChange={(e) => setPoLines((p) => p.map((l, i) => i === idx ? { ...l, unit_cost_cents: Math.round(parseFloat(e.target.value || "0") * 100) } : l))}
                          className="h-8 w-24 tabular-nums" placeholder="cost" />
                        <span className="tabular-nums text-sm w-20 text-right">{fmt(Math.round(line.qty_ordered * line.unit_cost_cents))}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setPoLines((p) => p.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {poLines.length > 0 && (
                <div className="flex items-center justify-between p-2 border-t border-border/60 text-sm font-semibold">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{fmt(poSubtotal)}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPoDialog(false)}>Cancel</Button>
            <Button onClick={submitPo} disabled={purch.saving || poLines.length === 0}>Create PO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive dialog */}
      <Dialog open={receiveDialog.open} onOpenChange={(v) => setReceiveDialog((d) => ({ ...d, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receive stock</DialogTitle></DialogHeader>
          {(() => {
            const line = receiveDialog.itemId ? Object.values(purch.itemsByOrder).flat().find((i) => i.id === receiveDialog.itemId) : null;
            if (!line) return null;
            return (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{line.item_name}</span> — received{" "}
                  <span className="font-semibold text-foreground tabular-nums">{Number(line.qty_received).toFixed(2)}</span> of{" "}
                  <span className="tabular-nums">{Number(line.qty_ordered).toFixed(2)} {line.unit}</span>
                </p>
                <div>
                  <Label>Additional quantity to receive ({line.unit})</Label>
                  <Input type="number" step="0.01" min="0" value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Inventory will auto-update and the PO will flip to "received" when everything is in.
                </p>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReceiveDialog({ open: false, itemId: null })}>Cancel</Button>
            <Button onClick={submitReceive} disabled={purch.saving}>Receive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
