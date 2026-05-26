import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Send, Users, CheckCircle2, Loader2, Radio } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["all", "user", "driver", "merchant", "admin"] as const;

export default function AdminBroadcastPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [role, setRole] = useState<string>("all");
  const [channel, setChannel] = useState<string>("in_app");
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const { data: recent = [], isLoading } = useQuery({
    queryKey: ["admin-broadcasts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications" as any)
        .select("id, title, body, channel, status, category, created_at, role")
        .eq("template", "admin_broadcast")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const stats = {
    total: recent.length,
    sent: recent.filter((n: any) => n.status === "sent").length,
    failed: recent.filter((n: any) => n.status === "failed").length,
  };

  const getAudiencePreview = async () => {
    setPreviewing(true);
    try {
      let q = supabase.from("profiles").select("*", { count: "exact", head: true });
      if (role !== "all") q = (q as any).eq("role", role);
      const { count } = await q;
      setPreview(count ?? 0);
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message body are required");
      return;
    }
    setSending(true);
    try {
      const { data: profiles } = await (async () => {
        let q = supabase.from("profiles").select("id").limit(5000);
        if (role !== "all") q = (q as any).eq("role", role);
        return q;
      })();

      if (!profiles || profiles.length === 0) {
        toast.error("No users found for this audience");
        return;
      }

      const rows = profiles.map((p: any) => ({
        title,
        body,
        channel,
        template: "admin_broadcast",
        category: "account",
        status: "queued",
        role: role === "all" ? null : role,
        to_value: p.id,
      }));

      const BATCH = 500;
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await supabase
          .from("notifications" as any)
          .insert(rows.slice(i, i + BATCH));
        if (error) throw error;
      }

      // Trigger push delivery — pass user_ids so the edge function can target each device token
      if (channel === "push") {
        const userIdList = profiles.map((p: any) => p.id as string);
        // Send in chunks of 500 to stay within edge function limits
        const PUSH_CHUNK = 500;
        for (let ci = 0; ci < userIdList.length; ci += PUSH_CHUNK) {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_ids: userIdList.slice(ci, ci + PUSH_CHUNK),
              notification_type: "admin_broadcast",
              title,
              body,
              data: { role, url: "/" },
            },
          }).catch(() => {}); // best-effort; don't block on push failure
        }
      }

      qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
      toast.success(`Broadcast queued for ${profiles.length} users`);
      setTitle("");
      setBody("");
      setPreview(null);
    } catch (e: any) {
      toast.error(e.message || "Broadcast failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout title="Broadcast Notifications">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Broadcast Notifications</h2>
          <p className="text-sm text-muted-foreground">Send push or in-app messages to all users or specific segments.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Sent", value: stats.total, icon: Radio },
            { label: "Delivered", value: stats.sent, icon: CheckCircle2 },
            { label: "Failed", value: stats.failed, icon: Bell },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
                </div>
                <div className="text-2xl font-bold">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Compose */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> New Broadcast</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekend promotion is live!" maxLength={80} />
              <p className="text-[11px] text-muted-foreground">{title.length}/80 chars</p>
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Your message to users…" maxLength={200} />
              <p className="text-[11px] text-muted-foreground">{body.length}/200 chars</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={role} onValueChange={(v) => { setRole(v); setPreview(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">{r === "all" ? "All Users" : r.charAt(0).toUpperCase() + r.slice(1) + "s"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_app">In-App</SelectItem>
                    <SelectItem value="push">Push Notification</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {preview !== null && (
              <div className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-lg">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>This will reach approximately <strong>{preview.toLocaleString()}</strong> users.</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={getAudiencePreview} disabled={previewing} className="gap-2">
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                Preview Audience
              </Button>
              <Button onClick={handleSend} disabled={sending || !title || !body} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Sending…" : "Send Broadcast"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader><CardTitle>Broadcast History</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No broadcasts sent yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((n: any) => (
                    <TableRow key={n.id}>
                      <TableCell>
                        <div className="font-medium">{n.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{n.body}</div>
                      </TableCell>
                      <TableCell className="capitalize text-sm">{n.channel}</TableCell>
                      <TableCell className="text-sm capitalize">{n.role ?? "all"}</TableCell>
                      <TableCell>
                        <Badge variant={n.status === "sent" ? "default" : n.status === "failed" ? "destructive" : "secondary"} className="capitalize">
                          {n.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
