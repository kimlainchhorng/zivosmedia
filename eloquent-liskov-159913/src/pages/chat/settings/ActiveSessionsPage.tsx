import { useNavigate } from "react-router-dom";
import { useSmartBack } from "@/lib/smartBack";
import { ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessions } from "@/hooks/useSessions";
import SessionRow from "@/components/chat/settings/SessionRow";
import { useState } from "react";
import ConfirmTwoStepDialog from "@/components/chat/settings/ConfirmTwoStepDialog";

export default function ActiveSessionsPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat");
  const { sessions, currentId, loading, revoke, revokeAllOthers } = useSessions();
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const others = sessions.filter((s) => s.id !== currentId);
  const current = sessions.find((s) => s.id === currentId);

  return (
    <div className="min-h-screen bg-background pb-[var(--zivo-safe-bottom,0px)]">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border safe-area-top">
        <div className="flex items-center gap-2 h-14 px-2">
          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold">Active sessions</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

        {current && (
          <section className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1">This device</div>
            <SessionRow session={current} isCurrent onRevoke={() => {}} />
          </section>
        )}

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Other sessions ({others.length})
            </div>
            {others.length > 0 && (
              <Button variant="ghost" size="sm" className="text-destructive h-8" onClick={() => setConfirmAll(true)}>
                <LogOut className="w-4 h-4 mr-1" /> Terminate all
              </Button>
            )}
          </div>
          {others.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 rounded-2xl bg-card border border-border">
              You're not signed in on any other devices.
            </div>
          ) : (
            <div className="space-y-2">
              {others.map((s) => (
                <SessionRow key={s.id} session={s} isCurrent={false} onRevoke={() => setPendingRevokeId(s.id)} />
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmTwoStepDialog
        open={!!pendingRevokeId}
        onOpenChange={(o) => { if (!o) setPendingRevokeId(null); }}
        onConfirmed={() => { if (pendingRevokeId) void revoke(pendingRevokeId); setPendingRevokeId(null); }}
        title="Terminate this session?"
        description="This device will be signed out within a minute."
      />
      <ConfirmTwoStepDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        onConfirmed={() => void revokeAllOthers()}
        title="Terminate all other sessions?"
        description="Every device except this one will be signed out."
      />
    </div>
  );
}
