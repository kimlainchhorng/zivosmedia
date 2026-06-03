/**
 * BusTicketsPage - A signed-in customer's bus bookings ("My Bus Tickets").
 * Reads via the self-scoped SECURITY DEFINER RPC get_my_bus_bookings().
 * @module BusTicketsPage
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Ticket from "lucide-react/dist/esm/icons/ticket";
import Bus from "lucide-react/dist/esm/icons/bus";
import Star from "lucide-react/dist/esm/icons/star";

type BookingRow = {
  booking_id: string;
  booking_ref: string | null;
  status: string;
  payment_status: string;
  seats: string[];
  passenger_count: number;
  amount_cents: number;
  currency: string;
  operator: string;
  origin: string;
  destination: string;
  depart_date: string;
  depart_time: string;
  created_at: string;
  store_id: string;
  trip_id: string;
};

type MyReview = { booking_id: string | null; rating: number; comment: string | null };

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-600",
  hold: "bg-amber-500/15 text-amber-600",
  cancelled: "bg-rose-500/15 text-rose-500",
};

export default function BusTicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Record<string, MyReview>>({});
  const [openReview, setOpenReview] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const db = supabase as unknown as { from: (t: string) => any };

  const loadReviews = async () => {
    if (!user) return;
    const { data } = await db.from("bus_reviews").select("booking_id, rating, comment").eq("customer_id", user.id);
    const map: Record<string, MyReview> = {};
    for (const r of (data || []) as MyReview[]) if (r.booking_id) map[r.booking_id] = r;
    setReviews(map);
  };

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let active = true;
    (async () => {
      try {
        const { data } = await (supabase as unknown as { rpc: (fn: string) => Promise<{ data: BookingRow[] | null }> })
          .rpc("get_my_bus_bookings");
        if (active) setRows((data || []) as BookingRow[]);
        await loadReviews();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submitReview = async (b: BookingRow) => {
    setSavingReview(true);
    const { error } = await db.from("bus_reviews").insert({
      store_id: b.store_id,
      trip_id: b.trip_id,
      booking_id: b.booking_id,
      rating,
      comment: comment.trim() || null,
    });
    setSavingReview(false);
    if (error) { toast.error("Couldn't submit review."); return; }
    toast.success("Thanks for your review!");
    setOpenReview(null); setComment(""); setRating(5);
    void loadReviews();
  };

  const fmtDate = (d: string) => {
    try { return new Date(d + "T00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }
    catch { return d; }
  };

  return (
    <>
      <SEOHead title="ZIVO Bus – My Tickets" description="Your booked bus trips on ZIVO." canonical="/bus/tickets" noIndex />
      <AppLayout title={t("bus.my_tickets")} showBack onBack={() => navigate("/bus")}>
        <div className="mx-auto w-full max-w-2xl px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : rows.length === 0 ? (
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Ticket className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground">{t("bus.no_tickets")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("bus.no_tickets_sub")}</p>
              </div>
              <Button onClick={() => navigate("/bus")} className="h-11 rounded-2xl px-6 font-bold">
                <Bus className="mr-1.5 h-4 w-4" /> {t("bus.title")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((b) => (
                <div key={b.booking_id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="flex items-center justify-between bg-primary/10 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-primary" />
                      <span className="text-sm font-black text-foreground">{b.booking_ref || b.booking_id.slice(0, 8)}</span>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", STATUS_STYLE[b.status] || "bg-muted text-muted-foreground")}>
                      {b.status}
                    </span>
                  </div>
                  <div className="space-y-1.5 p-4 text-sm">
                    <p className="font-bold text-foreground">{b.origin} → {b.destination}</p>
                    <p className="text-muted-foreground">{b.operator}</p>
                    <p className="text-muted-foreground">
                      {fmtDate(b.depart_date)} · {(b.depart_time || "").slice(0, 5)} · {t("bus.seats_label")} {(b.seats || []).join(", ") || "—"}
                    </p>
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <span className="text-xs text-muted-foreground">
                        {b.payment_status === "captured" ? t("bus.total_paid") : t("bus.amount_due")}
                      </span>
                      <span className="font-black text-foreground">${(b.amount_cents / 100).toFixed(2)}</span>
                    </div>

                    {/* Review — only for confirmed trips */}
                    {b.status === "confirmed" && (
                      <div className="border-t border-border pt-2">
                        {reviews[b.booking_id] ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Your rating:</span>
                            <span className="inline-flex">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} className={cn("h-3.5 w-3.5", i <= reviews[b.booking_id].rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                              ))}
                            </span>
                          </div>
                        ) : openReview === b.booking_id ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} star`}>
                                  <Star className={cn("h-6 w-6", i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                                </button>
                              ))}
                            </div>
                            <textarea
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              rows={2}
                              placeholder="How was your trip? (optional)"
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => submitReview(b)} disabled={savingReview} className="h-8 rounded-lg text-xs font-bold">{savingReview ? "Submitting…" : "Submit review"}</Button>
                              <Button size="sm" variant="outline" onClick={() => { setOpenReview(null); setComment(""); setRating(5); }} className="h-8 rounded-lg text-xs font-bold">Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => { setOpenReview(b.booking_id); setRating(5); setComment(""); }} className="flex items-center gap-1.5 text-xs font-bold text-primary">
                            <Star className="h-3.5 w-3.5" /> Rate this trip
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </>
  );
}
