/**
 * Lodging — Gift Vouchers & Certificates.
 * Generate, sell, track, and redeem gift vouchers for stays and hotel services.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Gift, Plus, Search, Printer, XCircle, CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

type VoucherStatus = "active" | "partially_used" | "redeemed" | "expired" | "voided";

interface GiftVoucher {
  id: string;
  code: string;
  value_cents: number;
  balance_cents: number;
  recipient_name: string | null;
  recipient_email: string | null;
  purchaser_name: string | null;
  message: string | null;
  expires_at: string | null;
  status: VoucherStatus;
  created_at: string;
}

const STATUS_COLOR: Record<VoucherStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  partially_used: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  redeemed: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  expired: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  voided: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 12 }, (_, i) => (i > 0 && i % 4 === 0 ? "-" : chars[Math.floor(Math.random() * chars.length)])).join("");
}

const BLANK = {
  code: genCode(),
  value: "",
  recipient_name: "",
  recipient_email: "",
  purchaser_name: "",
  message: "",
  expires_at: "",
};

export default function LodgingGiftVouchersSection({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<VoucherStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [form, setForm] = useState(BLANK);

  const query = useQuery({
    queryKey: ["lodge_gift_vouchers", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodge_gift_vouchers")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as GiftVoucher[];
    },
  });

  const createVoucher = useMutation({
    mutationFn: async () => {
      const valueCents = Math.round(parseFloat(form.value) * 100);
      const { error } = await (supabase as any).from("lodge_gift_vouchers").insert({
        store_id: storeId,
        code: form.code.toUpperCase().trim(),
        value_cents: valueCents,
        balance_cents: valueCents,
        recipient_name: form.recipient_name || null,
        recipient_email: form.recipient_email || null,
        purchaser_name: form.purchaser_name || null,
        message: form.message || null,
        expires_at: form.expires_at || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Voucher created");
      qc.invalidateQueries({ queryKey: ["lodge_gift_vouchers", storeId] });
      setCreateOpen(false);
      setForm({ ...BLANK, code: genCode() });
    },
    onError: (e: any) => toast.error(e?.message || "Failed — code may already exist"),
  });

  const redeemVoucher = useMutation({
    mutationFn: async () => {
      const code = redeemCode.toUpperCase().trim();
      const { data, error } = await (supabase as any)
        .from("lodge_gift_vouchers")
        .select("*")
        .eq("store_id", storeId)
        .eq("code", code)
        .single();
      if (error || !data) throw new Error("Voucher not found");
      const v = data as GiftVoucher;
      if (v.status === "voided") throw new Error("This voucher has been voided");
      if (v.status === "redeemed") throw new Error("This voucher has already been fully redeemed");
      if (v.expires_at && new Date(v.expires_at) < new Date()) throw new Error("This voucher has expired");
      const amountCents = Math.round(parseFloat(redeemAmount) * 100);
      if (amountCents > v.balance_cents) throw new Error(`Insufficient balance. Available: ${fmt(v.balance_cents)}`);
      const newBalance = v.balance_cents - amountCents;
      const newStatus: VoucherStatus = newBalance === 0 ? "redeemed" : "partially_used";
      const { error: e2 } = await (supabase as any)
        .from("lodge_gift_vouchers")
        .update({ balance_cents: newBalance, status: newStatus })
        .eq("id", v.id);
      if (e2) throw e2;
      return { guest: v.recipient_name, remaining: newBalance };
    },
    onSuccess: ({ guest, remaining }) => {
      toast.success(`Redeemed! Remaining balance: ${fmt(remaining)}${guest ? ` for ${guest}` : ""}`);
      qc.invalidateQueries({ queryKey: ["lodge_gift_vouchers", storeId] });
      setRedeemOpen(false);
      setRedeemCode("");
      setRedeemAmount("");
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const voidVoucher = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_gift_vouchers").update({ status: "voided" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Voucher voided");
      qc.invalidateQueries({ queryKey: ["lodge_gift_vouchers", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const handlePrint = (v: GiftVoucher) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><body style="font-family:serif;padding:40px;max-width:500px;margin:auto;border:2px solid #ccc;border-radius:8px">
      <h1 style="text-align:center;font-size:2em">🎁 Gift Voucher</h1>
      <hr/>
      <p style="font-size:2em;text-align:center;font-family:monospace;letter-spacing:4px;font-weight:bold">${v.code}</p>
      <p style="text-align:center;font-size:1.5em;color:#2a6">${fmt(v.value_cents)}</p>
      ${v.recipient_name ? `<p>For: <strong>${v.recipient_name}</strong></p>` : ""}
      ${v.message ? `<p style="font-style:italic">"${v.message}"</p>` : ""}
      ${v.expires_at ? `<p>Valid until: ${v.expires_at}</p>` : ""}
      <hr/>
      <p style="font-size:0.8em;color:#888;text-align:center">Redeemable at time of checkout. Not refundable.</p>
    </body></html>`);
    w.print();
  };

  const all = query.data || [];
  const filtered = all.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.code.toLowerCase().includes(q) || (v.recipient_name || "").toLowerCase().includes(q) || (v.purchaser_name || "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const activeValue = all.filter(v => ["active", "partially_used"].includes(v.status)).reduce((s, v) => s + v.balance_cents, 0);
  const soldValue = all.reduce((s, v) => s + v.value_cents, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> Gift Vouchers</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setRedeemOpen(true)} className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Redeem
          </Button>
          <Button size="sm" onClick={() => { setForm({ ...BLANK, code: genCode() }); setCreateOpen(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New voucher
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-vouchers" />
        <LodgingSectionStatusBanner
          title="Gift Vouchers"
          icon={Gift}
          countLabel="Active balance"
          countValue={fmt(activeValue)}
          fixLabel="Open Front Desk"
          fixTab="lodge-frontdesk"
        />

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Total issued", value: all.length },
            { label: "Active", value: all.filter(v => ["active", "partially_used"].includes(v.status)).length },
            { label: "Outstanding value", value: fmt(activeValue) },
            { label: "Total sold", value: fmt(soldValue) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
              <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code or name…" className="pl-8 h-8 text-xs" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "active", "partially_used", "redeemed", "expired", "voided"] as const).map(s => (
              <button type="button" key={s} onClick={() => setFilterStatus(s as any)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${filterStatus === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Voucher list */}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {all.length === 0 ? "No vouchers yet. Issue a gift voucher for a guest or as a promotional tool." : "No vouchers match this filter."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(v => (
              <div key={v.id} className={`rounded-lg border p-3 ${["redeemed", "voided", "expired"].includes(v.status) ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <Gift className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono font-semibold text-sm tracking-widest">{v.code}</span>
                      <Badge className={`text-[10px] border ${STATUS_COLOR[v.status]}`}>{v.status.replace("_", " ")}</Badge>
                      <span className="ml-auto text-xs font-bold">{fmt(v.balance_cents)} <span className="text-muted-foreground font-normal">/ {fmt(v.value_cents)}</span></span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex flex-wrap gap-2">
                      {v.recipient_name && <span>To: {v.recipient_name}{v.recipient_email ? ` (${v.recipient_email})` : ""}</span>}
                      {v.purchaser_name && <span>From: {v.purchaser_name}</span>}
                      {v.expires_at && <span>Expires: {v.expires_at}</span>}
                    </div>
                    {v.message && <p className="text-[11px] text-muted-foreground italic mt-0.5">"{v.message}"</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Print voucher" onClick={() => handlePrint(v)}>
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                    {!["voided", "redeemed", "expired"].includes(v.status) && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" title="Void voucher"
                        onClick={() => { if (confirm("Void this voucher? This cannot be undone.")) voidVoucher.mutate(v.id); }}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Issue gift voucher</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Voucher code</Label>
                <div className="flex gap-2">
                  <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="font-mono tracking-widest" />
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => setForm({ ...form, code: genCode() })}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Value (USD) *</Label>
                <Input type="number" min="0" step="0.01" value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })} placeholder="e.g. 100.00" />
              </div>
              <div>
                <Label>Expires</Label>
                <Input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
              </div>
              <div>
                <Label>Recipient name</Label>
                <Input value={form.recipient_name} onChange={e => setForm({ ...form, recipient_name: e.target.value })} />
              </div>
              <div>
                <Label>Recipient email</Label>
                <Input type="email" value={form.recipient_email} onChange={e => setForm({ ...form, recipient_email: e.target.value })} />
              </div>
              <div>
                <Label>Purchaser name</Label>
                <Input value={form.purchaser_name} onChange={e => setForm({ ...form, purchaser_name: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Personal message</Label>
                <Textarea rows={2} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Happy birthday! Enjoy your stay." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button disabled={!form.value || !form.code || createVoucher.isPending} onClick={() => createVoucher.mutate()}>
                {createVoucher.isPending ? "Creating…" : "Issue voucher"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Redeem dialog */}
        <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Redeem voucher</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Voucher code *</Label>
                <Input value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                  className="font-mono tracking-widest" placeholder="XXXX-XXXX-XXXX" />
              </div>
              <div>
                <Label>Amount to redeem (USD) *</Label>
                <Input type="number" min="0.01" step="0.01" value={redeemAmount}
                  onChange={e => setRedeemAmount(e.target.value)} placeholder="e.g. 50.00" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRedeemOpen(false)}>Cancel</Button>
              <Button disabled={!redeemCode || !redeemAmount || redeemVoucher.isPending} onClick={() => redeemVoucher.mutate()}>
                {redeemVoucher.isPending ? "Redeeming…" : "Redeem"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
