/**
 * SavedPostsLink — small horizontal pill linking to /saved when the user
 * has at least one bookmark. Self-hides when the count is 0 so brand-new
 * users don't see a useless prompt.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import FolderOpen from "lucide-react/dist/esm/icons/folder-open";
import Layers3 from "lucide-react/dist/esm/icons/layers-3";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Target from "lucide-react/dist/esm/icons/target";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

function formatSavedCount(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  return String(count);
}

function getSavedMilestone(count: number) {
  if (count < 5) return { target: 5, label: `${5 - count} to first folder` };
  if (count < 25) return { target: 25, label: `${25 - count} to deep library` };
  if (count < 100) return { target: 100, label: `${100 - count} to power library` };
  return { target: count, label: "Power library" };
}

export default function SavedPostsLink() {
  const { user } = useAuth();

  const { data: count = 0 } = useQuery({
    queryKey: ["saved-posts-count", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!user) return 0;
      const [legacy, modern] = await Promise.all([
        (supabase as any)
          .from("bookmarks")
          .select("item_id", { count: "exact" })
          .eq("user_id", user.id)
          .eq("item_type", "post"),
        (supabase as any)
          .from("post_bookmarks")
          .select("post_id, source", { count: "exact" })
          .eq("user_id", user.id),
      ]);
      const unique = new Set<string>();
      for (const row of legacy.data || []) unique.add(String(row.item_id).replace(/^u-/, ""));
      for (const row of modern.data || []) unique.add(`${row.source}:${row.post_id}`);
      return unique.size || legacy.count || modern.count || 0;
    },
  });

  if (!user || count <= 0) return null;
  const compactCount = formatSavedCount(count);
  const libraryStatus = count >= 25 ? "Deep library" : count >= 5 ? "Growing library" : "Library ready";
  const milestone = getSavedMilestone(count);
  const progressWidth = `${Math.min(100, Math.max(34, (count / milestone.target) * 100))}%`;

  return (
    <Link
      to="/saved"
      className="zivo-social-module group mx-2 mt-2 mb-1 flex items-center gap-3 overflow-hidden rounded-[1.25rem] px-3 py-3 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
      aria-label={`Open saved library with ${count} saved ${count === 1 ? "post" : "posts"}. ${milestone.label}`}
    >
      <span className="zivo-social-share-orb relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105">
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-primary-foreground shadow-lg" aria-hidden="true">
          {compactCount}
        </span>
        <Bookmark className="h-4 w-4 text-primary" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-primary/80">
          <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
          {libraryStatus}
        </span>
        <span className="block truncate text-[13px] font-bold text-foreground">
          {count === 1 ? "1 saved post" : `${count} saved posts`}
        </span>
        <span className="mt-1 flex items-center gap-1 truncate text-[11px] font-semibold text-muted-foreground">
          <FolderOpen className="h-3 w-3 shrink-0" aria-hidden="true" />
          {milestone.label}
        </span>
      </span>
      <span className="hidden min-w-[4.5rem] flex-col items-end sm:flex">
        <span className="zivo-social-chip flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
          <Layers3 className="h-3 w-3" aria-hidden="true" />
          {compactCount}
        </span>
        <span className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/70" aria-hidden="true">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-amber-400 transition-all group-hover:w-full"
            style={{ width: progressWidth }}
          />
        </span>
        <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.08em] text-muted-foreground/80">
          <Target className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
          Goal
        </span>
      </span>
      <span className="zivo-social-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary">
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
