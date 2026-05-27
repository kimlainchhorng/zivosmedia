/**
 * SalonRemindersSection — owner-facing config + activity log for the automated
 * reminder system. Adds three follow-up surfaces over the V1:
 *   - multi-interval booking reminders (pill-picker over `booking_reminder_lead_hours`)
 *   - per-store template overrides (subject + HTML + SMS bodies, with "reset to default")
 *   - test-send card (fire a sample to the owner's own contact info)
 *
 * Settings + templates live in salon_reminder_settings and
 * salon_notification_template_overrides. Per-row scheduling/sending is
 * handled server-side (DB triggers + notifications-cron).
 *
 * Free-text and number inputs use the commit-on-blur pattern the rest of the
 * salon settings UIs have settled on.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bell, Loader2, AlertCircle, Calendar, Cake, UserRound,
  XCircle, Clock, Mail, MessageSquare, Send, RotateCcw, FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSalonReminderSettings } from "@/hooks/salon/useSalonReminderSettings";
import { useSalonReminders, type SalonReminderStatus, type SalonReminderType } from "@/hooks/salon/useSalonReminders";
import { useSalonReminderTemplates, type SalonTemplateKey } from "@/hooks/salon/useSalonReminderTemplates";

interface Props { storeId: string; }

// Available lead-time chips. 12h is intentionally between 24h (long-form) and
// 2h (last-call) so an owner who wants three reminders has a sensible middle.
const LEAD_HOUR_OPTIONS: { value: number; label: string }[] = [
  { value: 72, label: "3 days" },
  { value: 48, label: "2 days" },
  { value: 24, label: "1 day" },
  { value: 12, label: "12h" },
  { value: 2, label: "2h" },
];

const TEMPLATE_META: Record<SalonTemplateKey, {
  title: string;
  description: string;
  mergeTags: string[];
  defaultSubject: string;
  defaultSmsHint: string;
}> = {
  "salon-booking-reminder-24h": {
    title: "Booking reminder",
    description: "Sent before each scheduled visit. Transactional — sent to anyone who didn't opt out of reminders.",
    mergeTags: ["client_first_name", "service_name", "stylist_name", "start_at_local", "lead_phrase", "salon_name", "salon_phone"],
    defaultSubject: "Your appointment is tomorrow at {{salon_name}}",
    defaultSmsHint: "{{salon_name}}: Your {{service_name}} is {{lead_phrase}}. Reply CANCEL to cancel.",
  },
  "salon-birthday-offer": {
    title: "Birthday offer",
    description: "Sent on the morning of the client's birthday. Marketing — only to clients who explicitly opted in.",
    mergeTags: ["client_first_name", "salon_name", "birthday_discount_percent", "booking_url"],
    defaultSubject: "Happy birthday from {{salon_name}}!",
    defaultSmsHint: "{{salon_name}}: Happy birthday, {{client_first_name}}!",
  },
  "salon-winback-offer": {
    title: "Win-back offer",
    description: "Sent when a marketing-opted-in client crosses your inactivity threshold.",
    mergeTags: ["client_first_name", "salon_name", "days_since_last_visit", "booking_url"],
    defaultSubject: "We miss you at {{salon_name}}",
    defaultSmsHint: "{{salon_name}}: We miss you, {{client_first_name}}!",
  },
};

const STATUS_TONE: Record<SalonReminderStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  sent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
};

const TYPE_LABEL: Record<SalonReminderType, string> = {
  booking_lead: "Booking reminder",
  birthday: "Birthday offer",
  winback: "Win-back offer",
};

const TYPE_ICON: Record<SalonReminderType, typeof Calendar> = {
  booking_lead: Calendar,
  birthday: Cake,
  winback: UserRound,
};

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const leadLabel = (mins: number | null): string => {
  if (mins == null) return "";
  if (mins >= 24 * 60 - 60 && mins <= 24 * 60 + 60) return "24h before";
  if (mins >= 60) return `${Math.round(mins / 60)}h before`;
  return `${mins}m before`;
};

export default function SalonRemindersSection({ storeId }: Props) {
  const { user } = useAuth();
  const { settings, loading, saving, error, save } = useSalonReminderSettings(storeId);
  const { rows, loading: logLoading, error: logError, pendingTodayCount } = useSalonReminders(storeId);
  const { overrides, save: saveTemplate, resetToDefault } = useSalonReminderTemplates(storeId);

  // Commit-on-blur drafts for the numeric inputs.
  const [discountDraft, setDiscountDraft] = useState(String(settings.birthday_discount_percent));
  const [winbackDraft, setWinbackDraft] = useState(String(settings.winback_days_threshold));
  const [senderDraft, setSenderDraft] = useState(settings.sender_name ?? "");
  useEffect(() => { setDiscountDraft(String(settings.birthday_discount_percent)); }, [settings.birthday_discount_percent]);
  useEffect(() => { setWinbackDraft(String(settings.winback_days_threshold)); }, [settings.winback_days_threshold]);
  useEffect(() => { setSenderDraft(settings.sender_name ?? ""); }, [settings.sender_name]);

  const leadHoursSet = useMemo(() => new Set(settings.booking_reminder_lead_hours), [settings.booking_reminder_lead_hours]);
  const toggleLeadHour = async (value: number) => {
    const next = leadHoursSet.has(value)
      ? settings.booking_reminder_lead_hours.filter((h) => h !== value)
      : [...settings.booking_reminder_lead_hours, value];
    if (next.length === 0) {
      toast.error("Pick at least one lead time, or turn the booking reminder off.");
      return;
    }
    await save({ booking_reminder_lead_hours: next });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading reminder settings…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header summary card */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5 text-primary" /> Automated reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Send the right nudge at the right time. Reminders are scheduled automatically
            from your booking calendar and your client book — no manual sending required.
          </p>
          <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
            {pendingTodayCount > 0
              ? `${pendingTodayCount} reminder${pendingTodayCount === 1 ? "" : "s"} scheduled to go out in the next 24 hours.`
              : "No reminders queued for the next 24 hours."}
          </p>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Booking reminder ----------------------------------------------- */}
          <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Booking reminder</p>
              <p className="text-xs text-muted-foreground">
                Auto-send SMS + email before each pending/confirmed booking.
                Pick one or more lead times (up to 5). Transactional — sent to anyone who didn't opt out.
              </p>
            </div>
            <Switch
              checked={settings.booking_reminder_enabled}
              onCheckedChange={(v) => void save({ booking_reminder_enabled: v })}
              disabled={saving}
            />
          </label>
          {settings.booking_reminder_enabled && (
            <div className="ml-4 space-y-2">
              <Label>Send a reminder…</Label>
              <div className="flex flex-wrap gap-2">
                {LEAD_HOUR_OPTIONS.map((opt) => {
                  const active = leadHoursSet.has(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => void toggleLeadHour(opt.value)}
                      disabled={saving}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground/75 hover:border-primary/40",
                      )}
                    >
                      {opt.label} before
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Most salons combine "1 day" + "2h" — a heads-up the day before plus a final
                reminder the same day. You can pick up to 5 intervals.
              </p>
            </div>
          )}

          <div className="h-px bg-border" />

          {/* Birthday offer ------------------------------------------------- */}
          <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Birthday offer</p>
              <p className="text-xs text-muted-foreground">
                Send a happy-birthday message on the day, optionally with a discount.
                <strong> Marketing</strong> — only sent to clients who explicitly opted in.
              </p>
            </div>
            <Switch
              checked={settings.birthday_enabled}
              onCheckedChange={(v) => void save({ birthday_enabled: v })}
              disabled={saving}
            />
          </label>
          {settings.birthday_enabled && (
            <div className="ml-4 space-y-1.5">
              <Label htmlFor="rmDiscount">Birthday discount (% off)</Label>
              <Input
                id="rmDiscount"
                type="number"
                min={0}
                max={50}
                value={discountDraft}
                onChange={(e) => setDiscountDraft(e.target.value)}
                onBlur={() => {
                  const n = Math.max(0, Math.min(50, parseInt(discountDraft, 10) || 0));
                  if (n !== settings.birthday_discount_percent) void save({ birthday_discount_percent: n });
                  setDiscountDraft(String(n));
                }}
                disabled={saving}
                className="w-32"
              />
              <p className="text-[11px] text-muted-foreground">Leave at 0 to skip the discount line in the message.</p>
            </div>
          )}

          <div className="h-px bg-border" />

          {/* Win-back ------------------------------------------------------- */}
          <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Win-back offer</p>
              <p className="text-xs text-muted-foreground">
                Reach out to clients who haven't visited in a while. <strong>Marketing</strong>.
              </p>
            </div>
            <Switch
              checked={settings.winback_enabled}
              onCheckedChange={(v) => void save({ winback_enabled: v })}
              disabled={saving}
            />
          </label>
          {settings.winback_enabled && (
            <div className="ml-4 space-y-1.5">
              <Label htmlFor="rmWinback">Send after this many days of inactivity</Label>
              <Input
                id="rmWinback"
                type="number"
                min={30}
                max={365}
                value={winbackDraft}
                onChange={(e) => setWinbackDraft(e.target.value)}
                onBlur={() => {
                  const n = Math.max(30, Math.min(365, parseInt(winbackDraft, 10) || 60));
                  if (n !== settings.winback_days_threshold) void save({ winback_days_threshold: n });
                  setWinbackDraft(String(n));
                }}
                disabled={saving}
                className="w-32"
              />
            </div>
          )}

          <div className="h-px bg-border" />

          {/* Sender name override ------------------------------------------ */}
          <div className="space-y-1.5">
            <Label htmlFor="rmSender">Salon name shown in messages (optional)</Label>
            <Input
              id="rmSender"
              type="text"
              maxLength={80}
              value={senderDraft}
              onChange={(e) => setSenderDraft(e.target.value)}
              onBlur={() => {
                const v = senderDraft.trim() || null;
                if (v !== settings.sender_name) void save({ sender_name: v });
                setSenderDraft(v ?? "");
              }}
              disabled={saving}
              placeholder="Defaults to your store's display name"
            />
          </div>

          {saving && (
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" /> Templates
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Customize the copy used in each reminder. Leave a field blank to use the default.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(TEMPLATE_META) as SalonTemplateKey[]).map((key) => (
            <TemplateBlock
              key={key}
              templateKey={key}
              override={overrides[key]}
              onSave={(patch) => saveTemplate(key, patch)}
              onReset={() => resetToDefault(key)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Send test */}
      <TestSendCard storeId={storeId} senderName={settings.sender_name} ownerEmail={user?.email ?? null} />

      {/* Activity log */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <span className="text-[11px] text-muted-foreground">last 50</span>
        </CardHeader>
        <CardContent>
          {logError && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{logError}</span>
            </div>
          )}

          {logLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No reminders sent yet. They'll show up here once your first booking's lead window comes around.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {rows.map((r) => {
                const Icon = TYPE_ICON[r.reminder_type];
                const isOverdue = r.status === "pending" && new Date(r.scheduled_for).getTime() < Date.now() - 60 * 60 * 1000;
                return (
                  <li key={r.id} className="flex items-start gap-3 p-3">
                    <div className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                      r.status === "sent" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : r.status === "failed" ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {TYPE_LABEL[r.reminder_type]}
                          {r.reminder_type === "booking_lead" && r.lead_minutes ? (
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground">({leadLabel(r.lead_minutes)})</span>
                          ) : null}
                          {r.client_name ? <> · <span className="font-normal">{r.client_name}</span></> : null}
                        </p>
                        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_TONE[r.status])}>
                          {r.status}
                        </span>
                        {r.channel_sms && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><MessageSquare className="h-2.5 w-2.5" /> SMS</span>
                        )}
                        {r.channel_email && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Mail className="h-2.5 w-2.5" /> Email</span>
                        )}
                      </div>
                      {r.service_name && (
                        <p className="truncate text-xs text-muted-foreground">{r.service_name}</p>
                      )}
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {r.status === "sent" && r.sent_at
                          ? <>Sent {formatWhen(r.sent_at)}</>
                          : <>Scheduled {formatWhen(r.scheduled_for)}</>}
                      </p>
                      {r.error && (
                        <p className="mt-1 truncate text-[11px] text-destructive" title={r.error}>
                          <XCircle className="-mt-0.5 mr-1 inline h-3 w-3" /> {r.error}
                        </p>
                      )}
                      {isOverdue && (
                        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                          <AlertCircle className="-mt-0.5 mr-1 inline h-3 w-3" /> Should have sent already — check the next cron run.
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Templates editor sub-component -----------------------------------------

function TemplateBlock({
  templateKey, override, onSave, onReset,
}: {
  templateKey: SalonTemplateKey;
  override: ReturnType<typeof useSalonReminderTemplates>["overrides"][SalonTemplateKey];
  onSave: (patch: { subject?: string | null; body_html?: string | null; sms_body?: string | null }) => Promise<boolean>;
  onReset: () => Promise<boolean>;
}) {
  const meta = TEMPLATE_META[templateKey];
  const [subject, setSubject] = useState(override.subject ?? "");
  const [body, setBody] = useState(override.body_html ?? "");
  const [sms, setSms] = useState(override.sms_body ?? "");
  useEffect(() => { setSubject(override.subject ?? ""); }, [override.subject]);
  useEffect(() => { setBody(override.body_html ?? ""); }, [override.body_html]);
  useEffect(() => { setSms(override.sms_body ?? ""); }, [override.sms_body]);

  const isCustomized = override.subject !== null || override.body_html !== null || override.sms_body !== null;

  const commit = async (field: "subject" | "body_html" | "sms_body", value: string) => {
    const v = value.trim() || null;
    await onSave({ [field]: v });
  };

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{meta.title}</p>
          <p className="text-[11px] text-muted-foreground">{meta.description}</p>
        </div>
        {isCustomized && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs"
            onClick={async () => {
              if (!window.confirm("Reset this template to the default copy?")) return;
              const ok = await onReset();
              if (ok) toast.success("Reset to default.");
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor={`tpl-${templateKey}-subject`} className="text-[11px] uppercase tracking-wider text-muted-foreground">Email subject</Label>
          <Input
            id={`tpl-${templateKey}-subject`}
            placeholder={meta.defaultSubject}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onBlur={() => { if (subject !== (override.subject ?? "")) void commit("subject", subject); }}
            maxLength={200}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`tpl-${templateKey}-body`} className="text-[11px] uppercase tracking-wider text-muted-foreground">Email body (HTML allowed)</Label>
          <Textarea
            id={`tpl-${templateKey}-body`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => { if (body !== (override.body_html ?? "")) void commit("body_html", body); }}
            rows={4}
            maxLength={20000}
            placeholder="Leave blank to use the default."
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`tpl-${templateKey}-sms`} className="text-[11px] uppercase tracking-wider text-muted-foreground">SMS body</Label>
          <Textarea
            id={`tpl-${templateKey}-sms`}
            value={sms}
            onChange={(e) => setSms(e.target.value)}
            onBlur={() => { if (sms !== (override.sms_body ?? "")) void commit("sms_body", sms); }}
            rows={2}
            maxLength={320}
            placeholder={meta.defaultSmsHint}
          />
          <p className="text-right text-[10px] text-muted-foreground">{sms.length}/320</p>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Available merge tags: {meta.mergeTags.map((t) => <code key={t} className="mr-1.5 rounded bg-muted px-1 py-0.5">{`{{${t}}}`}</code>)}
        </p>
      </div>
    </div>
  );
}

// ---- Test-send sub-component -------------------------------------------------

function TestSendCard({
  storeId, senderName, ownerEmail,
}: { storeId: string; senderName: string | null; ownerEmail: string | null }) {
  const [type, setType] = useState<SalonTemplateKey>("salon-booking-reminder-24h");
  const [email, setEmail] = useState(ownerEmail ?? "");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => { if (ownerEmail && !email) setEmail(ownerEmail); }, [ownerEmail, email]);

  const handleSend = async () => {
    if (!email && !phone) {
      toast.error("Add at least an email or phone to test.");
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("That email looks malformed.");
      return;
    }
    setSending(true);
    try {
      const sampleData: Record<string, unknown> = {
        client_first_name: "Sam",
        client_name: "Sam Tester",
        service_name: "Sample service",
        stylist_name: "Your stylist",
        start_at_local: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }),
        lead_phrase: "tomorrow",
        salon_name: senderName ?? "your salon",
        salon_phone: "+1 555-555-5555",
        birthday_discount_percent: 15,
        days_since_last_visit: 60,
        booking_url: `${window.location.origin}/salon`,
        store_id: storeId,
      };
      const idempotencyKey = `test-${storeId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tasks: Promise<unknown>[] = [];
      if (email) {
        tasks.push(supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: type,
            recipientEmail: email,
            idempotencyKey,
            templateData: sampleData,
          },
        }));
      }
      if (phone) {
        // Compose a minimal SMS body — owner can preview wording from the
        // template editor, this just confirms the SMS path is wired.
        const smsBody = `${sampleData.salon_name}: This is a test ${TEMPLATE_META[type].title.toLowerCase()} — your live messages will look like the wording you set above.`;
        tasks.push(supabase.functions.invoke("send-sms", {
          body: { to: phone, body: smsBody },
        }));
      }
      await Promise.all(tasks);
      toast.success("Test sent — check your inbox/phone.");
    } catch (e) {
      toast.error((e as Error).message || "Couldn't send the test.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-5 w-5 text-primary" /> Send a test
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Fire a sample reminder to your own contact info so you can preview the wording before turning it on.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="testType">Reminder type</Label>
            <select
              id="testType"
              value={type}
              onChange={(e) => setType(e.target.value as SalonTemplateKey)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {(Object.keys(TEMPLATE_META) as SalonTemplateKey[]).map((k) => (
                <option key={k} value={k}>{TEMPLATE_META[k].title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="testEmail">Email</Label>
            <Input id="testEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" maxLength={254} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="testPhone">Phone</Label>
            <Input id="testPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+15555555555" maxLength={30} />
          </div>
        </div>
        <Button type="button" onClick={() => void handleSend()} disabled={sending} className="gap-1.5">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send test
        </Button>
        <p className="text-[11px] text-muted-foreground">
          A test send writes a notification_audit row but doesn't create a salon_reminders row,
          so it won't affect your live queue.
        </p>
      </CardContent>
    </Card>
  );
}
