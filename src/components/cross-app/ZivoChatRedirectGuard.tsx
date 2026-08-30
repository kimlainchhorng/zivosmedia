import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { openExternalUrl } from "@/lib/openExternalUrl";
import {
  getZivoChatSurface,
  isStandaloneChatRoute,
  zivoChatUrl,
} from "@/config/zivoChatDomain";

/**
 * Standalone chat also lives in the dedicated ZIVO Chat app (zivoschat.com,
 * com.zivo.chat on iOS/Android).
 *
 * This used to forward EVERY standalone chat route there unconditionally, which
 * meant you could not read your messages in the super-app at all -- tapping Chat
 * threw you onto another domain and, if you were not signed in there, onto its
 * login screen. Both surfaces run on the same Supabase project, so there is no
 * data reason to force that.
 *
 * Now the handoff is opt-in: it fires only for users who chose "dedicated-app"
 * (see {@link getZivoChatSurface}). Everyone else reads chat in place, and the
 * hub offers the app as a skippable suggestion. Deep links still carry their
 * path and query so `/chat?with=<id>` lands on the right conversation.
 *
 * Embedded contextual chat (ride/delivery, lodging, support, store) and the
 * `/connect/chat` issuer page are untouched -- see {@link isStandaloneChatRoute}.
 */
export default function ZivoChatRedirectGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isStandaloneChatRoute(location.pathname)) return;
    if (getZivoChatSurface() !== "dedicated-app") return;

    const key = `${location.pathname}${location.search}`;
    if (handledRef.current === key) return;
    handledRef.current = key;

    void openExternalUrl(zivoChatUrl(key));
    navigate("/", { replace: true });
  }, [location.pathname, location.search, navigate]);

  return null;
}
