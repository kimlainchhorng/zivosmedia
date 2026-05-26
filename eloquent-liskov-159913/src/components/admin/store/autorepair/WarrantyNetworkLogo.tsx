/**
 * Renders a warranty provider's real brand logo.
 * Fallback chain: Google S2 favicons → DuckDuckGo icons → icon.horse → monogram.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { WarrantyNetwork } from "@/config/warrantyNetworks";

type Size = "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, { box: string; text: string; px: number }> = {
  sm: { box: "w-5 h-5", text: "text-[9px]", px: 32 },
  md: { box: "w-8 h-8", text: "text-[11px]", px: 64 },
  lg: { box: "w-12 h-12", text: "text-sm", px: 128 },
};

function buildSources(domain: string, px: number): string[] {
  return [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=${Math.max(px, 64)}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://icon.horse/icon/${domain}`,
  ];
}

interface Props {
  network: WarrantyNetwork;
  size?: Size;
  className?: string;
}

export default function WarrantyNetworkLogo({ network, size = "md", className }: Props) {
  const dims = SIZE_MAP[size];
  const sources = network.domain ? buildSources(network.domain, dims.px) : [];
  const [idx, setIdx] = useState(0);

  const monogram =
    (network.shortName ?? network.name)
      .replace(/[^A-Za-z0-9 ]/g, "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";

  const exhausted = idx >= sources.length;

  if (exhausted) {
    return (
      <div
        className={cn(
          "shrink-0 rounded-md bg-muted text-muted-foreground font-semibold flex items-center justify-center border border-border",
          dims.box,
          dims.text,
          className,
        )}
        aria-label={network.name}
      >
        {monogram}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 rounded-md bg-background border border-border flex items-center justify-center overflow-hidden",
        dims.box,
        className,
      )}
    >
      <img
        src={sources[idx]}
        alt={network.name}
        loading="lazy"
        decoding="async"
        onError={() => setIdx((i) => i + 1)}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
