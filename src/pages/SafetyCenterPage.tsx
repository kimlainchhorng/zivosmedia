import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Shield, Eye, EyeOff, Clock, AlertTriangle, Lock, UserX,
  MessageSquareOff, Filter, Baby, ShieldCheck, Bell, RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { generateSalt, hashSecret } from "@/lib/auth/passwordHash";

const STORAGE_KEY = "zivo_safety_prefs";

type ScreenTime = "none" | "30m" | "1h" | "2h" | "4h";
type ContentFilter = "relaxed" | "standard" | "strict";
type SyncState = "loading" | "synced" | "fallback" | "local";

interface SafetyToggle {
  id: string;
  label: string;
  description: string;
  icon: any;
  enabled: boolean;
  category: string;
}

interface PersistedSafetyState {
  toggles: Record<string, boolean>;
  screenTime: ScreenTime;
  contentFilter: ContentFilter;
  hasPin: boolean;
}

interface ParentalSafetyRow {
  toggles: Record<string, unknown> | null;
  screen_time: string | null;
  content_filter: string | null;
  pin_hash: string | null;
  pin_salt: string | null;
  updated_at: string | null;
}

const DEFAULT_TOGGLES: SafetyToggle[] = [
  { id: "restricted", label: "Restricted Mode", description: "Hide potentially sensitive content", icon: Eye, enabled: false, category: "content" },
  { id: "sensitive", label: "Sensitive Content Filter", description: "Blur images flagged as sensitive", icon: EyeOff, enabled: true, category: "content" },
  { id: "dm_filter", label: "Message Requests Filter", description: "Filter messages from unknown users", icon: MessageSquareOff, enabled: true, category: "privacy" },
  { id: "block_strangers", label: "Block Unknown Contacts", description: "Only friends can message you", icon: UserX, enabled: false, category: "privacy" },
  { id: "hide_activity", label: "Hide Activity Status", description: "Don't show when you're online", icon: Clock, enabled: false, category: "privacy" },
  { id: "parental", label: "Parental Controls", description: "Require PIN for age-restricted content", icon: Baby, enabled: false, category: "parental" },
  { id: "safe_search", label: "Safe Search", description: "Filter explicit content from search", icon: Filter, enabled: true, category: "content" },
  { id: "login_alerts", label: "Login Alerts", description: "Get notified of new device logins", icon: Bell, enabled: true, category: "security" },
];

const DEFAULT_TOGGLE_MAP = Object.fromEntries(DEFAULT_TOGGLES.map((toggle) => [toggle.id, toggle.enabled]));

const SCREEN_TIME_OPTIONS: Array<{ value: ScreenTime; label: string; reminder: string }> = [
  { value: "none", label: "None", reminder: "" },
  { value: "30m", label: "30 min", reminder: "30 minutes" },
  { value: "1h", label: "1 hour", reminder: "1 hour" },
  { value: "2h", label: "2 hours", reminder: "2 hours" },
  { value: "4h", label: "4 hours", reminder: "4 hours" },
];

const CONTENT_FILTER_OPTIONS: Array<{ value: ContentFilter; label: string; desc: string }> = [
  { value: "relaxed", label: "Relaxed", desc: "Light filtering" },
  { value: "standard", label: "Standard", desc: "Recommended" },
  { value: "strict", label: "Strict", desc: "Maximum safety" },
];

function normalizeScreenTime(value: unknown): ScreenTime {
  const aliases: Record<string, ScreenTime> = {
    none: "none",
    "30": "30m",
    "30m": "30m",
    "60": "1h",
    "1h": "1h",
    "120": "2h",
    "2h": "2h",
    "180": "4h",
    "4h": "4h",
  };
  return typeof value === "string" && aliases[value] ? aliases[value] : "none";
}

function normalizeContentFilter(value: unknown): ContentFilter {
  if (value === "off") return "relaxed";
  if (value === "relaxed" || value === "standard" || value === "strict") return value;
  return "standard";
}

function readToggleMap(value: unknown): Record<string, boolean> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { ...DEFAULT_TOGGLE_MAP };
  const entries = Object.entries(value as Record<string, unknown>);
  const valid = entries.every(([key, enabled]) => key.length > 0 && typeof enabled === "boolean");
  return valid ? Object.fromEntries(entries) as Record<string, boolean> : { ...DEFAULT_TOGGLE_MAP };
}

function defaultSafetyState(): PersistedSafetyState {
  return {
    toggles: { ...DEFAULT_TOGGLE_MAP },
    screenTime: "none",
    contentFilter: "standard",
    hasPin: false,
  };
}

function loadPrefs(): PersistedSafetyState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      toggles: readToggleMap(parsed.toggles),
      screenTime: normalizeScreenTime(parsed.screenTime),
      contentFilter: normalizeContentFilter(parsed.contentFilter),
      hasPin: parsed.hasPin === true,
    };
  } catch {
    return null;
  }
}

function savePrefs(prefs: PersistedSafetyState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* private mode / restricted storage */ }
}

function hydrateToggles(toggleMap: Record<string, boolean>): SafetyToggle[] {
  return DEFAULT_TOGGLES.map((toggle) => ({ ...toggle, enabled: toggleMap[toggle.id] ?? toggle.enabled }));
}

function toggleMapFrom(toggles: SafetyToggle[]): Record<string, boolean> {
  return Object.fromEntries(toggles.map((toggle) => [toggle.id, toggle.enabled]));
}

function stateFromRow(row: ParentalSafetyRow): PersistedSafetyState {
  return {
    toggles: readToggleMap(row.toggles),
    screenTime: normalizeScreenTime(row.screen_time),
    contentFilter: normalizeContentFilter(row.content_filter),
    hasPin: Boolean(row.pin_hash && row.pin_salt),
  };
}

export default function SafetyCenterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initialPrefs = loadPrefs() ?? defaultSafetyState();

  const [screenTimeLimit, setScreenTimeLimit] = useState<ScreenTime>(initialPrefs.screenTime);
  const [contentFilter, setContentFilter] = useState<ContentFilter>(initialPrefs.contentFilter);
  const [pin, setPin] = useState("");
  const [hasPin, setHasPin] = useState(initialPrefs.hasPin);
  const [pinHash, setPinHash] = useState<string | null>(null);
  const [pinSalt, setPinSalt] = useState<string | null>(null);
  const [toggles, setToggles] = useState<SafetyToggle[]>(() => hydrateToggles(initialPrefs.toggles));
  const [syncState, setSyncState] = useState<SyncState>(user?.id ? "loading" : "local");
  const [saving, setSaving] = useState(false);
  const [hashingPin, setHashingPin] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [syncAttempt, setSyncAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setSyncState("local");
      return () => { cancelled = true; };
    }

    setSyncState("loading");
    const loadServerState = async () => {
      const client = supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (column: string, value: string) => {
              maybeSingle: () => Promise<{ data: ParentalSafetyRow | null; error: { message?: string } | null }>;
            };
          };
        };
      };
      const { data, error } = await client
        .from("parental_safety_settings")
        .select("toggles, screen_time, content_filter, pin_hash, pin_salt, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setSyncState("fallback");
        return;
      }

      // A successful empty read means the account has no server settings. Do
      // not treat a legacy localStorage hasPin boolean as a real verifier.
      const next = data ? stateFromRow(data) : defaultSafetyState();
      setToggles(hydrateToggles(next.toggles));
      setScreenTimeLimit(next.screenTime);
      setContentFilter(next.contentFilter);
      setHasPin(next.hasPin);
      setPinHash(data?.pin_hash && data.pin_salt ? data.pin_hash : null);
      setPinSalt(data?.pin_hash && data.pin_salt ? data.pin_salt : null);
      savePrefs(next);
      setSyncState("synced");
    };

    void loadServerState();
    return () => { cancelled = true; };
  }, [user?.id, syncAttempt]);

  const busy = saving || hashingPin || syncState === "loading";

  const currentState = (overrides: Partial<PersistedSafetyState> = {}): PersistedSafetyState => ({
    toggles: overrides.toggles ?? toggleMapFrom(toggles),
    screenTime: overrides.screenTime ?? screenTimeLimit,
    contentFilter: overrides.contentFilter ?? contentFilter,
    hasPin: overrides.hasPin ?? hasPin,
  });

  const persistState = async (
    next: PersistedSafetyState,
    options: {
      action?: "upsert" | "update" | "delete";
      clearPin?: boolean;
      verifier?: { hash: string; salt: string } | null;
    } = {},
  ): Promise<boolean> => {
    savePrefs(next);

    if (!user?.id) {
      setSyncState("local");
      return true;
    }

    if (syncState !== "synced") {
      if (syncState === "fallback") {
        toast.message("Saved on this device. Account sync will retry when connected.");
      }
      return false;
    }

    const action = options.action ?? "upsert";
    const verifier = options.verifier ?? (pinHash && pinSalt ? { hash: pinHash, salt: pinSalt } : null);
    if (action === "upsert" && next.hasPin && !verifier) {
      setSyncState("fallback");
      toast.error("Your PIN needs to be saved again before account sync can continue.");
      return false;
    }

    setSaving(true);
    try {
      const body = action === "delete"
        ? { resource: "parental", action: "delete" }
        : action === "update"
          ? {
              resource: "parental",
              action: "update",
              toggles: next.toggles,
              screen_time: next.screenTime,
              content_filter: next.contentFilter,
              ...(options.clearPin ? { clear_pin: true } : {}),
            }
          : {
              resource: "parental",
              action: "upsert",
              toggles: next.toggles,
              screen_time: next.screenTime,
              content_filter: next.contentFilter,
              ...(next.hasPin && verifier ? { pin_hash: verifier.hash, pin_salt: verifier.salt } : {}),
            };

      const { error } = await supabase.functions.invoke("account-security-settings", { body });
      if (error) throw error;
      setSyncState("synced");
      return true;
    } catch {
      setSyncState("fallback");
      toast.error("Saved on this device, but account sync is unavailable.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleScreenTimeChange = (value: string) => {
    if (!SCREEN_TIME_OPTIONS.some((option) => option.value === value)) return;
    const nextValue = value as ScreenTime;
    setScreenTimeLimit(nextValue);
    void persistState(currentState({ screenTime: nextValue }));
  };

  const handleContentFilterChange = (value: ContentFilter) => {
    setContentFilter(value);
    void persistState(currentState({ contentFilter: value }));
  };

  const handleSavePin = async () => {
    if (pin.length !== 4 || busy) return;
    setHashingPin(true);
    try {
      const salt = generateSalt();
      const hash = await hashSecret(pin, salt);
      const next = currentState({ hasPin: true });
      setHasPin(true);
      setPinHash(hash);
      setPinSalt(salt);
      setPin("");
      const synced = await persistState(next, { verifier: { hash, salt } });
      if (synced || !user?.id) toast.success("PIN saved");
    } catch {
      toast.error("Could not save the PIN. Try again.");
    } finally {
      setHashingPin(false);
    }
  };

  const handleClearPin = async () => {
    if (!hasPin || busy) return;
    const nextToggles = toggles.map((toggle) => toggle.id === "parental" ? { ...toggle, enabled: false } : toggle);
    const next = currentState({ toggles: toggleMapFrom(nextToggles), hasPin: false });
    setHasPin(false);
    setPinHash(null);
    setPinSalt(null);
    setToggles(nextToggles);
    const synced = await persistState(next, { action: "update", clearPin: true, verifier: null });
    if (synced || !user?.id) toast.success("PIN removed and parental controls turned off");
  };

  const toggleSetting = (id: string) => {
    if (busy) return;
    const current = toggles.find((toggle) => toggle.id === id);
    if (!current) return;
    const newState = !current.enabled;
    if (id === "parental" && newState && !hasPin) {
      toast.error("Set a PIN first to enable parental controls");
      return;
    }
    const nextToggles = toggles.map((toggle) => toggle.id === id ? { ...toggle, enabled: newState } : toggle);
    setToggles(nextToggles);
    void persistState(currentState({ toggles: toggleMapFrom(nextToggles) }));
  };

  const resetAllSettings = async () => {
    const next = defaultSafetyState();
    setToggles(hydrateToggles(next.toggles));
    setScreenTimeLimit(next.screenTime);
    setContentFilter(next.contentFilter);
    setHasPin(false);
    setPinHash(null);
    setPinSalt(null);
    setPin("");
    setResetDialogOpen(false);
    const synced = await persistState(next, { action: "delete", verifier: null });
    if (synced || !user?.id) toast.success("Safety settings reset");
  };

  const categories = [
    { key: "content", label: "Content Safety", icon: Filter },
    { key: "privacy", label: "Privacy", icon: Lock },
    { key: "parental", label: "Parental Controls", icon: Baby },
    { key: "security", label: "Security", icon: ShieldCheck },
  ];

  const syncLabel = syncState === "loading"
    ? "Checking account sync…"
    : syncState === "synced"
      ? "Synced to your account"
      : syncState === "fallback"
        ? "Device fallback"
        : "Device only";

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-ig-gradient">Safety Center</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant={syncState === "synced" ? "secondary" : "outline"} className="text-[10px] whitespace-nowrap">
              {syncLabel}
            </Badge>
            {syncState === "fallback" && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Retry account sync"
                className="h-8 w-8"
                onClick={() => setSyncAttempt((attempt) => attempt + 1)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Screen Time */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
            <Clock className="h-4 w-4" /> Screen Time
          </h2>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3 gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Daily Limit</p>
                <p className="text-xs text-muted-foreground">Set a daily usage reminder</p>
              </div>
              <Select disabled={busy} value={screenTimeLimit} onValueChange={handleScreenTimeChange}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCREEN_TIME_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {screenTimeLimit !== "none" && (
              <Badge variant="secondary" className="text-xs">
                Reminder after {SCREEN_TIME_OPTIONS.find((option) => option.value === screenTimeLimit)?.reminder}
              </Badge>
            )}
          </Card>
        </motion.div>

        {/* Content Filter Level */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
            <Filter className="h-4 w-4" /> Content Filter Level
          </h2>
          <Card className="p-4">
            <div className="flex gap-2">
              {CONTENT_FILTER_OPTIONS.map((level) => (
                <button
                  type="button"
                  key={level.value}
                  disabled={busy}
                  aria-pressed={contentFilter === level.value}
                  onClick={() => handleContentFilterChange(level.value)}
                  className={`flex-1 p-3 rounded-lg text-center border transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${contentFilter === level.value ? "border-primary bg-primary/10" : "border-border"}`}
                >
                  <p className="text-sm font-medium text-foreground">{level.label}</p>
                  <p className="text-xs text-muted-foreground">{level.desc}</p>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Parental PIN */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
            <Lock className="h-4 w-4" /> Parental PIN
          </h2>
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                placeholder={hasPin ? "Change PIN" : "Set 4-digit PIN"}
                value={pin}
                disabled={busy}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-40"
              />
              <Button type="button" size="sm" disabled={pin.length !== 4 || busy} onClick={handleSavePin}>
                {hashingPin ? "Hashing…" : hasPin ? "Update" : "Save"}
              </Button>
            </div>
            {hasPin && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">PIN active</Badge>
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={handleClearPin} className="h-7 px-2 text-xs text-muted-foreground">
                  Remove PIN
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              The PIN is hashed on this device before account sync. Raw digits never leave your device.
            </p>
          </Card>
        </motion.div>

        {/* Toggle Categories */}
        {categories.map((cat, ci) => (
          <motion.div key={cat.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + ci * 0.05 }}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
              <cat.icon className="h-4 w-4" /> {cat.label}
            </h2>
            <Card className="divide-y divide-border">
              {toggles.filter((toggle) => toggle.category === cat.key).map((toggle) => (
                <div key={toggle.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <toggle.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{toggle.label}</p>
                      <p className="text-xs text-muted-foreground">{toggle.description}</p>
                    </div>
                  </div>
                  <Switch disabled={busy} checked={toggle.enabled} onCheckedChange={() => toggleSetting(toggle.id)} />
                </div>
              ))}
            </Card>
          </motion.div>
        ))}

        {/* Emergency */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="p-4 border-destructive/20 bg-destructive/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-semibold text-foreground">Emergency Resources</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">If you or someone you know needs help:</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Crisis Text Line: Text HOME to 741741</p>
              <p>• National Suicide Prevention: 988</p>
              <p>• Emergency Services: 911</p>
            </div>
          </Card>
        </motion.div>

        {/* Server delete path */}
        <Card className="p-4 border-destructive/20">
          <div className="flex items-start gap-3">
            <RotateCcw className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Reset safety settings</p>
              <p className="text-xs text-muted-foreground mt-1">Remove the account copy and clear this device's fallback settings.</p>
              <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="mt-3 text-destructive border-destructive/30 hover:bg-destructive/10" disabled={busy}>
                    Reset all settings
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all safety settings?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the saved PIN and all Safety Center preferences from your account and this device.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep settings</AlertDialogCancel>
                    <AlertDialogAction onClick={resetAllSettings} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Reset settings
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
