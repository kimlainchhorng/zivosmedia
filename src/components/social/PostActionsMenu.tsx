/**
 * PostActionsMenu — three-dot overflow menu shown on every feed card.
 * Surfaces: Save / Mute author / Block author / Report / Copy link / Why I see this.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bookmark, BookmarkCheck, VolumeX, UserX, Flag, Link2, Info, X, BarChart3, Pencil, Trash2, EyeOff, ShieldQuestion, AlertTriangle, Sparkles, ShieldCheck, Compass } from "lucide-react";
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
  const guidanceLabel = isOwnPost
    ? "Review performance or edit safely"
    : isBookmarked
      ? "Saved for later"
      : "Save, tune, or share";
  const guidanceMeta = isOwnPost
    ? "Owner tools are shown first"
    : isBookmarked
      ? "Tap Saved to remove it from your library"
      : "Bookmark this post if you want to revisit it";

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
            className="zivo-social-composer-panel w-full max-w-md md:max-w-lg rounded-t-3xl p-2 pb-6 sm:rounded-3xl sm:pb-3 max-h-[85vh] overflow-y-auto"
            initial={{ y: 400, opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "max(1.5rem, var(--zivo-safe-bottom,0px))" }}
          >
            {/* Drag handle (mobile only) */}
            <div className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full bg-foreground/25 shadow-[0_0_12px_hsl(var(--foreground)/0.12)] sm:hidden" />

            {view === "main" && (
              <div className="px-2">
                <div className="zivo-social-header-glass mb-3 flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-primary">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-extrabold text-foreground">Post actions</h3>
                      <p className="truncate text-xs font-medium text-muted-foreground">
                        {authorName ? `Manage options for ${authorName}` : "Save, share, tune, or report this post"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close post actions"
                    className="zivo-social-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black leading-none text-foreground">{isBookmarked ? "Saved" : "Open"}</p>
                      <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Library</p>
                    </div>
                  </div>
                  <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black leading-none text-foreground">{isOwnPost ? "Owner" : "Viewer"}</p>
                      <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Access</p>
                    </div>
                  </div>
                  <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
                      <Info className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black leading-none text-foreground">{target.source === "store" ? "Shop" : "Post"}</p>
                      <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Source</p>
                    </div>
                  </div>
                </div>
                <div className="zivo-social-module-tile mb-3 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                      <Compass className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                        Action guidance
                      </span>
                      <span className="block truncate text-xs font-black text-foreground">{guidanceLabel}</span>
                    </span>
                  </span>
                  <span className="hidden min-w-0 truncate text-right text-[10px] font-semibold text-muted-foreground sm:block">
                    {guidanceMeta}
                  </span>
                </div>
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
                    <hr className="my-2 border-border/30" />
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
                <hr className="my-2 border-border/30" />
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
                <div className="zivo-social-header-glass mb-3 flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-red-500">
                      <Flag className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-extrabold text-foreground">Report post</h3>
                      <p className="truncate text-xs font-medium text-muted-foreground">Tell us what needs review</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setView("main")} className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold text-muted-foreground">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                </div>
                <div className="space-y-1">
                  {REPORT_REASONS.map((r) => (
                    <button type="button"
                      key={r.id}
                      onClick={() => { onReport(r.id); handleClose(); }}
                      className="zivo-social-sheet-row flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition-all active:scale-[0.99]"
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
                <div className="zivo-social-header-glass mb-3 flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-primary">
                      <ShieldQuestion className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-extrabold text-foreground">Why you're seeing this</h3>
                      <p className="truncate text-xs font-medium text-muted-foreground">Signals that ranked this post</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setView("main")} className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold text-muted-foreground">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                </div>
                <div className="zivo-social-module rounded-[1.25rem] p-4 text-sm text-muted-foreground space-y-2">
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
                <div className="zivo-social-header-glass mb-3 flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-red-500">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-extrabold text-red-600">Delete this post?</h3>
                      <p className="truncate text-xs font-medium text-muted-foreground">This action cannot be undone</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setView("main")} className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold text-muted-foreground">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                </div>
                <div className="zivo-social-sheet-row zivo-social-sheet-row-danger rounded-[1.25rem] p-4 text-sm text-foreground space-y-2">
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
                    className="zivo-social-chip flex-1 rounded-xl px-3 py-2.5 text-sm font-medium active:scale-95 transition-transform min-h-[44px]"
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
      aria-label={sub ? `${label}: ${sub}` : label}
      className="zivo-social-sheet-row flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 sm:py-3 text-left transition-all active:scale-[0.99] min-h-[52px] sm:min-h-[44px]"
    >
      <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-foreground">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] sm:text-sm font-medium text-foreground">{label}</span>
        {sub && <span className="block text-xs text-muted-foreground mt-0.5">{sub}</span>}
      </span>
    </button>
  );
}
