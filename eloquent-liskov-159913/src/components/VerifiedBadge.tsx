import { type ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VERIFIED_LABEL, VERIFIED_TOOLTIP } from "@/lib/verification";

/**
 * VerifiedBadge — premium blue verified mark used across ZIVO.
 *
 * - Defaults to 1em sizing so it scales with surrounding text.
 * - Accessible: `role="img"` + `aria-label="Verified account"` + tooltip.
 * - Set `interactive={false}` when the badge sits inside another button
 *   or focusable surface (no nested interactives, no hover tooltip).
 */

type Props = {
  size?: number;
  className?: string;
  /** Tooltip + aria-label override (e.g. "Verified business"). */
  tooltipText?: string;
  /** Render with a hover tooltip + focus target. Default true. */
  interactive?: boolean;
};

const VerifiedBadge = ({
  size,
  className = "",
  tooltipText = VERIFIED_TOOLTIP,
  interactive = true,
}: Props): ReactElement => {
  const sizeStyle = size
    ? { width: size, height: size }
    : { width: "1em", height: "1em" };

  const svg = (
    <span
      role="img"
      aria-label={VERIFIED_LABEL}
      title={tooltipText}
      data-testid="verified-badge"
      className={`relative inline-flex items-center justify-center shrink-0 align-[-0.2em] ${className}`}
      style={sizeStyle}
    >
      <svg viewBox="0 0 24 24" className="h-full w-full block" aria-hidden="true" focusable="false">
        {/* Facebook 12-point scalloped starburst */}
        <path
          d="M12 1.6l2.05 1.86 2.74-.46 1.18 2.52 2.52 1.18-.46 2.74L21.9 12l-1.86 2.05.46 2.74-2.52 1.18-1.18 2.52-2.74-.46L12 21.9l-2.05-1.86-2.74.46-1.18-2.52-2.52-1.18.46-2.74L2.1 12l1.87-2.05-.46-2.74 2.52-1.18 1.18-2.52 2.74.46L12 1.6z"
          fill="#1877F2"
        />
        {/* Bold, optically-centered checkmark */}
        <path
          d="M7.6 12.25l3.05 3.05 5.75-6.2"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );

  if (!interactive) return svg;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{svg}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={4} className="text-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
};

export default VerifiedBadge;
