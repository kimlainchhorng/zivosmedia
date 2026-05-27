/**
 * AdminShellRoute — convenience wrapper that combines:
 *  - ProtectedAdminRoute (auth + vertical role gating)
 *  - AdminShell (unified layout, sidebar, topbar)
 *
 * Nav configs are imported here (inside the lazy admin chunk) so the
 * lucide icons inside them don't get pulled into the root bundle.
 */
import type { ReactNode } from "react";
import { AdminShell } from "./AdminShell";
import { ProtectedAdminRoute } from "./ProtectedAdminRoute";
import type { NavConfig } from "./nav/types";
import type { AdminVertical } from "./useAdminContext";
import { restaurantNav } from "./nav/restaurant";
import { businessNav } from "./nav/business";

const NAV_BY_VERTICAL: Partial<Record<AdminVertical, NavConfig>> = {
  restaurant: restaurantNav,
  business: businessNav,
};

interface Props {
  vertical: AdminVertical;
  /** Optional override; defaults to the nav config for the vertical. */
  nav?: NavConfig;
  title?: string;
  children: ReactNode;
}

export function AdminShellRoute({ vertical, nav, title, children }: Props) {
  const resolvedNav = nav ?? NAV_BY_VERTICAL[vertical];
  if (!resolvedNav) {
    throw new Error(`AdminShellRoute: no nav config for vertical "${vertical}"`);
  }
  return (
    <ProtectedAdminRoute vertical={vertical}>
      <AdminShell vertical={vertical} nav={resolvedNav} title={title}>
        {children}
      </AdminShell>
    </ProtectedAdminRoute>
  );
}

export default AdminShellRoute;
