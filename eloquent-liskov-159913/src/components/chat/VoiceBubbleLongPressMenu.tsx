/**
 * VoiceBubbleLongPressMenu — iMessage-style floating popover that appears when
 * a voice bubble is long-pressed. Mirrors the look of ChatMessageBubble's
 * long-press menu (dim backdrop + emoji reaction row + white action menu).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Reply from "lucide-react/dist/esm/icons/reply";
import Copy from "lucide-react/dist/esm/icons/copy";
import Forward from "lucide-react/dist/esm/icons/forward";
import Pin from "lucide-react/dist/esm/icons/pin";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";

const REACTION_EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🔥", "🎉", "😍"];

interface Props {
  open: boolean;
  isMe: boolean;
  openDown: boolean;
  isPinned?: boolean;
  canResend?: boolean;
  canReply?: boolean;
  canForward?: boolean;
  canPin?: boolean;
  canDelete?: boolean;
  isFailedOrUploading?: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply?: () => void;
  onCopy?: () => void;
  onForward?: () => void;
  onPin?: () => void;
  onResend?: () => void;
  onDeleteForEveryone?: () => void;
  onDeleteForMe?: () => void;
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
  active,
  chevron,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  active?: boolean;
  chevron?: boolean;
}) {
  return (
    <button type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-[14px] font-medium transition-colors hover:bg-muted/40 active:bg-muted/60 ${
        destructive ? "text-destructive" : active ? "text-primary" : "text-foreground"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      {chevron && <span className="text-muted-foreground">›</span>}
    </button>
  );
}

export default function VoiceBubbleLongPressMenu({
  open,
  isMe,
  openDown,
  isPinned,
  canResend,
  canReply,
  canForward,
  canPin,
  canDelete,
  isFailedOrUploading,
  onClose,
  onReact,
  onReply,
  onCopy,
  onForward,
  onPin,
  onResend,
  onDeleteForEveryone,
  onDeleteForMe,
}: Props) {
  const [showDeleteSub, setShowDeleteSub] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
            onClick={() => { setShowDeleteSub(false); onClose(); }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: openDown ? -6 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: openDown ? -6 : 6 }}
            transition={{ type: "spring", damping: 26, stiffness: 420 }}
            className={`absolute z-50 ${openDown ? "top-full mt-3 flex-col-reverse" : "bottom-full mb-3 flex-col"} flex gap-2 ${isMe ? "right-0 items-end" : "left-0 items-start"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Emoji reactions row */}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="bg-background shadow-lg shadow-black/10 border border-border/30 rounded-full px-1.5 py-1 flex items-center gap-0 max-w-[calc(100vw-32px)]"
            >
              {REACTION_EMOJIS.map((emoji, i) => (
                <motion.button
                  key={emoji}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.025 * i, type: "spring", stiffness: 500 }}
                  onClick={(e) => { e.stopPropagation(); onReact(emoji); onClose(); }}
                  className="h-[36px] w-[36px] flex items-center justify-center rounded-full hover:bg-muted/50 transition-all text-[20px] hover:scale-110 active:scale-90 duration-150"
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="bg-background shadow-lg shadow-black/10 border border-border/30 rounded-xl overflow-hidden min-w-[200px]"
            >
              <AnimatePresence mode="wait">
                {!showDeleteSub ? (
                  <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    {canReply && onReply && (
                      <MenuItem icon={Reply} label="Reply" onClick={() => { onReply(); onClose(); }} />
                    )}
                    {onCopy && (
                      <MenuItem icon={Copy} label="Copy link" onClick={() => { onCopy(); onClose(); }} />
                    )}
                    {canForward && onForward && (
                      <MenuItem icon={Forward} label="Forward" onClick={() => { onForward(); onClose(); }} />
                    )}
                    {canPin && onPin && (
                      <MenuItem icon={Pin} label={isPinned ? "Unpin" : "Pin"} onClick={() => { onPin(); onClose(); }} active={isPinned} />
                    )}
                    {canResend && onResend && (
                      <MenuItem icon={RefreshCw} label="Resend voice" onClick={() => { onResend(); onClose(); }} />
                    )}
                    {canDelete && (onDeleteForEveryone || onDeleteForMe) && (
                      <MenuItem
                        icon={Trash2}
                        label={isFailedOrUploading ? "Discard" : "Delete"}
                        onClick={() => {
                          if (isFailedOrUploading && onDeleteForMe) {
                            onDeleteForMe();
                            onClose();
                          } else {
                            setShowDeleteSub(true);
                          }
                        }}
                        destructive
                        chevron={!isFailedOrUploading}
                      />
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="delete" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.1 }}>
                    {isMe && onDeleteForEveryone && (
                      <MenuItem icon={Trash2} label="Delete for everyone" onClick={() => { onDeleteForEveryone(); setShowDeleteSub(false); onClose(); }} destructive />
                    )}
                    {onDeleteForMe && (
                      <MenuItem icon={Trash2} label="Delete for me" onClick={() => { onDeleteForMe(); setShowDeleteSub(false); onClose(); }} destructive />
                    )}
                    <div className="border-t border-border/30">
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setShowDeleteSub(false); }}
                        className="w-full py-2.5 text-center text-[13px] font-medium text-muted-foreground hover:bg-muted/30 active:bg-muted/50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
