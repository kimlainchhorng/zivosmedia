import { useEffect } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAccess } from "@/hooks/useUserAccess";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { withRedirectParam } from "@/lib/authRedirect";
import AccessDenied from "@/components/auth/AccessDenied";
import { supabase } from "@/integrations/supabase/client";
import {
  AUTO_REPAIR_STORE_ID,
  ZIVO_SOFTWARE_AUTH_REDIRECT_PATH,
  ZIVO_SOFTWARE_HOME_PATH,
  getZivoSoftwareUrl,
  isAutoRepairSoftwareHost,
  isZivoMediaHost,
  isZivoSoftwareDashboardPath,
} from "@/config/autoRepairDomain";

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
  allowSupport?: boolean;
};

const ProtectedRoute = ({ children, requireAdmin = false, allowStoreOwner = false, allowSupport = false }: ProtectedRouteProps) => {
  const { user, isLoading, isAdmin } = useAuth();
  const location = useLocation();
  const { storeId } = useParams<{ storeId?: string }>();
  const isAutoRepairSoftwareDomain =
    typeof window !== "undefined" && isAutoRepairSoftwareHost(window.location.hostname);
  const isAutoRepairSoftwareRoute =
    !!storeId &&
    storeId === AUTO_REPAIR_STORE_ID &&
    (location.pathname.startsWith("/desktop/auto-repair/") ||
      (isAutoRepairSoftwareDomain && location.pathname === `/admin/stores/${AUTO_REPAIR_STORE_ID}`));
  const isZivoBusinessSetupRoute =
    location.pathname === "/business/new" || location.pathname.startsWith("/business/software/");
  const isZivoSoftwareDashboardRoute = isZivoSoftwareDashboardPath(location.pathname);
  const shouldRedirectMediaBusinessSetup =
    typeof window !== "undefined" &&
    isZivoMediaHost(window.location.hostname) &&
    location.pathname === ZIVO_SOFTWARE_AUTH_REDIRECT_PATH;
  const softwareBusinessSetupUrl = getZivoSoftwareUrl(
    ZIVO_SOFTWARE_AUTH_REDIRECT_PATH,
    location.search,
    location.hash,
  );
  const shouldCheckStoreOwner = requireAdmin && allowStoreOwner && !!storeId && !!user?.id && !isAdmin;

  // Support-role accounts may enter admin-gated routes that opt in via
  // allowSupport (the Support console). Reuses the cached access query.
  const accessQuery = useUserAccess(user?.id);
  const needsSupportCheck = requireAdmin && allowSupport && !!user && !isAdmin;
  const supportAccessResolved = accessQuery.isSuccess || accessQuery.isError;
  const supportAccessAllowed = needsSupportCheck && accessQuery.data?.isSupport === true;

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

  useEffect(() => {
    if (shouldRedirectMediaBusinessSetup) {
      window.location.replace(softwareBusinessSetupUrl);
    }
  }, [shouldRedirectMediaBusinessSetup, softwareBusinessSetupUrl]);

  if (shouldRedirectMediaBusinessSetup) {
    return (
      <div className="min-h-screen bg-background px-6 py-12 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Opening ZIVO Software...</p>
          <a className="text-sm font-medium text-primary underline" href={softwareBusinessSetupUrl}>
            Continue to zivosoftware.com
          </a>
        </div>
      </div>
    );
  }

  if (
    isAutoRepairSoftwareDomain &&
    !isZivoBusinessSetupRoute &&
    !isAutoRepairSoftwareRoute &&
    !isZivoSoftwareDashboardRoute
  ) {
    return <Navigate to={ZIVO_SOFTWARE_HOME_PATH} replace />;
  }

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
    const redirectTarget = `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`;
    const loginUrl = withRedirectParam("/login", redirectTarget);

    if (allowStoreOwner && storeId && !isAutoRepairSoftwareRoute) {
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
      if (location.pathname.startsWith("/admin/stores/")) {
        return <Navigate to={loginUrl} state={{ from: location }} replace />;
      }
      if (publicStorePath) return <Navigate to={publicStorePath} replace />;
    }

    return <Navigate to={loginUrl} state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    if (needsSupportCheck && !supportAccessResolved) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Checking access...</p>
          </div>
        </div>
      );
    }
    if (supportAccessAllowed) return <>{children}</>;

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
      if (isAutoRepairSoftwareRoute) {
        return (
          <AccessDenied
            message="You don't have permission to access this auto repair workspace. Contact the business owner or ZIVO Software support to request access."
          />
        );
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

    return (
      <AccessDenied
        message="You don't have permission to access this page. Contact an administrator to request access."
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
