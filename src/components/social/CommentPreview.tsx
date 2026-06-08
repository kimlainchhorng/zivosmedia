/**
 * CommentPreview — small "View N comments" line + the most-recent or
 * highest-engaged comment text under a feed post. Tapping opens the full
 * comment sheet.
 */
import { useEffect, useState, memo } from "react";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Clock3 from "lucide-react/dist/esm/icons/clock-3";
import Gauge from "lucide-react/dist/esm/icons/gauge";
import { formatDistanceToNowStrict } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const isMissingTable = (e: { code?: string | null; message?: string | null } | null) =>
  !!e &&
  (["PGRST205", "42P01", "PGRST002"].includes(e.code ?? "") ||
    /could not find the table|does not exist|schema cache/i.test(e.message ?? ""));

// Module-level flags so all mounted instances share the same skip state
const tableMissing: Record<string, boolean> = {};

interface PreviewComment {
  authorName: string;
  text: string;
  createdAt: string | null;
}

interface Props {
  postId: string;
  source: "store" | "user";
  totalCount: number;
  onOpen: () => void;
}

function CommentPreviewInner({ postId, source, totalCount, onOpen }: Props) {
  const [top, setTop] = useState<PreviewComment | null>(null);

  useEffect(() => {
    if (!postId || totalCount <= 0) {
      setTop(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // user posts live in the unified post_comments table (post_source='user');
      // store posts keep their own store_post_comments table.
      const isUser = source === "user";
      const table = isUser ? "post_comments" : "store_post_comments";
      if (tableMissing[table]) return;
      let q = (supabase as any)
        .from(table)
        .select("user_id, content, created_at")
        .eq("post_id", postId);
      if (isUser) q = q.eq("post_source", "user");
      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (isMissingTable(error)) { tableMissing[table] = true; return; }
      if (cancelled || !data) return;

      const text = data.content ?? data.comment ?? data.text ?? data.body ?? "";
      if (!text) return;

      let authorName = "User";
      if (data.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", data.user_id)
          .maybeSingle();
        authorName = profile?.full_name ?? profile?.username ?? "User";
      }
      if (!cancelled) setTop({ authorName, text, createdAt: data.created_at ?? null });
    })();

    return () => { cancelled = true; };
  }, [postId, source, totalCount]);

  if (totalCount <= 0) return null;

  const commentLabel = totalCount === 1 ? "1 comment" : `all ${totalCount} comments`;
  const signalLabel = totalCount >= 10 ? "Active thread" : totalCount >= 3 ? "Conversation" : "New reply";
  const threadPulse = totalCount >= 20 ? "Busy" : totalCount >= 5 ? "Building" : "Starting";
  const latestLabel = top?.createdAt
    ? formatDistanceToNowStrict(new Date(top.createdAt), { addSuffix: false })
        .replace(" seconds", "s")
        .replace(" second", "s")
        .replace(" minutes", "m")
        .replace(" minute", "m")
        .replace(" hours", "h")
        .replace(" hour", "h")
    : null;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      aria-label={`Open ${commentLabel}${top ? `. Latest from ${top.authorName}` : ""}`}
      className={cn(
        "zivo-social-comment-preview group w-full max-w-full rounded-2xl px-3 py-2.5 text-left text-foreground",
        "transition-all hover:-translate-y-0.5 active:scale-[0.99] active:opacity-80"
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="zivo-social-share-orb relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[8px] font-black leading-none text-primary-foreground shadow-[0_8px_18px_hsl(var(--primary)/0.24)]">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        </span>
          <span className="min-w-0 flex-1">
            <span className="mb-1 flex min-w-0 items-center gap-1.5">
              <span className="zivo-social-chip inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black text-primary">
                <Sparkles className="h-2.5 w-2.5" />
                {signalLabel}
              </span>
              {latestLabel && (
                <span className="zivo-social-chip inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black text-muted-foreground">
                  <Clock3 className="h-2.5 w-2.5" />
                  {latestLabel}
                </span>
              )}
            </span>
          {top ? (
            <span className="block truncate text-[12px] leading-snug sm:text-[13px] md:text-sm">
              <span className="font-bold">{top.authorName}</span>{" "}
              <span className="text-muted-foreground">{top.text}</span>
            </span>
          ) : (
            <span className="block text-[12px] font-semibold leading-snug text-muted-foreground sm:text-[13px]">
              Comments are warming up
            </span>
          )}
          <span className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-muted-foreground sm:text-xs">
            <span className="zivo-social-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black text-muted-foreground">
              <Gauge className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
              {threadPulse}
            </span>
            <span>View {commentLabel}</span>
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
        <span className="zivo-social-comment-preview-badge flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2.5 text-[10px] font-extrabold uppercase transition-transform group-hover:translate-x-0.5">
          <ChevronRight className="h-4 w-4" />
        </span>
      </span>
    </button>
  );
}

const CommentPreview = memo(CommentPreviewInner);
export default CommentPreview;
