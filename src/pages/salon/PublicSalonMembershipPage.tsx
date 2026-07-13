/**
 * Public membership signup landing — /salon/:slug/membership.
 *
 * Loads the salon's active tiers via salon_public_get_membership_tiers,
 * renders a card per tier with pricing + perks, and on "Subscribe" mints a
 * Stripe Checkout Session for `mode: 'subscription'` via the
 * subscribe-salon-membership edge function. The webhook creates the
 * salon_client_memberships row on checkout.session.completed.
 */
import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  Crown, AlertCircle, Loader2, ArrowLeft, CheckCircle2, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;
import { cn } from "@/lib/utils";

interface StoreLite {
  id: string;
  name: string;
  slug: string;
}

interface Tier {
  id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  billing_interval: "month" | "year";
  service_discount_percent: number;
  has_stripe_price: boolean;
}

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function PublicSalonMembershipPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const [store, setStore] = useState<StoreLite | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline subscribe form state. We don't open a modal — just inline expand
  // the selected tier with email + name inputs so the customer can complete
  // the flow without a context switch.
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ?status=success|cancel from the Stripe Checkout return URL.
  const statusParam = params.get("status");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      // Slug → store lookup. The RPC needs a store_id, not a slug.
      const { data: storeRow, error: sErr } = await supabase
        .from("store_profiles")
        .select("id, name, slug")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      if (sErr || !storeRow) {
        setError("Salon not found.");
        setLoading(false);
        return;
      }
      const s = storeRow as unknown as StoreLite;
      setStore(s);

      const { data: tiersData, error: tErr } = await supabase.rpc("salon_public_get_membership_tiers", {
        p_store_id: s.id,
      } as never);
      if (cancelled) return;
      if (tErr) {
        setError("Couldn't load memberships.");
        setLoading(false);
        return;
      }
      setTiers((tiersData ?? []) as unknown as Tier[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (statusParam === "success") {
      toast.success("Thanks — your membership is active! Check your email for the receipt.");
      // Strip the param so a refresh doesn't re-toast.
      const next = new URLSearchParams(params);
      next.delete("status");
      setParams(next, { replace: true });
    } else if (statusParam === "cancel") {
      toast.message("Signup cancelled. Pick a tier whenever you're ready.");
      const next = new URLSearchParams(params);
      next.delete("status");
      setParams(next, { replace: true });
    }
  }, [statusParam, params, setParams]);

  const subscribe = async (tierId: string) => {
    if (!email.trim() || !/.+@.+\..+/.test(email)) {
      toast.error("Enter a valid email so we can find your salon profile.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("subscribe-salon-membership", {
        body: { tier_id: tierId, client_email: email.trim(), client_name: name.trim() },
      });
      if (err) throw err;
      const url = (data as { url?: string; error?: string } | null)?.url;
      const errorMsg = (data as { error?: string } | null)?.error;
      if (errorMsg) {
        toast.error(errorMsg);
        return;
      }
      if (!url) {
        toast.error("Stripe didn't return a checkout URL.");
        return;
      }
      window.location.href = url;
    } catch (e) {
      toast.error((e as Error).message || "Couldn't start checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/8 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="text-base font-semibold text-foreground">{error ?? "Salon not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Memberships · {store.name}</title></Helmet>
      <div className="mx-auto max-w-md px-4 py-8 sm:py-12">
        <Link
          to={`/salon/${store.slug}`}
          className="mb-4 inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground transition-all hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-3 w-3" /> Back to {store.name}
        </Link>

        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Crown className="h-3 w-3" /> Membership
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Save every visit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Subscribe once. {store.name} bills automatically and the discount applies every time you check out.
          </p>
        </header>

        {tiers.length === 0 ? (
          <Card className="rounded-2xl border-border/60">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {store.name} hasn't published any membership tiers yet.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {tiers.map((t) => {
              const selected = selectedTierId === t.id;
              return (
                <li key={t.id}>
                  <Card className={cn(
                    "rounded-2xl border-border/60 transition-colors",
                    selected && "border-primary/60 ring-1 ring-primary/30"
                  )}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between gap-3 text-base">
                        <span>{t.name}</span>
                        <span className="text-xl font-bold text-foreground">
                          {formatPrice(t.monthly_price_cents)}
                          <span className="ml-0.5 text-xs font-normal text-muted-foreground">/{t.billing_interval}</span>
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                      <ul className="space-y-1 text-xs text-foreground/85">
                        {t.service_discount_percent > 0 && (
                          <li className="inline-flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            {t.service_discount_percent}% off every service
                          </li>
                        )}
                        <li className="inline-flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Billed {t.billing_interval === "month" ? "monthly" : "yearly"} · cancel anytime
                        </li>
                      </ul>

                      {!selected && (
                        <Button
                          className="w-full"
                          onClick={() => setSelectedTierId(t.id)}
                          disabled={!t.has_stripe_price}
                          title={!t.has_stripe_price ? "This tier isn't set up for Stripe yet. Ask the salon to sync it." : undefined}
                        >
                          {t.has_stripe_price ? "Subscribe" : "Not available yet"}
                        </Button>
                      )}

                      {selected && (
                        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="memberEmail">Your email</Label>
                            <Input
                              id="memberEmail" type="email" value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="you@example.com" autoComplete="email"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="memberName">Your name (optional)</Label>
                            <Input
                              id="memberName" value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Jamie Chen" autoComplete="name" maxLength={120}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost" className="flex-1"
                              onClick={() => setSelectedTierId(null)}
                              disabled={submitting}
                            >
                              Cancel
                            </Button>
                            <Button
                              className="flex-1 gap-1.5"
                              onClick={() => void subscribe(t.id)}
                              disabled={submitting}
                            >
                              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                              Continue to Stripe
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            You'll be redirected to Stripe to enter your payment details. Cancel anytime from your account email.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
