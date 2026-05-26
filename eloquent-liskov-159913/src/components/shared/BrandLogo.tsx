/**
 * BrandLogo Component
 * Dynamic logo based on brand configuration
 */
import { cn } from "@/lib/utils";
import { useBrand } from "@/hooks/useBrand";
import ZivoLogo from "@/components/ZivoLogo";

interface BrandLogoProps {
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

export function BrandLogo({ size = "md", showText = true, className }: BrandLogoProps) {
  const { brand, isLoading } = useBrand();
  const sizes = sizeClasses[size];

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", sizes.container, className)}>
        <div className={cn("rounded-xl bg-muted animate-pulse", sizes.icon)} />
        {showText && (
          <div className={cn("h-5 w-16 rounded bg-muted animate-pulse")} />
        )}
      </div>
    );
  }

  // If custom logo exists, show image
  if (brand.logoUrl) {
    return (
      <div className={cn("flex items-center gap-2", sizes.container, className)}>
        <img
          src={brand.logoUrl}
	          alt={brand.name}
	          className={cn("object-contain rounded-xl", sizes.icon)}
	          loading="lazy"
	          decoding="async"
	        />
        {showText && (
          <span className={cn("font-bold tracking-tight text-foreground", sizes.text)}>
            {brand.name}
          </span>
        )}
      </div>
    );
  }

  // Fall back to default ZIVO logo
  return <ZivoLogo size={size} showText={showText} className={className} />;
}

export default BrandLogo;
