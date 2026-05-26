import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User, Camera, ArrowLeft, Mail, Phone, Loader2, Save, Sparkles,
  AlertCircle, CheckCircle2, Lock, Unlock, Users, Eye, EyeOff, Car,
  Link2, Trash2, ExternalLink, MessageSquare, Heart, Share2, AtSign,
  UserPlus, Globe, Briefcase,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import NavBar from "@/components/home/NavBar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile, useUpdateUserProfile, useUploadAvatar } from "@/hooks/useUserProfile";
import { CountryPhoneInput } from "@/components/auth/CountryPhoneInput";
import { PhoneVerificationDialog } from "@/components/account/PhoneVerificationDialog";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import onlyfansLogo from "@/assets/brand-logos/onlyfans.png";

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(50, "Too long").optional().or(z.literal("")),
  last_name: z.string().trim().min(1, "Last name is required").max(50, "Too long").optional().or(z.literal("")),
  phone: z.string().trim().max(20, "Phone number too long").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ─── Sidebar nav items ───
const sidebarSections = [
  { id: "profile-info", label: "Profile Information", icon: User },
  { id: "profile-visibility", label: "Profile Visibility", icon: Eye },
  { id: "interaction-controls", label: "Interaction Controls", icon: MessageSquare },
  { id: "social-links", label: "Social Links", icon: Link2 },
];

// ─── Social Platforms ───
const SOCIAL_PLATFORMS = [
  { key: "social_facebook" as const, name: "Facebook", color: "bg-[#1877F2]", placeholder: "https://facebook.com/username", icon: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  )},
  { key: "social_instagram" as const, name: "Instagram", color: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]", placeholder: "https://instagram.com/username", icon: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
  )},
  { key: "social_tiktok" as const, name: "TikTok", color: "bg-[#010101]", placeholder: "https://tiktok.com/@username", icon: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
  )},
  { key: "social_snapchat" as const, name: "Snapchat", color: "bg-[#FFFC00]", placeholder: "https://snapchat.com/add/username", icon: (
    <svg viewBox="0 0 512 512" className="w-5 h-5 fill-white" stroke="black" strokeWidth="18"><path d="M256 32c-60 0-104 26-131 76-18 34-14 88-11 128l1 12c-8-4-18-7-27-7-14 0-25 6-31 16-5 9-5 20-1 30 10 24 36 35 56 43l5 2c-4 14-10 27-20 40-20 26-46 45-72 55-10 4-16 13-15 23 1 9 7 16 12 20 17 11 37 17 55 21 5 1 10 3 13 5 5 4 7 11 11 18 3 7 8 15 16 22 9 8 22 12 37 12 10 0 20-2 30-4 18-5 34-9 56-9s38 4 56 9c10 3 20 4 30 4 15 0 28-4 37-12 8-7 13-15 16-22 4-7 6-14 11-18 3-2 8-4 13-5 18-4 38-10 55-21 5-4 11-11 12-20 1-10-5-19-15-23-26-10-52-29-72-55-10-13-16-26-20-40l5-2c20-8 46-19 56-43 4-10 4-21-1-30-6-10-17-16-31-16-9 0-19 3-27 7l1-12c3-40 7-94-11-128C360 58 316 32 256 32z"/></svg>
  )},
  { key: "social_x" as const, name: "X", color: "bg-foreground", placeholder: "https://x.com/username", icon: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-background"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  )},
  { key: "social_linkedin" as const, name: "LinkedIn", color: "bg-[#0A66C2]", placeholder: "https://linkedin.com/in/username", icon: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  )},
  { key: "social_telegram" as const, name: "Telegram", color: "bg-[#26A5E4]", placeholder: "https://t.me/username", icon: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
  )},
  { key: "social_onlyfans" as const, name: "OnlyFans", color: "bg-white", placeholder: "https://onlyfans.com/username", icon: (
    <img src={onlyfansLogo} alt="OnlyFans" className="w-9 h-9 object-contain" loading="lazy" width={36} height={36} />
  )},
];

type SocialKey = typeof SOCIAL_PLATFORMS[number]["key"];

function SocialLinksEditor({ profile, updateProfile }: { profile: any; updateProfile: any }) {
  const [editing, setEditing] = useState<SocialKey | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  const handleEdit = (key: SocialKey) => { setEditing(key); setInputValue(profile?.[key] || ""); };
  const handleSave = async (key: SocialKey) => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ [key]: inputValue.trim() || null } as any);
      setEditing(null);
      toast.success("Social link saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save social link");
    } finally { setSaving(false); }
  };
  const handleDelete = async (key: SocialKey) => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ [key]: null } as any);
      setEditing(null);
      setInputValue("");
      toast.success("Social link removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove social link");
    } finally { setSaving(false); }
  };

  const linksVisible = profile?.social_links_visible !== false;

  return (
    <div id="social-links" className="rounded-2xl border border-border/40 bg-card p-4 space-y-4 scroll-mt-20">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" /> Social Links
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{linksVisible ? "Visible" : "Hidden"}</span>
          <Switch checked={linksVisible} onCheckedChange={async (checked) => {
            try { await updateProfile.mutateAsync({ social_links_visible: checked }); }
            catch (e: any) { toast.error(e?.message || "Failed to update visibility"); }
          }} disabled={updateProfile.isPending} />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">Add your social media links. Toggle to show or hide them on your profile.</p>
      <div className="space-y-2">
        {SOCIAL_PLATFORMS.map((social) => {
          const value = profile?.[social.key] || "";
          const isEditing = editing === social.key;
          return (
            <div key={social.key} className="space-y-2">
              <button type="button" onClick={() => isEditing ? setEditing(null) : handleEdit(social.key)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${value ? "border-primary/20 bg-primary/[0.03]" : "border-border/30 hover:bg-muted/30"}`}>
                <div className={`h-9 w-9 rounded-full ${social.color} flex items-center justify-center shrink-0 shadow-sm`}>{social.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{social.name}</p>
                  {value ? <p className="text-[11px] text-primary truncate">{value}</p> : <p className="text-[11px] text-muted-foreground">Not connected</p>}
                </div>
                {value && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
              </button>
              <AnimatePresence>
                {isEditing && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="pl-12 pr-1 pb-1 space-y-2">
                      <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={social.placeholder} className="h-10 rounded-xl bg-muted/15 border-border/30 text-[13px]" autoFocus />
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={() => handleSave(social.key)} disabled={saving} className="flex-1 h-9 rounded-xl text-xs font-bold">
                          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />} Save
                        </Button>
                        {value && <Button type="button" size="sm" variant="destructive" onClick={() => handleDelete(social.key)} disabled={saving} className="h-9 rounded-xl text-xs font-bold px-3"><Trash2 className="h-3 w-3" /></Button>}
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-9 rounded-xl text-xs px-3">Cancel</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Desktop Sidebar ───
function DesktopSidebar({ activeSection, onSectionClick }: { activeSection: string; onSectionClick: (id: string) => void }) {

  return (
    <aside className="hidden lg:block w-[220px] shrink-0">
      <div className="sticky top-20 space-y-1">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">Settings</p>
        {sidebarSections.map((section) => {
          const isActive = activeSection === section.id;
          const Icon = section.icon;
          return (
            <button type="button"
              key={section.id}
              onClick={() => onSectionClick(section.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left",
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {section.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const phoneRequired = (location.state as any)?.phoneRequired === true;
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("profile-info");

  // Email change state
  const [newEmail, setNewEmail] = useState("");
  const [emailEditMode, setEmailEditMode] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailChanging, setEmailChanging] = useState(false);

  // Phone verification state
  const [showPhoneVerify, setShowPhoneVerify] = useState(false);
  const [pendingProfileData, setPendingProfileData] = useState<ProfileFormData | null>(null);

  // Intersection observer for active section
  useEffect(() => {
    const ids = sidebarSections.map(s => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [profileLoading]);

  const parsedFirst = profile?.full_name?.split(" ").slice(0, 1).join(" ") || "";
  const parsedLast = profile?.full_name?.split(" ").slice(1).join(" ") || "";

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: "", last_name: "", phone: "" },
    values: { first_name: parsedFirst, last_name: parsedLast, phone: profile?.phone || "" },
  });

  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      await uploadAvatar.mutateAsync(file);
      setAvatarPreview(null);
    } catch (err: any) {
      setAvatarPreview(null);
      toast.error(err?.message || "Avatar upload failed");
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    // OTP verification on phone change is intentionally skipped here — the
    // gates that block service access (PhoneRequiredGate, etc.) only check
    // that a phone is present, not that it's been verified, so requiring an
    // OTP at save-time would add friction without enforcing anything. Phone
    // verification can be opt-in via the Phone Verification dialog elsewhere
    // in the account settings if/when it becomes a hard requirement.
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
    await updateProfile.mutateAsync({ full_name: fullName, phone: data.phone || null });
  };

  const handlePhoneVerified = async () => {
    if (!pendingProfileData) return;
    const fullName = [pendingProfileData.first_name, pendingProfileData.last_name].filter(Boolean).join(" ") || null;
    await updateProfile.mutateAsync({ full_name: fullName, phone: pendingProfileData.phone || null });
    setPendingProfileData(null);
  };

  const handleEmailChangeRequest = async () => {
    if (!newEmail || newEmail === user?.email) return;
    setEmailChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailOtpSent(true);
      setEmailOtp("");
      toast.success("6-digit code sent to " + newEmail);
    } catch (err: any) { toast.error(err.message || "Failed to send verification"); } finally { setEmailChanging(false); }
  };

  const [emailVerifying, setEmailVerifying] = useState(false);
  const handleEmailOtpVerify = async () => {
    const code = emailOtp.trim();
    if (code.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setEmailVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: newEmail,
        token: code,
        type: "email_change",
      });
      if (error) throw error;
      toast.success("Email updated to " + newEmail);
      setEmailEditMode(false);
      setEmailOtpSent(false);
      setEmailOtp("");
      setNewEmail("");
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired code");
    } finally {
      setEmailVerifying(false);
    }
  };

  const handleEmailOtpResend = async () => {
    setEmailChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success("Code resent to " + newEmail);
      setEmailOtp("");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend code");
    } finally {
      setEmailChanging(false);
    }
  };

  const getInitials = () => {
    if (profile?.full_name) return profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const profileInputClass =
    "h-12 rounded-2xl border-border/40 bg-background text-[15px] font-semibold text-foreground placeholder:text-muted-foreground/55";
  const profileLabelClass =
    "flex items-center gap-1.5 text-[12px] font-semibold text-foreground";

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: full NavBar */}
      <div className="hidden lg:block">
        <NavBar />
      </div>

      {/* Mobile: simple back header */}
      <div className="lg:hidden sticky top-0 pt-safe z-40 bg-background/95 text-foreground backdrop-blur-md border-b border-border/50">
        <div className="flex h-12 items-center gap-3 px-4 max-w-5xl mx-auto">
          <Button variant="ghost" size="icon" aria-label="Back" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Profile Information</h1>
        </div>
      </div>

      {profileLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-4 lg:pt-24 flex gap-8">
          {/* Sidebar — desktop only */}
          <DesktopSidebar activeSection={activeSection} onSectionClick={(id) => {
            setActiveSection(id);
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }} />

          {/* Main content */}
          <div className="flex-1 max-w-lg mx-auto lg:mx-0 space-y-5">
            {/* Profile Info Section */}
            <div id="profile-info" className="scroll-mt-20 space-y-5">
              {/* Avatar */}
              <div className="flex justify-center">
                <div className="relative group">
                  <div className="absolute -inset-3 bg-gradient-to-r from-primary via-primary/50 to-primary rounded-full blur-xl opacity-15" />
                  <Avatar className="relative h-24 w-24 ring-[3px] ring-primary/30 shadow-2xl">
                    <AvatarImage src={avatarPreview || profile?.avatar_url || undefined} alt="Profile" />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-2xl font-bold">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <button type="button" onClick={handleAvatarClick} disabled={uploadAvatar.isPending} aria-label="Change profile photo" title="Change profile photo" className="absolute bottom-0 right-0 p-2.5 bg-primary text-primary-foreground rounded-full shadow-xl ring-2 ring-background disabled:opacity-50">
                    {uploadAvatar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} aria-label="Upload profile photo" title="Upload profile photo" className="hidden" />
                </div>
              </div>

              {/* Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="first_name" render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className={profileLabelClass}><User className="h-3.5 w-3.5 text-foreground" />First Name</FormLabel>
                        <FormControl><Input placeholder="First name" className={profileInputClass} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="last_name" render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className={profileLabelClass}><User className="h-3.5 w-3.5 text-foreground" />Last Name</FormLabel>
                        <FormControl><Input placeholder="Last name" className={profileInputClass} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className={profileLabelClass}><Mail className="h-3.5 w-3.5 text-foreground" />{t("profile.email")}</label>
                    {!emailEditMode ? (
                      <div className="relative">
                        <Input value={user?.email || ""} readOnly className="h-12 rounded-2xl border-border/30 bg-background text-[15px] font-medium text-muted-foreground pr-24 opacity-100" />
                        <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} onClick={() => { setEmailEditMode(true); setNewEmail(user?.email || ""); }} className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-xs font-bold text-primary bg-primary/8 hover:bg-primary/15 border border-primary/15 transition-all duration-200">Change</motion.button>
                      </div>
                    ) : (
                      <AnimatePresence mode="wait">
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                          {!emailOtpSent ? (
                            <div className="space-y-2.5">
                              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter new email" autoFocus className={profileInputClass} />
                              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70"><AlertCircle className="w-3 h-3 shrink-0" />We&apos;ll send a 6-digit code to your new email.</p>
                              <div className="flex gap-2">
                                <Button type="button" onClick={handleEmailChangeRequest} disabled={emailChanging || !newEmail || newEmail === user?.email} className="flex-1 h-11 rounded-2xl font-bold text-sm">
                                  {emailChanging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}Send Code
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => { setEmailEditMode(false); setNewEmail(""); }} className="h-11 rounded-2xl text-muted-foreground px-4">Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3 rounded-2xl bg-primary/[0.04] border border-primary/10 p-4">
                              <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-semibold text-foreground">Code sent!</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">Enter the 6-digit code we sent to <span className="font-medium text-foreground">{newEmail}</span>.</p>
                                </div>
                              </div>
                              <Input
                                inputMode="numeric"
                                pattern="\d*"
                                maxLength={6}
                                value={emailOtp}
                                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="123456"
                                autoFocus
                                className="h-12 rounded-2xl bg-background border-border/40 text-center text-xl font-bold tracking-[0.4em]"
                              />
                              <Button
                                type="button"
                                onClick={handleEmailOtpVerify}
                                disabled={emailVerifying || emailOtp.length !== 6}
                                className="w-full h-11 rounded-2xl font-bold text-sm"
                              >
                                {emailVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                Verify Email
                              </Button>
                              <div className="flex items-center justify-between text-xs">
                                <button
                                  type="button"
                                  onClick={handleEmailOtpResend}
                                  disabled={emailChanging}
                                  className="text-primary font-semibold hover:underline disabled:opacity-50"
                                >
                                  {emailChanging ? "Sending..." : "Resend code"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setEmailEditMode(false); setEmailOtpSent(false); setNewEmail(""); setEmailOtp(""); }}
                                  className="text-muted-foreground hover:underline"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>

                  {/* Phone Required Banner */}
                  {phoneRequired && !form.watch("phone")?.trim() && (
                    <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-destructive">{t("profile.phone_required_title")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("profile.phone_required_desc")}</p>
                      </div>
                    </div>
                  )}

                  {/* Phone */}
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className={profileLabelClass}><Phone className="h-3.5 w-3.5 text-foreground" />{t("profile.phone")}</FormLabel>
                      <FormControl><CountryPhoneInput value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Save */}
                  <Button type="submit" className="w-full h-13 text-base font-bold rounded-2xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-xl shadow-primary/30" disabled={updateProfile.isPending || !form.formState.isDirty}>
                    {updateProfile.isPending ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />{t("profile.saving")}</> : <><Save className="h-5 w-5 mr-2" />{t("profile.save")}</>}
                  </Button>
                </form>
              </Form>
            </div>

            {/* Profile Visibility */}
            <div id="profile-visibility" className="rounded-2xl border border-border/40 bg-card p-4 space-y-4 scroll-mt-20">
              <h3 className="text-sm font-bold flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Profile Visibility</h3>
              <div className="space-y-2">
                {([
                  { value: "public", label: "Public", desc: "Anyone can view your profile", icon: Unlock, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
                  { value: "friends_only", label: "Friends Only", desc: "Only friends can see your profile", icon: Users, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
                  { value: "private", label: "Private", desc: "Nobody can see your profile", icon: Lock, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
                ] as const).map((opt) => {
                  const current = profile?.profile_visibility || "public";
                  const isActive = current === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button type="button" key={opt.value} disabled={updateProfile.isPending} onClick={async () => {
                      if (isActive) return;
                      try { await updateProfile.mutateAsync({ profile_visibility: opt.value }); }
                      catch (e: any) { toast.error(e?.message || "Failed to update visibility"); }
                    }} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${isActive ? `${opt.bg} ${opt.border} border` : "border-border/30 hover:bg-muted/30"}`}>
                      <div className={`h-9 w-9 rounded-full ${opt.bg} flex items-center justify-center shrink-0`}><Icon className={`h-4 w-4 ${opt.color}`} /></div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                      </div>
                      {isActive && <div className={`h-5 w-5 rounded-full ${opt.bg} flex items-center justify-center`}><CheckCircle2 className={`h-4 w-4 ${opt.color}`} /></div>}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted/20 flex items-center justify-center"><EyeOff className="h-4 w-4 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm font-semibold">Hide from Drivers & Shops</p>
                    <p className="text-[11px] text-muted-foreground">Drivers and shops can't view your profile</p>
                  </div>
                </div>
                <Switch checked={!!profile?.hide_from_drivers} onCheckedChange={async (checked) => {
                  try { await updateProfile.mutateAsync({ hide_from_drivers: checked }); }
                  catch (e: any) { toast.error(e?.message || "Failed to update setting"); }
                }} disabled={updateProfile.isPending} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center"><Briefcase className="h-4 w-4 text-emerald-500" /></div>
                  <div>
                    <p className="text-sm font-semibold">Open to Work</p>
                    <p className="text-[11px] text-muted-foreground">Let employers find you in the Find Talent directory</p>
                  </div>
                </div>
                <Switch checked={!!(profile as any)?.open_to_work} onCheckedChange={async (checked) => {
                  try {
                    await updateProfile.mutateAsync({ open_to_work: checked } as any);
                    toast.success(checked ? "You're now visible to employers" : "Removed from talent directory");
                  } catch (e: any) { toast.error(e?.message || "Failed to update setting"); }
                }} disabled={updateProfile.isPending} />
              </div>
            </div>

            {/* Interaction Controls */}
            <div id="interaction-controls" className="rounded-2xl border border-border/40 bg-card p-4 space-y-4 scroll-mt-20">
              <h3 className="text-sm font-bold flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Interaction Controls</h3>
              <p className="text-[11px] text-muted-foreground -mt-2">Control who can interact with your posts and profile.</p>

              {/* Comment Control */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /> Who can comment</p>
                <div className="space-y-1.5">
                  {([
                    { value: "everyone", label: "Everyone", desc: "Anyone can comment on your posts", icon: Globe, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
                    { value: "friends", label: "Friends Only", desc: "Only friends can comment", icon: Users, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
                    { value: "off", label: "Off", desc: "No one can comment on your posts", icon: Lock, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
                  ] as const).map((opt) => {
                    const current = profile?.comment_control || "everyone";
                    const isActive = current === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button type="button" key={opt.value} disabled={updateProfile.isPending} onClick={async () => {
                        if (isActive) return;
                        try { await updateProfile.mutateAsync({ comment_control: opt.value }); }
                        catch (e: any) { toast.error(e?.message || "Failed to update setting"); }
                      }} className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${isActive ? `${opt.bg} ${opt.border} border` : "border-border/30 hover:bg-muted/30"}`}>
                        <div className={`h-8 w-8 rounded-full ${opt.bg} flex items-center justify-center shrink-0`}><Icon className={`h-3.5 w-3.5 ${opt.color}`} /></div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{opt.label}</p>
                          <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                        </div>
                        {isActive && <CheckCircle2 className={`h-4 w-4 ${opt.color} shrink-0`} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle Controls */}
              {[
                { key: "hide_like_counts", label: "Hide like counts", desc: "Others won't see like counts on your posts", icon: Heart, iconColor: "text-pink-500", bg: "bg-pink-500/10", defaultVal: false },
                { key: "allow_mentions", label: "Allow mentions", desc: "Let others mention you in posts & comments", icon: AtSign, iconColor: "text-sky-500", bg: "bg-sky-500/10", defaultVal: true },
                { key: "allow_sharing", label: "Allow sharing", desc: "Let others share your posts", icon: Share2, iconColor: "text-indigo-500", bg: "bg-indigo-500/10", defaultVal: true },
                { key: "allow_friend_requests", label: "Allow friend requests", desc: "Let others send you friend requests", icon: UserPlus, iconColor: "text-emerald-500", bg: "bg-emerald-500/10", defaultVal: true },
              ].map((ctrl) => {
                const Icon = ctrl.icon;
                const checked = ctrl.defaultVal ? (profile as any)?.[ctrl.key] !== false : !!(profile as any)?.[ctrl.key];
                return (
                  <div key={ctrl.key} className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full ${ctrl.bg} flex items-center justify-center`}><Icon className={`h-3.5 w-3.5 ${ctrl.iconColor}`} /></div>
                      <div>
                        <p className="text-[13px] font-semibold">{ctrl.label}</p>
                        <p className="text-[10px] text-muted-foreground">{ctrl.desc}</p>
                      </div>
                    </div>
                    <Switch checked={checked} onCheckedChange={async (val) => {
                      try { await updateProfile.mutateAsync({ [ctrl.key]: val } as any); }
                      catch (e: any) { toast.error(e?.message || "Failed to update setting"); }
                    }} disabled={updateProfile.isPending} />
                  </div>
                );
              })}
            </div>

            {/* Social Links */}
            <SocialLinksEditor profile={profile} updateProfile={updateProfile} />
          </div>
        </div>
      )}

      {/* Phone Verification Dialog */}
      {pendingProfileData?.phone && (
        <PhoneVerificationDialog open={showPhoneVerify} onOpenChange={setShowPhoneVerify} phoneNumber={pendingProfileData.phone} onVerified={handlePhoneVerified} />
      )}
    </div>
  );
}
