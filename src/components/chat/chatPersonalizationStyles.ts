export const DEFAULT_CHAT_WALLPAPER_CLASS =
  "bg-[radial-gradient(circle_at_16px_18px,rgba(14,116,144,0.12)_0_1px,transparent_1.7px),radial-gradient(circle_at_46px_42px,rgba(16,185,129,0.11)_0_1.2px,transparent_1.9px),linear-gradient(135deg,rgba(236,253,245,0.96)_0%,rgba(219,234,254,0.9)_52%,rgba(254,249,195,0.74)_100%)] dark:bg-[radial-gradient(circle_at_16px_18px,rgba(125,211,252,0.13)_0_1px,transparent_1.7px),radial-gradient(circle_at_46px_42px,rgba(52,211,153,0.11)_0_1.2px,transparent_1.9px),linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(20,83,45,0.6)_54%,rgba(8,47,73,0.78)_100%)] [background-size:64px_64px,64px_64px,100%_100%]";

export function getWallpaperClass(id: string): string {
  if (id.startsWith("custom:")) return "";
  const map: Record<string, string> = {
    default: DEFAULT_CHAT_WALLPAPER_CLASS,
    bubbles: "bg-gradient-to-br from-primary/5 to-accent/10",
    sunset: "bg-gradient-to-b from-orange-100/30 to-pink-100/30 dark:from-orange-950/20 dark:to-pink-950/20",
    ocean: "bg-gradient-to-b from-blue-100/30 to-cyan-100/30 dark:from-blue-950/20 dark:to-cyan-950/20",
    forest: "bg-gradient-to-b from-green-100/30 to-emerald-100/30 dark:from-green-950/20 dark:to-emerald-950/20",
    midnight: "bg-gradient-to-b from-slate-200/30 to-indigo-100/30 dark:from-slate-900/40 dark:to-indigo-950/30",
    lavender: "bg-gradient-to-b from-purple-100/30 to-violet-100/30 dark:from-purple-950/20 dark:to-violet-950/20",
    cherry: "bg-gradient-to-b from-rose-100/30 to-red-100/30 dark:from-rose-950/20 dark:to-red-950/20",
    gold: "bg-gradient-to-b from-amber-100/30 to-yellow-100/30 dark:from-amber-950/20 dark:to-yellow-950/20",
    slate: "bg-gradient-to-b from-gray-200/30 to-slate-300/30 dark:from-gray-800/30 dark:to-slate-900/30",
  };
  return map[id] || "";
}

export function getChatCanvasClass(id = "default"): string {
  if (id.startsWith("custom:")) return DEFAULT_CHAT_WALLPAPER_CLASS;
  return getWallpaperClass(id) || DEFAULT_CHAT_WALLPAPER_CLASS;
}

export function getWallpaperStyle(id: string): React.CSSProperties | undefined {
  if (!id.startsWith("custom:")) return undefined;
  return {
    backgroundImage: `url(${id.replace("custom:", "")})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

export function getThemeColorClass(id: string): string {
  const map: Record<string, string> = {
    default: "bg-primary",
    rose: "bg-rose-500",
    orange: "bg-orange-500",
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    amber: "bg-amber-500",
    cyan: "bg-cyan-500",
    pink: "bg-pink-400",
    indigo: "bg-indigo-500",
  };
  return map[id] || "bg-primary";
}
