/**
 * Airline Logo Component with Fallback Chain
 * Tries multiple sources before showing default icon
 */

import { useState, useCallback, memo, useEffect, forwardRef } from 'react';
import { Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLogoFallbackChain, type AirHexSize } from '@/lib/airlineLogo';

interface AirlineLogoProps {
  iataCode: string;
  airlineName?: string;
  size?: number;
  className?: string;
  showFallbackIcon?: boolean;
}

const AirlineLogoComponent = forwardRef<HTMLDivElement, AirlineLogoProps>(
  function AirlineLogoComponent(
    { iataCode, airlineName, size = 48, className, showFallbackIcon = true },
    ref
  ) {
    const code = (iataCode || '').trim().toUpperCase();

    const getAirHexSize = (s: number): AirHexSize => {
      if (s <= 32) return 32;
      if (s <= 64) return 64;
      if (s <= 100) return 100;
      return 200;
    };

    const fallbackChain = code
      ? getLogoFallbackChain(code, getAirHexSize(size))
      : [];

    const [fallbackIndex, setFallbackIndex] = useState(0);
    const [failed, setFailed] = useState(false);

    // Reset when code changes
    useEffect(() => {
      setFallbackIndex(0);
      setFailed(false);
    }, [code]);

    const handleError = useCallback(() => {
      if (fallbackIndex < fallbackChain.length - 1) {
        setFallbackIndex((i) => i + 1);
      } else {
        setFailed(true);
      }
    }, [fallbackIndex, fallbackChain.length]);

    const currentSrc = fallbackChain[fallbackIndex];
    const showImage = !failed && !!currentSrc;

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-lg bg-card border border-border/20',
          className
        )}
        style={{ width: size, height: size }}
        title={airlineName || code}
      >
        {showImage ? (
          <img
            src={currentSrc}
	            alt={airlineName || `${code} logo`}
	            className="w-full h-full object-contain p-0.5"
	            loading="eager"
	            decoding="async"
	            crossOrigin="anonymous"
            onError={handleError}
          />
        ) : showFallbackIcon ? (
          <Plane
            className="text-[hsl(var(--flights))]"
            style={{ width: size * 0.5, height: size * 0.5 }}
          />
        ) : (
          <span
            className="font-bold text-[hsl(var(--flights))]"
            style={{ fontSize: size * 0.35 }}
          >
            {code || 'FL'}
          </span>
        )}
      </div>
    );
  }
);

export const AirlineLogo = memo(AirlineLogoComponent);
export default AirlineLogo;
