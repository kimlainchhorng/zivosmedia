import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Store, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import StoreOwnerLayout from "@/components/admin/StoreOwnerLayout";
import { resolveBusinessDashboardRoute } from "@/lib/business/dashboardRoute";

const ShopDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("ar-dashboard");

  const { data: store, isLoading } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_profiles")
        .select("id, name, logo_url, category")
        .eq("owner_id", user!.id)
        .maybeSingle();
      return data;
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
            className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            Create my shop <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/more")}
            className="w-full h-10 mt-2 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
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

  const renderContent = () => {
    switch (activeTab) {
      case "ar-dashboard":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Shop Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border/40 bg-card p-4">
                <p className="text-sm text-muted-foreground mb-2">Total Work Orders</p>
                <p className="text-2xl font-bold">{stats?.totalOrders ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-card p-4">
                <p className="text-sm text-muted-foreground mb-2">Pending Estimates</p>
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
        );
      case "ar-parts":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Part Shop</h2>
            <p className="text-muted-foreground">Manage your auto parts inventory</p>
            <button
              type="button"
              onClick={() => navigate("/shop-dashboard/products")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
            >
              Go to Part Shop
            </button>
          </div>
        );
      case "ar-workorders":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Work Orders</h2>
            <p className="text-muted-foreground">Track and manage customer service work</p>
          </div>
        );
      case "ar-estimates":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Estimates</h2>
            <p className="text-muted-foreground">Create and manage service estimates</p>
          </div>
        );
      case "ar-invoices":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Invoices</h2>
            <p className="text-muted-foreground">Manage customer invoices and payments</p>
          </div>
        );
      case "employees":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Employees</h2>
            <p className="text-muted-foreground">Manage your technicians and staff</p>
            <button
              type="button"
              onClick={() => navigate("/shop-dashboard/employees")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
            >
              Go to Employees
            </button>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Coming Soon</h2>
            <p className="text-muted-foreground">This section is being prepared. Check back soon!</p>
          </div>
        );
    }
  };

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
      {renderContent()}
    </StoreOwnerLayout>
  );
};

export default ShopDashboard;
