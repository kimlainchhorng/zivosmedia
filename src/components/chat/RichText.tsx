/**
 * RichText — renders Telegram-style inline message formatting.
 *
 * Replaces the former bare <SpoilerText> at the message-body render site.
 * Supports **bold** _italic_ ~~strike~~ `code` ||spoiler|| (see lib/chat/richText).
 * Builds React nodes only (no dangerouslySetInnerHTML) → no XSS surface.
 */
import { memo, Fragment, type ReactNode } from "react";
import { parseRichText, hasRichMarkers, type RichNode } from "@/lib/chat/richText";
import { Spoiler } from "./SpoilerText";

interface RichTextProps {
  text: string;
  /** Tailwind class applied to the wrapper span. */
  className?: string;
  /** Spoiler visual strength — "bold" for bubbles, "subtle" for list previews. */
  variant?: "bold" | "subtle";
}

function renderNodes(nodes: RichNode[], variant: "bold" | "subtle"): ReactNode[] {
  return nodes.map((node, i) => {
    if (node.type === "text") return <Fragment key={i}>{node.value}</Fragment>;
    const children = renderNodes(node.children, variant);
    switch (node.mark) {
      case "bold":
        return <strong key={i} className="font-bold">{children}</strong>;
      case "italic":
        return <em key={i} className="italic">{children}</em>;
      case "strike":
        return <span key={i} className="line-through">{children}</span>;
      case "code":
        return (
          <code
            key={i}
            className="font-mono text-[0.85em] bg-foreground/10 rounded px-1 py-0.5 break-all"
          >
            {children}
          </code>
        );
      case "spoiler":
        return <Spoiler key={i} text={children} variant={variant} />;
      default:
        return <Fragment key={i}>{children}</Fragment>;
    }
  });
}

function RichTextImpl({ text, className, variant = "bold" }: RichTextProps) {
  // Fast path: no markers → plain span (preserves prior behavior + perf).
  if (!hasRichMarkers(text)) return <span className={className}>{text}</span>;
  return <span className={className}>{renderNodes(parseRichText(text), variant)}</span>;
}

const RichText = memo(RichTextImpl);
export default RichText;
