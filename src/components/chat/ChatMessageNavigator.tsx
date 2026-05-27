import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Pin from "lucide-react/dist/esm/icons/pin";
import Search from "lucide-react/dist/esm/icons/search";
import X from "lucide-react/dist/esm/icons/x";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  normalizeChatMessageNavigationRows,
  type ChatMessageNavigationItem,
  type ChatMessageNavigationRow,
  type ChatMessageNavigatorMode,
} from "./chatMessageNavigatorModel";

type ChatMessageNavigatorSource =
  | {
      type: "dm";
      chatId: string;
      peerName: string;
    }
  | {
      type: "group";
      chatId: string;
      groupName: string;
      senderLabelFor?: (senderId: string) => string;
    };

interface ChatMessageNavigatorProps {
  open: boolean;
  onClose: () => void;
  source: ChatMessageNavigatorSource;
  initialMode?: ChatMessageNavigatorMode;
  onJumpToMessage: (messageId: string) => void | Promise<void>;
  onUnpinMessage?: (messageId: string) => void | Promise<void>;
}

const DIRECT_COLUMNS = "id,sender_id,receiver_id,message,message_type,created_at,is_pinned,hidden_at,expires_at,image_url,video_url,voice_url,file_payload";
const GROUP_COLUMNS = "id,group_id,sender_id,message,message_type,created_at,is_pinned,hidden_at,expires_at,image_url,video_url,voice_url,file_payload";
const RESULT_LIMIT = 50;
const dbFrom = (table: string): any => (supabase as any).from(table);

export default function ChatMessageNavigator({
  open,
  onClose,
  source,
  initialMode = "search",
  onJumpToMessage,
  onUnpinMessage,
}: ChatMessageNavigatorProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<ChatMessageNavigatorMode>(initialMode);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<ChatMessageNavigationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setQuery("");
    setDebouncedQuery("");
    setItems([]);
    setErrorText("");
    if (initialMode === "search") requestAnimationFrame(() => inputRef.current?.focus());
  }, [initialMode, open]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const title = source.type === "dm" ? source.peerName : source.groupName;
  const searchReady = mode === "pinned" || debouncedQuery.length >= 2;

  useEffect(() => {
    if (!open || !user?.id || !searchReady) {
      if (mode === "search" && debouncedQuery.length < 2) setItems([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErrorText("");

    const load = async () => {
      const rows = source.type === "dm"
        ? await fetchDirectRows(source.chatId, user.id, mode, debouncedQuery)
        : await fetchGroupRows(source.chatId, mode, debouncedQuery);
      if (cancelled) return;
      setItems(
        normalizeChatMessageNavigationRows(rows, {
          sourceType: source.type,
          chatId: source.chatId,
          currentUserId: user.id,
          peerLabel: source.type === "dm" ? source.peerName : undefined,
          senderLabelFor: source.type === "group" ? source.senderLabelFor : undefined,
        }),
      );
    };

    load()
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setErrorText("Could not load messages");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, mode, open, searchReady, source, user?.id]);

  const emptyText = useMemo(() => {
    if (mode === "search" && debouncedQuery.length < 2) return "Type at least 2 characters to search this chat.";
    if (mode === "search") return `No messages found for "${debouncedQuery}".`;
    return "No pinned messages yet.";
  }, [debouncedQuery, mode]);

  const handleJump = async (messageId: string) => {
    await onJumpToMessage(messageId);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent side="bottom" className="h-[86vh] rounded-t-3xl p-0 flex flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>Search and pinned messages</SheetTitle>
          <SheetDescription>Search message history and jump to pinned messages.</SheetDescription>
        </SheetHeader>

        <div className="border-b border-border/40 px-3 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">Search + Pins</p>
              <p className="truncate text-[11px] text-muted-foreground">{title}</p>
            </div>
            <button type="button" onClick={onClose} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted/70" aria-label="Close navigator">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 rounded-xl bg-muted/50 p-1">
            <ModeButton active={mode === "search"} icon={<Search className="h-3.5 w-3.5" />} label="Search" onClick={() => setMode("search")} />
            <ModeButton active={mode === "pinned"} icon={<Pin className="h-3.5 w-3.5" />} label="Pinned" onClick={() => setMode("pinned")} />
          </div>

          {mode === "search" && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border/50 bg-background px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search messages"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoComplete="off"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted" aria-label="Clear search">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex h-36 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : errorText ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">{errorText}</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <NavigatorRow
                  key={item.messageId}
                  item={item}
                  term={mode === "search" ? debouncedQuery : ""}
                  onJump={() => void handleJump(item.messageId)}
                  onUnpin={mode === "pinned" && onUnpinMessage ? () => void onUnpinMessage(item.messageId) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ModeButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function NavigatorRow({
  item,
  term,
  onJump,
  onUnpin,
}: {
  item: ChatMessageNavigationItem;
  term: string;
  onJump: () => void;
  onUnpin?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/70 p-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {item.isPinned ? <Pin className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-xs font-bold text-primary">{item.senderLabel}</p>
            <span className="shrink-0 text-[10px] text-muted-foreground">{format(new Date(item.createdAt), "MMM d, h:mm a")}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-foreground">
            <HighlightedText text={item.body || item.previewLabel} term={term} />
          </p>
          {item.body !== item.previewLabel && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.previewLabel}</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {onUnpin && (
          <button type="button" onClick={onUnpin} className="h-8 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:bg-muted">
            Unpin
          </button>
        )}
        <button type="button" onClick={onJump} className="inline-flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground active:scale-95">
          Jump <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function HighlightedText({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-primary/20 px-0.5 text-foreground">{text.slice(index, index + term.length)}</mark>
      {text.slice(index + term.length)}
    </>
  );
}

async function fetchDirectRows(chatId: string, userId: string, mode: ChatMessageNavigatorMode, term: string): Promise<ChatMessageNavigationRow[]> {
  const pairFilter = `and(sender_id.eq.${userId},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${userId})`;
  let query = dbFrom("direct_messages")
    .select(DIRECT_COLUMNS)
    .or(pairFilter)
    .is("hidden_at", null);
  query = mode === "search"
    ? query.ilike("message", `%${term}%`)
    : query.eq("is_pinned", true);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(RESULT_LIMIT);
  if (error) throw error;
  return (data || []) as ChatMessageNavigationRow[];
}
async function fetchGroupRows(groupId: string, mode: ChatMessageNavigatorMode, term: string): Promise<ChatMessageNavigationRow[]> {
  let query = dbFrom("group_messages")
    .select(GROUP_COLUMNS)
    .eq("group_id", groupId)
    .is("hidden_at", null);
  query = mode === "search"
    ? query.ilike("message", `%${term}%`)
    : query.eq("is_pinned", true);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(RESULT_LIMIT);
  if (error) throw error;
  return (data || []) as ChatMessageNavigationRow[];
}
