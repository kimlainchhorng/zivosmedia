/**
 * useResponsiveWidth — returns the effective layout width, honoring an active
 * Marketing preview override if present, else the live window width.
 *
 * Use `useIsMobilePreview()` for breakpoint branching inside Marketing & Ads
 * components — it agrees with the device frame chosen by the QA switcher.
 */
import * as React from "react";
import { useMarketingPreview } from "./MarketingPreviewContext";

const MOBILE_BREAKPOINT = 1024;

export function useResponsiveWidth(): number {
  const { previewWidth } = useMarketingPreview();
  const [winWidth, setWinWidth] = React.useState<number>(
    () => (typeof window !== "undefined" ? window.innerWidth : 1280)
  );
  React.useEffect(() => {
    const onResize = () => setWinWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return previewWidth ?? winWidth;
}

export function useIsMobilePreview(): boolean {
  return useResponsiveWidth() < MOBILE_BREAKPOINT;
}
