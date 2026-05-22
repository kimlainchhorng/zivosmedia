/**
 * OnThisDay — Facebook-style "Memories" rail.
 * Pulls the current user's posts from the same calendar day in prior years
 * and renders a horizontal strip above the stories. Hidden when empty so it
 * doesn't take space on quiet days.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Memory = {
  id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  yearsAgo: number;
};

const YEARS_BACK = 5;

function dayWindowsForYearsBack(years: number): Array<{ start: string; end: string; yearsAgo: number }> {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  const out: Array<{ start: string; end: string; yearsAgo: number }> = [];
  for (let i = 1; i <= years; i++) {
    const startD = new Date(now.getFullYear() - i, month, day, 0, 0, 0, 0);
    const endD = new Date(now.getFullYear() - i, month, day + 1, 0, 0, 0, 0);
    out.push({ start: startD.toISOString(), end: endD.toISOString(), yearsAgo: i });
  }
  return out;
}

export default function OnThisDay() {
  const { user } = useAuth();
  const windows = useMemo(() => dayWindowsForYearsBack(YEARS_BACK), []);

  const { data: memories = [] } = useQuery({
    queryKey: ["on-this-day", user?.id, windows[0]?.start ?? ""],
    enabled: !!user,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      if (!user) return [] as Memory[];
      // Build OR of (created_at >= start AND < end) per year window
      const orClause = windows
        .map((w) => `and(created_at.gte.${w.start},created_at.lt.${w.end})`)
        .join(",");
      const { data, error } = await (supabase as any)
        .from("user_posts")
        .select("id, caption, media_url, media_urls, media_type, created_at")
        .eq("user_id", user.id)
        .or(orClause)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [] as Memory[];
      return (data || []).map((p: any) => {
        const created = new Date(p.created_at);
        const yearsAgo = Math.max(1, new Date().getFullYear() - created.getFullYear());
        const url = p.media_url || (Array.isArray(p.media_urls) ? p.media_urls[0] : null);
        return {
          id: p.id,
          caption: p.caption ?? null,
          media_url: url,
          media_type: p.media_type ?? null,
          created_at: p.created_at,
          yearsAgo,
        } as Memory;
      });
    },
  });

  if (!user || memories.length === 0) return null;

  return (
    <section className="px-3 pt-2 pb-1">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        <h2 className="text-[13px] font-semibold text-foreground">On this day</h2>
        <span className="text-[11px] text-muted-foreground">memories from past years</span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-3 px-3 pb-1">
        {memories.map((m) => (
          <Link
            key={m.id}
            to={`/post/${m.id}`}
            className={cn(
              "shrink-0 w-[120px] rounded-2xl overflow-hidden border border-border/40 bg-card",
              "active:scale-[0.97] transition-transform"
            )}
          >
            <div className="aspect-[4/5] relative bg-muted">
              {m.media_url && m.media_type !== "video" ? (
	                <img src={m.media_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
              ) : m.media_url && m.media_type === "video" ? (
                <video src={m.media_url} className="absolute inset-0 h-full w-full object-cover" muted playsInline preload="metadata" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-[12px] text-muted-foreground">
                  {(m.caption || "").slice(0, 60) || "Post"}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                <span className="block text-[11px] font-semibold text-white">
                  {m.yearsAgo === 1 ? "1 year ago" : `${m.yearsAgo} years ago`}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
