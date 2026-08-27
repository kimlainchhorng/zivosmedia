import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  ImagePlus,
  Pencil,
  Phone,
  AtSign,
  User,
  Link as LinkIcon,
  BadgeCheck,
  ChevronRight,
  Check,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/hooks/useUserProfile";

type Action = {
  key: string;
  label: string;
  done: boolean;
  icon: LucideIcon;
  onClick: () => void;
};

type Props = {
  profile: UserProfile | null | undefined;
  username: string | null | undefined;
  isVerified: boolean;
  verificationPending?: boolean;
  onPickAvatar: () => void;
  onPickCover: () => void;
  onEditBio: () => void;
  onEditPhone: () => void;
  onEditUsername: () => void;
  onEditName: () => void;
  onEditSocials: () => void;
  onStartVerification: () => void;
  className?: string;
};

const SOCIAL_KEYS: (keyof UserProfile)[] = [
  "social_facebook",
  "social_instagram",
  "social_tiktok",
  "social_snapchat",
  "social_x",
  "social_linkedin",
  "social_telegram",
];

const ProfileCompletenessCard = ({
  profile,
  username,
  isVerified,
  verificationPending = false,
  onPickAvatar,
  onPickCover,
  onEditBio,
  onEditPhone,
  onEditUsername,
  onEditName,
  onEditSocials,
  onStartVerification,
  className,
}: Props) => {
  const actions = useMemo<Action[]>(() => {
    const hasSocial = SOCIAL_KEYS.some((k) => {
      const v = profile?.[k];
      return typeof v === "string" && v.trim().length > 0;
    });

    return [
      {
        key: "avatar",
        label: "Add a profile photo",
        done: !!profile?.avatar_url,
        icon: Camera,
        onClick: onPickAvatar,
      },
      {
        key: "cover",
        label: "Add a cover photo",
        done: !!profile?.cover_url,
        icon: ImagePlus,
        onClick: onPickCover,
      },
      {
        key: "name",
        label: "Add your full name",
        done: !!profile?.full_name?.trim(),
        icon: User,
        onClick: onEditName,
      },
      {
        key: "username",
        label: "Claim a username",
        done: !!username,
        icon: AtSign,
        onClick: onEditUsername,
      },
      {
        key: "bio",
        label: "Write a short bio",
        done: !!profile?.bio?.trim(),
        icon: Pencil,
        onClick: onEditBio,
      },
      {
        key: "phone",
        label: "Verify your phone",
        done: !!profile?.phone?.trim(),
        icon: Phone,
        onClick: onEditPhone,
      },
      {
        key: "socials",
        label: "Link a social account",
        done: hasSocial,
        icon: LinkIcon,
        onClick: onEditSocials,
      },
      {
        key: "verified",
        label: verificationPending ? "Verification pending" : "Get blue verified",
        done: isVerified,
        icon: BadgeCheck,
        onClick: onStartVerification,
      },
    ];
  }, [
    profile,
    username,
    isVerified,
    verificationPending,
    onPickAvatar,
    onPickCover,
    onEditBio,
    onEditPhone,
    onEditUsername,
    onEditName,
    onEditSocials,
    onStartVerification,
  ]);

  const total = actions.length;
  const done = actions.filter((a) => a.done).length;
  const pct = Math.round((done / total) * 100);
  const remaining = actions.filter((a) => !a.done);

  if (pct === 100) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "mx-3 lg:mx-0 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.04] p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Complete your profile</p>
          <p className="text-[11px] text-muted-foreground">
            {done}/{total} done · {remaining.length} left
          </p>
        </div>
        <span className="text-sm font-bold tabular-nums text-primary">{pct}%</span>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {actions.map((a) => {
            const Icon = a.icon;
            const interactive = !a.done;
            return (
              <motion.li
                key={a.key}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  type="button"
                  onClick={interactive ? a.onClick : undefined}
                  disabled={!interactive}
                  aria-disabled={!interactive}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                    interactive ? "hover:bg-muted/50 active:scale-[0.99]" : "opacity-70",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      a.done
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {a.done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span
                    className={cn(
                      "flex-1 truncate text-[13px] font-medium",
                      a.done ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {a.label}
                  </span>
                  {interactive && (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
};

export default ProfileCompletenessCard;
