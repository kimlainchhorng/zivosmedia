import { Navigate, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { withRedirectParam } from "@/lib/authRedirect";
import AccessDenied from "@/components/auth/AccessDenied";
import { supabase } from "@/integrations/supabase/client";

const isLodgingCategory = (category?: string | null) => {
  const normalized = (category || "").toLowerCase().replace(/&/g, "and").replace(/[\/_-]+/g, " ").replace(/\s+/g, " ").trim();
  return ["hotel", "hotels", "resort", "resorts", "guesthouse", "guest house", "guesthouse b and b", "guesthouse bed and breakfast", "bed and breakfast", "b and b"].includes(normalized);
};

const getPublicStorePath = (store?: { id: string; slug: string | null; category: string | null; is_active: boolean | null } | null) => {
  if (!store?.is_active) return null;
  if (isLodgingCategory(store.category)) return `/hotel/${store.id}`;
  return store.slug ? `/store/${store.slug}` : null;
};

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireAdmin?: boolean;
  allowStoreOwner?: boolean;
};

const ProtectedRoute = ({ children, requireAdmin = false, allowStoreOwner = false }: ProtectedRouteProps) => {
  const { user, isLoading, isAdmin } = useAuth();
  const location = useLocation();
  const { storeId } = useParams<{ storeId?: string }>();
  const shouldCheckStoreOwner = requireAdmin && allowStoreOwner && !!storeId && !!user?.id && !isAdmin;

  const publicStoreQuery = useQuery({
    queryKey: ["protected-route-public-store", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_profiles")
        .select("id, slug, category, is_active")
        .eq("id", storeId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: requireAdmin && allowStoreOwner && !!storeId,
    staleTime: 30_000,
  });

  const ownerQuery = useQuery({
    queryKey: ["protected-route-store-owner", user?.id, storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_profiles")
        .select("id")
        .eq("id", storeId!)
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: shouldCheckStoreOwner,
    staleTime: 30_000,
  });
  const ownerAccessResolved = ownerQuery.isSuccess || ownerQuery.isError;
  const ownerAccessAllowed = ownerQuery.data === true;
  const publicStoreResolved = publicStoreQuery.isSuccess || publicStoreQuery.isError;
  const publicStorePath = getPublicStorePath(publicStoreQuery.data);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (allowStoreOwner && storeId) {
      if (!publicStoreResolved && location.pathname.startsWith("/admin/stores/")) {
        return <Navigate to={`/hotel/${storeId}`} replace />;
      }
      if (!publicStoreResolved) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Opening business page...</p>
            </div>
          </div>
        );
      }
      if (publicStorePath) return <Navigate to={publicStorePath} replace />;
    }

    const redirectTarget = `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`;
    const loginUrl = withRedirectParam("/login", redirectTarget);
    return <Navigate to={loginUrl} state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    if (allowStoreOwner && storeId) {
      if (shouldCheckStoreOwner && !ownerAccessResolved) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Checking access...</p>
            </div>
          </div>
        );
      }

      if (ownerAccessAllowed) return <>{children}</>;
      if (!publicStoreResolved) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Opening business page...</p>
            </div>
          </div>
        );
      }
      if (publicStorePath) return <Navigate to={publicStorePath} replace />;
    }

    return (
      <AccessDenied
        message="You don't have permission to access this page. Contact an administrator to request access."
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
