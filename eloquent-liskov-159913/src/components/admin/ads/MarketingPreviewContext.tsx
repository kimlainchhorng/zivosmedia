/**
 * MarketingPreviewContext — lets the Marketing & Ads section opt into a forced
 * preview width (e.g. 375 / 820 / 1280) without changing the actual viewport.
 * No data refetch — only layout-affecting hooks (useResponsiveWidth, useIsMobilePreview)
 * read from this context.
 */
import * as React from "react";

export type MarketingPreviewWidth = number | null;

interface Ctx {
  previewWidth: MarketingPreviewWidth;
  setPreviewWidth: (w: MarketingPreviewWidth) => void;
}

const MarketingPreviewCtx = React.createContext<Ctx>({
  previewWidth: null,
  setPreviewWidth: () => {},
});

export function MarketingPreviewProvider({ children }: { children: React.ReactNode }) {
  const [previewWidth, setPreviewWidth] = React.useState<MarketingPreviewWidth>(null);
  const value = React.useMemo(() => ({ previewWidth, setPreviewWidth }), [previewWidth]);
  return <MarketingPreviewCtx.Provider value={value}>{children}</MarketingPreviewCtx.Provider>;
}

export function useMarketingPreview() {
  return React.useContext(MarketingPreviewCtx);
}
