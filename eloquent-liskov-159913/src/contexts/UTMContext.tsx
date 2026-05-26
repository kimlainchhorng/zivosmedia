/**
 * UTM Tracking Provider
 * 
 * Initializes UTM parameter tracking on app load
 * Persists UTM params in session storage for use across pages
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { initUTMTracking, getPersistedUTMParams, type UTMParams } from '@/lib/subidGenerator';

interface UTMContextValue {
  utmParams: UTMParams;
  hasTracking: boolean;
}

const UTMContext = createContext<UTMContextValue>({
  utmParams: {},
  hasTracking: false,
});

export function UTMProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [utmParams, setUtmParams] = useState<UTMParams>({});
  
  useEffect(() => {
    // Initialize tracking on mount and whenever URL changes
    const params = initUTMTracking();
    setUtmParams(params);
  }, [location.search]);
  
  const hasTracking = Boolean(
    utmParams.utm_source || 
    utmParams.utm_campaign || 
    utmParams.creator
  );
  
  return (
    <UTMContext.Provider value={{ utmParams, hasTracking }}>
      {children}
    </UTMContext.Provider>
  );
}

export function useUTM() {
  return useContext(UTMContext);
}

/**
 * Hook to get current UTM parameters
 */
export function useCurrentUTM(): UTMParams {
  const { utmParams } = useUTM();
  return utmParams;
}

/**
 * Badge component to show when tracking is active (optional)
 */
export function TrackingBadge() {
  const { hasTracking, utmParams } = useUTM();
  
  if (!hasTracking) return null;
  
  return (
    <div
      className="fixed right-4 z-40 bg-primary/10 backdrop-blur-sm text-primary text-xs px-3 py-1.5 rounded-full border border-primary/20 flex items-center gap-2"
      style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 1rem)" }}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span>Tracking active</span>
      {utmParams.creator && (
        <span className="text-muted-foreground">• {utmParams.creator}</span>
      )}
    </div>
  );
}
