import { useState } from "react";
import { Car } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingPanel, NextActions, SectionShell, StatCard, money } from "./LodgingOperationsShared";
import { CatalogTable, EditorDialog } from "./CatalogTable";
import { useLodgingCatalog } from "@/hooks/lodging/useLodgingCatalog";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

interface Transfer {
  id: string;
  store_id: string;
  from_location: string;
  to_location: string;
  vehicle_type: string;
  capacity: number;
  one_way_cents: number;
  round_trip_cents: number;
  duration_minutes: number;
  notes?: string;
  active: boolean;
}

const VEHICLES = ["sedan", "suv", "van", "minibus", "boat", "ferry", "scooter", "bicycle", "tuk_tuk"];
const blank: Partial<Transfer> = { from_location: "Airport", to_location: "Property", vehicle_type: "sedan", capacity: 3, one_way_cents: 0, round_trip_cents: 0, duration_minutes: 30, active: true };

export default function LodgingTransportSection({ storeId }: { storeId: string }) {
  const { list, upsert, remove, toggleActive } = useLodgingCatalog<Transfer>("lodging_transfers", storeId);
  const [editing, setEditing] = useState<Partial<Transfer> | null>(null);
  const rows = list.data || [];

  return (
    <SectionShell title="Transport & Transfers" subtitle="Airport, ferry, boat, scooter, and car transfer pricing matrix." icon={Car}>
      <LodgingQuickJump active="lodge-transport" />
      <LodgingSectionStatusBanner title="Transport & Transfers" icon={Car} countLabel="Active routes" countValue={rows.filter((r) => r.active !== false).length} fixLabel="Open Front Desk" fixTab="lodge-frontdesk" />
      {list.isLoading ? <LoadingPanel /> : <>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Transfer routes" value={String(rows.length)} icon={Car} />
          <StatCard label="Active" value={String(rows.filter((r) => r.active !== false).length)} icon={Car} />
          <StatCard label="Vehicle types" value={String(new Set(rows.map((r) => r.vehicle_type)).size)} icon={Car} />
        </div>

        <CatalogTable
          rows={rows}
          isLoading={list.isLoading}
          emptyTitle="No transfers configured"
          emptyBody="Add airport pickup, ferry, boat, scooter, and car-rental routes with one-way and round-trip pricing."
          addLabel="Add transfer"
          onAddClick={() => setEditing({ ...blank })}
          onEdit={(r) => setEditing(r)}
          onDelete={(id) => remove.mutate(id)}
          onToggleActive={(r) => toggleActive.mutate({ id: r.id, active: r.active === false })}
          columns={[
            { key: "route", label: "Route", render: (r) => <><span className="font-semibold">{r.from_location} → {r.to_location}</span><p className="text-xs text-muted-foreground capitalize">{r.vehicle_type.replace(/_/g, " ")} · {r.capacity} pax · {r.duration_minutes} min</p></> },
            { key: "oneway", label: "One-way", className: "w-24", render: (r) => money(r.one_way_cents) },
            { key: "round", label: "Round-trip", className: "w-24", render: (r) => money(r.round_trip_cents) },
          ]}
        />

        <NextActions actions={[
          { label: "Update arrival info", tab: "lodge-property", hint: "Make sure facilities reflect parking, shuttles, and rentals." },
          { label: "Coordinate front desk", tab: "lodge-frontdesk", hint: "Hand off transfers to today's arrivals." },
          { label: "Add transfer add-ons", tab: "lodge-rooms", hint: "Attach transfer prices to specific room packages." },
        ]} />

        {editing && (
          <EditorDialog
            open
            onOpenChange={(v) => !v && setEditing(null)}
            title={editing.id ? "Edit transfer" : "New transfer"}
            saving={upsert.isPending}
            onSave={() => {
              if (!editing.from_location?.trim() || !editing.to_location?.trim()) return;
              upsert.mutate(editing as Transfer, { onSuccess: () => setEditing(null) });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>From</Label>
                <Input value={editing.from_location || ""} onChange={(e) => setEditing({ ...editing, from_location: e.target.value })} placeholder="Sihanoukville Airport" />
              </div>
              <div>
                <Label>To</Label>
                <Input value={editing.to_location || ""} onChange={(e) => setEditing({ ...editing, to_location: e.target.value })} placeholder="Koh Sdach Resort" />
              </div>
              <div>
                <Label>Vehicle</Label>
                <Select value={editing.vehicle_type} onValueChange={(v) => setEditing({ ...editing, vehicle_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VEHICLES.map((v) => <SelectItem key={v} value={v} className="capitalize">{v.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Capacity</Label>
                <Input type="number" min={1} value={editing.capacity || 1} onChange={(e) => setEditing({ ...editing, capacity: parseInt(e.target.value || "0", 10) })} />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" min={5} value={editing.duration_minutes || 30} onChange={(e) => setEditing({ ...editing, duration_minutes: parseInt(e.target.value || "0", 10) })} />
              </div>
              <div />
              <div>
                <Label>One-way price (USD)</Label>
                <Input type="number" min={0} step="0.01" value={(editing.one_way_cents || 0) / 100} onChange={(e) => setEditing({ ...editing, one_way_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </div>
              <div>
                <Label>Round-trip price (USD)</Label>
                <Input type="number" min={0} step="0.01" value={(editing.round_trip_cents || 0) / 100} onChange={(e) => setEditing({ ...editing, round_trip_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Meet driver at arrivals exit, name sign provided" />
              </div>
            </div>
          </EditorDialog>
        )}
      </>}
    </SectionShell>
  );
}
