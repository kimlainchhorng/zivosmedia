/**
 * NotificationSettings Page
 * User notification preferences and controls for push, SMS, and email
 * Includes SMS consent checkbox, quiet hours, and masked phone display
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import {
  ArrowLeft,
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Crown,
  Info,
  Package,
  MessageSquare,
  Tag,
  Gift,
  AlertCircle,
  Smartphone,
  Mail,
  Phone,
  ExternalLink,
  Loader2,
  Moon,
  AlertTriangle,
  ShieldCheck,
  UserPlus,
  Plane,
  BadgeCheck,
  Briefcase,
  Tv,
  Activity,
  Rocket,
  Pill,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWebPush } from "@/hooks/useWebPush";
import { useAuth } from "@/contexts/AuthContext";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useUserProfile,
  useReenableSMS,
} from "@/hooks/useNotificationPreferences";
import { NotificationChannelCard } from "@/components/account/NotificationChannelCard";
import { PhoneVerificationDialog } from "@/components/account/PhoneVerificationDialog";
import InstallAppCard from "@/components/account/InstallAppCard";
import { toast } from "sonner";

type CategoryGroup = "account" | "social" | "commerce" | "live" | "wellness" | "creator";

interface NotificationCategory {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  defaultEnabled: boolean;
  group: CategoryGroup;
}

const GROUP_META: Record<CategoryGroup, { title: string; subtitle: string; anchor: string }> = {
  account: { title: "Account & Security", subtitle: "Sign-ins, verification, and trust signals", anchor: "account" },
  social: { title: "Social & Activity", subtitle: "Mentions, follows, and your community", anchor: "social" },
  commerce: { title: "Orders & Payments", subtitle: "Bookings, deliveries, payouts, and deals", anchor: "commerce" },
  live: { title: "Live & Streaming", subtitle: "When followed creators go live", anchor: "live" },
  wellness: { title: "Wellness & Health", subtitle: "Reminders for activity, meds, and appointments", anchor: "wellness" },
  creator: { title: "Creator & Career", subtitle: "Jobs, monetization, and audience updates", anchor: "creator" },
};

const GROUP_ORDER: CategoryGroup[] = ["account", "social", "commerce", "live", "wellness", "creator"];

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  // Account & Security
  { id: "security_alerts", label: "Security Alerts", description: "New sign-ins, password changes, and 2FA activity", icon: ShieldCheck, defaultEnabled: true, group: "account" },
  { id: "verification_updates", label: "Verification Updates", description: "Status changes for your verified badge requests", icon: BadgeCheck, defaultEnabled: true, group: "account" },
  { id: "announcements", label: "Announcements", description: "New features, service updates, and platform news", icon: Info, defaultEnabled: false, group: "account" },

  // Social & Activity
  { id: "chat_messages", label: "Chat & Support", description: "Replies to your support tickets and chat messages", icon: MessageSquare, defaultEnabled: true, group: "social" },
  { id: "social_interactions", label: "Social Interactions", description: "Mentions, comments, friend requests, and follows", icon: UserPlus, defaultEnabled: true, group: "social" },

  // Orders & Payments
  { id: "order_updates", label: "Order Updates", description: "Status changes, delivery tracking, and confirmations", icon: Package, defaultEnabled: true, group: "commerce" },
  { id: "booking_travel", label: "Booking & Travel", description: "Trip reminders, check-in alerts, and itinerary changes", icon: Plane, defaultEnabled: true, group: "commerce" },
  { id: "price_alerts", label: "Price Alerts", description: "Notifications when tracked prices drop", icon: Tag, defaultEnabled: true, group: "commerce" },
  { id: "rewards", label: "Rewards & Loyalty", description: "Points earned, tier upgrades, and referral rewards", icon: Crown, defaultEnabled: true, group: "commerce" },
  { id: "promotions", label: "Deals & Promotions", description: "Exclusive offers, flash sales, and seasonal deals", icon: Gift, defaultEnabled: false, group: "commerce" },

  // Live & Streaming
  { id: "live_streams", label: "Live & Streams", description: "When followed creators go live or start audio spaces", icon: Tv, defaultEnabled: true, group: "live" },

  // Wellness & Health
  { id: "wellness_reminders", label: "Wellness Reminders", description: "Daily activity, hydration, sleep, and goal nudges", icon: Activity, defaultEnabled: false, group: "wellness" },
  { id: "medication_reminders", label: "Medication Reminders", description: "Reminders to take and refill medications", icon: Pill, defaultEnabled: false, group: "wellness" },
  { id: "appointment_reminders", label: "Appointment Reminders", description: "Telehealth visits, bookings, and scheduled events", icon: Calendar, defaultEnabled: true, group: "wellness" },

  // Creator & Career
  { id: "job_alerts", label: "Job Alerts", description: "New job matches, application updates, and interview reminders", icon: Briefcase, defaultEnabled: true, group: "creator" },
  { id: "creator_updates", label: "Creator & Monetization", description: "Payouts, brand deals, content milestones, and analytics", icon: Rocket, defaultEnabled: true, group: "creator" },
  { id: "earnings_payouts", label: "Earnings & Payouts", description: "Driver, shop, and creator payment notifications", icon: DollarSign, defaultEnabled: true, group: "creator" },
];

const PREFS_KEY = "zivo_notification_prefs";

const TIME_OPTIONS = [
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "22:00", label: "10:00 PM" },
  { value: "23:00", label: "11:00 PM" },
  { value: "00:00", label: "12:00 AM" },
];

const END_TIME_OPTIONS = [
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
];

// Format phone number for display (masked when verified)
function formatPhoneDisplay(phone: string | null): string {
  if (!phone) return "";
  // Simple format: +1 (555) 123-4567
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

// Mask phone for display after verification
function maskPhoneDisplay(phone: string | null): string {
  if (!phone) return "•••-•••-••••";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length >= 4) {
    return `***-***-${cleaned.slice(-4)}`;
  }
  return "•••";
}

const SMS_CONSENT_TEXT = "I agree to receive SMS notifications from ZIVO for order updates, support, and alerts. Standard message rates may apply. Reply STOP to unsubscribe at any time.";

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    isSupported,
    permission,
    isConfigured,
    subscription,
    subscribe,
    unsubscribe,
    sendTestNotification,
    isLoading: pushLoading,
    error: pushError,
  } = useWebPush();

  // Notification preferences from database
  const { data: prefs, isLoading: prefsLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const { data: profile } = useUserProfile();

  // Local preferences for categories
  const [preferences, setPreferences] = useState<Record<string, boolean>>(() => {
    const fallback = NOTIFICATION_CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = cat.defaultEnabled;
      return acc;
    }, {} as Record<string, boolean>);
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>;
        return { ...fallback, ...parsed };
      }
    } catch (e) {
      console.warn("Failed to parse notification preferences:", e);
    }
    return fallback;
  });

  // Phone verification
  const [phoneInput, setPhoneInput] = useState("");
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  
  // SMS consent
  const [smsConsentChecked, setSmsConsentChecked] = useState(false);
  
  // Quiet hours
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState("22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("08:00");

  // Re-enable SMS after opt-out
  const reenableSMS = useReenableSMS();

  // Sync phone from profile
  useEffect(() => {
    if (profile?.phone_e164) {
      setPhoneInput(profile.phone_e164);
    }
  }, [profile]);

  // Sync quiet hours from prefs
  useEffect(() => {
    if (prefs) {
      setQuietHoursEnabled(prefs.quietHoursEnabled ?? false);
      setQuietHoursStart(prefs.quietHoursStart ?? "22:00");
      setQuietHoursEnd(prefs.quietHoursEnd ?? "08:00");
      setSmsConsentChecked(!!prefs.smsConsentAt);
    }
  }, [prefs]);

  // Hash-anchor scrolling (e.g. /account/notifications#live)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.replace("#", "");
    if (!hash) return;
    const t = setTimeout(() => {
      document.getElementById(`notif-group-${hash}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // Group categories for sectioned rendering
  const groupedCategories = useMemo(() => {
    const map: Record<CategoryGroup, NotificationCategory[]> = {
      account: [], social: [], commerce: [], live: [], wellness: [], creator: [],
    };
    for (const cat of NOTIFICATION_CATEGORIES) map[cat.group].push(cat);
    return map;
  }, []);

  const persistPreferences = (next: Record<string, boolean>) => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save notification preferences:", e);
    }
  };

  const handleToggleCategory = (id: string) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, [id]: !prev[id] };
      persistPreferences(newPrefs);
      toast.success(
        newPrefs[id] ? "Notification enabled" : "Notification disabled"
      );
      return newPrefs;
    });
  };

  const handleToggleGroup = (group: CategoryGroup, enable: boolean) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev };
      for (const cat of groupedCategories[group]) {
        newPrefs[cat.id] = enable;
      }
      persistPreferences(newPrefs);
      return newPrefs;
    });
    toast.success(`${GROUP_META[group].title}: ${enable ? "all on" : "all off"}`);
  };

  const handleEnableNotifications = async () => {
    const result = await subscribe();
    if (result) {
      toast.success("Push notifications enabled!");
      updatePrefs.mutate({ inAppEnabled: true });
    }
  };

  const handleDisableNotifications = async () => {
    const result = await unsubscribe();
    if (result) {
      toast.success("Push notifications disabled");
      updatePrefs.mutate({ inAppEnabled: false });
    }
  };

  const handleTestNotification = async () => {
    await sendTestNotification();
    toast.success("Test notification sent!");
  };

  const handleToggleSMS = (enabled: boolean) => {
    updatePrefs.mutate({ smsEnabled: enabled });
  };

  const handleToggleEmail = (enabled: boolean) => {
    updatePrefs.mutate({ emailEnabled: enabled });
  };

  const handleToggleMarketing = (enabled: boolean) => {
    updatePrefs.mutate({ marketingEnabled: enabled });
  };

  const handleVerifyPhone = () => {
    // Validate phone format
    const cleaned = phoneInput.replace(/\D/g, "");
    let e164 = phoneInput;
    if (!phoneInput.startsWith("+")) {
      e164 = `+1${cleaned}`;
    }
    if (!/^\+[1-9]\d{6,14}$/.test(e164)) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setPhoneInput(e164);
    setShowPhoneDialog(true);
  };

  const getPermissionBadge = () => {
    if (!isSupported) {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Not Supported
        </Badge>
      );
    }

    switch (permission) {
      case "granted":
        return (
          <Badge className="gap-1 bg-success/10 text-success border-success/20">
            <CheckCircle2 className="w-3 h-3" />
            Enabled
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="destructive" className="gap-1">
            <BellOff className="w-3 h-3" />
            Blocked
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Bell className="w-3 h-3" />
            Not Set
          </Badge>
        );
    }
  };

  const isLoading = prefsLoading || updatePrefs.isPending;

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead title="Notification Settings – ZIVO" description="Customize push, email, and SMS notifications. Set quiet hours, manage notification channels, and control what you're notified about." />
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            title="Go back"
            className="p-2.5 -ml-2 rounded-full hover:bg-muted touch-manipulation active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Notifications</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6 max-w-2xl mx-auto">
        {/* Push Notifications Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">Push Notifications</h3>
                      {getPermissionBadge()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {permission === "granted"
                        ? "You'll receive push notifications on this device"
                        : permission === "denied"
                        ? "Notifications are blocked in your browser settings"
                        : "Enable to receive real-time updates"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                {permission !== "granted" && isSupported && (
                  <Button
                    onClick={handleEnableNotifications}
                    disabled={pushLoading || !isConfigured}
                    size="sm"
                  >
                    <BellRing className="w-4 h-4 mr-2" />
                    {pushLoading ? "Enabling..." : "Enable Notifications"}
                  </Button>
                )}

                {permission === "granted" && subscription && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleTestNotification}
                      size="sm"
                    >
                      Send Test
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDisableNotifications}
                      disabled={pushLoading}
                      size="sm"
                    >
                      <BellOff className="w-4 h-4 mr-2" />
                      Disable
                    </Button>
                  </>
                )}

                {permission === "denied" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast.info(
                        "Open your browser settings to allow notifications for this site"
                      );
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Browser Settings
                  </Button>
                )}
              </div>

              {pushError && (
                <p className="text-sm text-destructive mt-3">{pushError}</p>
              )}

              {!isConfigured && isSupported && (
                <div className="flex items-start gap-2 mt-3 p-3 bg-amber-500/10 rounded-xl text-sm">
                  <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-700 dark:text-amber-400">
                    Push notifications are being set up. This feature will be
                    available soon.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* SMS Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <NotificationChannelCard
            icon={<Smartphone className="w-5 h-5 text-primary" />}
            title="SMS Notifications"
            description="Receive critical updates via text message"
            enabled={prefs?.smsEnabled ?? false}
            onToggle={handleToggleSMS}
            isLoading={isLoading}
            verified={prefs?.phoneVerified ?? profile?.phone_verified ?? false}
            verificationRequired={true}
            onVerify={handleVerifyPhone}
            verifyLabel="Verify Phone Number"
            rateLimit="Max 5 SMS/day for critical updates only"
          >
            {/* Phone Input */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="phone" className="sr-only">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (234) 567-8900"
                  value={formatPhoneDisplay(phoneInput) || phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  disabled={prefs?.phoneVerified}
                />
              </div>
              {!prefs?.phoneVerified && phoneInput && (
                <Button
                  variant="outline"
                  onClick={handleVerifyPhone}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </Button>
              )}
            </div>
            {prefs?.phoneVerified && (
              <p className="text-xs text-success flex items-center gap-1 mt-2">
                <CheckCircle2 className="w-3 h-3" />
                Phone verified: {formatPhoneDisplay(prefs.phoneNumber)}
              </p>
            )}
          </NotificationChannelCard>
        </motion.div>

        {/* Email Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <NotificationChannelCard
            icon={<Mail className="w-5 h-5 text-primary" />}
            title="Email Notifications"
            description="Receipts, confirmations, and important updates"
            enabled={prefs?.emailEnabled ?? true}
            onToggle={handleToggleEmail}
            isLoading={isLoading}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{user?.email || profile?.email || "Not available"}</span>
              </div>
              
              {/* Marketing toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketing" className="font-medium">
                    Marketing & Promotions
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Deals, offers, and travel inspiration
                  </p>
                </div>
                <Switch
                  id="marketing"
                  checked={prefs?.marketingEnabled ?? false}
                  onCheckedChange={handleToggleMarketing}
                  disabled={isLoading}
                />
              </div>
            </div>
          </NotificationChannelCard>
        </motion.div>

        {/* Notification Categories */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
            Notification Types
          </h3>
          <div className="space-y-4">
            {GROUP_ORDER.map((groupKey) => {
              const cats = groupedCategories[groupKey];
              if (cats.length === 0) return null;
              const meta = GROUP_META[groupKey];
              const allOn = cats.every((c) => preferences[c.id]);
              const anyOn = cats.some((c) => preferences[c.id]);
              return (
                <section
                  key={groupKey}
                  id={`notif-group-${meta.anchor}`}
                  className="scroll-mt-24"
                >
                  <div className="flex items-baseline justify-between px-1 mb-1.5">
                    <div>
                      <h4 className="text-[13px] font-semibold text-foreground">{meta.title}</h4>
                      <p className="text-[11px] text-muted-foreground">{meta.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleGroup(groupKey, !allOn)}
                      className="text-[11px] font-medium text-primary hover:underline shrink-0"
                    >
                      {allOn ? "Disable all" : anyOn ? "Enable all" : "Enable all"}
                    </button>
                  </div>
                  <Card>
                    <CardContent className="p-0 divide-y divide-border">
                      {cats.map((category) => {
                        const Icon = category.icon;
                        return (
                          <div
                            key={category.id}
                            className="flex items-center justify-between p-4"
                          >
                            <div className="flex items-start gap-3">
                              <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                              <div>
                                <Label
                                  htmlFor={category.id}
                                  className="font-medium cursor-pointer"
                                >
                                  {category.label}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {category.description}
                                </p>
                              </div>
                            </div>
                            <Switch
                              id={category.id}
                              checked={preferences[category.id]}
                              onCheckedChange={() => handleToggleCategory(category.id)}
                            />
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </section>
              );
            })}
          </div>
        </motion.div>

        {/* Automated Messages */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
            Automated Messages
          </h3>
          <Card>
            <CardContent className="p-0">
              {/* Master toggle */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-start gap-3">
                  <BellRing className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <Label htmlFor="automated_master" className="font-medium cursor-pointer">
                      Automated Reminders
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cart reminders, re-engagement offers, and birthday rewards
                    </p>
                  </div>
                </div>
                <Switch
                  id="automated_master"
                  checked={prefs?.automatedMessagesEnabled ?? true}
                  onCheckedChange={(enabled) =>
                    updatePrefs.mutate({ automatedMessagesEnabled: enabled })
                  }
                  disabled={isLoading}
                />
              </div>

              {/* Sub-toggles (only shown when master is on) */}
              {(prefs?.automatedMessagesEnabled ?? true) && (
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between p-4 pl-12">
                    <div>
                      <Label htmlFor="auto_cart" className="font-medium cursor-pointer">
                        Cart Reminders
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Remind me about unfinished orders
                      </p>
                    </div>
                    <Switch
                      id="auto_cart"
                      checked={prefs?.automatedCartReminders ?? true}
                      onCheckedChange={(enabled) =>
                        updatePrefs.mutate({ automatedCartReminders: enabled })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 pl-12">
                    <div>
                      <Label htmlFor="auto_reengage" className="font-medium cursor-pointer">
                        Re-engagement Offers
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Special offers when I haven't ordered in a while
                      </p>
                    </div>
                    <Switch
                      id="auto_reengage"
                      checked={prefs?.automatedReengagement ?? true}
                      onCheckedChange={(enabled) =>
                        updatePrefs.mutate({ automatedReengagement: enabled })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 pl-12">
                    <div>
                      <Label htmlFor="auto_birthday" className="font-medium cursor-pointer">
                        Birthday & Special Events
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Birthday coupons and seasonal gifts
                      </p>
                    </div>
                    <Switch
                      id="auto_birthday"
                      checked={prefs?.automatedBirthday ?? true}
                      onCheckedChange={(enabled) =>
                        updatePrefs.mutate({ automatedBirthday: enabled })
                      }
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Mobile App Prompt */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <InstallAppCard />
        </motion.div>

        {/* Help Text */}
        <div className="px-1">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              SMS and email preferences are synced across all your devices.
              Push notification settings are device-specific.
            </p>
          </div>
        </div>
      </div>

      {/* Phone Verification Dialog */}
      <PhoneVerificationDialog
        open={showPhoneDialog}
        onOpenChange={setShowPhoneDialog}
        phoneNumber={phoneInput}
        onVerified={() => {
          updatePrefs.mutate({ smsEnabled: true, phoneNumber: phoneInput });
        }}
      />
    </div>
  );
}
