/**
 * Hook for preserving UTM parameters across navigation
 * Ensures tracking params persist throughout the user session
 */

import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const UTM_PARAMS = [
  'utm_source',
  'utm_medium', 
  'utm_campaign',
  'utm_content',
  'utm_term',
  'creator',
  'subid',
];

/**
 * Extract UTM params from current location
 */
export function useUTMParams(): URLSearchParams {
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);
  
  const utmParams = new URLSearchParams();
  UTM_PARAMS.forEach(param => {
    const value = currentParams.get(param);
    if (value) {
      utmParams.set(param, value);
    }
  });
  
  return utmParams;
}

/**
 * Get preserved UTM query string for appending to URLs
 */
export function useUTMQueryString(): string {
  const utmParams = useUTMParams();
  return utmParams.toString();
}

/**
 * Navigate while preserving UTM parameters
 */
export function usePreserveUTMNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navigateWithUTM = useCallback((
    to: string,
    options?: { replace?: boolean; state?: any }
  ) => {
    const currentParams = new URLSearchParams(location.search);
    const targetUrl = new URL(to, window.location.origin);
    
    // Preserve UTM params from current URL
    UTM_PARAMS.forEach(param => {
      const value = currentParams.get(param);
      if (value && !targetUrl.searchParams.has(param)) {
        targetUrl.searchParams.set(param, value);
      }
    });
    
    // Construct the path with query string
    const finalPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    
    navigate(finalPath, options);
  }, [navigate, location.search]);
  
  return navigateWithUTM;
}

/**
 * Build a URL with preserved UTM params
 */
export function buildURLWithUTM(basePath: string, currentSearch: string): string {
  const currentParams = new URLSearchParams(currentSearch);
  const targetUrl = new URL(basePath, window.location.origin);
  
  UTM_PARAMS.forEach(param => {
    const value = currentParams.get(param);
    if (value && !targetUrl.searchParams.has(param)) {
      targetUrl.searchParams.set(param, value);
    }
  });
  
  return `${targetUrl.pathname}${targetUrl.search}`;
}

/**
 * Hook that returns the current UTM params as an object
 */
export function useUTMParamsObject(): Record<string, string> {
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);
  
  const result: Record<string, string> = {};
  UTM_PARAMS.forEach(param => {
    const value = currentParams.get(param);
    if (value) {
      result[param] = value;
    }
  });
  
  return result;
}
