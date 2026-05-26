/**
 * SharedTodosPage — Collaborative to-do lists shared with chat partners.
 * Backed by `chat_todos` (orphan). RLS allows creator or chat_partner_id to view/update.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ListTodo, Sparkles, Check, ChevronDown, CheckCircle2, Circle, UserCheck, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TodoItem {
  id?: string;
  text: string;
  done?: boolean;
  by?: string;
}

interface ChatTodoRow {
  id: string;
  creator_id: string;
  chat_partner_id: string;
  title: string;
  items: TodoItem[];
  is_shared: boolean | null;
  created_at: string;
  updated_at: string;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function SharedTodosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["chat-todos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ChatTodoRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            or: (f: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: ChatTodoRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("chat_todos")
        .select("id, creator_id, chat_partner_id, title, items, is_shared, created_at, updated_at")
        .or(`creator_id.eq.${user.id},chat_partner_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });
      return (data ?? []).map((r) => ({ ...r, items: Array.isArray(r.items) ? r.items : [] }));
    },
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  const totals = useMemo(() => {
    let total = 0;
    let done = 0;
    lists.forEach((l) => {
      l.items.forEach((it) => {
        total += 1;
        if (it.done) done += 1;
      });
    });
    return { total, done, open: total - done };
  }, [lists]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleItem = async (list: ChatTodoRow, itemIdx: number) => {
    const nextItems = list.items.map((it, i) => (i === itemIdx ? { ...it, done: !it.done, by: user?.id } : it));
    qc.setQueryData<ChatTodoRow[]>(["chat-todos", user?.id], (old) =>
      (old ?? []).map((l) => (l.id === list.id ? { ...l, items: nextItems, updated_at: new Date().toISOString() } : l)),
    );
    const sb = supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (k: string, v: string) => Promise<{ error: unknown }>;
        };
      };
    };
    const { error } = await sb
      .from("chat_todos")
      .update({ items: nextItems, updated_at: new Date().toISOString() })
      .eq("id", list.id);
    if (error) {
      toast.error("Couldn't update");
      qc.invalidateQueries({ queryKey: ["chat-todos", user?.id] });
    }
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Shared Todos · ZIVO" description="Collaborative to-do lists with friends." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <ListTodo className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Shared Todos</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Progress</p>
          <p className="text-3xl font-bold mt-1">{totals.done}/{totals.total} done</p>
          <p className="text-sm text-white/80 mt-1">
            {lists.length} {lists.length === 1 ? "list" : "lists"} · {totals.open} open task{totals.open === 1 ? "" : "s"}
          </p>
          {totals.total > 0 && (
            <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${Math.round((totals.done / totals.total) * 100)}%` }}
              />
            </div>
          )}
        </motion.div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && lists.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <ListTodo className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No shared lists yet</p>
            <p className="text-xs text-muted-foreground">Open a chat and tap the + menu → Todo to create a shared list with a friend.</p>
          </div>
        )}

        {!isLoading && lists.length > 0 && (
          <div className="space-y-2">
            {lists.map((l, idx) => {
              const open = l.items.filter((i) => !i.done).length;
              const done = l.items.length - open;
              const pct = l.items.length > 0 ? Math.round((done / l.items.length) * 100) : 0;
              const isExpanded = expanded.has(l.id);
              const isCreator = l.creator_id === user?.id;
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className="rounded-2xl bg-card border border-border overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(l.id)}
                    className="w-full flex items-center gap-3 p-3.5 hover:bg-secondary/40 transition-colors text-left"
                    aria-label={`${l.title}, ${isExpanded ? "collapse" : "expand"}`}
                  >
                    <div className="shrink-0 h-10 w-10 rounded-xl bg-ig-gradient/10 border border-ig-gradient/20 flex items-center justify-center">
                      <ListTodo className="h-4 w-4 text-ig-gradient" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{l.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5">
                          {isCreator ? <UserCheck className="h-2.5 w-2.5" /> : <Users className="h-2.5 w-2.5" />}
                          {isCreator ? "you created" : "shared with you"}
                        </span>
                        <span>·</span>
                        <span>{formatRelative(l.updated_at)}</span>
                      </div>
                      {l.items.length > 0 && (
                        <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-ig-gradient transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-ig-gradient">{done}/{l.items.length}</p>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform mx-auto", isExpanded && "rotate-180")} />
                    </div>
                  </button>
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden border-t border-border/60"
                      >
                        <div className="p-3 space-y-1.5">
                          {l.items.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic text-center py-3">Empty list — add items from chat.</p>
                          ) : (
                            l.items.map((it, i) => (
                              <button
                                key={it.id ?? i}
                                type="button"
                                onClick={() => toggleItem(l, i)}
                                className={cn(
                                  "w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors active:scale-[0.99]",
                                  it.done ? "bg-secondary/40" : "hover:bg-secondary/50",
                                )}
                              >
                                {it.done ? (
                                  <div className="shrink-0 mt-0.5 h-4 w-4 rounded-full bg-ig-gradient flex items-center justify-center">
                                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                  </div>
                                ) : (
                                  <Circle className="shrink-0 mt-0.5 h-4 w-4 text-muted-foreground" />
                                )}
                                <span className={cn("text-xs font-medium flex-1", it.done ? "text-muted-foreground line-through" : "text-foreground")}>
                                  {it.text}
                                </span>
                              </button>
                            ))
                          )}
                          <button
                            type="button"
                            onClick={() => navigate(`/chat`)}
                            className="w-full mt-2 h-9 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Open in chat
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
