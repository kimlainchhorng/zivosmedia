/**
 * OnThisDay — Facebook-style "Memories" rail.
 * Pulls the current user's posts from the same calendar day in prior years
 * and renders a horizontal strip above the stories. Hidden when empty so it
 * doesn't take space on quiet days.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import FileText from "lucide-react/dist/esm/icons/file-text";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import Layers3 from "lucide-react/dist/esm/icons/layers-3";
import Play from "lucide-react/dist/esm/icons/play";
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
        // Don't resurface moderated/unpublished posts as memories.
        .is("hidden_at", null)
        .eq("is_published", true)
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
  const oldestMemory = memories.reduce((oldest, memory) => Math.max(oldest, memory.yearsAgo), 0);
  const videoCount = memories.filter((memory) => memory.media_type === "video").length;
  const photoCount = memories.filter((memory) => memory.media_url && memory.media_type !== "video").length;
  const textCount = Math.max(0, memories.length - photoCount - videoCount);
  const featuredMemory = memories[0] ?? null;
  const featuredLabel = featuredMemory
    ? featuredMemory.yearsAgo === 1
      ? "1 year ago"
      : `${featuredMemory.yearsAgo} years ago`
    : "";
  const dateLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date());
  const memoryMix = [
    { label: "Photos", value: photoCount, Icon: ImageIcon, tone: "text-cyan-500 bg-cyan-500/10" },
    { label: "Videos", value: videoCount, Icon: Play, tone: "text-fuchsia-500 bg-fuchsia-500/10" },
    { label: "Text", value: textCount, Icon: FileText, tone: "text-amber-600 bg-amber-500/10" },
  ];

  return (
    <section
      className="zivo-social-module mx-2 mt-2 mb-1 overflow-hidden rounded-[1.25rem] px-3 py-3"
      aria-label="Memories from this date in past years"
    >
      <div className="zivo-social-header-glass mb-2.5 flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="zivo-social-share-orb relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
            <CalendarClock className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.65)]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-bold text-foreground">On this day</h2>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {memories.length} memory{memories.length === 1 ? "" : "ies"} from past years
            </p>
          </div>
        </div>
        <span className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
          <Sparkles className="h-3 w-3 text-amber-500" aria-hidden="true" />
          {memories.length}
        </span>
      </div>
      <div className="mb-2.5 grid grid-cols-3 gap-2">
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <CalendarClock className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black leading-none text-foreground">{YEARS_BACK}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Years scanned</p>
          </div>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-fuchsia-500">
            <Layers3 className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black leading-none text-foreground">{oldestMemory}y</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Oldest</p>
          </div>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
            <ImageIcon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black leading-none text-foreground">{photoCount + videoCount}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Media</p>
          </div>
        </div>
      </div>
      {featuredMemory && (
        <Link
          to={`/post/${featuredMemory.id}`}
          aria-label={`Open featured memory from ${featuredLabel}`}
          className="zivo-social-share-preview mb-2.5 flex items-center justify-between gap-3 rounded-2xl px-3 py-2 transition-transform active:scale-[0.99]"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-amber-500/10 text-amber-600">
              {featuredMemory.media_url && featuredMemory.media_type !== "video" ? (
                <img src={featuredMemory.media_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : featuredMemory.media_type === "video" ? (
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              ) : (
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                Featured memory
              </span>
              <span className="block truncate text-sm font-bold text-foreground">
                {featuredMemory.caption?.trim() || "Look back at this moment"}
              </span>
            </span>
          </span>
          <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
            {featuredLabel}
          </span>
        </Link>
      )}
      <div className="zivo-social-module-tile mb-2.5 rounded-2xl px-3 py-2">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Memory mix</p>
            <p className="truncate text-xs font-black text-foreground">From {dateLabel} across your archive</p>
          </div>
          <span className="zivo-social-chip shrink-0 rounded-full px-2 py-1 text-[9px] font-black text-muted-foreground">
            {memories.length} total
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {memoryMix.map(({ label, value, Icon, tone }) => (
            <span key={label} className="zivo-social-chip flex min-w-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black text-muted-foreground">
              <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full", tone)}>
                <Icon className="h-2.5 w-2.5" aria-hidden="true" />
              </span>
              <span className="truncate">{value} {label}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {memories.map((m) => (
          <Link
            key={m.id}
            to={`/post/${m.id}`}
            aria-label={`Open memory from ${m.yearsAgo === 1 ? "1 year ago" : `${m.yearsAgo} years ago`}`}
            className={cn(
              "zivo-social-module-tile group relative w-[142px] shrink-0 overflow-hidden rounded-2xl",
              "transition-all hover:-translate-y-0.5 active:scale-[0.97]"
            )}
          >
            <div className="pointer-events-none absolute inset-x-4 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            <div className="relative aspect-[4/5] bg-white/50">
              {m.media_url && m.media_type !== "video" ? (
                <img src={m.media_url} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" />
              ) : m.media_url && m.media_type === "video" ? (
                <>
                  <video src={m.media_url} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" muted playsInline preload="metadata" />
                  <span className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md">
                    <Play className="h-3.5 w-3.5 fill-white" />
                  </span>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-[12px] text-muted-foreground">
                  {(m.caption || "").slice(0, 60) || "Post"}
                </div>
              )}
              <span className="absolute right-2 top-2 z-10 rounded-full bg-white/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-white backdrop-blur-sm">
                Memory
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    {m.yearsAgo === 1 ? "1 year ago" : `${m.yearsAgo} years ago`}
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-transform group-hover:translate-x-0.5">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
