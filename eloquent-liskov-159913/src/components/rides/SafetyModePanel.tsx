/**
 * SafetyModePanel - Women's safety mode with verified drivers, trusted contacts, route deviation
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldCheck, ShieldAlert, UserCheck, Phone, MapPin, AlertTriangle, Bell, Eye, Share2, Lock, Check, ChevronRight, X, Users, Navigation, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  initials: string;
  autoNotify: boolean;
}

const safetyFeatures = [
  { id: "verified", icon: UserCheck, label: "Verified Drivers Only", description: "Only verified, top-rated drivers with background checks", default: true },
  { id: "share", icon: Share2, label: "Auto-Share Trip", description: "Automatically share trip status with trusted contacts", default: true },
  { id: "deviation", icon: Navigation, label: "Route Deviation Alert", description: "Alert when driver deviates from expected route", default: true },
  { id: "audio", icon: Eye, label: "Ride Recording", description: "Record audio during ride for safety (encrypted)", default: false },
  { id: "pin", icon: Lock, label: "Ride PIN Verification", description: "Driver must verify your PIN before starting", default: true },
  { id: "panic", icon: AlertTriangle, label: "Quick Emergency Access", description: "One-tap access to 911 and emergency contacts", default: true },
];

export default function SafetyModePanel({ onClose }: { onClose?: () => void }) {
  const [enabled, setEnabled] = useState(true);
  const [features, setFeatures] = useState<Record<string, boolean>>(
    Object.fromEntries(safetyFeatures.map(f => [f.id, f.default]))
  );
  const [contacts, setContacts] = useState<TrustedContact[]>([
    { id: "1", name: "Mom", phone: "+1 555-0101", initials: "M", autoNotify: true },
    { id: "2", name: "Best Friend", phone: "+1 555-0202", initials: "BF", autoNotify: true },
  ]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [ridePin] = useState(Math.floor(1000 + Math.random() * 9000).toString());

  const toggleFeature = (id: string) => {
    setFeatures(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addContact = () => {
    if (!newName.trim() || !newPhone.trim()) return;
    setContacts([...contacts, {
      id: Date.now().toString(),
      name: newName,
      phone: newPhone,
      initials: newName.slice(0, 2).toUpperCase(),
      autoNotify: true,
    }]);
    setNewName("");
    setNewPhone("");
    setShowAddContact(false);
    toast.success("Trusted contact added");
  };

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 to-transparent border-b border-border/30 bg-secondary">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Shield className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Safety Mode</h3>
              <p className="text-[10px] text-muted-foreground">Enhanced ride protection</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            {onClose && (
              <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {enabled && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px] font-bold text-emerald-500">Safety mode active</span>
            <Badge className="text-[8px] ml-auto bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
              PIN: {ridePin}
            </Badge>
          </motion.div>
        )}
      </div>

      {enabled && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Safety features */}
          <div className="px-4 py-3">
            <span className="text-xs font-bold text-foreground mb-2 block">Safety Features</span>
            <div className="space-y-2">
              {safetyFeatures.map((feat) => {
                const Icon = feat.icon;
                const active = features[feat.id];
                return (
                  <button type="button"
                    key={feat.id}
                    onClick={() => toggleFeature(feat.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                      active
                        ? "bg-violet-500/5 border-violet-500/20"
                        : "bg-muted/10 border-border/20"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      active ? "bg-violet-500/10" : "bg-muted/30"
                    )}>
                      <Icon className={cn("w-4 h-4", active ? "text-violet-500" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-foreground">{feat.label}</span>
                      <p className="text-[10px] text-muted-foreground">{feat.description}</p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                      active ? "bg-violet-500" : "bg-muted/40"
                    )}>
                      {active && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trusted contacts */}
          <div className="px-4 py-3 border-t border-border/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-foreground" /> Trusted Contacts
              </span>
              <Badge variant="outline" className="text-[9px]">{contacts.length}</Badge>
            </div>

            <div className="space-y-2">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 border border-border/20">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-[10px] font-bold bg-secondary text-foreground">
                      {contact.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-foreground">{contact.name}</span>
                    <p className="text-[10px] text-muted-foreground">{contact.phone}</p>
                  </div>
                  <Badge className={cn(
                    "text-[8px] font-bold",
                    contact.autoNotify
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-muted/30 text-muted-foreground"
                  )}>
                    {contact.autoNotify ? "Auto-notify" : "Manual"}
                  </Badge>
                </div>
              ))}

              {!showAddContact ? (
                <button type="button"
                  onClick={() => setShowAddContact(true)}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-border/50 text-xs text-muted-foreground hover:border-border hover:bg-secondary transition-all"
                >
                  <Users className="w-4 h-4" /> Add trusted contact
                </button>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9 text-xs" />
                  <Input placeholder="Phone number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="h-9 text-xs" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowAddContact(false)}>Cancel</Button>
                    <Button size="sm" className="flex-1 text-xs" onClick={addContact} disabled={!newName.trim()}>Add</Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Emergency */}
          <div className="px-4 pb-4">
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/5 font-bold"
              onClick={() => { window.location.href = "tel:911"; }}
            >
              <AlertTriangle className="w-4 h-4 mr-2" /> Emergency SOS — Call 911
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
