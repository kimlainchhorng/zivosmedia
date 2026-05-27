/**
 * MarketingPreviewSwitcher — floating control to preview the Marketing & Ads
 * section at fixed widths (Mobile 375 / iPad 820 / Desktop 1280) without
 * resizing the actual viewport. Hidden on Capacitor native shells.
 */
import * as React from "react";
import { Smartphone, Tablet, Monitor, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMarketingPreview } from "./MarketingPreviewContext";
import type { MarketingPreviewWidth } from "./MarketingPreviewContext";

const PRESETS: { label: string; width: number; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "Mobile", width: 375, icon: Smartphone },
  { label: "iPad", width: 820, icon: Tablet },
  { label: "Desktop", width: 1280, icon: Monitor },
];

function isCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).Capacitor?.isNativePlatform?.());
}

export default function MarketingPreviewSwitcher() {
  const { previewWidth, setPreviewWidth } = useMarketingPreview();
  const [collapsed, setCollapsed] = React.useState(true);

  if (isCapacitor()) return null;

  const select = (w: MarketingPreviewWidth) => setPreviewWidth(w);

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-border bg-background/95 backdrop-blur p-1 shadow-lg"
      role="toolbar"
      aria-label="Preview viewport switcher"
    >
      {!collapsed && PRESETS.map((p) => {
        const Icon = p.icon;
        const active = previewWidth === p.width;
        return (
          <Button
            key={p.label}
            size="sm"
            variant={active ? "default" : "ghost"}
            onClick={() => select(p.width)}
            className="h-8 px-2.5 gap-1 text-xs"
            aria-pressed={active}
            aria-label={`Preview at ${p.label} width ${p.width}px`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{p.label}</span>
          </Button>
        );
      })}
      {previewWidth !== null && !collapsed && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          onClick={() => select(null)}
          aria-label="Reset to native viewport"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        size="sm"
        variant={previewWidth ? "default" : "outline"}
        className="h-8 px-2.5 text-xs"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand preview switcher" : "Collapse preview switcher"}
      >
        <Monitor className="h-3.5 w-3.5" />
        <span className="ml-1 hidden sm:inline">
          {previewWidth ? `${previewWidth}px` : "Preview"}
        </span>
      </Button>
    </div>
  );
}

/**
 * MarketingPreviewFrame — wraps children in a fixed-width device frame when a
 * preview is active. When `previewWidth` is null, renders children unchanged.
 */
export function MarketingPreviewFrame({ children }: { children: React.ReactNode }) {
  const { previewWidth } = useMarketingPreview();
  if (!previewWidth) return <>{children}</>;
  return (
    <div className="w-full overflow-x-auto">
      <div
        data-marketing-preview-frame
        style={{ width: previewWidth }}
        className={cn(
          "mx-auto rounded-2xl border-2 border-border/60 bg-background shadow-xl overflow-hidden",
          "transition-[width] duration-200"
        )}
      >
        <div className="px-3 py-1.5 border-b border-border/40 bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Preview · {previewWidth}px
        </div>
        <div className="p-3">{children}</div>
      </div>
    </div>
  );
}
