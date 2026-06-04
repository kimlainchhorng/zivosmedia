/**
 * AutoRepairCustomersSection — customer directory for an auto-repair shop.
 *
 * The generic StoreCustomersSection reads `store_orders`, which the auto-repair
 * vertical never writes to — so it always shows "No customers yet". This view
 * instead aggregates customers from the shop's own documents: invoices,
 * estimates, work orders, and the saved garage (ar_customer_vehicles).
 *
 * A customer must have BOTH a name and a phone to appear here. Rows are deduped
 * by normalized phone digits (the same person is often stored as "2252847565"
 * and "(225) 555-0142"). Each row shows name, phone, and address.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Users, Search, Phone, MapPin, Mail, Car, DollarSign,
  ShoppingBag, TrendingUp, Loader2, Download, ChevronRight, Calendar, Clock,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { motion } from "framer-motion";

interface Props {
  storeId: string;
}

type Customer = {
  key: string;
  name: string;
  phone: string;
  email: string | null;
  addresses: string[];
  vehicles: string[];
  orderCount: number;
  totalSpent: number;
  firstVisit: string;
  lastVisit: string;
  avgOrder: number;
};

const onlyDigits = (s?: string | null) => (s || "").replace(/\D/g, "");

const formatPhone = (s: string) => {
  const d = onlyDigits(s);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1") return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return s;
};

const pushUniq = (arr: string[], v?: string | null) => {
  const t = (v || "").trim();
  if (t && !arr.includes(t)) arr.push(t);
};

export default function AutoRepairCustomersSection({ storeId }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "spent" | "orders">("recent");

  const { data, isLoading } = useQuery({
    queryKey: ["ar-customers", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const [inv, est, wo, veh] = await Promise.all([
        supabase.from("ar_invoices" as any).select("customer_name, customer_phone, customer_address, vehicle_label, total_cents, amount_paid_cents, status, created_at").eq("store_id", storeId),
        supabase.from("ar_estimates" as any).select("customer_name, customer_phone, customer_address, customer_street, customer_city, customer_state, customer_zip, vehicle_label, created_at").eq("store_id", storeId),
        supabase.from("ar_work_orders" as any).select("customer_name, customer_phone, vehicle_label, created_at").eq("store_id", storeId),
        supabase.from("ar_customer_vehicles" as any).select("owner_name, owner_phone, owner_email, year, make, model, created_at").eq("store_id", storeId),
      ]);
      return {
        invoices: (inv.data ?? []) as any[],
        estimates: (est.data ?? []) as any[],
        workorders: (wo.data ?? []) as any[],
        vehicles: (veh.data ?? []) as any[],
      };
    },
  });

  const customers = useMemo(() => {
    const map = new Map<string, Customer>();

    // Add/merge a customer keyed by normalized phone. Requires name AND phone.
    const touch = (name?: string | null, phone?: string | null, createdAt?: string) => {
      const key = onlyDigits(phone);
      const nm = (name || "").trim();
      if (!nm || key.length < 7) return null;
      const ts = createdAt || "";
      let c = map.get(key);
      if (!c) {
        c = { key, name: nm, phone: (phone || "").trim(), email: null, addresses: [], vehicles: [], orderCount: 0, totalSpent: 0, firstVisit: ts, lastVisit: ts, avgOrder: 0 };
        map.set(key, c);
      }
      // Keep the most recent name/phone spelling.
      if (ts && ts > c.lastVisit) { c.lastVisit = ts; if (nm) c.name = nm; if ((phone || "").trim()) c.phone = (phone || "").trim(); }
      if (ts && (!c.firstVisit || ts < c.firstVisit)) c.firstVisit = ts;
      return c;
    };

    for (const o of data?.invoices ?? []) {
      const c = touch(o.customer_name, o.customer_phone, o.created_at);
      if (!c) continue;
      c.orderCount++;
      c.totalSpent += (o.total_cents || 0) / 100;
      pushUniq(c.addresses, o.customer_address);
      pushUniq(c.vehicles, o.vehicle_label);
    }
    for (const e of data?.estimates ?? []) {
      const c = touch(e.customer_name, e.customer_phone, e.created_at);
      if (!c) continue;
      pushUniq(c.addresses, e.customer_address || [e.customer_street, e.customer_city, e.customer_state, e.customer_zip].filter(Boolean).join(", "));
      pushUniq(c.vehicles, e.vehicle_label);
    }
    for (const w of data?.workorders ?? []) {
      const c = touch(w.customer_name, w.customer_phone, w.created_at);
      if (!c) continue;
      pushUniq(c.vehicles, w.vehicle_label);
    }
    for (const v of data?.vehicles ?? []) {
      const c = touch(v.owner_name, v.owner_phone, v.created_at);
      if (!c) continue;
      if (v.owner_email && !c.email) c.email = v.owner_email;
      pushUniq(c.vehicles, [v.year, v.make, v.model].filter(Boolean).join(" "));
    }

    let list = Array.from(map.values());
    for (const c of list) c.avgOrder = c.orderCount > 0 ? c.totalSpent / c.orderCount : 0;

    if (search.trim()) {
      const q = search.toLowerCase();
      const qd = onlyDigits(search);
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (qd.length >= 3 && c.key.includes(qd)) ||
        c.addresses.some((a) => a.toLowerCase().includes(q)) ||
        c.vehicles.some((v) => v.toLowerCase().includes(q)),
      );
    }

    if (sortBy === "spent") list.sort((a, b) => b.totalSpent - a.totalSpent);
    else if (sortBy === "orders") list.sort((a, b) => b.orderCount - a.orderCount);
    else list.sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

    return list;
  }, [data, search, sortBy]);

  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalOrders = customers.reduce((s, c) => s + c.orderCount, 0);
    const revenue = customers.reduce((s, c) => s + c.totalSpent, 0);
    const repeat = customers.filter((c) => c.orderCount > 1).length;
    const repeatRate = totalCustomers > 0 ? Math.round((repeat / totalCustomers) * 100) : 0;
    return { totalCustomers, totalOrders, revenue, repeatRate };
  }, [customers]);

  const tierOf = (c: Customer) => {
    if (c.totalSpent >= 2000 || c.orderCount >= 10) return { label: "VIP", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    if (c.totalSpent >= 500 || c.orderCount >= 4) return { label: "Regular", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
    if (c.orderCount >= 2) return { label: "Returning", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
    return { label: "New", color: "bg-muted text-muted-foreground" };
  };

  const exportCSV = () => {
    const headers = ["Name", "Phone", "Address", "Vehicles", "Orders", "Total Spent", "Last Visit"];
    const rows = customers.map((c) => [
      c.name, formatPhone(c.phone), c.addresses[0] || "", c.vehicles.join(" | "),
      c.orderCount, c.totalSpent.toFixed(2), c.lastVisit ? format(parseISO(c.lastVisit), "yyyy-MM-dd") : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "customers.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Customers", value: stats.totalCustomers, icon: Users, color: "bg-primary/10 text-primary" },
          { label: "Total Orders", value: stats.totalOrders, icon: ShoppingBag, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
          { label: "Revenue", value: `$${stats.revenue.toFixed(0)}`, icon: DollarSign, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
          { label: "Repeat Rate", value: `${stats.repeatRate}%`, icon: TrendingUp, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & sort */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, or address..." className="pl-9" />
            </div>
            <div className="flex gap-2">
              {(["recent", "spent", "orders"] as const).map((s) => (
                <Button key={s} size="sm" variant={sortBy === s ? "default" : "outline"} onClick={() => setSortBy(s)} className="text-xs">
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

      {/* List */}
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
              {search ? "Try a different search term" : "Add a customer with a name and phone in Build R.O. and they'll appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {customers.map((c, i) => {
            const tier = tierOf(c);
            const days = c.lastVisit ? differenceInDays(new Date(), parseISO(c.lastVisit)) : null;
            const addr = c.addresses[0];
            return (
              <motion.div key={c.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(c)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">{c.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm truncate">{c.name}</p>
                            <Badge variant="secondary" className={`text-[10px] ${tier.color}`}>{tier.label}</Badge>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
                            <Phone className="w-3 h-3 shrink-0" /><span className="truncate">{formatPhone(c.phone)}</span>
                          </div>
                          {addr && (
                            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
                              <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{addr}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                            {c.vehicles[0] && (
                              <span className="flex items-center gap-1 min-w-0">
                                <Car className="w-3 h-3 shrink-0" />
                                <span className="truncate">{c.vehicles[0]}{c.vehicles.length > 1 ? ` +${c.vehicles.length - 1}` : ""}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1 shrink-0"><ShoppingBag className="w-3 h-3" />{c.orderCount}</span>
                            <span className="flex items-center gap-1 shrink-0"><DollarSign className="w-3 h-3" />{c.totalSpent.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-muted-foreground">
                          {days == null ? "" : days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days}d ago`}
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

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {selected && (() => {
            const c = selected;
            const tier = tierOf(c);
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
                      <p className="text-xs text-muted-foreground font-normal">{formatPhone(c.phone)}</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center p-3 rounded-xl bg-muted/50"><p className="text-lg font-bold">{c.orderCount}</p><p className="text-[10px] text-muted-foreground">Orders</p></div>
                  <div className="text-center p-3 rounded-xl bg-muted/50"><p className="text-lg font-bold">${c.totalSpent.toFixed(0)}</p><p className="text-[10px] text-muted-foreground">Total</p></div>
                  <div className="text-center p-3 rounded-xl bg-muted/50"><p className="text-lg font-bold">${c.avgOrder.toFixed(0)}</p><p className="text-[10px] text-muted-foreground">Avg</p></div>
                </div>

                <div className="space-y-2 mt-3 text-xs text-muted-foreground">
                  {c.addresses.length > 0 && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <div>{c.addresses.slice(0, 3).map((a, i) => <p key={i}>{a}</p>)}</div>
                    </div>
                  )}
                  {c.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /><span>{c.email}</span></div>}
                  {c.firstVisit && <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /><span>Customer since {format(parseISO(c.firstVisit), "MMM d, yyyy")}</span></div>}
                  {c.lastVisit && <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /><span>Last visit {format(parseISO(c.lastVisit), "MMM d, yyyy")}</span></div>}
                </div>

                {c.vehicles.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold mb-1.5">Vehicles</p>
                    <div className="flex flex-wrap gap-1">
                      {c.vehicles.slice(0, 8).map((v) => (
                        <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground flex items-center gap-1">
                          <Car className="w-2.5 h-2.5" />{v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => window.open(`tel:${c.phone}`)}>
                    <Phone className="w-3.5 h-3.5" /> Call
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => window.open(`sms:${c.phone}`)}>
                    <Mail className="w-3.5 h-3.5" /> Text
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
