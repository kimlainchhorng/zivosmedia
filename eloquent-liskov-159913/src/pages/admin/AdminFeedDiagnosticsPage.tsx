import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Activity, AlertTriangle, BellRing, ChevronDown, ChevronRight, Copy, Download, Pencil, RefreshCw, Save, ShieldAlert, Trash2, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildCsv, downloadCsv } from "@/lib/performanceCsvExport";
import { track } from "@/lib/analytics";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useFeedIncidentWorkflow } from "@/hooks/useFeedIncidentWorkflow";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const escalationRoleLabel: Record<"incident_commander" | "on_call_engineer" | "support_lead", string> = {
  incident_commander: "Incident Commander",
  on_call_engineer: "On-call Engineer",
  support_lead: "Support Lead",
};

type RangeKey = "1h" | "24h" | "7d";

type FeedErrorRow = {
  id: string;
  created_at: string;
  page: string | null;
  meta: Record<string, unknown> | null;
};

type FeedViewActionRow = {
  id: string;
  created_at: string;
  meta: Record<string, unknown> | null;
};

type FilterState = {
  scope: string | null;
  kind: string | null;
  status: string | null;
  page: string | null;
  userId: string | null;
};

type Preset = {
  id: string;
  label: string;
  range: RangeKey;
  filters: FilterState;
};

type ScopeHealthCard = {
  scope: string;
  current: number;
  previous: number;
  deltaPct: number | null;
};

type IncidentPhaseId = "detect" | "triage" | "stabilize" | "recover";

type IncidentPhasePreset = {
  id: IncidentPhaseId;
  label: string;
  description: string;
  range: RangeKey;
  filters: FilterState;
};

type WatchAlertSeverity = "critical" | "elevated" | "stable";

type WatchAlertItem = {
  id: string;
  title: string;
  detail: string;
  severity: WatchAlertSeverity;
  count: number;
  acknowledgedAt: string | null;
  snoozedUntil: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  dueAt: string | null;
  overdue: boolean;
  snoozed: boolean;
};

type IncidentRunbookTask = {
  id: string;
  label: string;
};

type SavedView = {
  id: string;
  name: string;
  createdAt: string;
  range: RangeKey;
  filters: FilterState;
  tags?: string[];
  pinned?: boolean;
  createdById?: string | null;
  createdByName?: string | null;
  updatedAt?: string | null;
  updatedById?: string | null;
  updatedByName?: string | null;
};

const SAVED_VIEWS_KEY = "admin-feed-diagnostics-saved-views";
const SHARED_VIEWS_SETTING_KEY = "FEED_DIAGNOSTICS_SHARED_VIEWS";
const WATCH_MODE_KEY = "admin-feed-diagnostics-watch-mode";
const INCIDENT_RUNBOOK_STATE_KEY = "admin-feed-diagnostics-runbook-state";
const WATCH_SNOOZE_MINUTES = 15;

const rangeLabel: Record<RangeKey, string> = {
  "1h": "Last 1h",
  "24h": "Last 24h",
  "7d": "Last 7d",
};

const presets: Preset[] = [
  { id: "all", label: "All failures", range: "24h", filters: { scope: null, kind: null, status: null, page: null, userId: null } },
  { id: "server500", label: "500s only", range: "24h", filters: { scope: null, kind: null, status: "500", page: null, userId: null } },
  { id: "customer", label: "Customer feed", range: "24h", filters: { scope: "customer-feed", kind: null, status: null, page: null, userId: null } },
  { id: "reels", label: "Reels grid", range: "24h", filters: { scope: "reels-feed-grid", kind: null, status: null, page: null, userId: null } },
  { id: "social", label: "Social feed", range: "24h", filters: { scope: "social-feed-posts", kind: null, status: null, page: null, userId: null } },
  { id: "auth", label: "Auth issues", range: "7d", filters: { scope: null, kind: "auth", status: null, page: null, userId: null } },
  { id: "missing", label: "404s", range: "7d", filters: { scope: null, kind: "not_found", status: "404", page: null, userId: null } },
];

const incidentPhasePresets: IncidentPhasePreset[] = [
  {
    id: "detect",
    label: "Detect",
    description: "Focus on fresh high-severity failures.",
    range: "1h",
    filters: { scope: null, kind: null, status: "500", page: null, userId: null },
  },
  {
    id: "triage",
    label: "Triage",
    description: "Widen to capture scope and kind patterns.",
    range: "24h",
    filters: { scope: null, kind: null, status: null, page: null, userId: null },
  },
  {
    id: "stabilize",
    label: "Stabilize",
    description: "Target flaky network/server classes.",
    range: "24h",
    filters: { scope: null, kind: "network", status: null, page: null, userId: null },
  },
  {
    id: "recover",
    label: "Recover",
    description: "Verify improvement over longer horizon.",
    range: "7d",
    filters: { scope: null, kind: null, status: null, page: null, userId: null },
  },
];

const incidentRunbookTasks: Record<IncidentPhaseId, IncidentRunbookTask[]> = {
  detect: [
    { id: "confirm-spike", label: "Confirm spike in the last active window" },
    { id: "identify-scope", label: "Identify impacted scopes and status classes" },
    { id: "pin-view", label: "Pin or apply the primary incident view" },
  ],
  triage: [
    { id: "segment-failure", label: "Segment by scope, page, and affected user" },
    { id: "compare-window", label: "Compare against the previous window deltas" },
    { id: "assign-owner", label: "Assign an admin owner for active investigation" },
  ],
  stabilize: [
    { id: "apply-remediation", label: "Apply remediation views and verify response volume" },
    { id: "watch-lag", label: "Monitor watch stream for lagging error buckets" },
    { id: "update-shared-view", label: "Update shared incident view with current filters" },
  ],
  recover: [
    { id: "verify-drop", label: "Verify error drop across the recovery horizon" },
    { id: "clear-alerts", label: "Reset acknowledged and snoozed watch alerts" },
    { id: "capture-learnings", label: "Capture a runbook improvement or new preset" },
  ],
};

function parseRange(value: string | null): RangeKey {
  return value === "1h" || value === "24h" || value === "7d" ? value : "24h";
}

function normalizeFilterValue(value: string | null): string | null {
  return value && value.trim() ? value.trim() : null;
}

function rangeHours(range: RangeKey): number {
  if (range === "1h") return 1;
  if (range === "24h") return 24;
  return 24 * 7;
}

function previousWindow(range: RangeKey) {
  const hours = rangeHours(range);
  const end = new Date(Date.now() - hours * 60 * 60 * 1000);
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function calcDeltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function getScopeSeverity(current: number, deltaPct: number | null) {
  if (current >= 20 || (deltaPct !== null && deltaPct >= 50)) {
    return { label: "Critical", variant: "destructive" as const };
  }
  if (current >= 8 || (deltaPct !== null && deltaPct > 0)) {
    return { label: "Elevated", variant: "default" as const };
  }
  return { label: "Stable", variant: "secondary" as const };
}

function sinceIso(range: RangeKey): string {
  const now = new Date();
  if (range === "1h") now.setHours(now.getHours() - 1);
  if (range === "24h") now.setDate(now.getDate() - 1);
  if (range === "7d") now.setDate(now.getDate() - 7);
  return now.toISOString();
}

function asMeta(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== "object") return {};
  return meta as Record<string, unknown>;
}

function asText(value: unknown, fallback = "unknown"): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function sanitizeSegment(value: string | null) {
  if (!value) return "all";
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "all";
}

function loadSavedViews(): SavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_VIEWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((view): view is SavedView => (
      !!view
      && typeof view.id === "string"
      && typeof view.name === "string"
      && typeof view.createdAt === "string"
      && (view.range === "1h" || view.range === "24h" || view.range === "7d")
      && !!view.filters
      && typeof view.filters === "object"
    ));
  } catch {
    return [];
  }
}

function loadIncidentRunbookState(): Record<IncidentPhaseId, string[]> {
  if (typeof window === "undefined") {
    return {
      detect: [],
      triage: [],
      stabilize: [],
      recover: [],
    };
  }
  try {
    const raw = window.localStorage.getItem(INCIDENT_RUNBOOK_STATE_KEY);
    if (!raw) {
      return {
        detect: [],
        triage: [],
        stabilize: [],
        recover: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<Record<IncidentPhaseId, unknown>>;
    return {
      detect: Array.isArray(parsed.detect) ? parsed.detect.filter((item): item is string => typeof item === "string") : [],
      triage: Array.isArray(parsed.triage) ? parsed.triage.filter((item): item is string => typeof item === "string") : [],
      stabilize: Array.isArray(parsed.stabilize) ? parsed.stabilize.filter((item): item is string => typeof item === "string") : [],
      recover: Array.isArray(parsed.recover) ? parsed.recover.filter((item): item is string => typeof item === "string") : [],
    };
  } catch {
    return {
      detect: [],
      triage: [],
      stabilize: [],
      recover: [],
    };
  }
}

function alertBadgeVariant(severity: WatchAlertSeverity): "default" | "destructive" | "secondary" {
  if (severity === "critical") return "destructive";
  if (severity === "elevated") return "default";
  return "secondary";
}

function normalizeSavedViews(value: unknown): SavedView[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((view) => (
      !!view
      && typeof view === "object"
      && typeof (view as { id?: unknown }).id === "string"
      && typeof (view as { name?: unknown }).name === "string"
      && typeof (view as { createdAt?: unknown }).createdAt === "string"
      && ((view as { range?: unknown }).range === "1h" || (view as { range?: unknown }).range === "24h" || (view as { range?: unknown }).range === "7d")
      && !!(view as { filters?: unknown }).filters
      && typeof (view as { filters?: unknown }).filters === "object"
    ))
    .map((view) => {
      const typed = view as SavedView;
      return {
        id: typed.id,
        name: typed.name,
        createdAt: typed.createdAt,
        range: typed.range,
        filters: typed.filters,
        tags: Array.isArray(typed.tags)
          ? typed.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
          : [],
        pinned: typed.pinned === true,
        createdById: typeof typed.createdById === "string" ? typed.createdById : null,
        createdByName: typeof typed.createdByName === "string" ? typed.createdByName : null,
        updatedAt: typeof typed.updatedAt === "string" ? typed.updatedAt : null,
        updatedById: typeof typed.updatedById === "string" ? typed.updatedById : null,
        updatedByName: typeof typed.updatedByName === "string" ? typed.updatedByName : null,
      };
    });
}

function areFiltersEqual(a: FilterState, b: FilterState) {
  return a.scope === b.scope
    && a.kind === b.kind
    && a.status === b.status
    && a.page === b.page
    && a.userId === b.userId;
}

function buildDefaultTags(filters: FilterState) {
  const tags = [filters.scope, filters.kind, filters.status, filters.page, filters.userId]
    .filter((item): item is string => !!item)
    .map((item) => item.toLowerCase());
  return [...new Set(tags)].slice(0, 5);
}

function parseTagsInput(value: string): string[] {
  return [...new Set(
    value
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0),
  )].slice(0, 8);
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminFeedDiagnosticsPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [range, setRange] = useState<RangeKey>(() => parseRange(searchParams.get("range")));
  const [filters, setFilters] = useState<FilterState>(() => ({
    scope: normalizeFilterValue(searchParams.get("scope")),
    kind: normalizeFilterValue(searchParams.get("kind")),
    status: normalizeFilterValue(searchParams.get("status")),
    page: normalizeFilterValue(searchParams.get("page")),
    userId: normalizeFilterValue(searchParams.get("userId")),
  }));
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => loadSavedViews());
  const [isSavingSharedView, setIsSavingSharedView] = useState(false);
  const [isDeletingSharedViewId, setIsDeletingSharedViewId] = useState<string | null>(null);
  const [sharedViewSearch, setSharedViewSearch] = useState("");
  const [sharedTagFilter, setSharedTagFilter] = useState<string | null>(null);
  const [sharedPinnedOnly, setSharedPinnedOnly] = useState(false);
  const [activeIncidentPhase, setActiveIncidentPhase] = useState<IncidentPhaseId | null>(null);
  const [watchModeEnabled, setWatchModeEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(WATCH_MODE_KEY) === "true";
  });
  const [runbookState, setRunbookState] = useState<Record<IncidentPhaseId, string[]>>(() => loadIncidentRunbookState());
  const [workflowSummaryDraft, setWorkflowSummaryDraft] = useState("");
  const [workflowNextUpdateDraft, setWorkflowNextUpdateDraft] = useState("");
  const [workflowNoteDraft, setWorkflowNoteDraft] = useState("");
  const {
    workflow,
    isLoading: isWorkflowLoading,
    isSaving: isWorkflowSaving,
    isNextUpdateOverdue,
    overdueAlertCount,
    saveWorkflow,
    addNote,
    claimIncident,
    releaseIncident,
    acknowledgeAlert,
    snoozeAlert,
    assignAlert,
    setAlertDueAt,
    resetAlertState,
    markChatUpdateSent,
    routeEscalation,
    setReminderAutomation,
    sendReminderPing,
    autoEscalateOverdue,
    isReminderSuppressed,
    hasReminderTrigger,
    nextAutoReminderAt,
    shouldAutoSendReminder,
  } = useFeedIncidentWorkflow();
  const autoReminderRunRef = useRef<string | null>(null);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("range", range);
    if (filters.scope) next.set("scope", filters.scope);
    if (filters.kind) next.set("kind", filters.kind);
    if (filters.status) next.set("status", filters.status);
    if (filters.page) next.set("page", filters.page);
    if (filters.userId) next.set("userId", filters.userId);
    setSearchParams(next, { replace: true });
  }, [filters.kind, filters.page, filters.scope, filters.status, filters.userId, range, setSearchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(savedViews));
  }, [savedViews]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WATCH_MODE_KEY, watchModeEnabled ? "true" : "false");
  }, [watchModeEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(INCIDENT_RUNBOOK_STATE_KEY, JSON.stringify(runbookState));
  }, [runbookState]);

  useEffect(() => {
    const match = incidentPhasePresets.find((phase) => phase.range === range && areFiltersEqual(phase.filters, filters));
    setActiveIncidentPhase((current) => (current === (match?.id ?? null) ? current : match?.id ?? null));
  }, [filters, range]);

  useEffect(() => {
    setWorkflowSummaryDraft(workflow.summary);
    setWorkflowNextUpdateDraft(toDateTimeLocalValue(workflow.nextUpdateAt));
  }, [workflow.nextUpdateAt, workflow.summary]);

  useEffect(() => {
    if (!shouldAutoSendReminder || isWorkflowSaving) return;
    const automationKey = [
      workflow.updatedAt || "none",
      workflow.lastReminderAt || "never",
      workflow.status,
      workflow.autoReminderEnabled ? "enabled" : "disabled",
      workflow.reminderCadenceMinutes,
      overdueAlertCount,
      isNextUpdateOverdue ? "overdue" : "current",
    ].join(":");
    if (autoReminderRunRef.current === automationKey) return;
    autoReminderRunRef.current = automationKey;

    void (async () => {
      try {
        const result = await sendReminderPing("chat", "auto");
        trackViewAction("auto_send_reminder_ping", "shared", undefined, {
          channel: "chat",
          overdue_alerts: result.overdueAlerts,
          next_update_overdue: result.overdueUpdate,
          cadence_minutes: workflow.reminderCadenceMinutes,
        });
        toast.success("Automatic reminder ping sent via chat");
      } catch (error) {
        autoReminderRunRef.current = null;
        toast.error(error instanceof Error ? error.message : "Failed to send auto reminder ping");
      }
    })();
  }, [
    isNextUpdateOverdue,
    isWorkflowSaving,
    overdueAlertCount,
    sendReminderPing,
    shouldAutoSendReminder,
    workflow.autoReminderEnabled,
    workflow.lastReminderAt,
    workflow.reminderCadenceMinutes,
    workflow.status,
    workflow.updatedAt,
  ]);

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-feed-diagnostics", range],
    queryFn: async (): Promise<FeedErrorRow[]> => {
      const { data, error } = await (supabase as any)
        .from("analytics_events")
        .select("id, created_at, page, meta")
        .eq("event_name", "feed_query_error")
        .gte("created_at", sinceIso(range))
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as FeedErrorRow[];
    },
    refetchInterval: 30_000,
  });

  const { data: actionRows = [] } = useQuery({
    queryKey: ["admin-feed-diagnostics-view-actions", range],
    queryFn: async (): Promise<FeedViewActionRow[]> => {
      const { data, error } = await (supabase as any)
        .from("analytics_events")
        .select("id, created_at, meta")
        .eq("event_name", "feed_diagnostics_view_action")
        .gte("created_at", sinceIso(range))
        .order("created_at", { ascending: false })
        .limit(800);
      if (error) throw error;
      return (data || []) as FeedViewActionRow[];
    },
    refetchInterval: 30_000,
  });

  const {
    data: sharedViewsSetting,
    isLoading: isSharedViewsLoading,
    refetch: refetchSharedViews,
  } = useQuery({
    queryKey: ["admin-feed-diagnostics-shared-views"],
    queryFn: async (): Promise<{ id: string; value: unknown; updated_at: string | null } | null> => {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .select("id, value, updated_at")
        .is("tenant_id", null)
        .eq("key", SHARED_VIEWS_SETTING_KEY)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    staleTime: 30_000,
  });

  const sharedViews = useMemo(
    () => normalizeSavedViews(sharedViewsSetting?.value),
    [sharedViewsSetting?.value],
  );

  const sharedTagOptions = useMemo(() => {
    const tags = new Set<string>();
    for (const view of sharedViews) {
      for (const tag of view.tags || []) tags.add(tag);
    }
    return [...tags].sort((a, b) => a.localeCompare(b)).slice(0, 20);
  }, [sharedViews]);

  const filteredSharedViews = useMemo(() => {
    const q = sharedViewSearch.trim().toLowerCase();
    return sharedViews
      .filter((view) => {
      if (sharedPinnedOnly && !view.pinned) return false;
      if (sharedTagFilter && !(view.tags || []).includes(sharedTagFilter)) return false;
      if (!q) return true;
      return view.name.toLowerCase().includes(q)
        || (view.createdByName || "").toLowerCase().includes(q)
        || (view.tags || []).some((tag) => tag.includes(q));
    })
      .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [sharedPinnedOnly, sharedTagFilter, sharedViewSearch, sharedViews]);

  const previousRange = useMemo(() => previousWindow(range), [range]);

  const { data: previousRows = [] } = useQuery({
    queryKey: ["admin-feed-diagnostics-previous", range],
    queryFn: async (): Promise<FeedErrorRow[]> => {
      const { data, error } = await (supabase as any)
        .from("analytics_events")
        .select("id, created_at, page, meta")
        .eq("event_name", "feed_query_error")
        .gte("created_at", previousRange.start)
        .lt("created_at", previousRange.end)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as FeedErrorRow[];
    },
    refetchInterval: 30_000,
  });

  const summary = useMemo(() => {
    const byScope = new Map<string, number>();
    const byKind = new Map<string, number>();
    const byStatus = new Map<string, number>();

    for (const row of rows) {
      const meta = asMeta(row.meta);
      const scope = asText(meta.scope, "unknown");
      const kind = asText(meta.error_kind, "unknown");
      const status = asText(meta.error_status, "unknown");

      byScope.set(scope, (byScope.get(scope) || 0) + 1);
      byKind.set(kind, (byKind.get(kind) || 0) + 1);
      byStatus.set(status, (byStatus.get(status) || 0) + 1);
    }

    return {
      total: rows.length,
      uniqueScopes: byScope.size,
      uniqueKinds: byKind.size,
      topScopes: [...byScope.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      topKinds: [...byKind.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      topStatuses: [...byStatus.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  }, [rows]);

  const actionSummary = useMemo(() => {
    const byAction = new Map<string, number>();
    const byScope = new Map<string, number>();
    const byViewName = new Map<string, number>();
    const byActor = new Map<string, number>();
    const byBucket = new Map<string, number>();

    const formatBucket = (value: string) => {
      const date = new Date(value);
      if (range === "7d") {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
      return `${String(date.getHours()).padStart(2, "0")}:00`;
    };

    for (const row of actionRows) {
      const meta = asMeta(row.meta);
      const action = asText(meta.action, "unknown");
      const scope = asText(meta.scope, "unknown");
      const viewName = asText(meta.view_name, "unknown");
      const actor = asText(meta.user_id, "unknown");
      const bucket = formatBucket(row.created_at);

      byAction.set(action, (byAction.get(action) || 0) + 1);
      byScope.set(scope, (byScope.get(scope) || 0) + 1);
      byActor.set(actor, (byActor.get(actor) || 0) + 1);
      byBucket.set(bucket, (byBucket.get(bucket) || 0) + 1);
      if (viewName !== "unknown") {
        byViewName.set(viewName, (byViewName.get(viewName) || 0) + 1);
      }
    }

    const applyActions = byAction.get("apply") || 0;
    const errorCount = rows.length;
    const applyToErrorRatio = errorCount > 0
      ? Number((applyActions / errorCount).toFixed(2))
      : applyActions > 0 ? applyActions : 0;

    return {
      total: actionRows.length,
      topActions: [...byAction.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      topScopes: [...byScope.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
      topViews: [...byViewName.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      topAdmins: [...byActor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      timeline: [...byBucket.entries()].map(([label, actions]) => ({ label, actions })),
      saveActions: (byAction.get("save") || 0) + (byAction.get("duplicate") || 0),
      applyActions,
      applyToErrorRatio,
    };
  }, [actionRows, range, rows.length]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const meta = asMeta(row.meta);
      if (filters.scope && asText(meta.scope) !== filters.scope) return false;
      if (filters.kind && asText(meta.error_kind) !== filters.kind) return false;
      if (filters.status && asText(meta.error_status) !== filters.status) return false;
      if (filters.page && (row.page || "unknown") !== filters.page) return false;
      if (filters.userId && asText(meta.user_id, "anonymous") !== filters.userId) return false;
      return true;
    });
  }, [filters.kind, filters.page, filters.scope, filters.status, filters.userId, rows]);

  const timelineData = useMemo(() => {
    const bucketMap = new Map<string, number>();
    const formatBucket = (value: string) => {
      const date = new Date(value);
      if (range === "7d") {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
      return `${String(date.getHours()).padStart(2, "0")}:00`;
    };

    for (const row of filteredRows) {
      const bucket = formatBucket(row.created_at);
      bucketMap.set(bucket, (bucketMap.get(bucket) || 0) + 1);
    }

    return [...bucketMap.entries()].map(([label, errors]) => ({ label, errors }));
  }, [filteredRows, range]);

  const scopeChartData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of filteredRows) {
      const meta = asMeta(row.meta);
      const scope = asText(meta.scope);
      counts.set(scope, (counts.get(scope) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([scope, errors]) => ({ scope, errors }));
  }, [filteredRows]);

  const status500Count = useMemo(
    () => filteredRows.filter((row) => asText(asMeta(row.meta).error_status, "") === "500").length,
    [filteredRows],
  );

  const incidentIntel = useMemo(() => {
    const actionPoints = actionSummary.timeline;
    const errorPoints = timelineData;

    const avgActions = actionPoints.length
      ? actionPoints.reduce((sum, point) => sum + point.actions, 0) / actionPoints.length
      : 0;
    const avgErrors = errorPoints.length
      ? errorPoints.reduce((sum, point) => sum + point.errors, 0) / errorPoints.length
      : 0;

    const actionSpikeThreshold = Math.max(3, Math.ceil(avgActions * 1.8));
    const errorSpikeThreshold = Math.max(3, Math.ceil(avgErrors * 1.6));

    const actionSpikes = actionPoints.filter((point) => point.actions >= actionSpikeThreshold);
    const errorSpikes = errorPoints.filter((point) => point.errors >= errorSpikeThreshold);

    const recommendations: string[] = [];

    if (errorSpikes.length > actionSpikes.length) {
      recommendations.push("Error spikes are outpacing remediation actions. Consider pinning high-impact shared views for faster incident response.");
    }
    if (actionSummary.applyToErrorRatio < 0.3 && summary.total >= 20) {
      recommendations.push("Apply/Error ratio is low for the current incident volume. Encourage operators to apply saved views earlier during triage.");
    }
    if ((summary.topScopes[0]?.[1] || 0) >= Math.max(8, Math.ceil(summary.total * 0.45))) {
      recommendations.push(`Most failures are concentrated in ${summary.topScopes[0]?.[0] || "one scope"}. Prioritize a scope-specific runbook or dedicated shared view.`);
    }
    if (status500Count > 0 && actionSummary.applyActions === 0) {
      recommendations.push("Server-side failures detected without any apply actions in this window. Escalate and apply pinned incident presets immediately.");
    }
    if (recommendations.length === 0) {
      recommendations.push("Remediation activity appears aligned with current error volume. Continue monitoring and keep shared views updated.");
    }

    return {
      actionSpikes,
      errorSpikes,
      actionSpikeThreshold,
      errorSpikeThreshold,
      recommendations,
    };
  }, [actionSummary.applyActions, actionSummary.applyToErrorRatio, actionSummary.timeline, status500Count, summary.topScopes, summary.total, timelineData]);

  const previousWindowDiff = useMemo(() => {
    const previousScope = new Map<string, number>();
    const previousStatus = new Map<string, number>();

    for (const row of previousRows) {
      const meta = asMeta(row.meta);
      const scope = asText(meta.scope, "unknown");
      const status = asText(meta.error_status, "unknown");
      previousScope.set(scope, (previousScope.get(scope) || 0) + 1);
      previousStatus.set(status, (previousStatus.get(status) || 0) + 1);
    }

    const scopeChanges = summary.topScopes.slice(0, 4).map(([scope, current]) => {
      const previous = previousScope.get(scope) || 0;
      return {
        key: scope,
        current,
        previous,
        delta: current - previous,
      };
    });

    const statusChanges = summary.topStatuses.slice(0, 4).map(([status, current]) => {
      const previous = previousStatus.get(status) || 0;
      return {
        key: status,
        current,
        previous,
        delta: current - previous,
      };
    });

    return {
      scopeChanges,
      statusChanges,
    };
  }, [previousRows, summary.topScopes, summary.topStatuses]);

  const watchAlertItems = useMemo<WatchAlertItem[]>(() => {
    if (!watchModeEnabled) return [];

    const nextItems: Array<Omit<WatchAlertItem, "acknowledgedAt" | "snoozedUntil" | "snoozed" | "assigneeId" | "assigneeName" | "dueAt" | "overdue">> = [];
    const leadingScopeRegression = [...previousWindowDiff.scopeChanges]
      .sort((a, b) => b.delta - a.delta)
      .find((item) => item.delta >= 3);

    if (incidentIntel.errorSpikes.length > incidentIntel.actionSpikes.length) {
      nextItems.push({
        id: "error-spikes-outpacing-response",
        title: "Response lag detected",
        detail: `${incidentIntel.errorSpikes.length} error spikes vs ${incidentIntel.actionSpikes.length} remediation spikes in ${rangeLabel[range].toLowerCase()}.`,
        severity: "critical",
        count: incidentIntel.errorSpikes.length,
      });
    }
    if (status500Count >= 3) {
      nextItems.push({
        id: "server-failure-cluster",
        title: "500-level failure cluster",
        detail: `${status500Count} server-side failures are active in the filtered view.`,
        severity: "critical",
        count: status500Count,
      });
    }
    if (actionSummary.applyToErrorRatio < 0.25 && summary.total >= 15) {
      nextItems.push({
        id: "low-remediation-ratio",
        title: "Low remediation coverage",
        detail: `Apply/Error ratio is ${actionSummary.applyToErrorRatio} across ${summary.total} failures.`,
        severity: "elevated",
        count: summary.total,
      });
    }
    if (leadingScopeRegression) {
      nextItems.push({
        id: `scope-regression-${leadingScopeRegression.key}`,
        title: "Scope regression vs previous window",
        detail: `${leadingScopeRegression.key} increased by ${leadingScopeRegression.delta} errors from the previous window.`,
        severity: leadingScopeRegression.delta >= 8 ? "critical" : "elevated",
        count: leadingScopeRegression.delta,
      });
    }
    if (nextItems.length === 0) {
      nextItems.push({
        id: "watch-all-clear",
        title: "No active escalations",
        detail: "Watch mode is active and no immediate escalation triggers are present.",
        severity: "stable",
        count: 0,
      });
    }

    return nextItems.map((item) => {
      const state = workflow.alertState[item.id];
      const snoozedUntil = state?.snoozedUntil ?? null;
      const dueAt = state?.dueAt ?? null;
      const snoozed = snoozedUntil ? new Date(snoozedUntil).getTime() > Date.now() : false;
      const overdue = dueAt ? new Date(dueAt).getTime() < Date.now() : false;
      return {
        ...item,
        acknowledgedAt: state?.acknowledgedAt ?? null,
        snoozedUntil,
        assigneeId: state?.assigneeId ?? null,
        assigneeName: state?.assigneeName ?? null,
        dueAt,
        overdue,
        snoozed,
      };
    });
  }, [actionSummary.applyToErrorRatio, incidentIntel.actionSpikes.length, incidentIntel.errorSpikes.length, previousWindowDiff.scopeChanges, range, status500Count, summary.total, watchModeEnabled, workflow.alertState]);

  const watchTimeline = useMemo(() => {
    if (!watchModeEnabled) return [];

    const errorMap = new Map(timelineData.map((point) => [point.label, point.errors]));
    const actionMap = new Map(actionSummary.timeline.map((point) => [point.label, point.actions]));
    const orderedLabels = [...new Set([...timelineData.map((point) => point.label), ...actionSummary.timeline.map((point) => point.label)])].slice(-8);

    return orderedLabels.map((label) => {
      const errors = errorMap.get(label) || 0;
      const actions = actionMap.get(label) || 0;
      const gap = errors - actions;
      return {
        label,
        errors,
        actions,
        gap,
        status: gap > 0 ? "Lagging" : actions > 0 ? "Responding" : "Quiet",
      };
    });
  }, [actionSummary.timeline, timelineData, watchModeEnabled]);

  const displayedRunbookPhase = activeIncidentPhase || "triage";

  const currentRunbookTasks = useMemo(() => {
    const completed = new Set(runbookState[displayedRunbookPhase] || []);
    return incidentRunbookTasks[displayedRunbookPhase].map((task) => ({
      ...task,
      completed: completed.has(task.id),
    }));
  }, [displayedRunbookPhase, runbookState]);

  const scopeHealthCards = useMemo<ScopeHealthCard[]>(() => {
    const currentCounts = new Map<string, number>();
    const previousCounts = new Map<string, number>();

    for (const row of rows) {
      const scope = asText(asMeta(row.meta).scope);
      currentCounts.set(scope, (currentCounts.get(scope) || 0) + 1);
    }

    for (const row of previousRows) {
      const scope = asText(asMeta(row.meta).scope);
      previousCounts.set(scope, (previousCounts.get(scope) || 0) + 1);
    }

    const scopes = new Set([...currentCounts.keys(), ...previousCounts.keys()]);
    return [...scopes]
      .map((scope) => {
        const current = currentCounts.get(scope) || 0;
        const previous = previousCounts.get(scope) || 0;
        return {
          scope,
          current,
          previous,
          deltaPct: calcDeltaPct(current, previous),
        };
      })
      .sort((a, b) => b.current - a.current)
      .slice(0, 3);
  }, [previousRows, rows]);

  const topPages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of filteredRows) {
      const page = row.page || "unknown";
      counts.set(page, (counts.get(page) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredRows]);

  const topUsers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of filteredRows) {
      const userId = asText(asMeta(row.meta).user_id, "anonymous");
      counts.set(userId, (counts.get(userId) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredRows]);

  const showWarningBanner = filteredRows.length >= 25 || status500Count > 0;

  const activePresetId = useMemo(() => {
    const match = presets.find((preset) => (
      preset.range === range
      && preset.filters.scope === filters.scope
      && preset.filters.kind === filters.kind
      && preset.filters.status === filters.status
      && preset.filters.page === filters.page
      && preset.filters.userId === filters.userId
    ));
    return match?.id ?? null;
  }, [filters.kind, filters.page, filters.scope, filters.status, filters.userId, range]);

  const clearFilters = () => setFilters({ scope: null, kind: null, status: null, page: null, userId: null });

  const applyFilter = (next: Partial<FilterState>) => {
    setFilters((current) => ({ ...current, ...next }));
  };

  const applyPreset = (preset: Preset) => {
    setActiveIncidentPhase(null);
    setRange(preset.range);
    setFilters(preset.filters);
  };

  const toggleWatchMode = () => {
    setWatchModeEnabled((current) => {
      const next = !current;
      trackViewAction("toggle_watch_mode", "shared", undefined, { next_state: next });
      return next;
    });
  };

  const applyIncidentPhase = (phase: IncidentPhasePreset) => {
    setActiveIncidentPhase(phase.id);
    setRange(phase.range);
    setFilters(phase.filters);
    trackViewAction("apply_incident_phase", "shared", undefined, {
      incident_phase: phase.id,
    });
  };

  const saveCurrentView = () => {
    const suggested = `View ${new Date().toLocaleString()}`;
    const name = window.prompt("Save incident view as:", suggested)?.trim();
    if (!name) return;

    const next = createViewSnapshot(name);

    setSavedViews((current) => [next, ...current].slice(0, 20));
    toast.success("Saved view created");
    trackViewAction("save", "browser", next);
  };

  const applySavedView = (view: SavedView) => {
    setRange(view.range);
    setFilters(view.filters);
    trackViewAction("apply", "browser", view);
  };

  const applySharedView = (view: SavedView) => {
    setRange(view.range);
    setFilters(view.filters);
    trackViewAction("apply", "shared", view);
  };

  const deleteSavedView = (viewId: string) => {
    const target = savedViews.find((view) => view.id === viewId);
    setSavedViews((current) => current.filter((view) => view.id !== viewId));
    toast.success("Saved view removed");
    if (target) trackViewAction("delete", "browser", target);
  };

  const renameSavedView = (viewId: string) => {
    const target = savedViews.find((view) => view.id === viewId);
    if (!target) return;
    const name = window.prompt("Rename saved view:", target.name)?.trim();
    if (!name || name === target.name) return;
    setSavedViews((current) => current.map((view) => view.id === viewId
      ? { ...view, name, updatedAt: new Date().toISOString(), updatedById: user?.id ?? null, updatedByName: currentActorName }
      : view));
    toast.success("Saved view renamed");
    trackViewAction("rename", "browser", target, { new_name: name });
  };

  const duplicateSavedView = (view: SavedView) => {
    const name = window.prompt("Duplicate view as:", `${view.name} (copy)`)?.trim();
    if (!name) return;
    const next = createViewSnapshot(name);
    next.range = view.range;
    next.filters = view.filters;
    next.tags = view.tags || [];
    next.pinned = view.pinned === true;
    setSavedViews((current) => [next, ...current].slice(0, 20));
    toast.success("Saved view duplicated");
    trackViewAction("duplicate", "browser", next, { source_view_id: view.id });
  };

  const activeSavedViewId = useMemo(() => {
    const match = savedViews.find((view) => view.range === range && areFiltersEqual(view.filters, filters));
    return match?.id ?? null;
  }, [filters, range, savedViews]);

  const activeSharedViewId = useMemo(() => {
    const match = sharedViews.find((view) => view.range === range && areFiltersEqual(view.filters, filters));
    return match?.id ?? null;
  }, [filters, range, sharedViews]);

  const currentActorName = useMemo(
    () => (user?.user_metadata?.full_name as string | undefined)
      || (user?.user_metadata?.name as string | undefined)
      || user?.email
      || "Unknown admin",
    [user?.email, user?.user_metadata],
  );

  const createViewSnapshot = (name: string): SavedView => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: new Date().toISOString(),
    range,
    filters,
    tags: buildDefaultTags(filters),
    pinned: false,
    createdById: user?.id ?? null,
    createdByName: currentActorName,
    updatedAt: new Date().toISOString(),
    updatedById: user?.id ?? null,
    updatedByName: currentActorName,
  });

  const trackViewAction = (action: string, scope: "browser" | "shared", view?: SavedView, extra?: Record<string, unknown>) => {
    track("feed_diagnostics_view_action", {
      action,
      scope,
      range,
      active_scope: filters.scope,
      active_kind: filters.kind,
      active_status: filters.status,
      active_page: filters.page,
      active_user_id: filters.userId,
      view_id: view?.id ?? null,
      view_name: view?.name ?? null,
      view_pinned: view?.pinned ?? false,
      user_id: user?.id ?? null,
      ...extra,
    });
  };

  const acknowledgeWatchAlert = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      trackViewAction("ack_watch_alert", "shared", undefined, { alert_id: alertId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to acknowledge alert");
    }
  };

  const snoozeWatchAlert = async (alertId: string) => {
    try {
      await snoozeAlert(alertId, WATCH_SNOOZE_MINUTES);
      trackViewAction("snooze_watch_alert", "shared", undefined, {
        alert_id: alertId,
        snooze_minutes: WATCH_SNOOZE_MINUTES,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to snooze alert");
    }
  };

  const resetWatchAlert = async (alertId: string) => {
    try {
      await resetAlertState(alertId);
      trackViewAction("reset_watch_alert", "shared", undefined, { alert_id: alertId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset alert");
    }
  };

  const assignWatchAlertToMe = async (alertId: string) => {
    try {
      await assignAlert(alertId, { id: user?.id ?? null, name: currentActorName });
      trackViewAction("assign_watch_alert", "shared", undefined, { alert_id: alertId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign alert");
    }
  };

  const clearWatchAlertAssignee = async (alertId: string) => {
    try {
      await assignAlert(alertId, { id: null, name: null });
      trackViewAction("clear_watch_alert_assignee", "shared", undefined, { alert_id: alertId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear alert assignee");
    }
  };

  const setWatchAlertDueSoon = async (alertId: string) => {
    try {
      const dueAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await setAlertDueAt(alertId, dueAt);
      trackViewAction("set_watch_alert_due", "shared", undefined, { alert_id: alertId, due_at: dueAt });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set alert due time");
    }
  };

  const clearWatchAlertDue = async (alertId: string) => {
    try {
      await setAlertDueAt(alertId, null);
      trackViewAction("clear_watch_alert_due", "shared", undefined, { alert_id: alertId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear alert due time");
    }
  };

  const toggleRunbookTask = (phaseId: IncidentPhaseId, taskId: string) => {
    setRunbookState((current) => {
      const currentTasks = new Set(current[phaseId] || []);
      const completed = !currentTasks.has(taskId);
      if (completed) currentTasks.add(taskId);
      else currentTasks.delete(taskId);

      trackViewAction("toggle_runbook_task", "shared", undefined, {
        incident_phase: phaseId,
        runbook_task_id: taskId,
        completed,
      });

      return {
        ...current,
        [phaseId]: [...currentTasks],
      };
    });
  };

  const saveIncidentWorkflow = async () => {
    try {
      await saveWorkflow(
        {
          summary: workflowSummaryDraft.trim(),
          nextUpdateAt: workflowNextUpdateDraft ? new Date(workflowNextUpdateDraft).toISOString() : null,
          activePhase: activeIncidentPhase || workflow.activePhase,
        },
        {
          type: "workflow_update",
          message: "Updated workflow summary and next update deadline.",
        },
      );
      toast.success("Incident workflow saved");
      trackViewAction("save_incident_workflow", "shared", undefined, {
        workflow_status: workflow.status,
        workflow_priority: workflow.priority,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save incident workflow");
    }
  };

  const updateIncidentStatus = async (status: "open" | "mitigating" | "monitoring" | "resolved") => {
    try {
      await saveWorkflow(
        { status, activePhase: activeIncidentPhase || workflow.activePhase },
        { type: "workflow_update", message: `Updated incident status to ${status}.` },
      );
      toast.success("Incident status updated");
      trackViewAction("update_incident_status", "shared", undefined, { workflow_status: status });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update incident status");
    }
  };

  const updateIncidentPriority = async (priority: "sev1" | "sev2" | "sev3") => {
    try {
      await saveWorkflow(
        { priority, activePhase: activeIncidentPhase || workflow.activePhase },
        { type: "workflow_update", message: `Updated incident priority to ${priority.toUpperCase()}.` },
      );
      toast.success("Incident priority updated");
      trackViewAction("update_incident_priority", "shared", undefined, { workflow_priority: priority });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update incident priority");
    }
  };

  const claimSharedIncident = async () => {
    try {
      await claimIncident(activeIncidentPhase || workflow.activePhase);
      toast.success("Incident claimed");
      trackViewAction("claim_incident", "shared", undefined, {
        incident_phase: activeIncidentPhase || workflow.activePhase,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to claim incident");
    }
  };

  const releaseSharedIncident = async () => {
    try {
      await releaseIncident();
      toast.success("Incident released");
      trackViewAction("release_incident", "shared");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to release incident");
    }
  };

  const saveIncidentNote = async () => {
    const note = workflowNoteDraft.trim();
    if (!note) return;
    try {
      await addNote(note, activeIncidentPhase || workflow.activePhase);
      setWorkflowNoteDraft("");
      toast.success("Handoff note added");
      trackViewAction("add_incident_note", "shared", undefined, {
        incident_phase: activeIncidentPhase || workflow.activePhase,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add handoff note");
    }
  };

  const runUpgradeAllResponse = async () => {
    try {
      const nowIso = new Date().toISOString();
      const nextUpdateIso = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const computedPriority: "sev1" | "sev2" = status500Count >= 3 || incidentIntel.errorSpikes.length > incidentIntel.actionSpikes.length ? "sev1" : "sev2";
      const nextAlertState = { ...workflow.alertState };

      for (const item of watchAlertItems) {
        if (item.severity === "stable") continue;
        nextAlertState[item.id] = {
          acknowledgedAt: nowIso,
          acknowledgedById: user?.id ?? null,
          acknowledgedByName: currentActorName,
          snoozedUntil: null,
          assigneeId: user?.id ?? null,
          assigneeName: currentActorName,
          dueAt: nextUpdateIso,
        };
      }

      await saveWorkflow(
        {
          ownerId: user?.id ?? null,
          ownerName: currentActorName,
          status: "mitigating",
          priority: computedPriority,
          activePhase: activeIncidentPhase || workflow.activePhase || "triage",
          nextUpdateAt: nextUpdateIso,
          summary: workflow.summary || "Upgrade-all response initialized. Owner assigned, critical alerts acknowledged, and mitigation timeline started.",
          alertState: nextAlertState,
        },
        { type: "workflow_update", message: "Executed Upgrade All response automation." },
      );

      trackViewAction("upgrade_all_response", "shared", undefined, {
        upgraded_alerts: watchAlertItems.filter((item) => item.severity !== "stable").length,
        workflow_priority: computedPriority,
      });
      toast.success("Upgrade All response executed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run upgrade-all response");
    }
  };

  const buildChatUpdateText = () => {
    const pieces = [
      `Feed Incident Update`,
      `Status: ${workflow.status.toUpperCase()} (${workflow.priority.toUpperCase()})`,
      `Owner: ${workflow.ownerName || "Unassigned"}`,
      `Range: ${rangeLabel[range]}`,
      `Errors: ${summary.total} | 500s: ${status500Count} | Apply/Error: ${actionSummary.applyToErrorRatio}`,
      `Top Scope: ${summary.topScopes[0]?.[0] || "none"} (${summary.topScopes[0]?.[1] || 0})`,
      `Next Update: ${workflow.nextUpdateAt ? new Date(workflow.nextUpdateAt).toLocaleString() : "Not set"}`,
      workflow.summary ? `Summary: ${workflow.summary}` : "",
    ].filter((line) => line.length > 0);
    return pieces.join("\n");
  };

  const copyChatUpdate = async () => {
    try {
      await navigator.clipboard.writeText(buildChatUpdateText());
      trackViewAction("copy_chat_update", "shared");
      toast.success("Incident chat update copied");
    } catch {
      toast.error("Failed to copy chat update");
    }
  };

  const markChatUpdateAsSent = async (channel: "chat" | "slack" | "telegram") => {
    try {
      await markChatUpdateSent(channel, buildChatUpdateText());
      trackViewAction("mark_chat_update_sent", "shared", undefined, { channel });
      toast.success(`Incident update marked sent via ${channel}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark chat update");
    }
  };

  const runAutoEscalation = async () => {
    try {
      const escalated = await autoEscalateOverdue();
      if (!escalated) {
        toast.message("No overdue triggers for auto-escalation");
        return;
      }
      trackViewAction("auto_escalate_overdue", "shared", undefined, {
        overdue_alerts: overdueAlertCount,
        next_update_overdue: isNextUpdateOverdue,
      });
      toast.success("Auto-escalation applied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to auto-escalate");
    }
  };

  const updateEscalationRoute = async (role: "incident_commander" | "on_call_engineer" | "support_lead") => {
    try {
      await routeEscalation(role);
      trackViewAction("route_escalation", "shared", undefined, { escalation_role: role });
      toast.success(`Escalation routed to ${escalationRoleLabel[role]}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to route escalation");
    }
  };

  const sendOpsReminderPing = async (channel: "chat" | "slack" | "telegram") => {
    try {
      const result = await sendReminderPing(channel);
      trackViewAction("send_reminder_ping", "shared", undefined, {
        channel,
        overdue_alerts: result.overdueAlerts,
        next_update_overdue: result.overdueUpdate,
      });
      toast.success(`Reminder ping sent via ${channel}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reminder ping");
    }
  };

  const toggleReminderAutomation = async () => {
    try {
      await setReminderAutomation(!workflow.autoReminderEnabled, workflow.reminderCadenceMinutes);
      trackViewAction("toggle_reminder_automation", "shared", undefined, {
        enabled: !workflow.autoReminderEnabled,
        cadence_minutes: workflow.reminderCadenceMinutes,
      });
      toast.success(!workflow.autoReminderEnabled ? "Auto reminders enabled" : "Auto reminders disabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update reminder automation");
    }
  };

  const setReminderCadence = async (cadenceMinutes: number) => {
    try {
      await setReminderAutomation(workflow.autoReminderEnabled, cadenceMinutes);
      trackViewAction("set_reminder_cadence", "shared", undefined, {
        cadence_minutes: cadenceMinutes,
      });
      toast.success(`Reminder cadence set to ${cadenceMinutes} minutes`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update reminder cadence");
    }
  };

  const canManageSharedView = (view: SavedView) => {
    if (!user?.id) return false;
    if (isAdmin) return true;
    if (!view.createdById) return false;
    return view.createdById === user.id;
  };

  const persistSharedViews = async (nextViews: SavedView[]) => {
    if (sharedViewsSetting?.id) {
      let query = (supabase as any)
        .from("app_settings")
        .update({
          value: nextViews,
          description: "Shared incident views for admin feed diagnostics",
        })
        .eq("id", sharedViewsSetting.id);
      if (sharedViewsSetting.updated_at) {
        query = query.eq("updated_at", sharedViewsSetting.updated_at);
      }

      const { data, error } = await query.select("id").maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error("Shared views changed by another admin. Refresh and retry.");
      }
      return;
    }

    const { error } = await (supabase as any)
      .from("app_settings")
      .insert({
        tenant_id: null,
        key: SHARED_VIEWS_SETTING_KEY,
        value: nextViews,
        description: "Shared incident views for admin feed diagnostics",
      });
    if (error) throw error;
  };

  const saveSharedView = async () => {
    const suggested = `Team View ${new Date().toLocaleString()}`;
    const name = window.prompt("Save shared incident view as:", suggested)?.trim();
    if (!name) return;

    const next = createViewSnapshot(name);
    const tagInput = window.prompt("Tags (comma separated, optional):", (next.tags || []).join(", "));
    if (tagInput !== null) {
      next.tags = parseTagsInput(tagInput);
    }

    setIsSavingSharedView(true);
    try {
      await persistSharedViews([next, ...sharedViews].slice(0, 30));
      await refetchSharedViews();
      toast.success("Shared view saved");
      trackViewAction("save", "shared", next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save shared view");
    } finally {
      setIsSavingSharedView(false);
    }
  };

  const deleteSharedView = async (viewId: string) => {
    const target = sharedViews.find((view) => view.id === viewId);
    if (!target) return;
    if (!canManageSharedView(target)) {
      toast.error("You cannot delete this shared view");
      return;
    }

    setIsDeletingSharedViewId(viewId);
    try {
      await persistSharedViews(sharedViews.filter((view) => view.id !== viewId));
      await refetchSharedViews();
      toast.success("Shared view removed");
      trackViewAction("delete", "shared", target);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove shared view");
    } finally {
      setIsDeletingSharedViewId(null);
    }
  };

  const renameSharedView = async (viewId: string) => {
    const target = sharedViews.find((view) => view.id === viewId);
    if (!target) return;
    if (!canManageSharedView(target)) {
      toast.error("You cannot rename this shared view");
      return;
    }
    const name = window.prompt("Rename shared view:", target.name)?.trim();
    if (!name || name === target.name) return;

    setIsDeletingSharedViewId(viewId);
    try {
      const updated = sharedViews.map((view) => view.id === viewId
        ? {
            ...view,
            name,
            updatedAt: new Date().toISOString(),
            updatedById: user?.id ?? null,
            updatedByName: currentActorName,
          }
        : view);
      await persistSharedViews(updated);
      await refetchSharedViews();
      toast.success("Shared view renamed");
      trackViewAction("rename", "shared", target, { new_name: name });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename shared view");
    } finally {
      setIsDeletingSharedViewId(null);
    }
  };

  const duplicateSharedView = async (view: SavedView) => {
    const name = window.prompt("Duplicate shared view as:", `${view.name} (copy)`)?.trim();
    if (!name) return;
    const next = createViewSnapshot(name);
    next.range = view.range;
    next.filters = view.filters;
    next.pinned = view.pinned === true;
    const tagInput = window.prompt("Tags for duplicated view (comma separated):", (view.tags || []).join(", "));
    if (tagInput !== null) {
      next.tags = parseTagsInput(tagInput);
    }

    setIsSavingSharedView(true);
    try {
      await persistSharedViews([next, ...sharedViews].slice(0, 30));
      await refetchSharedViews();
      toast.success("Shared view duplicated");
      trackViewAction("duplicate", "shared", next, { source_view_id: view.id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate shared view");
    } finally {
      setIsSavingSharedView(false);
    }
  };

  const toggleSharedViewPin = async (viewId: string) => {
    const target = sharedViews.find((view) => view.id === viewId);
    if (!target) return;
    if (!canManageSharedView(target)) {
      toast.error("You cannot pin this shared view");
      return;
    }

    setIsDeletingSharedViewId(viewId);
    try {
      const updated = sharedViews.map((view) => view.id === viewId
        ? {
            ...view,
            pinned: !view.pinned,
            updatedAt: new Date().toISOString(),
            updatedById: user?.id ?? null,
            updatedByName: currentActorName,
          }
        : view);
      await persistSharedViews(updated);
      await refetchSharedViews();
      toast.success(target.pinned ? "Shared view unpinned" : "Shared view pinned");
      trackViewAction(target.pinned ? "unpin" : "pin", "shared", { ...target, pinned: !target.pinned });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update pin");
    } finally {
      setIsDeletingSharedViewId(null);
    }
  };

  const toggleExpandedRow = (rowId: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const exportFilteredCsv = () => {
    const rowsForCsv: (string | number)[][] = [
      ["Time", "Scope", "Kind", "Status", "Page", "Message", "User ID", "Tab", "Page Size", "Page Multiplier"],
      ...filteredRows.map((row) => {
        const meta = asMeta(row.meta);
        return [
          new Date(row.created_at).toISOString(),
          asText(meta.scope),
          asText(meta.error_kind),
          asText(meta.error_status),
          row.page || "",
          asText(meta.error_message, ""),
          asText(meta.user_id, ""),
          asText(meta.tab, ""),
          asText(meta.page_size, ""),
          asText(meta.page_multiplier, ""),
        ];
      }),
    ];

    const csv = buildCsv(rowsForCsv);
    const filename = [
      "feed-diagnostics",
      range,
      sanitizeSegment(filters.scope),
      sanitizeSegment(filters.kind),
      sanitizeSegment(filters.status),
      sanitizeSegment(filters.page),
      sanitizeSegment(filters.userId),
    ].join("-") + ".csv";

    downloadCsv(filename, csv);
  };

  const exportFilteredJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      range,
      filters,
      totalRows: filteredRows.length,
      rows: filteredRows.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        page: row.page,
        ...asMeta(row.meta),
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = [
      "feed-diagnostics",
      range,
      sanitizeSegment(filters.scope),
      sanitizeSegment(filters.kind),
      sanitizeSegment(filters.status),
      sanitizeSegment(filters.page),
      sanitizeSegment(filters.userId),
    ].join("-") + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copyCurrentLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Diagnostics link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <AdminLayout title="Feed Diagnostics">
      <div className="max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Feed Diagnostics</h1>
            <p className="text-sm text-muted-foreground">
              Live view of feed query failures captured by analytics telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(["1h", "24h", "7d"] as const).map((key) => (
              <Button
                key={key}
                type="button"
                variant={range === key ? "default" : "outline"}
                size="sm"
                onClick={() => setRange(key)}
              >
                {rangeLabel[key]}
              </Button>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={exportFilteredCsv} className="gap-2" disabled={filteredRows.length === 0}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={exportFilteredJson} className="gap-2" disabled={filteredRows.length === 0}>
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void copyCurrentLink()}>
              Copy link
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant={activePresetId === preset.id ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </Button>
          ))}
          <Button
            type="button"
            variant={watchModeEnabled ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={toggleWatchMode}
          >
            <BellRing className="h-3.5 w-3.5" />
            {watchModeEnabled ? "Watch On" : "Watch Off"}
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Incident Phases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
              {incidentPhasePresets.map((phase) => (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => applyIncidentPhase(phase)}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left transition-colors",
                    activeIncidentPhase === phase.id
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/40",
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{phase.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{phase.description}</p>
                </button>
              ))}
            </div>
            {watchModeEnabled && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Watch mode alerts</p>
                {watchAlertItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <Badge variant={alertBadgeVariant(item.severity)}>{item.count}</Badge>
                        {item.acknowledgedAt && <Badge variant="secondary">Ack</Badge>}
                        {item.snoozed && <Badge variant="outline">Snoozed</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={isWorkflowSaving} onClick={() => void acknowledgeWatchAlert(item.id)}>
                        Ack
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={isWorkflowSaving} onClick={() => void snoozeWatchAlert(item.id)}>
                        Snooze {WATCH_SNOOZE_MINUTES}m
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={isWorkflowSaving} onClick={() => void assignWatchAlertToMe(item.id)}>
                        Assign me
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={isWorkflowSaving} onClick={() => void setWatchAlertDueSoon(item.id)}>
                        Due +30m
                      </Button>
                      {item.assigneeName && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={isWorkflowSaving} onClick={() => void clearWatchAlertAssignee(item.id)}>
                          Clear assignee
                        </Button>
                      )}
                      {item.dueAt && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={isWorkflowSaving} onClick={() => void clearWatchAlertDue(item.id)}>
                          Clear due
                        </Button>
                      )}
                      {(item.acknowledgedAt || item.snoozedUntil) && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={isWorkflowSaving} onClick={() => void resetWatchAlert(item.id)}>
                          Reset
                        </Button>
                      )}
                    </div>
                    <div className="basis-full text-xs text-muted-foreground">
                      {item.assigneeName ? `Assignee: ${item.assigneeName}` : "Assignee: none"}
                      {item.dueAt ? ` • Due: ${new Date(item.dueAt).toLocaleString()}${item.overdue ? " (overdue)" : ""}` : " • Due: not set"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phase runbook</p>
                <Badge variant="outline">{displayedRunbookPhase}</Badge>
              </div>
              {currentRunbookTasks.map((task) => (
                <button
                  key={`${displayedRunbookPhase}-${task.id}`}
                  type="button"
                  onClick={() => toggleRunbookTask(displayedRunbookPhase, task.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                    task.completed
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 hover:bg-background/70",
                  )}
                >
                  <span className="pr-3 text-sm text-foreground">{task.label}</span>
                  <Badge variant={task.completed ? "default" : "secondary"}>{task.completed ? "Done" : "Open"}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Incident Coordination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="text-sm font-semibold text-foreground">{workflow.ownerName || "Unassigned"}</p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-semibold uppercase text-foreground">{workflow.status}</p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Priority</p>
                <p className="text-sm font-semibold uppercase text-foreground">{workflow.priority}</p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Next update</p>
                <p className="text-sm font-semibold text-foreground">
                  {workflow.nextUpdateAt ? new Date(workflow.nextUpdateAt).toLocaleString() : "Not set"}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2 md:col-span-2">
                <p className="text-xs text-muted-foreground">Escalation route</p>
                <p className="text-sm font-semibold text-foreground">
                  {workflow.escalationRole ? escalationRoleLabel[workflow.escalationRole] : "Not set"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {workflow.lastReminderAt
                    ? `Last reminder ${new Date(workflow.lastReminderAt).toLocaleString()} via ${workflow.lastReminderChannel || "unknown"}`
                    : "No reminder pings sent yet."}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2 md:col-span-2">
                <p className="text-xs text-muted-foreground">Auto reminder policy</p>
                <p className="text-sm font-semibold text-foreground">
                  {workflow.autoReminderEnabled ? `Every ${workflow.reminderCadenceMinutes} minutes` : "Disabled"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isReminderSuppressed
                    ? "Suppressed while incident is monitoring or resolved."
                    : nextAutoReminderAt
                      ? `Next automatic reminder after ${new Date(nextAutoReminderAt).toLocaleString()}`
                      : hasReminderTrigger
                        ? "Will send immediately on next eligible cycle."
                        : "Waiting for an overdue update or overdue alert task."}
                </p>
              </div>
            </div>

            {isNextUpdateOverdue && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
                Incident update is overdue. Post a handoff note and set a new update deadline.
              </div>
            )}

            {overdueAlertCount > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
                {overdueAlertCount} alert task{overdueAlertCount === 1 ? " is" : "s are"} overdue.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {(["open", "mitigating", "monitoring", "resolved"] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant={workflow.status === status ? "default" : "outline"}
                  size="sm"
                  disabled={isWorkflowSaving}
                  onClick={() => void updateIncidentStatus(status)}
                >
                  {status}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["sev1", "sev2", "sev3"] as const).map((priority) => (
                <Button
                  key={priority}
                  type="button"
                  variant={workflow.priority === priority ? "default" : "outline"}
                  size="sm"
                  disabled={isWorkflowSaving}
                  onClick={() => void updateIncidentPriority(priority)}
                >
                  {priority.toUpperCase()}
                </Button>
              ))}
              <Button type="button" variant="outline" size="sm" disabled={isWorkflowSaving || isWorkflowLoading} onClick={() => void claimSharedIncident()}>
                Claim incident
              </Button>
              {workflow.ownerId && (
                <Button type="button" variant="outline" size="sm" disabled={isWorkflowSaving} onClick={() => void releaseSharedIncident()}>
                  Release owner
                </Button>
              )}
              <Button type="button" size="sm" disabled={isWorkflowSaving} onClick={() => void runUpgradeAllResponse()}>
                Upgrade All Response
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyChatUpdate()}>
                Copy chat update
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={isWorkflowSaving} onClick={() => void markChatUpdateAsSent("chat")}>Sent via chat</Button>
              <Button type="button" variant="outline" size="sm" disabled={isWorkflowSaving} onClick={() => void markChatUpdateAsSent("slack")}>Sent via Slack</Button>
              <Button type="button" variant="outline" size="sm" disabled={isWorkflowSaving} onClick={() => void markChatUpdateAsSent("telegram")}>Sent via Telegram</Button>
              <Button type="button" variant="outline" size="sm" disabled={isWorkflowSaving} onClick={() => void runAutoEscalation()}>
                Auto escalate
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={isWorkflowSaving} onClick={() => void sendOpsReminderPing("chat")}>
                Reminder chat
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={isWorkflowSaving} onClick={() => void sendOpsReminderPing("slack")}>
                Reminder Slack
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={isWorkflowSaving} onClick={() => void sendOpsReminderPing("telegram")}>
                Reminder Telegram
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => navigate("/chat")}>Open chat</Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["incident_commander", "on_call_engineer", "support_lead"] as const).map((role) => (
                <Button
                  key={role}
                  type="button"
                  variant={workflow.escalationRole === role ? "default" : "outline"}
                  size="sm"
                  disabled={isWorkflowSaving}
                  onClick={() => void updateEscalationRoute(role)}
                >
                  Route: {escalationRoleLabel[role]}
                </Button>
              ))}
              <Button type="button" variant={workflow.autoReminderEnabled ? "default" : "outline"} size="sm" disabled={isWorkflowSaving} onClick={() => void toggleReminderAutomation()}>
                {workflow.autoReminderEnabled ? "Auto reminders on" : "Auto reminders off"}
              </Button>
              {([10, 15, 30] as const).map((cadence) => (
                <Button
                  key={cadence}
                  type="button"
                  variant={workflow.reminderCadenceMinutes === cadence ? "default" : "outline"}
                  size="sm"
                  disabled={isWorkflowSaving}
                  onClick={() => void setReminderCadence(cadence)}
                >
                  Every {cadence}m
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shared summary</p>
                  <Textarea
                    value={workflowSummaryDraft}
                    onChange={(event) => setWorkflowSummaryDraft(event.target.value)}
                    placeholder="Capture the current incident summary, impact, and mitigation state."
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next update deadline</p>
                  <Input
                    type="datetime-local"
                    value={workflowNextUpdateDraft}
                    onChange={(event) => setWorkflowNextUpdateDraft(event.target.value)}
                  />
                </div>
                <Button type="button" size="sm" disabled={isWorkflowSaving} onClick={() => void saveIncidentWorkflow()}>
                  {isWorkflowSaving ? "Saving..." : "Save workflow"}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Handoff note</p>
                  <Textarea
                    value={workflowNoteDraft}
                    onChange={(event) => setWorkflowNoteDraft(event.target.value)}
                    placeholder="Add a note for the next operator: scope, action taken, blockers, or rollback context."
                    className="min-h-[120px]"
                  />
                  <Button type="button" variant="outline" size="sm" disabled={isWorkflowSaving || workflowNoteDraft.trim().length === 0} onClick={() => void saveIncidentNote()}>
                    Add handoff note
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent handoff log</p>
                  {workflow.notes.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
                      No shared notes yet.
                    </p>
                  ) : (
                    workflow.notes.slice(0, 5).map((note) => (
                      <div key={note.id} className="rounded-lg border border-border/60 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{note.authorName}</p>
                          {note.phaseId && <Badge variant="outline">{note.phaseId}</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-foreground">{note.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Incident event timeline</p>
                  {workflow.events.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
                      No workflow events yet.
                    </p>
                  ) : (
                    workflow.events.slice(0, 6).map((event) => (
                      <div key={event.id} className="rounded-lg border border-border/60 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{event.type}</Badge>
                          <p className="text-sm font-medium text-foreground">{event.authorName}</p>
                        </div>
                        <p className="mt-1 text-sm text-foreground">{event.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comms dispatch log</p>
                  {workflow.dispatches.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
                      No communication dispatches recorded yet.
                    </p>
                  ) : (
                    workflow.dispatches.slice(0, 5).map((dispatch) => (
                      <div key={dispatch.id} className="rounded-lg border border-border/60 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{dispatch.channel}</Badge>
                          <p className="text-sm font-medium text-foreground">{dispatch.sentByName}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(dispatch.sentAt).toLocaleString()}</p>
                        <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{dispatch.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Saved Incident Views</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={saveCurrentView}>
                <Save className="h-3.5 w-3.5" />
                Save browser view
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void saveSharedView()} disabled={isSavingSharedView}>
                <Save className="h-3.5 w-3.5" />
                {isSavingSharedView ? "Saving..." : "Save shared view"}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Browser-only views</p>
                {savedViews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No browser views yet.</p>
                ) : (
                  savedViews.map((view) => (
                    <div key={view.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => applySavedView(view)}
                          className={cn(
                            "text-left text-sm font-medium",
                            activeSavedViewId === view.id ? "text-primary" : "text-foreground",
                          )}
                        >
                          {view.name}
                        </button>
                        <p className="text-xs text-muted-foreground">Saved {new Date(view.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">{rangeLabel[view.range]}</Badge>
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => renameSavedView(view.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => duplicateSavedView(view)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => deleteSavedView(view.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team shared views</p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={sharedViewSearch}
                    onChange={(event) => setSharedViewSearch(event.target.value)}
                    placeholder="Search shared views"
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={sharedPinnedOnly ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSharedPinnedOnly((current) => !current);
                        trackViewAction("toggle_pinned_filter", "shared", undefined, { next_state: !sharedPinnedOnly });
                      }}
                    >
                      Pinned
                    </Button>
                    <Button
                      type="button"
                      variant={sharedTagFilter === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSharedTagFilter(null)}
                    >
                      All tags
                    </Button>
                    {sharedTagOptions.map((tag) => (
                      <Button
                        key={tag}
                        type="button"
                        variant={sharedTagFilter === tag ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSharedTagFilter((current) => current === tag ? null : tag)}
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                </div>
                {isSharedViewsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading shared views...</p>
                ) : filteredSharedViews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shared views yet.</p>
                ) : (
                  filteredSharedViews.map((view) => (
                    <div key={view.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => applySharedView(view)}
                          className={cn(
                            "text-left text-sm font-medium",
                            activeSharedViewId === view.id ? "text-primary" : "text-foreground",
                          )}
                        >
                          {view.name}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          Owner: {view.createdByName || "Unknown"}
                          {view.updatedAt ? ` • Updated ${new Date(view.updatedAt).toLocaleString()}` : ""}
                        </p>
                        {(view.tags || []).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(view.tags || []).map((tag) => (
                              <Badge key={`${view.id}-${tag}`} variant="secondary" className="px-2 py-0 text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {view.pinned && <Badge variant="secondary">Pinned</Badge>}
                        <Badge variant="outline">{rangeLabel[view.range]}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => void toggleSharedViewPin(view.id)}
                          disabled={isDeletingSharedViewId === view.id || !canManageSharedView(view)}
                        >
                          {view.pinned ? "Unpin" : "Pin"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => void renameSharedView(view.id)}
                          disabled={isDeletingSharedViewId === view.id || !canManageSharedView(view)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => void duplicateSharedView(view)}
                          disabled={isSavingSharedView}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => void deleteSharedView(view.id)}
                          disabled={isDeletingSharedViewId === view.id || !canManageSharedView(view)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Saved View Usage ({rangeLabel[range]})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Total actions</p>
                <p className="text-xl font-bold text-foreground">{actionSummary.total}</p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Apply actions</p>
                <p className="text-xl font-bold text-foreground">{actionSummary.applyActions}</p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Save and duplicate</p>
                <p className="text-xl font-bold text-foreground">{actionSummary.saveActions}</p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Apply/Error ratio</p>
                <p className="text-xl font-bold text-foreground">{actionSummary.applyToErrorRatio}</p>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={actionSummary.timeline} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="actions" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.18} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top actions</p>
                {actionSummary.topActions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No usage events in current range.</p>
                ) : (
                  actionSummary.topActions.map(([action, count]) => (
                    <div key={action} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <span className="text-sm text-foreground">{action}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top used views</p>
                {actionSummary.topViews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No view usage captured yet.</p>
                ) : (
                  actionSummary.topViews.map(([viewName, count]) => (
                    <div key={viewName} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <span className="truncate pr-3 text-sm text-foreground">{viewName}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 xl:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top admins by actions</p>
                {actionSummary.topAdmins.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No admin usage captured yet.</p>
                ) : (
                  actionSummary.topAdmins.map(([adminId, count]) => (
                    <div key={adminId} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <span className="truncate pr-3 text-sm text-foreground">{adminId}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Incident Intelligence ({rangeLabel[range]})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Action spikes</p>
                <p className="text-xl font-bold text-foreground">{incidentIntel.actionSpikes.length}</p>
                <p className="text-[11px] text-muted-foreground">Threshold {incidentIntel.actionSpikeThreshold}+</p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Error spikes</p>
                <p className="text-xl font-bold text-foreground">{incidentIntel.errorSpikes.length}</p>
                <p className="text-[11px] text-muted-foreground">Threshold {incidentIntel.errorSpikeThreshold}+</p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Top impacted scope</p>
                <p className="truncate text-sm font-semibold text-foreground">{summary.topScopes[0]?.[0] || "none"}</p>
                <p className="text-[11px] text-muted-foreground">{summary.topScopes[0]?.[1] || 0} errors</p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Recommended priority</p>
                <p className="text-sm font-semibold text-foreground">
                  {incidentIntel.errorSpikes.length > incidentIntel.actionSpikes.length ? "Increase response" : "Maintain response"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operational recommendations</p>
              {incidentIntel.recommendations.map((item) => (
                <div key={item} className="rounded-lg border border-border/60 px-3 py-2 text-sm text-foreground">
                  {item}
                </div>
              ))}
            </div>

            {watchModeEnabled && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Watch stream</p>
                {watchTimeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No watch stream available yet.</p>
                ) : (
                  watchTimeline.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">Errors {item.errors} • Actions {item.actions}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.gap > 0 ? "destructive" : item.actions > 0 ? "default" : "secondary"}>
                          {item.status}
                        </Badge>
                        <Badge variant="outline">{item.gap > 0 ? `+${item.gap}` : item.gap}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Previous Window Diff ({rangeLabel[range]})</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope changes</p>
              {previousWindowDiff.scopeChanges.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scope data available.</p>
              ) : (
                previousWindowDiff.scopeChanges.map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                    <span className="truncate pr-3 text-sm text-foreground">{item.key}</span>
                    <Badge variant={item.delta > 0 ? "destructive" : "secondary"}>
                      {item.delta > 0 ? "+" : ""}{item.delta}
                    </Badge>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status changes</p>
              {previousWindowDiff.statusChanges.length === 0 ? (
                <p className="text-sm text-muted-foreground">No status data available.</p>
              ) : (
                previousWindowDiff.statusChanges.map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                    <span className="truncate pr-3 text-sm text-foreground">{item.key}</span>
                    <Badge variant={item.delta > 0 ? "destructive" : "secondary"}>
                      {item.delta > 0 ? "+" : ""}{item.delta}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {showWarningBanner && (
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold text-foreground">Feed error volume needs review</p>
                <p className="text-sm text-muted-foreground">
                  {status500Count > 0
                    ? `${status500Count} server-side failures detected in the current view.`
                    : `${filteredRows.length} feed failures recorded in the current view.`}
                </p>
              </div>
            </div>
            {(filters.scope || filters.kind || filters.status || filters.page || filters.userId) && (
              <Button type="button" variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summary.total}</p>
                <p className="text-xs text-muted-foreground">Errors ({rangeLabel[range]})</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                <ShieldAlert className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summary.uniqueKinds}</p>
                <p className="text-xs text-muted-foreground">Distinct Error Kinds</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
                <AlertTriangle className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summary.uniqueScopes}</p>
                <p className="text-xs text-muted-foreground">Affected Feed Scopes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {scopeHealthCards.map((card) => (
            <Card key={card.scope}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{card.scope}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{card.current}</p>
                    <p className="text-xs text-muted-foreground">Previous window: {card.previous}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={getScopeSeverity(card.current, card.deltaPct).variant}>
                      {getScopeSeverity(card.current, card.deltaPct).label}
                    </Badge>
                    <Badge variant={card.deltaPct !== null && card.deltaPct > 0 ? "destructive" : "secondary"}>
                      {card.deltaPct === null ? "n/a" : `${card.deltaPct > 0 ? "+" : ""}${card.deltaPct}%`}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Error Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="errors" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.18} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Scopes by Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scopeChartData} layout="vertical" margin={{ top: 8, right: 12, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="scope" type="category" width={120} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                      }}
                    />
                    <Bar dataKey="errors" fill="hsl(var(--primary))" radius={[6, 6, 6, 6]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 text-xs">
            Showing {filteredRows.length} of {rows.length}
          </Badge>
          {filters.scope && <Badge variant="secondary" className="px-3 py-1 text-xs">Scope: {filters.scope}</Badge>}
          {filters.kind && <Badge variant="secondary" className="px-3 py-1 text-xs">Kind: {filters.kind}</Badge>}
          {filters.status && <Badge variant="secondary" className="px-3 py-1 text-xs">Status: {filters.status}</Badge>}
          {filters.page && <Badge variant="secondary" className="px-3 py-1 text-xs">Page: {filters.page}</Badge>}
          {filters.userId && <Badge variant="secondary" className="px-3 py-1 text-xs">User: {filters.userId}</Badge>}
          {(filters.scope || filters.kind || filters.status || filters.page || filters.userId) && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Clear all filters</Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Failing Pages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topPages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No page data in current view.</p>
              ) : topPages.map(([page, count]) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => applyFilter({ page: filters.page === page ? null : page })}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                    filters.page === page
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/40",
                  )}
                >
                  <span className="truncate pr-3 text-sm text-foreground">{page}</span>
                  <Badge variant="secondary">{count}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Affected Users</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No user data in current view.</p>
              ) : topUsers.map(([userId, count]) => (
                <button
                  key={userId}
                  type="button"
                  onClick={() => applyFilter({ userId: filters.userId === userId ? null : userId })}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                    filters.userId === userId
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/40",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2 truncate pr-3 text-sm text-foreground">
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{userId}</span>
                  </span>
                  <Badge variant="secondary">{count}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Scopes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.topScopes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data in selected range.</p>
              ) : (
                summary.topScopes.map(([scope, count]) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => applyFilter({ scope: filters.scope === scope ? null : scope })}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                      filters.scope === scope
                        ? "border-primary bg-primary/5"
                        : "border-border/60 hover:bg-muted/40",
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{scope}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Error Kinds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.topKinds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data in selected range.</p>
              ) : (
                summary.topKinds.map(([kind, count]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => applyFilter({ kind: filters.kind === kind ? null : kind })}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                      filters.kind === kind
                        ? "border-primary bg-primary/5"
                        : "border-border/60 hover:bg-muted/40",
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{kind}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Status Codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.topStatuses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data in selected range.</p>
              ) : (
                summary.topStatuses.map(([status, count]) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => applyFilter({ status: filters.status === status ? null : status })}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                      filters.status === status
                        ? "border-primary bg-primary/5"
                        : "border-border/60 hover:bg-muted/40",
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{status}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Feed Errors</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading diagnostics…</p>
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feed query errors captured in {rangeLabel[range].toLowerCase()}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2">Detail</th>
                      <th className="px-2 py-2">Time</th>
                      <th className="px-2 py-2">Scope</th>
                      <th className="px-2 py-2">Kind</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Page</th>
                      <th className="px-2 py-2">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.slice(0, 60).map((row) => {
                      const meta = asMeta(row.meta);
                      const isExpanded = expandedRows.has(row.id);
                      const rowPage = row.page || "unknown";
                      const rowUserId = asText(meta.user_id, "anonymous");
                      return (
                        <Fragment key={row.id}>
                          <tr className="border-b border-border/40 align-top">
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => toggleExpandedRow(row.id)}
                                className="rounded-md p-1 hover:bg-muted"
                                aria-label={isExpanded ? "Collapse row details" : "Expand row details"}
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                              {new Date(row.created_at).toLocaleString()}
                            </td>
                            <td className="px-2 py-2">{asText(meta.scope)}</td>
                            <td className="px-2 py-2">{asText(meta.error_kind)}</td>
                            <td className="px-2 py-2">{asText(meta.error_status)}</td>
                            <td className="px-2 py-2 text-muted-foreground">{row.page || "-"}</td>
                            <td className="px-2 py-2 max-w-[420px] truncate" title={asText(meta.error_message, "")}>{asText(meta.error_message, "-")}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="border-b border-border/40 bg-muted/20 align-top">
                              <td colSpan={7} className="px-4 py-3">
                                <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
                                  <div className="space-y-3 text-sm">
                                    <div className="flex flex-wrap gap-2">
                                      <Button type="button" variant="outline" size="sm" onClick={() => applyFilter({ scope: asText(meta.scope) })}>Scope: {asText(meta.scope)}</Button>
                                      <Button type="button" variant="outline" size="sm" onClick={() => applyFilter({ kind: asText(meta.error_kind) })}>Kind: {asText(meta.error_kind)}</Button>
                                      <Button type="button" variant="outline" size="sm" onClick={() => applyFilter({ status: asText(meta.error_status) })}>Status: {asText(meta.error_status)}</Button>
                                      <Button type="button" variant="outline" size="sm" onClick={() => applyFilter({ page: rowPage })}>Page: {rowPage}</Button>
                                      <Button type="button" variant="outline" size="sm" onClick={() => applyFilter({ userId: rowUserId })}>User: {rowUserId}</Button>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                                      <span className="text-muted-foreground">User ID</span>
                                      <span className="truncate text-right text-foreground">{rowUserId}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                                      <span className="text-muted-foreground">Tab</span>
                                      <span className="text-foreground">{asText(meta.tab, "-")}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                                      <span className="text-muted-foreground">Page Size</span>
                                      <span className="text-foreground">{asText(meta.page_size, "-")}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                                      <span className="text-muted-foreground">Page Multiplier</span>
                                      <span className="text-foreground">{asText(meta.page_multiplier, "-")}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Raw Event</p>
                                    <pre className="max-h-64 overflow-auto rounded-xl border border-border/60 bg-background p-3 text-xs text-foreground">{JSON.stringify({
                                      id: row.id,
                                      created_at: row.created_at,
                                      page: row.page,
                                      meta,
                                    }, null, 2)}</pre>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
