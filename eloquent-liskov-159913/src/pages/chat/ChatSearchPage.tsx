/**
 * ChatSearchPage
 * --------------
 * Global search across the user's DMs, group chats, and channel posts.
 * Server-side filter via PostgREST `ilike` with the user-id scoped via RLS.
 *
 * Each result row is a deep link back to the source thread.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search as SearchIcon,
  MessageCircle,
  Users,
  Megaphone,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

type Source = "dm" | "group" | "channel";

interface ResultRow {
  id: string;
  source: Source;
  /** ISO timestamp */
  created_at: string;
  /** Plain text excerpt */
  excerpt: string;
  /** Heading shown above the excerpt (chat name / group name / channel handle) */
  heading: string;
  /** Click target */
  href: string;
}

function highlight(text: string, q: string): string {
  if (!q) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return text.slice(0, 200);
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + q.length + 100);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

const SOURCE_ICON: Record<Source, typeof MessageCircle> = {
  dm: MessageCircle,
  group: Users,
  channel: Megaphone,
};

const SOURCE_LABEL: Record<Source, string> = {
  dm: "Direct",
  group: "Group",
  channel: "Channel",
};

export default function ChatSearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | Source>("all");

  useEffect(() => {
    const h = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(h);
  }, [q]);

  useEffect(() => {
    if (!user?.id || debounced.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      // Fan out three queries in parallel. RLS already restricts each table to
      // rows the user is allowed to see, so we trust the result set as-is.
      const term = `%${debounced.replace(/[%_]/g, (c) => `\\${c}`)}%`;

      const [dmsRes, groupsRes, channelsRes] = await Promise.all([
        // 1) Direct messages — sender or receiver is the user
        (supabase as any)
          .from("direct_messages")
          .select("id, sender_id, receiver_id, message, created_at")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .ilike("message", term)
          .order("created_at", { ascending: false })
          .limit(40),
        // 2) Group messages
        (supabase as any)
          .from("group_messages")
          .select("id, group_id, sender_id, message, created_at")
          .ilike("message", term)
          .order("created_at", { ascending: false })
          .limit(40),
        // 3) Channel posts (body)
        (supabase as any)
          .from("channel_posts")
          .select("id, channel_id, body, published_at, created_at")
          .ilike("body", term)
          .not("published_at", "is", null)
          .order("published_at", { ascending: false })
          .limit(40),
      ]);

      // Hydrate display names. We do best-effort lookups but fall back to
      // the raw id if a row was filtered by RLS.
      const dmRows = (dmsRes?.data ?? []) as any[];
      const grpRows = (groupsRes?.data ?? []) as any[];
      const chRows = (channelsRes?.data ?? []) as any[];

      const peerIds = Array.from(new Set(dmRows.map((m) => (m.sender_id === user.id ? m.receiver_id : m.sender_id))));
      const groupIds = Array.from(new Set(grpRows.map((m) => m.group_id)));
      const channelIds = Array.from(new Set(chRows.map((m) => m.channel_id)));

      const [{ data: peers }, { data: groups }, { data: channels }] = await Promise.all([
        peerIds.length
          ? (supabase as any).from("profiles").select("user_id, full_name").in("user_id", peerIds)
          : Promise.resolve({ data: [] }),
        groupIds.length
          ? (supabase as any).from("group_chats").select("id, name").in("id", groupIds)
          : Promise.resolve({ data: [] }),
        channelIds.length
          ? (supabase as any).from("channels").select("id, name, handle").in("id", channelIds)
          : Promise.resolve({ data: [] }),
      ]);

      const peerMap = new Map<string, any>((peers ?? []).map((p: any) => [p.user_id, p]));
      const groupMap = new Map<string, any>((groups ?? []).map((g: any) => [g.id, g]));
      const channelMap = new Map<string, any>((channels ?? []).map((c: any) => [c.id, c]));

      const merged: ResultRow[] = [];
      for (const m of dmRows) {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        const peer = peerMap.get(otherId);
        merged.push({
          id: m.id,
          source: "dm",
          created_at: m.created_at,
          excerpt: highlight(m.message ?? "", debounced),
          heading: peer?.full_name ?? "Direct chat",
          href: `/chat?with=${otherId}`,
        });
      }
      for (const m of grpRows) {
        const grp = groupMap.get(m.group_id);
        merged.push({
          id: m.id,
          source: "group",
          created_at: m.created_at,
          excerpt: highlight(m.message ?? "", debounced),
          heading: grp?.name ?? "Group",
          href: `/chat?group=${m.group_id}`,
        });
      }
      for (const p of chRows) {
        const ch = channelMap.get(p.channel_id);
        merged.push({
          id: p.id,
          source: "channel",
          created_at: p.published_at ?? p.created_at,
          excerpt: highlight(p.body ?? "", debounced),
          heading: ch?.name ? `${ch.name}${ch.handle ? " · @" + ch.handle : ""}` : "Channel",
          href: ch?.handle ? `/c/${ch.handle}` : "#",
        });
      }

      merged.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      if (!cancelled) setResults(merged);
      if (!cancelled) setLoading(false);
    })().catch((e) => {
      if (!cancelled) {
        console.error("[ChatSearchPage] failed", e);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, debounced]);

  const filtered = useMemo(() => {
    if (filter === "all") return results;
    return results.filter((r) => r.source === filter);
  }, [results, filter]);

  return (
    <div className="min-h-screen bg-background pt-safe">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 px-3 py-2 flex items-center gap-2">
        <button type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/chat"))}
          className="p-2 -ml-2 rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center gap-2 rounded-full bg-muted/40 px-3 py-1.5">
          <SearchIcon className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search messages, groups, channels…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      </header>

      <div className="px-3 pt-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {(["all", "dm", "group", "channel"] as const).map((f) => (
          <button type="button"
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 text-muted-foreground"
            }`}
          >
            {f === "all" ? "All" : SOURCE_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto p-3 space-y-2">
        {debounced.length < 2 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            Type at least 2 characters to search across all your conversations.
          </p>
        ) : filtered.length === 0 && !loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            No matches for “{debounced}”.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((r) => {
              const Icon = SOURCE_ICON[r.source];
              return (
                <li key={`${r.source}-${r.id}`}>
                  <Link
                    to={r.href}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 active:scale-[0.99] transition"
                  >
                    <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{r.heading}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{r.excerpt}</p>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 mt-1">
                        {SOURCE_LABEL[r.source]}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
