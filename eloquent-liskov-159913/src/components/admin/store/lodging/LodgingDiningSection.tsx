import { useState } from "react";
import { Utensils } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingPanel, NextActions, SectionShell, StatCard, money } from "./LodgingOperationsShared";
import { CatalogTable, EditorDialog } from "./CatalogTable";
import { useLodgingCatalog } from "@/hooks/lodging/useLodgingCatalog";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

interface MealPlan {
  id: string;
  store_id: string;
  code: string;
  name: string;
  description?: string;
  hours_from?: string | null;
  hours_to?: string | null;
  price_per_guest_cents: number;
  active: boolean;
  includes?: string[];
}

const PLAN_CODES = [
  { code: "RO", name: "Room Only" },
  { code: "BB", name: "Bed & Breakfast" },
  { code: "HB", name: "Half Board" },
  { code: "FB", name: "Full Board" },
  { code: "AI", name: "All Inclusive" },
];

const blank: Partial<MealPlan> = { code: "BB", name: "Bed & Breakfast", price_per_guest_cents: 0, active: true, includes: [] };

export default function LodgingDiningSection({ storeId }: { storeId: string }) {
  const { list, upsert, remove, toggleActive } = useLodgingCatalog<MealPlan>("lodging_meal_plans", storeId);
  const [editing, setEditing] = useState<Partial<MealPlan> | null>(null);
  const rows = list.data || [];

  const totalActive = rows.filter((r) => r.active !== false).length;
  const avgPrice = rows.length ? rows.reduce((s, r) => s + (r.price_per_guest_cents || 0), 0) / rows.length : 0;

  return (
    <SectionShell title="Dining & Meal Plans" subtitle="Configure board plans (BB/HB/FB/AI), serving hours, and per-guest pricing." icon={Utensils}>
      <LodgingQuickJump active="lodge-dining" />
      <LodgingSectionStatusBanner title="Dining & Meal Plans" icon={Utensils} countLabel="Active meal plans" countValue={totalActive} fixLabel="Open rate plans" fixTab="lodge-rate-plans" />
      {list.isLoading ? <LoadingPanel /> : <>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Meal plans" value={String(rows.length)} icon={Utensils} />
          <StatCard label="Active" value={String(totalActive)} icon={Utensils} />
          <StatCard label="Avg price / guest" value={money(avgPrice)} icon={Utensils} />
        </div>

        <CatalogTable
          rows={rows}
          isLoading={list.isLoading}
          emptyTitle="No meal plans yet"
          emptyBody="Add Bed & Breakfast, Half Board, Full Board, or All Inclusive plans guests can choose from."
          addLabel="Add meal plan"
          onAddClick={() => setEditing({ ...blank })}
          onEdit={(r) => setEditing(r)}
          onDelete={(id) => remove.mutate(id)}
          onToggleActive={(r) => toggleActive.mutate({ id: r.id, active: r.active === false })}
          columns={[
            { key: "code", label: "Code", className: "w-20", render: (r) => <span className="font-bold">{r.code}</span> },
            { key: "name", label: "Plan", render: (r) => r.name },
            { key: "hours", label: "Hours", className: "w-32", render: (r) => r.hours_from && r.hours_to ? `${r.hours_from}–${r.hours_to}` : "—" },
            { key: "price", label: "Per guest", className: "w-28", render: (r) => money(r.price_per_guest_cents) },
          ]}
        />

        <NextActions actions={[
          { label: "Update room breakfast flags", tab: "lodge-rooms", hint: "Mark which rooms include the breakfast plan." },
          { label: "Add dining add-ons", tab: "lodge-addons", hint: "Create room-service or floating breakfast extras." },
          { label: "Set restaurant hours", tab: "lodge-property", hint: "Publish dining facility hours on the property profile." },
        ]} />

        {editing && (
          <EditorDialog
            open
            onOpenChange={(v) => !v && setEditing(null)}
            title={editing.id ? "Edit meal plan" : "New meal plan"}
            saving={upsert.isPending}
            onSave={() => {
              if (!editing.name?.trim() || !editing.code) return;
              upsert.mutate(editing as MealPlan, { onSuccess: () => setEditing(null) });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Plan code</Label>
                <Select value={editing.code} onValueChange={(code) => {
                  const preset = PLAN_CODES.find((p) => p.code === code);
                  setEditing({ ...editing, code, name: editing.name || preset?.name || code });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLAN_CODES.map((p) => <SelectItem key={p.code} value={p.code}>{p.code} — {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Display name</Label>
                <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Serving from</Label>
                <Input type="time" value={editing.hours_from || ""} onChange={(e) => setEditing({ ...editing, hours_from: e.target.value })} />
              </div>
              <div>
                <Label>Serving to</Label>
                <Input type="time" value={editing.hours_to || ""} onChange={(e) => setEditing({ ...editing, hours_to: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Price per guest (USD)</Label>
                <Input type="number" min={0} step="0.01" value={(editing.price_per_guest_cents || 0) / 100} onChange={(e) => setEditing({ ...editing, price_per_guest_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </div>
              <div className="sm:col-span-2">
                <Label>What's included (one per line)</Label>
                <Textarea rows={3} value={(editing.includes || []).join("\n")} onChange={(e) => setEditing({ ...editing, includes: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description (optional)</Label>
                <Textarea rows={2} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
            </div>
          </EditorDialog>
        )}
      </>}
    </SectionShell>
  );
}
