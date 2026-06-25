import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { openExternalUrl } from "@/lib/openExternalUrl";
import { isStandaloneChatRoute, zivoChatUrl } from "@/config/zivoChatDomain";

/**
 * Standalone chat now lives in the dedicated ZIVO Chat app (zivoschat.com).
 *
 * Any in-app navigation to a standalone chat route is forwarded there — carrying
 * the path and query string so deep links like `/chat?with=<id>` land on the
 * right conversation — and the super-app then bounces home so it never sits on a
 * now-handed-off chat screen. ZIVO Chat shares the super-app's Supabase identity
 * and pulls the session via the `/connect/chat` SSO handoff when needed.
 *
 * Embedded contextual chat (ride/delivery, lodging, support, store) and the
 * `/connect/chat` issuer page are intentionally left untouched — see
 * {@link isStandaloneChatRoute}.
 */
export default function ZivoChatRedirectGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isStandaloneChatRoute(location.pathname)) return;

    const key = `${location.pathname}${location.search}`;
    if (handledRef.current === key) return;
    handledRef.current = key;

    void openExternalUrl(zivoChatUrl(key));
    navigate("/", { replace: true });
  }, [location.pathname, location.search, navigate]);

  return null;
}
