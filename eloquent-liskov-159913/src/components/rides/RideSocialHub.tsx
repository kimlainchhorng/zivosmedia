/**
 * RideSocialHub — Share rides, split fares, referral links, and social trip feed
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Users, Copy, MessageSquare, Link2, Gift, QrCode, UserPlus, DollarSign, CheckCircle, Smartphone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

interface SplitContact {
  id: string;
  name: string;
  initials: string;
  status: "pending" | "accepted" | "declined";
}

export default function RideSocialHub() {
  const [activeSection, setActiveSection] = useState<"share" | "split" | "refer">("share");
  const [splitContacts, setSplitContacts] = useState<SplitContact[]>([
    { id: "1", name: "Alex M.", initials: "AM", status: "accepted" },
    { id: "2", name: "Jordan K.", initials: "JK", status: "pending" },
  ]);
  const [inviteInput, setInviteInput] = useState("");
  const referralCode = "ZIVO-RIDE50";
  const referralLink = `${getPublicOrigin()}/r/${referralCode}`;

  const sections = [
    { id: "share" as const, label: "Share Trip", icon: Share2 },
    { id: "split" as const, label: "Split Fare", icon: Users },
    { id: "refer" as const, label: "Refer", icon: Gift },
  ];

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button type="button" key={s.id} onClick={() => setActiveSection(s.id)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all", activeSection === s.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="w-3.5 h-3.5" /> {s.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

          {/* Share Trip */}
          {activeSection === "share" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground">Share Your Trip</h3>
                <p className="text-xs text-muted-foreground">Let friends and family track your ride in real-time</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: MessageSquare, label: "Message", action: () => toast.success("Share link sent via message") },
                    { icon: Copy, label: "Copy Link", action: () => { navigator.clipboard.writeText(`${getPublicOrigin()}/track/abc123`); toast.success("Tracking link copied!"); } },
                    { icon: Mail, label: "Email", action: () => toast.success("Tracking link emailed") },
                    { icon: Smartphone, label: "WhatsApp", action: () => toast.success("Opening WhatsApp...") },
                  ].map(opt => (
                    <button type="button" key={opt.label} onClick={opt.action} className="flex items-center gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors text-left active:scale-[0.98]">
                      <opt.icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-bold text-foreground">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live sharing status */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-emerald-500/5 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-foreground">Live Sharing Active</span>
                </div>
                <p className="text-[10px] text-muted-foreground">2 people are tracking your ride</p>
                <div className="flex -space-x-2 mt-2">
                  {["SM", "JD"].map(init => (
                    <Avatar key={init} className="w-7 h-7 border-2 border-card">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">{init}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Split Fare */}
          {activeSection === "split" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Split This Fare</h3>
                  <Badge variant="outline" className="text-[9px] font-bold">$16.29 total</Badge>
                </div>

                {/* Split members */}
                <div className="space-y-2">
                  {/* You */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <Avatar className="w-9 h-9 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">ME</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground">You</p>
                      <p className="text-[10px] text-muted-foreground">Organizer</p>
                    </div>
                    <span className="text-sm font-black text-foreground">${(16.29 / (splitContacts.length + 1)).toFixed(2)}</span>
                  </div>

                  {splitContacts.map(c => (
                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-muted/50 text-xs font-bold">{c.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-foreground">{c.name}</p>
                        <Badge variant={c.status === "accepted" ? "default" : "secondary"} className="text-[8px] font-bold capitalize mt-0.5">
                          {c.status === "accepted" && <CheckCircle className="w-2.5 h-2.5 mr-0.5" />}
                          {c.status}
                        </Badge>
                      </div>
                      <span className="text-sm font-black text-foreground">${(16.29 / (splitContacts.length + 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Add person */}
                <div className="flex gap-2">
                  <Input placeholder="Phone or email" value={inviteInput} onChange={e => setInviteInput(e.target.value)} className="h-10 rounded-xl text-xs" />
                  <Button size="sm" className="h-10 rounded-xl text-xs font-bold gap-1" onClick={() => { if (!inviteInput.trim()) return; setSplitContacts(prev => [...prev, { id: Date.now().toString(), name: inviteInput.split("@")[0], initials: inviteInput.slice(0, 2).toUpperCase(), status: "pending" }]); setInviteInput(""); toast.success("Invite sent!"); }}>
                    <UserPlus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
              </div>

              <p className="text-[10px] text-center text-muted-foreground">Each person pays their share directly via their ZIVO account</p>
            </div>
          )}

          {/* Referral */}
          {activeSection === "refer" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-amber-500/10 border border-primary/20 p-5 text-center">
                <Gift className="w-10 h-10 text-primary mx-auto mb-2" />
                <h3 className="text-lg font-black text-foreground">Give $10, Get $10</h3>
                <p className="text-xs text-muted-foreground mt-1">Share your code and earn ride credits when friends sign up</p>
              </div>

              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Your Referral Code</label>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/30">
                  <span className="flex-1 text-base font-black text-foreground font-mono tracking-wider">{referralCode}</span>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { navigator.clipboard.writeText(referralCode); toast.success("Code copied!"); }}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <Button className="w-full h-11 rounded-xl text-sm font-bold gap-2" onClick={() => { navigator.clipboard.writeText(`${getPublicOrigin()}/signup?ref=${referralCode}`); toast.success("Referral link copied!"); }}>
                  <Link2 className="w-4 h-4" /> Copy Referral Link
                </Button>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  {[
                    { label: "Invited", value: "12" },
                    { label: "Joined", value: "8" },
                    { label: "Earned", value: "$80" },
                  ].map(s => (
                    <div key={s.label} className="text-center rounded-xl bg-muted/20 p-2.5">
                      <p className="text-base font-black text-foreground">{s.value}</p>
                      <p className="text-[9px] text-muted-foreground font-bold">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
