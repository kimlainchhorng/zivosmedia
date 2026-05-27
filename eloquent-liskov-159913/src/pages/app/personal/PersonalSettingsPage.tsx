import { useState, useEffect } from "react";
import { ArrowLeft, Bell, MapPin, Shield, Eye, EyeOff, Moon, Smartphone, Globe, ChevronRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SETTINGS_KEY = "zivo_personal_settings";

const DEFAULT_SETTINGS = {
  push_notifications: true,
  email_notifications: true,
  ride_updates: true,
  promo_emails: false,
  location_always: false,
  location_while_using: true,
  share_trip_data: false,
  two_factor: false,
  dark_mode: false,
  language: "English",
};

type SettingsKey = keyof typeof DEFAULT_SETTINGS;

export default function PersonalSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<typeof DEFAULT_SETTINGS>(() => {
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; }
    catch { return DEFAULT_SETTINGS; }
  });

  // Sync dark mode class on mount and on change
  useEffect(() => {
    if (settings.dark_mode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.dark_mode]);

  // Change password state
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    setShowChangePw(false);
    setNewPw(""); setConfirmPw("");
  };

  const toggle = (key: SettingsKey) => {
    if (typeof settings[key] !== "boolean") return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    toast.success("Setting updated");
  };

  const groups = [
    {
      title: "Notifications",
      icon: Bell,
      color: "text-blue-500",
      items: [
        { key: "push_notifications" as SettingsKey, label: "Push Notifications", desc: "Ride updates and alerts" },
        { key: "email_notifications" as SettingsKey, label: "Email Notifications", desc: "Receipts and account activity" },
        { key: "ride_updates" as SettingsKey, label: "Ride Status Updates", desc: "Driver arrival, trip progress" },
        { key: "promo_emails" as SettingsKey, label: "Promotions & Offers", desc: "Deals and discount codes" },
      ],
    },
    {
      title: "Location",
      icon: MapPin,
      color: "text-emerald-500",
      items: [
        { key: "location_always" as SettingsKey, label: "Always Allow Location", desc: "Background location access" },
        { key: "location_while_using" as SettingsKey, label: "Location While Using", desc: "Only while app is open" },
      ],
    },
    {
      title: "Privacy & Security",
      icon: Shield,
      color: "text-violet-500",
      items: [
        { key: "share_trip_data" as SettingsKey, label: "Share Trip Analytics", desc: "Help improve the service" },
        { key: "two_factor" as SettingsKey, label: "Two-Factor Auth", desc: "Extra security for your account" },
      ],
    },
    {
      title: "Display",
      icon: Eye,
      color: "text-amber-500",
      items: [
        { key: "dark_mode" as SettingsKey, label: "Dark Mode", desc: "Switch to dark theme" },
      ],
    },
  ];

  return (
    <AppLayout title="Settings" hideHeader>
      <div className="flex flex-col px-4 pt-3 pb-24 space-y-4">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-[17px]">Settings</h1>
        </div>

        {groups.map(group => {
          const Icon = group.icon;
          return (
            <div key={group.title} className="rounded-2xl bg-card border border-border/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                <Icon className={cn("w-4 h-4", group.color)} />
                <span className="text-[12px] font-bold text-foreground">{group.title}</span>
              </div>
              {group.items.map((item, i) => (
                <div key={item.key} className={cn("flex items-center justify-between px-4 py-3.5", i > 0 && "border-t border-border/20")}>
                  <div className="flex-1 mr-4">
                    <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={settings[item.key] as boolean} onCheckedChange={() => toggle(item.key)} />
                </div>
              ))}
            </div>
          );
        })}

        {/* Language / Account links */}
        <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
            <Globe className="w-4 h-4 text-foreground" />
            <span className="text-[12px] font-bold text-foreground">Account</span>
          </div>
          <button type="button" onClick={() => navigate("/settings")}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/30 transition-colors">
            <span className="text-[13px] font-semibold text-foreground">Language</span>
            <div className="flex items-center gap-1">
              <span className="text-[12px] text-muted-foreground">{settings.language}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </div>
          </button>
          <button type="button" onClick={() => setShowChangePw(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 border-t border-border/20 active:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[13px] font-semibold text-foreground">Change Password</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </button>
          <button type="button" onClick={() => navigate("/profile/delete-account")}
            className="w-full flex items-center justify-between px-4 py-3.5 border-t border-border/20 active:bg-muted/30 transition-colors">
            <span className="text-[13px] font-semibold text-red-500">Delete Account</span>
            <ChevronRight className="w-4 h-4 text-red-400/60" />
          </button>
        </div>
      </div>
      {/* Change Password Sheet */}
      <Sheet open={showChangePw} onOpenChange={setShowChangePw}>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-10">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">Change Password</SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="New password (min 8 characters)"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm pr-11 outline-none focus:ring-1 focus:ring-foreground/20"
              />
              <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3.5">
                {showPw ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <input
              type={showPw ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-foreground/20"
            />
            {newPw.length > 0 && confirmPw.length > 0 && newPw !== confirmPw && (
              <p className="text-[11px] text-red-500 text-center">Passwords don't match</p>
            )}
            <button
              type="button"
              disabled={pwLoading || newPw.length < 8 || newPw !== confirmPw}
              onClick={handleUpdatePassword}
              className="w-full rounded-2xl bg-foreground text-background font-bold py-3 text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {pwLoading ? "Updating…" : "Update Password"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
