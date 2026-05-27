/**
 * PostActionsMenu — three-dot overflow menu shown on every feed card.
 * Surfaces: Save / Mute author / Block author / Report / Copy link / Why I see this.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, BookmarkCheck, VolumeX, UserX, Flag, Link2, Info, X, BarChart3, Pencil, Trash2, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { PostActionTarget } from "@/hooks/usePostActions";

interface Props {
  open: boolean;
  onClose: () => void;
  target: PostActionTarget;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onMute: () => void;
  onBlock: () => void;
  onReport: (reason: string) => void;
  shareUrl?: string;
  authorName?: string;
  /** Show "View insights" / "Edit caption" / "Delete post" rows when the caller authored this post */
  isOwnPost?: boolean;
  onViewInsights?: () => void;
  onEditCaption?: () => void;
  onDeletePost?: () => void;
  /** Hide this post locally (Not interested). Hidden when caller authored the post. */
  onNotInterested?: () => void;
}

const REPORT_REASONS = [
  { id: "spam",         label: "Spam or scam" },
  { id: "harassment",   label: "Harassment or bullying" },
  { id: "violence",     label: "Violence or threats" },
  { id: "nudity",       label: "Nudity or sexual content" },
  { id: "hate",         label: "Hate speech" },
  { id: "misinfo",      label: "False information" },
  { id: "ip",           label: "Intellectual property violation" },
  { id: "other",        label: "Something else" },
];

export default function PostActionsMenu({
  open, onClose, target, isBookmarked,
  onToggleBookmark, onMute, onBlock, onReport,
  shareUrl, authorName,
  isOwnPost, onViewInsights, onEditCaption, onDeletePost,
  onNotInterested,
}: Props) {
  const [view, setView] = useState<"main" | "report" | "why" | "confirm-delete">("main");

  const handleClose = () => { setView("main"); onClose(); };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
      handleClose();
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="w-full max-w-md md:max-w-lg rounded-t-3xl bg-background p-2 pb-6 shadow-2xl sm:rounded-3xl sm:pb-3 max-h-[85vh] overflow-y-auto"
            initial={{ y: 400, opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "max(1.5rem, var(--zivo-safe-bottom,0px))" }}
          >
            {/* Drag handle (mobile only) */}
            <div className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full bg-muted-foreground/30 sm:hidden" />

            {view === "main" && (
              <div className="px-2">
                {/* Author-only rows: insights / edit / delete, surfaced first */}
                {isOwnPost && (onViewInsights || onEditCaption || onDeletePost) && (
                  <>
                    {onViewInsights && (
                      <MenuRow
                        icon={<BarChart3 className="h-5 w-5 text-primary" />}
                        label="View insights"
                        sub="See who engaged with this post"
                        onClick={() => { onViewInsights(); handleClose(); }}
                      />
                    )}
                    {onEditCaption && (
                      <MenuRow
                        icon={<Pencil className="h-5 w-5 text-foreground" />}
                        label="Edit caption"
                        sub="Update the text of this post"
                        onClick={() => { onEditCaption(); handleClose(); }}
                      />
                    )}
                    {onDeletePost && (
                      <MenuRow
                        icon={<Trash2 className="h-5 w-5 text-red-500" />}
                        label="Delete post"
                        sub="Permanently remove from your profile"
                        onClick={() => setView("confirm-delete")}
                      />
                    )}
                    <hr className="my-2 border-border/50" />
                  </>
                )}
                <MenuRow
                  icon={isBookmarked ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
                  label={isBookmarked ? "Saved" : "Save post"}
                  sub={isBookmarked ? "Tap to remove from saved" : "Bookmark for later"}
                  onClick={() => { onToggleBookmark(); handleClose(); }}
                />
                {shareUrl && (
                  <MenuRow
                    icon={<Link2 className="h-5 w-5" />}
                    label="Copy link"
                    onClick={handleCopyLink}
                  />
                )}
                <MenuRow
                  icon={<Info className="h-5 w-5" />}
                  label="Why am I seeing this?"
                  onClick={() => setView("why")}
                />
                {!isOwnPost && onNotInterested && (
                  <MenuRow
                    icon={<EyeOff className="h-5 w-5" />}
                    label="Not interested"
                    sub="Hide this post and show fewer like it"
                    onClick={() => { onNotInterested(); handleClose(); }}
                  />
                )}
                <hr className="my-2 border-border/50" />
                {target.authorId && (
                  <>
                    <MenuRow
                      icon={<VolumeX className="h-5 w-5 text-orange-500" />}
                      label={`Mute ${authorName ?? "this account"}`}
                      sub="Hide future posts from this account"
                      onClick={() => { onMute(); handleClose(); }}
                    />
                    <MenuRow
                      icon={<UserX className="h-5 w-5 text-red-500" />}
                      label={`Block ${authorName ?? "this account"}`}
                      sub="They can't see or interact with your content"
                      onClick={() => { onBlock(); handleClose(); }}
                    />
                  </>
                )}
                <MenuRow
                  icon={<Flag className="h-5 w-5 text-red-500" />}
                  label="Report post"
                  sub="Tell us what's wrong"
                  onClick={() => setView("report")}
                />
              </div>
            )}

            {view === "report" && (
              <div className="px-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold">Why are you reporting?</h3>
                  <button type="button" onClick={() => setView("main")} className="text-sm text-muted-foreground">Back</button>
                </div>
                <div className="space-y-1">
                  {REPORT_REASONS.map((r) => (
                    <button type="button"
                      key={r.id}
                      onClick={() => { onReport(r.id); handleClose(); }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm hover:bg-muted"
                    >
                      <span>{r.label}</span>
                      <Flag className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {view === "why" && (
              <div className="px-4 py-2">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold">Why you're seeing this</h3>
                  <button type="button" onClick={() => setView("main")} className="text-sm text-muted-foreground">Back</button>
                </div>
                <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
                  <p>This post was ranked using:</p>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>How recent it is</li>
                    <li>Likes, comments, and views from people like you</li>
                    <li>Whether you've engaged with this {target.source === "store" ? "shop" : "creator"} before</li>
                    <li>A small randomization factor to surface fresh content</li>
                  </ul>
                  <p className="pt-2 text-xs">Posts from accounts you mute or block never appear here.</p>
                </div>
              </div>
            )}

            {view === "confirm-delete" && (
              <div className="px-4 py-2">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-red-600">Delete this post?</h3>
                  <button type="button" onClick={() => setView("main")} className="text-sm text-muted-foreground">Back</button>
                </div>
                <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-4 text-sm text-foreground space-y-2">
                  <p>This will permanently remove the post from your profile and the feed.</p>
                  <ul className="ml-4 list-disc space-y-1 text-muted-foreground text-xs">
                    <li>Likes, reactions, and comments will be deleted with it</li>
                    <li>Anyone who reposted you will keep their copy unless they delete it</li>
                    <li>This cannot be undone</li>
                  </ul>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button"
                    onClick={() => setView("main")}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium hover:bg-muted active:scale-95 transition-transform min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button type="button"
                    onClick={() => { onDeletePost?.(); handleClose(); }}
                    className="flex-1 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 active:scale-95 transition-transform min-h-[44px] flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MenuRow({
  icon, label, sub, onClick,
}: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 sm:py-3 text-left hover:bg-muted active:bg-muted/80 transition-colors min-h-[52px] sm:min-h-[44px]"
    >
      <span className="shrink-0 text-foreground">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] sm:text-sm font-medium text-foreground">{label}</span>
        {sub && <span className="block text-xs text-muted-foreground mt-0.5">{sub}</span>}
      </span>
    </button>
  );
}
