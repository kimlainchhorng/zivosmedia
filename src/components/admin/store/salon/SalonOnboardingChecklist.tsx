/**
 * SalonOnboardingChecklist — shown on the Salon Dashboard until the owner
 * has the basics in place. Each row is one of: services, stylists, schedules,
 * payment, and "share booking link". Clicking jumps to the relevant tab.
 */
import { useEffect, useState } from "react";
import {
  CheckCircle2, Circle, ArrowRight, Loader2, Sparkles, Copy, Link as LinkIcon,
  BookOpen, UserCog, Calendar, CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface SalonOnboardingChecklistProps {
  storeId: string;
  storeSlug?: string;
  onJumpToTab?: (tab: string) => void;
}

interface Status {
  hasServices: boolean;
  hasStylists: boolean;
  hasSchedules: boolean;
  paymentConfigured: boolean;
  ready: boolean;
  loading: boolean;
}

export default function SalonOnboardingChecklist({ storeId, storeSlug, onJumpToTab }: SalonOnboardingChecklistProps) {
  const [s, setS] = useState<Status>({
    hasServices: false, hasStylists: false, hasSchedules: false,
    paymentConfigured: false, ready: false, loading: true,
  });
  // Persisted per-store so "Hide this panel" sticks across reloads. Local
  // state alone would re-show the panel on every dashboard visit.
  const dismissKey = `zivo:salon:onboardingDismissed:${storeId}`;
  const [dismissed, setDismissedState] = useState<boolean>(() => {
    try { return typeof window !== "undefined" && window.localStorage.getItem(dismissKey) === "1"; }
    catch { return false; }
  });
  const setDismissed = (next: boolean) => {
    setDismissedState(next);
    try {
      if (next) window.localStorage.setItem(dismissKey, "1");
      else window.localStorage.removeItem(dismissKey);
    } catch {
      // localStorage may be unavailable (incognito quirks) — fail silent.
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [svc, sty, sched, pay] = await Promise.all([
        supabase.from("salon_services").select("id", { count: "exact", head: true })
          .eq("store_id", storeId).eq("is_active", true),
        supabase.from("salon_stylists").select("id", { count: "exact", head: true })
          .eq("store_id", storeId).eq("is_active", true),
        // Inner-join salon_stylists so a schedule only counts if the linked
        // stylist is still active — otherwise an owner who deactivated their
        // last stylist would see this step ticked despite no one being able
        // to take bookings.
        supabase.from("salon_stylist_schedules")
          .select("id, salon_stylists!inner(is_active)", { count: "exact", head: true })
          .eq("store_id", storeId)
          .eq("is_working", true)
          .eq("salon_stylists.is_active", true),
        supabase.from("store_payment_settings").select("market", { count: "exact", head: true })
          .eq("store_id", storeId),
      ]);
      if (cancelled) return;
      const hasServices = (svc.count ?? 0) > 0;
      const hasStylists = (sty.count ?? 0) > 0;
      const hasSchedules = (sched.count ?? 0) > 0;
      const paymentConfigured = (pay.count ?? 0) > 0;
      setS({
        hasServices, hasStylists, hasSchedules, paymentConfigured,
        ready: hasServices && hasStylists && hasSchedules && paymentConfigured,
        loading: false,
      });
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  const publicBookingUrl = storeSlug ? `${typeof window !== "undefined" ? window.location.origin : ""}/salon/${storeSlug}` : "";

  const copyBookingLink = async () => {
    if (!publicBookingUrl) return;
    try {
      await navigator.clipboard.writeText(publicBookingUrl);
      toast.success("Booking link copied to clipboard.");
    } catch {
      toast.error("Couldn't copy. Long-press to copy manually.");
    }
  };

  // Hide once everything's set up unless the user opted to keep it visible.
  if (s.loading) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking your setup…
        </CardContent>
      </Card>
    );
  }
  if (s.ready && dismissed) return null;

  const items = [
    { key: "services", label: "Add at least one service", icon: BookOpen, done: s.hasServices, tab: "salon-services" },
    { key: "stylists", label: "Add a stylist", icon: UserCog, done: s.hasStylists, tab: "salon-stylists" },
    { key: "schedules", label: "Set your stylist's working hours", icon: Calendar, done: s.hasSchedules, tab: "salon-schedules" },
    { key: "payment", label: "Configure payment & tax", icon: CreditCard, done: s.paymentConfigured, tab: "payment" },
  ];
  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <Card className={cn("rounded-2xl border-border/60", s.ready && "border-emerald-500/30 bg-emerald-500/5")}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {s.ready ? "You're all set!" : "Get your salon ready"}
          </span>
          <span className="text-xs font-normal text-muted-foreground">{doneCount} of {items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.key} className={cn(
              "flex items-center gap-3 rounded-xl border p-3",
              i.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card",
            )}>
              {i.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <i.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className={cn("truncate text-sm", i.done ? "text-foreground/70 line-through" : "text-foreground font-medium")}>
                  {i.label}
                </span>
              </div>
              {!i.done && onJumpToTab && (
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => onJumpToTab(i.tab)}>
                  Set up <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>

        {s.ready && storeSlug && (
          <div className="rounded-xl border border-primary/30 bg-primary/8 p-3">
            <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              <LinkIcon className="h-3 w-3" /> Share your booking link
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-card px-2 py-1.5 text-xs font-mono text-foreground">{publicBookingUrl}</code>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={copyBookingLink}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Put this link in your Instagram bio, Google profile, or anywhere clients find you.
            </p>
            <div className="mt-3 flex justify-end">
              <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={() => setDismissed(true)}>
                Hide this panel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
