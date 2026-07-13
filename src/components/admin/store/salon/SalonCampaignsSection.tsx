/**
 * SalonCampaignsSection — owner-facing marketing campaigns admin.
 *
 * Composes useSalonCampaigns (CRUD + send), useSalonCampaignRecipients (per-
 * campaign drilldown), and useSalonClients (for the tag-cohort dropdown).
 *
 * Three vertical cards:
 *   1. New campaign button + drafts list
 *   2. History (sent / sending / failed / cancelled)
 *   3. Drilldown drawer when a history row is clicked
 *
 * The composer reuses the merge-tag conventions from the reminders V2 work
 * (subject + body_html + sms_body, with `{{client_first_name}}`, `{{salon_name}}`,
 * `{{salon_phone}}`, `{{booking_url}}` available — interpolated server-side
 * inside salon-send-campaign).
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Megaphone, Plus, Loader2, AlertCircle, Send, Mail, MessageSquare,
  Users, Trash2, X, ChevronRight, CheckCircle2, XCircle, FileText,
  Cake, UserRound, Tag, Calendar as CalendarIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useSalonCampaigns, type SalonCampaign, type SalonCohortKind, type SalonCampaignStatus,
} from "@/hooks/salon/useSalonCampaigns";
import { useSalonCampaignRecipients, type SalonCampaignRecipientStatus } from "@/hooks/salon/useSalonCampaignRecipients";
import { useSalonClients } from "@/hooks/salon/useSalonClients";

interface Props { storeId: string; }

const STATUS_TONE: Record<SalonCampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sending: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  sent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const COHORT_LABEL: Record<SalonCohortKind, string> = {
  all: "All opted-in clients",
  dormant: "Dormant clients",
  recent: "Recent visitors",
  tag: "Clients with a specific tag",
  birthday_month: "Clients with a birthday this month",
};

const COHORT_ICON: Record<SalonCohortKind, typeof Users> = {
  all: Users,
  dormant: UserRound,
  recent: CalendarIcon,
  tag: Tag,
  birthday_month: Cake,
};

const RECIPIENT_STATUS_TONE: Record<SalonCampaignRecipientStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  sent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  skipped_no_contact: "bg-muted text-muted-foreground border-border",
  skipped_opt_out: "bg-muted text-muted-foreground border-border",
  skipped_blocked: "bg-muted text-muted-foreground border-border",
};

const formatWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const monthName = (n: number) => new Date(2000, n - 1, 1).toLocaleString(undefined, { month: "long" });

export default function SalonCampaignsSection({ storeId }: Props) {
  const { campaigns, loading, error, createDraft, updateDraft, cancelDraft, sendNow, previewCohort } = useSalonCampaigns(storeId);
  const { clients } = useSalonClients(storeId);

  // Tag dropdown source — same memo shape as SalonClientsSection.
  const allTags = useMemo(() => {
    const tally = new Map<string, number>();
    for (const c of clients) for (const t of (c.tags ?? [])) tally.set(t, (tally.get(t) ?? 0) + 1);
    return Array.from(tally.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [clients]);

  const drafts = useMemo(() => campaigns.filter((c) => c.status === "draft"), [campaigns]);
  const history = useMemo(() => campaigns.filter((c) => c.status !== "draft"), [campaigns]);

  const [dialogOpenFor, setDialogOpenFor] = useState<SalonCampaign | "new" | null>(null);
  const [drilldownFor, setDrilldownFor] = useState<SalonCampaign | null>(null);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Header card */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-5 w-5 text-primary" /> Marketing campaigns
          </CardTitle>
          <Button size="sm" onClick={() => setDialogOpenFor("new")} className="gap-1.5">
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Send a one-off SMS or email blast to a chosen cohort of clients —
            only those who opted in to marketing offers will receive it.
          </p>
        </CardContent>
      </Card>

      {/* Drafts */}
      {drafts.length > 0 && (
        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {drafts.map((c) => (
                <li key={c.id} className="flex items-center gap-3 p-3">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {COHORT_LABEL[c.cohort_kind]}{c.channel_sms && c.channel_email ? " · SMS + email" : c.channel_sms ? " · SMS" : " · email"}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setDialogOpenFor(c)}>Open</Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Campaign history</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : history.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No campaigns sent yet. Click "New campaign" to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {history.map((c) => {
                const Icon = COHORT_ICON[c.cohort_kind];
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setDrilldownFor(c)}
                      className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_TONE[c.status])}>
                            {c.status}
                          </span>
                          {c.channel_sms && <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><MessageSquare className="h-2.5 w-2.5" /> SMS</span>}
                          {c.channel_email && <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Mail className="h-2.5 w-2.5" /> Email</span>}
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {COHORT_LABEL[c.cohort_kind]} · {formatWhen(c.sent_at ?? c.created_at)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {c.sent_count} sent · {c.failed_count} failed · {c.skipped_count} skipped
                          {c.recipient_count > 0 ? ` · of ${c.recipient_count}` : ""}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <CampaignDialog
        open={dialogOpenFor !== null}
        existing={dialogOpenFor === "new" ? null : dialogOpenFor}
        allTags={allTags}
        previewCohort={previewCohort}
        onCreateDraft={createDraft}
        onUpdateDraft={updateDraft}
        onSendNow={sendNow}
        onCancelDraft={cancelDraft}
        onClose={() => setDialogOpenFor(null)}
      />

      {drilldownFor && (
        <CampaignDrilldown
          campaign={drilldownFor}
          onClose={() => setDrilldownFor(null)}
        />
      )}
    </div>
  );
}

// ---- Campaign create/edit dialog ---------------------------------------------

function CampaignDialog({
  open, existing, allTags, previewCohort, onCreateDraft, onUpdateDraft, onSendNow, onCancelDraft, onClose,
}: {
  open: boolean;
  existing: SalonCampaign | null;
  allTags: string[];
  previewCohort: (kind: SalonCohortKind, params: Record<string, unknown>) => Promise<{ count: number; sample: string[] }>;
  onCreateDraft: (draft: any) => Promise<SalonCampaign | null>;
  onUpdateDraft: (id: string, patch: any) => Promise<boolean>;
  onSendNow: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onCancelDraft: (id: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [channelSms, setChannelSms] = useState(existing?.channel_sms ?? false);
  const [channelEmail, setChannelEmail] = useState(existing?.channel_email ?? true);
  const [cohortKind, setCohortKind] = useState<SalonCohortKind>(existing?.cohort_kind ?? "all");
  const [cohortParams, setCohortParams] = useState<Record<string, unknown>>(existing?.cohort_params ?? {});
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(existing?.body_html ?? "");
  const [smsBody, setSmsBody] = useState(existing?.sms_body ?? "");
  const [preview, setPreview] = useState<{ count: number; sample: string[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reset form when existing changes.
  useEffect(() => {
    setName(existing?.name ?? "");
    setChannelSms(existing?.channel_sms ?? false);
    setChannelEmail(existing?.channel_email ?? true);
    setCohortKind(existing?.cohort_kind ?? "all");
    setCohortParams(existing?.cohort_params ?? {});
    setSubject(existing?.subject ?? "");
    setBodyHtml(existing?.body_html ?? "");
    setSmsBody(existing?.sms_body ?? "");
    setPreview(null);
  }, [existing, open]);

  // Auto-preview on cohort change.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreviewLoading(true);
    void previewCohort(cohortKind, cohortParams).then((p) => {
      if (cancelled) return;
      setPreview(p);
      setPreviewLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, cohortKind, JSON.stringify(cohortParams), previewCohort]);

  const buildDraft = () => ({
    name,
    channel_sms: channelSms,
    channel_email: channelEmail,
    cohort_kind: cohortKind,
    cohort_params: cohortParams,
    subject: subject || null,
    body_html: bodyHtml || null,
    sms_body: smsBody || null,
  });

  const validate = (): string | null => {
    if (!name.trim()) return "Give your campaign a name.";
    if (!channelSms && !channelEmail) return "Pick at least one channel (SMS or email).";
    if (channelSms && !smsBody.trim()) return "Add an SMS body.";
    if (channelEmail && (!subject.trim() || !bodyHtml.trim())) return "Add an email subject and body.";
    return null;
  };

  const handleSaveDraft = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      if (existing) {
        const ok = await onUpdateDraft(existing.id, buildDraft());
        if (ok) { toast.success("Draft saved."); onClose(); }
      } else {
        const created = await onCreateDraft(buildDraft());
        if (created) { toast.success("Draft saved."); onClose(); }
      }
    } finally { setBusy(false); }
  };

  const handleSendNow = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const count = preview?.count ?? 0;
    if (!window.confirm(`Send to ${count} client${count === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    try {
      let id = existing?.id;
      if (!id) {
        const created = await onCreateDraft(buildDraft());
        if (!created) return;
        id = created.id;
      } else {
        const ok = await onUpdateDraft(id, buildDraft());
        if (!ok) return;
      }
      const out = await onSendNow(id);
      if (out.ok) { toast.success("Campaign sending."); onClose(); }
      else if (out.error) toast.error(out.error);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? `Edit "${existing.name}"` : "New campaign"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cmpName">Campaign name (internal — won't appear in the message)</Label>
            <Input id="cmpName" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="e.g. Summer 20% off" />
          </div>

          {/* Channels */}
          <div className="space-y-2">
            <Label>Channels</Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="h-4 w-4" checked={channelSms} onChange={(e) => setChannelSms(e.target.checked)} />
              <span className="text-sm text-foreground">SMS</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="h-4 w-4" checked={channelEmail} onChange={(e) => setChannelEmail(e.target.checked)} />
              <span className="text-sm text-foreground">Email</span>
            </label>
          </div>

          {/* Cohort */}
          <div className="space-y-2">
            <Label htmlFor="cmpCohort">Who gets this campaign?</Label>
            <select
              id="cmpCohort"
              value={cohortKind}
              onChange={(e) => { setCohortKind(e.target.value as SalonCohortKind); setCohortParams({}); }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {(Object.keys(COHORT_LABEL) as SalonCohortKind[]).map((k) => (
                <option key={k} value={k}>{COHORT_LABEL[k]}</option>
              ))}
            </select>

            {/* Kind-specific inputs */}
            {cohortKind === "dormant" && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Send to anyone who hasn't visited in</span>
                <Input
                  type="number"
                  min={30}
                  max={365}
                  value={String((cohortParams.days as number) ?? 60)}
                  onChange={(e) => setCohortParams({ days: Math.max(30, Math.min(365, parseInt(e.target.value, 10) || 60)) })}
                  className="h-8 w-20"
                />
                <span className="text-muted-foreground">days.</span>
              </div>
            )}
            {cohortKind === "recent" && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Send to anyone who visited in the last</span>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={String((cohortParams.days as number) ?? 90)}
                  onChange={(e) => setCohortParams({ days: Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 90)) })}
                  className="h-8 w-20"
                />
                <span className="text-muted-foreground">days.</span>
              </div>
            )}
            {cohortKind === "tag" && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Tag:</span>
                {allTags.length === 0 ? (
                  <span className="text-muted-foreground italic">No tags in your client book yet — go tag some clients first.</span>
                ) : (
                  <select
                    value={(cohortParams.tag as string) ?? ""}
                    onChange={(e) => setCohortParams({ tag: e.target.value })}
                    className="flex h-8 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">Pick a tag…</option>
                    {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
              </div>
            )}
            {cohortKind === "birthday_month" && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Send to clients whose birthday is in</span>
                <select
                  value={String((cohortParams.month as number) ?? new Date().getMonth() + 1)}
                  onChange={(e) => setCohortParams({ month: parseInt(e.target.value, 10) })}
                  className="flex h-8 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{monthName(m)}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Preview count */}
            <div className="rounded-lg border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
              {previewLoading
                ? <><Loader2 className="-mt-0.5 mr-1 inline h-3 w-3 animate-spin" /> Counting…</>
                : preview
                ? (
                  preview.count === 0
                    ? <>No clients match this cohort yet. Adjust the criteria.</>
                    : <><strong className="text-foreground">{preview.count}</strong> client{preview.count === 1 ? "" : "s"} will receive this campaign{preview.sample.length > 0 ? ` (including ${preview.sample.slice(0, 3).join(", ")}${preview.count > 3 ? "…" : ""})` : ""}.</>
                )
                : null}
            </div>
          </div>

          {/* Message composer */}
          {channelEmail && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <Label htmlFor="cmpSubject">Email subject</Label>
              <Input
                id="cmpSubject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                placeholder="A special offer from {{salon_name}}"
              />
              <Label htmlFor="cmpBody">Email body (HTML allowed)</Label>
              <Textarea
                id="cmpBody"
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={6}
                maxLength={20000}
                placeholder="Hi {{client_first_name}}, ..."
              />
            </div>
          )}
          {channelSms && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <Label htmlFor="cmpSms">SMS body</Label>
              <Textarea
                id="cmpSms"
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                rows={3}
                maxLength={320}
                placeholder="{{salon_name}}: ..."
              />
              <p className="text-right text-[10px] text-muted-foreground">{smsBody.length}/320</p>
            </div>
          )}

          <p className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">
            Available merge tags: <code className="mx-1 rounded bg-card px-1">{`{{client_first_name}}`}</code>
            <code className="mx-1 rounded bg-card px-1">{`{{salon_name}}`}</code>
            <code className="mx-1 rounded bg-card px-1">{`{{salon_phone}}`}</code>
            <code className="mx-1 rounded bg-card px-1">{`{{booking_url}}`}</code>
          </p>
        </div>

        <DialogFooter className="flex flex-wrap justify-between gap-2">
          {existing && (
            <Button
              type="button" variant="ghost" className="gap-1.5 text-destructive"
              onClick={async () => {
                if (!window.confirm("Discard this draft?")) return;
                const ok = await onCancelDraft(existing.id);
                if (ok) { toast.success("Draft discarded."); onClose(); }
              }}
              disabled={busy}
            >
              <Trash2 className="h-3.5 w-3.5" /> Discard
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="button" variant="outline" onClick={() => void handleSaveDraft()} disabled={busy} className="gap-1.5">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save draft
            </Button>
            <Button type="button" onClick={() => void handleSendNow()} disabled={busy || (preview?.count ?? 0) === 0} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send now
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Drilldown drawer --------------------------------------------------------

function CampaignDrilldown({ campaign, onClose }: { campaign: SalonCampaign; onClose: () => void }) {
  const { rows, loading } = useSalonCampaignRecipients(campaign.id);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{campaign.name}</span>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">{campaign.sent_count}</strong> sent ·{" "}
              <strong className="text-foreground">{campaign.failed_count}</strong> failed ·{" "}
              <strong className="text-foreground">{campaign.skipped_count}</strong> skipped
              {" "}of {campaign.recipient_count}
            </p>
            <p className="mt-1">
              Status <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_TONE[campaign.status])}>{campaign.status}</span>
              {campaign.sent_at && <> · sent {formatWhen(campaign.sent_at)}</>}
              {campaign.error && <p className="mt-1 text-destructive">Error: {campaign.error}</p>}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading recipients…</div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recipients on this campaign.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start gap-3 p-3">
                  {r.status === "sent"
                    ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
                    : r.status === "failed"
                    ? <XCircle className="mt-0.5 h-4 w-4 text-destructive shrink-0" />
                    : <X className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{r.client_name ?? "—"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {r.client_phone ? `${r.client_phone}` : ""}{r.client_phone && r.client_email ? " · " : ""}{r.client_email ?? ""}
                    </p>
                    {r.error && (
                      <p className="mt-1 truncate text-[11px] text-destructive" title={r.error}>{r.error}</p>
                    )}
                  </div>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", RECIPIENT_STATUS_TONE[r.status])}>
                    {r.status.replace(/_/g, " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
