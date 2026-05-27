export function getWallpaperClass(id: string): string {
  if (id.startsWith("custom:")) return "";
  const map: Record<string, string> = {
    default: "",
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
