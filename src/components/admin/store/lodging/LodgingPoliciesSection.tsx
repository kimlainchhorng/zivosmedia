import { useEffect, useState } from "react";
import { ShieldCheck, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingPanel, NextActions, SectionShell, StatCard, money, useLodgingOpsData } from "./LodgingOperationsShared";
import { CatalogTable, EditorDialog } from "./CatalogTable";
import { useLodgingCatalog } from "@/hooks/lodging/useLodgingCatalog";
import { useLodgePropertyProfile } from "@/hooks/lodging/useLodgePropertyProfile";
import { toast } from "sonner";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

interface TaxFee {
  id: string;
  store_id: string;
  name: string;
  fee_type: string;
  basis: string;
  rate_value: number;
  applies_to: string;
  inclusive: boolean;
  active: boolean;
}

const FEE_TYPES = ["tax", "service_charge", "resort_fee", "city_tax", "tourism_tax"];
const BASES = ["percent", "per_night", "per_stay", "per_guest", "per_guest_per_night"];
const APPLIES = ["room", "room_and_addons", "total"];
const blank: Partial<TaxFee> = { name: "VAT", fee_type: "tax", basis: "percent", rate_value: 10, applies_to: "room", inclusive: false, active: true };

const CANCEL_PRESETS = [
  { value: "flexible", label: "Flexible (free until 24h before)" },
  { value: "moderate", label: "Moderate (free until 5 days before)" },
  { value: "strict", label: "Strict (50% refund until 7 days before)" },
  { value: "non_refundable", label: "Non-refundable" },
];

type Jsonish = Record<string, unknown>;
const asObj = (v: unknown): Jsonish => (v && typeof v === "object" && !Array.isArray(v) ? (v as Jsonish) : {});
const asStr = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : v == null ? fallback : String(v));

export default function LodgingPoliciesSection({ storeId }: { storeId: string }) {
  const opsData = useLodgingOpsData(storeId);
  const profileQ = useLodgePropertyProfile(storeId);
  const taxes = useLodgingCatalog<TaxFee>("lodging_taxes_fees", storeId);
  const [editing, setEditing] = useState<Partial<TaxFee> | null>(null);
  const [policyDraft, setPolicyDraft] = useState<{
    cancellation_policy: string;
    deposit_percent: number;
    child_policy: string;
    pet_policy: string;
    smoking_policy: string;
    quiet_hours_from: string;
    quiet_hours_to: string;
    parties_allowed: boolean;
  }>({
    cancellation_policy: "flexible",
    deposit_percent: 0,
    child_policy: "",
    pet_policy: "",
    smoking_policy: "non_smoking",
    quiet_hours_from: "22:00",
    quiet_hours_to: "07:00",
    parties_allowed: false,
  });

  useEffect(() => {
    const p = profileQ.data;
    if (!p) return;
    const houseRules = asObj((p as { house_rules?: unknown }).house_rules);
    const childPolicy = asObj((p as { child_policy?: unknown }).child_policy);
    const petPolicy = asObj((p as { pet_policy?: unknown }).pet_policy);
    setPolicyDraft({
      cancellation_policy: asStr((p as { cancellation_policy?: unknown }).cancellation_policy, "flexible"),
      deposit_percent: Number((p as { deposit_percent?: unknown }).deposit_percent ?? 0) || 0,
      child_policy: asStr(childPolicy.text, ""),
      pet_policy: asStr(petPolicy.text, ""),
      smoking_policy: asStr(houseRules.smoking_policy, "non_smoking"),
      quiet_hours_from: asStr(houseRules.quiet_hours_from, "22:00"),
      quiet_hours_to: asStr(houseRules.quiet_hours_to, "07:00"),
      parties_allowed: Boolean(houseRules.parties_allowed),
    });
  }, [profileQ.data]);

  const handleSavePolicies = async () => {
    const existingHouseRules = asObj((profileQ.data as { house_rules?: unknown } | null | undefined)?.house_rules);
    try {
      await profileQ.upsert.mutateAsync({
        cancellation_policy: policyDraft.cancellation_policy,
        deposit_percent: policyDraft.deposit_percent,
        child_policy: { text: policyDraft.child_policy } as never,
        pet_policy: { text: policyDraft.pet_policy } as never,
        house_rules: {
          ...existingHouseRules,
          smoking_policy: policyDraft.smoking_policy,
          quiet_hours_from: policyDraft.quiet_hours_from,
          quiet_hours_to: policyDraft.quiet_hours_to,
          parties_allowed: policyDraft.parties_allowed,
        } as never,
      });
      toast.success("Policies saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };


  const taxRows = taxes.list.data || [];
  const isLoading = opsData.isLoading || profileQ.isLoading || taxes.list.isLoading;

  return (
    <SectionShell title="Policies & Rules" subtitle="Cancellation, deposits, child & pet policies, smoking, quiet hours, and tax/fee setup." icon={ShieldCheck}>
      <LodgingQuickJump active="lodge-policies" />
      <LodgingSectionStatusBanner title="Policies & Rules" icon={ShieldCheck} countLabel="Active taxes & fees" countValue={taxRows.filter((r) => r.active !== false).length} fixLabel="Open Amenities" fixTab="lodge-amenities" />
      {isLoading ? <LoadingPanel /> : <>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Active taxes/fees" value={String(taxRows.filter((r) => r.active !== false).length)} icon={ShieldCheck} />
          <StatCard label="Cancellation" value={(policyDraft.cancellation_policy || "—").replace(/_/g, " ")} icon={ShieldCheck} />
          <StatCard label="Deposit %" value={`${policyDraft.deposit_percent || 0}%`} icon={ShieldCheck} />
        </div>

        {/* House policies editor */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold">House policies</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Cancellation policy</Label>
              <Select value={policyDraft.cancellation_policy} onValueChange={(v) => setPolicyDraft({ ...policyDraft, cancellation_policy: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CANCEL_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Deposit (%)</Label>
              <Input type="number" min={0} max={100} value={policyDraft.deposit_percent || 0} onChange={(e) => setPolicyDraft({ ...policyDraft, deposit_percent: parseInt(e.target.value || "0", 10) })} />
            </div>
            <div>
              <Label>Child policy</Label>
              <Textarea rows={2} value={policyDraft.child_policy} onChange={(e) => setPolicyDraft({ ...policyDraft, child_policy: e.target.value })} placeholder="Children under 6 stay free; cribs available on request." />
            </div>
            <div>
              <Label>Pet policy</Label>
              <Textarea rows={2} value={policyDraft.pet_policy} onChange={(e) => setPolicyDraft({ ...policyDraft, pet_policy: e.target.value })} placeholder="No pets / Pets allowed (max 1, $20/night)" />
            </div>
            <div>
              <Label>Smoking</Label>
              <Select value={policyDraft.smoking_policy} onValueChange={(v) => setPolicyDraft({ ...policyDraft, smoking_policy: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_smoking">Non-smoking property</SelectItem>
                  <SelectItem value="designated_areas">Designated areas only</SelectItem>
                  <SelectItem value="smoking_allowed">Smoking allowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label>Quiet hours from</Label>
                <Input type="time" value={policyDraft.quiet_hours_from} onChange={(e) => setPolicyDraft({ ...policyDraft, quiet_hours_from: e.target.value })} />
              </div>
              <div className="flex-1">
                <Label>to</Label>
                <Input type="time" value={policyDraft.quiet_hours_to} onChange={(e) => setPolicyDraft({ ...policyDraft, quiet_hours_to: e.target.value })} />
              </div>
            </div>
            <label className="sm:col-span-2 flex items-center gap-3 rounded-md border border-border p-3">
              <Switch checked={policyDraft.parties_allowed} onCheckedChange={(v) => setPolicyDraft({ ...policyDraft, parties_allowed: v })} />
              <span className="text-sm">Parties / events allowed</span>
            </label>
          </div>
          <Button size="sm" onClick={handleSavePolicies} disabled={profileQ.upsert.isPending}>
            <Save className="mr-1.5 h-4 w-4" /> {profileQ.upsert.isPending ? "Saving…" : "Save policies"}
          </Button>
        </div>

        {/* Taxes & fees */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Taxes & fees</p>
            <span className="text-xs text-muted-foreground">{taxRows.length} item{taxRows.length === 1 ? "" : "s"}</span>
          </div>
          <CatalogTable
            rows={taxRows}
            isLoading={taxes.list.isLoading}
            emptyTitle="No taxes or fees configured"
            emptyBody="Add VAT, tourism tax, service charge, or resort fees that apply to bookings."
            addLabel="Add tax / fee"
            onAddClick={() => setEditing({ ...blank })}
            onEdit={(r) => setEditing(r)}
            onDelete={(id) => taxes.remove.mutate(id)}
            onToggleActive={(r) => taxes.toggleActive.mutate({ id: r.id, active: r.active === false })}
            columns={[
              { key: "name", label: "Name", render: (r) => <><span className="font-semibold">{r.name}</span><p className="text-xs text-muted-foreground capitalize">{r.fee_type.replace(/_/g, " ")}</p></> },
              { key: "rate", label: "Rate", className: "w-32", render: (r) => r.basis === "percent" ? `${r.rate_value}%` : `${money(Math.round(r.rate_value * 100))} ${r.basis.replace(/_/g, " ")}` },
              { key: "applies", label: "Applies to", className: "w-32", render: (r) => r.applies_to.replace(/_/g, " ") },
              { key: "inclusive", label: "Inclusive", className: "w-20", render: (r) => r.inclusive ? "Yes" : "No" },
            ]}
          />
        </div>

        <NextActions actions={[
          { label: "Update property profile", tab: "lodge-property", hint: "Add contact info, ID requirements, and Wi-Fi details." },
          { label: "Edit amenities & services", tab: "lodge-amenities", hint: "Mark parking, internet, and other extras." },
          { label: "Review reservations", tab: "lodge-reservations", hint: "Verify policies are visible on bookings." },
        ]} />

        {editing && (
          <EditorDialog
            open
            onOpenChange={(v) => !v && setEditing(null)}
            title={editing.id ? "Edit tax / fee" : "New tax / fee"}
            saving={taxes.upsert.isPending}
            onSave={() => {
              if (!editing.name?.trim()) return;
              taxes.upsert.mutate(editing as TaxFee, { onSuccess: () => setEditing(null) });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="VAT 10%" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={editing.fee_type} onValueChange={(v) => setEditing({ ...editing, fee_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FEE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Basis</Label>
                <Select value={editing.basis} onValueChange={(v) => setEditing({ ...editing, basis: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BASES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rate / amount</Label>
                <Input type="number" min={0} step="0.01" value={editing.rate_value || 0} onChange={(e) => setEditing({ ...editing, rate_value: parseFloat(e.target.value || "0") })} />
                <p className="mt-1 text-xs text-muted-foreground">{editing.basis === "percent" ? "Enter as percent (e.g. 10 = 10%)" : "Enter currency amount"}</p>
              </div>
              <div>
                <Label>Applies to</Label>
                <Select value={editing.applies_to} onValueChange={(v) => setEditing({ ...editing, applies_to: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{APPLIES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <label className="sm:col-span-2 flex items-center gap-3 rounded-md border border-border p-3">
                <Switch checked={Boolean(editing.inclusive)} onCheckedChange={(v) => setEditing({ ...editing, inclusive: v })} />
                <span className="text-sm">Already included in displayed price</span>
              </label>
            </div>
          </EditorDialog>
        )}
      </>}
    </SectionShell>
  );
}
