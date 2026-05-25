/**
 * SalonReviewsSection — list of customer reviews + owner responses.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Star, Loader2, AlertCircle, Reply, EyeOff, Eye, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface SalonReviewsSectionProps { storeId: string; }

interface Review {
  id: string;
  store_id: string;
  client_name: string;
  stylist_name: string | null;
  rating_stars: number;
  comment: string | null;
  owner_response: string | null;
  is_visible: boolean;
  created_at: string;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function SalonReviewsSection({ storeId }: SalonReviewsSectionProps) {
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondTo, setRespondTo] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState("");

  const load = async () => {
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("salon_reviews").select("*").eq("store_id", storeId)
      .order("created_at", { ascending: false }).limit(200);
    if (err) { console.error(err); setError("Couldn't load reviews."); setLoading(false); return; }
    setRows((data ?? []) as unknown as Review[]);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  const stats = useMemo(() => {
    const visible = rows.filter((r) => r.is_visible);
    const n = visible.length;
    if (n === 0) return { count: 0, avg: 0, dist: [0, 0, 0, 0, 0] };
    const sum = visible.reduce((s, r) => s + r.rating_stars, 0);
    const dist = [0, 0, 0, 0, 0];
    visible.forEach((r) => { dist[r.rating_stars - 1]++; });
    return { count: n, avg: sum / n, dist };
  }, [rows]);

  const openRespond = (r: Review) => {
    setRespondTo(r);
    setResponseText(r.owner_response ?? "");
  };

  const handleRespond = async () => {
    if (!respondTo) return;
    setSaving(true);
    const { error: err } = await supabase.from("salon_reviews")
      .update({ owner_response: responseText.trim() || null } as never)
      .eq("id", respondTo.id);
    setSaving(false);
    if (err) { setError("Couldn't save response."); return; }
    toast.success("Response saved.");
    setRespondTo(null);
    await load();
  };

  const toggleVisible = async (r: Review) => {
    setSaving(true);
    const { error: err } = await supabase.from("salon_reviews").update({ is_visible: !r.is_visible } as never).eq("id", r.id);
    setSaving(false);
    if (err) { setError("Couldn't update visibility."); return; }
    await load();
  };

  const remove = async (id: string) => {
    setSaving(true);
    const { error: err } = await supabase.from("salon_reviews").delete().eq("id", id);
    setSaving(false);
    if (err) { setError("Couldn't delete."); return; }
    await load();
  };

  return (
    <div className="space-y-4">
      {error && <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

      <Card className="rounded-2xl border-border/60">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Star className="h-5 w-5 text-primary" /> Reviews & Ratings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Overall rating</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-3xl font-bold text-foreground">{stats.avg.toFixed(1)}</p>
                <Stars value={stats.avg} className="text-amber-500" />
              </div>
              <p className="text-[11px] text-muted-foreground">From {stats.count} review{stats.count === 1 ? "" : "s"}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Breakdown</p>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.dist[star - 1];
                const pct = stats.count > 0 ? (count / stats.count) * 100 : 0;
                return (
                  <div key={star} className="mb-1 flex items-center gap-2 text-xs">
                    <span className="w-6">{star}★</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Star className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">No reviews yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Reviews appear here once clients leave feedback after their visit.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.id} className={cn("rounded-xl border p-3", r.is_visible ? "border-border bg-card" : "border-border/60 bg-muted/30")}>
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                      {r.client_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{r.client_name}</p>
                        <Stars value={r.rating_stars} className="text-amber-500" />
                        {!r.is_visible && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hidden</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(r.created_at)}{r.stylist_name ? ` · ${r.stylist_name}` : ""}
                      </p>
                      {r.comment && <p className="mt-2 text-sm text-foreground/90">{r.comment}</p>}
                      {r.owner_response && (
                        <div className="mt-2 rounded-lg border-l-2 border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80">Your response</p>
                          <p className="text-foreground/90">{r.owner_response}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => openRespond(r)} disabled={saving}>
                      <Reply className="h-3.5 w-3.5" /> {r.owner_response ? "Edit reply" : "Reply"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => toggleVisible(r)} disabled={saving}>
                      {r.is_visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {r.is_visible ? "Hide" : "Show"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-destructive hover:text-destructive" onClick={() => remove(r.id)} disabled={saving}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={respondTo !== null} onOpenChange={(o) => !o && setRespondTo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reply to {respondTo?.client_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Stars value={respondTo?.rating_stars ?? 0} className="text-amber-500" />
            {respondTo?.comment && <p className="rounded-lg bg-muted p-3 text-sm italic text-foreground/85">"{respondTo.comment}"</p>}
            <div className="space-y-1.5">
              <Label htmlFor="rvResp">Your response</Label>
              <Textarea id="rvResp" value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={4} maxLength={1000} placeholder="Thank them, address concerns, or invite them back…" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setRespondTo(null)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleRespond} disabled={saving} className="gap-1.5">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save response</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn("h-3.5 w-3.5", value >= s ? "fill-current" : value >= s - 0.5 ? "fill-current opacity-50" : "fill-none")}
        />
      ))}
    </span>
  );
}
