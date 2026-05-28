/**
 * Spoiler — Telegram-style tap-to-reveal blurred span. Tap reveals; tap again
 * hides. Used by RichText to render ||spoiler|| segments. Children may be plain
 * text or further-formatted nodes.
 */
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Spoiler({ text, variant = "bold" }: { text: ReactNode; variant?: "bold" | "subtle" }) {
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
