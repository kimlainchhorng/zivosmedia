import { useEffect, useId, useState, type ReactNode } from "react";
import { Clock3, Eye, EyeOff, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/hooks/useHaptic";

type SensitiveMediaGateProps = {
  active: boolean;
  children: ReactNode;
  reason?: string;
  className?: string;
  contentClassName?: string;
  revealed?: boolean;
  onReveal?: () => void;
};

export default function SensitiveMediaGate({
  active,
  children,
  reason = "18+ sensitive media",
  className,
  contentClassName,
  revealed,
  onReveal,
}: SensitiveMediaGateProps) {
  const [localRevealed, setLocalRevealed] = useState(false);
  const descriptionId = useId();
  const haptic = useHaptic();
  const isRevealed = revealed ?? localRevealed;
  const isLocked = active && !isRevealed;

  useEffect(() => {
    if (!active) setLocalRevealed(false);
  }, [active]);

  const reveal = () => {
    haptic("medium");
    setLocalRevealed(true);
    onReveal?.();
  };

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      <div
        aria-hidden={isLocked || undefined}
        className={cn(
          "h-full w-full transition duration-300",
          isLocked && "scale-[1.03] blur-2xl brightness-75",
          contentClassName,
        )}
      >
        {children}
      </div>

      {isLocked && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            reveal();
          }}
          className="zivo-social-sensitive-gate absolute inset-0 z-20 flex min-h-[160px] flex-col items-center justify-center gap-3 px-5 text-center text-white transition-transform active:scale-[0.99]"
          aria-label="View sensitive media"
          aria-describedby={descriptionId}
          aria-expanded={false}
        >
          <span className="zivo-social-sensitive-orb relative flex h-16 w-16 items-center justify-center rounded-full">
            <span className="absolute inset-1 rounded-full border border-white/20" aria-hidden />
            <EyeOff className="relative h-7 w-7" />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] backdrop-blur-md">
            <ShieldAlert className="h-3.5 w-3.5" />
            Sensitive
          </span>
          <span className="max-w-[260px] text-[15px] font-extrabold leading-tight">{reason}</span>
          <span id={descriptionId} className="max-w-[260px] text-xs font-semibold leading-snug text-white/72">
            Tap to reveal this media for this session.
          </span>
          <span className="inline-flex max-w-[260px] items-center gap-1.5 rounded-2xl border border-white/15 bg-black/25 px-3 py-2 text-[11px] font-bold leading-snug text-white/82 backdrop-blur-md">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
            Your reveal choice stays local to this viewing session.
          </span>
          <span className="grid grid-cols-2 gap-2">
            <span className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/80 backdrop-blur-md">
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              Safety check
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/80 backdrop-blur-md">
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              Session only
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/80 backdrop-blur-md">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Tap ready
            </span>
          </span>
          <span className="zivo-social-sensitive-action inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-extrabold">
            <Eye className="h-3.5 w-3.5" />
            View media
          </span>
        </button>
      )}

      {active && isRevealed && (
        <div className="zivo-social-sensitive-badge pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white">
          <ShieldCheck className="h-3.5 w-3.5" />
          Revealed this session
        </div>
      )}
    </div>
  );
}
