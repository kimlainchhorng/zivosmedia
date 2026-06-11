import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { ZIVO_CHAT_ORIGIN, ZIVO_CHAT_HOME_PATH } from "@/config/zivoChatDomain";

export interface ZivoChatSupportButtonProps extends Omit<ButtonProps, "asChild"> {
  /**
   * Path at zivoschat.com to open. Defaults to the chat home ("/chat") so the
   * support handoff lands the user directly in the chat (where they can reach
   * support), not the marketing homepage.
   */
  path?: string;
  /** Show the leading chat icon. Defaults to true. */
  showIcon?: boolean;
  /** Open ZivoChat in a new tab. Defaults to true. */
  newTab?: boolean;
  children?: ReactNode;
}

/**
 * Shared ZivoChat support entry. Renders a Button linking to the ZivoChat host
 * (zivoschat.com) so every surface exposes the same support handoff instead of
 * inlining the link per page. ZivoChat shares the Zivosmedia identity, so users
 * arrive already-recognized.
 *
 * Styling/content are overridable via the usual Button props and children.
 */
export default function ZivoChatSupportButton({
  path = ZIVO_CHAT_HOME_PATH,
  showIcon = true,
  newTab = true,
  variant = "outline",
  children,
  ...props
}: ZivoChatSupportButtonProps) {
  const normalizedPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  const href = `${ZIVO_CHAT_ORIGIN}${normalizedPath}`;

  return (
    <Button asChild variant={variant} {...props}>
      <a href={href} {...(newTab ? { target: "_blank", rel: "noreferrer" } : {})}>
        {showIcon && <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />}
        {children ?? "Chat on ZivoChat"}
      </a>
    </Button>
  );
}
