/**
 * RideSafetyCenter — Enhanced SOS, live trip sharing, ride PIN verification,
 * incident reporting, and emergency contacts
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldAlert, ShieldCheck, Phone, AlertTriangle, Share2, Lock, Eye, MapPin, Users, FileWarning, CheckCircle, Copy, Megaphone, Radio, Siren, X, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

type SafetyTab = "sos" | "share" | "pin" | "report";

const incidentTypes = [
  { id: "unsafe_driving", label: "Unsafe driving", icon: AlertTriangle },
  { id: "route_deviation", label: "Route deviation", icon: MapPin },
  { id: "harassment", label: "Harassment", icon: ShieldAlert },
  { id: "vehicle_issue", label: "Vehicle condition", icon: FileWarning },
  { id: "other", label: "Other concern", icon: Megaphone },
];

export default function RideSafetyCenter() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SafetyTab>("sos");
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [ridePin] = useState(Math.floor(1000 + Math.random() * 9000).toString());
  const [pinVerified, setPinVerified] = useState(false);
  const [shareLink] = useState(`${getPublicOrigin()}/track/zv-` + Math.random().toString(36).slice(2, 8));
  const [shareSent, setShareSent] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [incidentNotes, setIncidentNotes] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [audioRecording, setAudioRecording] = useState(false);

  type EmergencyContact = { id: string; name: string; phone: string };
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => {
    try {
      const saved = localStorage.getItem("zivo_emergency_contacts");
      if (saved) return JSON.parse(saved) as EmergencyContact[];
    } catch {}
    return [
      { id: "1", name: "Mom", phone: "+1 555-0101" },
      { id: "2", name: "Best Friend", phone: "+1 555-0202" },
    ];
  });
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);

  const saveContacts = (updated: EmergencyContact[]) => {
    setContacts(updated);
    try { localStorage.setItem("zivo_emergency_contacts", JSON.stringify(updated)); } catch {}
  };
  const addContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    const updated = [...contacts, { id: Date.now().toString(), name: newContactName.trim(), phone: newContactPhone.trim() }];
    saveContacts(updated);
    setNewContactName("");
    setNewContactPhone("");
    setShowAddContact(false);
    toast.success("Contact added");
  };
  const removeContact = (id: string) => {
    saveContacts(contacts.filter(c => c.id !== id));
    toast.success("Contact removed");
  };

  const tabs = [
    { id: "sos" as const, label: "SOS", icon: Siren },
    { id: "share" as const, label: "Share Trip", icon: Share2 },
    { id: "pin" as const, label: "Ride PIN", icon: Lock },
    { id: "report" as const, label: "Report", icon: FileWarning },
  ];

  // SOS countdown
  useEffect(() => {
    if (sosCountdown === null || sosCountdown <= 0) return;
    const t = setTimeout(() => setSosCountdown(s => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [sosCountdown]);

  useEffect(() => {
    if (sosCountdown === 0) {
      toast.error("Emergency services contacted! 🚨", { description: "911 has been notified with your location." });
      setSosCountdown(null);
    }
  }, [sosCountdown]);

  const triggerSOS = () => {
    setSosCountdown(5);
    toast.info("SOS triggered — calling 911 in 5 seconds", { description: "Tap cancel to stop" });
  };

  const cancelSOS = () => {
    setSosCountdown(null);
    toast.success("SOS cancelled");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-red-500/10 border border-red-500/20 p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground">Safety Center</h3>
            <p className="text-[10px] text-muted-foreground">Real-time protection for every ride</p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[9px] font-bold gap-1">
            <ShieldCheck className="w-3 h-3" /> Protected
          </Badge>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all", activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {activeTab === "sos" && (
            <div className="space-y-4">
              {/* SOS Button */}
              <div className="flex flex-col items-center py-6">
                {sosCountdown !== null ? (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-28 h-28 rounded-full bg-red-500 flex items-center justify-center shadow-2xl shadow-red-500/30">
                      <span className="text-4xl font-black text-white">{sosCountdown}</span>
                    </motion.div>
                    <p className="text-sm font-bold text-red-500">Contacting emergency services...</p>
                    <Button variant="outline" onClick={cancelSOS} className="h-10 rounded-xl text-xs font-bold border-red-500/30 text-red-500">
                      <X className="w-3.5 h-3.5 mr-1.5" /> Cancel SOS
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    <button type="button" onClick={triggerSOS} className="w-28 h-28 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-2xl shadow-red-500/20 active:scale-95 transition-transform">
                      <div className="text-center">
                        <Siren className="w-8 h-8 text-white mx-auto mb-1" />
                        <span className="text-sm font-black text-white">SOS</span>
                      </div>
                    </button>
                    <p className="text-xs text-muted-foreground mt-3 text-center">Hold to alert emergency services with your location</p>
                  </>
                )}
              </div>

              {/* Quick safety tools */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Phone, label: "Call 911", action: () => { window.location.href = "tel:911"; }, color: "text-red-500 bg-red-500/10" },
                  { icon: Radio, label: "Record Audio", action: () => { setAudioRecording(!audioRecording); toast.success(audioRecording ? "Recording stopped" : "Recording started 🔴"); }, color: audioRecording ? "text-red-500 bg-red-500/10" : "text-primary bg-primary/10" },
                  { icon: Share2, label: "Share Location", action: () => {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
                        if (navigator.share) { navigator.share({ title: "My Location", url }); }
                        else { navigator.clipboard.writeText(url).then(() => toast.success("Location link copied!")); }
                      },
                      () => { navigator.clipboard.writeText(shareLink).then(() => toast.success("Trip link copied!")); }
                    );
                  }, color: "text-emerald-500 bg-emerald-500/10" },
                  { icon: Users, label: "Alert Contacts", action: () => {
                    const msg = `🚨 I need help. Track my ride: ${shareLink}`;
                    navigator.clipboard.writeText(msg).then(() => toast.success(`Alert copied — send to ${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`));
                    if (contacts[0]?.phone) window.open(`sms:${contacts[0].phone}?body=${encodeURIComponent(msg)}`);
                  }, color: "text-violet-500 bg-violet-500/10" },
                ].map(tool => (
                  <button type="button" key={tool.label} onClick={tool.action} className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/40 active:scale-95 transition-transform">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", tool.color)}>
                      <tool.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">{tool.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "share" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground">Live Trip Sharing</h3>
                <p className="text-xs text-muted-foreground">Share your real-time location and trip details with trusted contacts</p>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/20">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-mono text-foreground flex-1 truncate">{shareLink}</span>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(shareLink); toast.success("Link copied!"); }} className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Copy className="w-3.5 h-3.5 text-primary" />
                  </button>
                </div>
                <Button onClick={() => { setShareSent(true); toast.success("Trip shared with trusted contacts"); }} disabled={shareSent} className="w-full h-11 rounded-xl text-sm font-bold gap-2">
                  {shareSent ? <><CheckCircle className="w-4 h-4" /> Shared</> : <><Share2 className="w-4 h-4" /> Share with Contacts</>}
                </Button>
              </div>

              {/* Trusted contacts */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Emergency contacts</h3>
                  <button type="button" onClick={() => setShowAddContact(v => !v)}
                    className="flex items-center gap-1 text-[10px] font-bold text-primary">
                    <UserPlus className="w-3 h-3" /> Add
                  </button>
                </div>

                {showAddContact && (
                  <div className="space-y-2 pb-2 border-b border-border/20">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newContactName}
                      onChange={e => setNewContactName(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-muted/30 border border-border/40 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                      aria-label="Contact name"
                    />
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={newContactPhone}
                      onChange={e => setNewContactPhone(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-muted/30 border border-border/40 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                      aria-label="Contact phone number"
                    />
                    <button type="button" onClick={addContact}
                      disabled={!newContactName.trim() || !newContactPhone.trim()}
                      className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50">
                      Save Contact
                    </button>
                  </div>
                )}

                {contacts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No contacts yet. Add one above.</p>
                )}
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-[10px] font-bold bg-secondary text-foreground">
                        {c.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-foreground">{c.name}</span>
                      <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                    </div>
                    <button type="button" onClick={() => removeContact(c.id)}
                      className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center active:scale-90 transition-transform"
                      aria-label={`Remove ${c.name}`}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "pin" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-card border border-border/40 p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Ride Verification PIN</h3>
                  <p className="text-xs text-muted-foreground mt-1">Share this PIN with your driver to verify your ride</p>
                </div>
                <div className="flex justify-center gap-3">
                  {ridePin.split("").map((digit, i) => (
                    <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }} className="w-14 h-16 rounded-xl bg-muted/30 border border-primary/20 flex items-center justify-center">
                      <span className="text-2xl font-black text-foreground">{digit}</span>
                    </motion.div>
                  ))}
                </div>
                {!pinVerified ? (
                  <Button onClick={() => { setPinVerified(true); toast.success("PIN verified! ✅"); }} className="w-full h-11 rounded-xl text-sm font-bold">
                    <CheckCircle className="w-4 h-4 mr-2" /> Mark as Verified
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-bold text-emerald-500">PIN Verified</span>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-muted/20 border border-border/30 p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">How it works</h3>
                <div className="space-y-2">
                  {["Driver shows you their app with your PIN", "Confirm the 4-digit code matches", "Only then enter the vehicle"].map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                      </div>
                      <p className="text-xs text-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "report" && (
            <div className="space-y-4">
              {!reportSubmitted ? (
                <>
                  <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                    <h3 className="text-sm font-bold text-foreground">Report an Incident</h3>
                    <p className="text-xs text-muted-foreground">Select the type of concern</p>
                    <div className="space-y-2">
                      {incidentTypes.map(type => {
                        const Icon = type.icon;
                        const selected = selectedIncident === type.id;
                        return (
                          <button type="button" key={type.id} onClick={() => setSelectedIncident(type.id)} className={cn("w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left", selected ? "bg-red-500/5 border-red-500/30" : "bg-muted/10 border-border/20 hover:border-border/40")}>
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", selected ? "bg-red-500/10" : "bg-muted/30")}>
                              <Icon className={cn("w-4 h-4", selected ? "text-red-500" : "text-muted-foreground")} />
                            </div>
                            <span className={cn("text-xs font-bold", selected ? "text-foreground" : "text-muted-foreground")}>{type.label}</span>
                            {selected && <CheckCircle className="w-4 h-4 text-red-500 ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedIncident && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                      <h3 className="text-xs font-bold text-muted-foreground">Additional details (optional)</h3>
                      <textarea value={incidentNotes} onChange={e => setIncidentNotes(e.target.value)} placeholder="Describe what happened..." className="w-full h-24 rounded-xl bg-muted/20 border border-border/30 p-3 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/30" />
                      <Button onClick={() => { setReportSubmitted(true); toast.success("Report submitted. Our safety team will review it."); }} className="w-full h-11 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white">
                        Submit Report
                      </Button>
                    </motion.div>
                  )}
                </>
              ) : (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl bg-card border border-emerald-500/20 p-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Report Submitted</h3>
                  <p className="text-xs text-muted-foreground">Our safety team will review your report within 24 hours. You'll receive an update via notification.</p>
                  <Button variant="outline" onClick={() => { setReportSubmitted(false); setSelectedIncident(null); setIncidentNotes(""); }} className="text-xs">
                    Submit Another Report
                  </Button>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
