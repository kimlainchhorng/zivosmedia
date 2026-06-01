/**
 * ChatFormatBar — a small floating toolbar (Bold / Italic / Strike / Code /
 * Spoiler) shown above the composer when text is selected. Presentational: the
 * parent owns the input ref + selection state and applies the format via
 * applyFormat() from lib/chat/richText.
 */
import type { KeyboardEvent } from "react";
import Bold from "lucide-react/dist/esm/icons/bold";
import Italic from "lucide-react/dist/esm/icons/italic";
import Strikethrough from "lucide-react/dist/esm/icons/strikethrough";
import Code from "lucide-react/dist/esm/icons/code";
import EyeOff from "lucide-react/dist/esm/icons/eye-off";
import type { RichFormat } from "@/lib/chat/richText";

const ITEMS: Array<{ fmt: RichFormat; label: string; Icon: typeof Bold }> = [
  { fmt: "bold", label: "Bold", Icon: Bold },
  { fmt: "italic", label: "Italic", Icon: Italic },
  { fmt: "strike", label: "Strikethrough", Icon: Strikethrough },
  { fmt: "code", label: "Monospace", Icon: Code },
  { fmt: "spoiler", label: "Spoiler", Icon: EyeOff },
];

/** Map a composer keydown to a format command (Cmd/Ctrl+B/I/E, Cmd/Ctrl+Shift+S). */
export function matchFormatHotkey(e: KeyboardEvent): RichFormat | null {
  if (!(e.metaKey || e.ctrlKey)) return null;
  const k = e.key.toLowerCase();
  if (k === "b") return "bold";
  if (k === "i") return "italic";
  if (k === "e") return "code";
  if (k === "s" && e.shiftKey) return "strike";
  return null;
}

export default function ChatFormatBar({
  visible,
  onFormat,
}: {
  visible: boolean;
  onFormat: (fmt: RichFormat) => void;
}) {
  if (!visible) return null;
  return (
    <div className="zivo-chat-popover-glass absolute bottom-full left-0 z-40 mb-2 flex items-center gap-1 rounded-full border-white/10 px-1.5 py-1.5 shadow-2xl shadow-black/10">
      {ITEMS.map(({ fmt, label, Icon }) => (
        <button
          key={fmt}
          type="button"
          aria-label={label}
          title={label}
          // mousedown + preventDefault keeps the input's text selection intact
          onMouseDown={(e) => {
            e.preventDefault();
            onFormat(fmt);
          }}
          className="zivo-chat-icon-button flex h-8 w-8 items-center justify-center text-muted-foreground transition-all hover:text-foreground active:scale-90"
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
