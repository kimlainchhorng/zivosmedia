/**
 * CarRentalReviewsSection — read and respond to renter reviews.
 */
import { useMemo, useState } from "react";
import {
  Star, Loader2, AlertTriangle, Send, Trash2, EyeOff, Eye, MessageCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useCarRentalReviews, type CarRentalReview } from "@/hooks/car-rental/useCarRentalReviews";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

export default function CarRentalReviewsSection({ storeId }: Props) {
  const { reviews, loading, saving, error, replyTo, acknowledge, togglePublished, remove } = useCarRentalReviews(storeId);
  const [filter, setFilter] = useState<"all" | "unreplied" | "low">("all");
  const [replying, setReplying] = useState<CarRentalReview | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const n = reviews.length;
    if (n === 0) return { avg: 0, n: 0, dist: [0, 0, 0, 0, 0], unreplied: 0 };
    let sum = 0;
    const dist = [0, 0, 0, 0, 0];
    let unreplied = 0;
    for (const r of reviews) {
      sum += r.rating;
      dist[r.rating - 1]++;
      if (!r.reply) unreplied++;
    }
    return { avg: sum / n, n, dist, unreplied };
  }, [reviews]);

  const filtered = useMemo(() => {
    if (filter === "unreplied") return reviews.filter((r) => !r.reply);
    if (filter === "low") return reviews.filter((r) => r.rating <= 3);
    return reviews;
  }, [reviews, filter]);

  const openReply = (r: CarRentalReview) => {
    setReplying(r);
    setReplyDraft(r.reply ?? "");
  };

  const submitReply = async () => {
    if (!replying) return;
    await replyTo(replying.id, replyDraft);
    setReplying(null);
    setReplyDraft("");
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-5 w-5 text-primary" /> Reviews & ratings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Average rating</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{stats.n > 0 ? stats.avg.toFixed(1) : "—"}</span>
                <span className="text-xs text-muted-foreground">/ 5</span>
                {stats.n > 0 && <Stars rating={stats.avg} />}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Based on {stats.n} review{stats.n === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Distribution</p>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.dist[star - 1] ?? 0;
                const pct = stats.n > 0 ? Math.round((count / stats.n) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-right text-muted-foreground">{star}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-amber-400" style={{ width: `${Math.max(0, pct)}%` }} />
                    </div>
                    <span className="w-8 text-right font-mono text-[11px] text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All ({reviews.length})</FilterChip>
            <FilterChip active={filter === "unreplied"} onClick={() => setFilter("unreplied")} tone="warn">
              Need reply ({stats.unreplied})
            </FilterChip>
            <FilterChip active={filter === "low"} onClick={() => setFilter("low")} tone="destructive">
              Low ratings ≤3
            </FilterChip>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Star className="mx-auto mb-2 h-8 w-8 opacity-50" />
              {reviews.length === 0 ? "No reviews yet. They'll appear here as renters share their experience." : "No reviews match this filter."}
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((r) => (
                <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Stars rating={r.rating} />
                        <span className="text-sm font-semibold text-foreground">{r.customer_name}</span>
                        {!r.is_published && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {r.vehicle_label ?? ""} · {new Date(r.created_at).toLocaleDateString()}
                      </p>
                      {r.comment && (
                        <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{r.comment}</p>
                      )}
                      {(r.cleanliness || r.service || r.value) && (
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                          {r.cleanliness !== null && <span>Cleanliness: <span className="font-bold text-foreground">{r.cleanliness}/5</span></span>}
                          {r.service !== null && <span>Service: <span className="font-bold text-foreground">{r.service}/5</span></span>}
                          {r.value !== null && <span>Value: <span className="font-bold text-foreground">{r.value}/5</span></span>}
                        </div>
                      )}
                      {r.reply && (
                        <div className="mt-3 rounded-lg border-l-2 border-primary bg-primary/5 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Owner reply</p>
                          <p className="mt-0.5 text-sm text-foreground/90 whitespace-pre-wrap">{r.reply}</p>
                          {r.reply_at && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(r.reply_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button size="sm" variant={r.reply ? "outline" : "default"} onClick={() => openReply(r)} disabled={saving}>
                        <MessageCircle className="mr-1 h-3.5 w-3.5" />{r.reply ? "Edit reply" : "Reply"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => togglePublished(r.id, !r.is_published)} disabled={saving}>
                        {r.is_published ? <><EyeOff className="mr-1 h-3.5 w-3.5" />Hide</> : <><Eye className="mr-1 h-3.5 w-3.5" />Show</>}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(r.id)} disabled={saving}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" />Delete
                      </Button>
                    </div>
                  </div>
                  {!r.is_acknowledged && (
                    <button type="button" className="mt-2 text-[11px] text-primary underline" onClick={() => acknowledge(r.id)}>
                      Mark as read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!replying} onOpenChange={(o) => !o && setReplying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to {replying?.customer_name}</DialogTitle>
          </DialogHeader>
          {replying && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <Stars rating={replying.rating} />
                {replying.comment && <p className="mt-2 text-foreground/80">{replying.comment}</p>}
              </div>
              <Textarea rows={5} value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} placeholder="Thank them or address their feedback…" />
              <p className="text-[11px] text-muted-foreground">
                Your reply is public. Keep it professional and acknowledge the feedback.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReplying(null)}>Cancel</Button>
            <Button onClick={submitReply} disabled={saving || !replyDraft.trim()}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              Post reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete review?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This permanently removes the review.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (deleteId) { await remove(deleteId); setDeleteId(null); }
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            "h-3.5 w-3.5",
            s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
          )}
        />
      ))}
    </div>
  );
}

function FilterChip({ active, onClick, children, tone }: {
  active: boolean; onClick: () => void; children: React.ReactNode; tone?: "warn" | "destructive";
}) {
  return (
    <button type="button" onClick={onClick} className={cn(
      "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border transition-colors",
      active
        ? "bg-primary text-primary-foreground border-primary"
        : tone === "warn"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : tone === "destructive"
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-border text-muted-foreground hover:text-foreground"
    )}>
      {children}
    </button>
  );
}
