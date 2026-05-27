import { useMemo, useState } from "react";
import { Tag, Percent, DollarSign, Calendar, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoadingPanel, NextActions, SectionShell, StatCard } from "./LodgingOperationsShared";
import { CatalogTable, EditorDialog } from "./CatalogTable";
import { useLodgingCatalog } from "@/hooks/lodging/useLodgingCatalog";
import { PROMO_PRESETS } from "./PromoPresets";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

interface Promotion {
  id: string;
  store_id: string;
  code?: string | null;
  name: string;
  promo_type: string;
  discount_value: number;
  rule_type: string;
  min_nights?: number | null;
  max_nights?: number | null;
  days_in_advance?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  redemptions_total?: number | null;
  redemptions_used: number;
  active: boolean;
}

const PROMO_TYPES = ["percent", "fixed", "free_night", "upgrade"];
const RULE_TYPES = [
  { v: "general", label: "General code / discount" },
  { v: "early_bird", label: "Early bird (book in advance)" },
  { v: "last_minute", label: "Last minute (close to arrival)" },
  { v: "length_of_stay", label: "Length of stay" },
  { v: "mobile", label: "Mobile-only rate" },
  { v: "member", label: "Member-only rate" },
];
const FILTERS = [
  { v: "all", label: "All" },
  { v: "early_bird", label: "Early Bird" },
  { v: "last_minute", label: "Last Minute" },
  { v: "length_of_stay", label: "Length of Stay" },
  { v: "mobile", label: "Mobile" },
  { v: "member", label: "Member" },
  { v: "code", label: "Code" },
];
const blank: Partial<Promotion> = { name: "New promotion", promo_type: "percent", discount_value: 10, rule_type: "general", redemptions_used: 0, active: true };

export default function LodgingPromotionsSection({ storeId }: { storeId: string }) {
  const { list, upsert, remove, toggleActive } = useLodgingCatalog<Promotion>("lodging_promotions", storeId);
  const [editing, setEditing] = useState<Partial<Promotion> | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const rows = list.data || [];

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.active !== false);
    const now = Date.now();
    const expiringSoon = rows.filter((r) => r.ends_at && new Date(r.ends_at).getTime() - now < 14 * 86400000 && new Date(r.ends_at).getTime() > now).length;
    const totalRedemptions = rows.reduce((s, r) => s + (r.redemptions_used || 0), 0);
    const codeBased = rows.filter((r) => r.code).length;
    return { activeCount: active.length, totalRedemptions, codeBased, expiringSoon };
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "code") return rows.filter((r) => Boolean(r.code));
    return rows.filter((r) => r.rule_type === filter);
  }, [rows, filter]);

  return (
    <SectionShell title="Promotions & Discounts" subtitle="Promo codes, early-bird, last-minute, length-of-stay, and member-only rates." icon={Tag}>
      <LodgingQuickJump active="lodge-promos" />
      <LodgingSectionStatusBanner title="Promotions & Discounts" icon={Tag} countLabel="Active promos" countValue={stats.activeCount} fixLabel="Open rate plans" fixTab="lodge-rate-plans" />
      {list.isLoading ? <LoadingPanel /> : <>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Active promos" value={String(stats.activeCount)} icon={Tag} />
          <StatCard label="Total redemptions" value={String(stats.totalRedemptions)} icon={Percent} />
          <StatCard label="Code-based" value={String(stats.codeBased)} icon={Tag} />
          <StatCard label="Expiring 14d" value={String(stats.expiringSoon)} icon={Calendar} />
        </div>

        {/* Preset gallery */}
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">Quick presets</p>
            <p className="text-[10px] text-muted-foreground">One-click templates — edit anything before saving.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PROMO_PRESETS.map((p) => (
              <button type="button"
                key={p.key}
                onClick={() => setEditing({ ...blank, ...p.values })}
                className="rounded-md border border-border bg-background p-2 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{p.emoji}</span>
                  <p className="text-[12px] font-bold text-foreground">{p.label}</p>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{p.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Filter chips */}
        <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
          {FILTERS.map((f) => (
            <button type="button"
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                filter === f.v ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-foreground/70 hover:border-primary/30",
              )}
            >
              {f.label}
            </button>
          ))}
          <Button size="sm" className="ml-auto h-7 text-[11px]" onClick={() => setEditing({ ...blank })}>
            <Tag className="mr-1 h-3 w-3" /> New custom promo
          </Button>
        </div>

        <CatalogTable
          rows={filtered}
          isLoading={list.isLoading}
          emptyTitle={filter === "all" ? "No promotions yet" : "No promos in this filter"}
          emptyBody={filter === "all" ? "Pick a preset above or create a custom promo to start driving direct bookings." : "Try a different filter or create a new promo."}
          addLabel="Add promotion"
          onAddClick={() => setEditing({ ...blank })}
          onEdit={(r) => setEditing(r)}
          onDelete={(id) => remove.mutate(id)}
          onToggleActive={(r) => toggleActive.mutate({ id: r.id, active: r.active === false })}
          columns={[
            { key: "name", label: "Promotion", render: (r) => (
              <>
                <span className="font-semibold">{r.name}</span>
                <p className="text-xs text-muted-foreground">
                  {r.code ? <Badge variant="outline" className="mr-1.5">{r.code}</Badge> : null}
                  <span className="capitalize">{r.rule_type.replace(/_/g, " ")}</span>
                </p>
              </>
            )},
            { key: "discount", label: "Discount", className: "w-28", render: (r) => r.promo_type === "percent" ? `${r.discount_value}% off` : r.promo_type === "fixed" ? `$${r.discount_value} off` : r.promo_type === "free_night" ? `${r.discount_value} free night${r.discount_value > 1 ? "s" : ""}` : "Upgrade" },
            { key: "redemp", label: "Used", className: "w-24", render: (r) => `${r.redemptions_used}${r.redemptions_total ? `/${r.redemptions_total}` : ""}` },
            { key: "ends", label: "Ends", className: "w-28", render: (r) => r.ends_at ? new Date(r.ends_at).toLocaleDateString() : "No expiry" },
          ]}
        />

        <NextActions actions={[
          { label: "Tune room rates", tab: "lodge-rate-plans", hint: "Confirm base rates leave room for discounts." },
          { label: "Highlight in property profile", tab: "lodge-property", hint: "Promote signature offers in property highlights." },
          { label: "Track in reports", tab: "lodge-reports", hint: "Monitor promotion performance over time." },
        ]} />

        {editing && (
          <EditorDialog
            open
            onOpenChange={(v) => !v && setEditing(null)}
            title={editing.id ? "Edit promotion" : "New promotion"}
            saving={upsert.isPending}
            onSave={() => {
              if (!editing.name?.trim()) return;
              upsert.mutate(editing as Promotion, { onSuccess: () => setEditing(null) });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Summer 2026 — 15% off" />
              </div>
              <div>
                <Label>Promo code (optional)</Label>
                <Input value={editing.code || ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="SUMMER15" />
              </div>
              <div>
                <Label>Rule</Label>
                <Select value={editing.rule_type} onValueChange={(v) => setEditing({ ...editing, rule_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RULE_TYPES.map((r) => <SelectItem key={r.v} value={r.v}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount type</Label>
                <Select value={editing.promo_type} onValueChange={(v) => setEditing({ ...editing, promo_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROMO_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input type="number" min={0} step="0.01" value={editing.discount_value || 0} onChange={(e) => setEditing({ ...editing, discount_value: parseFloat(e.target.value || "0") })} />
              </div>
              {editing.rule_type === "early_bird" && (
                <div>
                  <Label>Days in advance</Label>
                  <Input type="number" min={1} value={editing.days_in_advance || 30} onChange={(e) => setEditing({ ...editing, days_in_advance: parseInt(e.target.value || "0", 10) })} />
                </div>
              )}
              {editing.rule_type === "last_minute" && (
                <div>
                  <Label>Within days of arrival</Label>
                  <Input type="number" min={1} value={editing.days_in_advance || 7} onChange={(e) => setEditing({ ...editing, days_in_advance: parseInt(e.target.value || "0", 10) })} />
                </div>
              )}
              {editing.rule_type === "length_of_stay" && (
                <>
                  <div>
                    <Label>Min nights</Label>
                    <Input type="number" min={1} value={editing.min_nights || 1} onChange={(e) => setEditing({ ...editing, min_nights: parseInt(e.target.value || "0", 10) })} />
                  </div>
                  <div>
                    <Label>Max nights (optional)</Label>
                    <Input type="number" min={1} value={editing.max_nights || ""} onChange={(e) => setEditing({ ...editing, max_nights: e.target.value ? parseInt(e.target.value, 10) : null })} />
                  </div>
                </>
              )}
              <div>
                <Label>Starts</Label>
                <Input type="date" value={editing.starts_at?.slice(0, 10) || ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
              <div>
                <Label>Ends</Label>
                <Input type="date" value={editing.ends_at?.slice(0, 10) || ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Max total redemptions (optional)</Label>
                <Input type="number" min={1} value={editing.redemptions_total || ""} onChange={(e) => setEditing({ ...editing, redemptions_total: e.target.value ? parseInt(e.target.value, 10) : null })} />
              </div>
            </div>
          </EditorDialog>
        )}
      </>}
    </SectionShell>
  );
}
