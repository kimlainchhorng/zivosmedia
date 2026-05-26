/**
 * RideFamilyAccounts — Family profiles, child settings, parental controls, shared payment
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Baby, Shield, CreditCard, MapPin, Clock, Bell, Plus, ChevronRight, Eye, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const familyMembers = [
  { id: 1, name: "You", role: "Account Owner", avatar: "👤", rides: 24, isOwner: true },
  { id: 2, name: "Alex (Teen)", role: "Teen Rider", avatar: "🧑", rides: 8, age: 16 },
  { id: 3, name: "Sam (Child)", role: "Child", avatar: "👦", rides: 3, age: 10, requiresAdult: true },
  { id: 4, name: "Grandma", role: "Family Member", avatar: "👵", rides: 5 },
];

const parentalControls = [
  { id: "geo-fence", label: "Geo-Fence Alerts", desc: "Get notified if ride leaves approved area", active: true },
  { id: "night-block", label: "Block Night Rides", desc: "No rides between 10 PM – 6 AM", active: true },
  { id: "driver-approval", label: "Approve Drivers", desc: "Review driver before teen's ride starts", active: false },
  { id: "spending-limit", label: "Spending Limit", desc: "$50/week per teen rider", active: true },
  { id: "ride-alerts", label: "Real-Time Alerts", desc: "Live notifications for all family rides", active: true },
];

const paymentMethods = [
  { id: 1, type: "Visa", last4: "4242", label: "Family Card", isDefault: true },
  { id: 2, type: "Mastercard", last4: "8910", label: "Backup Card", isDefault: false },
];

type Tab = "members" | "controls" | "payment";

export default function RideFamilyAccounts() {
  const [activeTab, setActiveTab] = useState<Tab>("members");
  const [controls, setControls] = useState(parentalControls);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "members", label: "Family", icon: Users },
    { id: "controls", label: "Controls", icon: Shield },
    { id: "payment", label: "Payment", icon: CreditCard },
  ];

  const toggleControl = (id: string) => {
    setControls((prev) => prev.map((c) => c.id === id ? { ...c, active: !c.active } : c));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 border border-primary/20 bg-secondary"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl">👨‍👩‍👧‍👦</div>
          <div>
            <p className="text-lg font-black text-foreground">Family Account</p>
            <p className="text-xs text-muted-foreground">{familyMembers.length} members • Shared billing</p>
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
                activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "members" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {familyMembers.map((member) => (
            <div key={member.id} className={cn("bg-card rounded-xl p-3 border flex items-center gap-3", member.isOwner ? "border-primary/30" : "border-border/30")}>
              <span className="text-2xl">{member.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{member.name}</p>
                  {member.requiresAdult && (
                    <span className="text-[9px] bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">Needs Adult</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{member.role} • {member.rides} rides</p>
              </div>
              {!member.isOwner && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
          <button type="button"
            onClick={() => setShowInvite(v => !v)}
            className="w-full py-2.5 bg-primary/10 rounded-xl text-sm font-bold text-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> {showInvite ? "Cancel" : "Add Family Member"}
          </button>
          <AnimatePresence>
            {showInvite && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Name"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
                <div className="flex gap-2">
                  <input value={invitePhone} onChange={e => setInvitePhone(e.target.value)} placeholder="Phone number" type="tel"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
                  <button type="button" disabled={!inviteName.trim() || !invitePhone.trim()}
                    onClick={() => { toast.success(`Invite sent to ${inviteName}!`); setInviteName(""); setInvitePhone(""); setShowInvite(false); }}
                    className="px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
                    Send
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {activeTab === "controls" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Baby className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-foreground">Parental Controls</p>
          </div>
          {controls.map((control) => (
            <div key={control.id} className="bg-card rounded-xl p-3 border border-border/30 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{control.label}</p>
                <p className="text-xs text-muted-foreground">{control.desc}</p>
              </div>
              <button type="button"
                onClick={() => toggleControl(control.id)}
                className={cn("w-10 h-6 rounded-full flex items-center transition-all px-0.5", control.active ? "bg-primary justify-end" : "bg-muted justify-start")}
              >
                <div className="w-5 h-5 rounded-full bg-background shadow-sm" />
              </button>
            </div>
          ))}
        </motion.div>
      )}

      {activeTab === "payment" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-sm font-bold text-foreground">Shared Payment Methods</p>
          {paymentMethods.map((pm) => (
            <div key={pm.id} className={cn("bg-card rounded-xl p-3 border flex items-center gap-3", pm.isDefault ? "border-primary/30" : "border-border/30")}>
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{pm.type} ••{pm.last4}</p>
                  {pm.isDefault && <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold">Default</span>}
                </div>
                <p className="text-xs text-muted-foreground">{pm.label}</p>
              </div>
            </div>
          ))}

          <div className="bg-card rounded-xl p-4 border border-border/30 space-y-2">
            <p className="text-sm font-bold text-foreground">Spending This Month</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "You", amount: "$342" },
                { name: "Alex", amount: "$48" },
                { name: "Sam", amount: "$22" },
                { name: "Grandma", amount: "$65" },
              ].map((s) => (
                <div key={s.name} className="bg-muted/20 rounded-lg p-2 text-center">
                  <p className="text-lg font-black text-foreground">{s.amount}</p>
                  <p className="text-[10px] text-muted-foreground">{s.name}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
