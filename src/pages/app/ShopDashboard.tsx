import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Store,
  ArrowRight,
  Loader2,
  Settings,
  Package,
  ClipboardList,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import StoreOwnerLayout from "@/components/admin/StoreOwnerLayout";
import { resolveBusinessDashboardRoute } from "@/lib/business/dashboardRoute";

type StoreRow = { id: string; name: string | null; logo_url: string | null; category: string | null };

// Sidebar tab IDs that have their own routes — clicking them in the sidebar
// should navigate to the sub-page instead of toggling local content.
const TAB_ROUTES: Record<string, string> = {
  employees: "/shop-dashboard/employees",
  payroll: "/shop-dashboard/payroll",
  "employee-schedule": "/shop-dashboard/employee-schedule",
  "time-clock": "/shop-dashboard/time-clock",
  "employee-rules": "/shop-dashboard/employee-rules",
  attendance: "/shop-dashboard/attendance",
  training: "/shop-dashboard/training",
  documents: "/shop-dashboard/documents",
};

const ShopDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("ar-dashboard");

  useEffect(() => {
    const subRoute = TAB_ROUTES[activeTab];
    if (subRoute) {
      navigate(subRoute);
      setActiveTab("ar-dashboard");
    }
  }, [activeTab, navigate]);

  const { data: store, isLoading } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_profiles")
        .select("id, name, logo_url, category")
        .eq("owner_id", user!.id)
        .maybeSingle();
      return data as StoreRow | null;
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["shop-stats", store?.id],
    queryFn: async () => {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const [ordersRes, pendingRes, revenueRes, customersRes] = await Promise.all([
        supabase.from("store_orders").select("id", { count: "exact", head: true }).eq("store_id", store!.id),
        supabase.from("store_orders").select("id", { count: "exact", head: true }).eq("store_id", store!.id).eq("status", "pending"),
        supabase.from("store_orders").select("total_cents").eq("store_id", store!.id).eq("status", "delivered").gte("created_at", startOfMonth),
        supabase.from("store_orders").select("customer_phone").eq("store_id", store!.id).not("customer_phone", "is", null),
      ]);
      const revenueCents = (revenueRes.data ?? []).reduce((s: number, o: { total_cents: number | null }) => s + (o.total_cents ?? 0), 0);
      const uniqueCustomers = new Set((customersRes.data ?? []).map((o: { customer_phone: string }) => o.customer_phone)).size;
      return {
        totalOrders: ordersRes.count ?? 0,
        pendingOrders: pendingRes.count ?? 0,
        revenueDollars: (revenueCents / 100).toFixed(2),
        uniqueCustomers,
      };
    },
    enabled: !!store?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mb-5">
            <Store className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-xl font-extrabold mb-1.5">Open your shop</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Sell products, accept orders and reach the ZIVO community. Setup takes about 2 minutes.
          </p>
          <button
            type="button"
            onClick={() => navigate("/store/setup")}
            className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Create my shop <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/more")}
            className="w-full h-10 mt-2 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  const resolvedDashboard = resolveBusinessDashboardRoute(store.category, store.id);
  if (!resolvedDashboard.fallback && resolvedDashboard.path !== "/shop-dashboard") {
    return <Navigate to={resolvedDashboard.path} replace />;
  }

  const quickActions: Array<{
    label: string;
    icon: typeof Settings;
    iconClass: string;
    bgClass: string;
    onClick: () => void;
  }> = [
    {
      label: "Edit shop",
      icon: Settings,
      iconClass: "text-slate-600",
      bgClass: "bg-slate-500/10",
      onClick: () => navigate("/shop-dashboard/settings"),
    },
    {
      label: "Products",
      icon: Package,
      iconClass: "text-emerald-600",
      bgClass: "bg-emerald-500/10",
      onClick: () => navigate("/shop-dashboard/products"),
    },
    {
      label: "Orders",
      icon: ClipboardList,
      iconClass: "text-blue-600",
      bgClass: "bg-blue-500/10",
      onClick: () => navigate("/shop-dashboard/orders"),
    },
    {
      label: "Analytics",
      icon: TrendingUp,
      iconClass: "text-violet-600",
      bgClass: "bg-violet-500/10",
      onClick: () => navigate("/shop-dashboard/analytics"),
    },
    {
      label: "Payments",
      icon: CreditCard,
      iconClass: "text-amber-600",
      bgClass: "bg-amber-500/10",
      onClick: () => navigate("/shop-dashboard/payments"),
    },
  ];

  return (
    <StoreOwnerLayout
      title={`${store.name || "Shop"} Dashboard`}
      storeId={store.id}
      storeName={store.name}
      storeLogoUrl={store.logo_url}
      storeCategory={store.category}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Shop Dashboard</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/40 bg-card p-3 hover:bg-muted/40 active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.bgClass}`}>
                <action.icon className={`w-5 h-5 ${action.iconClass}`} />
              </div>
              <span className="text-xs font-semibold text-foreground">{action.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border/40 bg-card p-4">
            <p className="text-sm text-muted-foreground mb-2">Total Orders</p>
            <p className="text-2xl font-bold">{stats?.totalOrders ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-card p-4">
            <p className="text-sm text-muted-foreground mb-2">Pending Orders</p>
            <p className="text-2xl font-bold">{stats?.pendingOrders ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-card p-4">
            <p className="text-sm text-muted-foreground mb-2">Revenue This Month</p>
            <p className="text-2xl font-bold">${stats?.revenueDollars ?? "0.00"}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-card p-4">
            <p className="text-sm text-muted-foreground mb-2">Active Customers</p>
            <p className="text-2xl font-bold">{stats?.uniqueCustomers ?? 0}</p>
          </div>
        </div>
      </div>
    </StoreOwnerLayout>
  );
};

export default ShopDashboard;
