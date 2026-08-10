import type { ReactNode } from "react";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";
import { PageTransition } from "@/components/zivo-travel/PageTransition";
import { cn } from "@/lib/utils";

/**
 * Adds the Zivo Travel visual boundary to shared booking pages without changing
 * their data, routing, or payment behavior. The route stays identical on every
 * other host, while zivostravel.com (and the ?zt=1 preview) gets the scoped
 * light 3D skin and a reduced-motion-safe page entrance.
 */
export function TravelPageFrame({
  children,
  className,
  showAurora = true,
}: {
  children: ReactNode;
  className?: string;
  showAurora?: boolean;
}) {
  const isTravelHost = typeof window !== "undefined" && isZivoTravelHost();

  if (!isTravelHost) return <>{children}</>;

  return (
    <PageTransition className="min-h-[100dvh]">
      <div className={cn("zivo-travel-3d zivo-travel-light relative min-h-[100dvh] overflow-hidden text-slate-950", className)}>
        {showAurora && <div className="zt-aurora pointer-events-none absolute inset-0 z-0 opacity-60" aria-hidden />}
        <div className="relative z-10">{children}</div>
      </div>
    </PageTransition>
  );
}

export default TravelPageFrame;
