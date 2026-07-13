/**
 * SmartImage — wraps <img> with a skeleton, lazy/async loading,
 * and a branded fallback when the source fails or is missing.
 *
 * Replaces raw <img> in card grids so broken URLs render a clean
 * gradient placeholder instead of the browser's "?" icon.
 */
import { useMemo, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { optimizeImage } from "@/lib/optimizeImage";
import { cn } from "@/lib/utils";

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading" | "decoding"> {
  src?: string | null;
  alt: string;
  /** Element rendered when the image is missing or fails to load. */
  fallback?: ReactNode;
  /** Hide the shimmer skeleton (e.g. for already-cached avatars). */
  noSkeleton?: boolean;
  /** Force eager loading for above-the-fold LCP images. */
  eager?: boolean;
  /** Desired rendered image width, used for CDN/storage transformations. */
  size?: number;
  /** Transformation mode for square thumbnails vs cover images. */
  mode?: "cover" | "square";
  className?: string;
  wrapperClassName?: string;
}

export function SmartImage({
  src,
  alt,
  fallback,
  noSkeleton,
  eager,
  size,
  mode = "cover",
  className,
  wrapperClassName,
  ...rest
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const optimizedSrc = useMemo(
    () => (src ? optimizeImage(src, size ?? 600, mode) ?? src : undefined),
    [mode, size, src],
  );
  const showFallback = !optimizedSrc || errored;

  return (
    <div className={cn("absolute inset-0 w-full h-full overflow-hidden bg-muted", wrapperClassName)}>
      {!loaded && !showFallback && !noSkeleton && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/60 to-muted animate-pulse" />
      )}
      {showFallback ? (
        fallback ?? (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />
        )
      ) : (
        <img
          {...rest}
          src={optimizedSrc}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            className,
          )}
        />
      )}
    </div>
  );
}

export default SmartImage;
