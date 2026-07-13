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
import { MoreVertical, Pencil, Trash2, Pin, PinOff } from "lucide-react";
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

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        disabled={deleting || pinning}
        className={cn(
          "rounded-full p-1.5 transition-colors active:scale-90 disabled:opacity-50",
          isDark ? "text-white/60 hover:bg-white/10" : "text-muted-foreground hover:bg-muted",
        )}
        aria-label="Comment options"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ type: "spring", damping: 20, stiffness: 380, mass: 0.5 }}
            className="absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded-xl bg-background border border-border/50 shadow-2xl overflow-hidden"
          >
            {!confirmDelete ? (
              <>
                {/* Pin/Unpin — post author only */}
                {canPin && onTogglePin && (
                  <button
                    type="button"
                    disabled={pinning}
                    onClick={(e) => { e.stopPropagation(); setOpen(false); onTogglePin(); }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted active:bg-muted/80 disabled:opacity-50"
                  >
                    {isPinned ? <PinOff className="h-4 w-4 text-foreground" /> : <Pin className="h-4 w-4 text-primary" />}
                    {pinning ? "Updating..." : (isPinned ? "Unpin" : "Pin to top")}
                  </button>
                )}
                {/* Edit/Delete — comment author only */}
                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setOpen(false); onEditStart(); }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted active:bg-muted/80"
                    >
                      <Pencil className="h-4 w-4 text-foreground" />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 disabled:opacity-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="p-2">
                <p className="px-1 pb-2 text-xs text-muted-foreground">Delete this comment?</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                    className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={(e) => { e.stopPropagation(); setOpen(false); setConfirmDelete(false); onDelete(); }}
                    className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-red-700 active:scale-95 disabled:opacity-50"
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
