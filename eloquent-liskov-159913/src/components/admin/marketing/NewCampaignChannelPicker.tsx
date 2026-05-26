/**
 * NewCampaignChannelPicker — quick channel-select modal that precedes the marketing wizard.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Mail, MessageSquare, Smartphone, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type Channel = "push" | "email" | "sms" | "inapp" | "multi";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (channel: Channel) => void;
}

const CHANNELS: { id: Channel; icon: any; label: string; desc: string; color: string }[] = [
  { id: "push", icon: Bell, label: "Push", desc: "Mobile + web", color: "bg-blue-500/10 text-blue-600" },
  { id: "email", icon: Mail, label: "Email", desc: "Rich HTML", color: "bg-violet-500/10 text-violet-600" },
  { id: "sms", icon: MessageSquare, label: "SMS", desc: "160-char text", color: "bg-emerald-500/10 text-emerald-600" },
  { id: "inapp", icon: Smartphone, label: "In-app", desc: "Banner / card", color: "bg-amber-500/10 text-amber-600" },
  { id: "multi", icon: Layers, label: "Multi-channel", desc: "All at once", color: "bg-pink-500/10 text-pink-600" },
];

export default function NewCampaignChannelPicker({ open, onClose, onSelect }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose a channel</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <button type="button"
                key={c.id}
                onClick={() => {
                  onSelect(c.id);
                  onClose();
                }}
                className="flex flex-col items-start gap-2 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent/30 transition text-left"
              >
                <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center", c.color)}>
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold">{c.label}</div>
                  <div className="text-[10px] text-muted-foreground">{c.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
