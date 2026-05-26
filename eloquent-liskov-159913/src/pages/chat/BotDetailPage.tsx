import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSmartBack } from "@/lib/smartBack";
import { ArrowLeft, Copy, RefreshCw, Trash2, Plus, X, Bot as BotIcon, MessageCircle, Send, Activity, Users, Clock, Flag, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

const SEND_ENDPOINT = "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/bot-send-message";
const AI_HANDLER_BASE = "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/bot-ai-handler";

type Bot = {
  id: string;
  bot_user_id: string;
  username: string;
  display_name: string;
  description: string | null;
  avatar_url: string | null;
  webhook_url: string | null;
  webhook_secret: string | null;
  is_active: boolean;
  category: string | null;
  ai_system_prompt: string | null;
  ai_knowledge: string | null;
  ai_model: string | null;
  ai_temperature: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  last_webhook_status: number | null;
  last_webhook_at: string | null;
  last_webhook_error: string | null;
};

type Activity = { id: number; kind: string; status: string | null; detail: string | null; created_at: string };
type WebhookCall = {
  id: number;
  message_id: string | null;
  response_status: number | null;
  response_body: string | null;
  duration_ms: number | null;
  attempt: number;
  error: string | null;
  created_at: string;
};

const CATEGORY_OPTIONS = ["ai", "productivity", "fun", "news", "finance", "social", "tools", "other"];

type Stats = { received: number; sent: number; unique_users: number; last_msg_at: string | null };
type ReportSummary = { open_count: number; total_count: number; last_reason: string | null; last_at: string | null };
type Daily = { day: string; received: number; sent: number };
type Schedule = {
  id: string;
  text: string | null;
  next_run_at: string;
  interval_minutes: number | null;
  last_run_at: string | null;
  last_sent_count: number | null;
  is_active: boolean;
};

type Command = { id: string; command: string; description: string };
type Workflow = {
  id: string;
  name: string;
  trigger_type: "command" | "keyword" | "regex" | "start" | "any" | "first";
  trigger_value: string;
  reply_text: string | null;
  next_webhook: boolean;
  is_active: boolean;
};

type Tool = {
  id: string;
  name: string;
  description: string;
  http_method: string;
  url: string;
  input_schema: any;
  is_active: boolean;
};

type App = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon_emoji: string | null;
  app_url: string;
  is_active: boolean;
};

type Pay = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  amount_cents: number;
  currency: string;
  checkout_url: string;
  is_active: boolean;
};

export default function BotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat/bots");
  const [bot, setBot] = useState<Bot | null>(null);
  const [commands, setCommands] = useState<Command[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [pays, setPays] = useState<Pay[]>([]);
  const [newPaySlug, setNewPaySlug] = useState("");
  const [newPayTitle, setNewPayTitle] = useState("");
  const [newPayAmount, setNewPayAmount] = useState("");
  const [newPayCurrency, setNewPayCurrency] = useState("usd");
  const [newPayUrl, setNewPayUrl] = useState("");
  const [newAppSlug, setNewAppSlug] = useState("");
  const [newAppTitle, setNewAppTitle] = useState("");
  const [newAppEmoji, setNewAppEmoji] = useState("");
  const [newAppUrl, setNewAppUrl] = useState("");
  const [newToolName, setNewToolName] = useState("");
  const [newToolDesc, setNewToolDesc] = useState("");
  const [newToolUrl, setNewToolUrl] = useState("");
  const [newToolMethod, setNewToolMethod] = useState("GET");
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<ReportSummary | null>(null);
  const [daily, setDaily] = useState<Daily[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [whCalls, setWhCalls] = useState<WebhookCall[]>([]);
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [newBotToken, setNewBotToken] = useState<string | null>(null);
  const [newBotTokenCopied, setNewBotTokenCopied] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schText, setSchText] = useState("");
  const [schWhen, setSchWhen] = useState("");
  const [schInterval, setSchInterval] = useState<string>("");
  const [wfTrigger, setWfTrigger] = useState<Workflow["trigger_type"]>("command");
  const [wfValue, setWfValue] = useState("");
  const [wfReply, setWfReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tokenShown, setTokenShown] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newCmd, setNewCmd] = useState("");
  const [newCmdDesc, setNewCmdDesc] = useState("");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: b, error: be }, { data: c }, { data: w }, { data: s }, { data: sch }, { data: rep }, { data: dly }, { data: act }, { data: whc }, { data: tls }, { data: aps }, { data: pys }] = await Promise.all([
      supabase.from("bots").select("id, bot_user_id, username, display_name, description, avatar_url, webhook_url, webhook_secret, is_active, category, ai_system_prompt, ai_knowledge, ai_model, ai_temperature, rating_avg, rating_count, last_webhook_status, last_webhook_at, last_webhook_error").eq("id", id).maybeSingle(),
      supabase.from("bot_commands").select("id, command, description").eq("bot_id", id).order("sort_order"),
      supabase.from("bot_workflows").select("id, name, trigger_type, trigger_value, reply_text, next_webhook, is_active").eq("bot_id", id).order("sort_order"),
      supabase.rpc("bot_stats", { p_bot_id: id }),
      supabase.from("bot_scheduled_messages").select("id, text, next_run_at, interval_minutes, last_run_at, last_sent_count, is_active").eq("bot_id", id).order("next_run_at"),
      supabase.rpc("bot_report_summary", { p_bot_id: id }),
      supabase.rpc("bot_messages_daily", { p_bot_id: id, p_days: 14 }),
      supabase.from("bot_activity").select("id, kind, status, detail, created_at").eq("bot_id", id).order("id", { ascending: false }).limit(40),
      supabase.from("bot_webhook_calls").select("id, message_id, response_status, response_body, duration_ms, attempt, error, created_at").eq("bot_id", id).order("id", { ascending: false }).limit(20),
      supabase.from("bot_tools").select("id, name, description, http_method, url, input_schema, is_active").eq("bot_id", id).order("sort_order"),
      supabase.from("bot_apps").select("id, slug, title, description, icon_emoji, app_url, is_active").eq("bot_id", id).order("sort_order"),
      supabase.from("bot_payment_links").select("id, slug, title, description, amount_cents, currency, checkout_url, is_active").eq("bot_id", id).order("sort_order"),
    ]);
    if (be) toast.error(be.message);
    setBot(b as Bot | null);
    setCommands((c ?? []) as Command[]);
    setWorkflows((w ?? []) as Workflow[]);
    const st = Array.isArray(s) ? s[0] : s;
    setStats(st as Stats | null);
    setSchedules((sch ?? []) as Schedule[]);
    const rs = Array.isArray(rep) ? rep[0] : rep;
    setReports(rs as ReportSummary | null);
    setDaily(((dly ?? []) as any[]).map((d) => ({ day: d.day, received: Number(d.received), sent: Number(d.sent) })));
    setActivity((act ?? []) as Activity[]);
    setWhCalls((whc ?? []) as WebhookCall[]);
    setTools((tls ?? []) as Tool[]);
    setApps((aps ?? []) as App[]);
    setPays((pys ?? []) as Pay[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const save = async (patch: Partial<Bot>) => {
    if (!bot) return;
    setSaving(true);
    const { error } = await supabase.from("bots").update(patch).eq("id", bot.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setBot({ ...bot, ...patch });
    toast.success("Saved");
  };

  const addPay = async () => {
    if (!bot) return;
    const slug = newPaySlug.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,40}$/.test(slug)) return toast.error("Slug: lowercase a-z/0-9/_-, 2-40");
    if (!newPayTitle.trim()) return toast.error("Title required");
    const cents = Math.round(parseFloat(newPayAmount) * 100);
    if (!cents || cents <= 0) return toast.error("Invalid amount");
    if (!/^https:\/\//.test(newPayUrl.trim())) return toast.error("Checkout URL must be https://");
    const { error } = await supabase.from("bot_payment_links").insert({
      bot_id: bot.id, slug, title: newPayTitle.trim(),
      amount_cents: cents, currency: newPayCurrency.toLowerCase(),
      checkout_url: newPayUrl.trim(),
    });
    if (error) return toast.error(error.message);
    setNewPaySlug(""); setNewPayTitle(""); setNewPayAmount(""); setNewPayUrl("");
    toast.success("Payment link added");
    load();
  };
  const removePay = async (pid: string) => {
    const { error } = await supabase.from("bot_payment_links").delete().eq("id", pid);
    if (error) return toast.error(error.message);
    load();
  };

  const addApp = async () => {
    if (!bot) return;
    const slug = newAppSlug.trim().toLowerCase();
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) return toast.error("Slug: lowercase a-z/0-9/-, 2-40 chars");
    if (!newAppTitle.trim()) return toast.error("Title required");
    if (!/^https:\/\//.test(newAppUrl.trim())) return toast.error("URL must start with https://");
    const { error } = await supabase.from("bot_apps").insert({
      bot_id: bot.id, slug, title: newAppTitle.trim(),
      icon_emoji: newAppEmoji.trim() || null, app_url: newAppUrl.trim(),
    });
    if (error) return toast.error(error.message);
    setNewAppSlug(""); setNewAppTitle(""); setNewAppEmoji(""); setNewAppUrl("");
    toast.success("Mini-app added");
    load();
  };
  const removeApp = async (aid: string) => {
    const { error } = await supabase.from("bot_apps").delete().eq("id", aid);
    if (error) return toast.error(error.message);
    load();
  };

  const addTool = async () => {
    if (!bot) return;
    const n = newToolName.trim().toLowerCase();
    if (!/^[a-z0-9_]{1,40}$/.test(n)) return toast.error("Name: lowercase a-z/0-9/_, max 40");
    if (!newToolUrl.trim()) return toast.error("URL required");
    const { error } = await supabase.from("bot_tools").insert({
      bot_id: bot.id, name: n, description: newToolDesc.trim(),
      http_method: newToolMethod, url: newToolUrl.trim(),
      input_schema: { type: "object", properties: {}, required: [] },
    });
    if (error) return toast.error(error.message);
    setNewToolName(""); setNewToolDesc(""); setNewToolUrl(""); setNewToolMethod("GET");
    load();
  };
  const removeTool = async (tid: string) => {
    const { error } = await supabase.from("bot_tools").delete().eq("id", tid);
    if (error) return toast.error(error.message);
    load();
  };
  const editToolSchema = async (t: Tool) => {
    const v = prompt("Input schema (JSON Schema):", JSON.stringify(t.input_schema, null, 2));
    if (!v) return;
    try {
      const parsed = JSON.parse(v);
      const { error } = await supabase.from("bot_tools").update({ input_schema: parsed }).eq("id", t.id);
      if (error) return toast.error(error.message);
      toast.success("Schema saved");
      load();
    } catch (e) { toast.error("Invalid JSON"); }
  };

  const rotateSecret = async () => {
    if (!bot) return;
    if (!confirm("Rotate webhook secret? Any server validating signatures must update to the new value.")) return;
    const { data, error } = await supabase.rpc("rotate_webhook_secret", { p_bot_id: bot.id });
    if (error) return toast.error(error.message);
    setBot({ ...bot, webhook_secret: data as string });
    toast.success("Secret rotated");
  };

  const regenerate = async () => {
    if (!bot) return;
    const { data, error } = await supabase.rpc("regenerate_bot_token", { p_bot_id: bot.id });
    if (error) return toast.error(error.message);
    setTokenShown(data as string);
  };

  const remove = async () => {
    if (!bot) return;
    const { error } = await supabase.from("bots").delete().eq("id", bot.id);
    if (error) return toast.error(error.message);
    toast.success("Bot deleted");
    navigate("/chat/bots");
  };

  const addCommand = async () => {
    if (!bot) return;
    const cmd = newCmd.trim().toLowerCase().replace(/^\//, "");
    if (!/^[a-z0-9_]{1,32}$/.test(cmd)) return toast.error("Command: lowercase a-z/0-9/_, max 32");
    const { error } = await supabase.from("bot_commands").insert({
      bot_id: bot.id, command: cmd, description: newCmdDesc.trim(),
    });
    if (error) return toast.error(error.message);
    setNewCmd(""); setNewCmdDesc("");
    load();
  };

  const removeCommand = async (cid: string) => {
    const { error } = await supabase.from("bot_commands").delete().eq("id", cid);
    if (error) return toast.error(error.message);
    load();
  };

  const addWorkflow = async () => {
    if (!bot) return;
    if (!wfReply.trim()) return toast.error("Reply text required");
    if (wfTrigger !== "any" && wfTrigger !== "start" && !wfValue.trim()) {
      return toast.error("Trigger value required");
    }
    const { error } = await supabase.from("bot_workflows").insert({
      bot_id: bot.id,
      trigger_type: wfTrigger,
      trigger_value: wfValue.trim(),
      reply_text: wfReply.trim(),
    });
    if (error) return toast.error(error.message);
    setWfValue(""); setWfReply("");
    load();
  };

  const removeWorkflow = async (wid: string) => {
    const { error } = await supabase.from("bot_workflows").delete().eq("id", wid);
    if (error) return toast.error(error.message);
    load();
  };

  const addSchedule = async () => {
    if (!bot) return;
    if (!schText.trim()) return toast.error("Message required");
    if (!schWhen) return toast.error("Pick a date/time");
    const when = new Date(schWhen);
    if (isNaN(when.getTime())) return toast.error("Invalid date");
    if (when.getTime() < Date.now() - 60_000) return toast.error("Time is in the past");
    const interval = schInterval ? parseInt(schInterval, 10) : null;
    if (interval !== null && (isNaN(interval) || interval < 1)) return toast.error("Interval must be >= 1 minute");
    const { error } = await supabase.from("bot_scheduled_messages").insert({
      bot_id: bot.id,
      audience: "all",
      text: schText.trim(),
      next_run_at: when.toISOString(),
      interval_minutes: interval,
    });
    if (error) return toast.error(error.message);
    setSchText(""); setSchWhen(""); setSchInterval("");
    toast.success("Scheduled");
    load();
  };

  const removeSchedule = async (sid: string) => {
    const { error } = await supabase.from("bot_scheduled_messages").delete().eq("id", sid);
    if (error) return toast.error(error.message);
    load();
  };

  const cloneBot = async () => {
    if (!bot) return;
    const newUsername = prompt(`Clone @${bot.username}. New username (must end in _bot):`);
    if (!newUsername) return;
    const newName = prompt("New display name:", `${bot.display_name} (copy)`) ?? bot.display_name;
    const { data, error } = await supabase.functions.invoke("bot-clone", {
      body: { source_bot_id: bot.id, new_username: newUsername.toLowerCase(), new_display_name: newName },
    });
    if (error) return toast.error(error.message);
    if ((data as any)?.error) return toast.error((data as any).error);

    const token: string | undefined = (data as any)?.token;
    let copied = false;
    if (token) {
      try {
        await navigator.clipboard.writeText(token);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (token) {
      // Surface the token in a dialog so the user can copy it manually if the
      // browser blocked clipboard access. Token is shown ONCE — on this clone
      // event only — and never stored client-side.
      setNewBotToken(token);
      setNewBotTokenCopied(copied);
    }
    toast.success(copied ? "Bot cloned — token copied" : "Bot cloned — copy the token below");
    navigate(`/chat/bots/${(data as any).bot_id}`);
  };

  const exportConversation = async () => {
    if (!bot) return;
    const userId = prompt("User UUID to export conversation with:");
    if (!userId) return;
    const { data, error } = await supabase.rpc("bot_export_conversation", { p_bot_id: bot.id, p_user_id: userId });
    if (error) return toast.error(error.message);
    const rows = (data ?? []) as any[];
    if (!rows.length) return toast.error("No messages found");
    const csv = [
      "id,from,sender_id,message,image_url,created_at",
      ...rows.map((r) => {
        const from = r.sender_id === bot.bot_user_id ? "bot" : "user";
        const msg = (r.message ?? "").replace(/"/g, '""');
        return `${r.id},${from},${r.sender_id},"${msg}",${r.image_url ?? ""},${r.created_at}`;
      }),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${bot.username}-${userId.slice(0, 8)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} messages`);
  };

  const retryWebhook = async (callId: number) => {
    if (!bot) return;
    const { error } = await supabase.functions.invoke("bot-dispatch", {
      body: { bot_id: bot.id, retry_call_id: callId },
    });
    if (error) return toast.error(error.message);
    toast.success("Retry queued");
    setTimeout(load, 1000);
  };

  const broadcast = async () => {
    if (!bot) return;
    if (!broadcastText.trim()) return toast.error("Message required");
    if (!confirm(`Broadcast to ${stats?.unique_users ?? 0} users?`)) return;
    setBroadcasting(true);
    const { data, error } = await supabase.functions.invoke("bot-broadcast", {
      body: { bot_id: bot.id, text: broadcastText.trim() },
    });
    setBroadcasting(false);
    if (error) return toast.error(error.message);
    if ((data as any)?.error) return toast.error((data as any).error);
    toast.success(`Sent to ${(data as any)?.sent ?? 0} users`);
    setBroadcastText("");
    load();
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!bot) return <div className="p-6 text-sm">Bot not found.</div>;

  return (
    <div className="min-h-screen bg-background pb-[var(--zivo-safe-bottom,0px)]">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border safe-area-top">
        <div className="flex items-center gap-2 h-14 px-2">
          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold flex-1 truncate">@{bot.username}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <section className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {bot.avatar_url
              ? <img src={bot.avatar_url} alt="" className="w-full h-full object-cover" />
              : <BotIcon className="w-7 h-7 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold truncate flex items-center gap-1">
              {bot.display_name}
              <span className="text-[10px] uppercase bg-primary/10 text-primary rounded px-1 py-0.5">bot</span>
            </div>
            <div className="text-xs text-muted-foreground truncate">@{bot.username}</div>
            <div className="text-xs mt-0.5">
              <span className={bot.is_active ? "text-emerald-600" : "text-muted-foreground"}>
                {bot.is_active ? "● active" : "○ inactive"}
              </span>
              {!bot.webhook_url && <span className="text-amber-600 ml-2">· webhook not set</span>}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Button size="sm" variant="outline" onClick={() => navigate(`/chat?with=${bot.bot_user_id}`)} className="gap-1">
              <MessageCircle className="w-4 h-4" /> Test
            </Button>
            <Button
              size="sm" variant="ghost"
              onClick={() => {
                const url = `${window.location.origin}/chat?with=${bot.bot_user_id}`;
                if (navigator.share) navigator.share({ title: `Chat with ${bot.display_name}`, url }).catch(() => {});
                else { navigator.clipboard.writeText(url); toast.success("Link copied"); }
              }}
              className="gap-1"
            >
              <Send className="w-4 h-4" /> Share
            </Button>
            <Button size="sm" variant="ghost" onClick={cloneBot} className="gap-1">
              <Copy className="w-4 h-4" /> Clone
            </Button>
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Display name</label>
            <Input
              value={bot.display_name}
              onChange={(e) => setBot({ ...bot, display_name: e.target.value })}
              onBlur={(e) => e.target.value !== bot.display_name && save({ display_name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <Textarea
              rows={2}
              value={bot.description ?? ""}
              onChange={(e) => setBot({ ...bot, description: e.target.value })}
              onBlur={(e) => save({ description: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Avatar URL</label>
            <Input
              placeholder="https://…/avatar.png"
              value={bot.avatar_url ?? ""}
              onChange={(e) => setBot({ ...bot, avatar_url: e.target.value })}
              onBlur={(e) => save({ avatar_url: e.target.value || null })}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm">Category</div>
            <select
              value={bot.category ?? "other"}
              onChange={(e) => { setBot({ ...bot, category: e.target.value }); save({ category: e.target.value }); }}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs"
            >
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm">Active</div>
            <Switch checked={bot.is_active} onCheckedChange={(v) => save({ is_active: v })} />
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <div className="text-sm font-medium">Webhook URL</div>
          <p className="text-xs text-muted-foreground">
            We POST messages to this URL. Reply by calling <span className="font-mono">{SEND_ENDPOINT}</span> with your token.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://your-server.com/zivo-bot"
              value={bot.webhook_url ?? ""}
              onChange={(e) => setBot({ ...bot, webhook_url: e.target.value })}
              onBlur={(e) => save({ webhook_url: e.target.value || null })}
              className="flex-1"
            />
            {bot.webhook_url && (
              <Button
                size="icon"
                variant="outline"
                onClick={() => { navigator.clipboard.writeText(bot.webhook_url!); toast.success("Copied"); }}
                aria-label="Copy webhook"
              >
                <Copy className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1"
              onClick={async () => {
                const tk = prompt("Paste this bot's token to enable AI replies (we don't store it):");
                if (!tk) return;
                const wh = `${AI_HANDLER_BASE}?bot_token=${encodeURIComponent(tk)}`;
                await save({ webhook_url: wh });
                toast.success("AI replies enabled — bot now answers via Claude");
              }}
            >
              Make this an AI bot (Claude-powered)
            </Button>
          </div>
          <div className="pt-2 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium">Webhook secret (HMAC)</div>
              <Button size="sm" variant="ghost" onClick={rotateSecret} className="gap-1 h-7">
                <RefreshCw className="w-3.5 h-3.5" /> Rotate
              </Button>
            </div>
            <div className="flex gap-2">
              <Input value={bot.webhook_secret ?? ""} readOnly className="font-mono text-xs flex-1" />
              <Button
                size="icon" variant="outline"
                onClick={() => { navigator.clipboard.writeText(bot.webhook_secret ?? ""); toast.success("Copied"); }}
                aria-label="Copy"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              We sign every webhook with this secret as <span className="font-mono">X-Bot-Signature: sha256=&lt;hex&gt;</span>. Verify in your server: <span className="font-mono">hmac_sha256(secret, raw_body)</span>.
            </p>
          </div>
        </section>

        {bot.webhook_url?.includes("/bot-ai-handler") && (
          <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
            <div className="text-sm font-medium flex items-center gap-1">
              ✨ AI configuration
            </div>
            <div className="text-xs text-muted-foreground -mt-1">
              Tune your AI bot's persona and knowledge. Saved automatically.
            </div>
            <div>
              <label className="text-xs text-muted-foreground">System prompt (persona)</label>
              <Textarea
                rows={3}
                placeholder="You are a helpful customer support agent for Acme Inc. Stay friendly and concise."
                value={bot.ai_system_prompt ?? ""}
                onChange={(e) => setBot({ ...bot, ai_system_prompt: e.target.value })}
                onBlur={(e) => save({ ai_system_prompt: e.target.value || null })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Knowledge base</label>
              <Textarea
                rows={6}
                placeholder="FAQs, product docs, policies… anything the bot should know. Max ~10k chars."
                value={bot.ai_knowledge ?? ""}
                onChange={(e) => setBot({ ...bot, ai_knowledge: e.target.value })}
                onBlur={(e) => save({ ai_knowledge: e.target.value || null })}
              />
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {(bot.ai_knowledge ?? "").length} chars
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Model</label>
                <select
                  value={bot.ai_model ?? "claude-haiku-4-5-20251001"}
                  onChange={(e) => { setBot({ ...bot, ai_model: e.target.value }); save({ ai_model: e.target.value }); }}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                >
                  <option value="claude-haiku-4-5-20251001">Haiku 4.5 (fast)</option>
                  <option value="claude-sonnet-4-6">Sonnet 4.6 (smart)</option>
                  <option value="claude-opus-4-7">Opus 4.7 (smartest)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Temperature</label>
                <Input
                  type="number" step="0.1" min={0} max={1}
                  value={bot.ai_temperature ?? 0.7}
                  onChange={(e) => setBot({ ...bot, ai_temperature: parseFloat(e.target.value) })}
                  onBlur={(e) => save({ ai_temperature: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <div className="text-xs font-medium">🔧 Tools (function calling)</div>
              <div className="text-[11px] text-muted-foreground -mt-1">
                Give the AI HTTP endpoints it can call when it needs data or to take actions. Claude decides when to use them.
              </div>
              <div className="space-y-1">
                {tools.map((t) => (
                  <div key={t.id} className="flex items-start gap-2 rounded-lg border border-border p-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono">{t.name} <span className="text-muted-foreground">· {t.http_method}</span></div>
                      <div className="text-muted-foreground truncate">{t.url}</div>
                      {t.description && <div className="text-muted-foreground line-clamp-1">{t.description}</div>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => editToolSchema(t)} className="h-6 px-2 text-[10px]">Schema</Button>
                    <button onClick={() => removeTool(t.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {tools.length === 0 && <div className="text-[11px] text-muted-foreground">No tools yet.</div>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="get_weather" value={newToolName} onChange={(e) => setNewToolName(e.target.value)} />
                <select
                  value={newToolMethod}
                  onChange={(e) => setNewToolMethod(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 text-xs"
                >
                  {["GET","POST","PUT","DELETE","PATCH"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <Input placeholder="https://api.example.com/weather" value={newToolUrl} onChange={(e) => setNewToolUrl(e.target.value)} />
              <Input placeholder="What this tool does (Claude reads this)" value={newToolDesc} onChange={(e) => setNewToolDesc(e.target.value)} />
              <Button size="sm" onClick={addTool} className="gap-1">
                <Plus className="w-4 h-4" /> Add tool
              </Button>
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Token</div>
            <Button size="sm" variant="outline" onClick={regenerate} className="gap-1">
              <RefreshCw className="w-4 h-4" /> Regenerate
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tokens are stored hashed. Regenerate to get a new one — the old one stops working immediately.
          </p>
        </section>

        <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="text-sm font-medium">Commands</div>
          <div className="space-y-2">
            {commands.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono">/{c.command}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.description || "—"}</div>
                </div>
                <button onClick={() => removeCommand(c.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {commands.length === 0 && (
              <div className="text-xs text-muted-foreground">No commands yet.</div>
            )}
          </div>
          <div className="flex gap-2">
            <Input placeholder="start" value={newCmd} onChange={(e) => setNewCmd(e.target.value)} className="w-32" />
            <Input placeholder="description" value={newCmdDesc} onChange={(e) => setNewCmdDesc(e.target.value)} className="flex-1" />
            <Button onClick={addCommand} size="icon" aria-label="Add"><Plus className="w-4 h-4" /></Button>
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="w-4 h-4" /> Stats
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xl font-semibold">{stats?.received ?? 0}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Received</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xl font-semibold">{stats?.sent ?? 0}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Sent</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xl font-semibold">{stats?.unique_users ?? 0}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Users</div>
            </div>
          </div>
          {(bot.rating_count ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium">{bot.rating_avg?.toFixed(1)}</span>
              <span className="text-muted-foreground">({bot.rating_count} rating{bot.rating_count === 1 ? "" : "s"})</span>
            </div>
          )}
          <Sparkline data={daily} />
          {reports && (reports.total_count ?? 0) > 0 && (
            <div className="text-xs flex items-center gap-1">
              <Flag className={`w-3 h-3 ${reports.open_count > 0 ? "text-red-600" : "text-muted-foreground"}`} />
              <span className={reports.open_count > 0 ? "text-red-600" : "text-muted-foreground"}>
                {reports.open_count} open / {reports.total_count} total report{reports.total_count === 1 ? "" : "s"}
              </span>
              {reports.last_reason && <span className="text-muted-foreground">· last: {reports.last_reason}</span>}
            </div>
          )}
          {bot.last_webhook_at && (
            <div className="text-xs">
              Last webhook:{" "}
              <span className={
                bot.last_webhook_status && bot.last_webhook_status >= 200 && bot.last_webhook_status < 300
                  ? "text-emerald-600" : "text-red-600"
              }>
                {bot.last_webhook_status ?? "—"}
              </span>
              {bot.last_webhook_error && <span className="text-red-600 ml-1">· {bot.last_webhook_error}</span>}
              <span className="text-muted-foreground ml-1">· {new Date(bot.last_webhook_at).toLocaleString()}</span>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Send className="w-4 h-4" /> Broadcast
          </div>
          <div className="text-xs text-muted-foreground">
            Send a one-off message to every user who has DMd this bot ({stats?.unique_users ?? 0}).
          </div>
          <Textarea rows={2} placeholder="Message to broadcast…" value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)} />
          <Button size="sm" onClick={broadcast} disabled={broadcasting || !stats?.unique_users} className="gap-1">
            <Send className="w-4 h-4" /> {broadcasting ? "Sending…" : "Send broadcast"}
          </Button>
        </section>

        <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="w-4 h-4" /> Scheduled messages
          </div>
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-start gap-2 rounded-lg border border-border p-2">
                <div className="flex-1 min-w-0 text-xs">
                  <div className="truncate">{s.text || "(image)"}</div>
                  <div className="text-muted-foreground">
                    {s.is_active ? "Next: " : "Done: "}
                    {new Date(s.next_run_at).toLocaleString()}
                    {s.interval_minutes ? ` · every ${s.interval_minutes}m` : " · one-shot"}
                    {s.last_sent_count != null && ` · last sent: ${s.last_sent_count}`}
                  </div>
                </div>
                <button onClick={() => removeSchedule(s.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {schedules.length === 0 && <div className="text-xs text-muted-foreground">No schedules yet.</div>}
          </div>
          <div className="space-y-2">
            <Textarea rows={2} placeholder="Message…" value={schText} onChange={(e) => setSchText(e.target.value)} />
            <div className="flex gap-2">
              <Input
                type="datetime-local"
                value={schWhen}
                onChange={(e) => setSchWhen(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Repeat (min)"
                value={schInterval}
                onChange={(e) => setSchInterval(e.target.value)}
                className="w-32"
                min={1}
              />
            </div>
            <Button size="sm" onClick={addSchedule} className="gap-1">
              <Plus className="w-4 h-4" /> Schedule
            </Button>
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium">Workflows</div>
              <div className="text-xs text-muted-foreground">Auto-replies that run server-side. No webhook needed.</div>
            </div>
            {!workflows.some((w) => w.trigger_type === "first") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setWfTrigger("first"); setWfReply(`Hi! 👋 Welcome to ${bot?.display_name ?? "this bot"}. Try /help to see what I can do.`); }}
              >
                Set welcome
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {workflows.map((w) => (
              <div key={w.id} className="flex items-start gap-2 rounded-lg border border-border p-2">
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-mono">
                    {w.trigger_type === "first" ? "first message (welcome)"
                      : w.trigger_type === "any" ? "any message"
                      : w.trigger_type === "start" ? "/start"
                      : w.trigger_type === "command" ? `/${w.trigger_value}`
                      : `${w.trigger_type}: ${w.trigger_value}`}
                  </div>
                  <div className="text-muted-foreground truncate">→ {w.reply_text}</div>
                </div>
                <button onClick={() => removeWorkflow(w.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {workflows.length === 0 && <div className="text-xs text-muted-foreground">No workflows yet.</div>}
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={wfTrigger}
                onChange={(e) => setWfTrigger(e.target.value as Workflow["trigger_type"])}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                <option value="first">first message (welcome)</option>
                <option value="command">command</option>
                <option value="keyword">keyword</option>
                <option value="regex">regex</option>
                <option value="start">/start</option>
                <option value="any">any</option>
              </select>
              {wfTrigger !== "any" && wfTrigger !== "start" && wfTrigger !== "first" && (
                <Input
                  className="flex-1"
                  placeholder={wfTrigger === "command" ? "help" : wfTrigger === "regex" ? "^hi" : "hello"}
                  value={wfValue}
                  onChange={(e) => setWfValue(e.target.value)}
                />
              )}
            </div>
            <Textarea rows={2} placeholder="Reply text…" value={wfReply} onChange={(e) => setWfReply(e.target.value)} />
            <Button size="sm" onClick={addWorkflow} className="gap-1"><Plus className="w-4 h-4" /> Add workflow</Button>
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <div className="text-sm font-medium">API quick reference</div>
          <div className="text-xs text-muted-foreground">Single endpoint, Telegram-style methods.</div>
          <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
{`POST https://slirphzzwcogdbkeicff.supabase.co/functions/v1/bot-api
{ "token": "<token>", "method": "sendMessage", "chat_id": "<user-uuid>", "text": "Hi!" }

Methods: getMe · sendMessage · setWebhook · deleteWebhook
         getUpdates · setMyCommands · getMyCommands
         setState · getState`}
          </pre>
        </section>

        <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Send className="w-4 h-4" /> Webhook deliveries
            </div>
            <Button size="sm" variant="ghost" onClick={exportConversation} className="gap-1 h-7">
              <Copy className="w-3.5 h-3.5" /> Export chat
            </Button>
          </div>
          {whCalls.length === 0 ? (
            <div className="text-xs text-muted-foreground">No webhook calls yet.</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {whCalls.map((c) => {
                const ok = c.response_status && c.response_status >= 200 && c.response_status < 300;
                return (
                  <div key={c.id} className="rounded-lg border border-border p-2 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                        ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}>{c.response_status ?? "ERR"}</span>
                      <span className="text-muted-foreground flex-1">
                        {new Date(c.created_at).toLocaleTimeString()}
                        {c.duration_ms != null && ` · ${c.duration_ms}ms`}
                        {c.attempt > 1 && ` · attempt ${c.attempt}`}
                      </span>
                      {!ok && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 gap-1" onClick={() => retryWebhook(c.id)}>
                          <RefreshCw className="w-3 h-3" /> Retry
                        </Button>
                      )}
                    </div>
                    {c.error && <div className="text-red-600 truncate">{c.error}</div>}
                    {c.response_body && (
                      <div className="text-muted-foreground line-clamp-2 font-mono text-[10px]">
                        {c.response_body}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div>
            <div className="text-sm font-medium">💳 Payment links</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">
              Pre-built Stripe Payment Link URLs your bot can send. Listed publicly; tappable on the profile page.
            </div>
          </div>
          <div className="space-y-1">
            {pays.map((p) => (
              <div key={p.id} className="flex items-start gap-2 rounded-lg border border-border p-2 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {p.title} <span className="text-muted-foreground">· {(p.amount_cents/100).toFixed(2)} {p.currency.toUpperCase()}</span>
                  </div>
                  <div className="text-muted-foreground truncate font-mono">{p.checkout_url}</div>
                  <div className="text-[10px] text-muted-foreground">slug: <span className="font-mono">{p.slug}</span></div>
                </div>
                <button onClick={() => removePay(p.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {pays.length === 0 && <div className="text-[11px] text-muted-foreground">No payment links yet.</div>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="pro-plan" value={newPaySlug} onChange={(e) => setNewPaySlug(e.target.value.toLowerCase())} />
            <Input placeholder="Title" value={newPayTitle} onChange={(e) => setNewPayTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" step="0.01" placeholder="9.99" value={newPayAmount} onChange={(e) => setNewPayAmount(e.target.value)} />
            <select
              value={newPayCurrency} onChange={(e) => setNewPayCurrency(e.target.value)}
              className="rounded-md border border-input bg-background px-2 text-xs"
            >
              {["usd","eur","gbp","khr","sgd","cad","aud","jpy"].map((c) => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
            <Input placeholder="https://buy.stripe.com/…" value={newPayUrl} onChange={(e) => setNewPayUrl(e.target.value)} className="col-span-1" />
          </div>
          <Button size="sm" onClick={addPay} className="gap-1"><Plus className="w-4 h-4" /> Add payment link</Button>
        </section>

        <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div>
            <div className="text-sm font-medium">📱 Mini-apps</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">
              Webview apps users can launch from your bot's profile. Listed publicly at <span className="font-mono">/b/{bot.username}</span>.
            </div>
          </div>
          <div className="space-y-1">
            {apps.map((a) => (
              <div key={a.id} className="flex items-start gap-2 rounded-lg border border-border p-2 text-xs">
                <div className="text-lg">{a.icon_emoji ?? "📱"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{a.title} <span className="text-muted-foreground font-mono">/{a.slug}</span></div>
                  <div className="text-muted-foreground truncate">{a.app_url}</div>
                </div>
                <button onClick={() => removeApp(a.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {apps.length === 0 && <div className="text-[11px] text-muted-foreground">No mini-apps yet.</div>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="emoji" value={newAppEmoji} onChange={(e) => setNewAppEmoji(e.target.value)} />
            <Input placeholder="my-app" value={newAppSlug} onChange={(e) => setNewAppSlug(e.target.value.toLowerCase())} />
            <Input placeholder="Title" value={newAppTitle} onChange={(e) => setNewAppTitle(e.target.value)} />
          </div>
          <Input placeholder="https://your-app.com" value={newAppUrl} onChange={(e) => setNewAppUrl(e.target.value)} />
          <Button size="sm" onClick={addApp} className="gap-1"><Plus className="w-4 h-4" /> Add mini-app</Button>
        </section>

        <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="w-4 h-4" /> Activity log
          </div>
          {activity.length === 0 ? (
            <div className="text-xs text-muted-foreground">No activity yet.</div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-xs border-b border-border/50 pb-1">
                  <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded ${
                    a.kind === "msg_in" ? "bg-blue-100 text-blue-700"
                    : a.kind === "msg_out" ? "bg-emerald-100 text-emerald-700"
                    : a.kind === "webhook_call" ? (a.status?.startsWith("2") ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")
                    : a.kind === "workflow_match" ? "bg-purple-100 text-purple-700"
                    : a.kind === "broadcast" ? "bg-amber-100 text-amber-700"
                    : "bg-muted text-muted-foreground"
                  }`}>{a.kind}</span>
                  <span className="text-muted-foreground flex-shrink-0">{new Date(a.created_at).toLocaleTimeString()}</span>
                  {a.status && <span className="text-muted-foreground">[{a.status}]</span>}
                  {a.detail && <span className="truncate">{a.detail}</span>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-card border border-border p-4">
          <Button variant="destructive" onClick={() => setConfirmDelete(true)} className="gap-1 w-full">
            <Trash2 className="w-4 h-4" /> Delete bot
          </Button>
        </section>
      </div>

      <Dialog open={!!tokenShown} onOpenChange={(v) => !v && setTokenShown(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New token</DialogTitle>
            <DialogDescription>Copy now — you won't see it again.</DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">{tokenShown}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(tokenShown!); toast.success("Copied"); }} className="gap-1">
              <Copy className="w-4 h-4" /> Copy
            </Button>
            <Button onClick={() => setTokenShown(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete @{bot.username}?</DialogTitle>
            <DialogDescription>This cannot be undone. Existing chats with this bot will keep their history.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={remove}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New-bot token reveal dialog (shown once after a successful clone) */}
      <Dialog open={!!newBotToken} onOpenChange={(open) => { if (!open) { setNewBotToken(null); setNewBotTokenCopied(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bot token</DialogTitle>
            <DialogDescription>
              {newBotTokenCopied
                ? "We copied this token to your clipboard. Save it somewhere safe — it's shown only once."
                : "Copy this token now and save it somewhere safe. It's shown only once and cannot be recovered later."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/40 p-3 break-all font-mono text-xs select-all">
            {newBotToken}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!newBotToken) return;
                navigator.clipboard.writeText(newBotToken)
                  .then(() => { setNewBotTokenCopied(true); toast.success("Token copied"); })
                  .catch(() => toast.error("Copy failed — long-press to copy manually"));
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              {newBotTokenCopied ? "Copied" : "Copy token"}
            </Button>
            <Button type="button" onClick={() => { setNewBotToken(null); setNewBotTokenCopied(false); }}>
              I've saved it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Sparkline({ data }: { data: Daily[] }) {
  if (!data?.length) return null;
  const total = data.reduce((s, d) => s + d.received + d.sent, 0);
  if (total === 0) {
    return <div className="text-[10px] text-muted-foreground">No activity in the last 14 days.</div>;
  }
  const max = Math.max(1, ...data.map((d) => d.received + d.sent));
  const W = 280, H = 48, pad = 2;
  const bw = (W - pad * 2) / data.length;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Last 14 days</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12">
        {data.map((d, i) => {
          const totalH = ((d.received + d.sent) / max) * (H - 4);
          const recvH = (d.received / max) * (H - 4);
          const x = pad + i * bw;
          return (
            <g key={d.day}>
              <rect x={x + 1} y={H - totalH} width={bw - 2} height={totalH - recvH} fill="hsl(var(--primary))" opacity={0.4} />
              <rect x={x + 1} y={H - recvH} width={bw - 2} height={recvH} fill="hsl(var(--primary))" />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{new Date(data[0].day).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        <span className="flex gap-2">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" />in</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary/40 inline-block" />out</span>
        </span>
        <span>today</span>
      </div>
    </div>
  );
}
