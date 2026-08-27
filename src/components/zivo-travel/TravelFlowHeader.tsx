import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import ZivoTravelLogo from "@/components/ZivoTravelLogo";
import { cn } from "@/lib/utils";
import { getZivoHeaderSafeTop } from "@/lib/zivoHeaderSafeArea";

interface TravelFlowHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  rightAdornment?: ReactNode;
  sticky?: boolean;
  className?: string;
}

const backControlClassName =
  "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40";

/** Focused Travel chrome for checkout, traveler, and booking-detail steps. */
export function TravelFlowHeader({
  title,
  subtitle,
  backHref,
  onBack,
  backLabel = "Go back",
  rightAdornment,
  sticky = true,
  className,
}: TravelFlowHeaderProps) {
  const backContent = <ArrowLeft className="h-5 w-5" aria-hidden />;

  return (
    <header
      data-travel-flow-header
      className={cn(
        "zivo-safe-top-guard-off z-40 border-b border-sky-100 bg-white/90 text-slate-950 backdrop-blur-xl",
        sticky ? "sticky top-0" : "relative",
        className,
      )}
      style={{ paddingTop: getZivoHeaderSafeTop("0.4375rem") }}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 opacity-80"
      />
      <div className="container mx-auto flex min-h-14 items-center gap-2 px-3 py-1.5 sm:px-4">
        {backHref ? (
          <Link
            to={backHref}
            aria-label={backLabel}
            className={backControlClassName}
          >
            {backContent}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            className={backControlClassName}
          >
            {backContent}
          </button>
        )}

        <Link
          to="/"
          aria-label="Zivo Travel home"
          className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl px-1 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 min-[480px]:px-2"
        >
          <ZivoTravelLogo
            size="sm"
            className="[&>span]:hidden min-[480px]:[&>span]:inline"
          />
        </Link>

        <div className="min-w-0 flex-1 border-l border-slate-200 pl-2.5">
          <h1 className="truncate text-sm font-extrabold tracking-tight text-slate-950 sm:text-base">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
              {subtitle}
            </div>
          )}
        </div>

        {rightAdornment && (
          <div className="shrink-0 text-xs font-semibold text-slate-600">
            {rightAdornment}
          </div>
        )}
      </div>
    </header>
  );
}

export default TravelFlowHeader;
