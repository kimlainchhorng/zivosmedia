/**
 * Lodging — Guest Folio (Billing).
 * Per-reservation charge view: room rate, extras, ad-hoc charges, payments, balance.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Receipt, Search, Plus, Trash2, CheckCircle2, Printer,
  User, BedDouble, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

interface Reservation {
  id: string;
  number: string;
  guest_name: string | null;
  room_number: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  rate_cents: number;
  extras_cents: number;
  tax_cents: number;
  total_cents: number;
  paid_cents: number;
  payment_status: string;
  status: string;
}

interface Charge {
  id: string;
  reservation_id: string;
  label: string;
  amount_cents: number;
  created_at: string;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  partial: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  unpaid: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

export default function LodgingFolioSection({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chargeDialog, setChargeDialog] = useState(false);
  const [chargeLine, setChargeLine] = useState({ label: "", amount: "" });

  const reservationsQ = useQuery({
    queryKey: ["lodge_folio_reservations", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodge_reservations")
        .select("id,number,guest_name,room_number,check_in,check_out,nights,rate_cents,extras_cents,tax_cents,total_cents,paid_cents,payment_status,status")
        .eq("store_id", storeId)
        .not("status", "eq", "cancelled")
        .order("check_in", { ascending: false });
      if (error) throw error;
      return (data || []) as Reservation[];
    },
  });

  const chargesQ = useQuery({
    queryKey: ["lodge_folio_charges", storeId, selectedId],
    enabled: Boolean(storeId && selectedId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodge_reservation_charges")
        .select("*")
        .eq("reservation_id", selectedId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Charge[];
    },
  });

  const addCharge = useMutation({
    mutationFn: async ({ label, amount_cents }: { label: string; amount_cents: number }) => {
      const { error } = await (supabase as any).from("lodge_reservation_charges").insert({
        store_id: storeId,
        reservation_id: selectedId,
        label,
        amount_cents,
      });
      if (error) throw error;
      // Update reservation extras_cents + total_cents
      const res = selected!;
      const newExtras = res.extras_cents + amount_cents;
      const newTotal = res.rate_cents * res.nights + newExtras + res.tax_cents;
      const { error: e2 } = await (supabase as any)
        .from("lodge_reservations")
        .update({ extras_cents: newExtras, total_cents: newTotal })
        .eq("id", selectedId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Charge added");
      qc.invalidateQueries({ queryKey: ["lodge_folio_charges"] });
      qc.invalidateQueries({ queryKey: ["lodge_folio_reservations"] });
      setChargeDialog(false);
      setChargeLine({ label: "", amount: "" });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const removeCharge = useMutation({
    mutationFn: async (charge: Charge) => {
      const { error } = await (supabase as any)
        .from("lodge_reservation_charges")
        .delete()
        .eq("id", charge.id);
      if (error) throw error;
      // Recalculate extras
      const res = selected!;
      const newExtras = Math.max(0, res.extras_cents - charge.amount_cents);
      const newTotal = res.rate_cents * res.nights + newExtras + res.tax_cents;
      await (supabase as any)
        .from("lodge_reservations")
        .update({ extras_cents: newExtras, total_cents: newTotal })
        .eq("id", selectedId);
    },
    onSuccess: () => {
      toast.success("Charge removed");
      qc.invalidateQueries({ queryKey: ["lodge_folio_charges"] });
      qc.invalidateQueries({ queryKey: ["lodge_folio_reservations"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const markPaid = useMutation({
    mutationFn: async () => {
      const res = selected!;
      const { error } = await (supabase as any)
        .from("lodge_reservations")
        .update({ paid_cents: res.total_cents, payment_status: "paid" })
        .eq("id", selectedId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as fully paid");
      qc.invalidateQueries({ queryKey: ["lodge_folio_reservations"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const reservations = reservationsQ.data || [];
  const filtered = reservations.filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.guest_name?.toLowerCase().includes(q) ||
      r.number?.toLowerCase().includes(q) ||
      r.room_number?.toLowerCase().includes(q)
    );
  });

  const selected = reservations.find((r) => r.id === selectedId) || null;
  const charges = chargesQ.data || [];

  const balance = selected ? selected.total_cents - selected.paid_cents : 0;

  const handlePrint = () => {
    if (!selected) return;
    const lines = [
      `GUEST FOLIO — ${selected.guest_name || "Guest"}`,
      `Reservation: ${selected.number}  |  Room: ${selected.room_number || "—"}`,
      `${selected.check_in} → ${selected.check_out}  (${selected.nights} nights)`,
      "",
      "CHARGES",
      `  Room rate: ${fmt(selected.rate_cents * selected.nights)} (${fmt(selected.rate_cents)}/night × ${selected.nights})`,
      ...charges.map((c) => `  ${c.label}: ${fmt(c.amount_cents)}`),
      `  Taxes & fees: ${fmt(selected.tax_cents)}`,
      "",
      `TOTAL: ${fmt(selected.total_cents)}`,
      `PAID:  ${fmt(selected.paid_cents)}`,
      `BALANCE DUE: ${fmt(balance)}`,
    ].join("\n");
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<pre style="font-family:monospace;font-size:13px;padding:20px">${lines}</pre>`);
      w.print();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Guest Folio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-folio" />
        <LodgingSectionStatusBanner
          title="Guest Folio"
          icon={Receipt}
          countLabel="Unpaid reservations"
          countValue={reservations.filter(r => r.payment_status !== "paid").length}
          fixLabel="Open Front Desk"
          fixTab="lodge-frontdesk"
        />

        <div className="grid gap-4 md:grid-cols-2">
          {/* Left: reservation picker */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by guest, number, room…"
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="rounded-lg border border-border overflow-hidden max-h-[480px] overflow-y-auto">
              {reservationsQ.isLoading ? (
                <p className="p-4 text-xs text-muted-foreground text-center">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground text-center">No reservations found</p>
              ) : (
                filtered.map(r => (
                  <button type="button"
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-border last:border-b-0 transition hover:bg-muted/30 ${selectedId === r.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium truncate">{r.guest_name || "Guest"}</span>
                      <Badge className={`text-[10px] border ${PAYMENT_STATUS_COLOR[r.payment_status] || ""}`}>
                        {r.payment_status}
                      </Badge>
                    </div>
                    <div className="flex gap-3 mt-0.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><BedDouble className="h-2.5 w-2.5" />{r.room_number || "—"}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{r.check_in} → {r.check_out}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">#{r.number} · {fmt(r.total_cents)}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: folio detail */}
          {selected ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">{selected.guest_name || "Guest"}</span>
                  <Badge className={`text-[10px] border ml-auto ${PAYMENT_STATUS_COLOR[selected.payment_status] || ""}`}>
                    {selected.payment_status}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  #{selected.number} · Room {selected.room_number || "—"} · {selected.check_in} → {selected.check_out} ({selected.nights} nights)
                </p>
              </div>

              {/* Charge lines */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="bg-muted/30 px-3 py-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Charges</span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] gap-1" onClick={() => setChargeDialog(true)}>
                    <Plus className="h-3 w-3" /> Add charge
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {/* Room rate line */}
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs">Room rate × {selected.nights} nights</span>
                    <span className="text-xs font-medium">{fmt(selected.rate_cents * selected.nights)}</span>
                  </div>
                  {/* Ad-hoc charges */}
                  {charges.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs flex-1 truncate">{c.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{fmt(c.amount_cents)}</span>
                        <button type="button"
                          onClick={() => removeCharge.mutate(c)}
                          className="text-destructive/60 hover:text-destructive"
                          title="Remove charge"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Tax */}
                  {selected.tax_cents > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 text-muted-foreground">
                      <span className="text-xs">Taxes & fees</span>
                      <span className="text-xs">{fmt(selected.tax_cents)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{fmt(selected.total_cents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="text-emerald-700 font-medium">{fmt(selected.paid_cents)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-1.5">
                  <span className="font-semibold">Balance due</span>
                  <span className={`font-bold ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmt(balance)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {selected.payment_status !== "paid" && (
                  <Button size="sm" className="gap-1.5 flex-1" onClick={() => markPaid.mutate()} disabled={markPaid.isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {markPaid.isPending ? "Saving…" : "Mark fully paid"}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
                  <Printer className="h-3.5 w-3.5" /> Print folio
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Receipt className="h-8 w-8 text-muted-foreground/40" />
              Select a reservation to view its folio
            </div>
          )}
        </div>

        {/* Add charge dialog */}
        <Dialog open={chargeDialog} onOpenChange={setChargeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add charge to folio</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Description</Label>
                <Input
                  value={chargeLine.label}
                  onChange={e => setChargeLine({ ...chargeLine, label: e.target.value })}
                  placeholder="e.g. Mini-bar, Laundry, Room service"
                />
              </div>
              <div>
                <Label>Amount (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={chargeLine.amount}
                  onChange={e => setChargeLine({ ...chargeLine, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChargeDialog(false)}>Cancel</Button>
              <Button
                disabled={!chargeLine.label.trim() || !chargeLine.amount || addCharge.isPending}
                onClick={() => addCharge.mutate({
                  label: chargeLine.label.trim(),
                  amount_cents: Math.round(parseFloat(chargeLine.amount) * 100),
                })}
              >
                {addCharge.isPending ? "Adding…" : "Add charge"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
