import { useState } from "react";
import { Palmtree } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingPanel, NextActions, SectionShell, StatCard, money } from "./LodgingOperationsShared";
import { CatalogTable, EditorDialog } from "./CatalogTable";
import { useLodgingCatalog } from "@/hooks/lodging/useLodgingCatalog";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

interface Experience {
  id: string;
  store_id: string;
  name: string;
  experience_type: string;
  description?: string;
  duration_minutes: number;
  price_cents: number;
  capacity: number;
  meeting_point?: string;
  photo_url?: string;
  active: boolean;
  included?: string[];
  excluded?: string[];
}

const TYPES = ["tour", "cruise", "fishing", "snorkeling", "island", "sunset", "cooking", "cultural", "adventure", "custom"];
const blank: Partial<Experience> = { experience_type: "tour", duration_minutes: 120, price_cents: 0, capacity: 10, active: true };

export default function LodgingExperiencesSection({ storeId }: { storeId: string }) {
  const { list, upsert, remove, toggleActive } = useLodgingCatalog<Experience>("lodging_experiences", storeId);
  const [editing, setEditing] = useState<Partial<Experience> | null>(null);
  const rows = list.data || [];

  return (
    <SectionShell title="Experiences & Tours" subtitle="Sell snorkeling, island hopping, fishing trips, sunset cruises, and destination experiences." icon={Palmtree}>
      <LodgingQuickJump active="lodge-experiences" />
      <LodgingSectionStatusBanner title="Experiences & Tours" icon={Palmtree} countLabel="Active experiences" countValue={rows.filter((r) => r.active !== false).length} fixLabel="Open gallery" fixTab="lodge-gallery" />
      {list.isLoading ? <LoadingPanel /> : <>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Total" value={String(rows.length)} icon={Palmtree} />
          <StatCard label="Active" value={String(rows.filter((r) => r.active !== false).length)} icon={Palmtree} />
          <StatCard label="Total capacity" value={String(rows.reduce((s, r) => s + (r.capacity || 0), 0))} icon={Palmtree} />
        </div>

        <CatalogTable
          rows={rows}
          isLoading={list.isLoading}
          emptyTitle="No experiences yet"
          emptyBody="Add tours, cruises, snorkeling, fishing, sunset trips, and destination packages."
          addLabel="Add experience"
          onAddClick={() => setEditing({ ...blank })}
          onEdit={(r) => setEditing(r)}
          onDelete={(id) => remove.mutate(id)}
          onToggleActive={(r) => toggleActive.mutate({ id: r.id, active: r.active === false })}
          columns={[
            { key: "name", label: "Experience", render: (r) => <><span className="font-semibold">{r.name}</span><p className="text-xs text-muted-foreground capitalize">{r.experience_type}</p></> },
            { key: "duration", label: "Duration", className: "w-24", render: (r) => `${r.duration_minutes} min` },
            { key: "capacity", label: "Capacity", className: "w-24", render: (r) => `${r.capacity} pax` },
            { key: "price", label: "Price", className: "w-24", render: (r) => money(r.price_cents) },
          ]}
        />

        <NextActions actions={[
          { label: "Promote in property profile", tab: "lodge-property", hint: "Highlight signature experiences in the property summary." },
          { label: "Add to room packages", tab: "lodge-rooms", hint: "Bundle experiences with rooms as add-ons." },
          { label: "Track guest requests", tab: "lodge-guest-requests", hint: "Watch experience demand from booked guests." },
        ]} />

        {editing && (
          <EditorDialog
            open
            onOpenChange={(v) => !v && setEditing(null)}
            title={editing.id ? "Edit experience" : "New experience"}
            saving={upsert.isPending}
            onSave={() => {
              if (!editing.name?.trim()) return;
              upsert.mutate(editing as Experience, { onSuccess: () => setEditing(null) });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Sunset cruise to Bamboo Island" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={editing.experience_type} onValueChange={(v) => setEditing({ ...editing, experience_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" min={15} step={15} value={editing.duration_minutes || 60} onChange={(e) => setEditing({ ...editing, duration_minutes: parseInt(e.target.value || "0", 10) })} />
              </div>
              <div>
                <Label>Capacity (guests)</Label>
                <Input type="number" min={1} value={editing.capacity || 10} onChange={(e) => setEditing({ ...editing, capacity: parseInt(e.target.value || "0", 10) })} />
              </div>
              <div>
                <Label>Price (USD)</Label>
                <Input type="number" min={0} step="0.01" value={(editing.price_cents || 0) / 100} onChange={(e) => setEditing({ ...editing, price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Meeting point</Label>
                <Input value={editing.meeting_point || ""} onChange={(e) => setEditing({ ...editing, meeting_point: e.target.value })} placeholder="Lobby / dock / pier" />
              </div>
              <div className="sm:col-span-2">
                <Label>Photo URL</Label>
                <Input value={editing.photo_url || ""} onChange={(e) => setEditing({ ...editing, photo_url: e.target.value })} placeholder="https://…" />
              </div>
              <div>
                <Label>Included (one per line)</Label>
                <Textarea rows={3} value={(editing.included || []).join("\n")} onChange={(e) => setEditing({ ...editing, included: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
              </div>
              <div>
                <Label>Excluded (one per line)</Label>
                <Textarea rows={3} value={(editing.excluded || []).join("\n")} onChange={(e) => setEditing({ ...editing, excluded: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
            </div>
          </EditorDialog>
        )}
      </>}
    </SectionShell>
  );
}
