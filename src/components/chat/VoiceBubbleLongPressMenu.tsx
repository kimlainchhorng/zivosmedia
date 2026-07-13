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
import Plus from "lucide-react/dist/esm/icons/plus";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";

const REACTION_EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🔥", "🎉", "😍"];
const MORE_REACTION_EMOJIS = ["👏", "🙏", "👌", "🤝", "💯", "🥰", "😎", "😡", "🤯", "😭", "🤣", "👀", "⭐", "💔", "✅", "❌"];

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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  active?: boolean;
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
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const closeAll = () => {
    setShowReactionPicker(false);
    onClose();
  };

  const pickReaction = (emoji: string) => {
    onReact(emoji);
    closeAll();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
            onClick={closeAll}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: openDown ? -6 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: openDown ? -6 : 6 }}
            transition={{ type: "spring", damping: 26, stiffness: 420 }}
            className={`absolute z-50 ${openDown ? "top-full mt-3" : "bottom-full mb-3"} ${isMe ? "right-0" : "left-0"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-[24px] border border-border/30 bg-background shadow-xl shadow-black/15"
            >
              <div className="flex items-center gap-1 overflow-x-auto border-b border-border/30 px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {REACTION_EMOJIS.map((emoji, i) => (
                  <motion.button
                    key={emoji}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.02 * i, type: "spring", stiffness: 500 }}
                    onClick={(e) => { e.stopPropagation(); pickReaction(emoji); }}
                    aria-label={`React ${emoji}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[20px] transition-all duration-150 hover:scale-110 hover:bg-muted/50 active:scale-90"
                  >
                    {emoji}
                  </motion.button>
                ))}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReactionPicker(true);
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-muted/50 active:scale-90"
                  aria-label="More reactions"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <AnimatePresence mode="wait">
                {showReactionPicker ? (
                  <motion.div key="reactions" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.1 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowReactionPicker(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:bg-muted/30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Reactions
                    </button>
                    <div className="grid grid-cols-4 gap-1 p-2 pt-0">
                      {[...REACTION_EMOJIS, ...MORE_REACTION_EMOJIS].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            pickReaction(emoji);
                          }}
                          className="h-10 w-10 rounded-full text-[21px] hover:bg-muted/50 active:scale-90 transition"
                          aria-label={`React ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    {canReply && onReply && (
                      <MenuItem icon={Reply} label="Reply" onClick={() => { onReply(); closeAll(); }} />
                    )}
                    {onCopy && (
                      <MenuItem icon={Copy} label="Copy link" onClick={() => { onCopy(); closeAll(); }} />
                    )}
                    {canForward && onForward && (
                      <MenuItem icon={Forward} label="Forward" onClick={() => { onForward(); closeAll(); }} />
                    )}
                    {canPin && onPin && (
                      <MenuItem icon={Pin} label={isPinned ? "Unpin" : "Pin"} onClick={() => { onPin(); closeAll(); }} active={isPinned} />
                    )}
                    {canResend && onResend && (
                      <MenuItem icon={RefreshCw} label="Resend voice" onClick={() => { onResend(); closeAll(); }} />
                    )}
                    {canDelete && (onDeleteForEveryone || onDeleteForMe) && !isFailedOrUploading && (
                      <div className="mt-1 border-t border-border/30 pt-1">
                        {isMe && onDeleteForEveryone && (
                          <MenuItem
                            icon={Trash2}
                            label="Delete for everyone"
                            onClick={() => { onDeleteForEveryone(); closeAll(); }}
                            destructive
                          />
                        )}
                        {onDeleteForMe && (
                          <MenuItem
                            icon={Trash2}
                            label="Delete for me"
                            onClick={() => { onDeleteForMe(); closeAll(); }}
                            destructive
                          />
                        )}
                      </div>
                    )}
                    {canDelete && isFailedOrUploading && onDeleteForMe && (
                      <div className="mt-1 border-t border-border/30 pt-1">
                        <MenuItem
                          icon={Trash2}
                          label="Discard voice"
                          onClick={() => { onDeleteForMe(); closeAll(); }}
                          destructive
                        />
                      </div>
                    )}
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
