import { useState } from "react";
import { Link2, RefreshCw, Copy, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingPanel, NextActions, SectionShell, StatCard } from "./LodgingOperationsShared";
import { CatalogTable, EditorDialog } from "./CatalogTable";
import { useLodgingCatalog } from "@/hooks/lodging/useLodgingCatalog";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import { useLodgeRooms } from "@/hooks/lodging/useLodgeRooms";
import { toast } from "sonner";

interface ChannelConn {
  id: string;
  store_id: string;
  room_id?: string | null;
  channel: string;
  display_name?: string | null;
  ical_import_url?: string | null;
  ical_export_token: string;
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  last_sync_error?: string | null;
  events_imported: number;
  active: boolean;
}

const CHANNELS = [
  { v: "booking_com", label: "Booking.com" },
  { v: "expedia", label: "Expedia" },
  { v: "airbnb", label: "Airbnb" },
  { v: "agoda", label: "Agoda" },
  { v: "vrbo", label: "Vrbo" },
  { v: "custom", label: "Custom iCal" },
];
const blank: Partial<ChannelConn> = { channel: "booking_com", active: true, events_imported: 0 };

export default function LodgingChannelManagerSection({ storeId }: { storeId: string }) {
  const { list, upsert, remove, toggleActive } = useLodgingCatalog<ChannelConn>("lodging_channel_connections", storeId);
  const { data: rooms = [] } = useLodgeRooms(storeId);
  const [editing, setEditing] = useState<Partial<ChannelConn> | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const qc = useQueryClient();
  const rows = list.data || [];

  const projectRef = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
  const exportBase = `https://${projectRef}.supabase.co/functions/v1/lodging-ical-export?token=`;

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("lodging-ical-import", { body: { connection_id: id } });
      if (error) throw error;
      const r = data?.results?.[0];
      if (r?.ok) toast.success(`Synced — ${r.events} blocks imported`);
      else toast.error(r?.error || "Sync failed");
      qc.invalidateQueries({ queryKey: ["lodging_channel_connections", storeId] });
    } catch (e: any) {
      toast.error(e?.message || "Sync failed");
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <SectionShell title="Channel Manager" subtitle="Sync availability with Booking.com, Expedia, Airbnb, and Agoda using iCal import/export." icon={Link2}>
      <LodgingQuickJump active="lodge-channels" />
      <LodgingSectionStatusBanner title="Channel Manager" icon={Link2} countLabel="Active connections" countValue={rows.filter((r) => r.active !== false).length} fixLabel="Open rooms" fixTab="lodge-rooms" />
      {list.isLoading ? <LoadingPanel /> : <>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Connections" value={String(rows.length)} icon={Link2} />
          <StatCard label="Active" value={String(rows.filter((r) => r.active !== false).length)} icon={CheckCircle2} />
          <StatCard label="Events imported" value={String(rows.reduce((s, r) => s + (r.events_imported || 0), 0))} icon={RefreshCw} />
          <StatCard label="With errors" value={String(rows.filter((r) => r.last_sync_status === "error").length)} icon={AlertCircle} />
        </div>

        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">How it works: </strong>
          For each external channel (Booking.com, Airbnb, etc.) paste the iCal URL they provide into <em>iCal import URL</em>. We pull blocked dates every 30 minutes. Use the <em>iCal export URL</em> below to publish your Zivo calendar back to those channels so they don't double-book.
        </div>

        <CatalogTable
          rows={rows}
          isLoading={list.isLoading}
          emptyTitle="No channel connections yet"
          emptyBody="Connect Booking.com, Expedia, Airbnb, Agoda, or any iCal-compatible channel."
          addLabel="Connect channel"
          onAddClick={() => setEditing({ ...blank })}
          onEdit={(r) => setEditing(r)}
          onDelete={(id) => remove.mutate(id)}
          onToggleActive={(r) => toggleActive.mutate({ id: r.id, active: r.active === false })}
          columns={[
            { key: "channel", label: "Channel", render: (r) => (
              <>
                <span className="font-semibold">{CHANNELS.find((c) => c.v === r.channel)?.label || r.channel}</span>
                <p className="text-xs text-muted-foreground">{rooms.find((rm) => rm.id === r.room_id)?.name || "All rooms"}</p>
              </>
            )},
            { key: "status", label: "Last sync", className: "w-40", render: (r) => (
              <div className="space-y-1">
                <Badge variant={r.last_sync_status === "ok" ? "secondary" : r.last_sync_status === "error" ? "destructive" : "outline"} className="capitalize">
                  {r.last_sync_status || "pending"}
                </Badge>
                <p className="text-xs text-muted-foreground">{r.last_sync_at ? new Date(r.last_sync_at).toLocaleString() : "Never"}</p>
              </div>
            )},
            { key: "events", label: "Events", className: "w-20", render: (r) => String(r.events_imported || 0) },
            { key: "export", label: "Export URL", render: (r) => (
              <button type="button"
                className="flex items-center gap-1.5 truncate text-xs text-primary hover:underline"
                onClick={() => {
                  navigator.clipboard.writeText(`${exportBase}${r.ical_export_token}`);
                  toast.success("Copied iCal URL");
                }}
              >
                <Copy className="h-3 w-3" /> Copy iCal URL
              </button>
            )},
            { key: "sync", label: "Sync", className: "w-24", render: (r) => (
              <Button
                size="sm"
                variant="outline"
                disabled={!r.ical_import_url || syncingId === r.id}
                onClick={() => handleSync(r.id)}
              >
                {syncingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCw className="mr-1 h-3 w-3" />Sync</>}
              </Button>
            )},
          ]}
        />

        <NextActions actions={[
          { label: "Open availability calendar", tab: "lodge-calendar", hint: "Verify imported blocks show up correctly." },
          { label: "Update room inventory", tab: "lodge-rooms", hint: "Make sure room IDs match your channel listings." },
          { label: "Review reservations", tab: "lodge-reservations", hint: "Confirm channel-imported bookings are visible." },
        ]} />

        {editing && (
          <EditorDialog
            open
            onOpenChange={(v) => !v && setEditing(null)}
            title={editing.id ? "Edit channel connection" : "Connect channel"}
            saving={upsert.isPending}
            onSave={() => {
              upsert.mutate(editing as ChannelConn, { onSuccess: () => setEditing(null) });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Channel</Label>
                <Select value={editing.channel} onValueChange={(v) => setEditing({ ...editing, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNELS.map((c) => <SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Room (optional)</Label>
                <Select value={editing.room_id || "_all"} onValueChange={(v) => setEditing({ ...editing, room_id: v === "_all" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="All rooms" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All rooms (property-level)</SelectItem>
                    {rooms.map((rm) => <SelectItem key={rm.id} value={rm.id}>{rm.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Display name (optional)</Label>
                <Input value={editing.display_name || ""} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} placeholder="Booking.com — Deluxe Sea View" />
              </div>
              <div className="sm:col-span-2">
                <Label>iCal import URL (from {CHANNELS.find((c) => c.v === editing.channel)?.label || "channel"})</Label>
                <Input value={editing.ical_import_url || ""} onChange={(e) => setEditing({ ...editing, ical_import_url: e.target.value })} placeholder="https://admin.booking.com/hotel/.../calendar.ics?t=..." />
                <p className="mt-1 text-xs text-muted-foreground">Get this from the channel's "Sync calendar" or "iCal export" settings.</p>
              </div>
            </div>
          </EditorDialog>
        )}
      </>}
    </SectionShell>
  );
}
