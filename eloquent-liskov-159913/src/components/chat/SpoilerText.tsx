/**
 * SpoilerText — Telegram-style ||hidden|| rendering.
 * Splits a string by `||...||` markers; the inside renders as a tap-to-reveal
 * blurred span (animated dot pattern). Tap reveals; tap again hides.
 *
 * Usage:
 *   <SpoilerText text="The killer is ||the butler||!" />
 *
 * Plain text passes through unchanged. Empty `||` is ignored.
 */
import { useState, memo } from "react";
import { cn } from "@/lib/utils";

interface SpoilerTextProps {
  text: string;
  /** Tailwind class for plain text styling — applied to the wrapper. */
  className?: string;
  /** Visual variant for the spoiler — "subtle" for chat list previews, "bold" for message bubbles. */
  variant?: "bold" | "subtle";
}

const SPOILER_RE = /\|\|([^|]+)\|\|/g;

interface Segment {
  text: string;
  spoiler: boolean;
}

function parse(text: string): Segment[] {
  const out: Segment[] = [];
  let lastIndex = 0;
  for (const m of text.matchAll(SPOILER_RE)) {
    if (m.index! > lastIndex) {
      out.push({ text: text.slice(lastIndex, m.index), spoiler: false });
    }
    out.push({ text: m[1], spoiler: true });
    lastIndex = m.index! + m[0].length;
  }
  if (lastIndex < text.length) {
    out.push({ text: text.slice(lastIndex), spoiler: false });
  }
  return out;
}

function Spoiler({ text, variant }: { text: string; variant: "bold" | "subtle" }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setRevealed((r) => !r)}
      className={cn(
        "inline align-baseline rounded transition-all px-1 -mx-1 cursor-pointer select-none",
        revealed
          ? "bg-transparent"
          : variant === "bold"
          ? "bg-foreground/85 text-transparent select-none"
          : "bg-foreground/40 text-transparent select-none",
      )}
      style={revealed ? undefined : { textShadow: "0 0 8px rgba(0,0,0,0.6)" }}
      aria-label={revealed ? "Hide spoiler" : "Reveal spoiler"}
      title={revealed ? "Click to hide" : "Click to reveal spoiler"}
    >
      {text}
    </button>
  );
}

function SpoilerTextImpl({ text, className, variant = "bold" }: SpoilerTextProps) {
  const segments = parse(text);
  // Fast path: no spoilers — render as a plain span (preserves existing behavior).
  if (segments.length === 0 || segments.every((s) => !s.spoiler)) {
    return <span className={className}>{text}</span>;
  }
  return (
    <span className={className}>
      {segments.map((s, i) =>
        s.spoiler ? (
          <Spoiler key={i} text={s.text} variant={variant} />
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  );
}

const SpoilerText = memo(SpoilerTextImpl);
export default SpoilerText;
