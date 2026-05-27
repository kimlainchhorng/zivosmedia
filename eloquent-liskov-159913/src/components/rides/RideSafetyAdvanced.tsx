/**
 * RideSafetyAdvanced — Dashcam, incident reporting, insurance claims, emergency contacts
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, AlertTriangle, Shield, Users, Phone, Plus, FileText, Upload, CheckCircle, Eye, Video, Clock, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  autoNotify: boolean;
}

interface Incident {
  id: string;
  type: string;
  date: string;
  status: "open" | "investigating" | "resolved";
  rideId: string;
  description: string;
}

export default function RideSafetyAdvanced() {
  const [section, setSection] = useState<"dashcam" | "incidents" | "insurance" | "contacts">("dashcam");
  const [dashcamActive, setDashcamActive] = useState(false);
  const [autoRecord, setAutoRecord] = useState(true);

  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: "1", name: "Sarah M.", phone: "+1 (555) 123-4567", relation: "Spouse", autoNotify: true },
    { id: "2", name: "Mike D.", phone: "+1 (555) 987-6543", relation: "Brother", autoNotify: false },
  ]);

  const [incidents] = useState<Incident[]>([
    { id: "1", type: "Minor Collision", date: "Feb 28, 2026", status: "investigating", rideId: "RIDE-4821", description: "Fender bender at intersection" },
    { id: "2", type: "Unsafe Driving", date: "Feb 15, 2026", status: "resolved", rideId: "RIDE-4650", description: "Driver was using phone while driving" },
  ]);

  const [contactInput, setContactInput] = useState("");
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentType, setIncidentType] = useState("");
  const [incidentDesc, setIncidentDesc] = useState("");

  const submitIncident = () => {
    if (!incidentType || !incidentDesc.trim()) return;
    toast.success("Incident report submitted. We'll review within 24 hours.");
    setIncidentType("");
    setIncidentDesc("");
    setShowIncidentForm(false);
  };

  const sections = [
    { id: "dashcam" as const, label: "Dashcam", icon: Camera },
    { id: "incidents" as const, label: "Incidents", icon: AlertTriangle },
    { id: "insurance" as const, label: "Insurance", icon: Shield },
    { id: "contacts" as const, label: "Contacts", icon: Users },
  ];

  const statusColor = (s: string) => s === "open" ? "destructive" : s === "investigating" ? "secondary" : "default";

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button type="button" key={s.id} onClick={() => setSection(s.id)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all", section === s.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="w-3.5 h-3.5" /> {s.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

          {/* Dashcam */}
          {section === "dashcam" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
                {/* Dashcam viewfinder */}
                <div className="relative bg-foreground/5 aspect-video flex items-center justify-center">
                  {dashcamActive ? (
                    <div className="text-center">
                      <div className="w-3 h-3 rounded-full bg-destructive animate-pulse mx-auto mb-2" />
                      <Video className="w-12 h-12 text-primary mx-auto mb-2 animate-pulse" />
                      <p className="text-xs font-bold text-foreground">Recording...</p>
                      <p className="text-[10px] text-muted-foreground">02:34 elapsed</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Dashcam inactive</p>
                    </div>
                  )}
                  <Badge className="absolute top-3 right-3 text-[8px] font-bold">{dashcamActive ? "LIVE" : "OFF"}</Badge>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">In-Ride Dashcam</p>
                      <p className="text-[10px] text-muted-foreground">Records front-facing video for safety</p>
                    </div>
                    <Button size="sm" variant={dashcamActive ? "destructive" : "default"} className="h-8 text-xs font-bold rounded-lg" onClick={() => { setDashcamActive(!dashcamActive); toast.success(dashcamActive ? "Dashcam stopped" : "Dashcam recording started"); }}>
                      {dashcamActive ? "Stop" : "Start"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold text-foreground">Auto-Record All Rides</span>
                    </div>
                    <button type="button" onClick={() => setAutoRecord(!autoRecord)} className={cn("w-10 h-5 rounded-full transition-colors flex items-center px-0.5", autoRecord ? "bg-primary" : "bg-muted")}>
                      <div className={cn("w-4 h-4 rounded-full bg-card shadow transition-transform", autoRecord && "translate-x-5")} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[{ label: "Rides Recorded", val: "47" }, { label: "Hours Saved", val: "62h" }, { label: "Storage Used", val: "2.1 GB" }].map(s => (
                      <div key={s.label} className="rounded-xl bg-muted/20 p-2">
                        <p className="text-sm font-black text-foreground">{s.val}</p>
                        <p className="text-[8px] text-muted-foreground font-bold">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Incident Reporting */}
          {section === "incidents" && (
            <div className="space-y-4">
              <Button className="w-full h-12 rounded-xl text-sm font-bold gap-2 bg-destructive hover:bg-destructive/90" onClick={() => setShowIncidentForm(v => !v)}>
                <AlertTriangle className="w-4 h-4" /> {showIncidentForm ? "Cancel Report" : "Report New Incident"}
              </Button>
              <AnimatePresence>
                {showIncidentForm && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {["Minor Collision", "Unsafe Driving", "Wrong Route", "Driver Misconduct", "Vehicle Issue", "Other"].map(t => (
                        <button type="button" key={t} onClick={() => setIncidentType(t)}
                          className={cn("text-[10px] px-2.5 py-1 rounded-full border transition-colors",
                            incidentType === t ? "bg-destructive text-destructive-foreground border-destructive" : "border-border text-muted-foreground hover:border-destructive/40")}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <textarea value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)} placeholder="Describe what happened..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-destructive/40" rows={3} />
                    <Button size="sm" variant="destructive" className="w-full" disabled={!incidentType || !incidentDesc.trim()} onClick={submitIncident}>
                      Submit Report
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Recent Incidents</h4>
                {incidents.map(inc => (
                  <div key={inc.id} className="rounded-2xl bg-card border border-border/40 p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">{inc.type}</p>
                        <p className="text-[10px] text-muted-foreground">{inc.date} • {inc.rideId}</p>
                      </div>
                      <Badge variant={statusColor(inc.status)} className="text-[8px] font-bold capitalize">{inc.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{inc.description}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold rounded-lg gap-1 flex-1">
                        <FileText className="w-3 h-3" /> View Details
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold rounded-lg gap-1 flex-1">
                        <Upload className="w-3 h-3" /> Add Evidence
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insurance Claims */}
          {section === "insurance" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 p-5 text-center">
                <Shield className="w-10 h-10 text-primary mx-auto mb-2" />
                <h3 className="text-lg font-black text-foreground">Ride Insurance</h3>
                <p className="text-xs text-muted-foreground mt-1">Protected on every trip with ZIVO SafeGuard</p>
              </div>

              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <h4 className="text-sm font-bold text-foreground">Coverage Details</h4>
                {[
                  { label: "Personal Injury", coverage: "$250,000", active: true },
                  { label: "Property Damage", coverage: "$100,000", active: true },
                  { label: "Uninsured Motorist", coverage: "$50,000", active: true },
                  { label: "Lost Belongings", coverage: "$1,000", active: false },
                ].map(c => (
                  <div key={c.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                    <div className="flex items-center gap-2">
                      {c.active ? <CheckCircle className="w-3.5 h-3.5 text-primary" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30" />}
                      <span className="text-xs font-bold text-foreground">{c.label}</span>
                    </div>
                    <span className="text-xs font-black text-foreground">{c.coverage}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <h4 className="text-sm font-bold text-foreground">File a Claim</h4>
                <p className="text-xs text-muted-foreground">Submit supporting documents and details for review</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-11 rounded-xl text-xs font-bold gap-1.5">
                    <Camera className="w-3.5 h-3.5" /> Upload Photos
                  </Button>
                  <Button variant="outline" className="h-11 rounded-xl text-xs font-bold gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Police Report
                  </Button>
                </div>
                <Button className="w-full h-11 rounded-xl text-sm font-bold gap-2" onClick={() => toast.success("Claim submitted! We'll review within 48 hours.")}>
                  Submit Claim
                </Button>
              </div>
            </div>
          )}

          {/* Emergency Contacts */}
          {section === "contacts" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-bold text-foreground">Emergency Contacts</span>
                </div>
                <p className="text-xs text-muted-foreground">These contacts will be notified automatically in an emergency</p>
              </div>

              {contacts.map(c => (
                <div key={c.id} className="rounded-2xl bg-card border border-border/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.phone} • {c.relation}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.autoNotify && <Badge variant="secondary" className="text-[8px] font-bold">Auto-Alert</Badge>}
                      <button type="button" onClick={() => { window.location.href = `tel:${c.phone.replace(/\D/g, "")}`; }} className="p-2 rounded-full bg-primary/10 text-primary">
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex gap-2">
                <Input placeholder="Name or phone number" value={contactInput} onChange={e => setContactInput(e.target.value)} className="h-10 rounded-xl text-xs" />
                <Button size="sm" className="h-10 rounded-xl text-xs font-bold gap-1" onClick={() => { if (!contactInput.trim()) return; setContacts(prev => [...prev, { id: Date.now().toString(), name: contactInput, phone: "+1 (555) 000-0000", relation: "Other", autoNotify: false }]); setContactInput(""); toast.success("Contact added!"); }}>
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
