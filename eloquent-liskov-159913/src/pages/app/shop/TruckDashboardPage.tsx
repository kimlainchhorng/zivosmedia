/**
 * TruckDashboardPage — Mobile driver dashboard for truck inventory + nearby customers
 * GPS-powered, real-time inventory sync, barcode scanning
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, MapPin, Package, Scan, Truck, Users, RefreshCw,
  Navigation, Minus, Plus, CheckCircle, Loader2, Camera
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  truck_label: string;
}

interface NearbyCustomer {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance_km: number;
  last_order?: string;
}

export default function TruckDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [nearbyCustomers, setNearbyCustomers] = useState<NearbyCustomer[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [truckLabel, setTruckLabel] = useState("default");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [scanMode, setScanMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [syncing, setSyncing] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Get GPS position
  useEffect(() => {
    navigator.geolocation.watchPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      () => toast.error("GPS required for truck dashboard"),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
  }, []);

  // Load store + inventory
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data: store } = await (supabase as any)
          .from("store_profiles")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (!store) {
          toast.error("No store found");
          setLoading(false);
          return;
        }
        setStoreId(store.id);

        const [{ data: inv }, { data: prods }] = await Promise.all([
          (supabase as any)
            .from("truck_inventory")
            .select("id, truck_label, product_id, quantity")
            .eq("store_id", store.id),
          (supabase as any)
            .from("store_products")
            .select("id, name, price")
            .eq("store_id", store.id)
            .eq("in_stock", true),
        ]);

        const prodMap = new Map((prods || []).map((p: any) => [p.id, p]));
        setInventory(
          (inv || []).map((row: any) => {
            const prod = prodMap.get(row.product_id) as any;
            return {
              ...row,
              product_name: prod?.name || "Unknown",
              price: prod?.price || 0,
            };
          })
        );
      } catch {
        toast.error("Failed to load dashboard");
      }
      setLoading(false);
    })();
  }, [user]);

  // Load recent customers from store_orders
  useEffect(() => {
    if (!storeId) return;
    (async () => {
      try {
        const { data: orders } = await (supabase as any)
          .from("store_orders")
          .select("id, customer_id, created_at")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!orders?.length) return;
        const customerIds = [...new Set((orders as any[]).map((o: any) => o.customer_id).filter(Boolean))] as string[];
        if (!customerIds.length) return;

        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("id, user_id, full_name")
          .or(`id.in.(${customerIds.join(",")}),user_id.in.(${customerIds.join(",")})`);

        const nameMap = new Map<string, string>();
        (profiles || []).forEach((p: any) => {
          if (p.id) nameMap.set(p.id, p.full_name || "Customer");
          if (p.user_id) nameMap.set(p.user_id, p.full_name || "Customer");
        });

        const seen = new Set<string>();
        const customers: NearbyCustomer[] = [];
        for (const o of orders as any[]) {
          if (!o.customer_id || seen.has(o.customer_id)) continue;
          seen.add(o.customer_id);
          customers.push({
            id: o.customer_id,
            name: nameMap.get(o.customer_id) || "Customer",
            lat: userLat ?? 0,
            lng: userLng ?? 0,
            distance_km: 0,
            last_order: o.created_at,
          });
          if (customers.length >= 5) break;
        }
        setNearbyCustomers(customers);
      } catch {
        // Non-critical
      }
    })();
  }, [storeId, userLat, userLng]);

  const handleBarcodeScan = useCallback(async () => {
    if (!barcodeInput.trim() || !storeId) return;
    setSyncing(true);
    try {
      // Look up product by barcode/SKU
      const { data: product } = await (supabase as any)
        .from("store_products")
        .select("id, name, price")
        .eq("store_id", storeId)
        .or(`barcode.eq.${barcodeInput},sku.eq.${barcodeInput}`)
        .maybeSingle();

      if (!product) {
        toast.error(`No product found for barcode: ${barcodeInput}`);
        setBarcodeInput("");
        setSyncing(false);
        return;
      }

      // Decrement inventory
      const existing = inventory.find((i) => i.product_id === product.id && i.truck_label === truckLabel);
      if (existing && existing.quantity > 0) {
        await (supabase as any)
          .from("truck_inventory")
          .update({ quantity: existing.quantity - 1 })
          .eq("id", existing.id);

        setInventory((prev) =>
          prev.map((i) =>
            i.id === existing.id ? { ...i, quantity: i.quantity - 1 } : i
          )
        );
        toast.success(`Sold 1x ${product.name} — ${existing.quantity - 1} left`);
      } else {
        toast.error("Out of stock on this truck");
      }
    } catch {
      toast.error("Scan failed");
    }
    setBarcodeInput("");
    setSyncing(false);
  }, [barcodeInput, storeId, inventory, truckLabel]);

  const totalItems = inventory.filter((i) => i.truck_label === truckLabel).reduce((s, i) => s + i.quantity, 0);
  const totalValue = inventory
    .filter((i) => i.truck_label === truckLabel)
    .reduce((s, i) => s + i.quantity * i.price, 0);

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/30 px-4 py-3 pt-safe">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Truck className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold flex-1">Truck Dashboard</h1>
            <Badge variant="outline" className="text-[10px]">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />
              GPS Active
            </Badge>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border/30">
              <CardContent className="p-3 text-center">
                <Package className="h-4 w-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{totalItems}</p>
                <p className="text-[10px] text-muted-foreground">Items</p>
              </CardContent>
            </Card>
            <Card className="border-border/30">
              <CardContent className="p-3 text-center">
                <Users className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                <p className="text-lg font-bold">{nearbyCustomers.length}</p>
                <p className="text-[10px] text-muted-foreground">Customers</p>
              </CardContent>
            </Card>
            <Card className="border-border/30">
              <CardContent className="p-3 text-center">
                <MapPin className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                <p className="text-lg font-bold">${totalValue.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground">Value</p>
              </CardContent>
            </Card>
          </div>

          {/* Barcode Scanner */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Scan className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Quick Scan Sale</p>
              </div>
              <div className="flex gap-2">
                <Input
                  ref={barcodeRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode or enter SKU..."
                  className="flex-1 rounded-xl"
                  onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan()}
                />
                <Button
                  onClick={handleBarcodeScan}
                  disabled={syncing || !barcodeInput}
                  size="sm"
                  className="rounded-xl"
                >
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Scan updates inventory in real-time on the Shop Map
              </p>
            </CardContent>
          </Card>

          {/* Recent Customers */}
          <div>
            <p className="text-sm font-bold mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Recent Customers
            </p>
            {nearbyCustomers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No recent orders yet</p>
            ) : (
              <div className="space-y-2">
                {nearbyCustomers.map((c) => (
                  <Card key={c.id} className="border-border/30">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{c.name}</p>
                        {c.last_order && (
                          <p className="text-[11px] text-muted-foreground">
                            Last order: {new Date(c.last_order).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-xl"
                        onClick={() => navigate("/chat", { state: { openChat: { userId: c.id, userName: c.name } } })}
                      >
                        Message
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Inventory List */}
          <div>
            <p className="text-sm font-bold mb-2 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Truck Inventory
            </p>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : inventory.filter((i) => i.truck_label === truckLabel).length === 0 ? (
              <Card className="border-border/30">
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  No inventory loaded on this truck
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {inventory
                  .filter((i) => i.truck_label === truckLabel)
                  .map((item) => (
                    <Card key={item.id} className="border-border/30">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{item.product_name}</p>
                          <p className="text-[11px] text-muted-foreground">${item.price.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={item.quantity > 5 ? "default" : item.quantity > 0 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {item.quantity} left
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
