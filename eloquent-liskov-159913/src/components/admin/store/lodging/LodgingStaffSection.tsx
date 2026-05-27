import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, KeyRound, Sparkles, Wrench, Utensils, HeartPulse, BedDouble, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingPanel, SectionShell, StatCard, NextActions } from "./LodgingOperationsShared";
import { CatalogTable, EditorDialog } from "./CatalogTable";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import { toast } from "sonner";

interface StaffRow {
  id: string;
  store_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  status: string | null;
  lodging_role: string | null;
  shift: string | null;
  active?: boolean;
}

const LODGING_ROLES = [
  { v: "front_desk", label: "Front Desk", icon: KeyRound },
  { v: "housekeeping", label: "Housekeeping", icon: Sparkles },
  { v: "maintenance", label: "Maintenance", icon: Wrench },
  { v: "fnb", label: "F&B / Restaurant", icon: Utensils },
  { v: "spa", label: "Spa & Wellness", icon: HeartPulse },
  { v: "concierge", label: "Concierge", icon: BedDouble },
  { v: "manager", label: "Manager", icon: Briefcase },
];

const SHIFTS = [
  { v: "morning", label: "Morning (6am–2pm)" },
  { v: "afternoon", label: "Afternoon (2pm–10pm)" },
  { v: "night", label: "Night (10pm–6am)" },
  { v: "flex", label: "Flexible" },
];

const blank: Partial<StaffRow> = { status: "active", lodging_role: "front_desk", shift: "morning" };

export default function LodgingStaffSection({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<StaffRow> | null>(null);

  const list = useQuery({
    queryKey: ["lodging_staff", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_employees")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as StaffRow[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<StaffRow>) => {
      const payload: any = { ...row, store_id: storeId };
      const { error } = await (supabase as any).from("store_employees").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Staff member saved");
      qc.invalidateQueries({ queryKey: ["lodging_staff", storeId] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["lodging_staff", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  });

  const rows = list.data || [];
  const byRole = LODGING_ROLES.map((r) => ({
    ...r,
    count: rows.filter((s) => s.lodging_role === r.v).length,
  }));

  return (
    <SectionShell title="Hotel Staff" subtitle="Front desk, housekeeping, F&B, spa, maintenance — assign roles and shifts." icon={Users}>
      <LodgingQuickJump active="lodge-staff" />
      <LodgingSectionStatusBanner title="Hotel Staff" icon={Users} countLabel="Active staff" countValue={rows.filter((s) => (s.status ?? "active") !== "inactive").length} fixLabel="Open Housekeeping" fixTab="lodge-housekeeping" />
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total staff" value={String(rows.length)} icon={Users} />
        <StatCard label="Front desk" value={String(byRole.find((r) => r.v === "front_desk")?.count || 0)} icon={KeyRound} />
        <StatCard label="Housekeeping" value={String(byRole.find((r) => r.v === "housekeeping")?.count || 0)} icon={Sparkles} />
        <StatCard label="Maintenance" value={String(byRole.find((r) => r.v === "maintenance")?.count || 0)} icon={Wrench} />
      </div>

      {list.isLoading ? <LoadingPanel /> : (
        <CatalogTable
          rows={rows.map((r) => ({ ...r, active: r.status !== "inactive" }))}
          isLoading={list.isLoading}
          emptyTitle="No staff yet"
          emptyBody="Add your front desk, housekeeping, and other team members."
          addLabel="Add staff"
          onAddClick={() => setEditing({ ...blank })}
          onEdit={(r) => setEditing(r)}
          onDelete={(id) => remove.mutate(id)}
          onToggleActive={(r) => upsert.mutate({ id: r.id, status: r.status === "inactive" ? "active" : "inactive" } as any)}
          columns={[
            { key: "name", label: "Name", render: (r) => (
              <>
                <span className="font-semibold">{r.name || "—"}</span>
                <p className="text-xs text-muted-foreground">{r.email || r.phone || ""}</p>
              </>
            )},
            { key: "role", label: "Role", className: "w-44", render: (r) => (
              <Badge variant="secondary" className="capitalize">
                {LODGING_ROLES.find((x) => x.v === r.lodging_role)?.label || r.role || "Unassigned"}
              </Badge>
            )},
            { key: "shift", label: "Shift", className: "w-32", render: (r) => (
              <span className="text-xs capitalize">{SHIFTS.find((x) => x.v === r.shift)?.label || "—"}</span>
            )},
          ]}
        />
      )}

      <NextActions actions={[
        { label: "Open Housekeeping", tab: "lodge-housekeeping", hint: "Assign cleaning tasks to your housekeeping staff." },
        { label: "Open Front Desk", tab: "lodge-frontdesk", hint: "Today's check-ins and check-outs." },
        { label: "Payroll & schedule", tab: "payroll", hint: "Manage pay and schedules from the team section." },
      ]} />

      {editing && (
        <EditorDialog
          open
          onOpenChange={(v) => !v && setEditing(null)}
          title={editing.id ? "Edit staff member" : "Add staff member"}
          saving={upsert.isPending}
          onSave={() => upsert.mutate(editing)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Full name</Label>
              <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Jane Doe" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </div>
            <div>
              <Label>Hotel role</Label>
              <Select value={editing.lodging_role || ""} onValueChange={(v) => setEditing({ ...editing, lodging_role: v })}>
                <SelectTrigger><SelectValue placeholder="Pick a role" /></SelectTrigger>
                <SelectContent>{LODGING_ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shift</Label>
              <Select value={editing.shift || ""} onValueChange={(v) => setEditing({ ...editing, shift: v })}>
                <SelectTrigger><SelectValue placeholder="Pick a shift" /></SelectTrigger>
                <SelectContent>{SHIFTS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </EditorDialog>
      )}
    </SectionShell>
  );
}
