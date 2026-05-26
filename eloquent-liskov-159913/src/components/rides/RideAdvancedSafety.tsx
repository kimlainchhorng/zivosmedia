/**
 * RideAdvancedSafety — Real-time sharing, panic button, trusted contacts, ride verification
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Share2, AlertTriangle, Users, Key, MapPin, Phone, Eye, Lock, CheckCircle, Clock, Bell, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TrustedContact { id: number; name: string; phone: string; active: boolean }

const DEFAULT_CONTACTS: TrustedContact[] = [
  { id: 1, name: "Mom", phone: "•••-••-4521", active: true },
  { id: 2, name: "Partner", phone: "•••-••-8834", active: true },
  { id: 3, name: "Best Friend", phone: "•••-••-2190", active: false },
];

const recentAlerts = [
  { id: 1, type: "Route deviation", time: "2 min ago", status: "resolved" },
  { id: 2, type: "Unusual stop", time: "Yesterday", status: "resolved" },
];

type Tab = "share" | "panic" | "contacts" | "verify";

export default function RideAdvancedSafety() {
  const [activeTab, setActiveTab] = useState<Tab>("share");
  const [liveSharing, setLiveSharing] = useState(false);
  const [panicCountdown, setPanicCountdown] = useState<number | null>(null);
  const [verificationCode] = useState("4829");
  const [contacts, setContacts] = useState<TrustedContact[]>(() => {
    try { return JSON.parse(localStorage.getItem("zivo_trusted_contacts") || "null") ?? DEFAULT_CONTACTS; } catch { return DEFAULT_CONTACTS; }
  });
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });

  const saveContacts = (updated: TrustedContact[]) => {
    setContacts(updated);
    localStorage.setItem("zivo_trusted_contacts", JSON.stringify(updated));
  };

  const toggleContact = (id: number) => {
    const updated = contacts.map((c) => c.id === id ? { ...c, active: !c.active } : c);
    saveContacts(updated);
  };

  const addContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) return;
    const c: TrustedContact = { id: Date.now(), name: newContact.name.trim(), phone: newContact.phone.trim(), active: true };
    saveContacts([...contacts, c]);
    toast.success(`${c.name} added as trusted contact`);
    setNewContact({ name: "", phone: "" });
    setShowAddContact(false);
  };

  const removeContact = (id: number) => {
    saveContacts(contacts.filter((c) => c.id !== id));
    toast.success("Contact removed");
  };

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: "share", label: "Live Share", icon: Share2 },
    { id: "panic", label: "SOS", icon: AlertTriangle },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "verify", label: "Verify", icon: Key },
  ];

  const startPanic = () => {
    setPanicCountdown(5);
    const interval = setInterval(() => {
      setPanicCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          toast.error("Emergency services notified. Stay safe.");
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelPanic = () => {
    setPanicCountdown(null);
    toast.info("SOS cancelled");
  };

  return (
    <div className="space-y-4">
      {/* Safety header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-500/15 via-primary/10 to-blue-500/15 rounded-2xl p-4 border border-primary/20"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-black text-foreground">Safety Center</p>
            <p className="text-xs text-muted-foreground">Your safety is our top priority</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

          {activeTab === "share" && (
            <div className="space-y-3">
              <div className="bg-card rounded-xl p-4 border border-border/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <p className="text-sm font-bold text-foreground">Live Location Sharing</p>
                  </div>
                  <button type="button"
                    onClick={() => { setLiveSharing(!liveSharing); toast.success(liveSharing ? "Sharing stopped" : "Sharing started"); }}
                    className={cn(
                      "w-11 h-6 rounded-full flex items-center transition-all px-0.5",
                      liveSharing ? "bg-green-500 justify-end" : "bg-muted justify-start"
                    )}
                  >
                    <div className="w-5 h-5 rounded-full bg-background shadow-sm" />
                  </button>
                </div>
                {liveSharing && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="space-y-2">
                    <p className="text-xs text-muted-foreground">Your trusted contacts can see your real-time location during this ride</p>
                    <div className="flex gap-2">
                      {["SMS", "WhatsApp", "Email"].map((method) => (
                        <button type="button"
                          key={method}
                          onClick={() => toast.success(`Shared via ${method}`)}
                          className="flex-1 py-2 bg-primary/10 rounded-lg text-xs font-bold text-primary"
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="bg-card rounded-xl p-4 border border-border/30 space-y-2">
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" /> Auto-Share Settings
                </p>
                {[
                  { label: "Share on night rides (9PM–6AM)", active: true },
                  { label: "Share on rides over 30 min", active: false },
                  { label: "Share when in new areas", active: true },
                ].map((setting) => (
                  <div key={setting.label} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-muted-foreground">{setting.label}</span>
                    <div className={cn("w-8 h-5 rounded-full flex items-center px-0.5", setting.active ? "bg-primary justify-end" : "bg-muted justify-start")}>
                      <div className="w-4 h-4 rounded-full bg-background shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "panic" && (
            <div className="space-y-4">
              <div className="bg-card rounded-xl p-6 border border-border/30 text-center space-y-4">
                {panicCountdown !== null ? (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="space-y-4">
                    <div className="w-24 h-24 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                      <span className="text-4xl font-black text-destructive">{panicCountdown}</span>
                    </div>
                    <p className="text-sm font-bold text-destructive">Contacting emergency services...</p>
                    <button type="button" onClick={cancelPanic} className="w-full py-3 bg-muted rounded-xl text-sm font-bold text-foreground">
                      Cancel
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <button type="button"
                      onClick={startPanic}
                      className="w-28 h-28 mx-auto rounded-full bg-destructive flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                    >
                      <AlertTriangle className="w-12 h-12 text-destructive-foreground" />
                    </button>
                    <p className="text-sm font-bold text-foreground">Emergency SOS</p>
                    <p className="text-xs text-muted-foreground">Press and hold for 5-second countdown. Notifies emergency contacts and shares your location.</p>
                  </>
                )}
              </div>

              <div className="bg-card rounded-xl p-4 border border-border/30 space-y-2">
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" /> Recent Safety Alerts
                </p>
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs text-foreground">{alert.type}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{alert.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "contacts" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Trusted Contacts</p>
                <button type="button" onClick={() => setShowAddContact((v) => !v)} className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                </button>
              </div>

              <AnimatePresence>
                {showAddContact && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="bg-card rounded-xl p-3 border border-primary/20 space-y-2">
                    <input
                      type="text"
                      value={newContact.name}
                      onChange={(e) => setNewContact((n) => ({ ...n, name: e.target.value }))}
                      placeholder="Name"
                      className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={newContact.phone}
                        onChange={(e) => setNewContact((n) => ({ ...n, phone: e.target.value }))}
                        placeholder="Phone number"
                        className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                        onKeyDown={(e) => e.key === "Enter" && addContact()}
                      />
                      <button type="button" onClick={addContact} disabled={!newContact.name.trim() || !newContact.phone.trim()}
                        className="px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
                        Add
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {contacts.map((contact) => (
                <div key={contact.id} className="bg-card rounded-xl p-3 border border-border/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {contact.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.phone}</p>
                  </div>
                  <button type="button"
                    onClick={() => toggleContact(contact.id)}
                    className={cn("w-10 h-6 rounded-full flex items-center px-1 transition-colors shrink-0",
                      contact.active ? "bg-green-500 justify-end" : "bg-muted justify-start")}
                  >
                    <div className="w-4 h-4 rounded-full bg-background shadow-sm" />
                  </button>
                  <button type="button" onClick={() => removeContact(contact.id)} className="p-1 rounded-lg hover:bg-muted/60 shrink-0">
                    <X className="w-3.5 h-3.5 text-muted-foreground/50" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "verify" && (
            <div className="space-y-4">
              <div className="bg-card rounded-xl p-6 border border-border/30 text-center space-y-3">
                <Lock className="w-10 h-10 text-primary mx-auto" />
                <p className="text-sm font-bold text-foreground">Ride Verification PIN</p>
                <p className="text-xs text-muted-foreground">Share this PIN with your driver to confirm your identity</p>
                <div className="flex justify-center gap-3 pt-2">
                  {verificationCode.split("").map((digit, i) => (
                    <div key={i} className="w-12 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                      <span className="text-2xl font-black text-primary">{digit}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> Refreshes each ride
                </p>
              </div>

              <div className="bg-card rounded-xl p-4 border border-border/30 space-y-2">
                <p className="text-sm font-bold text-foreground">Verification Settings</p>
                {[
                  { label: "Require PIN for all rides", active: true },
                  { label: "Photo verification for night rides", active: true },
                  { label: "License plate confirmation", active: false },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <div className={cn("w-8 h-5 rounded-full flex items-center px-0.5", s.active ? "bg-primary justify-end" : "bg-muted justify-start")}>
                      <div className="w-4 h-4 rounded-full bg-background shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
