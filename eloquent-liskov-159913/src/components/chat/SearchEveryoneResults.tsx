/**
 * SearchEveryoneResults — fallback search across all profiles when the local
 * contact list has no matches. Debounced 300ms; excludes "Zivo Driver" accounts.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import Search from "lucide-react/dist/esm/icons/search";
import { supabase } from "@/integrations/supabase/client";
import { useContacts } from "@/hooks/useContacts";
import { toast } from "sonner";

type Hit = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export default function SearchEveryoneResults({ query }: { query: string }) {
  const navigate = useNavigate();
  const { add } = useContacts();
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const clean = q.replace(/^@/, "");
        const { data } = await (supabase as any)
          .from("profiles")
          .select("user_id, full_name, username, avatar_url")
          .or(`username.ilike.%${clean}%,full_name.ilike.%${clean}%`)
          .neq("full_name", "Zivo Driver")
          .eq("is_of_creator", false)
          .limit(8);
        if (!cancelled) setHits((data ?? []) as Hit[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  async function addOne(h: Hit) {
    setAdding(h.user_id);
    const r = await add(h.user_id, { via: "search" });
    setAdding(null);
    if (r.ok) toast.success("Added to contacts");
    else toast.error(r.error || "Couldn't add contact");
  }

  if (query.trim().length < 2) return null;

  return (
    <div className="px-3 pt-2">
      <div className="flex items-center gap-1.5 px-1 pb-2 text-[12px] text-muted-foreground">
        <Search className="w-3 h-3" />
        Search everyone on ZIVO
        {loading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
      </div>
      {!loading && hits.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-6">
          No people found for "{query}".
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card overflow-hidden">
          {hits.map((h) => {
            const name = h.full_name || (h.username ? `@${h.username}` : "ZIVO user");
            return (
              <li key={h.user_id} className="flex items-center gap-3 px-3 py-2.5">
                <button type="button"
                  onClick={() => navigate(h.username ? `/u/${h.username}` : `/profile/${h.user_id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={h.avatar_url ?? undefined} />
                    <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{name}</div>
                    {h.username && <div className="text-xs text-muted-foreground truncate">@{h.username}</div>}
                  </div>
                </button>
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                  disabled={adding === h.user_id}
                  onClick={() => addOne(h)}
                >
                  {adding === h.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Add
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
