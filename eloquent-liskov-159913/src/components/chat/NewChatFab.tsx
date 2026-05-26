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
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
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
                className="flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full bg-card border border-border/40 shadow-lg active:scale-95 transition-transform"
                aria-label={it.label}
                title={it.label}
              >
                <span className="text-sm font-semibold text-foreground">{it.label}</span>
                <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
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
              ? "bg-muted text-foreground"
              : "bg-primary text-primary-foreground shadow-primary/30"
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
