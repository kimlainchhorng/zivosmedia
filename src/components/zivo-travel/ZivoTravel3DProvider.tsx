import { useEffect } from "react";
import type { ReactNode } from "react";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";
import "@/styles/zivo-travel-3d.css";

const TRAVEL_DEFAULT_TITLE = "Zivo Travel | Flights, Hotels, Cars & Bus";

/** Rewrite a zivosmedia ("ZIVO …") title into a Zivo Travel one; leave travel titles. */
function toTravelTitle(title: string): string {
  if (!title || /Zivo Travel|ZIVO TRAVEL/i.test(title)) return title;
  if (/free super-?app/i.test(title)) return TRAVEL_DEFAULT_TITLE;
  if (/\bZIVO\b/.test(title)) return title.replace(/\bZIVO\b/g, "Zivo Travel");
  return title;
}

/**
 * Activates the Zivo Travel surface — but ONLY on the travel host (zivosmedia and
 * every other domain are untouched). Mount once at the app root. It:
 *  1) adds the `.zivo-travel-3d` theme scope class to <html>, and
 *  2) runs a title guard so shared pages that set a "ZIVO …" document title
 *     (Wallet, My Trips, …) show a "Zivo Travel …" tab/SEO title instead.
 *
 * Pass `force` to preview on a non-travel host such as localhost.
 */
export function ZivoTravel3DProvider({
  children,
  force = false,
}: {
  children?: ReactNode;
  force?: boolean;
}) {
  useEffect(() => {
    const active = force || (typeof window !== "undefined" && isZivoTravelHost(window.location.hostname));
    if (!active) return;

    const root = document.documentElement;
    root.classList.add("zivo-travel-3d");

    const titleEl = document.querySelector("title");
    let applying = false;
    const fix = () => {
      if (applying) return;
      const next = toTravelTitle(document.title);
      if (next !== document.title) {
        applying = true;
        document.title = next;
        applying = false;
      }
    };
    fix();
    const observer = titleEl ? new MutationObserver(fix) : null;
    observer?.observe(titleEl as Node, { childList: true });

    return () => {
      root.classList.remove("zivo-travel-3d");
      observer?.disconnect();
    };
  }, [force]);

  return <>{children}</>;
}

export default ZivoTravel3DProvider;
