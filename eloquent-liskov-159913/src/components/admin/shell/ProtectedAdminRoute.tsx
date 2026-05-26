/**
 * ProtectedAdminRoute — gates an admin shell route on auth + role.
 * Allows access if the user is an admin OR holds the vertical's owner role.
 */
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAccess, type UserAccess } from "@/hooks/useUserAccess";
import { withRedirectParam } from "@/lib/authRedirect";
import AccessDenied from "@/components/auth/AccessDenied";
import type { AdminVertical } from "./useAdminContext";

interface Props {
  vertical: AdminVertical;
  children: ReactNode;
}

const verticalAccessKey: Partial<Record<AdminVertical, keyof UserAccess>> = {
  restaurant: "isRestaurantOwner",
  business: "isAdmin",
  grocery: "isStoreOwner",
  retail: "isStoreOwner",
  cafe: "isRestaurantOwner",
  service: "isAdmin",
  mobility: "isDriver",
  generic: "isAdmin",
};

export function ProtectedAdminRoute({ vertical, children }: Props) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const { data: access, isLoading: accessLoading } = useUserAccess(user?.id);

  if (isLoading || (user && accessLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const target = `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`;
    return <Navigate to={withRedirectParam("/login", target)} replace />;
  }

  const key = verticalAccessKey[vertical];
  const allowed = access?.isAdmin || (key && access?.[key]);

  if (!allowed) {
    return (
      <AccessDenied
        message={`You don't have permission to access the ${vertical} admin dashboard.`}
      />
    );
  }

  return <>{children}</>;
}

export default ProtectedAdminRoute;
