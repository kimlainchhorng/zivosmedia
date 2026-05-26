import { AlertTriangle, ArrowRight, BellRing, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useFeedIncidentOpsSummary } from "@/hooks/useFeedIncidentOpsSummary";
import { useFeedIncidentWorkflow } from "@/hooks/useFeedIncidentWorkflow";
import { toast } from "sonner";

type FeedIncidentCommandCenterProps = {
  compact?: boolean;
  className?: string;
};

const escalationRoleLabel: Record<"incident_commander" | "on_call_engineer" | "support_lead", string> = {
  incident_commander: "IC",
  on_call_engineer: "On-call",
  support_lead: "Support",
};

function severityClasses(severity: "critical" | "elevated" | "stable") {
  if (severity === "critical") return "border-red-500/30 bg-red-500/10 text-red-600";
  if (severity === "elevated") return "border-amber-500/30 bg-amber-500/10 text-amber-600";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
}

export function FeedIncidentCommandCenter({ compact = false, className }: FeedIncidentCommandCenterProps) {
  const navigate = useNavigate();
  const summary = useFeedIncidentOpsSummary("24h");
  const {
    workflow,
    actorName,
    saveWorkflow,
    markChatUpdateSent,
    routeEscalation,
    setReminderAutomation,
    sendReminderPing,
    autoEscalateOverdue,
    overdueAlertCount,
    isReminderSuppressed,
    hasReminderTrigger,
    nextAutoReminderAt,
    shouldAutoSendReminder,
    isSaving,
    isNextUpdateOverdue,
  } = useFeedIncidentWorkflow();
  const alertCount = summary.alerts.filter((alert) => alert.severity !== "stable").length;
  const leadAlert = summary.alerts[0];
  const effectiveSeverity = isNextUpdateOverdue && summary.severity !== "critical" ? "elevated" : summary.severity;
  const acknowledgedActiveAlerts = summary.alerts.filter((alert) => {
    const state = workflow.alertState[alert.id];
    return alert.severity !== "stable" && !!state?.acknowledgedAt;
  }).length;

  const runUpgradeAll = async () => {
    try {
      const nowIso = new Date().toISOString();
      const nextUpdateIso = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const upgradedAlertState = { ...workflow.alertState };
      for (const alert of summary.alerts) {
        if (alert.severity === "stable") continue;
        const current = upgradedAlertState[alert.id];
        upgradedAlertState[alert.id] = {
          acknowledgedAt: nowIso,
          acknowledgedById: current?.acknowledgedById ?? null,
          acknowledgedByName: current?.acknowledgedByName ?? actorName,
          snoozedUntil: null,
          assigneeId: current?.assigneeId ?? null,
          assigneeName: current?.assigneeName ?? actorName,
          dueAt: nextUpdateIso,
        };
      }

      await saveWorkflow(
        {
          status: workflow.status === "resolved" ? "mitigating" : workflow.status,
          priority: summary.status500Count >= 3 ? "sev1" : workflow.priority,
          nextUpdateAt: nextUpdateIso,
          summary: workflow.summary || "Global upgrade-all response initialized from command center.",
          alertState: upgradedAlertState,
        },
        { type: "workflow_update", message: "Executed Upgrade All from global command center." },
      );
      toast.success("Upgrade all response executed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to execute upgrade all");
    }
  };

  const copyChatUpdate = async () => {
    const text = [
      "Feed Incident Update",
      `Status: ${workflow.status.toUpperCase()} (${workflow.priority.toUpperCase()})`,
      `Owner: ${workflow.ownerName || "Unassigned"}`,
      `Errors: ${summary.totalErrors} | 500s: ${summary.status500Count} | Apply/Error: ${summary.applyToErrorRatio}`,
      `Next update: ${workflow.nextUpdateAt ? new Date(workflow.nextUpdateAt).toLocaleString() : "Not set"}`,
      workflow.summary ? `Summary: ${workflow.summary}` : "",
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Incident chat update copied");
    } catch {
      toast.error("Failed to copy chat update");
    }
  };

  const markSent = async (channel: "chat" | "slack" | "telegram") => {
    const text = [
      "Feed Incident Update",
      `Status: ${workflow.status.toUpperCase()} (${workflow.priority.toUpperCase()})`,
      `Owner: ${workflow.ownerName || "Unassigned"}`,
      `Errors: ${summary.totalErrors} | 500s: ${summary.status500Count} | Apply/Error: ${summary.applyToErrorRatio}`,
      `Next update: ${workflow.nextUpdateAt ? new Date(workflow.nextUpdateAt).toLocaleString() : "Not set"}`,
    ].join("\n");
    try {
      await markChatUpdateSent(channel, text);
      toast.success(`Marked update sent via ${channel}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark dispatch");
    }
  };

  const triggerAutoEscalation = async () => {
    try {
      const escalated = await autoEscalateOverdue();
      if (!escalated) {
        toast.message("No overdue escalation triggers");
        return;
      }
      toast.success("Auto-escalation applied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to auto-escalate");
    }
  };

  const setEscalationRoute = async (role: "incident_commander" | "on_call_engineer" | "support_lead") => {
    try {
      await routeEscalation(role);
      toast.success(`Escalation routed to ${escalationRoleLabel[role]}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to route escalation");
    }
  };

  const sendReminder = async (channel: "chat" | "slack" | "telegram") => {
    try {
      await sendReminderPing(channel);
      toast.success(`Reminder sent via ${channel}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reminder");
    }
  };

  const toggleAutoReminders = async () => {
    try {
      await setReminderAutomation(!workflow.autoReminderEnabled, workflow.reminderCadenceMinutes);
      toast.success(!workflow.autoReminderEnabled ? "Auto reminders enabled" : "Auto reminders disabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update auto reminders");
    }
  };

  const setCadence = async (minutes: 10 | 15 | 30) => {
    try {
      await setReminderAutomation(workflow.autoReminderEnabled, minutes);
      toast.success(`Reminder cadence set to ${minutes} minutes`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update cadence");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open feed incident command center"
            title="Open feed incident command center"
            className={cn("relative h-8 w-8", className)}
          >
            <BellRing className="h-4 w-4" />
            {(alertCount > 0 || isNextUpdateOverdue) && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("gap-2", className, severityClasses(effectiveSeverity))}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Incident {effectiveSeverity === "critical" ? "Critical" : effectiveSeverity === "elevated" ? "Elevated" : "Stable"}
            {(alertCount > 0 || isNextUpdateOverdue) && <Badge variant="secondary">{alertCount + (isNextUpdateOverdue ? 1 : 0)}</Badge>}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Feed Incident Command</p>
            <p className="text-xs text-muted-foreground">{summary.rangeLabel} operational status</p>
          </div>
          <Badge variant={effectiveSeverity === "critical" ? "destructive" : effectiveSeverity === "elevated" ? "default" : "secondary"}>
            {effectiveSeverity}
          </Badge>
        </div>

        {isNextUpdateOverdue && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700">
            Shared update deadline is overdue.
          </div>
        )}

        {overdueAlertCount > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            {overdueAlertCount} alert task{overdueAlertCount === 1 ? " is" : "s are"} overdue.
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border/60 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Errors</p>
            <p className="text-lg font-bold text-foreground">{summary.totalErrors}</p>
          </div>
          <div className="rounded-lg border border-border/60 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">500s</p>
            <p className="text-lg font-bold text-foreground">{summary.status500Count}</p>
          </div>
          <div className="rounded-lg border border-border/60 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Apply ratio</p>
            <p className="text-lg font-bold text-foreground">{summary.applyToErrorRatio}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Escalation route</p>
          <p className="text-sm font-semibold text-foreground">
            {workflow.escalationRole ? escalationRoleLabel[workflow.escalationRole] : "Unrouted"}
          </p>
          <p className="text-xs text-muted-foreground">
            {workflow.lastReminderAt
              ? `Last reminder ${new Date(workflow.lastReminderAt).toLocaleTimeString()} via ${workflow.lastReminderChannel || "unknown"}`
              : "No reminder ping yet"}
          </p>
        </div>

        <div className="rounded-lg border border-border/60 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Auto reminders</p>
          <p className="text-sm font-semibold text-foreground">
            {workflow.autoReminderEnabled ? `Every ${workflow.reminderCadenceMinutes}m` : "Disabled"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isReminderSuppressed
              ? "Suppressed in monitoring/resolved"
              : shouldAutoSendReminder
                ? "Ready to send"
                : nextAutoReminderAt
                  ? `Next after ${new Date(nextAutoReminderAt).toLocaleTimeString()}`
                  : hasReminderTrigger
                    ? "Waiting for next cadence window"
                    : "No overdue triggers"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border/60 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Status</p>
            <p className="text-sm font-semibold uppercase text-foreground">{workflow.status}</p>
          </div>
          <div className="rounded-lg border border-border/60 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Priority</p>
            <p className="text-sm font-semibold uppercase text-foreground">{workflow.priority}</p>
          </div>
          <div className="rounded-lg border border-border/60 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Owner</p>
            <p className="truncate text-sm font-semibold text-foreground">{workflow.ownerName || "Unassigned"}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Shared alert state</p>
            <Badge variant="outline">{acknowledgedActiveAlerts}/{summary.alerts.filter((alert) => alert.severity !== "stable").length} ack</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Alert acknowledgements and snoozes are synchronized across admin responders.
          </p>
        </div>

        {(workflow.summary || workflow.nextUpdateAt) && (
          <div className="rounded-lg border border-border/60 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Handoff</p>
            {workflow.summary && <p className="mt-1 text-sm text-foreground">{workflow.summary}</p>}
            {workflow.nextUpdateAt && (
              <p className="mt-1 text-xs text-muted-foreground">Next update {new Date(workflow.nextUpdateAt).toLocaleString()}</p>
            )}
          </div>
        )}

        <div className="rounded-lg border border-border/60 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">{leadAlert?.title || "No active escalations"}</p>
            {leadAlert && (
              <Badge variant={leadAlert.severity === "critical" ? "destructive" : leadAlert.severity === "elevated" ? "default" : "secondary"}>
                {leadAlert.count}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{leadAlert?.detail || "Feed incident pressure is stable."}</p>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Watch buckets</p>
          {summary.watchTimeline.slice(-4).map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">Errors {item.errors} • Actions {item.actions}</p>
              </div>
              <Badge variant={item.gap > 0 ? "destructive" : item.actions > 0 ? "default" : "secondary"}>
                {item.gap > 0 ? `+${item.gap}` : item.gap}
              </Badge>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent workflow events</p>
          {workflow.events.slice(0, 3).map((event) => (
            <div key={event.id} className="rounded-lg border border-border/60 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">{event.type}</Badge>
                <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleTimeString()}</p>
              </div>
              <p className="mt-1 text-xs text-foreground">{event.message}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent dispatches</p>
          {workflow.dispatches.slice(0, 2).map((dispatch) => (
            <div key={dispatch.id} className="rounded-lg border border-border/60 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">{dispatch.channel}</Badge>
                <p className="text-xs text-muted-foreground">{new Date(dispatch.sentAt).toLocaleTimeString()}</p>
              </div>
              <p className="mt-1 text-xs text-foreground">{dispatch.sentByName}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => navigate(summary.criticalPath)}>
            <AlertTriangle className="h-3.5 w-3.5" />
            500 queue
          </Button>
          <Button type="button" size="sm" className="gap-2" onClick={() => navigate(summary.phasePath)}>
            Open incident
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => void runUpgradeAll()}>
            Upgrade all
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void copyChatUpdate()}>
            Copy chat update
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("/chat")}>Chat</Button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => void markSent("chat")}>Sent chat</Button>
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => void markSent("slack")}>Sent Slack</Button>
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => void markSent("telegram")}>Sent Telegram</Button>
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => void triggerAutoEscalation()}>Escalate</Button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant={workflow.escalationRole === "incident_commander" ? "default" : "outline"} size="sm" disabled={isSaving} onClick={() => void setEscalationRoute("incident_commander")}>Route IC</Button>
          <Button type="button" variant={workflow.escalationRole === "on_call_engineer" ? "default" : "outline"} size="sm" disabled={isSaving} onClick={() => void setEscalationRoute("on_call_engineer")}>Route On-call</Button>
          <Button type="button" variant={workflow.escalationRole === "support_lead" ? "default" : "outline"} size="sm" disabled={isSaving} onClick={() => void setEscalationRoute("support_lead")}>Route Support</Button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => void sendReminder("chat")}>Reminder chat</Button>
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => void sendReminder("slack")}>Reminder Slack</Button>
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => void sendReminder("telegram")}>Reminder Telegram</Button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant={workflow.autoReminderEnabled ? "default" : "outline"} size="sm" disabled={isSaving} onClick={() => void toggleAutoReminders()}>
            {workflow.autoReminderEnabled ? "Auto on" : "Auto off"}
          </Button>
          <Button type="button" variant={workflow.reminderCadenceMinutes === 10 ? "default" : "outline"} size="sm" disabled={isSaving} onClick={() => void setCadence(10)}>10m</Button>
          <Button type="button" variant={workflow.reminderCadenceMinutes === 15 ? "default" : "outline"} size="sm" disabled={isSaving} onClick={() => void setCadence(15)}>15m</Button>
          <Button type="button" variant={workflow.reminderCadenceMinutes === 30 ? "default" : "outline"} size="sm" disabled={isSaving} onClick={() => void setCadence(30)}>30m</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}