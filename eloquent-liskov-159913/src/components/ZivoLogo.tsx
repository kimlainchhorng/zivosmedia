import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import zivoLogoPng from "@/assets/zivo-logo.png";

interface ZivoLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: { container: "h-7", icon: "w-6 h-6", text: "text-lg" },
  md: { container: "h-9", icon: "w-8 h-8", text: "text-xl" },
  lg: { container: "h-11", icon: "w-10 h-10", text: "text-2xl" },
  xl: { container: "h-14", icon: "w-12 h-12", text: "text-3xl" },
};

const ZivoLogo = forwardRef<HTMLDivElement, ZivoLogoProps>(({ size = "md", showText = true, className }, ref) => {
  const sizes = sizeClasses[size];
  
  return (
    <div ref={ref} className={cn("flex items-center gap-2", sizes.container, className)}>
	      <img
	        src={zivoLogoPng}
	        alt="ZIVO"
	        className={cn("object-contain rounded-xl", sizes.icon)}
	        loading="eager"
	        decoding="async"
	      />
      
      {showText && (
        <span className={cn(
          "font-bold tracking-tight text-ig-gradient",
          sizes.text
        )}>
          ZIVO
        </span>
      )}
    </div>
  );
});

ZivoLogo.displayName = "ZivoLogo";

export default ZivoLogo;
