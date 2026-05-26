/**
 * Dealership reviews section — list, respond, hide/show, with stats and filters.
 */

import { memo, useMemo, useState } from "react";
import {
  Star, Loader2, MessageSquare, Eye, EyeOff, Filter, X, User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDealershipReviews, type DealershipReview } from "@/hooks/car-dealership/useDealershipReviews";
import { useDealershipSales } from "@/hooks/car-dealership/useDealershipSales";

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";
type StatusFilter = "all" | "pending" | "responded" | "hidden";
type DateFilter = "all" | "30d" | "90d" | "year";

const DATE_CUTOFF_MS: Record<DateFilter, number | null> = {
  all: null,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(cls, n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </div>
  );
}

interface Props { storeId: string; }

function CarDealershipReviewsSectionInner({ storeId }: Props) {
  const { reviews, loading, saving, respondTo, toggleVisible } = useDealershipReviews(storeId);
  const { sales } = useDealershipSales(storeId);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [draftResponse, setDraftResponse] = useState("");

  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [salespersonFilter, setSalespersonFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  // sale_id → salesperson_name map (only for sales that have a name assigned)
  const salespersonBySaleId = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sales) {
      if (s.salesperson_name && s.salesperson_name.trim()) {
        map.set(s.id, s.salesperson_name.trim());
      }
    }
    return map;
  }, [sales]);

  const salespersonOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of reviews) {
      if (r.sale_id) {
        const name = salespersonBySaleId.get(r.sale_id);
        if (name) set.add(name);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [reviews, salespersonBySaleId]);

  const filtered = useMemo(() => {
    const cutoffMs = DATE_CUTOFF_MS[dateFilter];
    const cutoff = cutoffMs ? Date.now() - cutoffMs : null;
    return reviews.filter((r) => {
      if (ratingFilter !== "all" && r.rating !== Number(ratingFilter)) return false;
      if (statusFilter === "pending" && (r.owner_response || !r.is_visible)) return false;
      if (statusFilter === "responded" && !r.owner_response) return false;
      if (statusFilter === "hidden" && r.is_visible) return false;
      if (cutoff && new Date(r.created_at).getTime() < cutoff) return false;
      if (salespersonFilter !== "all") {
        const name = r.sale_id ? salespersonBySaleId.get(r.sale_id) : null;
        if (name !== salespersonFilter) return false;
      }
      return true;
    });
  }, [reviews, ratingFilter, salespersonFilter, statusFilter, dateFilter, salespersonBySaleId]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const distribution = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: reviews.filter((r) => r.rating === stars).length,
    }));
    const responded = reviews.filter((r) => r.owner_response).length;
    const pending = reviews.filter((r) => !r.owner_response && r.is_visible).length;
    const hidden = reviews.filter((r) => !r.is_visible).length;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
    return { total, avg, distribution, responded, pending, hidden, responseRate };
  }, [reviews]);

  const hasActiveFilters =
    ratingFilter !== "all" ||
    salespersonFilter !== "all" ||
    statusFilter !== "all" ||
    dateFilter !== "all";

  const clearFilters = () => {
    setRatingFilter("all");
    setSalespersonFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
  };

  const submitResponse = async (r: DealershipReview) => {
    if (!draftResponse.trim()) return;
    const ok = await respondTo(r.id, draftResponse.trim());
    if (ok) {
      toast.success("Response posted.");
      setRespondingTo(null);
      setDraftResponse("");
    } else {
      toast.error("Couldn't save response.");
    }
  };

  const maxDistCount = Math.max(1, ...stats.distribution.map((d) => d.count));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Reviews & Ratings</h2>
          <p className="text-sm text-muted-foreground">
            {stats.total} review{stats.total === 1 ? "" : "s"}
            {stats.total > 0 && <> · {stats.avg.toFixed(1)} ★ average</>}
            {stats.pending > 0 && <> · <span className="text-amber-600 font-medium">{stats.pending} awaiting response</span></>}
          </p>
        </div>
      </div>

      {/* Stats panel */}
      {stats.total > 0 && (
        <Card className="p-4">
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-6">
            {/* Avg + KPIs */}
            <div className="flex sm:flex-col sm:items-start items-center gap-4 sm:gap-2 sm:border-r sm:pr-6">
              <div>
                <p className="text-3xl font-bold leading-none">{stats.avg.toFixed(1)}</p>
                <div className="mt-1.5"><Stars rating={Math.round(stats.avg)} size="md" /></div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {stats.total} review{stats.total === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-col gap-1 text-xs sm:mt-3">
                <span className="text-muted-foreground">
                  Response rate: <span className="font-semibold text-foreground">{stats.responseRate}%</span>
                </span>
                {stats.hidden > 0 && (
                  <span className="text-muted-foreground">
                    Hidden: <span className="font-semibold text-foreground">{stats.hidden}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Distribution bars */}
            <div className="space-y-1.5">
              {stats.distribution.map((d) => {
                const pct = stats.total > 0 ? (d.count / stats.total) * 100 : 0;
                const barWidth = (d.count / maxDistCount) * 100;
                const starsKey = String(d.stars) as RatingFilter;
                const isActive = ratingFilter === starsKey;
                return (
                  <button
                    key={d.stars}
                    type="button"
                    onClick={() => setRatingFilter(isActive ? "all" : starsKey)}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted/60",
                      isActive && "bg-muted",
                    )}
                  >
                    <span className="flex w-12 shrink-0 items-center gap-0.5 text-xs font-medium">
                      {d.stars} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                      {d.count} · {pct.toFixed(0)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Filter row */}
      {stats.total > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filter
          </div>
          <Select value={ratingFilter} onValueChange={(v) => setRatingFilter(v as RatingFilter)}>
            <SelectTrigger className="h-8 w-auto min-w-[110px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              <SelectItem value="5">5 stars</SelectItem>
              <SelectItem value="4">4 stars</SelectItem>
              <SelectItem value="3">3 stars</SelectItem>
              <SelectItem value="2">2 stars</SelectItem>
              <SelectItem value="1">1 star</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Awaiting response</SelectItem>
              <SelectItem value="responded">Responded</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="h-8 w-auto min-w-[110px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="year">Last year</SelectItem>
            </SelectContent>
          </Select>
          {salespersonOptions.length > 0 && (
            <Select value={salespersonFilter} onValueChange={setSalespersonFilter}>
              <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All salespeople</SelectItem>
                {salespersonOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
          {hasActiveFilters && (
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} of {stats.total}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <Card className="p-10 text-center">
          <Star className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No reviews yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Reviews from delivered deals will appear here.
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Filter className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No reviews match these filters</p>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-3">
            Clear filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const salesperson = r.sale_id ? salespersonBySaleId.get(r.sale_id) : null;
            return (
              <Card key={r.id} className={cn("p-4", !r.is_visible && "opacity-60")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{r.customer_name}</p>
                      <Stars rating={r.rating} />
                      {!r.is_visible && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                      {!r.owner_response && r.is_visible && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">
                          Awaiting response
                        </Badge>
                      )}
                    </div>
                    {r.vehicle_label && <p className="text-xs text-muted-foreground">{r.vehicle_label}</p>}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      {salesperson && (
                        <span className="inline-flex items-center gap-1">
                          · <User className="h-3 w-3" />{salesperson}
                        </span>
                      )}
                    </div>
                    {r.title && <p className="mt-2 font-medium">{r.title}</p>}
                    {r.body && <p className="mt-1 text-sm text-foreground/90">{r.body}</p>}

                    {r.owner_response ? (
                      <div className="mt-3 rounded-lg bg-muted/50 p-3 border-l-2 border-primary">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Owner response</p>
                        <p className="mt-1 text-sm">{r.owner_response}</p>
                      </div>
                    ) : respondingTo === r.id ? (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          rows={3}
                          value={draftResponse}
                          onChange={(e) => setDraftResponse(e.target.value)}
                          placeholder="Thank the customer or address concerns..."
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => submitResponse(r)} disabled={saving || !draftResponse.trim()}>
                            {saving ? "Saving..." : "Post response"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setRespondingTo(null); setDraftResponse(""); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="mt-2 -ml-2" onClick={() => { setRespondingTo(r.id); setDraftResponse(""); }}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1" /> Respond
                      </Button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleVisible(r.id, !r.is_visible)}
                    title={r.is_visible ? "Hide from public" : "Show to public"}
                  >
                    {r.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CarDealershipReviewsSection = memo(CarDealershipReviewsSectionInner);
export default CarDealershipReviewsSection;
