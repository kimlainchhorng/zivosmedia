import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, MessageSquare, CheckCircle, XCircle, Download,
  Search, Clock, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  resolved: "bg-emerald-500/15 text-emerald-600",
  dismissed: "bg-muted text-muted-foreground",
  flagged: "bg-red-500/15 text-red-600",
};

const CATEGORIES = [
  "all", "bug_report", "feature_request", "price_mismatch", "general",
  "business_inquiry", "api_waitlist", "corporate_lead", "security_report",
  "story_poll", "fb_page_post", "meta_admin_config",
];

export default function AdminFeedbackReplyPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [statusTab, setStatusTab] = useState("pending");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-feedback-inbox", statusTab, category],
    queryFn: async () => {
      let q = supabase
        .from("feedback_submissions")
        .select("*, profiles(email, full_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (statusTab !== "all") q = q.eq("status", statusTab);
      if (category !== "all") q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = search.trim()
    ? items.filter((i: any) =>
        i.message?.toLowerCase().includes(search.toLowerCase()) ||
        (i.profiles as any)?.email?.toLowerCase().includes(search.toLowerCase()) ||
        i.category?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const stats = {
    total: items.length,
    pending: items.filter((i: any) => i.status === "pending" || !i.status).length,
    resolved: items.filter((i: any) => i.status === "resolved").length,
    today: items.filter((i: any) => {
      const d = new Date(i.created_at);
      const n = new Date();
      return d.toDateString() === n.toDateString();
    }).length,
  };

  const openItem = (item: any) => {
    setSelected(item);
    setReplyText(item.response || "");
  };

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("feedback_submissions")
        .update({
          response: replyText,
          responded_at: new Date().toISOString(),
          status: "resolved",
        } as any)
        .eq("id", selected.id);
      if (error) throw error;
      toast.success("Reply saved and marked resolved");
      qc.invalidateQueries({ queryKey: ["admin-feedback-inbox"] });
      setSelected(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to save reply");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    setActingId(id);
    try {
      const { error } = await supabase
        .from("feedback_submissions")
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
      toast.success(`Marked ${status}`);
      qc.invalidateQueries({ queryKey: ["admin-feedback-inbox"] });
      if (selected?.id === id) setSelected(null);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setActingId(null);
    }
  };

  const exportCSV = () => {
    const rows = [
      ["ID", "Category", "Status", "Message", "User Email", "Response", "Created At"],
      ...filtered.map((i: any) => [
        i.id,
        i.category || "",
        i.status || "pending",
        `"${(i.message || "").replace(/"/g, '""')}"`,
        (i.profiles as any)?.email || "",
        `"${(i.response || "").replace(/"/g, '""')}"`,
        i.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} rows`);
  };

  return (
    <AdminLayout title="Feedback & Replies">
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Feedback Inbox</h2>
            <p className="text-sm text-muted-foreground">
              Review submissions, reply to users, and manage resolution status.
            </p>
          </div>
          <Button variant="outline" onClick={exportCSV} className="gap-2 shrink-0">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: MessageSquare, color: "text-foreground" },
            { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-600" },
            { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Today", value: stats.today, icon: MessageSquare, color: "text-primary" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
                </div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Tabs value={statusTab} onValueChange={setStatusTab}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === "all" ? "All categories" : c.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search message or email…"
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No feedback found
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((item: any) => {
                const profile = item.profiles as any;
                const statusKey = item.status || "pending";
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => openItem(item)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={STATUS_COLORS[statusKey] || STATUS_COLORS.pending}>
                          {statusKey}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {(item.category || "general").replace(/_/g, " ")}
                        </Badge>
                        {profile?.email && (
                          <span className="text-xs text-muted-foreground">{profile.email}</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {item.message?.startsWith("{")
                          ? (() => { try { return JSON.parse(item.message).message || item.message; } catch { return item.message; } })()
                          : item.message}
                      </p>
                      {item.response && (
                        <p className="text-xs text-emerald-600 mt-1 line-clamp-1">
                          ↳ {item.response}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {statusKey !== "resolved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                          disabled={actingId === item.id}
                          onClick={() => setStatus(item.id, "resolved")}
                        >
                          {actingId === item.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          Resolve
                        </Button>
                      )}
                      {statusKey !== "dismissed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-muted-foreground"
                          disabled={actingId === item.id}
                          onClick={() => setStatus(item.id, "dismissed")}
                        >
                          <XCircle className="h-3 w-3" /> Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Feedback Detail</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              {/* Meta */}
              <div className="flex flex-wrap gap-2">
                <Badge className={STATUS_COLORS[selected.status || "pending"]}>
                  {selected.status || "pending"}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {(selected.category || "general").replace(/_/g, " ")}
                </Badge>
              </div>

              {/* User */}
              {(selected.profiles as any)?.email && (
                <div className="text-sm">
                  <span className="text-muted-foreground">From: </span>
                  <span className="font-medium">{(selected.profiles as any).email}</span>
                </div>
              )}

              {/* Message */}
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    {new Date(selected.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {selected.message?.startsWith("{")
                      ? (() => { try { return JSON.parse(selected.message).message || selected.message; } catch { return selected.message; } })()
                      : selected.message}
                  </p>
                </CardContent>
              </Card>

              {/* Prior response */}
              {selected.response && (
                <Card className="border-emerald-500/30 bg-emerald-500/5">
                  <CardContent className="pt-3 pb-3">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Previous reply</p>
                    <p className="text-sm whitespace-pre-wrap">{selected.response}</p>
                  </CardContent>
                </Card>
              )}

              {/* Reply area */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Reply to user</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                  placeholder="Type your reply here. This will be marked as resolved automatically."
                />
              </div>

              <Button
                onClick={sendReply}
                disabled={saving || !replyText.trim()}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Send Reply & Resolve
              </Button>

              <div className="flex gap-2">
                {selected.status !== "resolved" && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-1 text-emerald-600"
                    disabled={!!actingId}
                    onClick={() => setStatus(selected.id, "resolved")}
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Mark Resolved
                  </Button>
                )}
                {selected.status !== "dismissed" && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-1"
                    disabled={!!actingId}
                    onClick={() => setStatus(selected.id, "dismissed")}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Dismiss
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
