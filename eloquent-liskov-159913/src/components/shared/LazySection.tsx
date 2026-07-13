/**
 * LazySection - Intersection Observer wrapper for lazy-loading below-fold sections
 * Reduces initial bundle size and improves LCP
 */
import { useState, useRef, useEffect, type ReactNode } from "react";

interface LazySectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  className?: string;
}

export default function LazySection({ children, fallback, rootMargin = "200px", className }: LazySectionProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {visible ? children : (fallback || <div className="min-h-[200px]" />)}
    </div>
  );
}
