import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Settings, Sun, Moon, Monitor, Globe, Bell, BellOff, Eye,
  Lock, Palette, Type, Volume2, VolumeX, Smartphone, Shield, Trash2, LogOut,
  Briefcase, Tv, Activity, Rocket, Pill, Calendar, DollarSign, Tag, Heart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

interface SettingToggle {
  id: string;
  label: string;
  description: string;
  icon: any;
  enabled: boolean;
}

export default function AppSettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState("en");
  const [fontSize, setFontSize] = useState("medium");
  const [toggles, setToggles] = useState<SettingToggle[]>([
    { id: "push", label: "Push Notifications", description: "Receive push notifications", icon: Bell, enabled: true },
    { id: "email", label: "Email Notifications", description: "Receive email updates", icon: Bell, enabled: true },
    { id: "sounds", label: "Sounds", description: "Play notification sounds", icon: Volume2, enabled: true },
    { id: "haptics", label: "Haptic Feedback", description: "Vibration on interactions", icon: Smartphone, enabled: true },
    { id: "readreceipts", label: "Read Receipts", description: "Show when you've read messages", icon: Eye, enabled: true },
    { id: "online", label: "Online Status", description: "Show when you're online", icon: Eye, enabled: true },
    { id: "2fa", label: "Two-Factor Auth", description: "Extra security for your account", icon: Shield, enabled: false },
    { id: "deals", label: "Deals & Promotions", description: "Hot offers, flash sales & coupons", icon: Tag, enabled: true },
    { id: "jobs", label: "Job Alerts", description: "Matches & application updates", icon: Briefcase, enabled: true },
    { id: "live", label: "Live & Streams", description: "When followed creators go live", icon: Tv, enabled: true },
    { id: "creator", label: "Creator Updates", description: "Payouts, milestones & analytics", icon: Rocket, enabled: true },
    { id: "wellness", label: "Wellness Reminders", description: "Activity, hydration & sleep nudges", icon: Activity, enabled: false },
    { id: "meds", label: "Medication Reminders", description: "Take & refill reminders", icon: Pill, enabled: false },
    { id: "appointments", label: "Appointment Reminders", description: "Telehealth & bookings", icon: Calendar, enabled: true },
    { id: "earnings", label: "Earnings & Payouts", description: "Driver, shop & creator payments", icon: DollarSign, enabled: true },
    { id: "favorites", label: "Favorites Activity", description: "Updates from places you follow", icon: Heart, enabled: false },
  ]);

  const toggleSetting = (id: string) => {
    setToggles(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  };

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const languages = [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" },
    { value: "ja", label: "日本語" },
    { value: "ar", label: "العربية" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Settings className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-ig-gradient">Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
            <Palette className="h-4 w-4" /> Appearance
          </h2>
          <Card className="p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Theme</p>
              <div className="flex gap-2">
                {themeOptions.map((opt) => (
                  <Button key={opt.value} variant={theme === opt.value ? "default" : "outline"} size="sm" className="flex-1 gap-1"
                    onClick={() => setTheme(opt.value)}>
                    <opt.icon className="h-3 w-3" /> {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Font Size</p>
                <p className="text-xs text-muted-foreground">Adjust text size</p>
              </div>
              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </motion.div>

        {/* Language */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
            <Globe className="h-4 w-4" /> Language & Region
          </h2>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Language</p>
                <p className="text-xs text-muted-foreground">Choose your preferred language</p>
              </div>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        </motion.div>

        {/* Notification & Privacy Toggles */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
            <Bell className="h-4 w-4" /> Notifications & Privacy
          </h2>
          <Card className="divide-y divide-border">
            {toggles.map((toggle) => (
              <div key={toggle.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <toggle.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{toggle.label}</p>
                    <p className="text-xs text-muted-foreground">{toggle.description}</p>
                  </div>
                </div>
                <Switch checked={toggle.enabled} onCheckedChange={() => toggleSetting(toggle.id)} />
              </div>
            ))}
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="text-sm font-semibold text-destructive mb-3">Danger Zone</h2>
          <Card className="p-4 space-y-3">
            <Button variant="outline" className="w-full gap-2 text-foreground" onClick={() => navigate("/profile")}>
              <LogOut className="h-4 w-4" /> Log Out
            </Button>
            <Button variant="destructive" className="w-full gap-2" onClick={() => navigate("/profile/delete-account")}>
              <Trash2 className="h-4 w-4" /> Delete Account
            </Button>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
