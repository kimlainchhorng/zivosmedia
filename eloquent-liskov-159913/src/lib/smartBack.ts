/** Smart back navigation: go back if there's in-app history, else fallback */
import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Track how many in-app navigations have occurred this session.
// window.history.length is unreliable inside iframes/previews.
let inAppNavCount = 0;
let listenerInstalled = false;

function installListener() {
  if (listenerInstalled || typeof window === "undefined") return;
  listenerInstalled = true;
  window.addEventListener("popstate", () => {
    if (inAppNavCount > 0) inAppNavCount -= 1;
  });
}

export function useSmartBack(fallback: string = "/") {
  const navigate = useNavigate();
  const location = useLocation();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    installListener();
    if (lastKey.current !== null && lastKey.current !== location.key) {
      inAppNavCount += 1;
    }
    lastKey.current = location.key;
  }, [location.key]);

  return useCallback(() => {
    if (inAppNavCount > 0) {
      inAppNavCount -= 1;
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  }, [navigate, fallback]);
}
