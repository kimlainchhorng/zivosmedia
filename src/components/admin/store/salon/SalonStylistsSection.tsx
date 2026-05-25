/**
 * SalonStylistsSection — manage the salon's team and the services each
 * stylist can perform. Bookings will use service_ids to filter which
 * stylists can take a given appointment.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  UserCog, Plus, Edit, Trash2, Loader2, AlertCircle, Copy, Check,
  Eye, EyeOff, Search, Mail, Phone, Percent,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  useSalonStylists,
  type SalonStylist,
  type SalonStylistDraft,
} from "@/hooks/salon/useSalonStylists";
import { useSalonServices } from "@/hooks/salon/useSalonServices";

interface SalonStylistsSectionProps {
  storeId: string;
}

const EMPTY_DRAFT: SalonStylistDraft = {
  display_name: "",
  title: "",
  bio: "",
  photo_url: null,
  email: "",
  phone: "",
  commission_percent: 0,
  user_id: null,
  is_active: true,
  service_ids: [],
};

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function SalonStylistsSection({ storeId }: SalonStylistsSectionProps) {
  const { stylists, loading, saving, error, create, update, remove } = useSalonStylists(storeId);
  const { services, loading: servicesLoading } = useSalonServices(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalonStylistDraft>(EMPTY_DRAFT);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const serviceById = useMemo(() => {
    const m: Record<string, string> = {};
    services.forEach((s) => { m[s.id] = s.name; });
    return m;
  }, [services]);

  const openAdd = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setDialogOpen(true);
  };

  const openEdit = (st: SalonStylist) => {
    setEditingId(st.id);
    setDraft({
      display_name: st.display_name,
      title: st.title ?? "",
      bio: st.bio ?? "",
      photo_url: st.photo_url,
      email: st.email ?? "",
      phone: st.phone ?? "",
      commission_percent: st.commission_percent,
      user_id: st.user_id,
      is_active: st.is_active,
      service_ids: st.service_ids,
    });
    setDialogOpen(true);
  };

  const toggleServiceInDraft = (serviceId: string) => {
    setDraft((d) => ({
      ...d,
      service_ids: d.service_ids.includes(serviceId)
        ? d.service_ids.filter((id) => id !== serviceId)
        : [...d.service_ids, serviceId],
    }));
  };

  const handleSave = async () => {
    const cleanName = draft.display_name.trim();
    if (cleanName.length < 1) {
      toast.error("Stylist name is required.");
      return;
    }
    if (draft.commission_percent < 0 || draft.commission_percent > 100) {
      toast.error("Commission must be 0–100%.");
      return;
    }
    const payload: SalonStylistDraft = { ...draft, display_name: cleanName };

    if (editingId) {
      await update(editingId, payload);
      toast.success("Stylist updated.");
    } else {
      const created = await create(payload);
      if (created) toast.success("Stylist added.");
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    await remove(confirmDeleteId);
    setConfirmDeleteId(null);
    toast.success("Stylist removed.");
  };

  const filtered = stylists.filter((s) =>
    !search ||
    s.display_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="h-5 w-5 text-primary" />
            Stylists & Specialists
          </CardTitle>
          <Button onClick={openAdd} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add stylist
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.length === 0 && !servicesLoading && (
            <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/8 p-3 text-xs text-amber-700 dark:text-amber-300">
              You don't have any services yet. Add services first so you can assign them to stylists.
            </div>
          )}

          {stylists.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or title…"
                className="pl-9"
              />
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading stylists…
            </div>
          ) : stylists.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <UserCog className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">No stylists yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add the people who perform services. Each stylist can be assigned to specific services.
              </p>
              <Button onClick={openAdd} size="sm" className="mt-4 gap-1.5">
                <Plus className="h-4 w-4" /> Add your first stylist
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stylists match "{search}".</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((st) => (
                <div
                  key={st.id}
                  className={cn(
                    "rounded-xl border p-3",
                    st.is_active ? "border-border bg-card" : "border-border/60 bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold",
                      st.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {st.photo_url ? (
                        <img src={st.photo_url} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        initialsOf(st.display_name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn("truncate text-sm font-semibold", !st.is_active && "text-muted-foreground")}>
                          {st.display_name}
                        </p>
                        {!st.is_active && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Hidden
                          </span>
                        )}
                      </div>
                      {st.title && <p className="truncate text-xs text-muted-foreground">{st.title}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        {st.commission_percent > 0 && (
                          <span className="inline-flex items-center gap-1"><Percent className="h-3 w-3" /> {st.commission_percent}% commission</span>
                        )}
                        {st.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {st.email}</span>}
                        {st.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {st.phone}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex gap-1">
                        <CopyDayLinkButton stylistId={st.id} />
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => void update(st.id, { is_active: !st.is_active })}
                          disabled={saving}
                          aria-label={st.is_active ? "Hide" : "Show"}
                          title={st.is_active ? "Hide" : "Show"}
                        >
                          {st.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => openEdit(st)}
                          disabled={saving}
                          aria-label="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setConfirmDeleteId(st.id)}
                          disabled={saving}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {st.service_ids.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {st.service_ids.slice(0, 6).map((sid) => (
                        <span key={sid} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                          {serviceById[sid] ?? "Unknown service"}
                        </span>
                      ))}
                      {st.service_ids.length > 6 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          +{st.service_ids.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit stylist" : "Add stylist"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="stName">Name *</Label>
                <Input
                  id="stName"
                  value={draft.display_name}
                  onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                  placeholder="e.g. Sarah Lopez"
                  maxLength={80}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stTitle">Title</Label>
                <Input
                  id="stTitle"
                  value={draft.title ?? ""}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Senior Stylist, Nail Tech…"
                  maxLength={60}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="stEmail">Email</Label>
                <Input
                  id="stEmail"
                  type="email"
                  value={draft.email ?? ""}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  placeholder="sarah@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stPhone">Phone</Label>
                <Input
                  id="stPhone"
                  type="tel"
                  value={draft.phone ?? ""}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stCommission">Commission rate (%)</Label>
              <Input
                id="stCommission"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={draft.commission_percent}
                onChange={(e) => setDraft({ ...draft, commission_percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              />
              <p className="text-xs text-muted-foreground">Default share of service revenue paid to this stylist.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stBio">Bio</Label>
              <Textarea
                id="stBio"
                value={draft.bio ?? ""}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                placeholder="Specialties, experience, certifications…"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Services this stylist can perform</Label>
              {services.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Add services in the Service Menu first, then come back to assign them.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {services.map((svc) => {
                    const active = draft.service_ids.includes(svc.id);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleServiceInDraft(svc.id)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        )}
                      >
                        {svc.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Visible to clients</p>
                <p className="text-xs text-muted-foreground">Turn off for stylists on leave or no longer at the salon.</p>
              </div>
              <Switch
                checked={draft.is_active}
                onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Add stylist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this stylist?</AlertDialogTitle>
            <AlertDialogDescription>
              Past bookings keep their records, but new bookings won't be able to choose this stylist. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep stylist</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Copy the stylist's personal day-view URL — they bookmark it on their phone. */
function CopyDayLinkButton({ stylistId }: { stylistId: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/stylist/${stylistId}` : `/stylist/${stylistId}`;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      aria-label="Copy day-view link"
      title={copied ? "Copied" : "Copy day-view link for this stylist"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard blocked — silent */ }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}
