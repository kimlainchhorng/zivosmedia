/**
 * usePageViewTracker
 * Automatically tracks page views on route changes
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useEventTracking } from "@/hooks/useEventTracking";
import { trackMetaPageView } from "@/lib/metaAdsTracking";

// Routes to skip tracking (auth callbacks, internal)
const SKIP_ROUTES = ["/~oauth", "/auth/callback"];

export function usePageViewTracker() {
  const location = useLocation();
  const { trackPageView } = useEventTracking();

  useEffect(() => {
    if (SKIP_ROUTES.some((r) => location.pathname.startsWith(r))) return;
    trackPageView(location.pathname);
    trackMetaPageView(location.pathname);
  }, [location.pathname, trackPageView]);
}
