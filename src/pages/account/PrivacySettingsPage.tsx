/**
 * PrivacySettingsPage — Block users, mute conversations, privacy toggles
 */
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Cookie,
  Database,
  Loader2,
  MessageSquare,
  RefreshCw,
  Shield,
  ShieldAlert,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";
import { toast } from "sonner";
import { useSensitiveMediaPreference } from "@/hooks/useSensitiveMediaPreference";
import { cn } from "@/lib/utils";

type PrivacySettings = {
  allow_message_requests: boolean;
};

type PrivacySettingKey = keyof PrivacySettings;

type PublicProfile = {
  user_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type BlockedUser = {
  id: string;
  blocked_id: string;
  created_at: string;
  profile: PublicProfile | null;
};

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  allow_message_requests: true,
};

const normalizePrivacySettings = (
  row: {
    allow_message_requests: boolean | null;
  } | null,
): PrivacySettings => {
  if (!row) return DEFAULT_PRIVACY_SETTINGS;

  return {
    allow_message_requests:
      row.allow_message_requests ??
      DEFAULT_PRIVACY_SETTINGS.allow_message_requests,
  };
};

const isSuccessfulFunctionResult = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  "ok" in value &&
  value.ok === true;

function LoadingState({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl border border-border/40 bg-card p-3 text-xs font-medium text-muted-foreground"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function UnavailableState({
  title,
  description,
  retryLabel,
  retrying,
  onRetry,
}: {
  title: string;
  description: string;
  retryLabel: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 h-8 rounded-full text-xs"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            {retryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PrivacySettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isTravelHost =
    typeof window !== "undefined" && isZivoTravelHost(window.location.hostname);
  const hashTargetClassName = cn(
    "scroll-mt-[calc(var(--zivo-safe-top-sticky)_+_4.25rem)]",
    !isTravelHost && "lg:scroll-mt-[95px]",
  );
  const { blurSensitiveMedia, setBlurSensitiveMedia } =
    useSensitiveMediaPreference(user?.id);
  const activeOwnerIdRef = useRef(user?.id);
  const mutationRevisionRef = useRef(0);
  const settingMutationRef = useRef<{
    ownerId: string;
    revision: number;
  } | null>(null);
  const unblockMutationRef = useRef<{
    ownerId: string;
    revision: number;
  } | null>(null);
  const sensitiveMutationRef = useRef<{
    ownerId: string;
    revision: number;
  } | null>(null);
  const [updatingSettingKey, setUpdatingSettingKey] =
    useState<PrivacySettingKey | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [updatingSensitiveMedia, setUpdatingSensitiveMedia] = useState(false);

  useEffect(() => {
    activeOwnerIdRef.current = user?.id;
    mutationRevisionRef.current += 1;
    settingMutationRef.current = null;
    unblockMutationRef.current = null;
    sensitiveMutationRef.current = null;
    setUpdatingSettingKey(null);
    setUnblockingId(null);
    setUpdatingSensitiveMedia(false);
  }, [user?.id]);

  // Scroll to hash anchor (e.g. #blocked) on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.replace("#", "");
    if (!hash) return;
    const t = setTimeout(() => {
      document
        .getElementById(hash)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => clearTimeout(t);
  }, []);

  // Privacy settings
  const settingsQuery = useQuery({
    queryKey: ["privacy-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("privacy_settings")
        .select("allow_message_requests")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return normalizePrivacySettings(data);
    },
    enabled: !!user?.id,
  });

  // Blocked users
  const blockedUsersQuery = useQuery({
    queryKey: ["blocked-users", user?.id],
    queryFn: async (): Promise<BlockedUser[]> => {
      if (!user?.id) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("blocked_users")
        .select("id, blocked_id, created_at")
        .eq("blocker_id", user.id);
      if (error) throw error;
      if (!data?.length) return [];
      const ids = data.map((blocked) => blocked.blocked_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("public_profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", ids);
      if (profilesError) throw profilesError;
      return data.map((blocked) => ({
        ...blocked,
        profile:
          profiles?.find((profile) => profile.user_id === blocked.blocked_id) ??
          null,
      }));
    },
    enabled: !!user?.id,
  });

  const settings = settingsQuery.data;
  const blockedUsers = blockedUsersQuery.data;

  const updateSetting = async (
    key: PrivacySettingKey,
    value: PrivacySettings[PrivacySettingKey],
  ) => {
    const ownerId = user?.id;
    if (!ownerId || settingMutationRef.current?.ownerId === ownerId) return;

    const token = { ownerId, revision: ++mutationRevisionRef.current };
    settingMutationRef.current = token;
    setUpdatingSettingKey(key);
    try {
      const { data: activeAuth, error: authError } =
        await supabase.auth.getUser();
      if (authError || activeAuth.user?.id !== ownerId) {
        throw new Error(
          "Your account changed. Review this setting and try again.",
        );
      }

      const { data, error } = await supabase.functions.invoke(
        "privacy-settings-update",
        {
          body: { key, value },
        },
      );
      if (error) throw error;
      if (!isSuccessfulFunctionResult(data)) {
        throw new Error("Privacy update was not confirmed");
      }
      if (activeOwnerIdRef.current !== ownerId) return;

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["privacy-settings", ownerId],
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: ["privacy-settings", ownerId, "allow_message_requests"],
          exact: true,
        }),
      ]);
      if (activeOwnerIdRef.current === ownerId) {
        toast.success("Privacy updated");
      }
    } catch (error) {
      if (activeOwnerIdRef.current === ownerId) {
        toast.error(
          error instanceof Error &&
            error.message.startsWith("Your account changed")
            ? error.message
            : "Couldn't update privacy. Please try again.",
        );
      }
    } finally {
      if (
        settingMutationRef.current?.revision === token.revision &&
        activeOwnerIdRef.current === ownerId
      ) {
        settingMutationRef.current = null;
        setUpdatingSettingKey(null);
      }
    }
  };

  const unblockUser = async (blockId: string) => {
    const ownerId = user?.id;
    if (!ownerId || unblockMutationRef.current?.ownerId === ownerId) return;

    const token = { ownerId, revision: ++mutationRevisionRef.current };
    unblockMutationRef.current = token;
    setUnblockingId(blockId);
    try {
      const { data: activeAuth, error: authError } =
        await supabase.auth.getUser();
      if (authError || activeAuth.user?.id !== ownerId) {
        throw new Error(
          "Your account changed. Review the blocked list and try again.",
        );
      }

      const { data, error } = await supabase.functions.invoke(
        "block-user-manage",
        {
          body: { action: "unblock", block_id: blockId },
        },
      );
      if (error) throw error;
      if (!isSuccessfulFunctionResult(data)) {
        throw new Error("Unblock was not confirmed");
      }
      if (activeOwnerIdRef.current !== ownerId) return;

      await queryClient.invalidateQueries({
        queryKey: ["blocked-users", ownerId],
        exact: true,
      });
      if (activeOwnerIdRef.current === ownerId) {
        toast.success("User unblocked");
      }
    } catch (error) {
      if (activeOwnerIdRef.current === ownerId) {
        toast.error(
          error instanceof Error &&
            error.message.startsWith("Your account changed")
            ? error.message
            : "Could not unblock user. Please try again.",
        );
      }
    } finally {
      if (
        unblockMutationRef.current?.revision === token.revision &&
        activeOwnerIdRef.current === ownerId
      ) {
        unblockMutationRef.current = null;
        setUnblockingId(null);
      }
    }
  };

  const updateSensitiveMediaPreference = async (next: boolean) => {
    const ownerId = user?.id;
    if (!ownerId || sensitiveMutationRef.current?.ownerId === ownerId) return;

    const token = { ownerId, revision: ++mutationRevisionRef.current };
    sensitiveMutationRef.current = token;
    setUpdatingSensitiveMedia(true);
    try {
      await setBlurSensitiveMedia(next);
      if (activeOwnerIdRef.current === ownerId) {
        toast.success(
          next
            ? "Sensitive media will be blurred on this device"
            : "Sensitive media blur is off on this device",
        );
      }
    } catch {
      if (activeOwnerIdRef.current === ownerId) {
        toast.error("Couldn't update sensitive media. Please try again.");
      }
    } finally {
      if (
        sensitiveMutationRef.current?.revision === token.revision &&
        activeOwnerIdRef.current === ownerId
      ) {
        sensitiveMutationRef.current = null;
        setUpdatingSensitiveMedia(false);
      }
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-background",
        !isTravelHost && "lg:pt-[83px]",
      )}
    >
      <div
        className={cn(
          "sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md safe-area-top",
          !isTravelHost && "lg:relative lg:top-auto",
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back"
            className="h-10 w-10 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Privacy & Safety</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* GDPR / CCPA cross-link */}
        <section className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate("/account/data-rights")}
            className="flex flex-col items-start gap-1.5 p-3 rounded-2xl bg-card border border-border/40 hover:bg-accent/50 transition-all text-left active:scale-[0.98]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="h-8 w-8 rounded-xl bg-zinc-500/15 flex items-center justify-center">
                <Database className="h-4 w-4 text-zinc-500" />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <p className="text-[13px] font-semibold text-foreground">
              Data Rights
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Access, download, or delete your data (GDPR/CCPA)
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigate("/account/data-rights#cookies")}
            className="flex flex-col items-start gap-1.5 p-3 rounded-2xl bg-card border border-border/40 hover:bg-accent/50 transition-all text-left active:scale-[0.98]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="h-8 w-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Cookie className="h-4 w-4 text-amber-500" />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <p className="text-[13px] font-semibold text-foreground">Cookies</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Manage tracking & consent preferences
            </p>
          </button>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Privacy controls
          </h3>
          <button
            type="button"
            onClick={() => navigate("/account/profile-edit#profile-visibility")}
            className="flex w-full items-center gap-3 rounded-xl border border-border/40 bg-card p-3 text-left transition-colors hover:bg-accent/50"
          >
            <Shield className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Profile visibility</p>
              <p className="text-xs text-muted-foreground">
                Open the profile control for public, friends-only, or private
                access.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          </button>
          <button
            id="receipts"
            type="button"
            onClick={() => navigate("/chat/settings/privacy-hub")}
            className={cn(
              hashTargetClassName,
              "flex w-full items-center gap-3 rounded-xl border border-border/40 bg-card p-3 text-left transition-colors hover:bg-accent/50",
            )}
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Zivo Chat privacy</p>
              <p className="text-xs text-muted-foreground">
                Read receipts, last seen, calls, and messages. Opens Zivo Chat;
                sign-in may be required.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          </button>
        </section>

        {settingsQuery.isPending ? (
          <LoadingState label="Loading message request preference…" />
        ) : settingsQuery.isError || !settings ? (
          <UnavailableState
            title="Message request preference unavailable"
            description="We couldn't confirm whether non-contact chat alerts are shown. Nothing has been assumed."
            retryLabel="Retry message request preference"
            retrying={settingsQuery.isFetching}
            onRetry={() => void settingsQuery.refetch()}
          />
        ) : (
          <section
            id="message-requests"
            className={cn(hashTargetClassName, "space-y-3")}
            aria-busy={updatingSettingKey !== null}
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" /> Non-contact
              chat alerts
            </h3>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card p-3">
              <div>
                <p className="text-sm font-medium">
                  Show non-contact chat alerts
                </p>
                <p className="text-xs text-muted-foreground">
                  Hide or show their notifications. This does not block messages
                  or remove them from the requests page.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {updatingSettingKey === "allow_message_requests" && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Switch
                  aria-label="Show non-contact chat alerts"
                  checked={settings.allow_message_requests}
                  disabled={updatingSettingKey !== null}
                  onCheckedChange={(value) =>
                    void updateSetting("allow_message_requests", value)
                  }
                />
              </div>
            </div>
          </section>
        )}

        {/* Sensitive Media */}
        <section
          id="sensitive"
          className={cn(hashTargetClassName, "space-y-3")}
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" /> Sensitive Media
          </h3>
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40">
            <div>
              <p className="text-sm font-medium">Blur sensitive media</p>
              <p className="text-xs text-muted-foreground">
                Hide sexual or adult media until you tap View
              </p>
            </div>
            <Switch
              aria-label="Blur sensitive media"
              checked={blurSensitiveMedia}
              disabled={updatingSensitiveMedia}
              onCheckedChange={(value) =>
                void updateSensitiveMediaPreference(value)
              }
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            This preference is kept on this device and syncs to your account
            when available.
          </p>
        </section>

        {/* Blocked Users */}
        <section id="blocked" className={hashTargetClassName}>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <UserX className="h-4 w-4 text-destructive" /> Blocked Users
            {blockedUsers && !blockedUsersQuery.isError
              ? ` (${blockedUsers.length})`
              : ""}
          </h3>
          {blockedUsersQuery.isPending ? (
            <LoadingState label="Loading blocked users…" />
          ) : blockedUsersQuery.isError || !blockedUsers ? (
            <UnavailableState
              title="Blocked users unavailable"
              description="We couldn't confirm your blocked list. No one has been shown as unblocked."
              retryLabel="Retry blocked users"
              retrying={blockedUsersQuery.isFetching}
              onRetry={() => void blockedUsersQuery.refetch()}
            />
          ) : blockedUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 bg-card rounded-xl border border-border/40">
              No blocked users
            </p>
          ) : (
            blockedUsers.map((blocked) => (
              <div
                key={blocked.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 mb-2"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={blocked.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(blocked.profile?.full_name || "U")[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium">
                  {blocked.profile?.full_name || "Profile unavailable"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void unblockUser(blocked.id)}
                  disabled={unblockingId !== null}
                  aria-busy={unblockingId === blocked.id}
                  className="text-xs h-8"
                >
                  {unblockingId === blocked.id ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Unblocking…
                    </>
                  ) : (
                    "Unblock"
                  )}
                </Button>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
