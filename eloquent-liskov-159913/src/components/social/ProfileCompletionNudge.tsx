/**
 * ProfileCompletionNudge — small dismissible banner shown on /feed for users
 * who haven't set an avatar or bio yet. Once both are set the banner stays
 * hidden permanently. The dismiss button persists to localStorage so we
 * never re-nag a user who explicitly closed it.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import X from "lucide-react/dist/esm/icons/x";
import { useUserProfile } from "@/hooks/useUserProfile";

const STORAGE_KEY = "zivo:profile-nudge-dismissed-v1";

export default function ProfileCompletionNudge() {
  const { data: profile } = useUserProfile();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });

  if (!profile || dismissed) return null;

  const hasAvatar = !!profile.avatar_url;
  const hasBio = !!(profile.bio && profile.bio.trim().length > 0);
  if (hasAvatar && hasBio) return null;

  const total = 2;
  const done = (hasAvatar ? 1 : 0) + (hasBio ? 1 : 0);

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
  };

  return (
    <div className="mx-3 mt-2 mb-1 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-card border border-border/40 px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <span className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground">Complete your profile</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {!hasAvatar && !hasBio
              ? "Add a photo and bio so people can find you."
              : !hasAvatar
                ? "Add a photo so people recognize you."
                : "Add a short bio so people know who you are."}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
              <div
                className="h-full bg-primary transition-[width] duration-300"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{done}/{total}</span>
          </div>
        </div>
        <Link
          to="/profile"
          className="shrink-0 self-start text-[11px] font-bold text-primary-foreground bg-primary rounded-full px-3 py-1.5 active:scale-95 transition-transform"
        >
          Edit
        </Link>
        <button type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 self-start text-muted-foreground hover:text-foreground p-1 -m-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
