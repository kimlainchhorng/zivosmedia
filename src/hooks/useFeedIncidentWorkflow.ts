import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FeedIncidentWorkflowStatus = "open" | "mitigating" | "monitoring" | "resolved";
export type FeedIncidentWorkflowPriority = "sev1" | "sev2" | "sev3";
export type FeedIncidentWorkflowPhase = "detect" | "triage" | "stabilize" | "recover" | null;

export type FeedIncidentWorkflowNote = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string | null;
  authorName: string;
  phaseId: FeedIncidentWorkflowPhase;
};

export type FeedIncidentWorkflowAlertState = {
  acknowledgedAt: string | null;
  acknowledgedById: string | null;
  acknowledgedByName: string | null;
  snoozedUntil: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  dueAt: string | null;
};

export type FeedIncidentWorkflowEventType =
  | "workflow_update"
  | "claim"
  | "release"
  | "note"
  | "alert_ack"
  | "alert_snooze"
  | "alert_reset";

export type FeedIncidentWorkflowEvent = {
  id: string;
  type: FeedIncidentWorkflowEventType;
  message: string;
  createdAt: string;
  authorId: string | null;
  authorName: string;
};

export type FeedIncidentDispatchChannel = "chat" | "slack" | "telegram" | "email";

export type FeedIncidentWorkflowDispatch = {
  id: string;
  channel: FeedIncidentDispatchChannel;
  sentAt: string;
  sentById: string | null;
  sentByName: string;
  message: string;
};

export type FeedIncidentEscalationRole = "incident_commander" | "on_call_engineer" | "support_lead";

export type FeedIncidentWorkflowRecord = {
  status: FeedIncidentWorkflowStatus;
  priority: FeedIncidentWorkflowPriority;
  ownerId: string | null;
  ownerName: string | null;
  summary: string;
  nextUpdateAt: string | null;
  activePhase: FeedIncidentWorkflowPhase;
  alertState: Record<string, FeedIncidentWorkflowAlertState>;
  notes: FeedIncidentWorkflowNote[];
  events: FeedIncidentWorkflowEvent[];
  dispatches: FeedIncidentWorkflowDispatch[];
  escalationRole: FeedIncidentEscalationRole | null;
  autoReminderEnabled: boolean;
  reminderCadenceMinutes: number;
  lastReminderAt: string | null;
  lastReminderChannel: FeedIncidentDispatchChannel | null;
  updatedAt: string | null;
  updatedById: string | null;
  updatedByName: string | null;
};

const INCIDENT_WORKFLOW_KEY = "FEED_DIAGNOSTICS_INCIDENT_WORKFLOW";

const defaultWorkflow: FeedIncidentWorkflowRecord = {
  status: "open",
  priority: "sev2",
  ownerId: null,
  ownerName: null,
  summary: "",
  nextUpdateAt: null,
  activePhase: null,
  alertState: {},
  notes: [],
  events: [],
  dispatches: [],
  escalationRole: null,
  autoReminderEnabled: false,
  reminderCadenceMinutes: 15,
  lastReminderAt: null,
  lastReminderChannel: null,
  updatedAt: null,
  updatedById: null,
  updatedByName: null,
};

function normalizeEscalationRole(value: unknown): FeedIncidentEscalationRole | null {
  return value === "incident_commander" || value === "on_call_engineer" || value === "support_lead"
    ? value
    : null;
}

function normalizeReminderCadence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 15;
  return Math.min(120, Math.max(5, Math.round(value)));
}

function normalizePhase(value: unknown): FeedIncidentWorkflowPhase {
  return value === "detect" || value === "triage" || value === "stabilize" || value === "recover" ? value : null;
}

function normalizeStatus(value: unknown): FeedIncidentWorkflowStatus {
  return value === "open" || value === "mitigating" || value === "monitoring" || value === "resolved"
    ? value
    : "open";
}

function normalizePriority(value: unknown): FeedIncidentWorkflowPriority {
  return value === "sev1" || value === "sev2" || value === "sev3" ? value : "sev2";
}

function normalizeNotes(value: unknown): FeedIncidentWorkflowNote[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((note) => note && typeof note === "object")
    .map((note) => {
      const typed = note as Partial<FeedIncidentWorkflowNote>;
      return {
        id: typeof typed.id === "string" ? typed.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        body: typeof typed.body === "string" ? typed.body : "",
        createdAt: typeof typed.createdAt === "string" ? typed.createdAt : new Date().toISOString(),
        authorId: typeof typed.authorId === "string" ? typed.authorId : null,
        authorName: typeof typed.authorName === "string" && typed.authorName.trim() ? typed.authorName : "Unknown admin",
        phaseId: normalizePhase(typed.phaseId),
      };
    })
    .filter((note) => note.body.trim().length > 0)
    .slice(0, 20);
}

function normalizeAlertState(value: unknown): Record<string, FeedIncidentWorkflowAlertState> {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, FeedIncidentWorkflowAlertState>>((accumulator, [alertId, item]) => {
    if (!item || typeof item !== "object") return accumulator;
    const typed = item as Partial<FeedIncidentWorkflowAlertState>;
    accumulator[alertId] = {
      acknowledgedAt: typeof typed.acknowledgedAt === "string" ? typed.acknowledgedAt : null,
      acknowledgedById: typeof typed.acknowledgedById === "string" ? typed.acknowledgedById : null,
      acknowledgedByName: typeof typed.acknowledgedByName === "string" ? typed.acknowledgedByName : null,
      snoozedUntil: typeof typed.snoozedUntil === "string" ? typed.snoozedUntil : null,
      assigneeId: typeof typed.assigneeId === "string" ? typed.assigneeId : null,
      assigneeName: typeof typed.assigneeName === "string" ? typed.assigneeName : null,
      dueAt: typeof typed.dueAt === "string" ? typed.dueAt : null,
    };
    return accumulator;
  }, {});
}

function normalizeEvents(value: unknown): FeedIncidentWorkflowEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((event) => event && typeof event === "object")
    .map((event) => {
      const typed = event as Partial<FeedIncidentWorkflowEvent>;
      const type = typed.type;
      return {
        id: typeof typed.id === "string" ? typed.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: type === "workflow_update" || type === "claim" || type === "release" || type === "note" || type === "alert_ack" || type === "alert_snooze" || type === "alert_reset"
          ? type
          : "workflow_update",
        message: typeof typed.message === "string" ? typed.message : "Incident workflow updated",
        createdAt: typeof typed.createdAt === "string" ? typed.createdAt : new Date().toISOString(),
        authorId: typeof typed.authorId === "string" ? typed.authorId : null,
        authorName: typeof typed.authorName === "string" && typed.authorName.trim() ? typed.authorName : "Unknown admin",
      };
    })
    .slice(0, 40);
}

function normalizeDispatches(value: unknown): FeedIncidentWorkflowDispatch[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((dispatch) => dispatch && typeof dispatch === "object")
    .map((dispatch) => {
      const typed = dispatch as Partial<FeedIncidentWorkflowDispatch>;
      const channel = typed.channel;
      return {
        id: typeof typed.id === "string" ? typed.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        channel: channel === "chat" || channel === "slack" || channel === "telegram" || channel === "email" ? channel : "chat",
        sentAt: typeof typed.sentAt === "string" ? typed.sentAt : new Date().toISOString(),
        sentById: typeof typed.sentById === "string" ? typed.sentById : null,
        sentByName: typeof typed.sentByName === "string" && typed.sentByName.trim() ? typed.sentByName : "Unknown admin",
        message: typeof typed.message === "string" ? typed.message : "",
      };
    })
    .slice(0, 40);
}

function normalizeWorkflow(value: unknown): FeedIncidentWorkflowRecord {
  if (!value || typeof value !== "object") return defaultWorkflow;
  const typed = value as Partial<FeedIncidentWorkflowRecord>;
  return {
    status: normalizeStatus(typed.status),
    priority: normalizePriority(typed.priority),
    ownerId: typeof typed.ownerId === "string" ? typed.ownerId : null,
    ownerName: typeof typed.ownerName === "string" ? typed.ownerName : null,
    summary: typeof typed.summary === "string" ? typed.summary : "",
    nextUpdateAt: typeof typed.nextUpdateAt === "string" ? typed.nextUpdateAt : null,
    activePhase: normalizePhase(typed.activePhase),
    alertState: normalizeAlertState(typed.alertState),
    notes: normalizeNotes(typed.notes),
    events: normalizeEvents(typed.events),
    dispatches: normalizeDispatches(typed.dispatches),
    escalationRole: normalizeEscalationRole(typed.escalationRole),
    autoReminderEnabled: typed.autoReminderEnabled === true,
    reminderCadenceMinutes: normalizeReminderCadence(typed.reminderCadenceMinutes),
    lastReminderAt: typeof typed.lastReminderAt === "string" ? typed.lastReminderAt : null,
    lastReminderChannel: typed.lastReminderChannel === "chat"
      || typed.lastReminderChannel === "slack"
      || typed.lastReminderChannel === "telegram"
      || typed.lastReminderChannel === "email"
      ? typed.lastReminderChannel
      : null,
    updatedAt: typeof typed.updatedAt === "string" ? typed.updatedAt : null,
    updatedById: typeof typed.updatedById === "string" ? typed.updatedById : null,
    updatedByName: typeof typed.updatedByName === "string" ? typed.updatedByName : null,
  };
}

function appendEvent(
  events: FeedIncidentWorkflowEvent[],
  event: { type: FeedIncidentWorkflowEventType; message: string },
  actor: { id: string | null; name: string },
) {
  const next: FeedIncidentWorkflowEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: event.type,
    message: event.message,
    createdAt: new Date().toISOString(),
    authorId: actor.id,
    authorName: actor.name,
  };
  return [next, ...events].slice(0, 40);
}

export function useFeedIncidentWorkflow() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const actorName = useMemo(
    () => (user?.user_metadata?.full_name as string | undefined)
      || (user?.user_metadata?.name as string | undefined)
      || user?.email
      || "Unknown admin",
    [user?.email, user?.user_metadata],
  );

  const {
    data: workflowSetting,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["feed-incident-workflow"],
    queryFn: async (): Promise<{ id: string; value: unknown; updated_at: string | null } | null> => {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .select("id, value, updated_at")
        .is("tenant_id", null)
        .eq("key", INCIDENT_WORKFLOW_KEY)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const workflow = useMemo(
    () => normalizeWorkflow(workflowSetting?.value),
    [workflowSetting?.value],
  );

  const persistWorkflow = async (nextWorkflow: FeedIncidentWorkflowRecord) => {
    if (workflowSetting?.id) {
      let query = (supabase as any)
        .from("app_settings")
        .update({
          value: nextWorkflow,
          description: "Shared incident workflow for admin feed diagnostics",
        })
        .eq("id", workflowSetting.id);
      if (workflowSetting.updated_at) {
        query = query.eq("updated_at", workflowSetting.updated_at);
      }

      const { data, error } = await query.select("id").maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error("Incident workflow changed by another admin. Refresh and retry.");
      }
      return;
    }

    const { error } = await (supabase as any)
      .from("app_settings")
      .insert({
        tenant_id: null,
        key: INCIDENT_WORKFLOW_KEY,
        value: nextWorkflow,
        description: "Shared incident workflow for admin feed diagnostics",
      });
    if (error) throw error;
  };

  const saveWorkflow = async (
    partial: Partial<FeedIncidentWorkflowRecord>,
    auditEvent?: { type: FeedIncidentWorkflowEventType; message: string },
  ) => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const actor = { id: user?.id ?? null, name: actorName };
      const mergedEvents = auditEvent
        ? appendEvent(workflow.events, auditEvent, actor)
        : workflow.events;
      const nextWorkflow: FeedIncidentWorkflowRecord = {
        ...workflow,
        ...partial,
        alertState: partial.alertState ? normalizeAlertState(partial.alertState) : workflow.alertState,
        notes: partial.notes ? normalizeNotes(partial.notes) : workflow.notes,
        events: partial.events ? normalizeEvents(partial.events) : mergedEvents,
        dispatches: partial.dispatches ? normalizeDispatches(partial.dispatches) : workflow.dispatches,
        activePhase: partial.activePhase === undefined ? workflow.activePhase : partial.activePhase,
        updatedAt: now,
        updatedById: actor.id,
        updatedByName: actorName,
      };
      await persistWorkflow(nextWorkflow);
      await refetch();
    } finally {
      setIsSaving(false);
    }
  };

  const addNote = async (body: string, phaseId: FeedIncidentWorkflowPhase) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const nextNote: FeedIncidentWorkflowNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      body: trimmed,
      createdAt: new Date().toISOString(),
      authorId: user?.id ?? null,
      authorName: actorName,
      phaseId,
    };
    await saveWorkflow(
      { notes: [nextNote, ...workflow.notes].slice(0, 20) },
      { type: "note", message: `Added handoff note${phaseId ? ` for ${phaseId}` : ""}.` },
    );
  };

  const claimIncident = async (phaseId: FeedIncidentWorkflowPhase) => {
    await saveWorkflow({
      ownerId: user?.id ?? null,
      ownerName: actorName,
      activePhase: phaseId,
      status: workflow.status === "resolved" ? "open" : workflow.status,
    }, { type: "claim", message: `${actorName} claimed the incident.` });
  };

  const releaseIncident = async () => {
    await saveWorkflow(
      { ownerId: null, ownerName: null },
      { type: "release", message: `${actorName} released incident ownership.` },
    );
  };

  const acknowledgeAlert = async (alertId: string) => {
    const current = workflow.alertState[alertId];
    await saveWorkflow({
      alertState: {
        ...workflow.alertState,
        [alertId]: {
          acknowledgedAt: new Date().toISOString(),
          acknowledgedById: user?.id ?? null,
          acknowledgedByName: actorName,
          snoozedUntil: current?.snoozedUntil ?? null,
          assigneeId: current?.assigneeId ?? null,
          assigneeName: current?.assigneeName ?? null,
          dueAt: current?.dueAt ?? null,
        },
      },
    }, { type: "alert_ack", message: `${actorName} acknowledged alert ${alertId}.` });
  };

  const snoozeAlert = async (alertId: string, minutes: number) => {
    const current = workflow.alertState[alertId];
    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    await saveWorkflow({
      alertState: {
        ...workflow.alertState,
        [alertId]: {
          acknowledgedAt: current?.acknowledgedAt ?? null,
          acknowledgedById: current?.acknowledgedById ?? null,
          acknowledgedByName: current?.acknowledgedByName ?? null,
          snoozedUntil,
          assigneeId: current?.assigneeId ?? null,
          assigneeName: current?.assigneeName ?? null,
          dueAt: current?.dueAt ?? null,
        },
      },
    }, { type: "alert_snooze", message: `${actorName} snoozed alert ${alertId} for ${minutes} minutes.` });
  };

  const assignAlert = async (alertId: string, assignee: { id: string | null; name: string | null }) => {
    const current = workflow.alertState[alertId];
    await saveWorkflow({
      alertState: {
        ...workflow.alertState,
        [alertId]: {
          acknowledgedAt: current?.acknowledgedAt ?? null,
          acknowledgedById: current?.acknowledgedById ?? null,
          acknowledgedByName: current?.acknowledgedByName ?? null,
          snoozedUntil: current?.snoozedUntil ?? null,
          assigneeId: assignee.id,
          assigneeName: assignee.name,
          dueAt: current?.dueAt ?? null,
        },
      },
    }, {
      type: "workflow_update",
      message: assignee.name
        ? `${actorName} assigned alert ${alertId} to ${assignee.name}.`
        : `${actorName} cleared assignee for alert ${alertId}.`,
    });
  };

  const setAlertDueAt = async (alertId: string, dueAt: string | null) => {
    const current = workflow.alertState[alertId];
    await saveWorkflow({
      alertState: {
        ...workflow.alertState,
        [alertId]: {
          acknowledgedAt: current?.acknowledgedAt ?? null,
          acknowledgedById: current?.acknowledgedById ?? null,
          acknowledgedByName: current?.acknowledgedByName ?? null,
          snoozedUntil: current?.snoozedUntil ?? null,
          assigneeId: current?.assigneeId ?? null,
          assigneeName: current?.assigneeName ?? null,
          dueAt,
        },
      },
    }, {
      type: "workflow_update",
      message: dueAt
        ? `${actorName} set due time for alert ${alertId}.`
        : `${actorName} cleared due time for alert ${alertId}.`,
    });
  };

  const resetAlertState = async (alertId: string) => {
    const next = { ...workflow.alertState };
    delete next[alertId];
    await saveWorkflow(
      { alertState: next },
      { type: "alert_reset", message: `${actorName} reset alert ${alertId}.` },
    );
  };

  const markChatUpdateSent = async (channel: FeedIncidentDispatchChannel, message: string) => {
    const dispatch: FeedIncidentWorkflowDispatch = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      channel,
      sentAt: new Date().toISOString(),
      sentById: user?.id ?? null,
      sentByName: actorName,
      message,
    };
    await saveWorkflow(
      {
        dispatches: [dispatch, ...workflow.dispatches].slice(0, 40),
        lastReminderAt: dispatch.sentAt,
        lastReminderChannel: channel,
      },
      { type: "workflow_update", message: `${actorName} sent incident update via ${channel}.` },
    );
  };

  const routeEscalation = async (role: FeedIncidentEscalationRole) => {
    await saveWorkflow(
      { escalationRole: role },
      { type: "workflow_update", message: `${actorName} routed escalation to ${role}.` },
    );
  };

  const setReminderAutomation = async (enabled: boolean, cadenceMinutes: number) => {
    const normalizedCadence = normalizeReminderCadence(cadenceMinutes);
    await saveWorkflow(
      {
        autoReminderEnabled: enabled,
        reminderCadenceMinutes: normalizedCadence,
      },
      {
        type: "workflow_update",
        message: enabled
          ? `${actorName} enabled auto-reminder cadence at ${normalizedCadence} minutes.`
          : `${actorName} disabled auto-reminder automation.`,
      },
    );
  };

  const sendReminderPing = async (channel: FeedIncidentDispatchChannel = "chat", source: "manual" | "auto" = "manual") => {
    const overdueAlerts = Object.values(workflow.alertState).filter((item) => (
      !!item.dueAt
      && new Date(item.dueAt).getTime() < Date.now()
      && !item.acknowledgedAt
    )).length;
    const overdueUpdate = !!workflow.nextUpdateAt
      && new Date(workflow.nextUpdateAt).getTime() < Date.now()
      && workflow.status !== "resolved";

    const target = workflow.ownerName || "unassigned owner";
    const role = workflow.escalationRole || "on_call_engineer";
    const message = [
      "Incident Reminder Ping",
      `Status: ${workflow.status.toUpperCase()} (${workflow.priority.toUpperCase()})`,
      `Escalation route: ${role}`,
      `Target: ${target}`,
      `Overdue update: ${overdueUpdate ? "yes" : "no"}`,
      `Overdue alert tasks: ${overdueAlerts}`,
      workflow.summary ? `Summary: ${workflow.summary}` : "",
    ].filter(Boolean).join("\n");

    const dispatch: FeedIncidentWorkflowDispatch = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      channel,
      sentAt: new Date().toISOString(),
      sentById: user?.id ?? null,
      sentByName: actorName,
      message,
    };

    await saveWorkflow(
      {
        dispatches: [dispatch, ...workflow.dispatches].slice(0, 40),
        escalationRole: workflow.escalationRole || "on_call_engineer",
        lastReminderAt: dispatch.sentAt,
        lastReminderChannel: channel,
      },
      {
        type: "workflow_update",
        message: `${actorName} sent ${source === "auto" ? "auto-reminder" : "reminder ping"} via ${channel} (${overdueAlerts} overdue alerts${overdueUpdate ? ", update overdue" : ""}).`,
      },
    );
    return { overdueAlerts, overdueUpdate };
  };

  const overdueAlertCount = Object.values(workflow.alertState).filter((item) => (
    !!item.dueAt
    && new Date(item.dueAt).getTime() < Date.now()
    && !item.acknowledgedAt
  )).length;

  const autoEscalateOverdue = async () => {
    const shouldEscalate = isNextUpdateOverdue || overdueAlertCount > 0;
    if (!shouldEscalate) return false;

    await saveWorkflow(
      {
        status: workflow.status === "resolved" ? "mitigating" : workflow.status,
        priority: "sev1",
        escalationRole: workflow.escalationRole || "on_call_engineer",
        summary: workflow.summary
          ? `${workflow.summary}\n[Auto-Escalation] Overdue deadline or overdue alert tasks detected.`
          : "[Auto-Escalation] Overdue deadline or overdue alert tasks detected.",
      },
      {
        type: "workflow_update",
        message: `${actorName} triggered auto-escalation for overdue workflow commitments.`,
      },
    );
    return true;
  };

  const isNextUpdateOverdue = !!workflow.nextUpdateAt
    && new Date(workflow.nextUpdateAt).getTime() < Date.now()
    && workflow.status !== "resolved";

  const isReminderSuppressed = workflow.status === "monitoring" || workflow.status === "resolved";
  const hasReminderTrigger = isNextUpdateOverdue || overdueAlertCount > 0;
  const nextAutoReminderAt = workflow.lastReminderAt
    ? new Date(new Date(workflow.lastReminderAt).getTime() + workflow.reminderCadenceMinutes * 60 * 1000).toISOString()
    : null;
  const shouldAutoSendReminder = workflow.autoReminderEnabled
    && !isReminderSuppressed
    && hasReminderTrigger
    && (!workflow.lastReminderAt || new Date(workflow.lastReminderAt).getTime() + workflow.reminderCadenceMinutes * 60 * 1000 <= Date.now());

  return {
    workflow,
    actorName,
    isLoading,
    isSaving,
    isNextUpdateOverdue,
    overdueAlertCount,
    isReminderSuppressed,
    hasReminderTrigger,
    nextAutoReminderAt,
    shouldAutoSendReminder,
    refetch,
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
  };
}