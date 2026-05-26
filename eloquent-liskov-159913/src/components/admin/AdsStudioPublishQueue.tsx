/**
 * AdsStudioPublishQueue — schedule + dispatch creatives to Google/Meta/TikTok.
 * Real platform pushes are stubbed in the edge function until API tokens are configured.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, RefreshCw, Calendar, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props { storeId: string }
type Platform = "google" | "meta" | "tiktok" | "youtube";

interface Creative {
  id: string;
  goal: string;
  status: string;
  created_at: string;
  scheduled_at: string | null;
  auto_winner_at: string | null;
  auto_winner_picked: boolean;
}
interface Job {
  id: string;
  creative_id: string;
  platform: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  platform_campaign_id: string | null;
}

const PLATFORM_LABEL: Record<string, string> = { google: "Google", meta: "Meta", tiktok: "TikTok", youtube: "YouTube" };
const STATUS_COLOR: Record<string, string> = {
  queued: "bg-blue-500/15 text-blue-600",
  running: "bg-amber-500/15 text-amber-600",
  succeeded: "bg-emerald-500/15 text-emerald-600",
  failed: "bg-red-500/15 text-red-600",
  cancelled: "bg-muted text-muted-foreground",
};

export default function AdsStudioPublishQueue({ storeId }: Props) {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [winnerHours, setWinnerHours] = useState(48);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["google", "meta", "tiktok"]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: c }, { data: j }] = await Promise.all([
        supabase.from("ads_studio_creatives" as any).select("id,goal,status,created_at,scheduled_at,auto_winner_at,auto_winner_picked").eq("store_id", storeId).order("created_at", { ascending: false }).limit(20),
        supabase.from("ads_studio_publish_jobs" as any).select("id,creative_id,platform,status,scheduled_at,completed_at,error_message,platform_campaign_id").eq("store_id", storeId).order("created_at", { ascending: false }).limit(30),
      ]);
      setCreatives((c as any) || []);
      setJobs((j as any) || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load queue");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (storeId) load(); }, [storeId]);

  const togglePlatform = (p: Platform) => setSelectedPlatforms((s) => s.includes(p) ? s.filter(x => x !== p) : [...s, p]);

  const queuePublish = async (creativeId: string) => {
    if (selectedPlatforms.length === 0) return toast.error("Pick at least one platform");
    setBusy(creativeId);
    try {
      const { data, error } = await supabase.functions.invoke("ads-studio-publish", {
        body: { creative_id: creativeId, store_id: storeId, platforms: selectedPlatforms, scheduled_at: scheduleAt || undefined },
      });
      if (error) throw error;
      toast.success(`Queued ${data?.queued ?? 0} job(s)`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to queue");
    } finally { setBusy(null); }
  };

  const setAutoWinner = async (creativeId: string) => {
    const at = new Date(Date.now() + winnerHours * 3600_000).toISOString();
    setBusy(creativeId);
    try {
      const { error } = await supabase.from("ads_studio_creatives" as any).update({ auto_winner_at: at, auto_winner_picked: false }).eq("id", creativeId);
      if (error) throw error;
      toast.success(`Auto-winner scheduled in ${winnerHours}h`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to schedule");
    } finally { setBusy(null); }
  };

  const drainNow = async () => {
    setBusy("__drain__");
    try {
      const { data, error } = await supabase.functions.invoke("ads-studio-publish", { method: "GET" } as any);
      if (error) throw error;
      toast.success(`Drained ${data?.drained ?? 0} job(s)`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Drain failed");
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Publish & Schedule</h3>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={drainNow} disabled={busy === "__drain__"}>
            {busy === "__drain__" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            Drain queue
          </Button>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs">Publish settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["google", "meta", "tiktok", "youtube"] as Platform[]).map((p) => (
              <Badge
                key={p}
                onClick={() => togglePlatform(p)}
                variant={selectedPlatforms.includes(p) ? "default" : "outline"}
                className="cursor-pointer text-[11px]"
              >
                {PLATFORM_LABEL[p]}
              </Badge>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Schedule (optional)</Label>
              <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Auto-pick winner after (hours)</Label>
              <Input type="number" min={1} max={168} value={winnerHours} onChange={(e) => setWinnerHours(Math.max(1, Number(e.target.value) || 48))} className="h-8 text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs">Recent creatives</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-1.5">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : creatives.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">No creatives yet. Generate one in AI Studio.</p>
          ) : (
            <div className="space-y-1.5">
              {creatives.map((c) => (
                <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
                  <Badge variant="outline" className="text-[10px]">{c.goal}</Badge>
                  <span className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                  {c.auto_winner_at && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Trophy className="h-2.5 w-2.5" />
                      {c.auto_winner_picked ? "Winner picked" : `Pick @ ${new Date(c.auto_winner_at).toLocaleString()}`}
                    </Badge>
                  )}
                  <div className="ml-auto flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setAutoWinner(c.id)} disabled={busy === c.id}>
                      <Trophy className="h-3 w-3 mr-1" /> Auto-winner
                    </Button>
                    <Button size="sm" className="h-7 text-[11px]" onClick={() => queuePublish(c.id)} disabled={busy === c.id}>
                      {busy === c.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Rocket className="h-3 w-3 mr-1" />}
                      Publish
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" /> Publish jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">No jobs queued yet.</p>
          ) : (
            <div className="space-y-1">
              {jobs.map((j) => (
                <div key={j.id} className="grid grid-cols-12 items-center gap-2 text-[11px] py-1.5 border-b border-border/40 last:border-0">
                  <Badge variant="outline" className="col-span-2 text-[10px] justify-center">{PLATFORM_LABEL[j.platform] || j.platform}</Badge>
                  <Badge className={`col-span-2 text-[10px] justify-center ${STATUS_COLOR[j.status] || ""}`}>{j.status}</Badge>
                  <span className="col-span-3 truncate text-muted-foreground">{j.platform_campaign_id || (j.scheduled_at ? `@ ${new Date(j.scheduled_at).toLocaleString()}` : "—")}</span>
                  <span className="col-span-3 truncate text-red-500">{j.error_message || ""}</span>
                  <span className="col-span-2 text-right text-muted-foreground">{j.completed_at ? new Date(j.completed_at).toLocaleTimeString() : ""}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
