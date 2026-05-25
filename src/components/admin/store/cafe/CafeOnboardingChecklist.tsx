/**
 * CafeOnboardingChecklist — shown on the Cafe Dashboard until the owner has
 * the basics in place. Each row points to the relevant tab. Auto-collapses
 * itself once all 6 core items are done, and offers a manual dismiss for
 * the "almost done" state.
 */
import { useEffect, useState } from "react";
import {
  CheckCircle2, Circle, ArrowRight, Loader2, Sparkles, X, Copy, Link as LinkIcon,
  BookOpen, Coffee, QrCode, UserCog, Boxes, ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  storeId: string;
  storeSlug?: string;
  onJumpToTab?: (tab: string) => void;
}

interface Status {
  hasCategories: boolean;
  hasMenuItems: boolean;
  hasTables: boolean;
  hasBaristas: boolean;
  hasInventory: boolean;
  hasFirstOrder: boolean;
  loading: boolean;
}

interface ChecklistRow {
  key: keyof Status;
  label: string;
  description: string;
  Icon: typeof Coffee;
  tab: string;
  done: boolean;
}

const DISMISS_KEY = "cafe-onboarding-dismissed";

export default function CafeOnboardingChecklist({ storeId, storeSlug, onJumpToTab }: Props) {
  const [s, setS] = useState<Status>({
    hasCategories: false, hasMenuItems: false, hasTables: false,
    hasBaristas: false, hasInventory: false, hasFirstOrder: false,
    loading: true,
  });
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(`${DISMISS_KEY}:${storeId}`) === "1"; }
    catch { return false; }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cat, item, table, barista, inv, ord] = await Promise.all([
        supabase.from("cafe_categories" as never).select("id", { count: "exact", head: true })
          .eq("store_id", storeId).eq("is_active", true),
        supabase.from("cafe_menu_items" as never).select("id", { count: "exact", head: true })
          .eq("store_id", storeId).eq("is_active", true),
        supabase.from("cafe_tables" as never).select("id", { count: "exact", head: true })
          .eq("store_id", storeId).eq("is_active", true),
        supabase.from("cafe_baristas" as never).select("id", { count: "exact", head: true })
          .eq("store_id", storeId).eq("is_active", true),
        supabase.from("cafe_inventory_items" as never).select("id", { count: "exact", head: true })
          .eq("store_id", storeId).eq("is_active", true),
        supabase.from("cafe_orders" as never).select("id", { count: "exact", head: true })
          .eq("store_id", storeId),
      ]);
      if (cancelled) return;
      setS({
        hasCategories: (cat.count ?? 0) > 0,
        hasMenuItems: (item.count ?? 0) > 0,
        hasTables: (table.count ?? 0) > 0,
        hasBaristas: (barista.count ?? 0) > 0,
        hasInventory: (inv.count ?? 0) > 0,
        hasFirstOrder: (ord.count ?? 0) > 0,
        loading: false,
      });
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  const rows: ChecklistRow[] = [
    { key: "hasCategories", label: "Add a menu category", description: "e.g. Coffee, Tea, Pastries",
      Icon: BookOpen, tab: "cafe-menu", done: s.hasCategories },
    { key: "hasMenuItems", label: "Add your first menu item", description: "A drink or food item with a price",
      Icon: Coffee, tab: "cafe-menu", done: s.hasMenuItems },
    { key: "hasTables", label: "Add tables for QR ordering", description: "Each table gets its own QR code",
      Icon: QrCode, tab: "cafe-tables", done: s.hasTables },
    { key: "hasBaristas", label: "Add your team", description: "Baristas with hourly rate + PIN",
      Icon: UserCog, tab: "cafe-baristas", done: s.hasBaristas },
    { key: "hasInventory", label: "Set up inventory (optional)", description: "Track stock, get low-stock alerts",
      Icon: Boxes, tab: "cafe-inventory", done: s.hasInventory },
    { key: "hasFirstOrder", label: "Take your first order", description: "From the QR or counter",
      Icon: ClipboardList, tab: "cafe-orders", done: s.hasFirstOrder },
  ];

  const doneCount = rows.filter((r) => r.done).length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone = doneCount === total;

  // Hide entirely if everything is done OR the owner dismissed it after
  // mostly setting up. (Coming back to add a missing item still surfaces
  // the checklist if they clear localStorage.)
  if (allDone || dismissed) return null;
  if (s.loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center text-sm text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading setup…
        </CardContent>
      </Card>
    );
  }

  const orderUrl = storeSlug ? `${window.location.origin}/cafe/${encodeURIComponent(storeSlug)}` : null;

  const copyLink = () => {
    if (!orderUrl) return;
    navigator.clipboard?.writeText(orderUrl).catch(() => {});
    toast.success("Order link copied.");
  };

  const handleDismiss = () => {
    try { localStorage.setItem(`${DISMISS_KEY}:${storeId}`, "1"); } catch { /* noop */ }
    setDismissed(true);
  };

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            Get your cafe ready
          </span>
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="tabular-nums font-medium">{doneCount} / {total}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Hide" onClick={handleDismiss}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardTitle>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {rows.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => onJumpToTab?.(r.tab)}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/50",
              r.done && "opacity-60",
            )}
          >
            {r.done
              ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              : <Circle className="h-5 w-5 shrink-0 text-muted-foreground/60" />}
            <r.Icon className={cn("h-4 w-4 shrink-0", r.done ? "text-muted-foreground" : "text-amber-700")} />
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", r.done && "line-through")}>{r.label}</p>
              <p className="text-[11px] text-muted-foreground truncate">{r.description}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ))}
        {orderUrl && s.hasMenuItems && (
          <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/30 p-2 flex items-center gap-2">
            <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground truncate flex-1 font-mono">{orderUrl}</span>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
