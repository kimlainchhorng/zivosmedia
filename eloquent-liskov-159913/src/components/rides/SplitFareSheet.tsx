/**
 * SplitFareSheet - Fare splitting UI with contact picker & per-person breakdown
 * Inspired by Uber/Lyft's split fare flow
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, X, Check, Send, DollarSign, UserPlus, Copy, Share2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SplitContact {
  id: string;
  name: string;
  initials: string;
  status: "pending" | "accepted" | "declined";
  share: number;
}

interface SplitFareSheetProps {
  totalFare: number;
  onClose?: () => void;
  onSendRequests?: (contacts: SplitContact[]) => void;
}

const suggestedContacts = [
  { id: "1", name: "Alex K.", initials: "AK" },
  { id: "2", name: "Sara M.", initials: "SM" },
  { id: "3", name: "Jordan P.", initials: "JP" },
  { id: "4", name: "Chris L.", initials: "CL" },
];

export default function SplitFareSheet({ totalFare = 24.50, onClose, onSendRequests }: SplitFareSheetProps) {
  const [contacts, setContacts] = useState<SplitContact[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [customName, setCustomName] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");

  const totalPeople = contacts.length + 1; // +1 for the user
  const perPersonEqual = totalFare / totalPeople;

  const addContact = (name: string, initials: string) => {
    if (contacts.length >= 4) {
      toast.error("Maximum 5 people per split");
      return;
    }
    const newContact: SplitContact = {
      id: Date.now().toString(),
      name,
      initials,
      status: "pending",
      share: 0,
    };
    setContacts([...contacts, newContact]);
    setCustomName("");
    setShowAdd(false);
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const handleSend = () => {
    onSendRequests?.(contacts);
    toast.success(`Split request sent to ${contacts.length} ${contacts.length === 1 ? "person" : "people"}`);
  };

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Split Fare</h3>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Total fare */}
      <div className="px-4 py-4 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Fare</span>
        <div className="text-3xl font-black text-foreground mt-1">${totalFare.toFixed(2)}</div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <button type="button"
            onClick={() => setSplitType("equal")}
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
              splitType === "equal" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
            )}
          >
            Split equally
          </button>
          <button type="button"
            onClick={() => setSplitType("custom")}
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
              splitType === "custom" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
            )}
          >
            Custom amounts
          </button>
        </div>
      </div>

      {/* You + split contacts */}
      <div className="px-4 py-3 space-y-2">
        {/* Your share */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <Avatar className="w-9 h-9 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">You</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <span className="text-xs font-bold text-foreground">You</span>
            <p className="text-[10px] text-muted-foreground">Your share</p>
          </div>
          <span className="text-sm font-black text-primary">${perPersonEqual.toFixed(2)}</span>
        </div>

        {/* Added contacts */}
        <AnimatePresence>
          {contacts.map((contact) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
            >
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                  {contact.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <span className="text-xs font-bold text-foreground">{contact.name}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant="outline" className={cn(
                    "text-[8px] h-4 font-bold",
                    contact.status === "accepted" ? "text-emerald-500 border-emerald-500/20" :
                    contact.status === "declined" ? "text-red-500 border-red-500/20" :
                    "text-amber-500 border-amber-500/20"
                  )}>
                    {contact.status}
                  </Badge>
                </div>
              </div>
              <span className="text-sm font-bold text-foreground">${perPersonEqual.toFixed(2)}</span>
              <button type="button" onClick={() => removeContact(contact.id)} className="p-1 rounded-full hover:bg-muted">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add person button */}
        {contacts.length < 4 && !showAdd && (
          <button type="button"
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
          >
            <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Add a person</span>
          </button>
        )}

        {/* Add contact panel */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {/* Suggested contacts */}
              <div className="mb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">Frequent riders</span>
                <div className="flex gap-2 mt-1.5 overflow-x-auto pb-1">
                  {suggestedContacts
                    .filter(sc => !contacts.find(c => c.name === sc.name))
                    .map((sc) => (
                      <button type="button"
                        key={sc.id}
                        onClick={() => addContact(sc.name, sc.initials)}
                        className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all shrink-0"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-[10px] font-bold bg-muted">{sc.initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] font-medium text-foreground whitespace-nowrap">{sc.name}</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Custom name input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Name or phone number"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="h-9 text-xs"
                />
                <Button
                  size="sm"
                  className="h-9 shrink-0"
                  disabled={!customName.trim()}
                  onClick={() => addContact(customName, customName.slice(0, 2).toUpperCase())}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Send requests CTA */}
      {contacts.length > 0 && (
        <div className="px-4 pb-4">
          <Button
            onClick={handleSend}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold"
          >
            <Send className="w-4 h-4 mr-2" />
            Send split request{contacts.length > 1 ? "s" : ""}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
