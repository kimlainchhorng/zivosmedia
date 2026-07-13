import { useNavigate } from "react-router-dom";
import { useSmartBack } from "@/lib/smartBack";
import { ArrowLeft, ShieldCheck, Smartphone, KeyRound, Lock, Bell, AtSign, Eye, Phone, Forward, Image, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import PrivacyMatrixRow from "@/components/chat/settings/PrivacyMatrixRow";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useSessions } from "@/hooks/useSessions";
import { useTwoStep } from "@/hooks/useTwoStep";
import { usePasscode } from "@/hooks/usePasscode";

export default function PrivacySecurityPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat");
  const { settings, update } = usePrivacy();
  const { sessions } = useSessions();
  const { isEnabled: twoStepOn } = useTwoStep();
  const { isEnabled: passcodeOn } = usePasscode();

  return (
    <div className="min-h-screen bg-background pb-[var(--zivo-safe-bottom,0px)]">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border safe-area-top">
        <div className="flex items-center gap-2 h-14 px-2">
          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold">Privacy & Security</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Security shortcuts */}
        <section className="rounded-2xl bg-card border border-border divide-y divide-border">
          <button type="button" onClick={() => navigate("/chat/settings/sessions")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40">
            <Smartphone className="w-5 h-5 text-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Active sessions</div>
              <div className="text-xs text-muted-foreground">{sessions.length} device{sessions.length === 1 ? "" : "s"} signed in</div>
            </div>
          </button>
          <button type="button" onClick={() => navigate("/chat/settings/two-step")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40">
            <KeyRound className="w-5 h-5 text-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Two-step verification</div>
              <div className="text-xs text-muted-foreground">{twoStepOn ? "On" : "Off"}</div>
            </div>
          </button>
          <button type="button" onClick={() => navigate("/chat/settings/passcode")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40">
            <Lock className="w-5 h-5 text-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">App passcode</div>
              <div className="text-xs text-muted-foreground">{passcodeOn ? "On" : "Off"}</div>
            </div>
          </button>
          <button type="button" onClick={() => navigate("/chat/settings/login-alerts")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40">
            <Bell className="w-5 h-5 text-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Login alerts</div>
              <div className="text-xs text-muted-foreground">Recent security events</div>
            </div>
          </button>
        </section>

        {/* Privacy matrix */}
        <section className="rounded-2xl bg-card border border-border px-4">
          <div className="pt-4 pb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Who can see my…
          </div>
          {settings && (
            <>
              <PrivacyMatrixRow label="Last seen & online" value={settings.last_seen} onChange={(v) => update({ last_seen: v })} />
              <PrivacyMatrixRow label="Profile photo" value={settings.profile_photo} onChange={(v) => update({ profile_photo: v })} />
              <PrivacyMatrixRow label="Bio" value={settings.bio_visibility} onChange={(v) => update({ bio_visibility: v })} />
              <PrivacyMatrixRow label="Phone number" value={settings.phone_visibility} onChange={(v) => update({ phone_visibility: v })} />
              <PrivacyMatrixRow label="Forwarded messages" value={settings.forwards} onChange={(v) => update({ forwards: v })} />
              <PrivacyMatrixRow label="Calls" value={settings.calls} onChange={(v) => update({ calls: v })} />
              <PrivacyMatrixRow label="Group invites" value={settings.group_invites} onChange={(v) => update({ group_invites: v })} />
            </>
          )}
        </section>

        {/* Read receipts */}
        {settings && (
          <section className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
            <Eye className="w-5 h-5 text-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Read receipts</div>
              <div className="text-xs text-muted-foreground">Show others when you've read their messages</div>
            </div>
            <Switch checked={settings.read_receipts} onCheckedChange={(v) => update({ read_receipts: v })} />
          </section>
        )}
      </div>
    </div>
  );
}
