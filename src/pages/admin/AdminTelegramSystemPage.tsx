import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  KeyRound,
  Link2,
  MessageCircle,
  Pencil,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Users,
  Video,
  Zap,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { openExternalUrl } from "@/lib/openExternalUrl";
import { track } from "@/lib/analytics";

type BridgeStatus = "online" | "limited" | "blocked";

type TestTelegramMessage = {
  id: string;
  direction: "incoming" | "outgoing";
  text: string;
  createdAt: string;
};

type LocalTelegramActionStats = {
  openWeb: number;
  openSignup: number;
  openApp: number;
  openHandle: number;
  saveHandle: number;
  fallbackToWeb: number;
  lastActionAt: string | null;
};

const LOCAL_TELEGRAM_ACTIONS_KEY = "zivo:admin:telegram-actions-local";

function emptyLocalTelegramActionStats(): LocalTelegramActionStats {
  return {
    openWeb: 0,
    openSignup: 0,
    openApp: 0,
    openHandle: 0,
    saveHandle: 0,
    fallbackToWeb: 0,
    lastActionAt: null,
  };
}

function readLocalTelegramActionStats(): LocalTelegramActionStats {
  try {
    const raw = localStorage.getItem(LOCAL_TELEGRAM_ACTIONS_KEY);
    if (!raw) return emptyLocalTelegramActionStats();
    const parsed = JSON.parse(raw);
    return {
      ...emptyLocalTelegramActionStats(),
      ...(parsed || {}),
    };
  } catch {
    return emptyLocalTelegramActionStats();
  }
}

function writeLocalTelegramActionStats(next: LocalTelegramActionStats): void {
  try {
    localStorage.setItem(LOCAL_TELEGRAM_ACTIONS_KEY, JSON.stringify(next));
  } catch {
    // Ignore local storage write failures.
  }
}

const bridgeModules: Array<{
  name: string;
  description: string;
  owner: string;
  status: BridgeStatus;
  icon: typeof Send;
}> = [
  {
    name: "Telegram Import Relay",
    description: "Operator-reviewed media and message handoff into ZIVO chat.",
    owner: "Chat Ops",
    status: "limited",
    icon: Send,
  },
  {
    name: "Notification Bot",
    description: "Admin alerts for rides, receipts, incidents, and escalations.",
    owner: "Platform",
    status: "online",
    icon: Bot,
  },
  {
    name: "Receipt Parser",
    description: "ABA/KHQR receipt intake with review before order matching.",
    owner: "Payments",
    status: "limited",
    icon: Zap,
  },
  {
    name: "Safety Gate",
    description: "Blocks reposts that need consent, age checks, or moderation.",
    owner: "Trust",
    status: "online",
    icon: ShieldCheck,
  },
];

const playbooks = [
  "Download only when permission and consent are documented.",
  "Route imported media through ZIVO chat storage or inline fallback.",
  "Mark adult or sensitive media before sending.",
  "Escalate paid-channel leaks, impersonation, and underage-risk content.",
];

function statusClass(status: BridgeStatus) {
  if (status === "online") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700";
  if (status === "limited") return "border-amber-500/25 bg-amber-500/10 text-amber-700";
  return "border-red-500/25 bg-red-500/10 text-red-700";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Send;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card className="rounded-xl">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-600">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminTelegramSystemPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [handleInput, setHandleInput] = useState("");
  const [savingHandle, setSavingHandle] = useState(false);
  const [localActionStats, setLocalActionStats] = useState<LocalTelegramActionStats>(() => readLocalTelegramActionStats());
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
  const [testModeEnabled, setTestModeEnabled] = useState(true);
  const [testDraft, setTestDraft] = useState("");
  const [testMessages, setTestMessages] = useState<TestTelegramMessage[]>([
    {
      id: `seed-${Date.now()}`,
      direction: "incoming",
      text: "Telegram Test Mode is active. You can simulate messages fully inside this website.",
      createdAt: new Date().toISOString(),
    },
  ]);

  const bumpLocalAction = (field: keyof Omit<LocalTelegramActionStats, "lastActionAt">) => {
    setLocalActionStats((prev) => {
      const next: LocalTelegramActionStats = {
        ...prev,
        [field]: prev[field] + 1,
        lastActionAt: new Date().toISOString(),
      };
      writeLocalTelegramActionStats(next);
      return next;
    });
  };

  const appendTestMessage = (direction: "incoming" | "outgoing", text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setTestMessages((prev) => [
      ...prev,
      {
        id: `${direction}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        direction,
        text: clean,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const sendTestMessage = () => {
    const payload = testDraft.trim();
    if (!payload) {
      toast.error("Type a message first.");
      return;
    }
    appendTestMessage("outgoing", payload);
    setTestDraft("");

    window.setTimeout(() => {
      appendTestMessage("incoming", `Auto-reply (test): received \"${payload}\"`);
    }, 400);
  };

  const simulateIncoming = (kind: "text" | "order" | "media") => {
    if (kind === "text") {
      appendTestMessage("incoming", "Test incoming text: Hi admin, can you help me?");
      return;
    }
    if (kind === "order") {
      appendTestMessage("incoming", "Test incoming event: New booking request #TG-2048 pending review.");
      return;
    }
    appendTestMessage("incoming", "Test incoming media: [photo] customer_receipt_telegram.jpg");
  };

  const normalizeHandle = (raw: string) => raw.trim().replace(/^@+/, "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32);

  const recordOpenTelegramWeb = () => {
    bumpLocalAction("openWeb");
    track("admin_telegram_open_web", {
      source: "admin_telegram_system_page",
      platform: Capacitor.isNativePlatform() ? "native" : "web",
    });
  };

  const recordOpenTelegramSignup = () => {
    bumpLocalAction("openSignup");
    track("admin_telegram_open_signup", {
      source: "admin_telegram_system_page",
      platform: Capacitor.isNativePlatform() ? "native" : "web",
    });
  };

  const openUrlInNewTab = (url: string): boolean => {
    if (Capacitor.isNativePlatform()) return false;

    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch {
      return false;
    }
  };

  const openTelegramWeb = async () => {
    recordOpenTelegramWeb();

    if (openUrlInNewTab("https://web.telegram.org/a/")) {
      return;
    }

    await openExternalUrl("https://web.telegram.org/a/");
  };

  const openTelegramSignup = async () => {
    recordOpenTelegramSignup();

    if (openUrlInNewTab("https://telegram.org/")) {
      return;
    }

    await openExternalUrl("https://telegram.org/");
  };

  const tryOpenTelegramNativeApp = async (): Promise<boolean> => {
    return await new Promise((resolve) => {
      let finished = false;

      const cleanupAndResolve = (value: boolean) => {
        if (finished) return;
        finished = true;
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.clearTimeout(fallbackTimer);
        resolve(value);
      };

      const onVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          cleanupAndResolve(true);
        }
      };

      document.addEventListener("visibilitychange", onVisibilityChange);

      const fallbackTimer = window.setTimeout(() => {
        cleanupAndResolve(document.visibilityState === "hidden");
      }, 1400);

      try {
        window.location.assign("tg://resolve?domain=telegram");
      } catch {
        cleanupAndResolve(false);
      }
    });
  };

  const openTelegramApp = async () => {
    // On native, try app deep-link first and only fallback if the app did not open.
    if (Capacitor.isNativePlatform()) {
      const opened = await tryOpenTelegramNativeApp();
      if (opened) {
        bumpLocalAction("openApp");
        track("admin_telegram_open_app", {
          source: "admin_telegram_system_page",
          platform: "native",
          result: "opened_native_app",
        });
        return;
      }

      bumpLocalAction("openApp");
      bumpLocalAction("fallbackToWeb");
      track("admin_telegram_open_app", {
        source: "admin_telegram_system_page",
        platform: "native",
        result: "fallback_to_web",
      });
      await openExternalUrl("https://web.telegram.org/a/");
      toast("Telegram app not detected. Opened Telegram Web instead.");
      return;
    }

    bumpLocalAction("openApp");
    track("admin_telegram_open_app", {
      source: "admin_telegram_system_page",
      platform: "web",
      result: "opened_web",
    });
    // On website, keep this page open and launch Telegram in a separate tab.
    await openTelegramWeb();
  };

  const openTelegramHandle = () => {
    const normalized = normalizeHandle(handleInput);
    if (!normalized) {
      toast.error("Enter a Telegram username first.");
      return;
    }
    bumpLocalAction("openHandle");
    track("admin_telegram_open_handle", {
      source: "admin_telegram_system_page",
      platform: Capacitor.isNativePlatform() ? "native" : "web",
      handle: normalized,
    });

    if (openUrlInNewTab(`https://t.me/${normalized}`)) {
      return;
    }

    void openExternalUrl(`https://t.me/${normalized}`);
  };

  const { data: linkedProfile, refetch: refetchLinkedProfile } = useQuery({
    queryKey: ["admin-telegram-linked-profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return null;
      const db = supabase as any;
      const { data, error } = await db
        .from("profiles")
        .select("social_telegram")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as { social_telegram?: string | null } | null;
    },
  });

  const saveTelegramHandle = async () => {
    if (!user?.id) {
      toast.error("You must be signed in.");
      return;
    }
    const normalized = normalizeHandle(handleInput);
    if (!normalized) {
      toast.error("Enter a valid Telegram username.");
      return;
    }

    try {
      setSavingHandle(true);
      const db = supabase as any;
      const { error } = await db
        .from("profiles")
        .update({ social_telegram: `@${normalized}` })
        .eq("user_id", user.id);
      if (error) throw error;
      bumpLocalAction("saveHandle");
      track("admin_telegram_save_handle", {
        source: "admin_telegram_system_page",
        platform: Capacitor.isNativePlatform() ? "native" : "web",
        handle: normalized,
      });
      toast.success("Telegram handle linked.");
      await refetchLinkedProfile();
      setHandleInput(normalized);
    } catch {
      toast.error("Could not save Telegram handle.");
    } finally {
      setSavingHandle(false);
    }
  };

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin-telegram-system"],
    queryFn: async () => {
      const db = supabase as any;
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [profiles, stores, dm24h, media7d, botSchedules, telegramActions] = await Promise.all([
        db.from("profiles").select("user_id", { count: "exact", head: true }).not("social_telegram", "is", null),
        db.from("store_profiles").select("id", { count: "exact", head: true }).not("telegram_url", "is", null),
        db.from("direct_messages").select("id", { count: "exact", head: true }).gte("created_at", since24h),
        db.from("direct_messages")
          .select("id,sender_id,receiver_id,message,message_type,created_at,file_payload")
          .in("message_type", ["image", "video", "voice", "media_album", "file"])
          .gte("created_at", since7d)
          .order("created_at", { ascending: false })
          .limit(8),
        db.from("bot_scheduled_messages").select("id", { count: "exact", head: true }),
        db
          .from("analytics_events")
          .select("event_name,meta,created_at")
          .in("event_name", [
            "admin_telegram_open_web",
            "admin_telegram_open_signup",
            "admin_telegram_open_app",
            "admin_telegram_open_handle",
            "admin_telegram_save_handle",
          ])
          .gte("created_at", since24h)
          .order("created_at", { ascending: false })
          .limit(150),
      ]);

      const actionRows = (telegramActions.data || []) as Array<{
        event_name: string;
        meta?: Record<string, any> | null;
        created_at: string;
      }>;

      const hourBuckets = Array.from({ length: 24 }, () => 0);
      const nowMs = Date.now();
      actionRows.forEach((row) => {
        const createdMs = new Date(row.created_at).getTime();
        if (!Number.isFinite(createdMs)) return;
        const diffHours = Math.floor((nowMs - createdMs) / (60 * 60 * 1000));
        if (diffHours >= 0 && diffHours < 24) {
          // Bucket 0 = oldest hour, 23 = current hour for left-to-right plotting.
          hourBuckets[23 - diffHours] += 1;
        }
      });
      const hourlyMax = hourBuckets.reduce((max, value) => Math.max(max, value), 0);

      const telegramActionStats = {
        openWeb: actionRows.filter((row) => row.event_name === "admin_telegram_open_web").length,
        openSignup: actionRows.filter((row) => row.event_name === "admin_telegram_open_signup").length,
        openApp: actionRows.filter((row) => row.event_name === "admin_telegram_open_app").length,
        openHandle: actionRows.filter((row) => row.event_name === "admin_telegram_open_handle").length,
        saveHandle: actionRows.filter((row) => row.event_name === "admin_telegram_save_handle").length,
        fallbackToWeb: actionRows.filter(
          (row) => row.event_name === "admin_telegram_open_app" && row.meta?.result === "fallback_to_web",
        ).length,
        lastActionAt: actionRows[0]?.created_at || null,
        hourlyBuckets: hourBuckets,
        hourlyMax,
      };

      return {
        linkedUsers: profiles.count || 0,
        linkedStores: stores.count || 0,
        dm24h: dm24h.count || 0,
        scheduledBots: botSchedules.count || 0,
        recentMedia: media7d.data || [],
        telegramActions24h: telegramActionStats,
      };
    },
    refetchInterval: 60_000,
  });

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bridgeModules;
    return bridgeModules.filter((module) =>
      [module.name, module.description, module.owner, module.status].some((value) =>
        value.toLowerCase().includes(q),
      ),
    );
  }, [query]);

  const readiness = Math.round((bridgeModules.filter((module) => module.status === "online").length / bridgeModules.length) * 100);

  const trendBuckets: number[] = data?.telegramActions24h?.hourlyBuckets || Array.from({ length: 24 }, () => 0);
  const trendMax = Math.max(1, data?.telegramActions24h?.hourlyMax || 0);
  const activeTrendIndex = hoveredTrendIndex ?? trendBuckets.length - 1;
  const activeTrendCount = trendBuckets[activeTrendIndex] || 0;
  const activeTrendX = (activeTrendIndex / (trendBuckets.length - 1)) * 240;
  const activeTrendY = 40 - (activeTrendCount / trendMax) * 36;
  const activeTrendTimeLabel = new Date(Date.now() - (23 - activeTrendIndex) * 60 * 60 * 1000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <AdminLayout title="Telegram System">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="flex flex-col gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="bg-[#229ED9] text-white hover:bg-[#229ED9]">
                <Send className="mr-1 h-3 w-3" />
                Telegram Bridge
              </Badge>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                Consent gate on
              </Badge>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Telegram operations control center</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Monitor Telegram-linked users, store handles, bot workflows, and media handoffs before they enter ZIVO chat.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate("/admin/moderation/messages")}>
              <ShieldCheck className="h-4 w-4" />
              Review Queue
            </Button>
            <Button className="gap-2 bg-[#229ED9] hover:bg-[#1c93cc]" onClick={() => navigate("/chat")}>
              <MessageCircle className="h-4 w-4" />
              Open Chat
            </Button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="h-5 w-5 text-sky-600" />
                Telegram Account Access
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Open Telegram account screens directly from admin and keep your linked handle up to date.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button className="gap-2 bg-[#229ED9] hover:bg-[#1c93cc]" asChild>
                  <a href="https://web.telegram.org/a/" target="_blank" rel="noopener noreferrer" onClick={recordOpenTelegramWeb}>
                    <MessageCircle className="h-4 w-4" />
                    Open Telegram Web
                  </a>
                </Button>
                <Button variant="outline" className="gap-2" asChild>
                  <a href="https://telegram.org/" target="_blank" rel="noopener noreferrer" onClick={recordOpenTelegramSignup}>
                    <ExternalLink className="h-4 w-4" />
                    Create Telegram Account
                  </a>
                </Button>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => void openTelegramApp()}>
                <Send className="h-4 w-4" />
                Open Telegram App (with fallback)
              </Button>
              <p className="text-[11px] text-muted-foreground">
                If you are not signed in on Telegram Web, it will ask for your phone number and verification code.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Pencil className="h-5 w-5 text-violet-600" />
                Link Your Telegram Username
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Save your Telegram handle to your admin profile for quicker operations.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Current linked handle: <span className="font-semibold text-foreground">{linkedProfile?.social_telegram || "Not linked"}</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                  <Input
                    value={handleInput}
                    onChange={(event) => setHandleInput(normalizeHandle(event.target.value))}
                    placeholder="telegram_username"
                    className="pl-7"
                  />
                </div>
                <Button variant="outline" onClick={openTelegramHandle}>Open</Button>
              </div>
              <Button className="w-full" onClick={saveTelegramHandle} disabled={savingHandle}>
                {savingHandle ? "Saving..." : "Save Linked Handle"}
              </Button>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5 text-sky-600" />
              Telegram On Website
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Open Telegram Web directly from your website admin panel and continue working from the browser.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium">One-click Telegram Web access from this page.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Opens in a new browser tab. If popup is blocked, this page stays here and prompts you to allow popups.
              </p>
              <Button className="mt-3 gap-2 bg-[#229ED9] hover:bg-[#1c93cc]" asChild>
                <a href="https://web.telegram.org/a/" target="_blank" rel="noopener noreferrer" onClick={recordOpenTelegramWeb}>
                  <ExternalLink className="h-4 w-4" />
                  Open Telegram Web Now
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-5 w-5 text-sky-600" />
              Telegram Test Mode (In-Site)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Run Telegram workflow tests directly inside this website without opening external Telegram.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn(testModeEnabled ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700" : "")}> 
                {testModeEnabled ? "Enabled" : "Disabled"}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setTestModeEnabled((prev) => !prev)}>
                {testModeEnabled ? "Disable Test Mode" : "Enable Test Mode"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setTestMessages([
                    {
                      id: `reset-${Date.now()}`,
                      direction: "incoming",
                      text: "Telegram Test Mode reset complete.",
                      createdAt: new Date().toISOString(),
                    },
                  ])
                }
              >
                Reset Chat
              </Button>
            </div>

            {!testModeEnabled ? (
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                Test mode is disabled. Enable it to simulate Telegram traffic in this page.
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button variant="outline" size="sm" onClick={() => simulateIncoming("text")}>Simulate Text</Button>
                  <Button variant="outline" size="sm" onClick={() => simulateIncoming("order")}>Simulate Booking</Button>
                  <Button variant="outline" size="sm" onClick={() => simulateIncoming("media")}>Simulate Media</Button>
                </div>

                <div className="max-h-72 space-y-2 overflow-auto rounded-lg border border-border/70 bg-muted/20 p-3">
                  {testMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                        msg.direction === "outgoing"
                          ? "ml-auto bg-[#229ED9] text-white"
                          : "mr-auto border border-border/70 bg-background",
                      )}
                    >
                      <p>{msg.text}</p>
                      <p className={cn("mt-1 text-[10px]", msg.direction === "outgoing" ? "text-white/80" : "text-muted-foreground")}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={testDraft}
                    onChange={(event) => setTestDraft(event.target.value)}
                    placeholder="Type test message..."
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        sendTestMessage();
                      }
                    }}
                  />
                  <Button onClick={sendTestMessage}>Send</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Users} label="Linked users" value={data?.linkedUsers ?? 0} detail="Profiles with Telegram handle" />
          <MetricCard icon={Link2} label="Linked stores" value={data?.linkedStores ?? 0} detail="Store Telegram URLs" />
          <MetricCard icon={MessageCircle} label="DM traffic" value={data?.dm24h ?? 0} detail="Direct messages in 24h" />
          <MetricCard icon={Bot} label="Bot schedules" value={data?.scheduledBots ?? 0} detail="Scheduled bot rows" />
        </section>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-sky-600" />
              Telegram Actions (24h)
            </CardTitle>
            <p className="text-xs text-muted-foreground">Live action counts from admin Telegram controls.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Open Web</p>
                <p className="text-xl font-bold">{Math.max(data?.telegramActions24h?.openWeb ?? 0, localActionStats.openWeb)}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Open Signup</p>
                <p className="text-xl font-bold">{Math.max(data?.telegramActions24h?.openSignup ?? 0, localActionStats.openSignup)}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Open App</p>
                <p className="text-xl font-bold">{Math.max(data?.telegramActions24h?.openApp ?? 0, localActionStats.openApp)}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Open Handle</p>
                <p className="text-xl font-bold">{Math.max(data?.telegramActions24h?.openHandle ?? 0, localActionStats.openHandle)}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Save Handle</p>
                <p className="text-xl font-bold">{Math.max(data?.telegramActions24h?.saveHandle ?? 0, localActionStats.saveHandle)}</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <p className="text-[11px] text-amber-700">App Fallbacks</p>
                <p className="text-xl font-bold text-amber-700">{Math.max(data?.telegramActions24h?.fallbackToWeb ?? 0, localActionStats.fallbackToWeb)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Last action: {data?.telegramActions24h?.lastActionAt || localActionStats.lastActionAt ? new Date(data?.telegramActions24h?.lastActionAt || localActionStats.lastActionAt || "").toLocaleString() : "No activity yet"}
            </p>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>24h trend</span>
                <span>Now</span>
              </div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{activeTrendTimeLabel}</span>
                <span>{activeTrendCount} actions</span>
              </div>
              <svg
                viewBox="0 0 240 44"
                className="h-12 w-full"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
                  const idx = Math.round(ratio * (trendBuckets.length - 1));
                  setHoveredTrendIndex(idx);
                }}
                onMouseLeave={() => setHoveredTrendIndex(null)}
                onTouchMove={(event) => {
                  const touch = event.touches[0];
                  if (!touch) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const ratio = Math.min(1, Math.max(0, (touch.clientX - rect.left) / rect.width));
                  const idx = Math.round(ratio * (trendBuckets.length - 1));
                  setHoveredTrendIndex(idx);
                }}
                onTouchEnd={() => setHoveredTrendIndex(null)}
              >
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-sky-600"
                  points={trendBuckets
                    .map((value: number, index: number) => {
                      const x = (index / (trendBuckets.length - 1)) * 240;
                      const y = 40 - (value / trendMax) * 36;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(" ")}
                />
                <line x1={activeTrendX} x2={activeTrendX} y1="2" y2="42" stroke="currentColor" className="text-sky-400/70" />
                <circle cx={activeTrendX} cy={activeTrendY} r="2.8" fill="currentColor" className="text-sky-600" />
              </svg>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-xl">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Radio className="h-5 w-5 text-sky-600" />
                  Bridge Modules
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Telegram surfaces that can feed ZIVO operations.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search modules" className="pl-9" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredModules.map((module) => {
                const Icon = module.icon;
                return (
                  <div key={module.name} className="flex flex-col gap-3 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-sky-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{module.name}</p>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Owner: {module.owner}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("w-fit capitalize", statusClass(module.status))}>
                      {module.status}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  Readiness
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">Operational readiness</span>
                    <span className="font-bold">{readiness}%</span>
                  </div>
                  <Progress value={readiness} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-emerald-500/10 p-3">
                    <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
                    <p className="text-lg font-bold">2</p>
                    <p className="text-[10px] text-muted-foreground">Online</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-3">
                    <Clock className="mx-auto mb-1 h-4 w-4 text-amber-600" />
                    <p className="text-lg font-bold">2</p>
                    <p className="text-[10px] text-muted-foreground">Limited</p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-3">
                    <AlertTriangle className="mx-auto mb-1 h-4 w-4 text-red-600" />
                    <p className="text-lg font-bold">0</p>
                    <p className="text-[10px] text-muted-foreground">Blocked</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full gap-2" disabled={isFetching} onClick={() => refetch()}>
                  <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                  Refresh telemetry
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <KeyRound className="h-5 w-5 text-violet-600" />
                  Safety Playbook
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {playbooks.map((item) => (
                  <div key={item} className="flex gap-2 rounded-lg bg-muted/50 p-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Video className="h-5 w-5 text-sky-600" />
                Recent Media Handoffs
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Latest media messages moving through direct chat.</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/admin/chat-security")}>
              Chat security
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border/70">
              <div className="grid grid-cols-[1fr_120px_140px] bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <span>Message</span>
                <span>Type</span>
                <span>Time</span>
              </div>
              {(data?.recentMedia || []).length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">No recent media handoffs found.</div>
              ) : (
                (data?.recentMedia || []).map((row: any) => (
                  <div key={row.id} className="grid grid-cols-[1fr_120px_140px] items-center border-t border-border/60 px-3 py-3 text-sm">
                    <span className="truncate font-medium">{row.message || "Media message"}</span>
                    <Badge variant="secondary" className="w-fit capitalize">{row.message_type}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
