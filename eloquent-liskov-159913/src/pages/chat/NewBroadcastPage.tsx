/**
 * NewBroadcastPage — Create a broadcast list by picking contacts (followed users).
 */
import { useEffect, useState } from "react";
import { useSmartBack } from "@/lib/smartBack";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBroadcastLists } from "@/hooks/useBroadcastLists";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import Search from "lucide-react/dist/esm/icons/search";
import Check from "lucide-react/dist/esm/icons/check";
import { toast } from "sonner";

interface DirectMessagePeerRow {
  sender_id: string;
  receiver_id: string;
}

interface BroadcastContactRow {
  id: string;
  user_id: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function NewBroadcastPage() {
  const nav = useNavigate();
  const goBack = useSmartBack("/chat");
  const { user } = useAuth();
  const { createList } = useBroadcastLists();
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [contacts, setContacts] = useState<BroadcastContactRow[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      // Pull recent chat partners as the contact pool.
      const { data } = await (supabase as any)
        .from("direct_messages" as any)
        .select("sender_id,receiver_id")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(200);

      const directMessages = (data ?? []) as DirectMessagePeerRow[];
      const ids = new Set<string>();
      directMessages.forEach((r) => {
        if (r.sender_id !== user.id) ids.add(r.sender_id);
        if (r.receiver_id !== user.id) ids.add(r.receiver_id);
      });
      if (ids.size === 0) { if (alive) setContacts([]); return; }
      const { data: profs } = await (supabase as any)
        .from("profiles")
        .select("id,user_id,full_name,username,avatar_url")
        .in("user_id", Array.from(ids));
      if (alive) setContacts((profs ?? []) as BroadcastContactRow[]);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const filtered = q.trim().length === 0
    ? contacts
    : contacts.filter((c) =>
        (c.full_name || "").toLowerCase().includes(q.toLowerCase()) ||
        (c.username || "").toLowerCase().includes(q.toLowerCase())
      );

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const create = async () => {
    if (!name.trim()) { toast.error("Name your list"); return; }
    if (picked.size === 0) { toast.error("Pick at least one member"); return; }
    setCreating(true);
    const list = await createList(name, Array.from(picked));
    setCreating(false);
    if (list) { toast.success("Broadcast list created"); nav("/chat/broadcasts"); }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 pt-safe px-3 py-3 flex items-center gap-2">
        <button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold flex-1">New broadcast list</h1>
      </header>

      <div className="px-3 mt-3 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="List name"
          className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search contacts…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted/40 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="px-3 mt-3">
        {filtered.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">No contacts yet — chat with someone first.</div>
        ) : (
          <ul className="bg-card/60 rounded-xl divide-y divide-border/30">
            {filtered.map((c) => {
              const id = c.user_id || c.id;
              const isPicked = picked.has(id);
              return (
                <li key={id}>
                  <button type="button" onClick={() => toggle(id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={c.avatar_url || ""} />
                      <AvatarFallback>{(c.full_name || c.username || "?").slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.full_name || c.username}</div>
                      {c.username && <div className="text-[11px] text-muted-foreground truncate">@{c.username}</div>}
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isPicked ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                      {isPicked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/40 p-3 pb-[calc(var(--zivo-safe-bottom,0px)+12px)]">
        <button type="button"
          onClick={create}
          disabled={creating}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          {creating ? "Creating…" : `Create list (${picked.size})`}
        </button>
      </div>
    </div>
  );
}
