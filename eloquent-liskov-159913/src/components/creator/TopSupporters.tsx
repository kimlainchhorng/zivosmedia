import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Crown, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  creatorId: string;
}

interface SupporterRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_cents: number;
  is_subscriber: boolean;
}

const MAX = 8;

export default function TopSupporters({ creatorId }: Props) {
  const navigate = useNavigate();

  const { data: supporters = [] } = useQuery<SupporterRow[]>({
    queryKey: ["creator-top-supporters", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const [tipsRes, subsRes] = await Promise.all([
        (supabase as any)
          .from("creator_tips")
          .select("tipper_id, amount_cents, is_anonymous, status")
          .eq("creator_id", creatorId)
          .neq("is_anonymous", true)
          .in("status", ["succeeded", "completed"]),
        (supabase as any)
          .from("creator_subscriptions")
          .select("subscriber_id, price_cents")
          .eq("creator_id", creatorId)
          .eq("status", "active"),
      ]);

      const totals = new Map<string, { total: number; isSubscriber: boolean }>();

      for (const t of (tipsRes.data || []) as Array<{ tipper_id: string; amount_cents: number | null }>) {
        if (!t.tipper_id) continue;
        const cur = totals.get(t.tipper_id) ?? { total: 0, isSubscriber: false };
        cur.total += t.amount_cents ?? 0;
        totals.set(t.tipper_id, cur);
      }
      for (const s of (subsRes.data || []) as Array<{ subscriber_id: string; price_cents: number | null }>) {
        if (!s.subscriber_id) continue;
        const cur = totals.get(s.subscriber_id) ?? { total: 0, isSubscriber: false };
        cur.isSubscriber = true;
        totals.set(s.subscriber_id, cur);
      }

      const userIds = Array.from(totals.keys());
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const rows: SupporterRow[] = (profiles || []).map((p: any) => {
        const t = totals.get(p.user_id)!;
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          total_cents: t.total,
          is_subscriber: t.isSubscriber,
        };
      });

      rows.sort((a, b) => {
        if (a.is_subscriber !== b.is_subscriber) return a.is_subscriber ? -1 : 1;
        return b.total_cents - a.total_cents;
      });

      return rows.slice(0, MAX);
    },
  });

  if (supporters.length === 0) return null;

  return (
    <div className="px-4 max-w-3xl mx-auto mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-amber-500" />
          Top supporters
        </h3>
        <span className="text-[11px] text-muted-foreground font-medium">{supporters.length}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {supporters.map((s) => {
          const initials = (s.full_name || "?").trim().slice(0, 2).toUpperCase();
          const showAmount = s.total_cents > 0;
          return (
            <button type="button"
              key={s.user_id}
              onClick={() => navigate(`/user/${s.user_id}`)}
              className="flex flex-col items-center gap-1 shrink-0 w-16 active:scale-95 transition-transform"
            >
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-amber-400/60">
                  <AvatarImage src={s.avatar_url || undefined} alt={s.full_name || "Supporter"} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                {s.is_subscriber && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center ring-2 ring-background"
                    aria-label="Subscriber"
                  >
                    <Heart className="h-2.5 w-2.5 text-white fill-white" />
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-foreground truncate w-full text-center leading-tight">
                {s.full_name || "Fan"}
              </span>
              {showAmount && (
                <span className="text-[9px] font-bold text-amber-600 leading-none">
                  ${(s.total_cents / 100).toFixed(s.total_cents >= 10000 ? 0 : 2)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
