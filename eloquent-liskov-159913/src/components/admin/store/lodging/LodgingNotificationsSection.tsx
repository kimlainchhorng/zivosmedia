/**
 * Lodging — Guest Notification Templates.
 * Email/SMS templates for booking confirmation, pre-check-in, on-checkout, review request, etc.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Bell, Plus, Pencil, Trash2, Mail, MessageSquare, Eye } from "lucide-react";
import { toast } from "sonner";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

type TriggerType = "on_booking" | "pre_checkin" | "on_checkin" | "pre_checkout" | "on_checkout" | "review_request" | "custom";
type Channel = "email" | "sms" | "whatsapp";

interface Template {
  id: string;
  trigger_type: TriggerType;
  channel: Channel;
  subject: string | null;
  body: string;
  send_hours_before: number | null;
  is_active: boolean;
}

const TRIGGER_LABEL: Record<TriggerType, string> = {
  on_booking: "On booking confirmation",
  pre_checkin: "Pre check-in reminder",
  on_checkin: "On check-in",
  pre_checkout: "Pre check-out reminder",
  on_checkout: "On check-out / Farewell",
  review_request: "Review request",
  custom: "Custom / Manual",
};

const CHANNEL_ICON: Record<Channel, any> = { email: Mail, sms: MessageSquare, whatsapp: MessageSquare };
const CHANNEL_COLOR: Record<Channel, string> = {
  email: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  sms: "bg-green-500/10 text-green-700 border-green-500/20",
  whatsapp: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

const VARIABLES = [
  "{guest_name}", "{room_number}", "{check_in}", "{check_out}",
  "{nights}", "{hotel_name}", "{reservation_number}", "{total_amount}",
];

const PRESETS: Partial<Template>[] = [
  {
    trigger_type: "on_booking",
    channel: "email",
    subject: "Your reservation at {hotel_name} is confirmed!",
    body: "Dear {guest_name},\n\nThank you for your reservation at {hotel_name}.\n\nReservation: #{reservation_number}\nRoom: {room_number}\nCheck-in: {check_in}\nCheck-out: {check_out} ({nights} nights)\nTotal: {total_amount}\n\nWe look forward to welcoming you!\n\nWarm regards,\n{hotel_name}",
    is_active: true,
  },
  {
    trigger_type: "pre_checkin",
    channel: "email",
    subject: "Your stay at {hotel_name} is coming up!",
    body: "Dear {guest_name},\n\nWe're looking forward to your arrival on {check_in}.\n\nCheck-in starts at 14:00. Please bring a valid ID.\n\nIf you have any special requests, reply to this email.\n\nSee you soon!\n{hotel_name}",
    send_hours_before: 48,
    is_active: true,
  },
  {
    trigger_type: "on_checkout",
    channel: "email",
    subject: "Thank you for staying at {hotel_name}",
    body: "Dear {guest_name},\n\nThank you for staying with us from {check_in} to {check_out}.\n\nWe hope you had a wonderful experience and look forward to welcoming you back.\n\nWarm regards,\n{hotel_name}",
    is_active: true,
  },
  {
    trigger_type: "review_request",
    channel: "email",
    subject: "How was your stay at {hotel_name}?",
    body: "Dear {guest_name},\n\nThank you for choosing {hotel_name} for your recent stay ({check_in}–{check_out}).\n\nWe would love to hear your feedback. A quick review helps us improve and helps future guests.\n\nThank you!\n{hotel_name}",
    send_hours_before: -24,
    is_active: true,
  },
];

const BLANK: Partial<Template> = {
  trigger_type: "on_booking",
  channel: "email",
  subject: "",
  body: "",
  send_hours_before: null,
  is_active: true,
};

export default function LodgingNotificationsSection({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<Partial<Template>>(BLANK);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filterChannel, setFilterChannel] = useState<Channel | "all">("all");

  const query = useQuery({
    queryKey: ["lodge_notification_templates", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodge_notification_templates")
        .select("*")
        .eq("store_id", storeId)
        .order("trigger_type", { ascending: true });
      if (error) throw error;
      return (data || []) as Template[];
    },
  });

  const openCreate = (preset?: Partial<Template>) => {
    setEditing(null);
    setForm(preset ? { ...BLANK, ...preset } : BLANK);
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm(t);
    setDialogOpen(true);
  };

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        store_id: storeId,
        trigger_type: form.trigger_type,
        channel: form.channel,
        subject: form.subject || null,
        body: form.body || "",
        send_hours_before: form.send_hours_before ?? null,
        is_active: form.is_active ?? true,
      };
      if (editing) {
        const { error } = await (supabase as any).from("lodge_notification_templates").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("lodge_notification_templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Template updated" : "Template created");
      qc.invalidateQueries({ queryKey: ["lodge_notification_templates", storeId] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("lodge_notification_templates").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge_notification_templates", storeId] }),
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_notification_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["lodge_notification_templates", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const all = query.data || [];
  const filtered = filterChannel === "all" ? all : all.filter(t => t.channel === filterChannel);
  const activeCount = all.filter(t => t.is_active).length;

  const previewBody = (form.body || "").replace(/{guest_name}/g, "Maria Santos")
    .replace(/{room_number}/g, "203").replace(/{check_in}/g, "2026-05-10")
    .replace(/{check_out}/g, "2026-05-13").replace(/{nights}/g, "3")
    .replace(/{hotel_name}/g, "Your Hotel").replace(/{reservation_number}/g, "RES-0042")
    .replace(/{total_amount}/g, "$450.00");

  const needsHoursBefore = ["pre_checkin", "pre_checkout", "review_request"].includes(form.trigger_type || "");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notification Templates</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openCreate()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-notifications" />
        <LodgingSectionStatusBanner
          title="Guest Notifications"
          icon={Bell}
          countLabel="Active templates"
          countValue={activeCount}
          fixLabel="Open Inbox"
          fixTab="lodge-inbox"
        />

        {/* Preset quick-add */}
        {all.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Quick-start with preset templates:</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <Button key={p.trigger_type} size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => openCreate(p)}>
                  {TRIGGER_LABEL[p.trigger_type as TriggerType]}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "email", "sms", "whatsapp"] as const).map(c => (
            <button type="button" key={c} onClick={() => setFilterChannel(c as any)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${filterChannel === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Templates list */}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {all.length === 0
              ? "No templates yet. Create your first or use a preset above."
              : "No templates match this filter."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(t => {
              const Icon = CHANNEL_ICON[t.channel];
              return (
                <div key={t.id} className={`rounded-lg border p-3 ${!t.is_active ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{TRIGGER_LABEL[t.trigger_type]}</span>
                        <Badge className={`text-[10px] border ${CHANNEL_COLOR[t.channel]}`}>{t.channel}</Badge>
                        {!t.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                        {t.send_hours_before && (
                          <Badge variant="outline" className="text-[10px]">
                            {t.send_hours_before > 0 ? `${t.send_hours_before}h before` : `${Math.abs(t.send_hours_before)}h after`}
                          </Badge>
                        )}
                      </div>
                      {t.subject && <p className="text-xs text-muted-foreground truncate">Subject: {t.subject}</p>}
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{t.body}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={t.is_active}
                        onCheckedChange={v => toggleActive.mutate({ id: t.id, is_active: v })}
                        className="scale-75"
                      />
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                        onClick={() => { if (confirm("Delete this template?")) deleteTemplate.mutate(t.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Editor dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit template" : "New notification template"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Trigger</Label>
                <Select value={form.trigger_type} onValueChange={v => setForm({ ...form, trigger_type: v as TriggerType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TRIGGER_LABEL) as TriggerType[]).map(k => (
                      <SelectItem key={k} value={k}>{TRIGGER_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v as Channel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {needsHoursBefore && (
                <div>
                  <Label>Send X hours before / after (negative = after)</Label>
                  <Input
                    type="number"
                    value={form.send_hours_before ?? ""}
                    onChange={e => setForm({ ...form, send_hours_before: parseInt(e.target.value) || null })}
                    placeholder="e.g. 48 for 2 days before"
                  />
                </div>
              )}
              {form.channel === "email" && (
                <div className="sm:col-span-2">
                  <Label>Email subject</Label>
                  <Input value={form.subject || ""} onChange={e => setForm({ ...form, subject: e.target.value })}
                    placeholder="Your reservation at {hotel_name} is confirmed!" />
                </div>
              )}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <Label>Message body</Label>
                  <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1"
                    onClick={() => setPreviewOpen(true)}>
                    <Eye className="h-3 w-3" /> Preview
                  </Button>
                </div>
                <Textarea
                  rows={8}
                  value={form.body || ""}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                  placeholder="Dear {guest_name}, thank you for your reservation…"
                  className="font-mono text-xs"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {VARIABLES.map(v => (
                    <button type="button" key={v}
                      onClick={() => setForm({ ...form, body: (form.body || "") + v })}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/30 hover:bg-muted text-muted-foreground font-mono">
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label className="text-sm">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={!form.body?.trim() || upsert.isPending} onClick={() => upsert.mutate()}>
                {upsert.isPending ? "Saving…" : editing ? "Update" : "Create template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Template preview (sample data)</DialogTitle>
            </DialogHeader>
            {form.subject && (
              <div className="rounded border border-border bg-muted/20 p-2 text-xs">
                <span className="text-muted-foreground">Subject: </span>
                {form.subject.replace(/{hotel_name}/g, "Your Hotel").replace(/{guest_name}/g, "Maria Santos")}
              </div>
            )}
            <pre className="whitespace-pre-wrap text-xs font-mono rounded-lg bg-muted/20 border border-border p-3 max-h-64 overflow-y-auto">
              {previewBody}
            </pre>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
