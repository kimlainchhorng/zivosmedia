/**
 * CafeReviewsSection — list customer reviews, reply, hide/show, delete,
 * and seed paper-form reviews via a manual "Add review" dialog.
 */
import { useMemo, useState } from "react";
import { Star, MessageSquareText, Loader2, Eye, EyeOff, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCafeReviews, type CafeReviewDraft, type CafeReview } from "@/hooks/cafe/useCafeReviews";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props { storeId: string }

const blank = (): CafeReviewDraft => ({
  display_name: "",
  rating_stars: 5,
  comment: null,
  tags: [],
  is_visible: true,
});

function Stars({ value, onChange, size = 14 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s} type="button" disabled={!onChange}
          onClick={() => onChange?.(s)}
          className={cn("transition-colors", onChange ? "cursor-pointer" : "cursor-default")}
        >
          <Star
            className={cn(s <= value ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40")}
            style={{ width: size, height: size }}
          />
        </button>
      ))}
    </span>
  );
}

export default function CafeReviewsSection({ storeId }: Props) {
  const { reviews, stats, loading, saving, create, reply, setVisible, remove } = useCafeReviews(storeId);
  const [filter, setFilter] = useState<"all" | "unreplied" | "low">("all");
  const [addDialog, setAddDialog] = useState(false);
  const [draft, setDraft] = useState<CafeReviewDraft>(blank());
  const [replyDialog, setReplyDialog] = useState<{ open: boolean; review: CafeReview | null }>({ open: false, review: null });
  const [replyText, setReplyText] = useState("");

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (filter === "unreplied") return !r.owner_response && r.is_visible;
      if (filter === "low") return r.rating_stars <= 2 && r.is_visible;
      return true;
    });
  }, [reviews, filter]);

  const submitAdd = async () => {
    if (!draft.display_name.trim()) { toast.error("Reviewer name required."); return; }
    const c = await create(draft);
    if (c) {
      toast.success("Saved.");
      setAddDialog(false); setDraft(blank());
    }
  };

  const submitReply = async () => {
    if (!replyDialog.review) return;
    await reply(replyDialog.review.id, replyText);
    toast.success("Reply sent.");
    setReplyDialog({ open: false, review: null });
    setReplyText("");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Average</p>
          <p className="text-2xl font-bold tabular-nums flex items-center gap-2">{stats.avg.toFixed(1)} <Stars value={Math.round(stats.avg)} size={16} /></p>
          <p className="text-[11px] text-muted-foreground">from {stats.count} review{stats.count === 1 ? "" : "s"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Unreplied</p>
          <p className="text-2xl font-bold tabular-nums">{stats.unreplied}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Distribution</p>
          <ul className="text-[11px] mt-1 space-y-0.5">
            {([5, 4, 3, 2, 1] as const).map((n) => {
              const pct = stats.count > 0 ? Math.round(((stats.distribution[n] ?? 0) / stats.count) * 100) : 0;
              return (
                <li key={n} className="flex items-center gap-1.5">
                  <span className="w-3 tabular-nums">{n}</span><Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${pct}%` }} /></div>
                  <span className="w-6 text-right tabular-nums">{stats.distribution[n] ?? 0}</span>
                </li>
              );
            })}
          </ul>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base flex-wrap gap-2">
            <span className="flex items-center gap-2"><Star className="h-4 w-4" /> Reviews</span>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border border-border bg-card overflow-hidden">
                {(["all", "unreplied", "low"] as const).map((k) => (
                  <button key={k} onClick={() => setFilter(k)} type="button" className={cn(
                    "px-3 py-1 text-xs capitalize",
                    filter === k ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}>{k === "low" ? "1–2 ★" : k}</button>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={() => { setDraft(blank()); setAddDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              {reviews.length === 0 ? "No reviews yet — replies and ratings will appear here." : "No reviews in this view."}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((r) => (
                <li key={r.id} className="py-3 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.display_name}</span>
                    <Stars value={r.rating_stars} />
                    {!r.is_visible && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                    <span className="text-[11px] text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="text-sm text-foreground/85">{r.comment}</p>}
                  {r.owner_response && (
                    <div className="ml-3 mt-1 border-l-2 border-amber-500/40 pl-3 text-sm">
                      <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold">Reply</p>
                      <p className="text-foreground/85">{r.owner_response}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-1 pt-1">
                    <Button size="sm" variant={r.owner_response ? "ghost" : "outline"} className="h-7 text-xs" onClick={() => { setReplyText(r.owner_response ?? ""); setReplyDialog({ open: true, review: r }); }}>
                      <MessageSquareText className="h-3.5 w-3.5 mr-1" /> {r.owner_response ? "Edit reply" : "Reply"}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title={r.is_visible ? "Hide" : "Show"} onClick={() => setVisible(r.id, !r.is_visible)}>
                      {r.is_visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete review?")) remove(r.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add review */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add review</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reviewer name</Label>
              <Input value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />
            </div>
            <div>
              <Label>Rating</Label>
              <div className="mt-1"><Stars value={draft.rating_stars} onChange={(v) => setDraft({ ...draft, rating_stars: v })} size={22} /></div>
            </div>
            <div>
              <Label>Comment (optional)</Label>
              <Textarea rows={3} value={draft.comment ?? ""} onChange={(e) => setDraft({ ...draft, comment: e.target.value || null })} />
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border p-2">
              <span className="text-sm">Visible on storefront</span>
              <Switch checked={draft.is_visible} onCheckedChange={(v) => setDraft({ ...draft, is_visible: v })} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply */}
      <Dialog open={replyDialog.open} onOpenChange={(v) => setReplyDialog((d) => ({ ...d, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reply to {replyDialog.review?.display_name}</DialogTitle></DialogHeader>
          {replyDialog.review && (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Stars value={replyDialog.review.rating_stars} />
                  <span className="text-[11px] text-muted-foreground">{new Date(replyDialog.review.created_at).toLocaleDateString()}</span>
                </div>
                {replyDialog.review.comment && <p className="text-sm">{replyDialog.review.comment}</p>}
              </div>
              <Textarea rows={4} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Thanks for stopping by — see you again soon ☕" />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReplyDialog({ open: false, review: null })}>Cancel</Button>
            <Button onClick={submitReply} disabled={saving}>{replyDialog.review?.owner_response ? "Save reply" : "Send reply"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
