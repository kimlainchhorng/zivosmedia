/**
 * EatsRestaurantDashboard - Restaurant owner dashboard for managing menu & orders
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  Plus,
  Trash2,
  Edit,
  DollarSign,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  UtensilsCrossed,
  TrendingUp,
  AlertCircle,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { nativePrompt } from "@/lib/native/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import PullToRefresh from "@/components/shared/PullToRefresh";
import EatsAutoPayoutLedger from "@/components/admin/store/restaurant/EatsAutoPayoutLedger";
import EatsManualPayoutHistory from "@/components/admin/store/restaurant/EatsManualPayoutHistory";
import EatsRequestPayoutSheet from "@/components/admin/store/restaurant/EatsRequestPayoutSheet";
import { useGoBack } from "@/hooks/useGoBack";
import {
  calculateEatsManualPayoutSummary,
  type EatsPayoutLedgerSnapshot,
  type EatsPayoutOrderSnapshot,
  type EatsPayoutRequestSnapshot,
} from "@/lib/eatsPayoutSummary";

// ─── Types ───────────────────────────────────────────────────
interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  is_available: boolean;
}

interface FoodOrder {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_address: string | null;
  special_instructions: string | null;
  payment_type: string | null;
  payment_status: string | null;
  items: any[];
  customer_id: string;
  tracking_code: string | null;
}

// ─── Component ───────────────────────────────────────────────
export default function EatsRestaurantDashboard() {
  const navigate = useNavigate();
  const goBack = useGoBack("/");
  const { user } = useAuth();
  const identityRevisionRef = useRef(0);
  const activeUserIdRef = useRef<string | null>(user?.id ?? null);
  const activeRestaurantIdRef = useRef<string | null>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [restaurantOwnerUserId, setRestaurantOwnerUserId] = useState<
    string | null
  >(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "orders" | "menu" | "stats" | "payouts"
  >("orders");
  const [orderFilter, setOrderFilter] = useState<
    "active" | "completed" | "all"
  >("active");
  const [refreshing, setRefreshing] = useState(false);

  // Menu editing
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image_url: "",
  });
  const [saving, setSaving] = useState(false);

  const isCurrentOwnerRead = useCallback(
    (expectedUserId: string, expectedRevision: number) =>
      activeUserIdRef.current === expectedUserId &&
      identityRevisionRef.current === expectedRevision,
    [],
  );

  const loadMenu = useCallback(
    async (
      restaurantId: string,
      expectedUserId = activeUserIdRef.current,
      expectedRevision = identityRevisionRef.current,
    ) => {
      if (
        !expectedUserId ||
        !isCurrentOwnerRead(expectedUserId, expectedRevision) ||
        activeRestaurantIdRef.current !== restaurantId
      ) {
        return;
      }
      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("category")
        .order("name");
      if (
        !isCurrentOwnerRead(expectedUserId, expectedRevision) ||
        activeRestaurantIdRef.current !== restaurantId
      ) {
        return;
      }
      setMenuItems(
        ((data as any[]) || []).map((d) => ({
          ...d,
          is_available: d.is_available ?? true,
        })),
      );
    },
    [isCurrentOwnerRead],
  );

  const loadOrders = useCallback(
    async (
      restaurantId: string,
      expectedUserId = activeUserIdRef.current,
      expectedRevision = identityRevisionRef.current,
    ) => {
      if (
        !expectedUserId ||
        !isCurrentOwnerRead(expectedUserId, expectedRevision) ||
        activeRestaurantIdRef.current !== restaurantId
      ) {
        return;
      }
      setRefreshing(true);
      // Only show orders the customer has actually paid for (or chose cash on
      // delivery). Pending-payment + processing rows hide so the restaurant
      // doesn't start preparing food on speculation.
      const { data } = await supabase
        .from("food_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .in("payment_status", ["paid", "cash_on_delivery"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (
        !isCurrentOwnerRead(expectedUserId, expectedRevision) ||
        activeRestaurantIdRef.current !== restaurantId
      ) {
        return;
      }
      setOrders(
        ((data as any[]) || []).map((d) => ({ ...d, items: d.items || [] })),
      );
      setRefreshing(false);
    },
    [isCurrentOwnerRead],
  );

  const loadRestaurant = useCallback(
    async (expectedUserId: string, expectedRevision: number) => {
      if (!isCurrentOwnerRead(expectedUserId, expectedRevision)) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("restaurants")
          .select("*")
          .eq("owner_id", expectedUserId)
          .maybeSingle();
        if (!isCurrentOwnerRead(expectedUserId, expectedRevision)) return;
        if (error || !data) {
          activeRestaurantIdRef.current = null;
          setRestaurant(null);
          setRestaurantOwnerUserId(null);
          setMenuItems([]);
          setOrders([]);
          toast.error("No restaurant found for your account");
          return;
        }
        activeRestaurantIdRef.current = data.id;
        setRestaurant(data);
        setRestaurantOwnerUserId(expectedUserId);
        await Promise.all([
          loadMenu(data.id, expectedUserId, expectedRevision),
          loadOrders(data.id, expectedUserId, expectedRevision),
        ]);
      } finally {
        if (isCurrentOwnerRead(expectedUserId, expectedRevision)) {
          setLoading(false);
        }
      }
    },
    [isCurrentOwnerRead, loadMenu, loadOrders],
  );

  // Load restaurant owned by current user
  useEffect(() => {
    const expectedUserId = user?.id ?? null;
    const expectedRevision = identityRevisionRef.current + 1;
    identityRevisionRef.current = expectedRevision;
    activeUserIdRef.current = expectedUserId;
    activeRestaurantIdRef.current = null;
    setRestaurant(null);
    setRestaurantOwnerUserId(null);
    setMenuItems([]);
    setOrders([]);
    setRefreshing(false);
    setActiveTab("orders");
    setEditingItem(null);
    setShowAddItem(false);
    setLoading(!!expectedUserId);

    if (expectedUserId) {
      void loadRestaurant(expectedUserId, expectedRevision);
    }

    return () => {
      if (identityRevisionRef.current === expectedRevision) {
        identityRevisionRef.current += 1;
        activeUserIdRef.current = null;
        activeRestaurantIdRef.current = null;
      }
    };
  }, [loadRestaurant, user?.id]);

  // Auto-refresh orders every 15s
  useEffect(() => {
    if (!restaurant) return;
    const interval = setInterval(() => loadOrders(restaurant.id), 15000);
    return () => clearInterval(interval);
  }, [loadOrders, restaurant]);

  // Realtime subscription for new PAID orders.
  //
  // Previously we toasted on INSERT and re-loaded on every event. That meant
  // restaurants saw orders the customer hadn't actually paid for yet — and
  // started preparing food on speculation. Now we only celebrate when the
  // customer's payment has actually confirmed (paid or cash_on_delivery), and
  // we listen for the UPDATE that flips payment_status, not the initial INSERT.
  useEffect(() => {
    if (!restaurant) return;
    const channel = supabase
      .channel(`restaurant-orders-${restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_orders",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          loadOrders(restaurant.id);

          const before = payload.old as any | null;
          const after = payload.new as any | null;
          const becamePaid =
            after?.payment_status === "paid" &&
            before?.payment_status !== "paid";
          const isCashOnDelivery =
            payload.eventType === "INSERT" &&
            after?.payment_status === "cash_on_delivery";

          if (becamePaid || isCashOnDelivery) {
            toast.info("🔔 New paid order!", {
              description: `Order #${after?.tracking_code || ""} · $${Number(after?.total_amount || 0).toFixed(2)}`,
            });
            try {
              new Audio("/notification.mp3").play().catch(() => {});
            } catch {}
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders, restaurant]);

  const handlePullRefresh = useCallback(async () => {
    if (!restaurant?.id) return;
    await Promise.all([loadMenu(restaurant.id), loadOrders(restaurant.id)]);
  }, [loadMenu, loadOrders, restaurant?.id]);

  // ─── Order Actions ─────────────────────────────────────────
  async function updateOrderStatus(orderId: string, newStatus: string) {
    // Cancellation is special: it has to refund the customer, reverse the
    // auto-transfer, and release the assigned driver. Route it through the
    // edge function instead of a bare DB update.
    if (newStatus === "cancelled") {
      const reason =
        (await nativePrompt("Reason for cancelling? (shown to customer)")) ??
        undefined;
      const { data, error } = await supabase.functions.invoke(
        "restaurant-cancel-order",
        {
          body: { order_id: orderId, reason },
        },
      );
      if (error) {
        toast.error(error.message || "Could not cancel order");
        return;
      }
      if ((data as any)?.error) {
        toast.error((data as any).error);
        return;
      }
      const refundCents = (data as any)?.refund_cents || 0;
      if (refundCents > 0) {
        toast.success("Order cancelled", {
          description: `$${(refundCents / 100).toFixed(2)} refunded to the customer.`,
        });
      } else {
        toast.success("Order cancelled");
      }
      if (restaurant) loadOrders(restaurant.id);
      return;
    }

    const { data, error } = await supabase.functions.invoke(
      "eats-order-state-update",
      {
        body: {
          action: "restaurant_status",
          order_id: orderId,
          order_status: newStatus,
        },
      },
    );
    if (error || !(data as any)?.ok) {
      toast.error("Failed to update order");
    } else {
      toast.success(`Order ${newStatus.replace("_", " ")}`);
      if (restaurant) loadOrders(restaurant.id);
    }
  }

  // ─── Menu Actions ──────────────────────────────────────────
  async function toggleAvailability(item: MenuItem) {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available } as any)
      .eq("id", item.id);
    if (!error) {
      setMenuItems((prev) =>
        prev.map((m) =>
          m.id === item.id ? { ...m, is_available: !m.is_available } : m,
        ),
      );
    }
  }

  async function saveMenuItem() {
    if (!restaurant || !itemForm.name || !itemForm.price) {
      toast.error("Name and price are required");
      return;
    }
    setSaving(true);
    const payload = {
      restaurant_id: restaurant.id,
      name: itemForm.name,
      description: itemForm.description || null,
      price: Math.round(parseFloat(itemForm.price) * 100),
      category: itemForm.category || null,
      image_url: itemForm.image_url || null,
      is_available: true,
    };

    if (editingItem) {
      await supabase
        .from("menu_items")
        .update(payload as any)
        .eq("id", editingItem.id);
      toast.success("Item updated");
    } else {
      await supabase.from("menu_items").insert(payload as any);
      toast.success("Item added");
    }
    setShowAddItem(false);
    setEditingItem(null);
    setItemForm({
      name: "",
      description: "",
      price: "",
      category: "",
      image_url: "",
    });
    await loadMenu(restaurant.id);
    setSaving(false);
  }

  async function deleteMenuItem(id: string) {
    await supabase.from("menu_items").delete().eq("id", id);
    setMenuItems((prev) => prev.filter((m) => m.id !== id));
    toast.success("Item removed");
  }

  function startEdit(item: MenuItem) {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || "",
      price: (item.price / 100).toFixed(2),
      category: item.category || "",
      image_url: item.image_url || "",
    });
    setShowAddItem(true);
  }

  // ─── Derived ──────────────────────────────────────────────
  const activeStatuses = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "out_for_delivery",
  ];
  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "active") return activeStatuses.includes(o.status);
    if (orderFilter === "completed")
      return ["delivered", "cancelled"].includes(o.status);
    return true;
  });

  const todayOrders = orders.filter(
    (o) => new Date(o.created_at).toDateString() === new Date().toDateString(),
  );
  const todayRevenue = todayOrders.reduce(
    (s, o) => s + (o.total_amount || 0),
    0,
  );
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const restaurantIdentityMismatch =
    restaurant !== null && restaurantOwnerUserId !== (user?.id ?? null);

  if (loading || restaurantIdentityMismatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6">
        <ChefHat className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground">
          No Restaurant Found
        </h2>
        <p className="text-muted-foreground text-center text-sm">
          You don't have a restaurant linked to your account yet.
        </p>
        <Button onClick={() => navigate("/eats")} variant="outline">
          Back to Eats
        </Button>
      </div>
    );
  }

  return (
    <PullToRefresh
      onRefresh={handlePullRefresh}
      className="min-h-screen bg-background pb-24"
    >
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            aria-label="Back"
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-ig-gradient truncate">
              {restaurant.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              Restaurant Dashboard
            </p>
          </div>
          <Button
            aria-label="Refresh orders"
            variant="ghost"
            size="icon"
            onClick={() => restaurant && loadOrders(restaurant.id)}
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("w-4 h-4", refreshing && "animate-spin")}
            />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {[
            {
              label: "Today's Orders",
              value: todayOrders.length,
              icon: Package,
              color: "text-blue-500",
            },
            {
              label: "Revenue",
              value: `$${todayRevenue.toFixed(2)}`,
              icon: DollarSign,
              color: "text-emerald-500",
            },
            {
              label: "Pending",
              value: pendingCount,
              icon: AlertCircle,
              color:
                pendingCount > 0 ? "text-amber-500" : "text-muted-foreground",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/40 shrink-0"
            >
              <s.icon className={cn("w-4 h-4", s.color)} />
              <div>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-sm font-bold text-foreground">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full rounded-none bg-transparent border-b border-border/30 px-4">
            <TabsTrigger value="orders" className="flex-1 text-xs">
              Orders
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex-1 text-xs">
              Menu
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-1 text-xs">
              Stats
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex-1 text-xs">
              Payouts
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          {activeTab === "orders" && (
            <motion.div
              key="orders"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Order filter */}
              <div className="flex gap-2 mb-4">
                {(["active", "completed", "all"] as const).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={orderFilter === f ? "default" : "outline"}
                    onClick={() => setOrderFilter(f)}
                    className="text-xs capitalize rounded-full"
                  >
                    {f}
                  </Button>
                ))}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No {orderFilter} orders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={updateOrderStatus}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "menu" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-foreground">
                  {menuItems.length} Items
                </h2>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingItem(null);
                    setItemForm({
                      name: "",
                      description: "",
                      price: "",
                      category: "",
                      image_url: "",
                    });
                    setShowAddItem(true);
                  }}
                  className="rounded-full text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </Button>
              </div>

              {/* Add/Edit Form */}
              <AnimatePresence>
                {showAddItem && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="p-4 rounded-2xl border border-primary/30 bg-card space-y-3">
                      <h3 className="text-sm font-bold text-foreground">
                        {editingItem ? "Edit Item" : "New Menu Item"}
                      </h3>
                      <Input
                        placeholder="Item name"
                        value={itemForm.name}
                        onChange={(e) =>
                          setItemForm((p) => ({ ...p, name: e.target.value }))
                        }
                        className="rounded-xl text-sm"
                      />
                      <Input
                        placeholder="Description"
                        value={itemForm.description}
                        onChange={(e) =>
                          setItemForm((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        className="rounded-xl text-sm"
                      />
                      <div className="flex gap-2">
                        <Input
                          placeholder="Price ($)"
                          type="number"
                          step="0.01"
                          value={itemForm.price}
                          onChange={(e) =>
                            setItemForm((p) => ({
                              ...p,
                              price: e.target.value,
                            }))
                          }
                          className="rounded-xl text-sm flex-1"
                        />
                        <Input
                          placeholder="Category"
                          value={itemForm.category}
                          onChange={(e) =>
                            setItemForm((p) => ({
                              ...p,
                              category: e.target.value,
                            }))
                          }
                          className="rounded-xl text-sm flex-1"
                        />
                      </div>
                      <Input
                        placeholder="Image URL"
                        value={itemForm.image_url}
                        onChange={(e) =>
                          setItemForm((p) => ({
                            ...p,
                            image_url: e.target.value,
                          }))
                        }
                        className="rounded-xl text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={saveMenuItem}
                          disabled={saving}
                          size="sm"
                          className="flex-1 rounded-xl text-xs"
                        >
                          {saving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : editingItem ? (
                            "Update"
                          ) : (
                            "Add"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddItem(false);
                            setEditingItem(null);
                          }}
                          className="rounded-xl text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Menu Items */}
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${(item.price / 100).toFixed(2)} ·{" "}
                        {item.category || "Uncategorized"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={item.is_available}
                        onCheckedChange={() => toggleAvailability(item)}
                      />
                      <Button
                        aria-label="Edit"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(item)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        aria-label="Delete"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteMenuItem(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="space-y-4">
                {[
                  {
                    label: "Total Orders",
                    value: orders.length,
                    icon: Package,
                  },
                  {
                    label: "Delivered",
                    value: orders.filter((o) => o.status === "delivered")
                      .length,
                    icon: CheckCircle,
                  },
                  {
                    label: "Cancelled",
                    value: orders.filter((o) => o.status === "cancelled")
                      .length,
                    icon: XCircle,
                  },
                  {
                    label: "Total Revenue",
                    value: `$${orders
                      .filter((o) => o.status === "delivered")
                      .reduce((s, o) => s + (o.total_amount || 0), 0)
                      .toFixed(2)}`,
                    icon: TrendingUp,
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/40"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <s.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-lg font-bold text-foreground">
                        {s.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "payouts" && restaurant?.id && (
            <motion.div
              key="payouts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <EatsPayoutsPanel
                restaurantId={restaurant.id}
                restaurantCountry={(restaurant as any).market || null}
              />
              <EatsManualPayoutHistory restaurantId={restaurant.id} />
              <EatsAutoPayoutLedger restaurantId={restaurant.id} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PullToRefresh>
  );
}

// ─── Payouts Panel ───────────────────────────────────────────
// list_own_eats_payout_requests deliberately caps each owner-safe page at 100.
// Keep the shared paginator inside that contract so one oversized RPC page
// cannot make the entire verified balance appear unavailable.
const PAYOUT_SUMMARY_PAGE_SIZE = 100;
const PAYOUT_SUMMARY_MAX_PAGES = 200;

async function fetchAllPayoutRows<T>(
  loadPage: (
    from: number,
    to: number,
  ) => Promise<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < PAYOUT_SUMMARY_MAX_PAGES; page += 1) {
    const from = page * PAYOUT_SUMMARY_PAGE_SIZE;
    const { data, error } = await loadPage(
      from,
      from + PAYOUT_SUMMARY_PAGE_SIZE - 1,
    );
    if (error) throw error;
    const pageRows = data || [];
    rows.push(...pageRows);
    if (pageRows.length < PAYOUT_SUMMARY_PAGE_SIZE) return rows;
  }
  throw new Error("The complete payout history is too large to verify safely");
}

function EatsPayoutsPanel({
  restaurantId,
  restaurantCountry,
}: {
  restaurantId: string;
  restaurantCountry: string | null;
}) {
  const [requestOpen, setRequestOpen] = useState(false);

  // This browser summary is display-only. It uses immutable order snapshots and
  // fails closed on inconsistent data; the payout-request RPC repeats the
  // calculation while holding the restaurant lock before inserting anything.
  const {
    data: stats,
    isError: statsError,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["eats-payouts-summary", restaurantId],
    queryFn: async () => {
      try {
        const [orders, ledger, requests] = await Promise.all([
          fetchAllPayoutRows<EatsPayoutOrderSnapshot>((from, to) =>
            (supabase.from("food_orders") as any)
              .select(
                "id,total_amount,currency,status,payment_status,payment_provider,payment_type,last_payment_error,refund_status,refunded_at,payout_hold,payout_eligible_at,commission_percent,commission_amount_cents,restaurant_payout_cents",
              )
              .eq("restaurant_id", restaurantId)
              .in("payment_status", ["paid", "cash_on_delivery"])
              .in("status", ["delivered", "completed", "cancelled"])
              .order("id", { ascending: true })
              .range(from, to),
          ),
          fetchAllPayoutRows<EatsPayoutLedgerSnapshot>((from, to) =>
            (supabase.from("eats_payout_ledger") as any)
              .select(
                "order_id,amount_cents,direction,status,stripe_reversal_id",
              )
              .eq("restaurant_id", restaurantId)
              .order("id", { ascending: true })
              .range(from, to),
          ),
          fetchAllPayoutRows<EatsPayoutRequestSnapshot>((from, to) =>
            (supabase as any).rpc("list_own_eats_payout_requests", {
              p_restaurant_id: restaurantId,
              p_offset: from,
              p_limit: to - from + 1,
            }),
          ),
        ]);

        return calculateEatsManualPayoutSummary(orders, ledger, requests);
      } catch {
        throw new Error("The verified payout balance could not be loaded");
      }
    },
    enabled: !!restaurantId,
    staleTime: 30_000,
  });

  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const commissionLabel = stats?.usesMixedCommissionRates
    ? "order rates"
    : stats?.commissionPercent !== null &&
        stats?.commissionPercent !== undefined
      ? `${stats.commissionPercent.toFixed(stats.commissionPercent % 1 === 0 ? 0 : 2)}%`
      : "no eligible orders";

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              Manual payout request
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Request eligible earnings from delivered PayPal, Square, Wallet,
              or Cash orders after the seven-day refund hold. Stripe-paid orders
              stay on the automatic transfer rail.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setRequestOpen(true)}
            disabled={
              !stats || statsError || stats.availableCents <= 0 || statsFetching
            }
          >
            Request payout
          </Button>
        </div>

        {statsError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-950 dark:text-amber-100"
          >
            <div className="flex gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Payout balance unavailable</p>
                <p className="mt-0.5 opacity-80">
                  No request is enabled until the verified order and payout
                  records load.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={statsFetching}
              onClick={() => void refetchStats()}
            >
              <RefreshCw
                className={cn(
                  "mr-1.5 h-3.5 w-3.5",
                  statsFetching && "animate-spin",
                )}
              />
              Retry
            </Button>
          </div>
        )}

        {!stats && !statsError && statsFetching && (
          <p
            className="flex items-center gap-2 text-xs text-muted-foreground"
            role="status"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Checking the verified payout balance…
          </p>
        )}

        {stats && !statsError && (
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
            <Stat label="Gross eligible" value={money(stats.grossCents)} />
            <Stat
              label={`Platform fee (${commissionLabel})`}
              value={money(stats.platformFeeCents)}
            />
            <Stat
              label="Auto reserved"
              value={money(stats.automaticReservedCents)}
            />
            <Stat
              label="Manual reserved"
              value={money(stats.manualReservedCents)}
            />
            <Stat
              label="Available"
              value={money(stats.availableCents)}
              highlight
            />
          </div>
        )}
      </div>
      {stats && !statsError && (
        <EatsRequestPayoutSheet
          restaurantId={restaurantId}
          restaurantCountry={restaurantCountry}
          availableCents={stats.availableCents}
          open={requestOpen}
          onOpenChange={setRequestOpen}
        />
      )}
    </>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border ${highlight ? "border-primary/30 bg-primary/5" : "border-border/40 bg-muted/20"} p-2`}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`text-sm font-bold tabular-nums ${highlight ? "text-primary" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Order Card Sub-component ────────────────────────────────
function OrderCard({
  order,
  onUpdateStatus,
}: {
  order: FoodOrder;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const statusConfig: Record<
    string,
    { label: string; color: string; next?: { label: string; status: string } }
  > = {
    pending: {
      label: "New Order",
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      next: { label: "Accept", status: "confirmed" },
    },
    confirmed: {
      label: "Confirmed",
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      next: { label: "Start Preparing", status: "preparing" },
    },
    preparing: {
      label: "Preparing",
      color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      next: { label: "Ready for Pickup", status: "ready" },
    },
    ready: {
      label: "Ready",
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    out_for_delivery: {
      label: "Out for Delivery",
      color: "bg-primary/10 text-primary border-primary/20",
    },
    delivered: {
      label: "Delivered",
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    cancelled: {
      label: "Cancelled",
      color: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };

  const config = statusConfig[order.status] || {
    label: order.status,
    color: "bg-muted text-muted-foreground",
  };
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;

  return (
    <div className="p-4 rounded-2xl border border-border/50 bg-card space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            #{order.tracking_code || order.id.slice(0, 8)}
          </p>
          <p className="text-sm font-bold text-foreground">
            {itemCount} item{itemCount !== 1 ? "s" : ""} · $
            {(order.total_amount || 0).toFixed(2)}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-semibold border rounded-full",
            config.color,
          )}
        >
          {config.label}
        </Badge>
      </div>

      {/* Items preview */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        {(order.items as any[]).slice(0, 3).map((item: any, i: number) => (
          <p key={i}>
            {item.quantity || 1}x {item.name || item.menu_item_name || "Item"}
          </p>
        ))}
        {itemCount > 3 && (
          <p className="text-muted-foreground/60">+{itemCount - 3} more</p>
        )}
      </div>

      {order.special_instructions && (
        <p className="text-xs text-amber-600 bg-amber-500/5 px-2 py-1 rounded-lg">
          📝 {order.special_instructions}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
        </span>
        <span className="capitalize">{order.payment_type || "card"}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {config.next && (
          <Button
            size="sm"
            className="flex-1 rounded-xl text-xs font-bold"
            onClick={() => onUpdateStatus(order.id, config.next!.status)}
          >
            {config.next.label}
          </Button>
        )}
        {order.status === "pending" && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs text-destructive border-destructive/30"
            onClick={() => onUpdateStatus(order.id, "cancelled")}
          >
            Reject
          </Button>
        )}
      </div>
    </div>
  );
}
