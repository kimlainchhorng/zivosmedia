/**
 * AdminImportShopPage - Manage products + warehouse fulfillment for the import shop.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUSES = [
  "awaiting_payment", "awaiting_supplier", "supplier_ordered",
  "at_origin_warehouse", "in_transit", "at_local_warehouse",
  "out_for_delivery", "delivered", "cancelled", "refunded",
];

export default function AdminImportShopPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b flex items-center px-3 py-2.5 gap-2" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
        <Button variant="ghost" size="icon" aria-label="Go back" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-bold flex-1">Shop Admin</h1>
      </header>

      <Tabs defaultValue="orders" className="px-3 pt-3">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="orders"><Truck className="h-4 w-4 mr-1.5" />Orders</TabsTrigger>
          <TabsTrigger value="products"><Package className="h-4 w-4 mr-1.5" />Products</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-3"><OrdersAdmin /></TabsContent>
        <TabsContent value="products" className="mt-3"><ProductsAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}

function OrdersAdmin() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-import-orders"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("import_orders").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("import_orders").update({ fulfillment_status: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-import-orders"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-2">
      {orders.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No orders yet.</p>}
      {orders.map((o: any) => (
        <div key={o.id} className="bg-card border rounded-2xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono">{o.tracking_code}</span>
            <span className="text-[11px] font-bold text-primary">${(o.total_cents / 100).toFixed(2)}</span>
          </div>
          <p className="text-[12px] mt-1 font-semibold">{o.contact_name} · {o.contact_phone}</p>
          <p className="text-[11px] text-muted-foreground">{o.delivery_address}</p>
          <select
            value={o.fulfillment_status}
            onChange={(e) => updateStatus.mutate({ id: o.id, status: e.target.value })}
            className="mt-2 w-full h-9 rounded-lg border px-2 text-[12px] bg-background"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s.split("_").join(" ")}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

function ProductsAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", source_url: "", source_platform: "taobao",
    images: "", category: "Fashion", weight_grams: 500, final_price: "9.99", source_price: "30",
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-import-products"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("import_products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      const images = form.images.split("\n").map((s) => s.trim()).filter(Boolean);
      const { error } = await (supabase as any).from("import_products").insert({
        title: form.title,
        description: form.description || null,
        source_platform: form.source_platform,
        source_url: form.source_url || null,
        images,
        category: form.category,
        weight_grams: Number(form.weight_grams) || 500,
        source_price: parseFloat(form.source_price) || null,
        final_price_cents: Math.round(parseFloat(form.final_price) * 100),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-import-products"] });
      toast.success("Product added");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full h-10 rounded-xl"><Plus className="h-4 w-4 mr-1" />Add Product</Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input placeholder="Source URL (Taobao/Lazada/1688)" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
            <select className="w-full h-10 rounded-lg border px-2 bg-background" value={form.source_platform} onChange={(e) => setForm({ ...form, source_platform: e.target.value })}>
              {["taobao", "lazada", "1688", "shein", "manual", "other"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <Textarea placeholder="Image URLs (one per line)" value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
            <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Weight (g)" inputMode="numeric" value={form.weight_grams} onChange={(e) => setForm({ ...form, weight_grams: Number(e.target.value) })} />
              <Input placeholder="Source price" inputMode="decimal" value={form.source_price} onChange={(e) => setForm({ ...form, source_price: e.target.value })} />
              <Input placeholder="Sell price USD" inputMode="decimal" value={form.final_price} onChange={(e) => setForm({ ...form, final_price: e.target.value })} />
            </div>
            <Button onClick={() => createProduct.mutate()} disabled={createProduct.isPending} className="w-full">
              {createProduct.isPending ? "Saving..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {products.map((p: any) => (
        <div key={p.id} className="bg-card border rounded-2xl p-3 flex gap-2">
          <img src={p.images?.[0] ?? "/placeholder.svg"} alt="" className="h-14 w-14 rounded-lg object-cover bg-muted" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold line-clamp-2">{p.title}</p>
            <p className="text-[11px] text-muted-foreground">${(p.final_price_cents / 100).toFixed(2)} · {p.source_platform}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
