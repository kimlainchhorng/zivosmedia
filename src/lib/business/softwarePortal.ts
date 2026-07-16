import { isAutoRepairSoftwareHost, isZivoMediaHost } from "@/config/autoRepairDomain";
import { resolveBusinessDashboardRoute } from "@/lib/business/dashboardRoute";

export function resolveSoftwarePortalAccountDashboardPath(
  ownerStore?: { id?: string | null; category?: string | null } | null,
  hostname?: string | null,
  mediaDashboardUrl?: string | null,
) {
  if (ownerStore?.id) {
    return resolveBusinessDashboardRoute(ownerStore.category, ownerStore.id).path;
  }

  if (isAutoRepairSoftwareHost(hostname)) {
    return "/business/new";
  }

  const linkedMediaDashboardUrl = normalizeMediaDashboardUrl(mediaDashboardUrl);
  return linkedMediaDashboardUrl ?? "/business/new";
}

function normalizeMediaDashboardUrl(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!isZivoMediaHost(url.hostname) || !url.pathname.startsWith("/admin/stores/")) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
