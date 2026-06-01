/**
 * CommentPreview — compact "View N comments" affordance plus the newest
 * comment text. Tapping opens the full comment sheet.
 */
import { useEffect, useState, memo } from "react";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Clock3 from "lucide-react/dist/esm/icons/clock-3";
import { formatDistanceToNowStrict } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
  variant?: "default" | "overlay";
}

function CommentPreviewInner({ postId, source, totalCount, onOpen, variant = "default" }: Props) {
  const [top, setTop] = useState<PreviewComment | null>(null);

  useEffect(() => {
    if (!postId || totalCount <= 0) {
      setTop(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Pull the most recent comment from the same table the comment sheet writes to.
      const table = "post_comments";
      const selectColumns = "user_id, content, created_at";
      let query = (supabase as any)
        .from(table)
        .select(selectColumns)
        .eq("post_id", postId);
      query = query.eq("post_source", source);

      const { data } = await query
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || !data) return;

      // Comment column varies by table; pick whichever is non-null
      const text = data.comment ?? data.content ?? data.text ?? data.body ?? "";
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
  const latestLabel = top?.createdAt
    ? formatDistanceToNowStrict(new Date(top.createdAt), { addSuffix: false })
        .replace(" seconds", "s")
        .replace(" second", "s")
        .replace(" minutes", "m")
        .replace(" minute", "m")
        .replace(" hours", "h")
        .replace(" hour", "h")
    : null;
  const isOverlay = variant === "overlay";

  return (
    <button
      type="button"
      data-testid="reel-comment-preview"
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      aria-label={`Open ${commentLabel}${top ? `. Latest from ${top.authorName}` : ""}`}
      className={cn(
        "group w-full max-w-full text-left transition-all hover:-translate-y-0.5 active:scale-[0.99] active:opacity-80",
        isOverlay
          ? "rounded-full border border-white/15 bg-black/35 px-2.5 py-2 text-white shadow-[0_12px_28px_rgba(0,0,0,0.24)] backdrop-blur-md hover:bg-black/45"
          : "zivo-social-comment-preview rounded-2xl px-3 py-2.5 text-foreground",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105",
            isOverlay ? "bg-white/[0.14] text-white" : "zivo-social-share-orb text-primary",
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[8px] font-black leading-none text-primary-foreground shadow-[0_8px_18px_hsl(var(--primary)/0.24)]">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-0.5 flex min-w-0 items-center gap-1.5 text-[10px] font-black">
            <span className={cn("shrink-0", isOverlay ? "text-white/90" : "text-primary")}>
              {signalLabel}
            </span>
            {latestLabel && (
              <span className={cn("inline-flex shrink-0 items-center gap-1", isOverlay ? "text-white/65" : "text-muted-foreground")}>
                <Clock3 className="h-2.5 w-2.5" />
                {latestLabel}
              </span>
            )}
            <span className={cn("truncate", isOverlay ? "text-white/65" : "text-muted-foreground")}>
              View {commentLabel}
            </span>
          </span>
          {top ? (
            <span className={cn("block truncate text-[11px] font-medium leading-snug sm:text-xs", isOverlay ? "text-white/82" : "text-muted-foreground")}>
              <span className="font-bold">{top.authorName}</span>{" "}
              <span>{top.text}</span>
            </span>
          ) : (
            <span className={cn("block truncate text-[11px] font-medium leading-snug sm:text-xs", isOverlay ? "text-white/70" : "text-muted-foreground")}>
              Open the conversation
            </span>
          )}
        </span>
        <span
          className={cn(
            "flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-extrabold uppercase transition-transform group-hover:translate-x-0.5",
            isOverlay ? "bg-white/[0.12] text-white/80" : "zivo-social-comment-preview-badge",
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </span>
    </button>
  );
}

const CommentPreview = memo(CommentPreviewInner);
export default CommentPreview;
