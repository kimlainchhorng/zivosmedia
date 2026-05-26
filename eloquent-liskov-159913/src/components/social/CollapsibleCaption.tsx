/**
 * CollapsibleCaption
 * - Renders text clamped to N lines.
 * - When the text actually overflows the clamp, shows an inline "… See more"
 *   anchored to the last visible line (overlaid via a fading mask so it never
 *   wraps onto its own line).
 * - When expanded, shows the full text plus an inline "See less".
 *
 * The component is content-agnostic: it accepts either a plain `text` string
 * (rendered safely) or arbitrary `children` (e.g. a <SafeCaption /> that
 * renders mentions/hashtags). When `children` is provided, the `text` prop is
 * still required so the component can measure length cheaply for the
 * overflow-threshold heuristic.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "card" | "overlay";

interface Props {
  text: string;
  children?: ReactNode;
  lines?: number;
  className?: string;
  /** "card" = light bg-card mask; "overlay" = transparent dark mask for hero overlays. */
  variant?: Variant;
  /** Optional prefix rendered inline before the caption (e.g. bolded author name). */
  prefix?: ReactNode;
}

export function CollapsibleCaption({
  text,
  children,
  lines = 3,
  className,
  variant = "card",
  prefix,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Measure overflow whenever text or width changes.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // When expanded the element has no clamp, so it never "overflows" — keep
      // the prior overflows value so the See less control stays visible.
      if (expanded) return;
      setOverflows(el.scrollHeight - el.clientHeight > 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, expanded, lines]);

  // Re-measure once fonts settle (prevents false negatives on first paint).
  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      const el = ref.current;
      if (el && !expanded) setOverflows(el.scrollHeight - el.clientHeight > 1);
    });
    return () => { cancelled = true; };
  }, [expanded]);

  const clampStyle = expanded
    ? undefined
    : ({
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical" as const,
        overflow: "hidden",
      } satisfies React.CSSProperties);

  const maskFrom =
    variant === "overlay"
      ? "from-transparent via-black/70 to-black/90"
      : "from-transparent via-background to-background";

  const linkColor =
    variant === "overlay" ? "text-white/80" : "text-muted-foreground";

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        style={clampStyle}
        className={cn(
          "leading-snug whitespace-pre-wrap break-words",
          variant === "overlay" ? "text-white drop-shadow-lg" : "text-foreground",
        )}
      >
        {prefix}
        {children ?? text}
      </div>

      {/* Collapsed + overflowing → overlay "… See more" on last visible line */}
      {!expanded && overflows && (
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={false}
          aria-label="Show full caption"
          className={cn(
            "absolute right-0 bottom-0 pl-16 pr-0 text-[13px] font-medium max-w-[70%] text-right whitespace-nowrap",
            "bg-gradient-to-r",
            maskFrom,
            linkColor,
            "active:opacity-70",
          )}
        >
          {"…  "}
          <span className={variant === "overlay" ? "text-white" : "text-foreground"}>
            See more
          </span>
        </button>
      )}

      {/* Expanded → trailing inline See less */}
      {expanded && overflows && (
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={true}
          aria-label="Collapse caption"
          className={cn(
            "mt-0.5 text-[12px] font-medium active:opacity-70",
            linkColor,
          )}
        >
          See less
        </button>
      )}
    </div>
  );
}

export default CollapsibleCaption;
