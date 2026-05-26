/**
 * PinnedMessagesPanel — View all pinned messages in a chat
 */
import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import Pin from "lucide-react/dist/esm/icons/pin";

interface PinnedMessage {
  id: string;
  message: string;
  sender_name: string;
  time: string;
  isMe: boolean;
}

interface PinnedMessagesPanelProps {
  open: boolean;
  onClose: () => void;
  messages: PinnedMessage[];
  onJumpToMessage: (id: string) => void;
  onUnpin: (id: string) => void;
}

export default function PinnedMessagesPanel({ open, onClose, messages, onJumpToMessage, onUnpin }: PinnedMessagesPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl border-t border-border/50 max-h-[60vh] overflow-y-auto"
            style={{ paddingBottom: "max(var(--zivo-safe-bottom,0px), 1rem)" }}
          >
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-8 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Pin className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-semibold">Pinned Messages</h3>
                  <span className="text-xs text-muted-foreground">({messages.length})</span>
                </div>
                <button type="button" onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Pin className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
                  <p className="text-sm text-muted-foreground">No pinned messages</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => { onJumpToMessage(msg.id); onClose(); }}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Pin className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-primary">{msg.sender_name}</p>
                        <p className="text-sm text-foreground line-clamp-2">{msg.message || "📷 Media"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{msg.time}</p>
                      </div>
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); onUnpin(msg.id); }}
                        className="text-[10px] text-muted-foreground hover:text-destructive px-2 py-1 rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
                      >
                        Unpin
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
