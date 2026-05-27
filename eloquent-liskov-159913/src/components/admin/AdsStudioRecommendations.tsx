/**
 * AdsStudioRecommendations — AI-generated budget shift / creative test suggestions.
 * Calls ads-studio-recommendations edge function and lets owners accept/dismiss.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Check, X, Loader2, Lightbulb } from "lucide-react";
import { RecommendationsSkeleton } from "./ads/MarketingSkeletons";
import MarketingEmptyState from "./ads/MarketingEmptyState";
import { mkBody, mkMeta } from "./ads/marketing-tokens";
import { cn } from "@/lib/utils";

interface Props { storeId: string }
interface Rec {
  id: string;
  recommendation_type: string;
  title: string;
  body: string;
  estimated_impact: string | null;
  status: string;
  created_at: string;
}

const TYPE_COLOR: Record<string, string> = {
  budget_shift: "bg-blue-500/15 text-blue-600",
  pause_platform: "bg-red-500/15 text-red-600",
  creative_test: "bg-emerald-500/15 text-emerald-600",
};

export default function AdsStudioRecommendations({ storeId }: Props) {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ads_studio_recommendations" as any)
      .select("id,recommendation_type,title,body,estimated_impact,status,created_at")
      .eq("store_id", storeId)
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) toast.error(error.message);
    setRecs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (storeId) load(); }, [storeId]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ads-studio-recommendations", {
        body: { store_id: storeId },
      });
      if (error) throw error;
      toast.success(`Generated ${data?.created ?? 0} recommendation(s)`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally { setGenerating(false); }
  };

  const respond = async (id: string, status: "accepted" | "dismissed") => {
    setBusy(id);
    const { error } = await supabase
      .from("ads_studio_recommendations" as any)
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(status === "accepted" ? "Marked as accepted" : "Dismissed"); load(); }
    setBusy(null);
  };

  if (loading) return <RecommendationsSkeleton />;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 min-w-0">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="truncate">AI recommendations</span>
        </CardTitle>
        <Button size="sm" variant="outline" className="h-9 sm:h-7 text-[11px] shrink-0" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
          Generate
        </Button>
      </CardHeader>
      <CardContent>
        {recs.length === 0 ? (
          <MarketingEmptyState
            icon={Lightbulb}
            title="No active recommendations"
            body='Click "Generate" to analyze your last 14 days of ad data and get AI suggestions.'
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {recs.map((r) => (
              <div key={r.id} className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-2 flex flex-col">
                <div className="flex items-start gap-2 flex-wrap">
                  <Badge className={cn("text-[10px] shrink-0", TYPE_COLOR[r.recommendation_type] || "")}>
                    {r.recommendation_type.replace("_", " ")}
                  </Badge>
                  <span className="text-xs sm:text-sm font-semibold flex-1 min-w-0 break-words">{r.title}</span>
                </div>
                <p className={cn(mkBody, "text-muted-foreground break-words flex-1")}>{r.body}</p>
                {r.estimated_impact && (
                  <span className="text-[11px] text-emerald-600 font-medium break-words">📈 {r.estimated_impact}</span>
                )}
                <div className="grid grid-cols-2 sm:flex sm:justify-end gap-1.5 sm:gap-1 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 sm:h-8 text-[11px] sm:text-[10px]"
                    onClick={() => respond(r.id, "dismissed")}
                    disabled={busy === r.id}
                  >
                    <X className="h-3 w-3 mr-0.5" /> Dismiss
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 sm:h-8 text-[11px] sm:text-[10px]"
                    onClick={() => respond(r.id, "accepted")}
                    disabled={busy === r.id}
                  >
                    {busy === r.id ? <Loader2 className="h-3 w-3 mr-0.5 animate-spin" /> : <Check className="h-3 w-3 mr-0.5" />}
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
