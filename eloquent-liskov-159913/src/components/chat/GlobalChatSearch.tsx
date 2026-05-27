/**
 * GlobalChatSearch — Telegram-style 4-section global search overlay.
 *
 * Sections (run in parallel, ranked by relevance, 5 results each):
 *  - Chats        : DM threads the user already has (from chat_history)
 *  - Contacts     : profiles by name/username (excludes Zivo Driver)
 *  - Channels     : public channels by name/handle
 *  - Messages     : direct_messages text matches in user's threads
 *
 * Open from any chat header search bar. Each row deep-links to the right route.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import SearchIcon from "lucide-react/dist/esm/icons/search";
import X from "lucide-react/dist/esm/icons/x";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import AtSign from "lucide-react/dist/esm/icons/at-sign";
import Megaphone from "lucide-react/dist/esm/icons/megaphone";
import FileText from "lucide-react/dist/esm/icons/file-text";
import UserBadge from "@/components/chat/UserBadge";
import { cn } from "@/lib/utils";

type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
  last_seen?: string | null;
};

type ChannelRow = {
  id: string;
  handle: string | null;
  name: string;
  avatar_url: string | null;
  members_count?: number | null;
};

type MessageHit = {
  id: string;
  message: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const dbFrom = (table: string): any => (supabase as any).from(table);

export default function GlobalChatSearch({ open, onClose }: Props) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus + reset on open
  useEffect(() => {
    if (open) {
      setQ("");
      setDebounced("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const [contacts, setContacts] = useState<ProfileRow[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [messages, setMessages] = useState<MessageHit[]>([]);
  const [chats, setChats] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user || debounced.length < 2) {
      setContacts([]); setChannels([]); setMessages([]); setChats([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const term = `%${debounced}%`;

      // 1) Contacts (profiles by name/username, exclude Zivo Driver accounts)
      const contactsP = supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified, last_seen")
        .or(`username.ilike.${term},full_name.ilike.${term}`)
        .not("full_name", "ilike", "%Zivo Driver%")
        .limit(5);

      // 2) Channels (best-effort; tolerant of varying schemas)
      const channelsP = dbFrom("channels")
        .select("id, handle, name, avatar_url, members_count")
        .or(`name.ilike.${term},handle.ilike.${term}`)
        .limit(5);

      // 3) Messages in user's DM threads
      const messagesP = supabase
        .from("direct_messages")
        .select("id, message, sender_id, receiver_id, created_at")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .ilike("message", term)
        .order("created_at", { ascending: false })
        .limit(5);

      // 4) Existing chat partners — derive from chat_history
      const chatsP = dbFrom("chat_history")
        .select("partner_id")
        .eq("user_id", user.id)
        .limit(50);

      const [{ data: cData }, { data: chData }, { data: mData }, { data: histData }] =
        await Promise.all([contactsP, channelsP, messagesP, chatsP]);

      if (cancelled) return;
      setContacts((cData ?? []) as ProfileRow[]);
      setChannels(((chData ?? []) as ChannelRow[]).filter(Boolean));
      setMessages((mData ?? []) as MessageHit[]);

      // Resolve chat partners → matching profile rows
      const partnerIds: string[] = Array.from(
        new Set((histData ?? []).map((r: any) => String(r.partner_id ?? "")).filter(Boolean)),
      );
      if (partnerIds.length > 0) {
        const { data: chatProfiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, is_verified, last_seen")
          .in("id", partnerIds)
          .or(`username.ilike.${term},full_name.ilike.${term}`)
          .limit(5);
        if (!cancelled) setChats((chatProfiles ?? []) as ProfileRow[]);
      } else {
        setChats([]);
      }
      if (!cancelled) setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [open, user, debounced]);

  const empty = useMemo(
    () => debounced.length >= 2 && !loading && !contacts.length && !channels.length && !messages.length && !chats.length,
    [debounced, loading, contacts, channels, messages, chats],
  );

  const go = (path: string) => { onClose(); nav(path); };

  const Avatar = ({ src, fallback }: { src: string | null; fallback: string }) => (
    <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
	      {src ? <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : fallback.slice(0, 2).toUpperCase()}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="h-[88vh] rounded-t-3xl p-0 flex flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>Search chats</SheetTitle>
          <SheetDescription>
            Search across chats, contacts, channels, and messages.
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border/40">
          <SearchIcon className="w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats, contacts, channels, messages…"
            className="flex-1 bg-transparent outline-none text-sm py-2"
            autoComplete="off"
          />
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-muted/60" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {debounced.length < 2 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search across chats, people, channels and messages.
            </div>
          )}

          {empty && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No results for "{debounced}".
            </div>
          )}

          {/* Chats */}
          {chats.length > 0 && (
            <Section icon={<MessageCircle className="w-3.5 h-3.5" />} title="Chats">
              {chats.map((p) => (
                <Row
                  key={`chat-${p.id}`}
                  onClick={() => go(`/chat/dm/${p.id}`)}
                  avatar={<Avatar src={p.avatar_url} fallback={p.full_name || p.username || "?"} />}
                  title={
                    <span className="inline-flex items-center gap-1">
                      <span className="truncate">{p.full_name || p.username || "Unknown"}</span>
                      <UserBadge isVerified={!!p.is_verified} lastSeen={p.last_seen} size="xs" />
                    </span>
                  }
                  subtitle={p.username ? `@${p.username}` : "Open chat"}
                />
              ))}
            </Section>
          )}

          {/* Contacts */}
          {contacts.length > 0 && (
            <Section icon={<AtSign className="w-3.5 h-3.5" />} title="Contacts">
              {contacts.map((p) => (
                <Row
                  key={`c-${p.id}`}
                  onClick={() => go(`/u/${p.username || p.id}`)}
                  avatar={<Avatar src={p.avatar_url} fallback={p.full_name || p.username || "?"} />}
                  title={
                    <span className="inline-flex items-center gap-1">
                      <span className="truncate">{p.full_name || p.username || "Unknown"}</span>
                      <UserBadge isVerified={!!p.is_verified} lastSeen={p.last_seen} size="xs" />
                    </span>
                  }
                  subtitle={p.username ? `@${p.username}` : "View profile"}
                />
              ))}
            </Section>
          )}

          {/* Channels */}
          {channels.length > 0 && (
            <Section icon={<Megaphone className="w-3.5 h-3.5" />} title="Channels">
              {channels.map((c) => (
                <Row
                  key={`ch-${c.id}`}
                  onClick={() => go(`/chat/channel/${c.handle || c.id}`)}
                  avatar={<Avatar src={c.avatar_url} fallback={c.name} />}
                  title={<span className="truncate">{c.name}</span>}
                  subtitle={
                    <span className="inline-flex items-center gap-2">
                      {c.handle && <span>@{c.handle}</span>}
                      {typeof c.members_count === "number" && (
                        <span>{c.members_count.toLocaleString()} members</span>
                      )}
                    </span>
                  }
                />
              ))}
            </Section>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <Section icon={<FileText className="w-3.5 h-3.5" />} title="Messages">
              {messages.map((m) => {
                const partnerId = m.sender_id === user?.id ? m.receiver_id : m.sender_id;
                return (
                  <Row
                    key={`m-${m.id}`}
                    onClick={() => go(`/chat/dm/${partnerId}?msg=${m.id}`)}
                    avatar={<div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center"><FileText className="w-4 h-4 text-muted-foreground" /></div>}
                    title={<HighlightedText text={m.message} term={debounced} />}
                    subtitle={new Date(m.created_at).toLocaleDateString()}
                  />
                );
              })}
            </Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-1">
      <div className="px-1 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold inline-flex items-center gap-1.5">
        {icon} {title}
      </div>
      <div className="rounded-xl bg-card/60 divide-y divide-border/30">
        {children}
      </div>
    </div>
  );
}

function Row({
  avatar, title, subtitle, onClick,
}: { avatar: React.ReactNode; title: React.ReactNode; subtitle: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 active:scale-[0.99] transition-all")}>
      {avatar}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
      </div>
    </button>
  );
}

function HighlightedText({ text, term }: { text: string; term: string }) {
  if (!term) return <span className="truncate">{text}</span>;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return <span className="truncate">{text}</span>;
  return (
    <span className="truncate">
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded px-0.5">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </span>
  );
}
