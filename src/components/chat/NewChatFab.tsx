import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Edit3 from "lucide-react/dist/esm/icons/edit-3";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import Users from "lucide-react/dist/esm/icons/users";
import Radio from "lucide-react/dist/esm/icons/radio";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import Radar from "lucide-react/dist/esm/icons/radar";
import X from "lucide-react/dist/esm/icons/x";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  onNewChat: () => void;
  onNewGroup: () => void;
  onNewContact: () => void;
  onBroadcast?: () => void;
  onNearby?: () => void;
}

export default function NewChatFab({ onNewChat, onNewGroup, onNewContact, onBroadcast, onNearby }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const items = [
    { key: "chat", label: "New Chat", icon: MessageCircle, onClick: onNewChat },
    { key: "group", label: "New Group", icon: Users, onClick: onNewGroup },
    ...(onBroadcast ? [{ key: "broadcast", label: "Broadcast List", icon: Radio, onClick: onBroadcast }] : []),
    { key: "channel", label: "New Channel", icon: Radio, onClick: () => navigate("/channels/new") },
    { key: "contact", label: "New Contact", icon: UserPlus, onClick: onNewContact },
    ...(onNearby ? [{ key: "nearby", label: "People Nearby", icon: Radar, onClick: onNearby }] : []),
  ];

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-black/35 backdrop-blur-md"
          />
        )}
      </AnimatePresence>

      <div
        className="fixed right-5 z-40 flex flex-col items-end gap-2.5"
        style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 7rem)" }}
      >
        <AnimatePresence>
          {open && items.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.button
                type="button"
                key={it.key}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => { setOpen(false); it.onClick(); }}
                className="zivo-chat-card flex items-center gap-3 rounded-full py-2.5 pl-4 pr-3 transition-transform active:scale-95"
                aria-label={it.label}
                title={it.label}
              >
                <span className="text-sm font-black text-foreground">{it.label}</span>
                <span className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center rounded-full">
                  <Icon className="w-4 h-4 text-primary" />
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        <motion.button
          type="button"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-14 h-14 rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-all",
            open
              ? "zivo-chat-icon-button text-foreground"
              : "zivo-chat-chip-active text-white"
          )}
          aria-label={open ? "Close" : "New"}
          title={open ? "Close" : "New"}
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ opacity: 0 }}>
                <X className="w-5 h-5" />
              </motion.span>
            ) : (
              <motion.span key="edit" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ opacity: 0 }}>
                <Edit3 className="w-5 h-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}
