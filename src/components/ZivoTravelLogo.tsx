import { forwardRef } from "react";
import zivoLogoPng from "@/assets/zivo-logo.png";
import { cn } from "@/lib/utils";

type ZivoTravelLogoSize = "sm" | "md" | "lg";
type ZivoTravelLogoTone = "default" | "inverse";

interface ZivoTravelLogoProps {
  size?: ZivoTravelLogoSize;
  tone?: ZivoTravelLogoTone;
  showWordmark?: boolean;
  className?: string;
}

const sizeClasses: Record<ZivoTravelLogoSize, { icon: string; text: string; gap: string }> = {
  sm: { icon: "h-7 w-7 rounded-lg", text: "text-base", gap: "gap-1.5" },
  md: { icon: "h-9 w-9 rounded-xl", text: "text-xl", gap: "gap-2" },
  lg: { icon: "h-11 w-11 rounded-2xl", text: "text-2xl", gap: "gap-2.5" },
};

/** Shared ZIVO masterbrand lockup with the Travel product accent. */
const ZivoTravelLogo = forwardRef<HTMLSpanElement, ZivoTravelLogoProps>(
  ({ size = "sm", tone = "default", showWordmark = true, className }, ref) => {
    const sizes = sizeClasses[size];
    const inverse = tone === "inverse";

    return (
      <span
        ref={ref}
        role="img"
        aria-label="Zivo Travel"
        className={cn("inline-flex items-center", sizes.gap, className)}
      >
        <img
          src={zivoLogoPng}
          alt=""
          aria-hidden="true"
          className={cn("shrink-0 object-contain", sizes.icon)}
          loading="eager"
          decoding="async"
        />
        {showWordmark && (
          <span aria-hidden="true" className={cn("font-black tracking-tight", sizes.text)}>
            <span className={inverse ? "text-primary-foreground" : "text-foreground"}>ZIVO</span>{" "}
            <span className={inverse ? "text-sky-300" : "text-sky-500"}>TRAVEL</span>
          </span>
        )}
      </span>
    );
  },
);

ZivoTravelLogo.displayName = "ZivoTravelLogo";

export default ZivoTravelLogo;
