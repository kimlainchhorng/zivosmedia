/**
 * CommentRowActions — inline edit / delete controls shown only to the comment
 * author. Uses a tiny popover triggered by a 3-dot button.
 *
 * Edit replaces the row content with an inline textarea + Save/Cancel; Delete
 * pops a destructive confirm. Parent receives only the final mutations via
 * onSave / onDelete callbacks (this component never touches the DB directly,
 * to keep schema knowledge in one place).
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, Pencil, Trash2, Pin, PinOff, ShieldAlert, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Show edit/delete only when caller is the comment author */
  canManage: boolean;
  onEditStart: () => void;
  onDelete: () => void;
  /** Show Pin/Unpin only when caller is the post author */
  canPin?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  deleting?: boolean;
  pinning?: boolean;
  /** Light surface (e.g. bottom sheet on the feed) vs dark (overlay reels) */
  variant?: "light" | "dark";
}

export default function CommentRowActions({
  canManage, onEditStart, onDelete,
  canPin, isPinned, onTogglePin,
  deleting = false,
  pinning = false,
  variant = "light",
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setConfirmDelete(false); return; }
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Show the menu if the caller can manage the comment OR can pin it as the post author.
  if (!canManage && !canPin) return null;

  const isDark = variant === "dark";
  const actionCount = Number(Boolean(canPin && onTogglePin)) + Number(canManage) + Number(canManage);
  const nextStepLabel = canPin
    ? isPinned
      ? "Pinned comment controls"
      : "Feature or moderate"
    : "Edit safely";
  const nextStepMeta = canPin
    ? isPinned
      ? "Unpin, edit, or remove if needed"
      : "Pin helpful replies or manage the thread"
    : "Only your comment actions are shown";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        disabled={deleting || pinning}
        className={cn(
          "relative rounded-full p-1.5 transition-colors active:scale-90 disabled:opacity-50",
          isDark ? "text-white/60 hover:bg-white/10" : "zivo-social-icon-button text-muted-foreground",
        )}
        aria-label="Comment options"
      >
        <MoreVertical className="h-4 w-4" />
        {(pinning || deleting) && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.55)]" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ type: "spring", damping: 20, stiffness: 380, mass: 0.5 }}
            className="zivo-social-sheet-panel absolute right-0 top-full z-30 mt-1 min-w-[190px] overflow-hidden rounded-[1.25rem] p-1.5"
          >
            {!confirmDelete ? (
              <>
                <div className="zivo-social-header-glass mb-1 flex items-center gap-2 rounded-2xl px-2.5 py-2">
                  <span className="zivo-social-share-orb flex h-7 w-7 shrink-0 items-center justify-center rounded-xl">
                    <MoreVertical className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">Comment options</p>
                    <p className="truncate text-[10px] font-medium text-muted-foreground">
                      {canPin ? "Manage visibility and edits" : "Manage your comment"}
                    </p>
                  </div>
                  <span className="zivo-social-chip ml-auto flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-black text-primary">
                    <Sparkles className="h-3 w-3" />
                  </span>
                </div>
                <div className="mb-1 grid grid-cols-2 gap-1.5">
                  <div className="zivo-social-module-tile flex items-center gap-1.5 rounded-2xl px-2 py-1.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <ShieldCheck className="h-3 w-3" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-black text-foreground">{canPin ? "Author" : "Owner"}</span>
                      <span className="block truncate text-[9px] font-semibold text-muted-foreground">Role</span>
                    </span>
                  </div>
                  <div className="zivo-social-module-tile flex items-center gap-1.5 rounded-2xl px-2 py-1.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Sparkles className="h-3 w-3" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-black text-foreground">{actionCount}</span>
                      <span className="block truncate text-[9px] font-semibold text-muted-foreground">Actions</span>
                    </span>
                  </div>
                </div>
                <div className="zivo-social-module-tile mb-1.5 flex items-center gap-2 rounded-2xl px-2.5 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">
                      Safe next step
                    </span>
                    <span className="block truncate text-xs font-black text-foreground">{nextStepLabel}</span>
                    <span className="block truncate text-[10px] font-semibold text-muted-foreground">{nextStepMeta}</span>
                  </span>
                </div>
                {/* Pin/Unpin — post author only */}
                {canPin && onTogglePin && (
                  <button
                    type="button"
                    disabled={pinning}
                    onClick={(e) => { e.stopPropagation(); setOpen(false); onTogglePin(); }}
                    aria-label={isPinned ? "Unpin this comment from the top" : "Pin this comment to the top"}
                    className="zivo-social-sheet-row flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <span className="zivo-social-share-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                      {isPinned ? <PinOff className="h-4 w-4 text-foreground" /> : <Pin className="h-4 w-4 text-primary" />}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate">{pinning ? "Updating..." : (isPinned ? "Unpin" : "Pin to top")}</span>
                      <span className="block truncate text-[10px] font-semibold text-muted-foreground">
                        {isPinned ? "Remove from the top" : "Feature this comment"}
                      </span>
                    </span>
                  </button>
                )}
                {/* Edit/Delete — comment author only */}
                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setOpen(false); onEditStart(); }}
                      aria-label="Edit this comment"
                      className="zivo-social-sheet-row flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5"
                    >
                      <span className="zivo-social-share-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                        <Pencil className="h-4 w-4 text-foreground" />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate">Edit</span>
                        <span className="block truncate text-[10px] font-semibold text-muted-foreground">Update your wording</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                      aria-label="Delete this comment"
                      className="zivo-social-sheet-row zivo-social-sheet-row-danger flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate">Delete</span>
                        <span className="block truncate text-[10px] font-semibold text-red-500/80">Remove from thread</span>
                      </span>
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="p-1.5">
                <div className="zivo-social-module mb-2 rounded-2xl px-3 py-3 text-center">
                  <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
                    <ShieldAlert className="h-4 w-4" />
                  </span>
                  <p className="text-xs font-bold text-foreground">Delete this comment?</p>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">This action removes it from the thread.</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                    className="zivo-social-chip min-h-[34px] flex-1 rounded-full px-2 py-1.5 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={(e) => { e.stopPropagation(); setOpen(false); setConfirmDelete(false); onDelete(); }}
                    className="min-h-[34px] flex-1 rounded-full bg-red-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-red-700 active:scale-95 disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
