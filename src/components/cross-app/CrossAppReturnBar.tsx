import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck, ExternalLink } from "lucide-react";
import { goCrossDomain } from "@/lib/crossDomainSSO";
import { ZIVO_MEDIA_ORIGIN, isZivoMediaHost } from "@/config/autoRepairDomain";
import { getZivoMediaHomeHref } from "@/config/zivoTravelDomain";
import { buildAdminQueueHref } from "@/config/zivoAdminDomain";
import { useAuth } from "@/contexts/AuthContext";

type CrossAppReturnBarProps = {
  /** Zivo-Admin queue hash anchor for this surface, e.g. "#travel-ops". */
  adminHref: string;
  /** Where "Return to ZivosMedia" lands (carried via cross-domain SSO). */
  returnPath?: string;
  className?: string;
  /** Header-safe version that keeps only the parent-app return action. */
  compact?: boolean;
};

/**
 * Shared cross-app control: "Return to ZivosMedia" (carries the session via the
 * existing SSO handoff) plus a staff-only "Open Admin Queue" deep link into the
 * Zivo-Admin control plane. A Zivo-Admin handoff id present in the URL (?handoff=)
 * is surfaced and threaded into the admin link. The media-return button is hidden
 * when already on the zivosmedia host.
 */
export default function CrossAppReturnBar({
  adminHref,
  returnPath = "/",
  className,
  compact = false,
}: CrossAppReturnBarProps) {
  const { isAdmin } = useAuth();
  const [params] = useSearchParams();
  const handoffId = params.get("handoff") || params.get("handoffId");
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const onZivoMedia = isZivoMediaHost(hostname);
  const mediaHomeHref = getZivoMediaHomeHref(hostname);
  const isLocalPreviewReturn = mediaHomeHref.startsWith("/");
  const adminQueueHref = useMemo(
    () => buildAdminQueueHref(adminHref, handoffId),
    [adminHref, handoffId],
  );

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      {!onZivoMedia && (
        <a
          href={mediaHomeHref}
          aria-label="Return to Zivosmedia home"
          onClick={(event) => {
            if (isLocalPreviewReturn) return;
            event.preventDefault();
            void goCrossDomain(ZIVO_MEDIA_ORIGIN, returnPath);
          }}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/90 text-sm font-bold text-[#101412] shadow-sm transition hover:border-[#138f68] hover:text-[#138f68] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
            compact ? "min-w-10 px-2.5 min-[480px]:px-4" : "px-4 py-2"
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className={compact ? "hidden min-[480px]:inline" : undefined}>
            {compact ? "Zivosmedia" : "Return to Zivosmedia"}
          </span>
        </a>
      )}

      {!compact && isAdmin && (
        <a
          href={adminQueueHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-[#101412]/15 bg-[#101412] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-black"
        >
          <ShieldCheck className="h-4 w-4" />
          Open Admin Queue
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </a>
      )}

      {!compact && handoffId && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#48e7af]/15 px-3 py-1 text-xs font-semibold text-[#0f7154]">
          Handoff {handoffId.slice(0, 8)}
        </span>
      )}
    </div>
  );
}
