import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Trash2, Copy, Check, Tag, Percent, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface PromoCode {
  id: string;
  code: string;
  type: string;
  value: number;
  status: string;
  store_id: string;
  min_order_cents: number;
  max_redemptions: number | null;
  redemption_count: number;
  revenue_cents: number;
  expires_at: string | null;
  created_at: string;
}

const emptyForm = {
  code: "",
  type: "percent",
  value: 10,
  store_id: "",
  min_order_cents: 0,
  max_redemptions: "",
  expires_at: "",
  status: "active",
};

export default function AdminPromoCodesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "redeemed">("all");

  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores-select"],
    queryFn: async () => {
      const { data } = await supabase.from("store_profiles").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["admin-promo-codes", filter],
    queryFn: async () => {
      let q = supabase
        .from("marketing_promo_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PromoCode[];
    },
  });

  const stats = {
    total: codes.length,
    active: codes.filter((c) => c.status === "active").length,
    redeemed: codes.reduce((sum, c) => sum + c.redemption_count, 0),
    revenue: codes.reduce((sum, c) => sum + c.revenue_cents, 0),
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        store_id: form.store_id,
        min_order_cents: Math.round(Number(form.min_order_cents) * 100),
        max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
        expires_at: form.expires_at || null,
        status: form.status,
        metadata: {},
      };
      if (editingId) {
        const { error } = await supabase.from("marketing_promo_codes").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("marketing_promo_codes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
      setOpen(false);
      toast.success(editingId ? "Promo code updated" : "Promo code created");
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_promo_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
      setDeleteConfirm(null);
      toast.success("Promo code deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "inactive" : "active";
    const { error } = await supabase.from("marketing_promo_codes").update({ status: next }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
    toast.success(`Code ${next === "active" ? "activated" : "deactivated"}`);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Code copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: PromoCode) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      store_id: c.store_id,
      min_order_cents: c.min_order_cents / 100,
      max_redemptions: c.max_redemptions?.toString() ?? "",
      expires_at: c.expires_at?.slice(0, 10) ?? "",
      status: c.status,
    });
    setOpen(true);
  };

  const set = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <AdminLayout title="Promo Codes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Promo Codes</h2>
            <p className="text-sm text-muted-foreground">Create and manage discount codes for campaigns and stores.</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Promo Code
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Codes", value: stats.total, icon: Tag },
            { label: "Active", value: stats.active, icon: Tag },
            { label: "Total Redemptions", value: stats.redeemed, icon: Percent },
            { label: "Revenue Driven", value: fmtUsd(stats.revenue), icon: DollarSign },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
                </div>
                <div className="text-2xl font-bold">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "inactive", "redeemed"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="rounded-full capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader><CardTitle>Promo Codes ({codes.length})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : codes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No promo codes found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type / Value</TableHead>
                    <TableHead>Min Order</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-sm">{c.code}</span>
                          <button type="button" onClick={() => copyCode(c.code, c.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                            {copiedId === c.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {c.type === "percent" ? `${c.value}% off` : fmtUsd(c.value * 100)}
                      </TableCell>
                      <TableCell className="text-sm">{fmtUsd(c.min_order_cents)}</TableCell>
                      <TableCell className="text-sm">
                        {c.redemption_count}{c.max_redemptions ? `/${c.max_redemptions}` : ""}
                      </TableCell>
                      <TableCell className="text-sm">{fmtUsd(c.revenue_cents)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={c.status === "active" ? "default" : "secondary"}
                          className="capitalize cursor-pointer"
                          onClick={() => toggleStatus(c.id, c.status)}
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit</Button>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(c.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Promo Code" : "New Promo Code"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="e.g. SAVE20"
                className="font-mono uppercase"
              />
              <p className="text-[11px] text-muted-foreground">Auto-uppercased. Letters and numbers only.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent Off (%)</SelectItem>
                    <SelectItem value="flat">Flat Off ($)</SelectItem>
                    <SelectItem value="free_delivery">Free Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value {form.type === "percent" ? "(%)" : "($)"}</Label>
                <Input
                  type="number"
                  min="0"
                  step={form.type === "percent" ? "1" : "0.01"}
                  value={form.value}
                  onChange={(e) => set("value", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Store</Label>
              <Select value={form.store_id} onValueChange={(v) => set("store_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select store…" /></SelectTrigger>
                <SelectContent>
                  {stores.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Order ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.min_order_cents} onChange={(e) => set("min_order_cents", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Uses</Label>
                <Input type="number" min="1" value={form.max_redemptions} onChange={(e) => set("max_redemptions", e.target.value)} placeholder="Unlimited" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expires</Label>
                <Input type="date" value={form.expires_at} onChange={(e) => set("expires_at", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.code || !form.store_id || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Promo Code</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the promo code.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
