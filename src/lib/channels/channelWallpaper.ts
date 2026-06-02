import type { CSSProperties } from "react";

export type ChannelWallpaperStyle = "green" | "blue" | "pink" | "none";

type WallpaperPreset = {
  shell: CSSProperties;
  header: string;
  label: string;
};

const PATTERN = [
  "radial-gradient(circle at 18px 18px, rgba(255,255,255,.34) 0 2px, transparent 2.5px)",
  "radial-gradient(circle at 40px 44px, var(--channel-wallpaper-dot) 0 3px, transparent 3.5px)",
  "radial-gradient(circle at 8px 48px, var(--channel-wallpaper-dot-soft) 0 1.5px, transparent 2px)",
  "linear-gradient(135deg, rgba(255,255,255,.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.2) 50%, rgba(255,255,255,.2) 75%, transparent 75%, transparent)",
].join(", ");

export const CHANNEL_WALLPAPERS: Record<ChannelWallpaperStyle, WallpaperPreset> = {
  green: {
    label: "Green",
    shell: {
      backgroundColor: "#d8efd8",
      backgroundImage: PATTERN,
      backgroundSize: "72px 72px, 72px 72px, 72px 72px, 34px 34px",
      "--channel-wallpaper-dot": "rgba(64,122,96,.12)",
      "--channel-wallpaper-dot-soft": "rgba(64,122,96,.1)",
    } as CSSProperties,
    header: "linear-gradient(to bottom, rgba(216,239,216,.96), rgba(216,239,216,.82))",
  },
  blue: {
    label: "Blue",
    shell: {
      backgroundColor: "#d8edf7",
      backgroundImage: PATTERN,
      backgroundSize: "72px 72px, 72px 72px, 72px 72px, 34px 34px",
      "--channel-wallpaper-dot": "rgba(54,117,162,.14)",
      "--channel-wallpaper-dot-soft": "rgba(54,117,162,.1)",
    } as CSSProperties,
    header: "linear-gradient(to bottom, rgba(216,237,247,.96), rgba(216,237,247,.82))",
  },
  pink: {
    label: "Pink",
    shell: {
      backgroundColor: "#f3ddeb",
      backgroundImage: PATTERN,
      backgroundSize: "72px 72px, 72px 72px, 72px 72px, 34px 34px",
      "--channel-wallpaper-dot": "rgba(170,77,128,.13)",
      "--channel-wallpaper-dot-soft": "rgba(170,77,128,.1)",
    } as CSSProperties,
    header: "linear-gradient(to bottom, rgba(243,221,235,.96), rgba(243,221,235,.82))",
  },
  none: {
    label: "None",
    shell: {
      backgroundColor: "#f3f4f6",
    },
    header: "linear-gradient(to bottom, rgba(243,244,246,.96), rgba(243,244,246,.82))",
  },
};

export function normalizeChannelWallpaper(value?: string | null): ChannelWallpaperStyle {
  return value === "blue" || value === "pink" || value === "none" ? value : "green";
}
