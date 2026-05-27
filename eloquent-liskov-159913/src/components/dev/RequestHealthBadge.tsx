import { useMemo } from "react";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import { clearRequestHealth, useRequestHealthSnapshot } from "@/lib/requestHealth";

function topStatusLabel(byStatus: Record<string, number>) {
  const entries = Object.entries(byStatus);
  if (entries.length === 0) return "none";
  const [code, count] = entries.sort((a, b) => b[1] - a[1])[0];
  return `${code} (${count})`;
}

export default function RequestHealthBadge() {
  const snapshot = useRequestHealthSnapshot();

  const summary = useMemo(() => {
    return {
      total: snapshot.totalIssues,
      topStatus: topStatusLabel(snapshot.byStatus),
      network: snapshot.byCategory.network,
      auth: snapshot.byCategory.auth,
      retry: snapshot.byScope.retry,
      home: snapshot.byRoute.home,
      feed: snapshot.byRoute.feed,
      reels: snapshot.byRoute.reels,
      chat: snapshot.byRoute.chat,
      profile: snapshot.byRoute.profile,
    };
  }, [snapshot]);

  return (
    <div className="fixed bottom-24 right-3 z-[1500] hidden md:flex items-center gap-2 rounded-full border border-amber-400/35 bg-background/90 px-3 py-1.5 text-xs shadow-lg backdrop-blur-md">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
      <span className="font-semibold">Req health</span>
      <span className="text-muted-foreground">issues: {summary.total}</span>
      <span className="text-muted-foreground">top: {summary.topStatus}</span>
      <span className="text-muted-foreground">net: {summary.network}</span>
      <span className="text-muted-foreground">auth: {summary.auth}</span>
      <span className="text-muted-foreground">retry: {summary.retry}</span>
      <span className="text-muted-foreground">H:{summary.home}</span>
      <span className="text-muted-foreground">F:{summary.feed}</span>
      <span className="text-muted-foreground">R:{summary.reels}</span>
      <span className="text-muted-foreground">C:{summary.chat}</span>
      <span className="text-muted-foreground">P:{summary.profile}</span>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] hover:bg-muted"
        onClick={clearRequestHealth}
      >
        <RefreshCw className="h-3 w-3" />
        clear
      </button>
    </div>
  );
}
