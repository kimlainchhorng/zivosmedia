import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign, executeCampaign, getAggregateMarketingStats } from "@/lib/marketing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Trash2, Play, Send, Bell, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "secondary",
  active: "default",
  sent: "outline",
  paused: "secondary",
  cancelled: "destructive",
};

const emptyCampaign = {
  name: "",
  campaign_type: "push",
  status: "draft",
  title: "",
  message: "",
  notification_title: "",
  notification_body: "",
  push_enabled: true,
  email_enabled: false,
  sms_enabled: false,
  target_audience: "all",
  target_city: "",
  start_date: "",
  end_date: "",
};

export default function AdminMarketingCampaignsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCampaign);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["marketing-campaigns"],
    queryFn: getCampaigns,
  });

  const { data: stats } = useQuery({
    queryKey: ["marketing-stats"],
    queryFn: getAggregateMarketingStats,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        campaign_type: form.campaign_type,
        status: form.status,
        title: form.title || null,
        message: form.message || null,
        notification_title: form.notification_title || null,
        notification_body: form.notification_body || null,
        push_enabled: form.push_enabled,
        email_enabled: form.email_enabled,
        sms_enabled: form.sms_enabled,
        target_audience: form.target_audience || "all",
        target_city: form.target_city || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (editingId) return updateCampaign(editingId, payload);
      return createCampaign(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      qc.invalidateQueries({ queryKey: ["marketing-stats"] });
      setOpen(false);
      toast.success(editingId ? "Campaign updated" : "Campaign created");
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      setDeleteConfirm(null);
      toast.success("Campaign deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleExecute = async (id: string) => {
    setExecutingId(id);
    const result = await executeCampaign(id);
    setExecutingId(null);
    if (result.success) {
      toast.success(`Campaign sent to ${result.users_targeted} users`);
      qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
    } else {
      toast.error(result.error || "Execution failed");
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyCampaign);
    setOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      name: c.name ?? "",
      campaign_type: c.campaign_type ?? "push",
      status: c.status ?? "draft",
      title: c.title ?? "",
      message: c.message ?? "",
      notification_title: c.notification_title ?? "",
      notification_body: c.notification_body ?? "",
      push_enabled: c.push_enabled ?? true,
      email_enabled: c.email_enabled ?? false,
      sms_enabled: c.sms_enabled ?? false,
      target_audience: c.target_audience ?? "all",
      target_city: c.target_city ?? "",
      start_date: c.start_date?.slice(0, 10) ?? "",
      end_date: c.end_date?.slice(0, 10) ?? "",
    });
    setOpen(true);
  };

  const set = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <AdminLayout title="Marketing Campaigns">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Marketing Campaigns</h2>
            <p className="text-muted-foreground text-sm">Push, email and SMS campaigns with live audience targeting.</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        </div>

        {/* Stats strip */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { label: "Total", value: stats.totalCampaigns },
              { label: "Active", value: stats.activeCampaigns },
              { label: "Deliveries", value: stats.totalDeliveries.toLocaleString() },
              { label: "Open Rate", value: `${(stats.openRate * 100).toFixed(1)}%` },
              { label: "Click Rate", value: `${(stats.clickRate * 100).toFixed(1)}%` },
              { label: "Conv. Rate", value: `${(stats.conversionRate * 100).toFixed(1)}%` },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                  <div className="text-2xl font-bold">{s.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Campaign table */}
        <Card>
          <CardHeader><CardTitle>All Campaigns</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No campaigns yet. Create your first one.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="capitalize text-sm">{c.campaign_type}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {c.push_enabled && <Bell className="h-3.5 w-3.5 text-muted-foreground" title="Push" />}
                          {c.email_enabled && <Mail className="h-3.5 w-3.5 text-muted-foreground" title="Email" />}
                          {c.sms_enabled && <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" title="SMS" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{c.target_audience ?? "all"}{c.target_city ? ` · ${c.target_city}` : ""}</TableCell>
                      <TableCell>
                        <Badge variant={(STATUS_COLORS[c.status ?? "draft"] as any) ?? "secondary"} className="capitalize">
                          {c.status ?? "draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.executed_at ? new Date(c.executed_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit</Button>
                          {c.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={() => handleExecute(c.id)}
                              disabled={executingId === c.id}
                              className="gap-1"
                            >
                              {executingId === c.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Send className="h-3.5 w-3.5" />}
                              Send
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(c.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Campaign" : "New Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Weekend Ride Promo" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.campaign_type} onValueChange={(v) => set("campaign_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">Push Notification</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="promo">Promo Code</SelectItem>
                    <SelectItem value="credits">Credits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title / Subject</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Campaign title or email subject" />
            </div>

            <div className="space-y-2">
              <Label>Message / Body</Label>
              <Textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={3} placeholder="Campaign body message" />
            </div>

            {form.push_enabled && (
              <>
                <div className="space-y-2">
                  <Label>Push Notification Title</Label>
                  <Input value={form.notification_title} onChange={(e) => set("notification_title", e.target.value)} placeholder="e.g. 🎉 Special Offer!" />
                </div>
                <div className="space-y-2">
                  <Label>Push Notification Body</Label>
                  <Textarea value={form.notification_body} onChange={(e) => set("notification_body", e.target.value)} rows={2} placeholder="Short push message (max 100 chars)" />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Channels</Label>
              <div className="flex gap-4">
                {[
                  { key: "push_enabled", icon: Bell, label: "Push" },
                  { key: "email_enabled", icon: Mail, label: "Email" },
                  { key: "sms_enabled", icon: MessageSquare, label: "SMS" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={(form as any)[key]}
                      onCheckedChange={(v) => set(key as any, v)}
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={form.target_audience} onValueChange={(v) => set("target_audience", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="riders">Riders</SelectItem>
                    <SelectItem value="drivers">Drivers</SelectItem>
                    <SelectItem value="merchants">Merchants</SelectItem>
                    <SelectItem value="inactive">Inactive 7d+</SelectItem>
                    <SelectItem value="new">New Users (7d)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City (optional)</Label>
                <Input value={form.target_city} onChange={(e) => set("target_city", e.target.value)} placeholder="e.g. Phnom Penh" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Campaign</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the campaign and all delivery records.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
