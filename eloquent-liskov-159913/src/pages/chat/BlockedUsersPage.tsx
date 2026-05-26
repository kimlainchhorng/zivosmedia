/**
 * BlockedUsersPage — list and unblock users you've blocked.
 */
import { useCallback, useEffect, useState } from "react";
import { useSmartBack } from "@/lib/smartBack";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import ShieldOff from "lucide-react/dist/esm/icons/shield-off";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type BlockedRow = {
  blocked_id: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export default function BlockedUsersPage() {
  const goBack = useSmartBack("/chat/contacts");
  const { user } = useAuth();
  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("blocked_users")
      .select("blocked_id, created_at")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false });

    const list: BlockedRow[] = (data ?? []) as any;
    const ids = list.map((r) => r.blocked_id);
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", ids);
      const byId = new Map(((profs ?? []) as any[]).map((p) => [p.user_id, p]));
      list.forEach((r) => { r.profile = byId.get(r.blocked_id) ?? null; });
    }
    setRows(list);
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function unblock(id: string) {
    if (!user) return;
    setBusy(id);
    const { error } = await (supabase as any)
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("User unblocked");
    setRows((prev) => prev.filter((r) => r.blocked_id !== id));
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-2 safe-area-top">
        <button type="button"
          onClick={goBack}
          aria-label="Go back"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex-1">Blocked</h1>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
              <ShieldOff className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No blocked users</h3>
            <p className="text-sm text-muted-foreground">
              People you block won't be able to message you or see your activity.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card overflow-hidden">
            {rows.map((r) => {
              const name = r.profile?.full_name || (r.profile?.username ? `@${r.profile.username}` : "ZIVO user");
              return (
                <li key={r.blocked_id} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar className="w-11 h-11">
                    <AvatarImage src={r.profile?.avatar_url ?? undefined} />
                    <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.profile?.username ? `@${r.profile.username}` : "—"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === r.blocked_id}
                    onClick={() => unblock(r.blocked_id)}
                  >
                    {busy === r.blocked_id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unblock"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
