/**
 * ProfileCompletionNudge — small dismissible banner shown on /feed for users
 * who haven't set an avatar or bio yet. Once both are set the banner stays
 * hidden permanently. The dismiss button persists to localStorage so we
 * never re-nag a user who explicitly closed it.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import Check from "lucide-react/dist/esm/icons/check";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import ImagePlus from "lucide-react/dist/esm/icons/image-plus";
import Layers3 from "lucide-react/dist/esm/icons/layers-3";
import MessageSquareText from "lucide-react/dist/esm/icons/message-square-text";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Target from "lucide-react/dist/esm/icons/target";
import UserRoundCheck from "lucide-react/dist/esm/icons/user-round-check";
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
  const missing = total - done;
  const percent = Math.round((done / total) * 100);
  const statusLabel = percent >= 50 ? "Almost ready" : "Needs setup";
  const nextStepLabel = !hasAvatar ? "Add a profile photo" : "Write a short bio";
  const impactLabel = !hasAvatar && !hasBio
    ? "People trust complete profiles faster"
    : !hasAvatar
      ? "A face helps friends confirm it is you"
      : "A bio helps people know what to follow";
  const readinessLabel = percent >= 50 ? "Trust signal live" : "Trust signal pending";

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
  };

  return (
    <div
      className="zivo-social-module mx-2 mt-2 mb-1 overflow-hidden rounded-[1.35rem] px-3 py-3"
      role="region"
      aria-label={`Profile setup ${percent}% complete. ${nextStepLabel}.`}
    >
      <div className="relative flex items-start gap-3">
        <span className="zivo-social-share-orb relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <Sparkles className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
          <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black leading-none text-white shadow-[0_8px_18px_rgba(16,185,129,0.28)]">
            {done}/{total}
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-foreground">Complete your profile</p>
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                {!hasAvatar && !hasBio
                  ? "Add a photo and bio so people can find you."
                  : !hasAvatar
                    ? "Add a photo so people recognize you."
                    : "Add a short bio so people know who you are."}
              </p>
            </div>
            <span className="zivo-social-chip shrink-0 rounded-full px-2 py-1 text-[10px] font-bold text-muted-foreground">
              {percent}%
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <span className="zivo-social-module-tile flex min-w-0 items-center gap-2 rounded-2xl px-2.5 py-2 text-[10px] font-bold text-muted-foreground">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRoundCheck className="h-3 w-3" aria-hidden="true" />
              </span>
              <span className="truncate">{statusLabel}</span>
            </span>
            <span className="zivo-social-module-tile flex min-w-0 items-center gap-2 rounded-2xl px-2.5 py-2 text-[10px] font-bold text-muted-foreground">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10 text-fuchsia-500">
                <Layers3 className="h-3 w-3" aria-hidden="true" />
              </span>
              <span className="truncate">{missing} left</span>
            </span>
            <span className="zivo-social-module-tile flex min-w-0 items-center gap-2 rounded-2xl px-2.5 py-2 text-[10px] font-bold text-muted-foreground">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
              </span>
              <span className="truncate">Boost</span>
            </span>
          </div>
          <div className="zivo-social-module-tile mt-3 flex items-center gap-3 rounded-2xl px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">
                Profile impact
              </span>
              <span className="block truncate text-xs font-bold text-foreground">{impactLabel}</span>
            </span>
            <span className="zivo-social-chip shrink-0 rounded-full px-2 py-1 text-[9px] font-black text-muted-foreground">
              {readinessLabel}
            </span>
          </div>
          <div className="zivo-social-share-preview mt-3 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Target className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                  Next best step
                </span>
                <span className="block truncate text-xs font-bold text-foreground">{nextStepLabel}</span>
              </span>
            </span>
            <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
              +Trust
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="zivo-social-chip h-2 flex-1 overflow-hidden rounded-full p-0">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-primary to-fuchsia-500 transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{done}/{total}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <span className={`zivo-social-module-tile flex min-w-0 items-center gap-2 rounded-2xl px-2.5 py-2 text-[10px] font-bold ${hasAvatar ? "text-emerald-600" : "text-muted-foreground"}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${hasAvatar ? "bg-emerald-500 text-white" : "zivo-social-chip text-primary"}`}>
                {hasAvatar ? <Check className="h-3 w-3" /> : <ImagePlus className="h-3 w-3" />}
              </span>
              <span className="truncate">{hasAvatar ? "Photo ready" : "Add photo"}</span>
            </span>
            <span className={`zivo-social-module-tile flex min-w-0 items-center gap-2 rounded-2xl px-2.5 py-2 text-[10px] font-bold ${hasBio ? "text-emerald-600" : "text-muted-foreground"}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${hasBio ? "bg-emerald-500 text-white" : "zivo-social-chip text-primary"}`}>
                {hasBio ? <Check className="h-3 w-3" /> : <MessageSquareText className="h-3 w-3" />}
              </span>
              <span className="truncate">{hasBio ? "Bio ready" : "Add bio"}</span>
            </span>
          </div>
        </div>
        <Link
          to="/profile"
          className="zivo-social-chip-active flex shrink-0 items-center gap-1 self-start rounded-full px-3 py-1.5 text-[11px] font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95"
          aria-label={`Edit profile, ${missing} profile ${missing === 1 ? "item" : "items"} remaining`}
        >
          Edit
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <button type="button"
          onClick={handleDismiss}
          aria-label="Dismiss profile setup reminder"
          className="zivo-social-icon-button -m-1 flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
