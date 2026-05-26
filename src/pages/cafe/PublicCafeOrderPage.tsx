/**
 * Public cafe order page at /cafe/:slug.
 * Optional ?t=qrToken pre-selects a table (from a printed QR card on the
 * table). Customers browse the menu, add to cart with modifiers, and submit
 * via the `cafe_place_public_order` RPC.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  Coffee, Loader2, AlertCircle, Plus, Minus, ShoppingBag, ArrowRight, ChevronLeft, X, Package, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatCafeMoney } from "@/lib/cafe-currency";

interface StoreLite {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  is_active: boolean;
}
interface MenuItem {
  id: string; name: string; description: string | null;
  price_cents: number; image_url: string | null;
  category_id: string | null;
  is_featured: boolean;
  is_sold_out: boolean;
  is_vegetarian: boolean; is_vegan: boolean; is_gluten_free: boolean;
  allergens: string | null;
  happy_hour_price_cents: number | null;
  happy_hour_start: number | null;
  happy_hour_end: number | null;
}
interface PublicBundle {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  sort_order: number;
  active_start_time: string | null;
  active_end_time: string | null;
}
interface PublicBundleItem { id: string; bundle_id: string; menu_item_id: string; quantity: number; sort_order: number }

interface Category { id: string; name: string; sort_order: number }
interface ModGroup { id: string; name: string; selection_type: "single" | "multi"; min_select: number; max_select: number; sort_order: number }
interface Modifier { id: string; group_id: string; name: string; price_delta_cents: number; is_default: boolean; sort_order: number }
interface ItemGroupLink { item_id: string; group_id: string; sort_order: number }
interface LoyaltyProgramLite {
  mode: "points_per_dollar" | "stamp_card";
  earn_rate_milli: number;
  redeem_threshold: number;
  reward_value_cents: number;
}
interface CafeSettingsLite {
  allow_tips: boolean;
  allow_promos: boolean;
  allow_gift_cards: boolean;
  allow_scheduled_orders: boolean;
  tax_rate_bp: number;
  daily_message: string | null;
  daily_message_until: string | null;
  tip_preset_1: number;
  tip_preset_2: number;
  tip_preset_3: number;
  currency_code: string;
}
const DEFAULT_SETTINGS: CafeSettingsLite = {
  allow_tips: true, allow_promos: true, allow_gift_cards: true, allow_scheduled_orders: true,
  tax_rate_bp: 0,
  daily_message: null, daily_message_until: null,
  tip_preset_1: 15, tip_preset_2: 18, tip_preset_3: 20,
  currency_code: "USD",
};

// Is the item's happy hour window currently active? Mirrors the server-side
// cafe_menu_item_happy_hour_active() so the public page and the order RPC
// agree on the price the customer sees vs pays.
function isHappyHourActive(item: Pick<MenuItem, "happy_hour_price_cents" | "happy_hour_start" | "happy_hour_end">): boolean {
  if (item.happy_hour_price_cents == null || item.happy_hour_start == null || item.happy_hour_end == null) return false;
  const hour = new Date().getHours();
  const s = item.happy_hour_start;
  const e = item.happy_hour_end;
  if (s === e) return false;
  if (s < e) return hour >= s && hour < e;
  return hour >= s || hour < e; // wraps midnight
}

// Returns the price to show: happy hour if active, else regular.
function effectivePrice(item: MenuItem): { current: number; original: number | null } {
  if (isHappyHourActive(item) && item.happy_hour_price_cents != null) {
    return { current: item.happy_hour_price_cents, original: item.price_cents };
  }
  return { current: item.price_cents, original: null };
}

// Is the bundle's time window currently active? Mirrors the SQL
// cafe_bundle_window_active() — NULL pair = always on; wrap past midnight
// when end <= start. The server compares against now()::TIME (UTC on
// Supabase), so the client uses UTC too to stay in sync. This matches the
// cafe_hours convention of "treat hours as server time".
function bundleWindowActive(start: string | null, end: string | null, now: Date = new Date()): boolean {
  if (!start || !end) return true;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const cur = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
  if (end > start) return cur >= start && cur < end;
  if (end < start) return cur >= start || cur < end;
  return false;
}

// Friendly window label: "11:30 AM – 2:30 PM". Returns null when the bundle
// has no window set.
function fmtBundleWindow(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const pretty = (t: string) => {
    const [hh, mm] = t.split(":");
    const h = parseInt(hh, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${mm} ${ampm}`;
  };
  return `${pretty(start)} – ${pretty(end)}`;
}

// A bundle is available when its parent flag is on, its window is active,
// AND none of its resolvable constituents are sold out. Orphan / inactive
// constituents (no entry in the live menu) are tolerated — the RPC silently
// skips them.
function bundleAvailable(
  b: PublicBundle,
  lines: PublicBundleItem[],
  menuMap: Map<string, MenuItem>,
): boolean {
  if (!bundleWindowActive(b.active_start_time, b.active_end_time)) return false;
  const myLines = lines.filter((l) => l.bundle_id === b.id);
  for (const line of myLines) {
    const m = menuMap.get(line.menu_item_id);
    if (m && m.is_sold_out) return false;
  }
  return true;
}

// Expand a bundle pick into [header, ...children]. All share a fresh
// bundleUid. Header carries the price-source (bundle.priceCents);
// children mirror display only and have isBundleChild=true.
function expandBundleToLines(
  b: PublicBundle,
  qty: number,
  lines: PublicBundleItem[],
  menuMap: Map<string, MenuItem>,
): CartLine[] {
  const myLines = lines.filter((l) => l.bundle_id === b.id);
  const bundleUid = `b_${b.id}_${Math.random().toString(36).slice(2, 8)}`;
  const result: CartLine[] = [];
  let headerItem: MenuItem | null = null;
  const children: CartLine[] = [];
  for (const line of myLines) {
    const m = menuMap.get(line.menu_item_id);
    // The menu fetch already filters to is_active=true. We only need to
    // skip orphans (no entry in the map) and sold-out items here.
    if (!m || m.is_sold_out) continue;
    if (!headerItem) headerItem = m; // first valid item powers the header's item field
    children.push({
      uid: `b_${b.id}_child_${Math.random().toString(36).slice(2, 8)}`,
      bundleUid,
      isBundleChild: true,
      bundle: { id: b.id, name: b.name, priceCents: b.price_cents },
      item: m,
      quantity: line.quantity,
      modifierIds: [],
      notes: "",
    });
  }
  if (!headerItem) return []; // nothing valid; refuse to add
  result.push({
    uid: `b_${b.id}_head_${Math.random().toString(36).slice(2, 8)}`,
    bundleUid,
    isBundleHeader: true,
    bundle: { id: b.id, name: b.name, priceCents: b.price_cents },
    item: headerItem,
    quantity: qty,
    modifierIds: [],
    notes: "",
  });
  result.push(...children);
  return result;
}

// Small dietary pills for menu items. Vegan is stronger than vegetarian, so
// when both are set we only show "VEGAN" to avoid redundant labels.
function DietaryBadges({ item }: { item: Pick<MenuItem, "is_vegetarian" | "is_vegan" | "is_gluten_free"> }) {
  const pills: Array<{ label: string; tone: string; title: string }> = [];
  if (item.is_vegan) {
    pills.push({ label: "VEGAN", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", title: "Vegan" });
  } else if (item.is_vegetarian) {
    pills.push({ label: "V", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", title: "Vegetarian" });
  }
  if (item.is_gluten_free) {
    pills.push({ label: "GF", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300", title: "Gluten-free" });
  }
  if (pills.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {pills.map((p) => (
        <span
          key={p.label}
          title={p.title}
          className={cn("rounded-md text-[10px] font-bold tracking-wide px-1.5 py-0.5", p.tone)}
        >
          {p.label}
        </span>
      ))}
    </span>
  );
}

interface CartLine {
  uid: string;
  item: MenuItem;
  quantity: number;
  modifierIds: string[];
  notes: string;
  // Bundle support: a bundle in the cart is one header + N children with a
  // shared bundleUid. Header carries `bundle` (truth source for price/name),
  // children mirror display only. Plain items leave all bundle fields unset.
  bundleUid?: string;
  isBundleHeader?: boolean;
  isBundleChild?: boolean;
  bundle?: { id: string; name: string; priceCents: number };
}

const newUid = () => Math.random().toString(36).slice(2, 10);

export default function PublicCafeOrderPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const tableToken = searchParams.get("t") || null;
  const navigate = useNavigate();

  const [store, setStore] = useState<StoreLite | null>(null);
  const [tableLabel, setTableLabel] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [groups, setGroups] = useState<ModGroup[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [links, setLinks] = useState<ItemGroupLink[]>([]);
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgramLite | null>(null);
  const [settings, setSettings] = useState<CafeSettingsLite>(DEFAULT_SETTINGS);
  const [popularIds, setPopularIds] = useState<Set<string>>(new Set());
  const [reviewSummary, setReviewSummary] = useState<{ avg_rating: number; review_count: number } | null>(null);
  const [openStatus, setOpenStatus] = useState<{
    is_open_now: boolean;
    opens_at: string | null;
    closes_at: string | null;
    next_open_day: number | null;
    next_open_time: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Per-store currency formatter — closes over the loaded settings so all
  // money in this page renders in the store's chosen ISO currency.
  const fmt = (cents: number) => formatCafeMoney(cents, settings.currency_code);

  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  // Phase 72: storefront menu search. When non-empty it overrides the
  // category filter and matches by item name OR description.
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [pickerItem, setPickerItem] = useState<MenuItem | null>(null);
  const [pickerSelections, setPickerSelections] = useState<Record<string, string[]>>({});
  const [pickerQty, setPickerQty] = useState(1);
  const [pickerNotes, setPickerNotes] = useState("");

  // Bundles
  const [bundles, setBundles] = useState<PublicBundle[]>([]);
  const [bundleItems, setBundleItems] = useState<PublicBundleItem[]>([]);
  const [bundlePicker, setBundlePicker] = useState<PublicBundle | null>(null);
  const [bundlePickerQty, setBundlePickerQty] = useState(1);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Tip is one of the presets in cents (calculated) or a free-form cents value.
  const [tipPercent, setTipPercent] = useState<number | "custom" | null>(null);
  const [tipCustomCents, setTipCustomCents] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"asap" | "later">("asap");
  const [scheduledFor, setScheduledFor] = useState("");
  const [customerSummary, setCustomerSummary] = useState<{ name: string | null; visit_count: number; first_visit_at: string } | null>(null);
  const [namePrefilled, setNamePrefilled] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState<{
    has_program: boolean;
    points: number;
    redeem_threshold: number;
    reward_value_cents: number;
    can_redeem: boolean;
  } | null>(null);
  const [redeemLoyalty, setRedeemLoyalty] = useState(false);

  // === Load store, table token, full menu in parallel ===
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const storeRes = await supabase
        .from("store_profiles")
        .select("id,name,slug,logo_url,banner_url,description,is_active")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (storeRes.error || !storeRes.data) {
        setLoadError("This cafe couldn't be found.");
        setLoading(false);
        return;
      }
      const s = storeRes.data as StoreLite;
      if (!s.is_active) {
        setLoadError("This cafe is not accepting orders right now.");
        setLoading(false);
        return;
      }
      setStore(s);

      const [catRes, itemRes, grpRes, modRes, linkRes, tableRes, loyRes, statusRes, settingsRes, popularRes, reviewRes, bundleRes] = await Promise.all([
        supabase.from("cafe_categories" as never).select("id,name,sort_order").eq("store_id", s.id).eq("is_active", true).order("sort_order"),
        supabase.from("cafe_menu_items" as never).select("id,name,description,price_cents,image_url,category_id,is_featured,is_sold_out,is_vegetarian,is_vegan,is_gluten_free,allergens,happy_hour_price_cents,happy_hour_start,happy_hour_end").eq("store_id", s.id).eq("is_active", true).order("sort_order"),
        supabase.from("cafe_modifier_groups" as never).select("id,name,selection_type,min_select,max_select,sort_order").eq("store_id", s.id).eq("is_active", true).order("sort_order"),
        supabase.from("cafe_modifiers" as never).select("id,group_id,name,price_delta_cents,is_default,sort_order").eq("store_id", s.id).eq("is_active", true).order("sort_order"),
        supabase.from("cafe_menu_item_modifier_groups" as never).select("item_id,group_id,sort_order"),
        tableToken
          ? supabase.from("cafe_tables" as never).select("label").eq("store_id", s.id).eq("qr_token", tableToken).maybeSingle()
          : Promise.resolve({ data: null as { label: string } | null }),
        supabase.from("cafe_loyalty_programs" as never).select("mode,earn_rate_milli,redeem_threshold,reward_value_cents").eq("store_id", s.id).eq("is_active", true).maybeSingle(),
        supabase.rpc("cafe_is_open_now" as never, { p_store_id: s.id } as never),
        supabase.from("cafe_settings" as never).select("allow_tips,allow_promos,allow_gift_cards,allow_scheduled_orders,tax_rate_bp,daily_message,daily_message_until,tip_preset_1,tip_preset_2,tip_preset_3,currency_code").eq("store_id", s.id).maybeSingle(),
        supabase.rpc("cafe_popular_items" as never, { p_store_id: s.id, p_window_days: 7, p_limit: 3 } as never),
        supabase.rpc("cafe_public_review_summary" as never, { p_store_id: s.id } as never),
        supabase.from("cafe_bundles" as never)
          .select("id,name,description,image_url,price_cents,sort_order,active_start_time,active_end_time")
          .eq("store_id", s.id).eq("is_active", true).order("sort_order"),
      ]);
      if (cancelled) return;
      setCategories((catRes.data ?? []) as unknown as Category[]);
      setItems((itemRes.data ?? []) as unknown as MenuItem[]);
      setGroups((grpRes.data ?? []) as unknown as ModGroup[]);
      setModifiers((modRes.data ?? []) as unknown as Modifier[]);
      setLinks((linkRes.data ?? []) as unknown as ItemGroupLink[]);
      setLoyaltyProgram((loyRes.data ?? null) as unknown as LoyaltyProgramLite | null);
      const statusRows = (statusRes.data ?? []) as unknown as Array<{
        is_open_now: boolean;
        opens_at: string | null;
        closes_at: string | null;
        next_open_day: number | null;
        next_open_time: string | null;
      }>;
      setOpenStatus(statusRows[0] ?? null);
      const settingsRow = (settingsRes.data ?? null) as unknown as CafeSettingsLite | null;
      if (settingsRow) setSettings(settingsRow);
      const popRows = (popularRes.data ?? []) as unknown as Array<{ menu_item_id: string }>;
      setPopularIds(new Set(popRows.map((p) => p.menu_item_id)));
      const reviewRows = (reviewRes.data ?? []) as unknown as Array<{ avg_rating: number | null; review_count: number }>;
      const review = reviewRows[0];
      if (review && review.review_count > 0 && review.avg_rating != null) {
        setReviewSummary({ avg_rating: Number(review.avg_rating), review_count: review.review_count });
      }
      const tableRow = (tableRes as { data: { label: string } | null }).data;
      if (tableRow) setTableLabel(tableRow.label);
      const bundleRows = (bundleRes.data ?? []) as unknown as PublicBundle[];
      setBundles(bundleRows);
      // Follow-up fetch for bundle items now that we know the bundle IDs.
      if (bundleRows.length > 0) {
        const biRes = await supabase
          .from("cafe_bundle_items" as never)
          .select("id,bundle_id,menu_item_id,quantity,sort_order")
          .in("bundle_id", bundleRows.map((b) => b.id))
          .order("sort_order");
        if (!cancelled) {
          setBundleItems((biRes.data ?? []) as unknown as PublicBundleItem[]);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, tableToken]);

  // === ?reorder=<order_id> — pre-fill cart from a specific past order ===
  // Triggered from the tracker page's "Order again" button. Validates each
  // item against the live menu (skipping sold-out / removed) and shows a
  // toast summarising what landed. Bundles aren't reconstructed — items
  // appear at their regular price (customer can re-add a combo manually).
  const reorderHandled = useRef(false);
  useEffect(() => {
    if (reorderHandled.current) return;
    if (loading) return;
    const reorderId = searchParams.get("reorder");
    if (!reorderId) return;
    if (items.length === 0) return;
    reorderHandled.current = true;
    (async () => {
      const res = await supabase.rpc("cafe_public_order_items_for_reorder" as never, {
        p_order_id: reorderId,
      } as never);
      if (res.error) {
        console.error("[reorder url]", res.error);
        toast.error("Couldn't load that order.");
        return;
      }
      const rows = (res.data ?? []) as unknown as Array<{ menu_item_id: string; item_name: string; quantity: number; modifier_ids: string[] }>;
      if (rows.length === 0) {
        toast.error("Order not found.");
        return;
      }
      const liveItemMap = new Map(items.map((i) => [i.id, i]));
      const liveModIds = new Set(modifiers.map((m) => m.id));
      let skipped = 0;
      const newLines: CartLine[] = [];
      for (const r of rows) {
        const live = liveItemMap.get(r.menu_item_id);
        if (!live || live.is_sold_out) { skipped++; continue; }
        newLines.push({
          uid: newUid(),
          item: live,
          quantity: Math.max(1, Math.min(99, r.quantity)),
          modifierIds: (r.modifier_ids || []).filter((mid) => liveModIds.has(mid)),
          notes: "",
        });
      }
      if (newLines.length === 0) {
        toast.error("Items from that order are no longer available.");
      } else {
        setCart((curr) => [...curr, ...newLines]);
        setCartOpen(true);
        if (skipped > 0) toast.info(`Reorder loaded. ${skipped} item${skipped === 1 ? "" : "s"} skipped (unavailable).`);
        else toast.success(`Reorder loaded — ${newLines.length} item${newLines.length === 1 ? "" : "s"} added.`);
      }
      // Strip the param so a manual refresh doesn't re-fire.
      const url = new URL(window.location.href);
      url.searchParams.delete("reorder");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    })();
  }, [loading, items, modifiers, searchParams]);

  // Debounced returning-customer recognition. Same trigger window as loyalty
  // so a single phone change doesn't fire two timers visibly apart.
  useEffect(() => {
    if (!store) { setCustomerSummary(null); return; }
    const trimmed = customerPhone.trim();
    if (trimmed.length < 6) { setCustomerSummary(null); return; }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const res = await supabase.rpc("cafe_public_customer_summary" as never, {
        p_store_id: store.id, p_phone: trimmed,
      } as never);
      if (cancelled) return;
      if (res.error) { console.error("[customer summary]", res.error); setCustomerSummary(null); return; }
      const rows = (res.data ?? []) as unknown as Array<{ name: string | null; visit_count: number; first_visit_at: string }>;
      const row = rows[0] ?? null;
      setCustomerSummary(row);
      // Auto-prefill the name field if the user hasn't typed one yet and we
      // recognise them. Tracked so we don't keep overwriting after they edit.
      if (row?.name) {
        setCustomerName((curr) => {
          if (curr.trim() === "" && !namePrefilled) { setNamePrefilled(true); return row.name as string; }
          return curr;
        });
      }
    }, 400);
    return () => { cancelled = true; window.clearTimeout(t); };
    // namePrefilled intentionally excluded — we only want the first prefill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerPhone, store]);

  // Debounced loyalty balance lookup keyed off the customer's phone.
  // Fetches only when the program is active + the phone looks reasonable.
  useEffect(() => {
    if (!store || !loyaltyProgram) { setLoyaltyBalance(null); setRedeemLoyalty(false); return; }
    const trimmed = customerPhone.trim();
    if (trimmed.length < 6) { setLoyaltyBalance(null); setRedeemLoyalty(false); return; }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const res = await supabase.rpc("cafe_public_loyalty_balance" as never, {
        p_store_id: store.id,
        p_phone: trimmed,
      } as never);
      if (cancelled) return;
      if (res.error) {
        console.error("[loyalty balance]", res.error);
        setLoyaltyBalance(null);
        return;
      }
      const rows = (res.data ?? []) as unknown as Array<{
        has_program: boolean; points: number; redeem_threshold: number;
        reward_value_cents: number; can_redeem: boolean;
      }>;
      const row = rows[0] ?? null;
      setLoyaltyBalance(row);
      if (!row?.can_redeem) setRedeemLoyalty(false);
    }, 400);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [customerPhone, store, loyaltyProgram]);

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) {
      return items.filter((i) =>
        i.name.toLowerCase().includes(q)
        || (i.description ?? "").toLowerCase().includes(q)
      );
    }
    if (activeCatId === null) return items;
    return items.filter((i) => i.category_id === activeCatId);
  }, [items, activeCatId, searchQuery]);

  // Reusable lookup of menu items by id for the bundle picker + rail filter.
  const menuById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // Bundles visible on the rail: filter on availability + non-empty after
  // orphan/inactive constituents are skipped.
  // The items fetch already filters to is_active=true, so any constituent
  // that resolves through menuById is implicitly active. We only need to
  // confirm at least one constituent is still on the live menu (orphaned
  // bundle lines silently skip both here and in the RPC).
  const visibleBundles = useMemo(() => (
    bundles
      .filter((b) => bundleAvailable(b, bundleItems, menuById))
      .filter((b) => bundleItems.some((bi) => bi.bundle_id === b.id && menuById.has(bi.menu_item_id)))
  ), [bundles, bundleItems, menuById]);

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, line) => {
      // Bundle children are display-only — the header carries the truth.
      if (line.isBundleChild) return sum;
      // Bundle header: charge the bundle's flat price × header quantity.
      if (line.isBundleHeader && line.bundle) {
        return sum + line.bundle.priceCents * line.quantity;
      }
      const modSum = line.modifierIds.reduce((s, mid) => s + (modifiers.find((m) => m.id === mid)?.price_delta_cents ?? 0), 0);
      return sum + (effectivePrice(line.item).current + modSum) * line.quantity;
    }, 0),
    [cart, modifiers],
  );

  // Resolve the tip in cents from the chosen preset / custom.
  const tipCents = useMemo(() => {
    if (tipPercent === null) return 0;
    if (tipPercent === "custom") return Math.max(0, tipCustomCents);
    return Math.round(cartSubtotal * (tipPercent / 100));
  }, [tipPercent, tipCustomCents, cartSubtotal]);

  // Tax shown to the customer is an *estimate* — the server recomputes the
  // canonical value off the post-discount subtotal at submit time. Discounts
  // aren't known until then, so we display tax against the raw subtotal.
  const taxCents = useMemo(
    () => Math.floor((cartSubtotal * settings.tax_rate_bp) / 10000),
    [cartSubtotal, settings.tax_rate_bp],
  );

  const cartTotal = cartSubtotal + taxCents + tipCents;

  // Upsell rail: featured items not yet in cart, not sold out, capped to 4.
  // Falls back to cheapest available items so the rail isn't empty when the
  // owner hasn't curated any "featured" items yet.
  // Featured items rail at the top of the page. Skip when the owner hasn't
  // flagged any, or when *every* item is featured (signal would be noise).
  const featuredHero = useMemo(() => {
    const available = items.filter((i) => i.is_featured && !i.is_sold_out);
    if (available.length === 0) return [] as MenuItem[];
    if (available.length === items.filter((i) => !i.is_sold_out).length) return [] as MenuItem[];
    return available.slice(0, 6);
  }, [items]);

  const upsellItems = useMemo(() => {
    if (cart.length === 0) return [] as MenuItem[];
    const inCart = new Set(cart.map((l) => l.item.id));
    const available = items.filter((i) => !inCart.has(i.id) && !i.is_sold_out);
    const featured = available.filter((i) => i.is_featured);
    const pool = featured.length >= 3
      ? featured
      : [...featured, ...available.filter((i) => !i.is_featured).sort((a, b) => a.price_cents - b.price_cents)];
    return pool.slice(0, 4);
  }, [items, cart]);

  // Scheduled-pickup datetime-local bounds (no IIFE inside JSX — keeps oxc happy).
  const { schedulePickerMin, schedulePickerMax } = useMemo(() => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const toLocal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return {
      schedulePickerMin: toLocal(new Date(Date.now() + 15 * 60 * 1000)),
      schedulePickerMax: toLocal(new Date(Date.now() + 7 * 86_400_000)),
    };
  }, []);

  const openItemPicker = (item: MenuItem) => {
    const itemGroups = links.filter((l) => l.item_id === item.id).map((l) => l.group_id);
    const defaults: Record<string, string[]> = {};
    for (const gid of itemGroups) {
      const groupMods = modifiers.filter((m) => m.group_id === gid);
      const def = groupMods.find((m) => m.is_default);
      if (def) defaults[gid] = [def.id];
      else defaults[gid] = [];
    }
    setPickerSelections(defaults);
    setPickerQty(1);
    setPickerNotes("");
    setPickerItem(item);
  };

  const togglePick = (groupId: string, modId: string) => {
    const grp = groups.find((g) => g.id === groupId);
    if (!grp) return;
    setPickerSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (grp.selection_type === "single") return { ...prev, [groupId]: [modId] };
      if (current.includes(modId)) return { ...prev, [groupId]: current.filter((x) => x !== modId) };
      if (current.length >= grp.max_select) return prev;
      return { ...prev, [groupId]: [...current, modId] };
    });
  };

  const addPickerToCart = () => {
    if (!pickerItem) return;
    // Min-select validation
    const itemGroups = links.filter((l) => l.item_id === pickerItem.id).map((l) => l.group_id);
    for (const gid of itemGroups) {
      const grp = groups.find((g) => g.id === gid);
      if (!grp) continue;
      const picked = pickerSelections[gid]?.length ?? 0;
      if (picked < grp.min_select) {
        toast.error(`Pick at least ${grp.min_select} from "${grp.name}".`);
        return;
      }
    }
    const allMods = itemGroups.flatMap((gid) => pickerSelections[gid] ?? []);
    setCart((p) => [...p, {
      uid: newUid(),
      item: pickerItem,
      quantity: pickerQty,
      modifierIds: allMods,
      notes: pickerNotes.trim(),
    }]);
    setPickerItem(null);
  };

  const removeLine = (uid: string) => setCart((p) => {
    const target = p.find((l) => l.uid === uid);
    if (target?.isBundleChild) return p; // children are not independently removable
    if (target?.isBundleHeader && target.bundleUid) {
      return p.filter((l) => l.bundleUid !== target.bundleUid);
    }
    return p.filter((l) => l.uid !== uid);
  });
  const adjustQty = (uid: string, delta: number) =>
    setCart((p) => {
      const target = p.find((l) => l.uid === uid);
      if (!target) return p;
      // Bundle header: bump the header AND every child sharing its bundleUid
      // so the displayed child multipliers stay in lockstep.
      if (target.isBundleHeader && target.bundleUid) {
        const next = Math.max(1, Math.min(99, target.quantity + delta));
        return p.map((l) => l.bundleUid === target.bundleUid ? { ...l, quantity: next } : l);
      }
      // Children's qty is controlled by their header; ignore direct adjustments.
      if (target.isBundleChild) return p;
      return p.map((l) => l.uid === uid ? { ...l, quantity: Math.max(1, Math.min(99, l.quantity + delta)) } : l);
    });

  const reorderLastOrder = async () => {
    if (!store) return;
    const phone = customerPhone.trim();
    if (phone.length < 6) { toast.error("Enter your phone first."); return; }
    setReordering(true);
    const res = await supabase.rpc("cafe_public_last_order_items" as never, {
      p_store_id: store.id, p_phone: phone,
    } as never);
    setReordering(false);
    if (res.error) { console.error("[reorder]", res.error); toast.error("Couldn't load your last order."); return; }
    const rows = (res.data ?? []) as unknown as Array<{ menu_item_id: string; item_name: string; quantity: number; modifier_ids: string[] }>;
    if (rows.length === 0) { toast.error("No previous order found."); return; }

    // Filter against the live menu — items may have been removed or marked
    // sold out since the last visit. Modifier ids that are no longer active
    // are silently dropped too.
    const liveItemMap = new Map(items.map((i) => [i.id, i]));
    const liveModIds = new Set(modifiers.map((m) => m.id));
    let skipped = 0;
    const newLines: CartLine[] = [];
    for (const r of rows) {
      const live = liveItemMap.get(r.menu_item_id);
      if (!live || live.is_sold_out) { skipped++; continue; }
      newLines.push({
        uid: newUid(),
        item: live,
        quantity: Math.max(1, Math.min(99, r.quantity)),
        modifierIds: (r.modifier_ids || []).filter((mid) => liveModIds.has(mid)),
        notes: "",
      });
    }
    if (newLines.length === 0) {
      toast.error("Last order's items are no longer available.");
      return;
    }
    setCart(newLines);
    setCartOpen(true);
    if (skipped > 0) toast.info(`${skipped} item${skipped === 1 ? "" : "s"} from your last order skipped.`);
    else toast.success("Last order added to cart.");
  };

  const submitOrder = async () => {
    if (cart.length === 0 || !store) return;
    setSubmitting(true);
    const payload = {
      p_store_id: store.id,
      p_table_token: tableToken,
      p_channel: tableToken ? "qr_table" : "pickup",
      p_customer: {
        name: customerName.trim() || null,
        phone: customerPhone.trim() || null,
        email: null,
      },
      p_items: cart
        .filter((line) => !line.isBundleChild)
        .map((line) => line.isBundleHeader && line.bundle
          ? { bundle_id: line.bundle.id, quantity: line.quantity, modifier_ids: [], notes: null }
          : {
              menu_item_id: line.item.id,
              quantity: line.quantity,
              notes: line.notes || null,
              modifier_ids: line.modifierIds,
            }),
      p_customer_notes: customerNotes.trim() || null,
      p_tip_cents: settings.allow_tips ? tipCents : 0,
      p_promo_code: settings.allow_promos ? (promoCode.trim() || null) : null,
      p_gift_card_code: settings.allow_gift_cards ? (giftCardCode.trim() || null) : null,
      p_redeem_loyalty: redeemLoyalty && !!loyaltyBalance?.can_redeem,
      p_scheduled_for: settings.allow_scheduled_orders && scheduleMode === "later" && scheduledFor
        ? new Date(scheduledFor).toISOString()
        : null,
    };
    const { data, error } = await supabase.rpc("cafe_place_public_order" as never, payload as never);
    setSubmitting(false);
    if (error || !data) {
      console.error("[cafe order] submit failed", error);
      toast.error("Couldn't place the order. Please try again.");
      return;
    }
    const newOrderId = data as unknown as string;
    setCart([]);
    setCartOpen(false);
    toast.success("Order sent!");
    navigate(`/cafe/order/${newOrderId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-sm text-muted-foreground">{loadError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background pb-32">
      <Helmet><title>{store ? `${store.name} · Order` : "Order"}</title><meta name="robots" content="noindex" /></Helmet>

      <div className="relative">
        {store?.banner_url ? (
          <img src={store.banner_url} alt="" className="h-32 w-full object-cover" />
        ) : (
          <div className="h-32 bg-gradient-to-br from-amber-500/20 to-amber-700/10" />
        )}
        <div className="px-4 -mt-10">
          <div className="flex items-end gap-3">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-4 border-background bg-card shadow-md">
              {store?.logo_url ? <img src={store.logo_url} alt="" className="h-full w-full rounded-xl object-cover" /> : <Coffee className="h-8 w-8 text-amber-600" />}
            </div>
            <div className="pb-1 min-w-0 flex-1">
              <h1 className="text-xl font-bold truncate">{store?.name}</h1>
              <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                {tableLabel && <Badge variant="secondary" className="text-[10px]">Table {tableLabel}</Badge>}
                {reviewSummary && (
                  <span className="inline-flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                    <span className="text-amber-500">★</span>
                    <span className="font-semibold text-foreground">{reviewSummary.avg_rating.toFixed(1)}</span>
                    <span>· {reviewSummary.review_count} review{reviewSummary.review_count === 1 ? "" : "s"}</span>
                  </span>
                )}
                {openStatus?.is_open_now && openStatus.closes_at && (() => {
                  // closes_at is a "HH:MM:SS" time-of-day string. Format to
                  // 12h with a leading dot indicator so it reads naturally.
                  const t = openStatus.closes_at.slice(0, 5);
                  const [hStr, mStr] = t.split(":");
                  const h = parseInt(hStr, 10);
                  const m = parseInt(mStr, 10);
                  const ampm = h >= 12 ? "PM" : "AM";
                  const h12 = ((h + 11) % 12) + 1;
                  const label = m === 0 ? `${h12} ${ampm}` : `${h12}:${mStr} ${ampm}`;
                  return (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Open until {label}
                    </span>
                  );
                })()}
              </div>
            </div>
            {store?.slug && (
              <div className="pb-2 flex flex-col items-end gap-0.5 shrink-0 text-[11px]">
                <a
                  href={`/cafe/${store.slug}/reserve`}
                  className="text-violet-700 dark:text-violet-300 hover:underline underline-offset-2"
                >
                  Reserve a table
                </a>
                <a
                  href={`/cafe/${store.slug}/about`}
                  className="text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  About
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {openStatus && !openStatus.is_open_now && (
        <div className="px-4 mt-4">
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 flex items-start gap-2 text-[13px]">
            <AlertCircle className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-300 shrink-0" />
            <div className="text-amber-900 dark:text-amber-100">
              <span className="font-semibold">We're closed right now.</span>{" "}
              {openStatus.next_open_time
                ? <>Your order will be queued for when we open
                    {(() => {
                      const today = new Date().getDay();
                      const day = openStatus.next_open_day;
                      const t = openStatus.next_open_time.slice(0, 5);
                      if (day === null) return ".";
                      if (day === today) return ` today at ${t}.`;
                      if (day === (today + 1) % 7) return ` tomorrow at ${t}.`;
                      const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                      return ` ${labels[day]} at ${t}.`;
                    })()}
                  </>
                : "Your order will be queued for our next opening."}
            </div>
          </div>
        </div>
      )}

      {settings.daily_message && (!settings.daily_message_until || new Date(settings.daily_message_until) > new Date()) && (
        <div className="px-4 mt-4">
          <div className="rounded-md border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-amber-500/5 px-3 py-2 text-[13px] text-amber-900 dark:text-amber-100 flex items-start gap-2">
            <span aria-hidden="true">📣</span>
            <span className="font-medium">{settings.daily_message}</span>
          </div>
        </div>
      )}

      {featuredHero.length > 0 && (
        <div className="px-4 mt-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
            Try our specials
          </p>
          <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-2">
            {featuredHero.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => openItemPicker(it)}
                className="shrink-0 w-44 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card text-left overflow-hidden hover:shadow-md transition-shadow"
              >
                {it.image_url ? (
                  <img src={it.image_url} alt="" className="h-24 w-full object-cover" />
                ) : (
                  <div className="h-24 grid place-items-center bg-amber-500/10 text-amber-600">
                    <Coffee className="h-7 w-7" />
                  </div>
                )}
                <div className="p-2">
                  <p className="font-semibold text-sm truncate">{it.name}</p>
                  <p className="text-[12px] tabular-nums text-muted-foreground">{fmt(it.price_cents)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {visibleBundles.length > 0 && (
        <div className="px-4 mt-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-rose-600" /> Combos
          </p>
          <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-2">
            {visibleBundles.map((b) => {
              const lines = bundleItems.filter((bi) => bi.bundle_id === b.id);
              const sumRegular = lines.reduce((sum, bi) => {
                const m = menuById.get(bi.menu_item_id);
                return sum + ((m?.price_cents ?? 0) * bi.quantity);
              }, 0);
              const saves = sumRegular - b.price_cents;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { setBundlePicker(b); setBundlePickerQty(1); }}
                  className="shrink-0 w-44 rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-card to-card text-left overflow-hidden hover:shadow-md transition-shadow relative"
                >
                  {b.image_url ? (
                    <img src={b.image_url} alt="" className="h-24 w-full object-cover" />
                  ) : (
                    <div className="h-24 grid place-items-center bg-rose-500/10 text-rose-600">
                      <Package className="h-7 w-7" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="font-semibold text-sm truncate">{b.name}</p>
                    <p className="text-[12px] tabular-nums text-muted-foreground">{fmt(b.price_cents)}</p>
                    {fmtBundleWindow(b.active_start_time, b.active_end_time) && (
                      <p className="text-[10px] text-rose-700 font-medium mt-0.5 truncate">
                        {fmtBundleWindow(b.active_start_time, b.active_end_time)}
                      </p>
                    )}
                  </div>
                  {saves > 0 && (
                    <span className="absolute top-2 right-2 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 shadow-sm">
                      Save {fmt(saves)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Phase 72: storefront menu search. Slim input above the category
          chips. When the query is non-empty, the chip strip hides (the
          query overrides any category filter) and the items grid below
          reflows to matching items only. */}
      <div className="px-4 mt-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search the menu"
            className="pl-8 pr-8 h-9"
            aria-label="Search menu"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {searchQuery.trim().length === 0 && (
        <div className="px-4 mt-3 mb-3 overflow-x-auto">
          <div className="flex gap-2">
            <button onClick={() => setActiveCatId(null)} className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm border",
              activeCatId === null ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
            )}>All</button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setActiveCatId(c.id)} className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm border",
                activeCatId === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
              )}>{c.name}</button>
            ))}
          </div>
        </div>
      )}
      {searchQuery.trim().length > 0 && <div className="mb-3" />}

      <div className="px-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibleItems.length === 0 ? (
          <p className="col-span-full text-sm text-muted-foreground text-center py-8">
            {searchQuery.trim().length > 0
              ? <>No items match &ldquo;{searchQuery.trim()}&rdquo;.</>
              : "No items in this category yet."}
          </p>
        ) : visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { if (!item.is_sold_out) openItemPicker(item); }}
            disabled={item.is_sold_out}
            aria-disabled={item.is_sold_out}
            className={cn(
              "text-left rounded-xl border border-border bg-card overflow-hidden transition-shadow relative",
              item.is_sold_out ? "opacity-60 cursor-not-allowed" : "hover:shadow-md",
            )}
          >
            <div className="flex">
              {item.image_url ? (
                <img src={item.image_url} alt="" className={cn("h-24 w-24 object-cover shrink-0", item.is_sold_out && "grayscale")} />
              ) : (
                <div className="h-24 w-24 grid place-items-center bg-amber-500/10 text-amber-600 shrink-0">
                  <Coffee className="h-7 w-7" />
                </div>
              )}
              <div className="p-3 min-w-0 flex-1">
                <p className="font-semibold truncate">{item.name}</p>
                {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>}
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  {(() => {
                    const ep = effectivePrice(item);
                    return ep.original ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-sm font-medium tabular-nums">{fmt(ep.current)}</span>
                        <span className="text-[11px] line-through text-muted-foreground tabular-nums">{fmt(ep.original)}</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold rounded px-1 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          Happy hour
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm font-medium tabular-nums">{fmt(ep.current)}</span>
                    );
                  })()}
                  <DietaryBadges item={item} />
                </div>
              </div>
            </div>
            {item.is_sold_out && (
              <span className="absolute top-2 right-2 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wide px-2 py-0.5">
                Sold out
              </span>
            )}
            {!item.is_sold_out && popularIds.has(item.id) && (
              <span className="absolute top-2 left-2 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 shadow-sm">
                🔥 Popular
              </span>
            )}
          </button>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 p-3 bg-gradient-to-t from-background via-background/95 to-background/0">
          <Button onClick={() => setCartOpen(true)} size="lg" className="w-full justify-between max-w-2xl mx-auto shadow-xl">
            {(() => {
              const cartCount = cart.filter((l) => !l.isBundleChild).reduce((s, l) => s + l.quantity, 0);
              return (
                <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> {cartCount} item{cartCount === 1 ? "" : "s"}</span>
              );
            })()}
            <span className="tabular-nums">{fmt(cartTotal)} <ArrowRight className="h-4 w-4 inline ml-1" /></span>
          </Button>
        </div>
      )}

      {/* Item modifier picker */}
      <Dialog open={!!pickerItem} onOpenChange={(v) => !v && setPickerItem(null)}>
        <DialogContent className="max-w-md">
          {pickerItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{pickerItem.name}</span>
                  <DietaryBadges item={pickerItem} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {pickerItem.description && <p className="text-sm text-muted-foreground">{pickerItem.description}</p>}
                {pickerItem.allergens && pickerItem.allergens.trim() && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-100">
                    <span className="font-semibold">⚠ Contains: </span>
                    {pickerItem.allergens}
                  </div>
                )}
                {(() => {
                  const itemGroupIds = links.filter((l) => l.item_id === pickerItem.id).map((l) => l.group_id);
                  return itemGroupIds.map((gid) => {
                    const grp = groups.find((g) => g.id === gid);
                    if (!grp) return null;
                    const groupMods = modifiers.filter((m) => m.group_id === grp.id);
                    const picked = pickerSelections[grp.id] ?? [];
                    const under = grp.min_select > 0 && picked.length < grp.min_select;
                    return (
                      <div key={grp.id}>
                        <p className="text-sm font-semibold mb-1.5 flex items-center gap-2">
                          <span>{grp.name}</span>
                          {grp.min_select > 0 && <span className="text-[10px] uppercase tracking-wide text-destructive">required</span>}
                          <span className="text-[11px] text-muted-foreground font-normal ml-auto">
                            {grp.min_select === grp.max_select && grp.min_select > 0
                              ? `Pick ${grp.min_select}`
                              : grp.min_select > 0
                                ? `Pick ${grp.min_select}–${grp.max_select}`
                                : `Up to ${grp.max_select}`}
                          </span>
                        </p>
                        <div className={cn("space-y-1 rounded-lg", under && "ring-1 ring-destructive/40 p-1 -m-1")}>
                          {groupMods.map((m) => {
                            const on = picked.includes(m.id);
                            return (
                              <button key={m.id} type="button" onClick={() => togglePick(grp.id, m.id)} className={cn(
                                "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                                on ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"
                              )}>
                                <span>{m.name}</span>
                                <span className="text-muted-foreground tabular-nums">{m.price_delta_cents > 0 ? `+${fmt(m.price_delta_cents)}` : m.price_delta_cents < 0 ? `−${fmt(Math.abs(m.price_delta_cents))}` : ""}</span>
                              </button>
                            );
                          })}
                        </div>
                        {under && (
                          <p className="mt-1 text-[11px] text-destructive">
                            Choose {grp.min_select - picked.length} more.
                          </p>
                        )}
                      </div>
                    );
                  });
                })()}
                <div>
                  <Label className="text-sm">Notes (optional)</Label>
                  <Textarea value={pickerNotes} onChange={(e) => setPickerNotes(e.target.value)} placeholder="No sugar, extra hot, …" rows={2} />
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" onClick={() => setPickerQty((q) => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
                    <span className="w-6 text-center font-semibold">{pickerQty}</span>
                    <Button size="icon" variant="outline" onClick={() => setPickerQty((q) => Math.min(99, q + 1))}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPickerItem(null)}>Cancel</Button>
                {(() => {
                  const itemGroupIds = links.filter((l) => l.item_id === pickerItem.id).map((l) => l.group_id);
                  const invalid = itemGroupIds.some((gid) => {
                    const grp = groups.find((g) => g.id === gid);
                    if (!grp || grp.min_select <= 0) return false;
                    return (pickerSelections[gid]?.length ?? 0) < grp.min_select;
                  });
                  const modSum = Object.values(pickerSelections).flat()
                    .reduce((s, mid) => s + (modifiers.find((m) => m.id === mid)?.price_delta_cents ?? 0), 0);
                  return (
                    <Button onClick={addPickerToCart} disabled={invalid}>
                      Add — {fmt((effectivePrice(pickerItem).current + modSum) * pickerQty)}
                    </Button>
                  );
                })()}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bundle picker */}
      <Dialog open={!!bundlePicker} onOpenChange={(v) => !v && setBundlePicker(null)}>
        <DialogContent className="max-w-md">
          {bundlePicker && (() => {
            const lines = bundleItems.filter((bi) => bi.bundle_id === bundlePicker.id);
            const validLines = lines
              .map((bi) => ({ bi, m: menuById.get(bi.menu_item_id) }))
              .filter((x): x is { bi: PublicBundleItem; m: MenuItem } => !!x.m);
            const sumRegular = validLines.reduce((s, { bi, m }) => s + m.price_cents * bi.quantity, 0);
            const saves = sumRegular - bundlePicker.price_cents;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-rose-600" />
                    <span>{bundlePicker.name}</span>
                    {saves > 0 && (
                      <span className="text-[10px] uppercase tracking-wider font-bold rounded px-1.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        Save {fmt(saves)}
                      </span>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-[55vh] overflow-y-auto">
                  {bundlePicker.description && (
                    <p className="text-sm text-muted-foreground">{bundlePicker.description}</p>
                  )}
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">What&rsquo;s inside</p>
                    <ul className="space-y-1.5">
                      {validLines.map(({ bi, m }) => (
                        <li key={bi.id} className="flex items-center justify-between text-sm">
                          <span>{bi.quantity}× {m.name}</span>
                          <span className="text-[12px] tabular-nums line-through text-muted-foreground">{fmt(m.price_cents * bi.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">Bundle price</span>
                    <span className="text-base font-bold tabular-nums">{fmt(bundlePicker.price_cents)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quantity</span>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" onClick={() => setBundlePickerQty((q) => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
                      <span className="w-6 text-center font-semibold">{bundlePickerQty}</span>
                      <Button size="icon" variant="outline" onClick={() => setBundlePickerQty((q) => Math.min(10, q + 1))}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setBundlePicker(null)}>Cancel</Button>
                  <Button
                    onClick={() => {
                      const newLines = expandBundleToLines(bundlePicker, bundlePickerQty, bundleItems, menuById);
                      if (newLines.length === 0) {
                        toast.error("This bundle is unavailable right now.");
                        return;
                      }
                      setCart((p) => [...p, ...newLines]);
                      setBundlePicker(null);
                      setBundlePickerQty(1);
                    }}
                  >
                    Add — {fmt(bundlePicker.price_cents * bundlePickerQty)}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Cart sheet */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Your order</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[55vh] overflow-y-auto">
            {upsellItems.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-300 mb-1.5">
                  Add to your order
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
                  {upsellItems.map((up) => (
                    <button
                      key={up.id}
                      type="button"
                      onClick={() => { setCartOpen(false); openItemPicker(up); }}
                      className="shrink-0 w-32 rounded-md border border-border bg-card hover:border-primary/50 hover:shadow-sm transition text-left overflow-hidden"
                    >
                      {up.image_url ? (
                        <img src={up.image_url} alt="" className="h-16 w-full object-cover" />
                      ) : (
                        <div className="h-16 grid place-items-center bg-amber-500/10 text-amber-600">
                          <Coffee className="h-5 w-5" />
                        </div>
                      )}
                      <div className="p-1.5">
                        <p className="text-[12px] font-medium truncate">{up.name}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">{fmt(up.price_cents)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Cart is empty.</p>
            ) : cart.map((line) => {
              // Bundle child: read-only indented row.
              if (line.isBundleChild) {
                return (
                  <div key={line.uid} className="flex gap-2 pl-6 py-0.5 text-muted-foreground">
                    <span className="flex-1 min-w-0 text-[12px] truncate">
                      {line.quantity}× {line.item.name}
                    </span>
                  </div>
                );
              }
              // Bundle header: bundle name + bundle unit price + controls.
              if (line.isBundleHeader && line.bundle) {
                return (
                  <div key={line.uid} className="flex gap-2 border-b border-border/40 pb-2 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-rose-600 shrink-0" /> {line.bundle.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{fmt(line.bundle.priceCents)} each</p>
                      <div className="mt-1 flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => adjustQty(line.uid, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="text-sm w-5 text-center">{line.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => adjustQty(line.uid, +1)}><Plus className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 ml-2 text-destructive" onClick={() => removeLine(line.uid)}><X className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <span className="tabular-nums text-sm shrink-0">{fmt(line.bundle.priceCents * line.quantity)}</span>
                  </div>
                );
              }
              // Plain item line.
              const lineMods = line.modifierIds.map((mid) => modifiers.find((m) => m.id === mid)?.name).filter(Boolean);
              const lineSum = line.modifierIds.reduce((s, mid) => s + (modifiers.find((m) => m.id === mid)?.price_delta_cents ?? 0), 0);
              return (
                <div key={line.uid} className="flex gap-2 border-b border-border/40 pb-2 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{line.item.name}</p>
                    {lineMods.length > 0 && <p className="text-[11px] text-muted-foreground truncate">{lineMods.join(" · ")}</p>}
                    {line.notes && <p className="text-[11px] italic text-muted-foreground truncate">"{line.notes}"</p>}
                    <div className="mt-1 flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => adjustQty(line.uid, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="text-sm w-5 text-center">{line.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => adjustQty(line.uid, +1)}><Plus className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 ml-2 text-destructive" onClick={() => removeLine(line.uid)}><X className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <span className="tabular-nums text-sm shrink-0">{fmt((effectivePrice(line.item).current + lineSum) * line.quantity)}</span>
                </div>
              );
            })}
            {cart.length > 0 && (
              <div className="space-y-3 pt-1">
                {settings.allow_tips && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Tip the team</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {([
                      { label: "None", v: null as null | number | "custom" },
                      { label: `${settings.tip_preset_1}%`, v: settings.tip_preset_1 },
                      { label: `${settings.tip_preset_2}%`, v: settings.tip_preset_2 },
                      { label: `${settings.tip_preset_3}%`, v: settings.tip_preset_3 },
                      { label: "Custom", v: "custom" as const },
                    ]).map(({ label, v }) => {
                      const active = tipPercent === v;
                      return (
                        <button
                          key={label} type="button" onClick={() => setTipPercent(v)}
                          className={cn(
                            "rounded-md border py-1.5 text-xs transition-colors",
                            active ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border bg-card hover:bg-muted",
                          )}
                        >{label}</button>
                      );
                    })}
                  </div>
                  {tipPercent === "custom" && (
                    <Input
                      type="number" step="0.01" min="0"
                      value={(tipCustomCents / 100).toString()}
                      onChange={(e) => setTipCustomCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                      className="mt-1.5 h-8 text-sm"
                      placeholder="Tip ($)"
                    />
                  )}
                </div>
                )}

                {settings.allow_scheduled_orders ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Pickup time</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button" onClick={() => { setScheduleMode("asap"); setScheduledFor(""); }}
                        className={cn(
                          "rounded-md border py-1.5 text-xs transition-colors",
                          scheduleMode === "asap"
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border bg-card hover:bg-muted",
                        )}
                      >ASAP</button>
                      <button
                        type="button" onClick={() => setScheduleMode("later")}
                        className={cn(
                          "rounded-md border py-1.5 text-xs transition-colors",
                          scheduleMode === "later"
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border bg-card hover:bg-muted",
                        )}
                      >Schedule</button>
                    </div>
                    {scheduleMode === "later" && (
                      <Input
                        type="datetime-local"
                        min={schedulePickerMin}
                        max={schedulePickerMax}
                        value={scheduledFor}
                        onChange={(e) => setScheduledFor(e.target.value)}
                        className="mt-1.5 h-8 text-sm"
                      />
                    )}
                  </div>
                ) : null}

                {(settings.allow_promos || settings.allow_gift_cards) && (
                <div className={cn("grid gap-2", settings.allow_promos && settings.allow_gift_cards ? "grid-cols-2" : "grid-cols-1")}>
                  {settings.allow_promos && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Promo code</p>
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="HAPPY10"
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                  )}
                  {settings.allow_gift_cards && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Gift card</p>
                    <Input
                      value={giftCardCode}
                      onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                      placeholder="GC-XXXX-XXXX"
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                  )}
                </div>
                )}

                {loyaltyProgram && (() => {
                  const earnPoints = loyaltyProgram.mode === "stamp_card"
                    ? 1
                    : Math.floor(loyaltyProgram.earn_rate_milli * (cartSubtotal / 100));
                  const hasBalance = !!loyaltyBalance && loyaltyBalance.points > 0;
                  const canRedeem = !!loyaltyBalance?.can_redeem;
                  if (earnPoints <= 0 && !hasBalance) return null;
                  return (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm space-y-1.5">
                      {hasBalance && (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-700 dark:text-amber-300">★</span>
                          <span className="flex-1 text-foreground">
                            You have <span className="font-semibold tabular-nums">{loyaltyBalance!.points}</span>
                            {" "}{loyaltyProgram.mode === "stamp_card" ? "stamps" : "points"}
                          </span>
                          {!canRedeem && loyaltyBalance && (
                            <span className="text-[10px] text-muted-foreground">
                              {loyaltyBalance.redeem_threshold - loyaltyBalance.points} more for {fmt(loyaltyBalance.reward_value_cents)} off
                            </span>
                          )}
                        </div>
                      )}
                      {canRedeem && loyaltyBalance && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={redeemLoyalty}
                            onChange={(e) => setRedeemLoyalty(e.target.checked)}
                            className="h-4 w-4 accent-amber-600"
                          />
                          <span className="text-foreground">
                            Use <span className="font-semibold tabular-nums">{loyaltyBalance.redeem_threshold}</span>
                            {" "}{loyaltyProgram.mode === "stamp_card" ? "stamps" : "points"} for
                            {" "}<span className="font-semibold tabular-nums">{fmt(loyaltyBalance.reward_value_cents)}</span> off
                          </span>
                        </label>
                      )}
                      {earnPoints > 0 && (
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                          <span className="text-amber-700/70 dark:text-amber-300/70">+</span>
                          <span className="flex-1">
                            Earn <span className="font-semibold tabular-nums text-foreground">{earnPoints}</span>
                            {" "}{loyaltyProgram.mode === "stamp_card" ? "stamp" : "points"} with this order
                          </span>
                          {!hasBalance && (
                            <span className="text-[10px]">Add your phone above</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="border-t border-border/60 pt-2 space-y-0.5 text-sm tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{fmt(cartSubtotal)}</span>
                  </div>
                  {taxCents > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Tax ({(settings.tax_rate_bp / 100).toFixed(2)}%)
                      </span>
                      <span>{fmt(taxCents)}</span>
                    </div>
                  )}
                  {tipCents > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tip</span>
                      <span>{fmt(tipCents)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between font-semibold pt-1">
                    <span>Total</span>
                    <span>{fmt(cartTotal)}</span>
                  </div>
                  {promoCode && (
                    <p className="text-[10px] text-muted-foreground italic">Promo will be validated at checkout.</p>
                  )}
                </div>

                <Input placeholder="Your name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                <Input placeholder="Phone (optional, for updates)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                {customerSummary && customerSummary.visit_count > 0 && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300 space-y-2">
                    <p>
                      👋 Welcome back{customerSummary.name ? `, ${customerSummary.name}` : ""}! This is visit #{customerSummary.visit_count + 1}.
                    </p>
                    <Button
                      size="sm" variant="outline" className="h-7 text-xs border-emerald-500/50"
                      onClick={() => void reorderLastOrder()}
                      disabled={reordering}
                    >
                      {reordering && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Reorder same as last time
                    </Button>
                  </div>
                )}
                <Textarea placeholder="Order notes (allergies, etc.)" value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} rows={2} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCartOpen(false)}><ChevronLeft className="h-4 w-4 mr-1" /> Keep adding</Button>
            <Button onClick={submitOrder} disabled={cart.length === 0 || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Coffee className="h-4 w-4 mr-1" />}
              Place order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
