import {
  ArrowLeft,
  Users,
  Truck,
  Clock3,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  X,
  Calendar,
  Shield,
  Pencil,
  Trash2,
  Phone,
  Mail,
  DollarSign,
  ChevronRight,
  Power,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendMetaConversionEvent } from "@/services/metaConversion";
import { cn } from "@/lib/utils";

type EmployeeRole = "owner" | "manager" | "cashier" | "staff";
type EmployeeStatus = "active" | "inactive";

interface EmployeeRow {
  id: string;
  name: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  user_id: string | null;
  email: string | null;
  phone: string | null;
  hourly_rate: number | null;
  notes: string | null;
  assigned_truck_label: string | null;
}

interface InventoryRow {
  id: string;
  truck_label: string;
  product_id: string;
  quantity: number;
}

interface ProductRow {
  id: string;
  name: string;
  price: number;
}

interface ClockLogRow {
  employee_id: string;
  action: "clock_in" | "clock_out";
  created_at: string;
}

interface SaleRow {
  driver_user_id: string | null;
  total_amount: number;
  created_at: string;
}

interface OfflineSaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

interface OfflineSale {
  store_id: string;
  driver_user_id: string;
  truck_label: string;
  currency: string;
  total_amount: number;
  items: OfflineSaleItem[];
}

interface EmployeeFormState {
  name: string;
  role: EmployeeRole;
  email: string;
  phone: string;
  hourly_rate: string;
  notes: string;
  assigned_truck_label: string;
}

const OFFLINE_QUEUE_KEY = "zivo-truck-offline-sales";
const ROLE_OPTIONS: EmployeeRole[] = ["owner", "manager", "cashier", "staff"];

const ROLE_BADGE: Record<EmployeeRole, string> = {
  owner: "bg-purple-500/15 text-purple-600 dark:text-purple-300",
  manager: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  cashier: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  staff: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

function startOfThisWeekISO() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.toISOString();
}

function computeWeeklyHours(logs: ClockLogRow[]): Map<string, number> {
  const grouped = new Map<string, ClockLogRow[]>();
  for (const log of logs) {
    if (!grouped.has(log.employee_id)) grouped.set(log.employee_id, []);
    grouped.get(log.employee_id)!.push(log);
  }
  const result = new Map<string, number>();
  for (const [empId, items] of grouped) {
    const sorted = [...items].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    let totalMs = 0;
    let openIn: number | null = null;
    for (const item of sorted) {
      const t = new Date(item.created_at).getTime();
      if (item.action === "clock_in") {
        openIn = t;
      } else if (item.action === "clock_out" && openIn !== null) {
        totalMs += t - openIn;
        openIn = null;
      }
    }
    if (openIn !== null) totalMs += Date.now() - openIn;
    result.set(empId, Math.max(0, totalMs / 3_600_000));
  }
  return result;
}

const EMPTY_FORM: EmployeeFormState = {
  name: "",
  role: "staff",
  email: "",
  phone: "",
  hourly_rate: "",
  notes: "",
  assigned_truck_label: "",
};

export default function ShopEmployeesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [clockLogs, setClockLogs] = useState<ClockLogRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<string>("default");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [sellQty, setSellQty] = useState<number>(1);

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(EMPTY_FORM);
  const [savingEmployee, setSavingEmployee] = useState(false);

  const trucks = useMemo(() => {
    const labels = [...new Set(inventory.map((row) => row.truck_label))];
    return labels.length ? labels : ["default"];
  }, [inventory]);

  const visibleInventory = useMemo(() => {
    return inventory
      .filter((row) => row.truck_label === selectedTruck)
      .map((row) => ({
        ...row,
        product: products.find((p) => p.id === row.product_id),
      }));
  }, [inventory, products, selectedTruck]);

  const weeklyHoursByEmployee = useMemo(() => computeWeeklyHours(clockLogs), [clockLogs]);

  const weeklySalesByUser = useMemo(() => {
    const result = new Map<string, number>();
    for (const sale of sales) {
      if (!sale.driver_user_id) continue;
      result.set(sale.driver_user_id, (result.get(sale.driver_user_id) ?? 0) + Number(sale.total_amount || 0));
    }
    return result;
  }, [sales]);

  const totalWeeklySales = useMemo(
    () => sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0),
    [sales],
  );

  const activeCount = employees.filter((e) => e.status === "active").length;

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id || null;
      setCurrentUserId(uid);
      if (!uid) return;

      const { data: store } = await (supabase as any)
        .from("store_profiles")
        .select("id")
        .eq("owner_id", uid)
        .limit(1)
        .maybeSingle();

      const effectiveStoreId = store?.id || null;
      setStoreId(effectiveStoreId);
      if (!effectiveStoreId) return;

      const weekStart = startOfThisWeekISO();
      const [
        { data: employeeData },
        { data: inventoryData },
        { data: productData },
        { data: clockData },
        { data: salesData },
      ] = await Promise.all([
        (supabase as any)
          .from("store_employees")
          .select("id, name, role, status, user_id, email, phone, hourly_rate, notes, assigned_truck_label")
          .eq("store_id", effectiveStoreId)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("truck_inventory")
          .select("id, truck_label, product_id, quantity")
          .eq("store_id", effectiveStoreId),
        (supabase as any)
          .from("store_products")
          .select("id, name, price")
          .eq("store_id", effectiveStoreId)
          .eq("in_stock", true),
        (supabase as any)
          .from("employee_clock_logs")
          .select("employee_id, action, created_at")
          .eq("store_id", effectiveStoreId)
          .gte("created_at", weekStart),
        (supabase as any)
          .from("truck_sales")
          .select("driver_user_id, total_amount, created_at")
          .eq("store_id", effectiveStoreId)
          .eq("status", "completed")
          .gte("created_at", weekStart),
      ]);

      setEmployees((employeeData || []) as EmployeeRow[]);
      setInventory((inventoryData || []) as InventoryRow[]);
      setProducts((productData || []) as ProductRow[]);
      setClockLogs((clockData || []) as ClockLogRow[]);
      setSales((salesData || []) as SaleRow[]);

      if ((productData || []).length) {
        setSelectedProductId((productData || [])[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const queueOfflineSale = async (sale: OfflineSale) => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]") as OfflineSale[];
    queue.push(sale);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    await (supabase as any).from("truck_offline_sales_queue").insert({
      store_id: sale.store_id,
      driver_user_id: sale.driver_user_id,
      payload: sale,
      sync_status: "pending",
    });
  };

  const submitSale = async (sale: OfflineSale) => {
    const { data: saleRow, error: saleErr } = await (supabase as any)
      .from("truck_sales")
      .insert({
        store_id: sale.store_id,
        driver_user_id: sale.driver_user_id,
        truck_label: sale.truck_label,
        currency: sale.currency,
        total_amount: sale.total_amount,
        subtotal: sale.total_amount,
        status: "completed",
        is_offline_synced: true,
      })
      .select("id")
      .single();
    if (saleErr || !saleRow?.id) throw saleErr || new Error("Failed to create sale");
    const itemsPayload = sale.items.map((item) => ({
      sale_id: saleRow.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));
    const { error: itemErr } = await (supabase as any).from("truck_sale_items").insert(itemsPayload);
    if (itemErr) throw itemErr;
  };

  const syncOfflineSales = async () => {
    if (!isOnline) {
      toast.error("No signal. Offline sales will sync automatically once online.");
      return;
    }
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]") as OfflineSale[];
    if (!queue.length) {
      toast.success("No pending offline sales.");
      return;
    }
    setSyncing(true);
    const remaining: OfflineSale[] = [];
    let syncedCount = 0;
    for (const sale of queue) {
      try {
        await submitSale(sale);
        syncedCount++;
        try {
          await sendMetaConversionEvent({
            eventName: "Purchase",
            eventId: `offline-sync-${Date.now()}-${syncedCount}`,
            externalId: sale.driver_user_id,
            value: sale.total_amount,
            currency: sale.currency,
            sourceType: "truck_sale",
            sourceTable: "truck_sales",
            payload: { offline_synced: true, truck_label: sale.truck_label },
          });
        } catch {
          // Meta event failure shouldn't block sync
        }
      } catch {
        remaining.push(sale);
      }
    }
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    setSyncing(false);
    toast.success(remaining.length ? `${syncedCount} synced, ${remaining.length} still pending` : "All offline sales synced.");
    loadData();
  };

  const handleClock = async (action: "clock_in" | "clock_out") => {
    if (!storeId || !currentUserId) return;
    const employee = employees.find((e) => e.user_id === currentUserId);
    if (!employee) {
      toast.error("Your employee profile is not linked yet.");
      return;
    }
    const insertClock = async (lat?: number, lng?: number, gpsVerified = false) => {
      await (supabase as any).from("employee_clock_logs").insert({
        store_id: storeId,
        employee_id: employee.id,
        employee_user_id: currentUserId,
        action,
        latitude: lat ?? null,
        longitude: lng ?? null,
        gps_verified: gpsVerified,
      });
      toast.success(action === "clock_in" ? "Clocked in" : "Clocked out");
      loadData();
    };
    if (!navigator.geolocation) {
      await insertClock(undefined, undefined, false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await insertClock(pos.coords.latitude, pos.coords.longitude, true);
      },
      async () => {
        await insertClock(undefined, undefined, false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleSellNow = async () => {
    if (!storeId || !currentUserId || !selectedProductId || sellQty < 1) {
      toast.error("Select product and quantity first.");
      return;
    }
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) {
      toast.error("Product not found.");
      return;
    }
    const sale: OfflineSale = {
      store_id: storeId,
      driver_user_id: currentUserId,
      truck_label: selectedTruck,
      currency: "USD",
      total_amount: Number(product.price) * sellQty,
      items: [{ product_id: selectedProductId, quantity: sellQty, unit_price: Number(product.price) }],
    };
    try {
      if (isOnline) {
        await submitSale(sale);
        toast.success("Sale completed and inventory deducted.");
      } else {
        await queueOfflineSale(sale);
        toast.success("No signal: sale saved locally for auto-sync.");
      }
      setSellQty(1);
      loadData();
    } catch {
      await queueOfflineSale(sale);
      toast.success("Sale queued for sync.");
    }
  };

  const pendingOfflineCount = useMemo(() => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]") as OfflineSale[];
    return queue.length;
  }, [loading, syncing, isOnline]);

  // ─── Employee CRUD ────────────────────────────────────────────────
  const openAddEmployee = () => {
    setEditingEmployeeId(null);
    setForm(EMPTY_FORM);
    setShowEmployeeForm(true);
  };

  const openEditEmployee = (emp: EmployeeRow) => {
    setEditingEmployeeId(emp.id);
    setForm({
      name: emp.name ?? "",
      role: (emp.role as EmployeeRole) ?? "staff",
      email: emp.email ?? "",
      phone: emp.phone ?? "",
      hourly_rate: emp.hourly_rate != null ? String(emp.hourly_rate) : "",
      notes: emp.notes ?? "",
      assigned_truck_label: emp.assigned_truck_label ?? "",
    });
    setShowEmployeeForm(true);
  };

  const closeEmployeeForm = () => {
    setShowEmployeeForm(false);
    setEditingEmployeeId(null);
    setForm(EMPTY_FORM);
  };

  const saveEmployee = async () => {
    if (!storeId) return;
    const name = form.name.trim();
    if (!name) {
      toast.error("Name is required.");
      return;
    }
    setSavingEmployee(true);
    const payload: Record<string, unknown> = {
      name,
      role: form.role,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      notes: form.notes.trim() || null,
      assigned_truck_label: form.assigned_truck_label.trim() || null,
    };
    try {
      if (editingEmployeeId) {
        const { error } = await (supabase as any)
          .from("store_employees")
          .update(payload)
          .eq("id", editingEmployeeId)
          .eq("store_id", storeId);
        if (error) throw error;
        toast.success(`${name} updated`);
      } else {
        const { error } = await (supabase as any)
          .from("store_employees")
          .insert({ ...payload, store_id: storeId, status: "active" });
        if (error) throw error;
        toast.success(`${name} added to team`);
      }
      closeEmployeeForm();
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Could not save employee.");
    } finally {
      setSavingEmployee(false);
    }
  };

  const toggleStatus = async (emp: EmployeeRow) => {
    const next: EmployeeStatus = emp.status === "active" ? "inactive" : "active";
    const { error } = await (supabase as any)
      .from("store_employees")
      .update({ status: next })
      .eq("id", emp.id);
    if (error) {
      toast.error("Could not update status.");
      return;
    }
    toast.success(`${emp.name} marked ${next}`);
    loadData();
  };

  const deleteEmployee = async (emp: EmployeeRow) => {
    if (!confirm(`Remove ${emp.name} from the team? This can't be undone.`)) return;
    const { error } = await (supabase as any).from("store_employees").delete().eq("id", emp.id);
    if (error) {
      toast.error("Could not remove employee.");
      return;
    }
    toast.success(`${emp.name} removed`);
    loadData();
  };

  return (
    <AppLayout title="Employees" hideHeader>
      <div className="flex flex-col px-4 pt-3 pb-24 max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-5">
          <button type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-[17px] flex-1">Employees</h1>
          <Button size="sm" className="h-8 gap-1.5" onClick={openAddEmployee}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading team and truck mode...</div>
        ) : !storeId ? (
          <div className="text-sm text-muted-foreground">No owner store found for this account.</div>
        ) : (
          <div className="space-y-4">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Team</p>
                <p className="font-bold text-[18px]">{employees.length}</p>
                <p className="text-[10px] text-muted-foreground">{activeCount} active</p>
              </Card>
              <Card className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Hours wk</p>
                <p className="font-bold text-[18px]">
                  {Array.from(weeklyHoursByEmployee.values()).reduce((s, v) => s + v, 0).toFixed(1)}
                </p>
                <p className="text-[10px] text-muted-foreground">all employees</p>
              </Card>
              <Card className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sales wk</p>
                <p className="font-bold text-[18px]">${totalWeeklySales.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground">truck only</p>
              </Card>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-2">
              <button type="button"
                onClick={() => navigate("/shop-dashboard/employee-schedule")}
                className="flex items-center gap-2 rounded-2xl border border-border/30 bg-card p-3 active:scale-[0.98] transition-transform text-left"
              >
                <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px]">Schedule</p>
                  <p className="text-[11px] text-muted-foreground truncate">Weekly shifts</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              </button>
              <button type="button"
                onClick={() => navigate("/shop-dashboard/employee-rules")}
                className="flex items-center gap-2 rounded-2xl border border-border/30 bg-card p-3 active:scale-[0.98] transition-transform text-left"
              >
                <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px]">Rules</p>
                  <p className="text-[11px] text-muted-foreground truncate">Workplace policy</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              </button>
            </div>

            {/* Driver / Truck Mode */}
            <div className="rounded-2xl border border-border/30 p-3 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold">Driver / Truck Mode</p>
                </div>
                <div className="flex items-center gap-2">
                  {isOnline ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-amber-500" />}
                  <button type="button"
                    onClick={syncOfflineSales}
                    className="text-xs px-2 py-1 rounded-md border border-border/40 flex items-center gap-1"
                    disabled={syncing}
                  >
                    <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} /> Sync ({pendingOfflineCount})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button type="button"
                  onClick={() => handleClock("clock_in")}
                  className="h-9 rounded-lg bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Clock3 className="w-3.5 h-3.5" /> Clock In (GPS)
                </button>
                <button type="button"
                  onClick={() => handleClock("clock_out")}
                  className="h-9 rounded-lg bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Clock3 className="w-3.5 h-3.5" /> Clock Out (GPS)
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <select
                  value={selectedTruck}
                  onChange={(e) => setSelectedTruck(e.target.value)}
                  className="h-9 rounded-lg border border-border/40 bg-background px-2 text-xs"
                >
                  {trucks.map((truck) => (
                    <option key={truck} value={truck}>
                      {truck}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="h-9 rounded-lg border border-border/40 bg-background px-2 text-xs"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={sellQty}
                  onChange={(e) => setSellQty(Math.max(1, Number(e.target.value) || 1))}
                  className="h-9 rounded-lg border border-border/40 bg-background px-2 text-xs"
                />
              </div>

              <button type="button" onClick={handleSellNow} className="mt-2 h-9 w-full rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                Sell From Truck
              </button>
            </div>

            <div className="rounded-2xl border border-border/30 p-3 bg-card">
              <p className="text-sm font-semibold mb-2">On-Truck Inventory</p>
              {visibleInventory.length === 0 ? (
                <p className="text-xs text-muted-foreground">No inventory loaded for this truck yet.</p>
              ) : (
                <div className="space-y-2">
                  {visibleInventory.map((row) => (
                    <div key={row.id} className="flex items-center justify-between text-xs bg-muted/30 rounded-lg px-2 py-1.5">
                      <span>{row.product?.name || row.product_id}</span>
                      <span className="font-semibold">Qty {row.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Team list */}
            <div className="rounded-2xl border border-border/30 p-3 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <p className="text-sm font-semibold">Team</p>
                </div>
                <button type="button"
                  onClick={openAddEmployee}
                  className="text-[11px] font-semibold text-primary flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add employee
                </button>
              </div>

              {employees.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-[13px] font-medium mb-1">No employees yet</p>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Add your first team member to track hours, sales, and pay.
                  </p>
                  <Button size="sm" onClick={openAddEmployee} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add first employee
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {employees.map((employee) => {
                    const hours = weeklyHoursByEmployee.get(employee.id) ?? 0;
                    const empSales = employee.user_id ? weeklySalesByUser.get(employee.user_id) ?? 0 : 0;
                    const earned = hours * Number(employee.hourly_rate ?? 0);
                    return (
                      <div
                        key={employee.id}
                        className={cn(
                          "rounded-xl border border-border/30 bg-muted/20 p-3 transition-opacity",
                          employee.status === "inactive" && "opacity-50",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => navigate(`/shop-dashboard/employees/${employee.id}`)}
                          className="flex items-start gap-3 w-full text-left active:opacity-80"
                        >
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary text-[13px] font-bold flex items-center justify-center shrink-0">
                            {employee.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-[13px] truncate">{employee.name}</p>
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide", ROLE_BADGE[employee.role])}>
                                {employee.role}
                              </span>
                              {employee.user_id && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                                  linked
                                </span>
                              )}
                              {employee.assigned_truck_label && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 flex items-center gap-1">
                                  <Truck className="w-3 h-3" /> {employee.assigned_truck_label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                              {employee.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {employee.phone}
                                </span>
                              )}
                              {employee.email && (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="w-3 h-3" /> {employee.email}
                                </span>
                              )}
                              {employee.hourly_rate != null && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  {Number(employee.hourly_rate).toFixed(2)}/hr
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <div className="rounded-lg bg-background/60 px-2 py-1 border border-border/30">
                                <p className="text-[10px] text-muted-foreground">Hours</p>
                                <p className="font-bold text-[12px]">{hours.toFixed(1)}</p>
                              </div>
                              <div className="rounded-lg bg-background/60 px-2 py-1 border border-border/30">
                                <p className="text-[10px] text-muted-foreground">Sales</p>
                                <p className="font-bold text-[12px]">${empSales.toFixed(0)}</p>
                              </div>
                              <div className="rounded-lg bg-background/60 px-2 py-1 border border-border/30">
                                <p className="text-[10px] text-muted-foreground">Earned</p>
                                <p className="font-bold text-[12px]">${earned.toFixed(0)}</p>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 mt-1" />
                        </button>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                          <button type="button"
                            onClick={() => openEditEmployee(employee)}
                            className="flex-1 h-8 rounded-lg bg-background/60 border border-border/30 text-[11px] font-semibold flex items-center justify-center gap-1"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button type="button"
                            onClick={() => toggleStatus(employee)}
                            className="flex-1 h-8 rounded-lg bg-background/60 border border-border/30 text-[11px] font-semibold flex items-center justify-center gap-1"
                          >
                            <Power className="w-3 h-3" /> {employee.status === "active" ? "Disable" : "Enable"}
                          </button>
                          <button type="button"
                            onClick={() => deleteEmployee(employee)}
                            className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center"
                            aria-label="Remove employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Employee form modal */}
      <AnimatePresence>
        {showEmployeeForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={closeEmployeeForm}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 260 }}
              className="w-full max-w-md bg-card rounded-2xl p-4 space-y-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[15px]">
                  {editingEmployeeId ? "Edit employee" : "Add employee"}
                </p>
                <button type="button" onClick={closeEmployeeForm} className="p-1 rounded-lg hover:bg-muted/60">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Role</p>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as EmployeeRole }))}
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none capitalize"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r} className="capitalize">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Hourly rate</p>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.5"
                    value={form.hourly_rate}
                    onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="text"
                  value={form.assigned_truck_label}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_truck_label: e.target.value }))}
                  placeholder="Assigned truck"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  list="employee-truck-options"
                />
                <datalist id="employee-truck-options">
                  {trucks.map((truck) => (
                    <option key={truck} value={truck} />
                  ))}
                </datalist>
              </div>

              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email (optional)"
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes (optional)"
                rows={2}
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={closeEmployeeForm} disabled={savingEmployee}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={saveEmployee} disabled={savingEmployee || !form.name.trim()}>
                  {savingEmployee ? "Saving..." : editingEmployeeId ? "Save changes" : "Add employee"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
