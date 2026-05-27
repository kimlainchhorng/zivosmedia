/**
 * StoreCustomersSection — Real customer directory from store_orders.
 * Shows aggregated customer data, order history, and engagement stats.
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Users, ShoppingBag, Eye, TrendingUp, Search, Phone, MapPin,
  Mail, Calendar, DollarSign, Package, Clock, ArrowUpRight,
  Star, User, ChevronRight, Loader2, Download, Filter
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { motion } from "framer-motion";

interface Props {
  storeId: string;
}

interface StoreOrder {
  id: string;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  total_cents: number;
  subtotal_cents: number;
  items: any[];
  delivery_address: string | null;
  created_at: string;
}

interface CustomerProfile {
  id: string;
  name: string;
  phone: string | null;
  orderCount: number;
  totalSpent: number;
  avgOrder: number;
  lastOrderDate: string;
  firstOrderDate: string;
  addresses: string[];
  statuses: Record<string, number>;
  items: string[];
}

export default function StoreCustomersSection({ storeId }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "spent" | "orders">("recent");

  // Fetch all orders for this store
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["store-customers-orders", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_orders")
        .select("id, customer_id, customer_name, customer_phone, status, total_cents, subtotal_cents, items, delivery_address, created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StoreOrder[];
    },
    enabled: !!storeId,
  });

  // Aggregate orders into customer profiles
  const customers = useMemo(() => {
    const map = new Map<string, CustomerProfile>();

    for (const order of orders) {
      const cid = order.customer_id;
      if (!map.has(cid)) {
        map.set(cid, {
          id: cid,
          name: order.customer_name || "Unknown Customer",
          phone: order.customer_phone,
          orderCount: 0,
          totalSpent: 0,
          avgOrder: 0,
          lastOrderDate: order.created_at,
          firstOrderDate: order.created_at,
          addresses: [],
          statuses: {},
          items: [],
        });
      }
      const c = map.get(cid)!;
      c.orderCount++;
      c.totalSpent += (order.total_cents || 0) / 100;
      if (order.customer_name && c.name === "Unknown Customer") c.name = order.customer_name;
      if (order.customer_phone && !c.phone) c.phone = order.customer_phone;
      if (order.created_at > c.lastOrderDate) c.lastOrderDate = order.created_at;
      if (order.created_at < c.firstOrderDate) c.firstOrderDate = order.created_at;
      if (order.delivery_address && !c.addresses.includes(order.delivery_address)) {
        c.addresses.push(order.delivery_address);
      }
      c.statuses[order.status] = (c.statuses[order.status] || 0) + 1;
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const name = item?.name || item?.id;
          if (name && !c.items.includes(name)) c.items.push(name);
        });
      }
    }

    // Calculate averages
    for (const c of map.values()) {
      c.avgOrder = c.orderCount > 0 ? c.totalSpent / c.orderCount : 0;
    }

    let list = Array.from(map.values());

    // Filter
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.addresses.some(a => a.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortBy === "spent") list.sort((a, b) => b.totalSpent - a.totalSpent);
    else if (sortBy === "orders") list.sort((a, b) => b.orderCount - a.orderCount);
    else list.sort((a, b) => b.lastOrderDate.localeCompare(a.lastOrderDate));

    return list;
  }, [orders, search, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + (o.total_cents || 0) / 100, 0);
    const repeatCustomers = customers.filter(c => c.orderCount > 1).length;
    const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
    return { totalCustomers, totalOrders, totalRevenue, repeatRate };
  }, [customers, orders]);

  const getCustomerTier = (c: CustomerProfile) => {
    if (c.totalSpent >= 500 || c.orderCount >= 20) return { label: "VIP", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    if (c.totalSpent >= 200 || c.orderCount >= 10) return { label: "Regular", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
    if (c.orderCount >= 3) return { label: "Returning", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
    return { label: "New", color: "bg-muted text-muted-foreground" };
  };

  const daysSinceLast = (date: string) => differenceInDays(new Date(), parseISO(date));

  const exportCSV = () => {
    const headers = ["Name", "Phone", "Orders", "Total Spent", "Avg Order", "Last Order", "First Order"];
    const rows = customers.map(c => [
      c.name, c.phone || "", c.orderCount, `$${c.totalSpent.toFixed(2)}`,
      `$${c.avgOrder.toFixed(2)}`, format(parseISO(c.lastOrderDate), "yyyy-MM-dd"),
      format(parseISO(c.firstOrderDate), "yyyy-MM-dd"),
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "customers.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Customers", value: stats.totalCustomers, icon: Users, color: "bg-primary/10 text-primary" },
          { label: "Total Orders", value: stats.totalOrders, icon: ShoppingBag, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
          { label: "Revenue", value: `$${stats.totalRevenue.toFixed(0)}`, icon: DollarSign, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
          { label: "Repeat Rate", value: `${stats.repeatRate}%`, icon: TrendingUp, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>
                <s.icon className="w-4.5 h-4.5" />
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone, or address..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {(["recent", "spent", "orders"] as const).map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant={sortBy === s ? "default" : "outline"}
                  onClick={() => setSortBy(s)}
                  className="text-xs"
                >
                  {s === "recent" ? "Recent" : s === "spent" ? "Top Spenders" : "Most Orders"}
                </Button>
              ))}
              {customers.length > 0 && (
                <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> Export
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <p className="font-medium text-sm">{search ? "No customers found" : "No customers yet"}</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {search ? "Try a different search term" : "Customers who order from your store will appear here automatically"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {customers.map((c, i) => {
            const tier = getCustomerTier(c);
            const days = daysSinceLast(c.lastOrderDate);
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm truncate">{c.name}</p>
                            <Badge variant="secondary" className={`text-[10px] ${tier.color}`}>{tier.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                            {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                            <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{c.orderCount} orders</span>
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${c.totalSpent.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-muted-foreground">
                          {days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days}d ago`}
                        </p>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 ml-auto mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {selectedCustomer && (() => {
            const c = selectedCustomer;
            const tier = getCustomerTier(c);
            const customerOrders = orders.filter(o => o.customer_id === c.id).slice(0, 10);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{c.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        <Badge variant="secondary" className={`text-[10px] ${tier.color}`}>{tier.label}</Badge>
                      </div>
                      {c.phone && <p className="text-xs text-muted-foreground font-normal">{c.phone}</p>}
                    </div>
                  </DialogTitle>
                </DialogHeader>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center p-3 rounded-xl bg-muted/50">
                    <p className="text-lg font-bold">{c.orderCount}</p>
                    <p className="text-[10px] text-muted-foreground">Orders</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-muted/50">
                    <p className="text-lg font-bold">${c.totalSpent.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">Total Spent</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-muted/50">
                    <p className="text-lg font-bold">${c.avgOrder.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">Avg Order</p>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Customer since {format(parseISO(c.firstOrderDate), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last order {format(parseISO(c.lastOrderDate), "MMM d, yyyy")}</span>
                  </div>
                  {c.addresses.length > 0 && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <div>
                        {c.addresses.slice(0, 3).map((a, i) => (
                          <p key={i} className="truncate">{a}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Frequently Ordered */}
                {c.items.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold mb-1.5">Frequently Ordered</p>
                    <div className="flex flex-wrap gap-1">
                      {c.items.slice(0, 8).map(item => (
                        <span key={item} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{item}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Contact */}
                {c.phone && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => window.open(`tel:${c.phone}`)}>
                      <Phone className="w-3.5 h-3.5" /> Call
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => window.open(`sms:${c.phone}`)}>
                      <Mail className="w-3.5 h-3.5" /> Text
                    </Button>
                  </div>
                )}

                {/* Recent Orders */}
                <div className="mt-3">
                  <p className="text-xs font-semibold mb-2">Recent Orders</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {customerOrders.map(o => (
                      <div key={o.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40 text-xs">
                        <div>
                          <p className="font-medium">{format(parseISO(o.created_at), "MMM d, h:mm a")}</p>
                          <p className="text-muted-foreground">{Array.isArray(o.items) ? o.items.length : 0} items</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${((o.total_cents || 0) / 100).toFixed(2)}</p>
                          <Badge variant="secondary" className="text-[9px]">{o.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
