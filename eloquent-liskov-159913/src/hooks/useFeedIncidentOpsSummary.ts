import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FeedIncidentRange = "1h" | "24h" | "7d";
export type FeedIncidentSeverity = "critical" | "elevated" | "stable";
export type FeedIncidentPhase = "detect" | "triage" | "stabilize" | "recover";

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

type FeedIncidentAlert = {
  id: string;
  title: string;
  detail: string;
  severity: FeedIncidentSeverity;
  count: number;
};

type FeedIncidentTimelinePoint = {
  label: string;
  errors: number;
  actions: number;
  gap: number;
};

export type FeedIncidentOpsSummary = {
  isLoading: boolean;
  totalErrors: number;
  totalActions: number;
  applyActions: number;
  applyToErrorRatio: number;
  status500Count: number;
  topScope: string;
  topScopeCount: number;
  lastErrorAt: string | null;
  actionSpikeCount: number;
  errorSpikeCount: number;
  recommendedPhase: FeedIncidentPhase;
  severity: FeedIncidentSeverity;
  alerts: FeedIncidentAlert[];
  watchTimeline: FeedIncidentTimelinePoint[];
  primaryPath: string;
  criticalPath: string;
  phasePath: string;
  rangeLabel: string;
};

const RANGE_LABEL: Record<FeedIncidentRange, string> = {
  "1h": "Last 1h",
  "24h": "Last 24h",
  "7d": "Last 7d",
};

function sinceIso(range: FeedIncidentRange): string {
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

function buildFeedDiagnosticsPath(range: FeedIncidentRange, filters?: Record<string, string | null>) {
  const params = new URLSearchParams();
  params.set("range", range);
  for (const [key, value] of Object.entries(filters || {})) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return `/admin/feed-diagnostics${query ? `?${query}` : ""}`;
}

function formatBucket(value: string, range: FeedIncidentRange): string {
  const date = new Date(value);
  if (range === "7d") {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  return `${String(date.getHours()).padStart(2, "0")}:00`;
}

export function useFeedIncidentOpsSummary(range: FeedIncidentRange = "24h"): FeedIncidentOpsSummary {
  const since = useMemo(() => sinceIso(range), [range]);

  const { data: errorRows = [], isLoading: isErrorsLoading } = useQuery({
    queryKey: ["feed-incident-ops-errors", range],
    queryFn: async (): Promise<FeedErrorRow[]> => {
      const { data, error } = await (supabase as any)
        .from("analytics_events")
        .select("id, created_at, page, meta")
        .eq("event_name", "feed_query_error")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as FeedErrorRow[];
    },
    refetchInterval: 60_000,
  });

  const { data: actionRows = [], isLoading: isActionsLoading } = useQuery({
    queryKey: ["feed-incident-ops-actions", range],
    queryFn: async (): Promise<FeedViewActionRow[]> => {
      const { data, error } = await (supabase as any)
        .from("analytics_events")
        .select("id, created_at, meta")
        .eq("event_name", "feed_diagnostics_view_action")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(800);
      if (error) throw error;
      return (data || []) as FeedViewActionRow[];
    },
    refetchInterval: 60_000,
  });

  return useMemo(() => {
    const scopeCounts = new Map<string, number>();
    const errorTimelineMap = new Map<string, number>();
    const actionTimelineMap = new Map<string, number>();

    for (const row of errorRows) {
      const meta = asMeta(row.meta);
      const scope = asText(meta.scope, "unknown");
      scopeCounts.set(scope, (scopeCounts.get(scope) || 0) + 1);
      const bucket = formatBucket(row.created_at, range);
      errorTimelineMap.set(bucket, (errorTimelineMap.get(bucket) || 0) + 1);
    }

    const actionCounts = new Map<string, number>();
    for (const row of actionRows) {
      const meta = asMeta(row.meta);
      const action = asText(meta.action, "unknown");
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
      const bucket = formatBucket(row.created_at, range);
      actionTimelineMap.set(bucket, (actionTimelineMap.get(bucket) || 0) + 1);
    }

    const totalErrors = errorRows.length;
    const totalActions = actionRows.length;
    const applyActions = actionCounts.get("apply") || 0;
    const applyToErrorRatio = totalErrors > 0
      ? Number((applyActions / totalErrors).toFixed(2))
      : applyActions > 0 ? applyActions : 0;
    const status500Count = errorRows.filter((row) => asText(asMeta(row.meta).error_status, "") === "500").length;
    const [topScope = "none", topScopeCount = 0] = [...scopeCounts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    const lastErrorAt = errorRows[0]?.created_at || null;

    const watchTimeline = [...new Set([...errorTimelineMap.keys(), ...actionTimelineMap.keys()])]
      .map((label) => {
        const errors = errorTimelineMap.get(label) || 0;
        const actions = actionTimelineMap.get(label) || 0;
        return {
          label,
          errors,
          actions,
          gap: errors - actions,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-8);

    const avgErrors = watchTimeline.length
      ? watchTimeline.reduce((sum, item) => sum + item.errors, 0) / watchTimeline.length
      : 0;
    const avgActions = watchTimeline.length
      ? watchTimeline.reduce((sum, item) => sum + item.actions, 0) / watchTimeline.length
      : 0;
    const errorSpikeThreshold = Math.max(3, Math.ceil(avgErrors * 1.6));
    const actionSpikeThreshold = Math.max(3, Math.ceil(avgActions * 1.8));
    const errorSpikeCount = watchTimeline.filter((item) => item.errors >= errorSpikeThreshold).length;
    const actionSpikeCount = watchTimeline.filter((item) => item.actions >= actionSpikeThreshold).length;

    const alerts: FeedIncidentAlert[] = [];
    if (errorSpikeCount > actionSpikeCount) {
      alerts.push({
        id: "response-lag",
        title: "Response lag",
        detail: `${errorSpikeCount} error spikes are outpacing ${actionSpikeCount} remediation spikes.`,
        severity: "critical",
        count: errorSpikeCount,
      });
    }
    if (status500Count >= 3) {
      alerts.push({
        id: "server-failures",
        title: "500 cluster",
        detail: `${status500Count} server-side feed failures detected in ${RANGE_LABEL[range].toLowerCase()}.`,
        severity: "critical",
        count: status500Count,
      });
    }
    if (applyToErrorRatio < 0.3 && totalErrors >= 12) {
      alerts.push({
        id: "coverage-gap",
        title: "Low remediation coverage",
        detail: `Apply/Error ratio is ${applyToErrorRatio} across ${totalErrors} failures.`,
        severity: "elevated",
        count: totalErrors,
      });
    }
    if (topScopeCount >= Math.max(6, Math.ceil(totalErrors * 0.4)) && topScope !== "none") {
      alerts.push({
        id: "scope-concentration",
        title: "Scope concentration",
        detail: `${topScope} accounts for ${topScopeCount} recent failures.`,
        severity: topScopeCount >= 10 ? "critical" : "elevated",
        count: topScopeCount,
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        id: "all-clear",
        title: "No active escalations",
        detail: "Feed incident pressure is currently stable.",
        severity: "stable",
        count: 0,
      });
    }

    const severity: FeedIncidentSeverity = alerts.some((item) => item.severity === "critical")
      ? "critical"
      : alerts.some((item) => item.severity === "elevated")
        ? "elevated"
        : "stable";

    const recommendedPhase: FeedIncidentPhase = severity === "critical"
      ? "detect"
      : totalErrors > 0 && topScope !== "none"
        ? "triage"
        : applyActions > 0
          ? "recover"
          : "stabilize";

    return {
      isLoading: isErrorsLoading || isActionsLoading,
      totalErrors,
      totalActions,
      applyActions,
      applyToErrorRatio,
      status500Count,
      topScope,
      topScopeCount,
      lastErrorAt,
      actionSpikeCount,
      errorSpikeCount,
      recommendedPhase,
      severity,
      alerts,
      watchTimeline,
      primaryPath: buildFeedDiagnosticsPath(range),
      criticalPath: buildFeedDiagnosticsPath("1h", { status: "500" }),
      phasePath: recommendedPhase === "detect"
        ? buildFeedDiagnosticsPath("1h", { status: "500" })
        : recommendedPhase === "stabilize"
          ? buildFeedDiagnosticsPath("24h", { kind: "network" })
          : buildFeedDiagnosticsPath(range),
      rangeLabel: RANGE_LABEL[range],
    };
  }, [actionRows, errorRows, isActionsLoading, isErrorsLoading, range]);
}