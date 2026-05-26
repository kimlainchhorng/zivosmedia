import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import Star from "lucide-react/dist/esm/icons/star";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import { toast } from "sonner";

interface Props { storeId: string }

const FILTERS = ["All", "5★", "4★", "3★", "2★", "1★"] as const;
type Filter = typeof FILTERS[number];

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

export default function AutoRepairReviewsSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("All");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["ar-reviews", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("store_reviews")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const saveReply = useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      const { error } = await (supabase as any)
        .from("store_reviews")
        .update({ reply })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reply saved");
      qc.invalidateQueries({ queryKey: ["ar-reviews", storeId] });
      setReplyingTo(null);
      setReplyText("");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save reply"),
  });

  const filtered = reviews.filter((r: any) => {
    if (filter === "All") return true;
    return r.rating === parseInt(filter);
  });

  const avg =
    reviews.length === 0
      ? 0
      : reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) / reviews.length;

  const countFor = (n: number) => reviews.filter((r: any) => r.rating === n).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4" /> Customer Reviews
          </CardTitle>
        </CardHeader>
        {reviews.length > 0 && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-6">
              <div className="text-center shrink-0">
                <p className="text-5xl font-bold">{avg.toFixed(1)}</p>
                <StarRow rating={Math.round(avg)} />
                <p className="text-xs text-muted-foreground mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map((n) => {
                  const pct = reviews.length === 0 ? 0 : (countFor(n) / reviews.length) * 100;
                  return (
                    <div key={n} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-right text-muted-foreground">{n}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-5 text-muted-foreground">{countFor(n)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {reviews.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className="h-7 text-xs px-3"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading reviews…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {reviews.length === 0 ? "No reviews yet. They'll appear here once customers leave feedback." : "No reviews match this filter."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence initial={false}>
            {filtered.map((r: any) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{r.author_name ?? "Anonymous"}</p>
                        <StarRow rating={r.rating ?? 0} />
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                      </p>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                    {r.reply && (
                      <div className="bg-muted/50 rounded-md px-3 py-2 text-xs border-l-2 border-primary/40">
                        <span className="font-semibold text-primary">Your reply: </span>
                        {r.reply}
                      </div>
                    )}
                    {replyingTo === r.id ? (
                      <div className="flex gap-2 pt-1">
                        <Input
                          className="text-sm h-8"
                          placeholder="Write a reply…"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && replyText.trim())
                              saveReply.mutate({ id: r.id, reply: replyText.trim() });
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-8"
                          disabled={!replyText.trim() || saveReply.isPending}
                          onClick={() => saveReply.mutate({ id: r.id, reply: replyText.trim() })}
                        >
                          Post
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => { setReplyingTo(null); setReplyText(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1.5 text-xs px-2"
                        onClick={() => {
                          setReplyingTo(r.id);
                          setReplyText(r.reply ?? "");
                        }}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {r.reply ? "Edit reply" : "Reply"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
