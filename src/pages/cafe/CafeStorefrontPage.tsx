/**
 * Public cafe storefront at /cafe/:slug/about — the marketing landing
 * page. Hero with banner + logo + description, contact card with maps +
 * phone link, average rating + last 3 reviews, gift card balance CTA,
 * "Order online" primary CTA.
 *
 * Read-only; relies on existing RLS for store_profiles + cafe_reviews
 * public read policies.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Coffee, Loader2, AlertCircle, Star, MapPin, Phone, ArrowRight,
  CreditCard, ExternalLink, Facebook, Instagram, MessageCircle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  address: string | null;
  phone: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  telegram_url: string | null;
  is_active: boolean;
}

interface ReviewRow {
  id: string;
  display_name: string;
  rating_stars: number;
  comment: string | null;
  created_at: string;
  owner_response: string | null;
}

interface FeaturedItem {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
}

interface HoursRow {
  day_of_week: number;
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
}

interface OpenStatus {
  is_open_now: boolean;
  opens_at: string | null;
  closes_at: string | null;
  next_open_day: number | null;
  next_open_time: string | null;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatNextOpen(dayOfWeek: number | null, time: string | null): string {
  if (dayOfWeek === null || !time) return "later";
  const today = new Date().getDay();
  const hhmm = time.slice(0, 5);
  if (dayOfWeek === today) return `today at ${hhmm}`;
  if (dayOfWeek === (today + 1) % 7) return `tomorrow at ${hhmm}`;
  return `${DAY_LABELS[dayOfWeek]} at ${hhmm}`;
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(n <= value ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30")}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}

export default function CafeStorefrontPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreData | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const [hours, setHours] = useState<HoursRow[]>([]);
  const [openStatus, setOpenStatus] = useState<OpenStatus | null>(null);
  const [avg, setAvg] = useState<{ value: number; count: number }>({ value: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const storeRes = await supabase
        .from("store_profiles")
        .select("id,name,slug,description,logo_url,banner_url,address,phone,facebook_url,instagram_url,telegram_url,is_active")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (storeRes.error || !storeRes.data) {
        setError("This cafe couldn't be found.");
        setLoading(false);
        return;
      }
      const s = storeRes.data as StoreData;
      if (!s.is_active) {
        setError("This cafe is currently closed.");
        setLoading(false);
        return;
      }
      setStore(s);

      const [revRes, featRes, hoursRes, statusRes] = await Promise.all([
        supabase
          .from("cafe_reviews" as never)
          .select("id,display_name,rating_stars,comment,created_at,owner_response")
          .eq("store_id", s.id)
          .eq("is_visible", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("cafe_menu_items" as never)
          .select("id,name,description,price_cents,image_url")
          .eq("store_id", s.id)
          .eq("is_active", true)
          .eq("is_featured", true)
          .order("sort_order", { ascending: true })
          .limit(6),
        supabase
          .from("cafe_hours" as never)
          .select("day_of_week,is_open,opens_at,closes_at")
          .eq("store_id", s.id)
          .order("day_of_week", { ascending: true }),
        supabase.rpc("cafe_is_open_now" as never, { p_store_id: s.id } as never),
      ]);
      if (cancelled) return;
      const rows = (revRes.data ?? []) as unknown as ReviewRow[];
      setReviews(rows.slice(0, 3));
      if (rows.length > 0) {
        const sum = rows.reduce((acc, r) => acc + r.rating_stars, 0);
        setAvg({ value: sum / rows.length, count: rows.length });
      }
      setFeatured((featRes.data ?? []) as unknown as FeaturedItem[]);
      setHours((hoursRes.data ?? []) as unknown as HoursRow[]);
      const statusRow = ((statusRes.data ?? []) as unknown as OpenStatus[])[0] ?? null;
      setOpenStatus(statusRow);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-sm text-muted-foreground">{error || "Unavailable."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mapsUrl = store.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`
    : null;

  return (
    <div className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>{store.name} · Cafe</title>
        <meta name="description" content={store.description ?? `${store.name} — order online`} />
        <meta property="og:title" content={store.name} />
        {store.description && <meta property="og:description" content={store.description} />}
        {(store.banner_url || store.logo_url) && (
          <meta property="og:image" content={store.banner_url ?? store.logo_url ?? ""} />
        )}
      </Helmet>

      {/* Hero */}
      <div className="relative">
        {store.banner_url ? (
          <img src={store.banner_url} alt="" className="h-48 sm:h-64 w-full object-cover" />
        ) : (
          <div className="h-48 sm:h-64 bg-gradient-to-br from-amber-500/30 via-amber-500/15 to-amber-700/20" />
        )}
        <div className="max-w-2xl mx-auto px-4 -mt-12">
          <div className="flex items-end gap-4">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border-4 border-background bg-card shadow-lg overflow-hidden">
              {store.logo_url
                ? <img src={store.logo_url} alt="" className="h-full w-full object-cover" />
                : <Coffee className="h-10 w-10 text-amber-600" />}
            </div>
            <div className="min-w-0 pb-1 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">{store.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-sm flex-wrap">
                {openStatus && (
                  <Badge
                    className={cn(
                      "text-[10px] uppercase",
                      openStatus.is_open_now
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
                        : "bg-muted text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {openStatus.is_open_now
                      ? `Open · until ${(openStatus.closes_at ?? "").slice(0, 5)}`
                      : openStatus.next_open_time
                        ? `Closed · opens ${formatNextOpen(openStatus.next_open_day, openStatus.next_open_time)}`
                        : "Closed"}
                  </Badge>
                )}
                {avg.count > 0 && (
                  <>
                    <Stars value={Math.round(avg.value)} />
                    <span className="font-semibold tabular-nums">{avg.value.toFixed(1)}</span>
                    <span className="text-muted-foreground">({avg.count} review{avg.count === 1 ? "" : "s"})</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {store.description && (
            <p className="mt-4 text-foreground/85 text-[15px] leading-relaxed">{store.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-8 space-y-5">
        {/* Primary CTA */}
        <Button asChild size="lg" className="w-full shadow-md">
          <Link to={`/cafe/${store.slug}`}>
            <Coffee className="h-5 w-5 mr-2" /> Order online
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>

        {/* Contact card */}
        {(store.address || store.phone || store.facebook_url || store.instagram_url || store.telegram_url) && (
          <Card>
            <CardContent className="pt-5 pb-4 space-y-2">
              {store.address && (
                <a
                  href={mapsUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 group"
                >
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-primary shrink-0" />
                  <span className="text-sm flex-1 group-hover:underline">{store.address}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                </a>
              )}
              {store.phone && (
                <a href={`tel:${store.phone}`} className="flex items-center gap-3 group">
                  <Phone className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                  <span className="text-sm group-hover:underline">{store.phone}</span>
                </a>
              )}
              {(store.facebook_url || store.instagram_url || store.telegram_url) && (
                <div className="flex items-center gap-3 pt-1 border-t border-border/40 mt-2">
                  {store.facebook_url && (
                    <a href={store.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                      className="text-muted-foreground hover:text-primary">
                      <Facebook className="h-4 w-4" />
                    </a>
                  )}
                  {store.instagram_url && (
                    <a href={store.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                      className="text-muted-foreground hover:text-primary">
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                  {store.telegram_url && (
                    <a href={store.telegram_url} target="_blank" rel="noopener noreferrer" aria-label="Telegram"
                      className="text-muted-foreground hover:text-primary">
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Hours */}
        {hours.length > 0 && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Hours
              </p>
              <ul className="text-sm space-y-0.5 tabular-nums">
                {Array.from({ length: 7 }, (_, idx) => idx).map((dow) => {
                  const row = hours.find((h) => h.day_of_week === dow);
                  const today = new Date().getDay() === dow;
                  return (
                    <li key={dow} className={cn(
                      "flex items-center justify-between",
                      today && "font-semibold",
                    )}>
                      <span className={cn(today ? "text-foreground" : "text-muted-foreground")}>{DAY_LABELS[dow]}</span>
                      <span>
                        {row?.is_open && row.opens_at && row.closes_at
                          ? `${row.opens_at.slice(0, 5)} – ${row.closes_at.slice(0, 5)}`
                          : <span className="text-muted-foreground">Closed</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Gift card CTA */}
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-700">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Have a gift card?</p>
              <p className="text-[11px] text-muted-foreground">Check your balance before ordering</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to={`/cafe/${store.slug}/gift-card-check`}>Check</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Featured items */}
        {featured.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-2">Featured today</h2>
            <div className="grid grid-cols-2 gap-2">
              {featured.map((item) => (
                <Link
                  key={item.id}
                  to={`/cafe/${store.slug}`}
                  className="rounded-lg border border-border bg-card overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="h-24 w-full object-cover" />
                  ) : (
                    <div className="h-24 w-full bg-amber-500/10 grid place-items-center text-amber-600">
                      <Coffee className="h-6 w-6" />
                    </div>
                  )}
                  <div className="p-2.5 flex-1">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    {item.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</p>
                    )}
                    <p className="text-sm font-semibold tabular-nums mt-1">${(item.price_cents / 100).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">What people are saying</h2>
              {avg.count > 3 && (
                <Badge variant="secondary" className="text-[10px]">{avg.count} total</Badge>
              )}
            </div>
            <ul className="space-y-2">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{r.display_name}</span>
                    <Stars value={r.rating_stars} />
                  </div>
                  {r.comment && <p className="text-sm text-foreground/85">{r.comment}</p>}
                  {r.owner_response && (
                    <div className="mt-2 ml-2 border-l-2 border-amber-500/40 pl-2.5">
                      <p className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold">
                        Reply from {store.name}
                      </p>
                      <p className="text-[13px] text-foreground/85">{r.owner_response}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <Button asChild size="lg" variant="outline" className="w-full">
          <Link to={`/cafe/${store.slug}`}>
            <Coffee className="h-5 w-5 mr-2" /> See menu & order
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
