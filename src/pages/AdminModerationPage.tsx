import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow, subDays } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  BarChart3,
  CheckCircle,
  Clock,
  Eye,
  Flag,
  Loader2,
  RotateCcw,
  Search,
  Shield,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import SEOHead from "@/components/SEOHead";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  getModerationActionOutcome,
  getModerationContentLabel,
  getModerationStatusLabel,
  isPendingModerationStatus,
  normalizeModerationContentType,
  type ModerationContentKind,
  type ModerationReviewAction,
} from "@/lib/admin/moderationQueue";

interface QueueRow {
  id: string;
  content_type: string;
  content_id: string;
  reported_by: string | null;
  auto_flagged: boolean | null;
  reason: string;
  severity: string | null;
  status: string | null;
  priority: number | null;
  ai_category: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProfileSummary {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ContentDetails {
  title: string;
  body: string;
  ownerId: string | null;
  ownerName: string;
  ownerAvatar: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
  sensitive: boolean;
  mediaLabel: string | null;
  metadata: string[];
}

interface ModerationReport {
  id: string;
  contentType: string;
  kind: ModerationContentKind;
  contentId: string;
  reporterId: string | null;
  reporterName: string;
  reporterAvatar: string | null;
  autoFlagged: boolean;
  reason: string;
  severity: string;
  status: string;
  priority: number;
  aiCategory: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UserRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

type StatusFilter = "all" | "pending" | "actioned" | "dismissed" | "resolved";
type SeverityFilter = "all" | "high" | "medium" | "low";
type ContentFilter = "all" | ModerationContentKind;
type DateFilter = "all" | "24h" | "7d";

const REPORT_SELECT =
  "id, content_type, content_id, reported_by, auto_flagged, reason, severity, status, priority, ai_category, created_at, updated_at";

const CONTENT_FILTERS: Array<{ label: string; value: ContentFilter }> = [
  { label: "All content", value: "all" },
  { label: "Posts", value: "user_post" },
  { label: "Comments", value: "post_comment" },
  { label: "Direct messages", value: "direct_message" },
  { label: "Group messages", value: "group_message" },
  { label: "Stories", value: "story" },
  { label: "Story comments", value: "story_comment" },
];

const STATUS_FILTERS: Array<{ label: string; value: StatusFilter }> = [
  { label: "Pending", value: "pending" },
  { label: "All statuses", value: "all" },
  { label: "Actioned", value: "actioned" },
  { label: "Dismissed", value: "dismissed" },
  { label: "Resolved", value: "resolved" },
];

const SEVERITY_FILTERS: Array<{ label: string; value: SeverityFilter }> = [
  { label: "All severity", value: "all" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const DATE_FILTERS: Array<{ label: string; value: DateFilter }> = [
  { label: "Any time", value: "all" },
  { label: "Last 24h", value: "24h" },
  { label: "Last 7d", value: "7d" },
];

const asRows = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
const textField = (row: Record<string, unknown>, key: string) =>
  typeof row[key] === "string" ? String(row[key]) : "";

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "U";
}

function severityVariant(severity: string): "destructive" | "default" | "secondary" {
  if (severity === "high") return "destructive";
  if (severity === "medium") return "default";
  return "secondary";
}

function statusVariant(status: string): "destructive" | "default" | "secondary" | "outline" {
  if (isPendingModerationStatus(status)) return "destructive";
  if (status === "actioned" || status === "resolved") return "default";
  if (status === "dismissed") return "secondary";
  return "outline";
}

function mediaLabel(row: Record<string, unknown>) {
  if (textField(row, "image_url") || textField(row, "media_url")) return "Image";
  if (textField(row, "video_url")) return "Video";
  if (textField(row, "voice_url")) return "Voice message";
  if (row.file_payload) return "Attachment";
  const urls = row.media_urls;
  if (Array.isArray(urls) && urls.length > 0) return `${urls.length} media items`;
  return textField(row, "media_type") || textField(row, "message_type") || null;
}

async function fetchProfile(userId?: string | null): Promise<ProfileSummary | null> {
  if (!userId) return null;
  const { data } = await (supabase as any)
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  return (data as ProfileSummary | null) ?? null;
}

async function fetchGroupName(groupId?: string | null): Promise<string | null> {
  if (!groupId) return null;
  const { data } = await (supabase as any)
    .from("chat_groups")
    .select("name")
    .eq("id", groupId)
    .maybeSingle();
  const row = asRecord(data);
  return textField(row, "name") || null;
}

async function loadContentDetails(report: ModerationReport): Promise<ContentDetails | null> {
  const table =
    report.kind === "user_post"
      ? "user_posts"
      : report.kind === "post_comment"
        ? "post_comments"
        : report.kind === "direct_message"
          ? "direct_messages"
          : report.kind === "group_message"
            ? "group_messages"
            : report.kind === "story"
              ? "stories"
              : report.kind === "story_comment"
                ? "story_comments"
                : null;
  if (!table) return null;

  const select =
    report.kind === "user_post"
      ? "id, user_id, caption, media_type, media_url, media_urls, hidden_at, hidden_reason, is_sensitive, sensitive_reason, sensitive_report_count, created_at"
      : report.kind === "post_comment"
        ? "id, user_id, content, post_id, post_source, hidden_at, hidden_reason, sensitive_report_count, created_at"
        : report.kind === "direct_message"
          ? "id, sender_id, receiver_id, message, message_type, hidden_at, hidden_reason, sensitive_report_count, created_at, image_url, video_url, voice_url, file_payload"
          : report.kind === "group_message"
            ? "id, group_id, sender_id, message, message_type, hidden_at, hidden_reason, sensitive_report_count, created_at, image_url, video_url, voice_url, file_payload"
            : report.kind === "story"
              ? "id, user_id, text_overlay, media_type, media_url, hidden_at, hidden_reason, is_sensitive, sensitive_reason, sensitive_report_count, created_at"
              : "id, story_id, user_id, content, hidden_at, hidden_reason, sensitive_report_count, created_at";

  const { data, error } = await (supabase as any).from(table).select(select).eq("id", report.contentId).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = asRecord(data);
  const ownerId = textField(row, "user_id") || textField(row, "sender_id") || null;
  const receiverId = textField(row, "receiver_id") || null;
  const [owner, receiver, groupName] = await Promise.all([
    fetchProfile(ownerId),
    fetchProfile(receiverId),
    report.kind === "group_message" ? fetchGroupName(textField(row, "group_id")) : Promise.resolve(null),
  ]);
  const body =
    textField(row, "caption") ||
    textField(row, "text_overlay") ||
    textField(row, "content") ||
    textField(row, "message") ||
    "No text content";
  const hiddenAt = textField(row, "hidden_at") || null;
  const hiddenReason = textField(row, "hidden_reason") || null;
  const sensitive = Boolean(row.is_sensitive) || Boolean(hiddenAt);

  return {
    title: groupName ? `${getModerationContentLabel(report.kind)} in ${groupName}` : getModerationContentLabel(report.kind),
    body,
    ownerId,
    ownerName: owner?.full_name || "Unknown user",
    ownerAvatar: owner?.avatar_url || null,
    hiddenAt,
    hiddenReason,
    sensitive,
    mediaLabel: mediaLabel(row),
    metadata: [
      row.created_at ? `Created ${formatDistanceToNow(new Date(textField(row, "created_at")), { addSuffix: true })}` : null,
      row.sensitive_report_count ? `${row.sensitive_report_count} sensitive reports` : null,
      groupName ? `Group: ${groupName}` : null,
      report.kind === "story_comment" && textField(row, "story_id") ? `Story: ${textField(row, "story_id")}` : null,
      receiver ? `Receiver: ${receiver.full_name || "Unknown user"}` : null,
    ].filter(Boolean) as string[],
  };
}

export default function AdminModerationPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("queue");
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ModerationReport | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<ContentDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    const { data, error } = await (supabase as any)
      .from("content_moderation_queue")
      .select(REPORT_SELECT)
      .order("created_at", { ascending: false })
      .limit(150);

    if (error) {
      toast.error("Could not load moderation queue: " + error.message);
      setReports([]);
      setLoadingReports(false);
      return;
    }

    const queueRows = asRows<QueueRow>(data);
    const reporterIds = [...new Set(queueRows.map((row) => row.reported_by).filter(Boolean) as string[])];
    const { data: profiles } = reporterIds.length
      ? await (supabase as any).from("profiles").select("id, full_name, avatar_url").in("id", reporterIds)
      : { data: [] };
    const profileMap = new Map(asRows<ProfileSummary>(profiles).map((profile) => [profile.id, profile]));

    setReports(queueRows.map((row) => {
      const reporter = row.reported_by ? profileMap.get(row.reported_by) : null;
      return {
        id: row.id,
        contentType: row.content_type,
        kind: normalizeModerationContentType(row.content_type),
        contentId: row.content_id,
        reporterId: row.reported_by,
        reporterName: reporter?.full_name || "Unknown user",
        reporterAvatar: reporter?.avatar_url || null,
        autoFlagged: Boolean(row.auto_flagged),
        reason: row.reason,
        severity: row.severity || "low",
        status: row.status || "pending",
        priority: row.priority || 0,
        aiCategory: row.ai_category,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }));
    setLoadingReports(false);
  }, []);

  const loadUsers = useCallback(async () => {
    if (users.length > 0) return;
    setLoadingUsers(true);
    const q = searchQuery.trim();
    let query = (supabase as any).from("profiles").select("id, full_name, avatar_url, created_at").limit(20);
    if (q) query = query.ilike("full_name", `%${q}%`);
    const { data, error } = await query;
    if (error) toast.error("Could not load users: " + error.message);
    if (data) setUsers(data as UserRow[]);
    setLoadingUsers(false);
  }, [searchQuery, users.length]);

  const openReport = useCallback(async (report: ModerationReport) => {
    setSelectedReport(report);
    setSelectedDetails(null);
    setLoadingDetails(true);
    try {
      setSelectedDetails(await loadContentDetails(report));
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String(err.message) : "Unknown error";
      toast.error("Could not load report details: " + message);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (activeTab === "users") void loadUsers();
  }, [activeTab, loadUsers]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cutoff =
      dateFilter === "24h" ? subDays(new Date(), 1) : dateFilter === "7d" ? subDays(new Date(), 7) : null;

    return reports.filter((report) => {
      if (statusFilter !== "all" && report.status !== statusFilter) return false;
      if (severityFilter !== "all" && report.severity !== severityFilter) return false;
      if (contentFilter !== "all" && report.kind !== contentFilter) return false;
      if (cutoff && report.createdAt && new Date(report.createdAt) < cutoff) return false;
      if (!q) return true;
      return [report.reason, report.contentId, report.reporterName, report.aiCategory]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [contentFilter, dateFilter, reports, searchQuery, severityFilter, statusFilter]);

  const stats = useMemo(() => {
    const pending = reports.filter((r) => isPendingModerationStatus(r.status)).length;
    const actioned = reports.filter((r) => r.status === "actioned" || r.status === "resolved").length;
    const dismissed = reports.filter((r) => r.status === "dismissed").length;
    const high = reports.filter((r) => r.severity === "high").length;
    return { pending, actioned, dismissed, high, total: reports.length };
  }, [reports]);

  const applyTargetVisibility = async (
    report: ModerationReport,
    action: ModerationReviewAction,
    moderatorId: string,
    details: ContentDetails | null,
  ) => {
    if (action === "dismiss") return;
    const table =
      report.kind === "user_post"
        ? "user_posts"
        : report.kind === "post_comment"
          ? "post_comments"
          : report.kind === "direct_message"
            ? "direct_messages"
            : report.kind === "group_message"
              ? "group_messages"
              : report.kind === "story"
                ? "stories"
                : report.kind === "story_comment"
                  ? "story_comments"
                  : null;
    if (!table) return;

    const hidePatch = {
      hidden_at: details?.hiddenAt || new Date().toISOString(),
      hidden_by: moderatorId,
      hidden_reason: details?.hiddenReason || "moderator_action",
    };
    const unhidePatch = {
      hidden_at: null,
      hidden_by: null,
      hidden_reason: null,
    };
    const basePatch = action === "unhide_false_positive" ? unhidePatch : hidePatch;
    const patch =
      report.kind === "user_post" || report.kind === "story"
        ? action === "unhide_false_positive"
          ? { ...basePatch, is_sensitive: false, sensitive_reason: null }
          : { ...basePatch, is_sensitive: true, sensitive_reason: "moderator_sensitive" }
        : basePatch;

    const { error } = await (supabase as any).from(table).update(patch).eq("id", report.contentId);
    if (error) throw error;
  };

  const handleReviewAction = async (report: ModerationReport, action: ModerationReviewAction) => {
    setActioningId(report.id);
    const outcome = getModerationActionOutcome(action);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error("Admin user not available");

      const details = selectedReport?.id === report.id ? selectedDetails : await loadContentDetails(report);
      await applyTargetVisibility(report, action, user.id, details);

      const now = new Date().toISOString();
      const { error: queueError } = await (supabase as any)
        .from("content_moderation_queue")
        .update({
          status: outcome.queueStatus,
          assigned_to: user.id,
          updated_at: now,
        })
        .eq("id", report.id);
      if (queueError) throw queueError;

      const { error: auditError } = await (supabase as any).from("moderation_actions").insert({
        queue_item_id: report.id,
        moderator_id: user.id,
        action_type: outcome.auditActionType,
        target_user_id: details?.ownerId ?? null,
        target_content_id: report.contentId,
        target_content_type: report.kind,
        reason: report.reason,
        notes: `${getModerationContentLabel(report.kind)} review: ${outcome.auditActionType}`,
      });
      if (auditError) throw auditError;

      toast.success(outcome.successLabel);
      setSelectedReport((current) => (current?.id === report.id ? { ...current, status: outcome.queueStatus } : current));
      await loadReports();
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String(err.message) : "Unknown error";
      toast.error("Could not update report: " + message);
    } finally {
      setActioningId(null);
    }
  };

  const statItems = [
    { label: "Pending", value: stats.pending.toString(), icon: Clock, color: "text-yellow-500" },
    { label: "Actioned", value: stats.actioned.toString(), icon: CheckCircle, color: "text-green-500" },
    { label: "Dismissed", value: stats.dismissed.toString(), icon: XCircle, color: "text-muted-foreground" },
    { label: "High Severity", value: stats.high.toString(), icon: AlertTriangle, color: "text-red-500" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead title="Moderation - ZIVO" description="Admin moderation panel." canonical="/admin/moderation" noIndex />
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Safety Review</h1>
          <Button aria-label="Refresh moderation queue" variant="ghost" size="icon" className="ml-auto" onClick={() => void loadReports()}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
        {statItems.map((stat) => (
          <Card key={stat.label} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
        <TabsList className="w-full">
          <TabsTrigger value="queue" className="flex-1 gap-1">
            <Flag className="h-3 w-3" /> Queue
            {stats.pending > 0 && <Badge variant="destructive" className="text-xs ml-1">{stats.pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-1 gap-1">
            <Users className="h-3 w-3" /> Users
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 gap-1">
            <BarChart3 className="h-3 w-3" /> Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4 space-y-4">
          <div className="grid gap-2 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search queue"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger aria-label="Status filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as SeverityFilter)}>
              <SelectTrigger aria-label="Severity filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_FILTERS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={contentFilter} onValueChange={(value) => setContentFilter(value as ContentFilter)}>
              <SelectTrigger aria-label="Content filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_FILTERS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="max-w-[220px]">
            <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}>
              <SelectTrigger aria-label="Date filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FILTERS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loadingReports ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16">
              <Shield className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No matching reports</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => (
                <Card key={report.id} className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant={severityVariant(report.severity)} className="text-xs capitalize">{report.severity}</Badge>
                        <Badge variant={statusVariant(report.status)} className="text-xs">{getModerationStatusLabel(report.status)}</Badge>
                        <Badge variant="outline" className="text-xs">{getModerationContentLabel(report.kind)}</Badge>
                        {report.autoFlagged && <Badge variant="secondary" className="text-xs">Auto flagged</Badge>}
                      </div>
                      <p className="text-sm font-semibold text-foreground">{report.reason}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Content ID: {report.contentId}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Reporter: {report.reporterName}</span>
                        <span>{report.createdAt ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true }) : "No timestamp"}</span>
                        {report.priority > 0 && <span>Priority {report.priority}</span>}
                        {report.aiCategory && <span>{report.aiCategory}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2 md:flex-col">
                      <Button size="sm" variant="outline" onClick={() => void openReport(report)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actioningId === report.id}
                        onClick={() => void handleReviewAction(report, "confirm_hidden")}
                      >
                        {actioningId === report.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                        Action
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setUsers([]); }}
              onKeyDown={(e) => e.key === "Enter" && void loadUsers()}
              className="pl-9"
            />
          </div>
          {loadingUsers ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            users.map((u) => (
              <Card key={u.id} className="p-3 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">{(u.full_name ?? "U")[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{u.full_name ?? "Unknown User"}</p>
                  <p className="text-xs text-muted-foreground">Joined {u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true }) : "-"}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" aria-label="View user"><Eye className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" aria-label="Block user"><Ban className="h-3 w-3" /></Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <Card className="p-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Moderation Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {[
                { label: "Total reports", value: stats.total.toString() },
                { label: "Pending", value: stats.pending.toString() },
                { label: "Actioned", value: stats.actioned.toString() },
                { label: "Dismissed", value: stats.dismissed.toString() },
                { label: "High severity", value: stats.high.toString() },
                { label: "Action rate", value: stats.total > 0 ? `${Math.round((stats.actioned / stats.total) * 100)}%` : "-" },
              ].map((metric) => (
                <div key={metric.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                  <span className="text-sm font-medium text-foreground">{metric.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>Review report</DialogTitle>
            <DialogDescription>
              {selectedReport ? `${getModerationContentLabel(selectedReport.kind)} - ${getModerationStatusLabel(selectedReport.status)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <ScrollArea className="max-h-[72vh] px-5 pb-5">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={severityVariant(selectedReport.severity)} className="capitalize">{selectedReport.severity}</Badge>
                  <Badge variant={statusVariant(selectedReport.status)}>{getModerationStatusLabel(selectedReport.status)}</Badge>
                  {selectedReport.aiCategory && <Badge variant="outline">{selectedReport.aiCategory}</Badge>}
                </div>

                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Reason</p>
                  <p className="mt-1 text-sm text-foreground">{selectedReport.reason}</p>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Content</p>
                  {loadingDetails ? (
                    <div className="py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : (
                    <>
                      <p className="mt-1 text-sm font-semibold text-foreground">{selectedDetails?.title || "Unavailable"}</p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                        {selectedDetails?.body || "The linked content row could not be loaded."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedDetails?.sensitive && <Badge variant="secondary">Hidden or sensitive</Badge>}
                        {selectedDetails?.mediaLabel && <Badge variant="outline">{selectedDetails.mediaLabel}</Badge>}
                        {selectedDetails?.hiddenReason && <Badge variant="outline">{selectedDetails.hiddenReason}</Badge>}
                      </div>
                      {selectedDetails?.metadata.length ? (
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          {selectedDetails.metadata.map((item) => <p key={item}>{item}</p>)}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Reporter</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedReport.reporterAvatar ?? undefined} />
                        <AvatarFallback>{initials(selectedReport.reporterName)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{selectedReport.reporterName}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Content owner</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedDetails?.ownerAvatar ?? undefined} />
                        <AvatarFallback>{initials(selectedDetails?.ownerName || "U")}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{selectedDetails?.ownerName || "Unknown user"}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                  <p>Queue ID: {selectedReport.id}</p>
                  <p>Content ID: {selectedReport.contentId}</p>
                  <p>Created: {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString() : "-"}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    variant="default"
                    disabled={actioningId === selectedReport.id}
                    onClick={() => void handleReviewAction(selectedReport, "confirm_hidden")}
                  >
                    {actioningId === selectedReport.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Confirm Action
                  </Button>
                  <Button
                    variant="outline"
                    disabled={actioningId === selectedReport.id}
                    onClick={() => void handleReviewAction(selectedReport, "unhide_false_positive")}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Unhide
                  </Button>
                  <Button
                    variant="outline"
                    disabled={actioningId === selectedReport.id}
                    onClick={() => void handleReviewAction(selectedReport, "dismiss")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Dismiss
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
