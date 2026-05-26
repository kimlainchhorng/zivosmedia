/**
 * Traveler Profiles Page — Premium Upgrade
 * Manage saved traveler details for faster checkout
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, User, Plane, Shield, Trash2, Edit2, Star, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Clock, Fingerprint, Globe, Phone, Mail,
  UserCheck, BadgeCheck, Armchair
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import AppLayout from "@/components/app/AppLayout";
import { useNavigate } from "react-router-dom";
import {
  useTravelerProfiles,
  useCreateTravelerProfile,
  useUpdateTravelerProfile,
  useDeleteTravelerProfile,
  type TravelerProfile,
  type TravelerProfileInput,
} from "@/hooks/useTravelerProfiles";
import { cn } from "@/lib/utils";

/* ── Helpers ─────────────────────────────────────────── */
const emptyProfile: TravelerProfileInput = {
  label: "", is_primary: false, first_name: "", last_name: "",
  date_of_birth: null, gender: null, email: null, phone: null,
  nationality: null, passport_number: null, passport_expiry: null,
  passport_country: null, frequent_flyer_airline: null, frequent_flyer_number: null,
  tsa_precheck_number: null, known_traveler_number: null, redress_number: null,
  dietary_preferences: null, seat_preference: null, special_assistance: null,
};

function getProfileCompletion(p: TravelerProfile | TravelerProfileInput): number {
  const fields = [
    "first_name", "last_name", "date_of_birth", "gender", "email", "phone",
    "nationality", "passport_number", "passport_expiry", "passport_country",
  ];
  const filled = fields.filter((f) => !!(p as any)[f]).length;
  return Math.round((filled / fields.length) * 100);
}

function isPassportExpiringSoon(expiry: string | null): "ok" | "warning" | "expired" | null {
  if (!expiry) return null;
  const exp = new Date(expiry);
  const now = new Date();
  if (exp < now) return "expired";
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  if (exp < sixMonths) return "warning";
  return "ok";
}

function getInitials(first: string, last: string): string {
  return `${(first || "?")[0]}${(last || "?")[0]}`.toUpperCase();
}

/* ── Traveler Form ───────────────────────────────────── */
function TravelerForm({
  initial, onSubmit, isLoading, submitLabel,
}: {
  initial: TravelerProfileInput;
  onSubmit: (data: TravelerProfileInput) => void;
  isLoading: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<TravelerProfileInput>(initial);
  const [showPassport, setShowPassport] = useState(!!initial.passport_number);
  const [showTravel, setShowTravel] = useState(!!initial.frequent_flyer_number || !!initial.tsa_precheck_number);
  const completion = getProfileCompletion(form);

  const set = (key: keyof TravelerProfileInput, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-5">
      {/* Completion bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-medium">Profile completeness</span>
          <span className={cn("font-bold", completion === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-[hsl(var(--flights))]")}>
            {completion}%
          </span>
        </div>
        <Progress value={completion} className="h-1.5" />
      </div>

      {/* Personal Details */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <User className="w-3.5 h-3.5" /> Personal Details
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="first_name" className="text-[11px]">First Name *</Label>
            <Input id="first_name" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required className="h-10 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="last_name" className="text-[11px]">Last Name *</Label>
            <Input id="last_name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required className="h-10 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="label" className="text-[11px]">Label</Label>
            <Input id="label" placeholder="e.g. Self, Spouse" value={form.label} onChange={(e) => set("label", e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="gender" className="text-[11px]">Gender</Label>
            <Select value={form.gender || ""} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="dob" className="text-[11px]">Date of Birth</Label>
            <Input id="dob" type="date" value={form.date_of_birth || ""} onChange={(e) => set("date_of_birth", e.target.value || null)} className="h-10 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="nationality" className="text-[11px]">Nationality</Label>
            <Input id="nationality" placeholder="e.g. US" value={form.nationality || ""} onChange={(e) => set("nationality", e.target.value || null)} className="h-10 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="email" className="text-[11px]">Email</Label>
            <Input id="email" type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value || null)} className="h-10 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="phone" className="text-[11px]">Phone</Label>
            <Input id="phone" type="tel" value={form.phone || ""} onChange={(e) => set("phone", e.target.value || null)} className="h-10 rounded-xl" />
          </div>
        </div>

        {/* Primary toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/20">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold">Set as primary traveler</span>
          </div>
          <Switch checked={form.is_primary || false} onCheckedChange={(v) => set("is_primary", v)} />
        </div>
      </div>

      {/* Passport Section */}
      <div className="space-y-3">
        <button type="button" onClick={() => setShowPassport(!showPassport)}
          className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider w-full">
          <Shield className="w-3.5 h-3.5" />
          Passport Details
          <motion.div animate={{ rotate: showPassport ? 180 : 0 }} className="ml-auto">
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>
        <AnimatePresence>
          {showPassport && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="passport_number" className="text-[11px]">Passport Number</Label>
                  <Input id="passport_number" value={form.passport_number || ""} onChange={(e) => set("passport_number", e.target.value || null)} className="h-10 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="passport_expiry" className="text-[11px]">Expiry Date</Label>
                  <Input id="passport_expiry" type="date" value={form.passport_expiry || ""} onChange={(e) => set("passport_expiry", e.target.value || null)} className="h-10 rounded-xl" />
                </div>
              </div>
              <div>
                <Label htmlFor="passport_country" className="text-[11px]">Issuing Country</Label>
                <Input id="passport_country" placeholder="e.g. US" value={form.passport_country || ""} onChange={(e) => set("passport_country", e.target.value || null)} className="h-10 rounded-xl" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Travel Preferences */}
      <div className="space-y-3">
        <button type="button" onClick={() => setShowTravel(!showTravel)}
          className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider w-full">
          <Plane className="w-3.5 h-3.5" />
          Travel Preferences
          <motion.div animate={{ rotate: showTravel ? 180 : 0 }} className="ml-auto">
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>
        <AnimatePresence>
          {showTravel && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ff_airline" className="text-[11px]">FF Airline</Label>
                  <Input id="ff_airline" placeholder="e.g. Delta" value={form.frequent_flyer_airline || ""} onChange={(e) => set("frequent_flyer_airline", e.target.value || null)} className="h-10 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="ff_number" className="text-[11px]">FF Number</Label>
                  <Input id="ff_number" value={form.frequent_flyer_number || ""} onChange={(e) => set("frequent_flyer_number", e.target.value || null)} className="h-10 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tsa" className="text-[11px]">TSA PreCheck</Label>
                  <Input id="tsa" value={form.tsa_precheck_number || ""} onChange={(e) => set("tsa_precheck_number", e.target.value || null)} className="h-10 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="ktn" className="text-[11px]">Known Traveler #</Label>
                  <Input id="ktn" value={form.known_traveler_number || ""} onChange={(e) => set("known_traveler_number", e.target.value || null)} className="h-10 rounded-xl" />
                </div>
              </div>
              <div>
                <Label htmlFor="seat" className="text-[11px]">Seat Preference</Label>
                <Select value={form.seat_preference || ""} onValueChange={(v) => set("seat_preference", v)}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="No preference" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="window">🪟 Window</SelectItem>
                    <SelectItem value="aisle">🚶 Aisle</SelectItem>
                    <SelectItem value="middle">Middle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Button
        type="submit"
        disabled={isLoading || !form.first_name || !form.last_name}
        className="w-full rounded-xl h-12 bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90 font-bold text-sm shadow-md shadow-[hsl(var(--flights))]/20 active:scale-[0.98] transition-all"
      >
        {isLoading ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

/* ── Profile Card ────────────────────────────────────── */
function ProfileCard({
  profile, onEdit, onDelete,
}: {
  profile: TravelerProfile;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const completion = getProfileCompletion(profile);
  const passportStatus = isPassportExpiringSoon(profile.passport_expiry);
  const initials = getInitials(profile.first_name, profile.last_name);

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
      <Card className={cn(
        "border-border/40 hover:border-[hsl(var(--flights))]/30 transition-all duration-300 overflow-hidden relative group",
        profile.is_primary && "border-[hsl(var(--flights))]/30 shadow-sm shadow-[hsl(var(--flights))]/5"
      )}>
        {/* Primary accent */}
        {profile.is_primary && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[hsl(var(--flights))] to-transparent" />
        )}

        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-sm font-bold",
              profile.is_primary
                ? "bg-[hsl(var(--flights))]/15 text-[hsl(var(--flights))]"
                : "bg-muted text-muted-foreground"
            )}>
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm truncate">{profile.first_name} {profile.last_name}</span>
                {profile.is_primary && (
                  <Badge className="text-[8px] font-bold bg-[hsl(var(--flights))]/10 text-[hsl(var(--flights))] border border-[hsl(var(--flights))]/20 gap-0.5 px-1.5 py-0 h-4">
                    <Star className="w-2.5 h-2.5" /> Primary
                  </Badge>
                )}
                {profile.label && (
                  <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4">{profile.label}</Badge>
                )}
              </div>

              {/* Quick info row */}
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10px] text-muted-foreground">
                {profile.nationality && (
                  <span className="flex items-center gap-0.5"><Globe className="w-3 h-3" />{profile.nationality}</span>
                )}
                {profile.email && (
                  <span className="flex items-center gap-0.5 truncate max-w-[120px]"><Mail className="w-3 h-3" />{profile.email}</span>
                )}
                {profile.phone && (
                  <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{profile.phone}</span>
                )}
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {profile.passport_number && (
                  <Badge variant="outline" className={cn(
                    "text-[8px] gap-0.5 px-1.5 py-0 h-4 border-border/30",
                    passportStatus === "expired" && "border-destructive/30 text-destructive bg-destructive/5",
                    passportStatus === "warning" && "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5",
                    passportStatus === "ok" && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                  )}>
                    <Fingerprint className="w-2.5 h-2.5" />
                    •••{profile.passport_number.slice(-4)}
                    {passportStatus === "expired" && <AlertTriangle className="w-2.5 h-2.5" />}
                    {passportStatus === "warning" && <Clock className="w-2.5 h-2.5" />}
                    {passportStatus === "ok" && <CheckCircle2 className="w-2.5 h-2.5" />}
                  </Badge>
                )}
                {profile.frequent_flyer_airline && (
                  <Badge variant="outline" className="text-[8px] gap-0.5 px-1.5 py-0 h-4 border-border/30">
                    <Plane className="w-2.5 h-2.5" /> {profile.frequent_flyer_airline}
                  </Badge>
                )}
                {profile.tsa_precheck_number && (
                  <Badge variant="outline" className="text-[8px] gap-0.5 px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                    <BadgeCheck className="w-2.5 h-2.5" /> TSA Pre✓
                  </Badge>
                )}
                {profile.seat_preference && (
                  <Badge variant="outline" className="text-[8px] gap-0.5 px-1.5 py-0 h-4 border-border/30">
                    <Armchair className="w-2.5 h-2.5" /> {profile.seat_preference}
                  </Badge>
                )}
              </div>

              {/* Completion + passport warning */}
              <div className="mt-2.5 space-y-1.5">
                {completion < 100 && (
                  <div className="flex items-center gap-2">
                    <Progress value={completion} className="h-1 flex-1" />
                    <span className="text-[9px] text-muted-foreground font-semibold">{completion}%</span>
                  </div>
                )}
                {passportStatus === "expired" && (
                  <p className="text-[9px] text-destructive font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Passport expired — update before booking
                  </p>
                )}
                {passportStatus === "warning" && (
                  <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Passport expires within 6 months
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1 shrink-0">
              <Button variant="ghost" size="icon" aria-label="Edit traveler" className="w-8 h-8 rounded-xl hover:bg-[hsl(var(--flights))]/10" onClick={onEdit}>
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Delete traveler" className="w-8 h-8 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete traveler?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Remove {profile.first_name} {profile.last_name} from your saved travelers. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground rounded-xl">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Main Page ───────────────────────────────────────── */
export default function TravelerProfilesPage() {
  const navigate = useNavigate();
  const { data: profiles = [], isLoading } = useTravelerProfiles();
  const createProfile = useCreateTravelerProfile();
  const updateProfile = useUpdateTravelerProfile();
  const deleteProfile = useDeleteTravelerProfile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TravelerProfile | null>(null);

  const sortedProfiles = useMemo(() =>
    [...profiles].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)),
    [profiles]
  );

  const handleCreate = (data: TravelerProfileInput) => {
    createProfile.mutate(data, { onSuccess: () => setDialogOpen(false) });
  };

  const handleUpdate = (data: TravelerProfileInput) => {
    if (!editingProfile) return;
    updateProfile.mutate({ id: editingProfile.id, ...data }, { onSuccess: () => setEditingProfile(null) });
  };

  return (
    <AppLayout title="Travelers" showBack onBack={() => navigate(-1)}>
      <div className="min-h-[calc(100dvh-60px)] relative">
        {/* Decorative */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 right-0 w-60 h-60 rounded-full bg-[hsl(var(--flights))]/5 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="container mx-auto px-4 py-5 max-w-2xl relative z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold">Saved Travelers</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profiles.length > 0
                  ? `${profiles.length} traveler${profiles.length > 1 ? "s" : ""} saved · Auto-fill at checkout`
                  : "Save details for faster booking"
                }
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl gap-1.5 bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90 shadow-sm shadow-[hsl(var(--flights))]/15 h-9 px-4">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[hsl(var(--flights))]" />
                    Add Traveler
                  </DialogTitle>
                </DialogHeader>
                <TravelerForm
                  initial={emptyProfile}
                  onSubmit={handleCreate}
                  isLoading={createProfile.isPending}
                  submitLabel="Save Traveler"
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : sortedProfiles.length === 0 ? (
            <Card className="border-dashed border-2 border-[hsl(var(--flights))]/20">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--flights))]/10 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-[hsl(var(--flights))]" />
                </div>
                <h3 className="font-bold mb-1.5">No travelers saved yet</h3>
                <p className="text-xs text-muted-foreground mb-5 max-w-xs mx-auto">
                  Save passport, frequent flyer, and contact details for instant autofill at checkout
                </p>
                <Button onClick={() => setDialogOpen(true)} className="rounded-xl gap-1.5 bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90">
                  <Plus className="w-4 h-4" /> Add First Traveler
                </Button>

                {/* Feature highlights */}
                <div className="grid grid-cols-3 gap-3 mt-8">
                  {[
                    { icon: Fingerprint, text: "Passport info" },
                    { icon: Plane, text: "Frequent flyer" },
                    { icon: Shield, text: "Encrypted data" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex flex-col items-center gap-1.5 text-center">
                      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-[9px] text-muted-foreground font-medium">{text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {sortedProfiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onEdit={() => setEditingProfile(profile)}
                    onDelete={() => deleteProfile.mutate(profile.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Info footer */}
          {sortedProfiles.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/20">
                <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Your traveler data is encrypted and stored securely. It is only used to pre-fill booking forms with your consent.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[hsl(var(--flights))]" />
              Edit Traveler
            </DialogTitle>
          </DialogHeader>
          {editingProfile && (
            <TravelerForm
              initial={{
                label: editingProfile.label,
                is_primary: editingProfile.is_primary,
                first_name: editingProfile.first_name,
                last_name: editingProfile.last_name,
                date_of_birth: editingProfile.date_of_birth,
                gender: editingProfile.gender,
                email: editingProfile.email,
                phone: editingProfile.phone,
                nationality: editingProfile.nationality,
                passport_number: editingProfile.passport_number,
                passport_expiry: editingProfile.passport_expiry,
                passport_country: editingProfile.passport_country,
                frequent_flyer_airline: editingProfile.frequent_flyer_airline,
                frequent_flyer_number: editingProfile.frequent_flyer_number,
                tsa_precheck_number: editingProfile.tsa_precheck_number,
                known_traveler_number: editingProfile.known_traveler_number,
                redress_number: editingProfile.redress_number,
                dietary_preferences: editingProfile.dietary_preferences,
                seat_preference: editingProfile.seat_preference,
                special_assistance: editingProfile.special_assistance,
              }}
              onSubmit={handleUpdate}
              isLoading={updateProfile.isPending}
              submitLabel="Update Traveler"
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
