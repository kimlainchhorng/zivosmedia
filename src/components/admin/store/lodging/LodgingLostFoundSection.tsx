import { useMemo, useState } from "react";
import { Search, PackageCheck, PackageOpen, Truck, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingPanel, NextActions, SectionShell, StatCard } from "./LodgingOperationsShared";
import { CatalogTable, EditorDialog } from "./CatalogTable";
import { useLodgingCatalog } from "@/hooks/lodging/useLodgingCatalog";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import LostFoundPhotoUploader from "./LostFoundPhotoUploader";

interface LostFoundItem {
  id: string;
  store_id: string;
  reservation_id?: string | null;
  item_name: string;
  description?: string | null;
  location_found?: string | null;
  found_by?: string | null;
  finder_contact?: string | null;
  owner_name?: string | null;
  owner_contact?: string | null;
  status: string;
  claimed_at?: string | null;
  photo_url?: string | null;
  notes?: string | null;
  active: boolean;
  created_at?: string;
}

const STATUSES = ["found", "claimed", "shipped", "disposed"];
const blank: Partial<LostFoundItem> = { status: "found", active: true };

export default function LodgingLostFoundSection({ storeId }: { storeId: string }) {
  const { list, upsert, remove, toggleActive } = useLodgingCatalog<LostFoundItem>("lodging_lost_found", storeId);
  const [editing, setEditing] = useState<Partial<LostFoundItem> | null>(null);
  const rows = list.data || [];

  const stats = useMemo(() => ({
    total: rows.length,
    holding: rows.filter((r) => r.status === "found").length,
    claimed: rows.filter((r) => r.status === "claimed").length,
    shipped: rows.filter((r) => r.status === "shipped").length,
  }), [rows]);

  return (
    <SectionShell title="Lost & Found" subtitle="Log items left behind, contact owners, and track claims, shipments, or disposal." icon={Search}>
      <LodgingQuickJump active="lodge-lostfound" />
      <LodgingSectionStatusBanner title="Lost & Found" icon={Search} countLabel="Items holding" countValue={stats.holding} fixLabel="Open Front Desk" fixTab="lodge-frontdesk" />
      {list.isLoading ? <LoadingPanel /> : <>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="All items" value={String(stats.total)} icon={Search} />
          <StatCard label="Holding" value={String(stats.holding)} icon={PackageOpen} />
          <StatCard label="Claimed" value={String(stats.claimed)} icon={PackageCheck} />
          <StatCard label="Shipped" value={String(stats.shipped)} icon={Truck} />
        </div>

        <CatalogTable
          rows={rows}
          isLoading={list.isLoading}
          emptyTitle="No lost-and-found items yet"
          emptyBody="Log forgotten items the moment housekeeping reports them so you can return them to the rightful owner."
          addLabel="Log item"
          onAddClick={() => setEditing({ ...blank })}
          onEdit={(r) => setEditing(r)}
          onDelete={(id) => remove.mutate(id)}
          onToggleActive={(r) => toggleActive.mutate({ id: r.id, active: r.active === false })}
          columns={[
            { key: "photo", label: "Photo", className: "w-14", render: (r) => r.photo_url ? (
	              <img
	                src={r.photo_url}
	                alt={r.item_name}
	                className="h-10 w-10 rounded-md object-cover border border-border"
	                loading="lazy"
	                decoding="async"
	              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-muted-foreground"><ImageIcon className="h-3.5 w-3.5" /></div>
            )},
            { key: "item", label: "Item", render: (r) => (
              <>
                <span className="font-semibold">{r.item_name}</span>
                <p className="text-xs text-muted-foreground">{r.location_found || "—"}{r.found_by ? ` · by ${r.found_by}` : ""}</p>
              </>
            )},
            { key: "owner", label: "Owner", render: (r) => r.owner_name || <span className="text-muted-foreground">Unknown</span> },
            { key: "status", label: "Status", className: "w-28", render: (r) => (
              <Badge variant={r.status === "claimed" || r.status === "shipped" ? "secondary" : r.status === "disposed" ? "outline" : "default"} className="capitalize">{r.status}</Badge>
            )},
            { key: "date", label: "Logged", className: "w-28", render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "—" },
          ]}
        />

        <NextActions actions={[
          { label: "Open housekeeping board", tab: "lodge-housekeeping", hint: "Most lost items are reported during cleaning." },
          { label: "Check guest inbox", tab: "lodge-inbox", hint: "Owners often message asking about their item." },
          { label: "Review reservations", tab: "lodge-reservations", hint: "Look up the previous guest's contact info." },
        ]} />

        {editing && (
          <EditorDialog
            open
            onOpenChange={(v) => !v && setEditing(null)}
            title={editing.id ? "Edit item" : "Log lost item"}
            saving={upsert.isPending}
            onSave={() => {
              if (!editing.item_name?.trim()) return;
              upsert.mutate(editing as LostFoundItem, { onSuccess: () => setEditing(null) });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Item name</Label>
                <Input value={editing.item_name || ""} onChange={(e) => setEditing({ ...editing, item_name: e.target.value })} placeholder="iPhone 15 Pro — black case" />
              </div>
              <div>
                <Label>Location found</Label>
                <Input value={editing.location_found || ""} onChange={(e) => setEditing({ ...editing, location_found: e.target.value })} placeholder="Room 204 nightstand" />
              </div>
              <div>
                <Label>Found by</Label>
                <Input value={editing.found_by || ""} onChange={(e) => setEditing({ ...editing, found_by: e.target.value })} placeholder="Housekeeping — Sokha" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Photo of the item</Label>
                <LostFoundPhotoUploader value={editing.photo_url} onChange={(url) => setEditing({ ...editing, photo_url: url })} storeId={storeId} />
              </div>
              <div>
                <Label>Owner name</Label>
                <Input value={editing.owner_name || ""} onChange={(e) => setEditing({ ...editing, owner_name: e.target.value })} />
              </div>
              <div>
                <Label>Owner contact</Label>
                <Input value={editing.owner_contact || ""} onChange={(e) => setEditing({ ...editing, owner_contact: e.target.value })} placeholder="Phone or email" />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Tracking number, courier, etc." />
              </div>
            </div>
          </EditorDialog>
        )}
      </>}
    </SectionShell>
  );
}
