import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Package, Search, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";

export default function ShopProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: store } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("store_profiles").select("id, name").eq("owner_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["shop-products", store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_products")
        .select("id, name, price, category, in_stock, image_url, sku")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!store?.id,
  });

  const toggleStock = useMutation({
    mutationFn: async ({ id, inStock }: { id: string; inStock: boolean }) => {
      const { error } = await supabase.from("store_products").update({ in_stock: !inStock }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shop-products"] }),
    onError: () => toast.error("Failed to update stock status"),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      toast.success("Product removed");
    },
    onError: () => toast.error("Failed to delete product"),
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      if (!store?.id || !newName.trim()) throw new Error("Missing required fields");
      const price = parseFloat(newPrice) || 0;
      const { error } = await supabase.from("store_products").insert({
        store_id: store.id,
        name: newName.trim(),
        price,
        category: newCategory.trim() || null,
        description: newDesc.trim() || null,
        in_stock: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      toast.success("Product added!");
      setShowAdd(false);
      setNewName(""); setNewPrice(""); setNewCategory(""); setNewDesc("");
    },
    onError: () => toast.error("Failed to add product"),
  });

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="min-h-dvh bg-background pb-24">
        <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur-xl border-b border-border/30">
          <div className="flex items-center gap-3 px-4 py-3">
            <button type="button" onClick={() => navigate("/shop-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-extrabold flex-1">Products</h1>
            <Button size="sm" className="gap-1" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className="pl-9" />
            </div>
          </div>
        </div>

        {/* Add product sheet */}
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end">
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                className="w-full bg-card border-t border-border rounded-t-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base">New Product</h2>
                  <button type="button" onClick={() => setShowAdd(false)} className="p-2 rounded-full hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Input placeholder="Product name *" value={newName} onChange={e => setNewName(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" placeholder="Price (USD)" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
                  <Input placeholder="Category" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                </div>
                <Textarea placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="min-h-[70px]" />
                <Button className="w-full" disabled={createProduct.isPending || !newName.trim()} onClick={() => createProduct.mutate()}>
                  {createProduct.isPending ? "Adding…" : "Add Product"}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 py-4 space-y-2">
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16">
              <Package className="h-14 w-14 text-muted-foreground/20 mx-auto mb-3" />
              <p className="font-semibold mb-1">No products yet</p>
              <p className="text-sm text-muted-foreground">Add your first product to start selling.</p>
            </div>
          )}

          {filtered.map((product, i) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  : <Package className="h-5 w-5 text-muted-foreground" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold text-primary">${product.price.toFixed(2)}</span>
                  {product.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{product.category}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => toggleStock.mutate({ id: product.id, inStock: product.in_stock ?? true })}
                  className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
                  {product.in_stock
                    ? <ToggleRight className="h-5 w-5 text-emerald-500" />
                    : <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                  }
                </button>
                <button type="button" onClick={() => deleteProduct.mutate(product.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="px-4 text-xs text-muted-foreground text-center">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""} · {products.filter(p => p.in_stock).length} in stock
          </div>
        )}
      </div>
    </AppLayout>
  );
}
