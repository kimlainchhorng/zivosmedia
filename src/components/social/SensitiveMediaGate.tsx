import { useEffect, useState, type ReactNode } from "react";
import Eye from "lucide-react/dist/esm/icons/eye";
import EyeOff from "lucide-react/dist/esm/icons/eye-off";
import ShieldAlert from "lucide-react/dist/esm/icons/shield-alert";
import { cn } from "@/lib/utils";

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
  const isRevealed = revealed ?? localRevealed;
  const isLocked = active && !isRevealed;

  useEffect(() => {
    if (!active) setLocalRevealed(false);
  }, [active]);

  const reveal = () => {
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
          className="absolute inset-0 z-20 flex min-h-[140px] flex-col items-center justify-center gap-3 bg-black/45 px-4 text-center text-white backdrop-blur-sm"
          aria-label="View sensitive media"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <EyeOff className="h-7 w-7" />
          </span>
          <span className="max-w-[240px] text-sm font-bold leading-tight">{reason}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black shadow-lg">
            <Eye className="h-3.5 w-3.5" />
            View
          </span>
        </button>
      )}

      {active && isRevealed && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
          <ShieldAlert className="h-3.5 w-3.5" />
          18+
        </div>
      )}
    </div>
  );
}
