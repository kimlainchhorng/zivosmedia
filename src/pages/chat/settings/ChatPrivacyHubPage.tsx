/**
 * ChatPrivacyHubPage — One-stop chat privacy, security & notification hub.
 *
 * Privacy choices (read receipts, last seen, who-can-call, who-can-message)
 * persist server-side via `usePrivacy` → `user_privacy_settings`, so they sync
 * across devices. Notification display toggles stay device-local (notification
 * behaviour is intentionally per-device). Blocked users come from `blocked_users`.
 */
import { useEffect, useState } from "react";
import { useSmartBack } from "@/lib/smartBack";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Bell from "lucide-react/dist/esm/icons/bell";
import Eye from "lucide-react/dist/esm/icons/eye";
import Clock from "lucide-react/dist/esm/icons/clock";
import Phone from "lucide-react/dist/esm/icons/phone";
import ShieldOff from "lucide-react/dist/esm/icons/shield-off";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Navigation from "lucide-react/dist/esm/icons/navigation";
import Smartphone from "lucide-react/dist/esm/icons/smartphone";
import KeyRound from "lucide-react/dist/esm/icons/key-round";
import Lock from "lucide-react/dist/esm/icons/lock";
import { useLocationSharePrefs } from "@/hooks/useLocationSharePrefs";
import { usePrivacy, type PrivacyChoice } from "@/hooks/usePrivacy";
import { useSessions } from "@/hooks/useSessions";
import { useTwoStep } from "@/hooks/useTwoStep";
import { usePasscode } from "@/hooks/usePasscode";

/** Notification display toggles — intentionally device-local. */
interface DevicePrefs {
  notifPreviews: boolean;
  notifSound: boolean;
}

type BlockedProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type BlockedRow = {
  blocked_id: string;
  created_at: string;
  profiles: BlockedProfile | null;
};

type RowIcon = React.ComponentType<{ className?: string }>;

const dbFrom = (table: string): any => (supabase as any).from(table);

const DEVICE_DEFAULTS: DevicePrefs = {
  notifPreviews: true,
  notifSound: true,
};

function loadDevicePrefs(uid?: string): DevicePrefs {
  try {
    const raw = localStorage.getItem(`zivo:chat-notif:${uid || "anon"}`);
    return raw ? { ...DEVICE_DEFAULTS, ...JSON.parse(raw) } : { ...DEVICE_DEFAULTS };
  } catch {
    return { ...DEVICE_DEFAULTS };
  }
}
function saveDevicePrefs(uid: string | undefined, p: DevicePrefs) {
  try {
    localStorage.setItem(`zivo:chat-notif:${uid || "anon"}`, JSON.stringify(p));
  } catch {
    // Ignore storage write errors in private mode / quota-exceeded scenarios.
  }
}

/** Generic visibility selector row — decoupled from where the value lives. */
function VisRow({ icon: Icon, label, value, onChange, disabled }: {
  icon: RowIcon; label: string; value: PrivacyChoice; onChange: (v: PrivacyChoice) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as PrivacyChoice)}
        className="text-xs bg-muted/50 rounded-lg px-2 py-1.5 border border-border/40 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="everyone">Everyone</option>
        <option value="contacts">Contacts</option>
        <option value="nobody">Nobody</option>
      </select>
    </div>
  );
}

/** Generic toggle row — decoupled from where the value lives. */
function ToggleRow({ icon: Icon, label, checked, onChange, sub, disabled }: {
  icon: RowIcon; label: string; checked: boolean; onChange: (v: boolean) => void; sub?: string; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <div className="text-sm font-medium">{label}</div>
          {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
        </div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(v)} />
    </div>
  );
}

export default function ChatPrivacyHubPage() {
  const nav = useNavigate();
  const goBack = useSmartBack("/chat");
  const { user } = useAuth();
  const qc = useQueryClient();

  // Server-backed privacy matrix (syncs across devices).
  const { settings, loading: privacyLoading, update: updatePrivacy } = usePrivacy();
  // Device-local notification display prefs.
  const [device, setDevice] = useState<DevicePrefs>(() => loadDevicePrefs(user?.id));
  const { prefs: locPrefs, update: updateLocPrefs } = useLocationSharePrefs();
  // Security shortcut status.
  const { sessions } = useSessions();
  const { isEnabled: twoStepOn } = useTwoStep();
  const { isEnabled: passcodeOn } = usePasscode();

  useEffect(() => { setDevice(loadDevicePrefs(user?.id)); }, [user?.id]);

  const updateDevice = <K extends keyof DevicePrefs>(k: K, v: DevicePrefs[K]) => {
    setDevice((prev) => {
      const next = { ...prev, [k]: v };
      saveDevicePrefs(user?.id, next);
      return next;
    });
  };

  const { data: blocked = [] } = useQuery({
    queryKey: ["blocked-users", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await dbFrom("blocked_users")
        .select("blocked_id, created_at, profiles:blocked_id(id, full_name, username, avatar_url)")
        .eq("blocker_id", user!.id)
        .order("created_at", { ascending: false });
      return (data || []) as BlockedRow[];
    },
  });

  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const unblock = async (id: string) => {
    if (unblockingId) return;
    setUnblockingId(id);
    const { error } = await supabase.functions.invoke("block-user-manage", {
      body: { action: "unblock", blocked_id: id },
    });
    if (error) { toast.error("Could not unblock"); setUnblockingId(null); return; }
    toast.success("Unblocked");
    qc.invalidateQueries({ queryKey: ["blocked-users", user?.id] });
    setUnblockingId(null);
  };

  const SecurityRow = ({ icon: Icon, label, value, to }: { icon: RowIcon; label: string; value: string; to: string }) => (
    <button
      type="button"
      onClick={() => nav(to)}
      className="w-full flex items-center gap-3 py-3 px-4 text-left hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground truncate">{value}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 pt-safe px-3 py-3 flex items-center gap-2">
        <button type="button" onClick={goBack} aria-label="Back" className="p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Privacy &amp; Security</h1>
      </header>

      <section className="mt-3">
        <h2 className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">Security</h2>
        <div className="bg-card/60 rounded-xl mx-3 divide-y divide-border/30 overflow-hidden">
          <SecurityRow icon={Smartphone} label="Active sessions" value={`${sessions.length} device${sessions.length === 1 ? "" : "s"} signed in`} to="/chat/settings/sessions" />
          <SecurityRow icon={KeyRound} label="Two-step verification" value={twoStepOn ? "On" : "Off"} to="/chat/settings/two-step" />
          <SecurityRow icon={Lock} label="App passcode" value={passcodeOn ? "On" : "Off"} to="/chat/settings/passcode" />
          <SecurityRow icon={Bell} label="Login alerts" value="Recent security events" to="/chat/settings/login-alerts" />
        </div>
      </section>

      <section className="mt-4">
        <h2 className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">Notifications · this device</h2>
        <div className="bg-card/60 rounded-xl mx-3 divide-y divide-border/30">
          <ToggleRow icon={Bell} label="Show message preview" checked={device.notifPreviews} onChange={(v) => updateDevice("notifPreviews", v)} sub="Display sender and text" />
          <ToggleRow icon={MessageSquare} label="Notification sound" checked={device.notifSound} onChange={(v) => updateDevice("notifSound", v)} />
        </div>
      </section>

      <section className="mt-4">
        <h2 className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">Privacy · synced</h2>
        <div className="bg-card/60 rounded-xl mx-3 divide-y divide-border/30">
          {privacyLoading || !settings ? (
            <div className="divide-y divide-border/30" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted/60 animate-pulse" />
                    <div className="h-3.5 w-32 rounded bg-muted/60 animate-pulse" />
                  </div>
                  <div className="h-6 w-16 rounded-lg bg-muted/50 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <ToggleRow icon={Eye} label="Read receipts" checked={settings.read_receipts} onChange={(v) => updatePrivacy({ read_receipts: v })} sub="Let others see when you've read" />
              <VisRow icon={Clock} label="Last seen" value={settings.last_seen} onChange={(v) => updatePrivacy({ last_seen: v })} />
              <VisRow icon={Phone} label="Who can call me" value={settings.calls} onChange={(v) => updatePrivacy({ calls: v })} />
              <VisRow icon={MessageSquare} label="Who can message me" value={settings.messages} onChange={(v) => updatePrivacy({ messages: v })} />
            </>
          )}
        </div>
      </section>

      <section className="mt-4">
        <h2 className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">Location sharing</h2>
        <div className="bg-card/60 rounded-xl mx-3 divide-y divide-border/30">
          <div className="flex items-center justify-between py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">Show street address</div>
                <div className="text-[11px] text-muted-foreground">Look up address from coordinates in shared location cards</div>
              </div>
            </div>
            <Switch checked={locPrefs.showAddress} onCheckedChange={(v) => updateLocPrefs("showAddress", v)} />
          </div>
          <div className="flex items-center justify-between py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
                <Navigation className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">Show route from my location</div>
                <div className="text-[11px] text-muted-foreground">Distance and rough ETA — uses your device location</div>
              </div>
            </div>
            <Switch checked={locPrefs.showRoute} onCheckedChange={(v) => updateLocPrefs("showRoute", v)} />
          </div>
        </div>
        <p className="px-4 mt-2 text-[10.5px] text-muted-foreground/80 leading-snug">
          Off by default for privacy. Address lookups use OpenStreetMap and are cached on this device for 7 days.
        </p>
      </section>

      <section className="mt-4">
        <h2 className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Blocked users</span>
          <span className="text-[11px] normal-case text-muted-foreground/70">{blocked.length}</span>
        </h2>
        <div className="bg-card/60 rounded-xl mx-3 divide-y divide-border/30">
          {blocked.length === 0 ? (
            <div className="px-4 py-6 flex items-center gap-3 text-muted-foreground">
              <ShieldOff className="w-4 h-4" />
              <span className="text-sm">No blocked users</span>
            </div>
          ) : (
            blocked.map((b) => (
              <div key={b.blocked_id} className="flex items-center gap-3 px-4 py-3">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={b.profiles?.avatar_url || ""} />
                  <AvatarFallback>{(b.profiles?.full_name || "?").slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {b.profiles?.full_name || b.profiles?.username || "Unknown"}
                  </div>
                  {b.profiles?.username && (
                    <div className="text-[11px] text-muted-foreground truncate">@{b.profiles.username}</div>
                  )}
                </div>
                <button type="button"
                  onClick={() => unblock(b.blocked_id)}
                  disabled={unblockingId === b.blocked_id}
                  className="text-xs font-medium text-primary px-3 py-1.5 rounded-full hover:bg-primary/10 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unblockingId === b.blocked_id ? "Unblocking…" : "Unblock"}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
