/**
 * StoryTextTile — Premium text-only story preview used inside the
 * IG-style ring on Profile / Feed / Chat carousels. Replaces the flat
 * brand-color disc with a layered emerald → accent gradient, soft
 * radial highlight, glass inner ring, and auto-fit caption.
 */
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  className?: string;
}

export default function StoryTextTile({ text, className }: Props) {
  const trimmed = (text || "").trim() || "Story";
  const len = trimmed.length;
  const size =
    len <= 8
      ? "text-[11px] leading-[12px]"
      : len <= 20
      ? "text-[9px] leading-[11px]"
      : "text-[7.5px] leading-[10px]";

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden flex items-center justify-center",
        "bg-gradient-to-br from-primary via-primary/85 to-accent",
        "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]",
        className,
      )}
    >
      {/* Top-left highlight for dimensionality */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.28),transparent_60%)]" />
      {/* Bottom-right shade for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_85%,rgba(0,0,0,0.25),transparent_55%)]" />
      <span
        className={cn(
          "relative z-10 px-1.5 text-center font-bold text-primary-foreground",
          "drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] line-clamp-3 break-words",
          size,
        )}
      >
        {trimmed}
      </span>
    </div>
  );
}
