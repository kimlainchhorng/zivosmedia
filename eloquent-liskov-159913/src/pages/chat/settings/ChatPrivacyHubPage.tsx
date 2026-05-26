/**
 * ChatPrivacyHubPage — One-stop chat privacy & notification preferences.
 * Toggles persist via localStorage; blocked users come from `blocked_users`.
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
import Bell from "lucide-react/dist/esm/icons/bell";
import Eye from "lucide-react/dist/esm/icons/eye";
import Clock from "lucide-react/dist/esm/icons/clock";
import Phone from "lucide-react/dist/esm/icons/phone";
import ShieldOff from "lucide-react/dist/esm/icons/shield-off";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Navigation from "lucide-react/dist/esm/icons/navigation";
import { useLocationSharePrefs } from "@/hooks/useLocationSharePrefs";

type Visibility = "everyone" | "contacts" | "nobody";

interface Prefs {
  notifPreviews: boolean;
  notifSound: boolean;
  readReceipts: boolean;
  lastSeen: Visibility;
  whoCanCall: Visibility;
  whoCanMessage: Visibility;
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

const DEFAULTS: Prefs = {
  notifPreviews: true,
  notifSound: true,
  readReceipts: true,
  lastSeen: "everyone",
  whoCanCall: "everyone",
  whoCanMessage: "everyone",
};

function loadPrefs(uid?: string): Prefs {
  try {
    const raw = localStorage.getItem(`zivo:chat-privacy:${uid || "anon"}`);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    // Fallback to defaults when localStorage is unavailable or corrupted.
    return { ...DEFAULTS };
  }
}
function savePrefs(uid: string | undefined, p: Prefs) {
  try {
    localStorage.setItem(`zivo:chat-privacy:${uid || "anon"}`, JSON.stringify(p));
  } catch {
    // Ignore storage write errors in private mode/quota exceeded scenarios.
  }
}

export default function ChatPrivacyHubPage() {
  const nav = useNavigate();
  const goBack = useSmartBack("/chat");
  const { user } = useAuth();
  const qc = useQueryClient();
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(user?.id));
  const { prefs: locPrefs, update: updateLocPrefs } = useLocationSharePrefs();

  useEffect(() => { setPrefs(loadPrefs(user?.id)); }, [user?.id]);

  const update = <K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    savePrefs(user?.id, next);
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

  const unblock = async (id: string) => {
    const { error } = await dbFrom("blocked_users")
      .delete()
      .eq("blocker_id", user!.id)
      .eq("blocked_id", id);
    if (error) { toast.error("Could not unblock"); return; }
    toast.success("Unblocked");
    qc.invalidateQueries({ queryKey: ["blocked-users", user?.id] });
  };

  const VisRow = ({ icon: Icon, label, k }: { icon: RowIcon; label: string; k: keyof Prefs }) => (
    <div className="flex items-center justify-between py-3 px-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <select
        value={prefs[k] as Visibility}
        onChange={(e) => update(k, e.target.value as Visibility)}
        className="text-xs bg-muted/50 rounded-lg px-2 py-1.5 border border-border/40"
      >
        <option value="everyone">Everyone</option>
        <option value="contacts">Contacts</option>
        <option value="nobody">Nobody</option>
      </select>
    </div>
  );

  const ToggleRow = ({ icon: Icon, label, k, sub }: { icon: RowIcon; label: string; k: keyof Prefs; sub?: string }) => (
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
      <Switch checked={prefs[k] as boolean} onCheckedChange={(v) => update(k, v as Prefs[keyof Prefs])} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 pt-safe px-3 py-3 flex items-center gap-2">
        <button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Privacy & Notifications</h1>
      </header>

      <section className="mt-3">
        <h2 className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">Notifications</h2>
        <div className="bg-card/60 rounded-xl mx-3 divide-y divide-border/30">
          <ToggleRow icon={Bell} label="Show message preview" k="notifPreviews" sub="Display sender and text" />
          <ToggleRow icon={MessageSquare} label="Notification sound" k="notifSound" />
        </div>
      </section>

      <section className="mt-4">
        <h2 className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">Privacy</h2>
        <div className="bg-card/60 rounded-xl mx-3 divide-y divide-border/30">
          <ToggleRow icon={Eye} label="Read receipts" k="readReceipts" sub="Let others see when you've read" />
          <VisRow icon={Clock} label="Last seen" k="lastSeen" />
          <VisRow icon={Phone} label="Who can call me" k="whoCanCall" />
          <VisRow icon={MessageSquare} label="Who can message me" k="whoCanMessage" />
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
                  className="text-xs font-medium text-primary px-3 py-1.5 rounded-full hover:bg-primary/10"
                >
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
