import { forwardRef, useCallback } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { goCrossDomain } from "@/lib/crossDomainSSO";
import { ZIVO_MEDIA_ORIGIN } from "@/config/autoRepairDomain";

export interface ContinueWithZivosmediaButtonProps extends Omit<ButtonProps, "onClick" | "asChild"> {
  /** Path to land on at zivosmedia.com after the SSO handoff. Defaults to "/". */
  nextPath?: string;
}

/**
 * Shared "Continue with Zivosmedia" CTA for satellite-domain landings
 * (driver/business/employee/software/travel/chat). It carries the session to
 * the zivosmedia host via the existing SSO handoff (`goCrossDomain`), so the
 * unified-identity copy is identical everywhere instead of inlined per page.
 *
 * Styling and content are fully overridable via the usual Button props
 * (variant/size/className) and children.
 */
const ContinueWithZivosmediaButton = forwardRef<HTMLButtonElement, ContinueWithZivosmediaButtonProps>(
  ({ nextPath = "/", variant = "outline", children, ...props }, ref) => {
    const handleClick = useCallback(() => {
      void goCrossDomain(ZIVO_MEDIA_ORIGIN, nextPath);
    }, [nextPath]);

    return (
      <Button ref={ref} variant={variant} onClick={handleClick} {...props}>
        {children ?? "Continue with Zivosmedia"}
      </Button>
    );
  },
);

ContinueWithZivosmediaButton.displayName = "ContinueWithZivosmediaButton";

export default ContinueWithZivosmediaButton;
