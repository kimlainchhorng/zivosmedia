import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useChannel } from "@/hooks/useChannel";
import { useSmartBack } from "@/lib/smartBack";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { LOG_CATEGORY, type ChannelLogAction, type ChannelLogCategory } from "@/lib/channels/adminLog";
import { ChevronLeft, History, UserPlus, UserMinus, LogOut, Shield, Settings2, Pencil, Trash2 } from "lucide-react";

type LogRow = {
  id: string;
  actor_id: string;
  action: string;
  target_user_id: string | null;
  meta: Record<string, any> | null;
  created_at: string;
};

const FILTERS: { value: "all" | ChannelLogCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "members", label: "Members" },
  { value: "settings", label: "Settings" },
  { value: "messages", label: "Messages" },
];

const ACTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  member_joined: UserPlus,
  member_left: LogOut,
  member_added: UserPlus,
  member_removed: UserMinus,
  member_unbanned: UserPlus,
  role_changed: Shield,
  settings_changed: Settings2,
  info_changed: Pencil,
  post_canceled: Trash2,
};

const relTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function ChannelAdminLogPage() {
  const { handle } = useParams<{ handle: string }>();
  const { channel, userId, loading } = useChannel(handle);
  const goBack = useSmartBack(handle ? `/c/${handle}/manage` : "/channels");
  const [rows, setRows] = useState<LogRow[]>([]);
  const [names, setNames] = useState<Map<string, { name?: string | null; avatar?: string | null }>>(new Map());
  const [filter, setFilter] = useState<"all" | ChannelLogCategory>("all");
  const [logLoading, setLogLoading] = useState(true);

  useEffect(() => {
    if (!channel) return;
    let alive = true;
    (async () => {
      setLogLoading(true);
      const { data } = await (supabase as any)
        .from("channel_admin_log")
        .select("id, actor_id, action, target_user_id, meta, created_at")
        .eq("channel_id", channel.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!alive) return;
      const list = (data ?? []) as LogRow[];
      setRows(list);
      const ids = [...new Set(list.flatMap((r) => [r.actor_id, r.target_user_id]).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", ids);
        if (!alive) return;
        setNames(new Map((profs ?? []).map((p: any) => [p.user_id, { name: p.full_name, avatar: p.avatar_url }])));
      }
      setLogLoading(false);
    })();
    return () => { alive = false; };
  }, [channel?.id]);

  const nameOf = (id?: string | null) => (id ? names.get(id)?.name || "Someone" : "Someone");

  const describe = (r: LogRow): string => {
    const actor = nameOf(r.actor_id);
    const target = r.target_user_id ? nameOf(r.target_user_id) : "";
    switch (r.action) {
      case "member_joined": return `${actor} joined the channel`;
      case "member_left": return `${actor} left the channel`;
      case "member_added": return `${actor} added ${target}`;
      case "member_removed": return `${actor} removed ${target}`;
      case "member_unbanned": return `${actor} added ${target} back`;
      case "role_changed": return `${actor} set ${target}'s role to ${r.meta?.role ?? "member"}`;
      case "settings_changed": {
        const keys = r.meta ? Object.keys(r.meta) : [];
        const pretty = keys.map((k) => k.replace(/_/g, " ")).join(", ");
        return `${actor} changed ${pretty || "channel settings"}`;
      }
      case "info_changed": return `${actor} updated the channel info`;
      case "post_canceled": return `${actor} canceled a scheduled post`;
      default: return `${actor} · ${r.action}`;
    }
  };

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => LOG_CATEGORY[r.action as ChannelLogAction] === filter)),
    [rows, filter],
  );

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!channel) return <div className="p-8 text-center text-sm text-muted-foreground">Not found.</div>;
  if (userId !== channel.owner_id) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Only the owner can view recent actions.</div>;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/40 bg-background/85 px-3 py-3 pt-safe backdrop-blur-xl">
        <button type="button" onClick={goBack} className="rounded-full p-1.5 hover:bg-muted/60" aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 truncate text-base font-semibold">Recent actions</h1>
      </header>

      <div className="mx-auto max-w-2xl p-4">
        {/* Filter chips */}
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                filter === f.value ? "bg-ig-gradient text-white" : "border border-border bg-card text-muted-foreground hover:bg-muted/50",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {logLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/60" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <History className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">No recent actions</p>
            <p className="text-xs text-muted-foreground">Admin activity in this channel will show up here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const Icon = ACTION_ICON[r.action] ?? History;
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={names.get(r.actor_id)?.avatar ?? undefined} />
                    <AvatarFallback>{(nameOf(r.actor_id)).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-foreground">{describe(r)}</p>
                    <p className="text-[11px] text-muted-foreground">{relTime(r.created_at)}</p>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
