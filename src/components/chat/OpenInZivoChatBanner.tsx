import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { openExternalUrl } from "@/lib/openExternalUrl";
import { setZivoChatSurface, zivoChatUrl } from "@/config/zivoChatDomain";

const DISMISS_KEY = "zivo_chat_banner_dismissed";

const readDismissed = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Blocked storage: show it rather than hide the only pointer to the app.
    return false;
  }
};

/**
 * Offers the dedicated ZIVO Chat app without requiring it.
 *
 * Chat used to be a forced handoff to zivoschat.com. It now renders in the
 * super-app, so this is the remaining path to the native app for people who
 * want notifications -- suggested once, dismissible, and never blocking.
 * "Always" records the preference that ZivoChatRedirectGuard reads, so those
 * users get forwarded straight there next time.
 */
export default function OpenInZivoChatBanner() {
  const { t } = useI18n();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed) return null;

  const target = `${location.pathname}${location.search}`;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* dismissal is a convenience; ignore storage failures */
    }
  };

  const openThere = (remember: boolean) => {
    if (remember) setZivoChatSurface("dedicated-app");
    void openExternalUrl(zivoChatUrl(target));
  };

  return (
    <div
      role="region"
      aria-label={t("chat.app_banner_title")}
      className="mx-3 mb-2 flex items-start gap-3 rounded-2xl border border-border/40 bg-muted/30 p-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ig-gradient text-white">
        <MessageCircle className="h-4 w-4" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold leading-tight text-foreground">
          {t("chat.app_banner_title")}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {t("chat.app_banner_body")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-full px-3 text-[11px] font-bold"
            onClick={() => openThere(false)}
          >
            {t("chat.app_banner_open")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-full px-3 text-[11px] font-semibold"
            onClick={() => openThere(true)}
          >
            {t("chat.app_banner_always")}
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label={t("chat.app_banner_dismiss")}
        title={t("chat.app_banner_dismiss")}
        className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors touch-manipulation hover:bg-muted/60 hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
