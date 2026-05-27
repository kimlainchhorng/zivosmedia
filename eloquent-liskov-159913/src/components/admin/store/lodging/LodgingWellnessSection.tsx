import { useState } from "react";
import { HeartPulse } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingPanel, NextActions, SectionShell, StatCard, money } from "./LodgingOperationsShared";
import { CatalogTable, EditorDialog } from "./CatalogTable";
import { useLodgingCatalog } from "@/hooks/lodging/useLodgingCatalog";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

interface WellnessService {
  id: string;
  store_id: string;
  name: string;
  service_type: string;
  description?: string;
  duration_minutes: number;
  price_cents: number;
  therapist?: string;
  room_location?: string;
  hours_from?: string | null;
  hours_to?: string | null;
  lead_time_minutes: number;
  active: boolean;
}

const TYPES = ["spa", "massage", "yoga", "sauna", "gym", "pool", "treatment", "facial", "manicure"];
const blank: Partial<WellnessService> = { service_type: "massage", duration_minutes: 60, price_cents: 0, lead_time_minutes: 60, active: true };

export default function LodgingWellnessSection({ storeId }: { storeId: string }) {
  const { list, upsert, remove, toggleActive } = useLodgingCatalog<WellnessService>("lodging_wellness_services", storeId);
  const [editing, setEditing] = useState<Partial<WellnessService> | null>(null);
  const rows = list.data || [];

  return (
    <SectionShell title="Spa & Wellness" subtitle="Massage, spa, yoga, sauna, gym, and pool services with booking lead-time." icon={HeartPulse}>
      <LodgingQuickJump active="lodge-wellness" />
      <LodgingSectionStatusBanner title="Spa & Wellness" icon={HeartPulse} countLabel="Active services" countValue={rows.filter((r) => r.active !== false).length} fixLabel="Open amenities" fixTab="lodge-amenities" />
      {list.isLoading ? <LoadingPanel /> : <>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Services" value={String(rows.length)} icon={HeartPulse} />
          <StatCard label="Active" value={String(rows.filter((r) => r.active !== false).length)} icon={HeartPulse} />
          <StatCard label="Avg price" value={money(rows.length ? rows.reduce((s, r) => s + (r.price_cents || 0), 0) / rows.length : 0)} icon={HeartPulse} />
        </div>

        <CatalogTable
          rows={rows}
          isLoading={list.isLoading}
          emptyTitle="No wellness services yet"
          emptyBody="Add spa massage, couples massage, yoga sessions, sauna access, pool passes, or wellness packages."
          addLabel="Add service"
          onAddClick={() => setEditing({ ...blank })}
          onEdit={(r) => setEditing(r)}
          onDelete={(id) => remove.mutate(id)}
          onToggleActive={(r) => toggleActive.mutate({ id: r.id, active: r.active === false })}
          columns={[
            { key: "name", label: "Service", render: (r) => <><span className="font-semibold">{r.name}</span><p className="text-xs text-muted-foreground capitalize">{r.service_type} · {r.therapist || "Any therapist"}</p></> },
            { key: "duration", label: "Duration", className: "w-24", render: (r) => `${r.duration_minutes} min` },
            { key: "lead", label: "Lead time", className: "w-24", render: (r) => `${r.lead_time_minutes} min` },
            { key: "price", label: "Price", className: "w-24", render: (r) => money(r.price_cents) },
          ]}
        />

        <NextActions actions={[
          { label: "Update facilities", tab: "lodge-property", hint: "Mark spa, pool, gym, and sauna facilities." },
          { label: "Track wellness requests", tab: "lodge-guest-requests", hint: "Review service requests from in-house guests." },
          { label: "Add room packages", tab: "lodge-rooms", hint: "Bundle wellness services into stay packages." },
        ]} />

        {editing && (
          <EditorDialog
            open
            onOpenChange={(v) => !v && setEditing(null)}
            title={editing.id ? "Edit service" : "New wellness service"}
            saving={upsert.isPending}
            onSave={() => {
              if (!editing.name?.trim()) return;
              upsert.mutate(editing as WellnessService, { onSuccess: () => setEditing(null) });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Couples Khmer Traditional Massage" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={editing.service_type} onValueChange={(v) => setEditing({ ...editing, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" min={15} step={15} value={editing.duration_minutes || 60} onChange={(e) => setEditing({ ...editing, duration_minutes: parseInt(e.target.value || "0", 10) })} />
              </div>
              <div>
                <Label>Price (USD)</Label>
                <Input type="number" min={0} step="0.01" value={(editing.price_cents || 0) / 100} onChange={(e) => setEditing({ ...editing, price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </div>
              <div>
                <Label>Lead time (min)</Label>
                <Input type="number" min={0} step={15} value={editing.lead_time_minutes || 0} onChange={(e) => setEditing({ ...editing, lead_time_minutes: parseInt(e.target.value || "0", 10) })} />
              </div>
              <div>
                <Label>Therapist</Label>
                <Input value={editing.therapist || ""} onChange={(e) => setEditing({ ...editing, therapist: e.target.value })} />
              </div>
              <div>
                <Label>Room / Location</Label>
                <Input value={editing.room_location || ""} onChange={(e) => setEditing({ ...editing, room_location: e.target.value })} placeholder="Spa Room 1" />
              </div>
              <div>
                <Label>Hours from</Label>
                <Input type="time" value={editing.hours_from || ""} onChange={(e) => setEditing({ ...editing, hours_from: e.target.value })} />
              </div>
              <div>
                <Label>Hours to</Label>
                <Input type="time" value={editing.hours_to || ""} onChange={(e) => setEditing({ ...editing, hours_to: e.target.value })} />
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
