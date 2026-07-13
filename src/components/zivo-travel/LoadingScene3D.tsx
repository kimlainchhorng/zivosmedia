import { cn } from "@/lib/utils";

/**
 * 3D travel loading scene — pairs with the `.zt-loader-*` keyframes in
 * zivo-travel-3d.css (orbit ring + floating Z mark + scan bar). Animations are
 * disabled automatically under prefers-reduced-motion (handled in the CSS).
 * Use as a route/suspense fallback on the Zivo Travel surface.
 */
export function LoadingScene3D({
  label = "Preparing your trip…",
  fullscreen = true,
  className,
}: {
  label?: string;
  fullscreen?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        fullscreen ? "fixed inset-0 z-50" : "relative min-h-[320px]",
        "grid place-items-center overflow-hidden bg-[#060912] text-white",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="zt-aurora" aria-hidden />
      <div className="relative grid place-items-center" style={{ perspective: 1000 }}>
        <div className="zt-loader-float relative h-28 w-28" style={{ transformStyle: "preserve-3d" }}>
          <div
            className="zt-loader-orbit absolute inset-0 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "#34d399", borderRightColor: "#0ea5e9" }}
            aria-hidden
          />
          <div className="absolute inset-3 grid place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 via-sky-500 to-violet-600 text-4xl font-black shadow-[0_18px_40px_rgba(16,185,129,0.35)]">
            Z
          </div>
        </div>
        <div className="relative mt-7 h-1 w-44 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <div className="zt-loader-scan absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-500" />
        </div>
        <p className="mt-5 text-sm font-bold tracking-wide text-zinc-300">{label}</p>
      </div>
    </div>
  );
}

export default LoadingScene3D;
