import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSmartBack } from "@/lib/smartBack";
import { ArrowLeft, Bot, Plus, Copy, RefreshCw, Trash2, ChevronRight, Compass, Sparkles, MessageSquare, HelpCircle, Quote, Info, Shield, Inbox } from "lucide-react";
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
} from "@/components/ui/dialog";

const AI_HANDLER_BASE = "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/bot-ai-handler";

type Template = {
  id: string;
  title: string;
  description: string;
  icon: typeof Bot;
  suffix: string;
  defaultName: string;
  setup: (bot: { id: string; bot_user_id: string }, token: string) => Promise<void>;
};

const TEMPLATES: Template[] = [
  {
    id: "ai",
    title: "AI Assistant",
    description: "Claude-powered. Answers anything, with memory.",
    icon: Sparkles,
    suffix: "_ai_bot",
    defaultName: "AI Assistant",
    setup: async (bot, token) => {
      const url = `${AI_HANDLER_BASE}?bot_token=${encodeURIComponent(token)}`;
      await supabase.from("bots").update({ webhook_url: url, category: "ai" }).eq("id", bot.id);
      await supabase.from("bot_workflows").insert({
        bot_id: bot.id, trigger_type: "first", trigger_value: "",
        reply_text: "Hi! 👋 I'm an AI assistant. Ask me anything.",
        next_webhook: true,
      });
    },
  },
  {
    id: "faq",
    title: "FAQ Bot",
    description: "Welcome + /help and /about commands. No webhook needed.",
    icon: HelpCircle,
    suffix: "_faq_bot",
    defaultName: "FAQ Bot",
    setup: async (bot) => {
      await supabase.from("bots").update({ category: "tools" }).eq("id", bot.id);
      await supabase.from("bot_workflows").insert([
        { bot_id: bot.id, trigger_type: "first", trigger_value: "", reply_text: "Hi! 👋 Try /help or /about to learn more." },
        { bot_id: bot.id, trigger_type: "command", trigger_value: "help", reply_text: "Commands:\n/help — show this list\n/about — about this bot" },
        { bot_id: bot.id, trigger_type: "command", trigger_value: "about", reply_text: "I'm a Zivo FAQ bot. Edit my replies in the bot settings." },
      ]);
      await supabase.from("bot_commands").insert([
        { bot_id: bot.id, command: "help", description: "Show commands", sort_order: 0 },
        { bot_id: bot.id, command: "about", description: "About this bot", sort_order: 1 },
      ]);
    },
  },
  {
    id: "echo",
    title: "Echo Bot",
    description: "Replies with the same message you send. Great for testing.",
    icon: MessageSquare,
    suffix: "_echo_bot",
    defaultName: "Echo Bot",
    setup: async (bot) => {
      await supabase.from("bots").update({ category: "fun" }).eq("id", bot.id);
      await supabase.from("bot_workflows").insert({
        bot_id: bot.id, trigger_type: "any", trigger_value: "",
        reply_text: "(Echo) — set up real replies in workflows.",
      });
    },
  },
  {
    id: "quote",
    title: "Daily Quote",
    description: "Sends a motivational message every morning at 9am.",
    icon: Quote,
    suffix: "_quote_bot",
    defaultName: "Daily Quote",
    setup: async (bot) => {
      await supabase.from("bots").update({ category: "social" }).eq("id", bot.id);
      const tomorrow9 = new Date();
      tomorrow9.setDate(tomorrow9.getDate() + 1);
      tomorrow9.setHours(9, 0, 0, 0);
      await supabase.from("bot_scheduled_messages").insert({
        bot_id: bot.id, audience: "all",
        text: "🌅 Good morning! Today's quote: \"The best time to start was yesterday. The next best time is now.\"",
        next_run_at: tomorrow9.toISOString(),
        interval_minutes: 24 * 60,
      });
      await supabase.from("bot_workflows").insert({
        bot_id: bot.id, trigger_type: "first", trigger_value: "",
        reply_text: "Subscribed! 🌅 You'll get a daily quote at 9am.",
      });
    },
  },
];

type BotRow = {
  id: string;
  bot_user_id: string;
  username: string;
  display_name: string;
  description: string | null;
  avatar_url: string | null;
  webhook_url: string | null;
  is_active: boolean;
  created_at: string;
};

export default function BotFatherPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat");
  const [bots, setBots] = useState<BotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [tokenOpen, setTokenOpen] = useState<{ token: string; username: string } | null>(null);
  const [creatingTpl, setCreatingTpl] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { supabase.rpc("is_bot_admin").then(({ data }) => setIsAdmin(!!data)); }, []);

  const createFromTemplate = async (tpl: Template) => {
    setCreatingTpl(tpl.id);
    try {
      const suffix = tpl.suffix;
      const rand = Math.random().toString(36).slice(2, 6);
      const username = `${rand}${suffix}`;
      const { data, error } = await supabase.functions.invoke("bot-create", {
        body: { username, display_name: tpl.defaultName, description: tpl.description },
      });
      if (error || (data as any)?.error) {
        toast.error(error?.message ?? (data as any)?.error ?? "Failed");
        return;
      }
      const { bot_id, bot_user_id, token } = data as any;
      await tpl.setup({ id: bot_id, bot_user_id }, token);
      toast.success(`${tpl.title} ready`);
      setTokenOpen({ token, username });
      load();
    } finally {
      setCreatingTpl(null);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("bots")
      .select("id, bot_user_id, username, display_name, description, avatar_url, webhook_url, is_active, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setBots((data ?? []) as BotRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-background pb-[var(--zivo-safe-bottom,0px)]">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border safe-area-top">
        <div className="flex items-center gap-2 h-14 px-2">
          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold flex-1">My Bots</h1>
          <button
            type="button" onClick={() => setHelpOpen(true)} aria-label="How bots work"
            className="p-2 -mr-1 rounded-full hover:bg-muted"
          >
            <Info className="w-5 h-5" />
          </button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Create chat bots that respond to messages via your own webhook. Bots are addressable by their <span className="font-mono">@username</span> in chat.
        </p>

        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Quick start</div>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((tpl) => {
              const Icon = tpl.icon;
              const busy = creatingTpl === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={busy}
                  onClick={() => createFromTemplate(tpl)}
                  className="rounded-2xl bg-card border border-border p-3 text-left hover:bg-muted/40 disabled:opacity-60"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-sm font-medium">{tpl.title}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2">
                    {busy ? "Creating…" : tpl.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate("/chat/bots/inbox")}
            className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border text-left hover:bg-muted/40"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Inbox className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Bot inbox</div>
              <div className="text-[11px] text-muted-foreground truncate">Your bot chats</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => navigate("/chat/bots/discover")}
            className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border text-left hover:bg-muted/40"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Discover</div>
              <div className="text-[11px] text-muted-foreground truncate">Browse public bots</div>
            </div>
          </button>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate("/chat/bots/admin")}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left hover:bg-muted/40"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Bot admin</div>
              <div className="text-xs text-muted-foreground">Review reports, feature bots, moderate</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
        ) : bots.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-6 text-center">
            <Bot className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium">No bots yet</div>
            <div className="text-xs text-muted-foreground mb-3">Tap New to create your first bot.</div>
            <Button onClick={() => setCreateOpen(true)} className="gap-1">
              <Plus className="w-4 h-4" /> Create bot
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border divide-y divide-border">
            {bots.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => navigate(`/chat/bots/${b.id}`)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {b.avatar_url
                    ? <img src={b.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <Bot className="w-5 h-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-1">
                    {b.display_name}
                    <span className="text-[9px] uppercase bg-primary/10 text-primary rounded px-1 py-0.5">bot</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    @{b.username} · <span className={b.is_active ? "text-emerald-600" : ""}>{b.is_active ? "active" : "inactive"}</span>
                    {!b.webhook_url && <span className="text-amber-600"> · webhook not set</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateBotDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(token, username) => {
          setCreateOpen(false);
          setTokenOpen({ token, username });
          load();
        }}
      />

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How bots work</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p><strong>Quick-start:</strong> Tap a template card (AI Assistant, FAQ, Echo, Daily Quote) — your bot is ready in seconds.</p>
            <p><strong>Custom bot:</strong> Tap <span className="font-mono">+ New</span>, pick a username ending in <span className="font-mono">_bot</span>. You'll get a token — save it.</p>
            <p><strong>Reply options</strong> (mix any):</p>
            <ul className="list-disc ml-5 text-xs space-y-1">
              <li><strong>Workflows</strong> — point-and-click rules. Run server-side, no server needed.</li>
              <li><strong>Webhook</strong> — paste your server URL; we POST every message.</li>
              <li><strong>AI</strong> — one tap to make the bot Claude-powered.</li>
              <li><strong>API</strong> — call <span className="font-mono">bot-api</span> with the token (sendMessage, getUpdates, etc.).</li>
            </ul>
            <p><strong>Owner tools:</strong> stats, broadcasts, scheduled messages, reports, regenerate token.</p>
            <p className="text-xs text-muted-foreground">Limits: 10 bots/owner. Tokens are sha-256 hashed in DB. 5+ reports auto-deactivate a bot.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setHelpOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tokenOpen} onOpenChange={(v) => !v && setTokenOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your bot token</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>This is the only time we'll show this token. Copy it now.</p>
            <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">{tokenOpen?.token}</div>
            <p className="text-xs text-muted-foreground">
              Use this in your webhook to call <span className="font-mono">bot-send-message</span> when replying.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(tokenOpen!.token);
                toast.success("Token copied");
              }}
              className="gap-1"
            >
              <Copy className="w-4 h-4" /> Copy
            </Button>
            <Button onClick={() => { setTokenOpen(null); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateBotDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (token: string, username: string) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setDisplayName(""); setUsername(""); setDescription(""); setSubmitting(false);
    }
  }, [open]);

  const submit = async () => {
    const u = username.trim().toLowerCase();
    if (!displayName.trim()) return toast.error("Display name required");
    if (!/^[a-z0-9_]{4,29}_bot$/.test(u)) {
      return toast.error("Username must end in _bot (5-32 chars, lowercase a-z/0-9/_)");
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("bot-create", {
      body: {
        username: u,
        display_name: displayName.trim(),
        description: description.trim() || null,
      },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    if ((data as any)?.error) return toast.error((data as any).error);
    if (!(data as any)?.token) return toast.error("No token returned");
    onCreated((data as any).token, u);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New bot</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Display name</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="My Helper Bot" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Username (must end in _bot)</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="myhelper_bot"
            />
            <div className={`text-[11px] mt-1 ${
              username && /^[a-z0-9_]{4,29}_bot$/.test(username)
                ? "text-emerald-600"
                : "text-muted-foreground"
            }`}>
              {username && /^[a-z0-9_]{4,29}_bot$/.test(username)
                ? `✓ @${username}`
                : "5–32 chars, lowercase a-z/0-9/_, must end in _bot"}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description (optional)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Creating…" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
