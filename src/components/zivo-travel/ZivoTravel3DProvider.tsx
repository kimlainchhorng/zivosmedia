import { useEffect } from "react";
import type { ReactNode } from "react";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";
import "@/styles/zivo-travel-3d.css";

/**
 * Activates the Zivo Travel 3D theme by adding the `.zivo-travel-3d` scope class
 * to <html> — but ONLY on the travel host, so the theme never leaks to
 * zivosmedia.com or any other domain served by this build.
 *
 * Wrap the travel surface with this (e.g. around the travel routes / home).
 * Pass `force` to preview the theme on a non-travel host such as localhost.
 */
export function ZivoTravel3DProvider({
  children,
  force = false,
}: {
  children: ReactNode;
  force?: boolean;
}) {
  useEffect(() => {
    const active = force || (typeof window !== "undefined" && isZivoTravelHost(window.location.hostname));
    if (!active) return;
    const root = document.documentElement;
    root.classList.add("zivo-travel-3d");
    return () => root.classList.remove("zivo-travel-3d");
  }, [force]);

  return <>{children}</>;
}

export default ZivoTravel3DProvider;
