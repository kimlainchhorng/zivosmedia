/**
 * Per-booking retail line items dialog: pick from the store's retail catalog,
 * add quantities. Saves immediately on +/- so the DB stays the source of truth.
 * The stock-sync trigger handles inventory automatically.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Package, Loader2, Plus, Minus, Trash2, Search, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;

interface BookingRetailItem {
  id: string;
  booking_id: string;
  product_id: string | null;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
}

interface SalonBookingRetailDialogProps {
  storeId: string;
  bookingId: string | null;
  bookingClientName?: string;
  bookingStatus?: string;
  onClose: () => void;
  onChanged?: () => void;
}

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function SalonBookingRetailDialog({
  storeId, bookingId, bookingClientName, bookingStatus, onClose, onChanged,
}: SalonBookingRetailDialogProps) {
  const [items, setItems] = useState<BookingRetailItem[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; price_cents: number; stock_quantity: number; is_active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Refresh the products list — needed after every mutation on a completed
  // booking because the stock-sync trigger has just changed stock_quantity.
  const reloadProducts = async () => {
    const { data, error } = await supabase
      .from("salon_retail_products")
      .select("id,name,price_cents,stock_quantity,is_active")
      .eq("store_id", storeId)
      .order("name", { ascending: true });
    if (error) return;
    setProducts((data ?? []) as any);
  };

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [itemsRes, productsRes] = await Promise.all([
        supabase.from("salon_booking_retail_items").select("*").eq("booking_id", bookingId),
        supabase.from("salon_retail_products").select("id,name,price_cents,stock_quantity,is_active").eq("store_id", storeId).order("name", { ascending: true }),
      ]);
      if (cancelled) return;
      if (itemsRes.error || productsRes.error) {
        toast.error("Couldn't load retail data.");
        setLoading(false);
        return;
      }
      setItems((itemsRes.data ?? []) as unknown as BookingRetailItem[]);
      setProducts((productsRes.data ?? []) as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, bookingId]);

  const filteredProducts = useMemo(() => {
    const active = products.filter((p) => p.is_active);
    if (!search) return active;
    const q = search.toLowerCase();
    return active.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.unit_price_cents * it.quantity, 0), [items]);

  const mutateRetail = async (body: Record<string, unknown>) => {
    if (!bookingId) return false;
    const { data, error } = await supabase.functions.invoke("salon-booking-retail-manage", {
      body: { store_id: storeId, booking_id: bookingId, ...body },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Couldn't update retail items.");
      return false;
    }
    setItems((data?.items ?? []) as BookingRetailItem[]);
    if (bookingStatus === "completed") await reloadProducts();
    onChanged?.();
    return true;
  };

  const addProduct = async (productId: string) => {
    if (!bookingId) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setSaving(true);
    await mutateRetail({ action: "add_product", product_id: productId });
    setSaving(false);
  };

  const adjustQty = async (item: BookingRetailItem, delta: number) => {
    if (!bookingId) return;
    const next = Math.max(0, item.quantity + delta);
    if (next === 0) {
      await removeItem(item);
      return;
    }
    setSaving(true);
    await mutateRetail({ action: "set_item_quantity", item_id: item.id, quantity: next });
    setSaving(false);
  };

  const removeItem = async (item: BookingRetailItem) => {
    setSaving(true);
    await mutateRetail({ action: "remove_item", item_id: item.id });
    setSaving(false);
  };

  return (
    <Dialog open={bookingId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Retail · {bookingClientName ?? "Booking"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {bookingStatus === "completed" && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 p-2 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>This booking is already completed — stock will adjust immediately when you add/remove items.</span>
            </div>
          )}

          {/* Current items */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">On this booking</p>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">No retail products yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {items.map((it) => (
                  <li key={it.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 p-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{it.product_name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatPrice(it.unit_price_cents)} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => adjustQty(it, -1)} disabled={saving}><Minus className="h-3.5 w-3.5" /></Button>
                      <span className="w-6 text-center text-sm font-bold">{it.quantity}</span>
                      <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => adjustQty(it, 1)} disabled={saving}><Plus className="h-3.5 w-3.5" /></Button>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeItem(it)} disabled={saving}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Catalog picker */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Add from catalog</p>
              <p className="text-xs font-semibold text-foreground">Subtotal: {formatPrice(subtotal)}</p>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search retail…" className="h-9 pl-9" />
            </div>
            {filteredProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No products match.</p>
            ) : (
              <div className="max-h-48 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                {filteredProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatPrice(p.price_cents)} · {p.stock_quantity} in stock</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => addProduct(p.id)} disabled={saving || p.stock_quantity === 0}>
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
