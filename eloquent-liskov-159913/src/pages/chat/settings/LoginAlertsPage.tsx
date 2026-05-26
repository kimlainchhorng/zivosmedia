import { useNavigate } from "react-router-dom";
import { useSmartBack } from "@/lib/smartBack";
import { ArrowLeft, LogIn, LogOut, ShieldOff, KeyRound, AlertTriangle, ShieldAlert } from "lucide-react";
import { useLoginAlerts, type LoginAlert } from "@/hooks/useLoginAlerts";
import { formatDistanceToNow } from "date-fns";

const ICONS: Record<LoginAlert["event"], typeof LogIn> = {
  login: LogIn,
  logout: LogOut,
  session_revoked: ShieldOff,
  two_step_changed: KeyRound,
  password_changed: KeyRound,
  suspicious: ShieldAlert,
};

const LABELS: Record<LoginAlert["event"], string> = {
  login: "Signed in",
  logout: "Signed out",
  session_revoked: "Session revoked",
  two_step_changed: "Two-step changed",
  password_changed: "Password changed",
  suspicious: "Suspicious activity",
};

export default function LoginAlertsPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat");
  const { alerts, loading } = useLoginAlerts(50);

  return (
    <div className="min-h-screen bg-background pb-[var(--zivo-safe-bottom,0px)]">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border safe-area-top">
        <div className="flex items-center gap-2 h-14 px-2">
          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold">Login alerts</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!loading && alerts.length === 0 && (
          <div className="text-sm text-muted-foreground p-4 rounded-2xl bg-card border border-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> No security events yet.
          </div>
        )}
        <div className="space-y-2">
          {alerts.map((a) => {
            const Icon = ICONS[a.event] ?? LogIn;
            return (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{LABELS[a.event]}</div>
                  <div className="text-xs text-muted-foreground">
                    {[a.device_name, a.platform, a.city, a.country].filter(Boolean).join(" • ") || "Unknown device"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
