import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import StorePaymentSection from "@/components/admin/StorePaymentSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type StoreRow = { id: string; name: string | null; market: string | null };

export default function ShopPaymentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: store, isLoading } = useQuery({
    queryKey: ["my-store-payments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_profiles")
        .select("id, name, market")
        .eq("owner_id", user!.id)
        .maybeSingle();
      return data as StoreRow | null;
    },
    enabled: !!user,
  });

  return (
    <AppLayout>
      <div className="min-h-dvh bg-background pb-24">
        <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur-xl border-b border-border/30">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => navigate("/shop-dashboard")}
              className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-extrabold flex-1">Payments</h1>
          </div>
        </div>

        <div className="px-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !store ? (
            <div className="text-center py-16">
              <CreditCard className="h-14 w-14 text-muted-foreground/20 mx-auto mb-3" />
              <p className="font-semibold mb-1">No shop yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your shop first to manage payment methods.
              </p>
              <button
                type="button"
                onClick={() => navigate("/store/setup")}
                className="h-10 px-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Open my shop
              </button>
            </div>
          ) : (
            <StorePaymentSection storeId={store.id} market={store.market || "KH"} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
