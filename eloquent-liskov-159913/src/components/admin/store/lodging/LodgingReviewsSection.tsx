import { useMemo, useState } from "react";
import { MessageSquareText, Star, Flag, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingPanel, NextActions, SectionShell, StatCard } from "./LodgingOperationsShared";
import { useLodgingCatalog } from "@/hooks/lodging/useLodgingCatalog";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Review {
  id: string;
  store_id: string;
  reservation_id?: string | null;
  guest_name?: string | null;
  rating: number;
  cleanliness?: number | null;
  staff?: number | null;
  location_score?: number | null;
  value?: number | null;
  comfort?: number | null;
  title?: string | null;
  body?: string | null;
  reply?: string | null;
  replied_at?: string | null;
  flagged: boolean;
  source: string;
  created_at: string;
}

const Stars = ({ n }: { n: number }) => (
  <span className="inline-flex">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i <= n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
    ))}
  </span>
);

export default function LodgingReviewsSection({ storeId }: { storeId: string }) {
  const { list, remove } = useLodgingCatalog<Review>("lodging_reviews", storeId);
  const qc = useQueryClient();
  const rows = list.data || [];
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "unreplied" | "flagged" | "low">("all");

  const stats = useMemo(() => {
    const total = rows.length;
    const avg = total ? rows.reduce((s, r) => s + r.rating, 0) / total : 0;
    const replied = rows.filter((r) => r.reply).length;
    const flagged = rows.filter((r) => r.flagged).length;
    return { total, avg, replied, flagged };
  }, [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (filter === "unreplied") return !r.reply;
    if (filter === "flagged") return r.flagged;
    if (filter === "low") return r.rating <= 3;
    return true;
  }), [rows, filter]);

  const saveReply = async (review: Review) => {
    const reply = replyDraft[review.id];
    if (!reply?.trim()) return;
    const { error } = await (supabase as any).from("lodging_reviews").update({ reply, replied_at: new Date().toISOString() }).eq("id", review.id);
    if (error) return toast.error(error.message);
    toast.success("Reply posted");
    setReplyDraft((d) => { const next = { ...d }; delete next[review.id]; return next; });
    qc.invalidateQueries({ queryKey: ["lodging_reviews", storeId] });
  };

  const toggleFlag = async (review: Review) => {
    const { error } = await (supabase as any).from("lodging_reviews").update({ flagged: !review.flagged }).eq("id", review.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["lodging_reviews", storeId] });
  };

  return (
    <SectionShell title="Reviews & Guest Feedback" subtitle="Read guest reviews, post public replies, flag inappropriate content." icon={MessageSquareText}>
      <LodgingQuickJump active="lodge-reviews" />
      <LodgingSectionStatusBanner title="Reviews & Guest Feedback" icon={MessageSquareText} countLabel={`${stats.total} reviews · avg`} countValue={stats.avg ? stats.avg.toFixed(1) : "—"} fixLabel="Open property profile" fixTab="lodge-property" />
      {list.isLoading ? <LoadingPanel /> : <>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Total reviews" value={String(stats.total)} icon={MessageSquareText} />
          <StatCard label="Avg rating" value={stats.avg ? stats.avg.toFixed(1) : "—"} icon={Star} />
          <StatCard label="Replied" value={`${stats.replied}/${stats.total || 0}`} icon={Reply} />
          <StatCard label="Flagged" value={String(stats.flagged)} icon={Flag} />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "unreplied", "flagged", "low"] as const).map((f) => (
            <button type="button"
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
            >
              {f === "low" ? "≤3 stars" : f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? "No reviews yet. Reviews appear here automatically after checkout." : "No reviews match this filter."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{r.guest_name || "Guest"}</p>
                      <Badge variant="outline" className="capitalize">{r.source.replace(/_/g, " ")}</Badge>
                      {r.flagged && <Badge variant="destructive">Flagged</Badge>}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Stars n={r.rating} />
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => toggleFlag(r)}>
                    <Flag className={`h-4 w-4 ${r.flagged ? "fill-destructive text-destructive" : ""}`} />
                  </Button>
                </div>

                {r.title && <p className="text-sm font-semibold">{r.title}</p>}
                {r.body && <p className="text-sm text-muted-foreground">{r.body}</p>}

                {r.reply ? (
                  <div className="mt-2 rounded-md border-l-2 border-primary bg-muted/30 p-3">
                    <p className="text-xs font-semibold text-primary">Your reply · {r.replied_at ? new Date(r.replied_at).toLocaleDateString() : ""}</p>
                    <p className="mt-1 text-sm">{r.reply}</p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      rows={2}
                      placeholder="Write a public reply…"
                      value={replyDraft[r.id] || ""}
                      onChange={(e) => setReplyDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                    />
                    <Button size="sm" onClick={() => saveReply(r)} disabled={!replyDraft[r.id]?.trim()}>
                      <Reply className="mr-1.5 h-4 w-4" /> Post reply
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <NextActions actions={[
          { label: "Open checked-out reservations", tab: "lodge-reservations", hint: "Reach out to guests for missing reviews." },
          { label: "Improve property profile", tab: "lodge-property", hint: "Address common feedback in property details." },
          { label: "Review guest profiles", tab: "lodge-guests", hint: "Identify VIPs and repeat guests." },
        ]} />
      </>}
    </SectionShell>
  );
}
