/**
 * SwitchAccountSheet — Facebook/Instagram-style multi-account switcher.
 *
 * Reuses the saved-accounts infra (localStorage refresh tokens) and the exact
 * one-tap resume flow from the Login picker: tapping a saved account exchanges
 * its stored refresh_token for a live session via supabase.auth.refreshSession().
 * If the token is missing/expired we fall back to the Login page.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, LogIn, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSavedAccounts, saveAccount, type SavedAccount } from "@/hooks/useSavedAccounts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail?: string | null;
  currentName?: string | null;
  currentAvatar?: string | null;
};

export default function SwitchAccountSheet({
  open,
  onOpenChange,
  currentEmail,
  currentName,
  currentAvatar,
}: Props) {
  const navigate = useNavigate();
  const { accounts, remove } = useSavedAccounts();
  const [switching, setSwitching] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const normalizedCurrent = (currentEmail || "").toLowerCase();

  // The current account always sits at the top and is marked active. Any saved
  // entry that matches the live session is folded into it (deduped by email).
  const otherAccounts = useMemo(
    () => accounts.filter((a) => a.email.toLowerCase() !== normalizedCurrent),
    [accounts, normalizedCurrent],
  );

  const handleSwitch = async (account: SavedAccount) => {
    if (switching) return;
    setSwitching(account.email);
    try {
      // Snapshot the CURRENT account's live session first. Two reasons:
      // 1. Supabase rotates refresh tokens on every auto-refresh, so the
      //    saved entry for the outgoing account goes stale — re-save the
      //    live tokens now so switching back stays one-tap.
      // 2. auth-js wipes the stored session (and emits SIGNED_OUT) when
      //    refreshSession() fails with a non-retryable error, so we need
      //    the snapshot to restore the active session on failure.
      const { data: { session: prevSession } } = await supabase.auth.getSession();
      const prevEmail = prevSession?.user?.email;
      if (prevSession && prevEmail) {
        const existing = accounts.find((a) => a.email.toLowerCase() === prevEmail.toLowerCase());
        saveAccount({
          email: prevEmail,
          fullName: existing?.fullName || currentName || prevEmail.split("@")[0],
          avatarUrl: existing?.avatarUrl ?? currentAvatar ?? null,
          role: existing?.role ?? null,
          lastLoginAt: existing?.lastLoginAt ?? new Date().toISOString(),
          refreshToken: prevSession.refresh_token,
          accessToken: prevSession.access_token,
          expiresAt: prevSession.expires_at ?? null,
        });
      }

      if (account.refreshToken) {
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: account.refreshToken,
        });
        if (!error && data?.session) {
          // Rotate the stored token so the next tap stays one-tap.
          saveAccount({
            ...account,
            lastLoginAt: new Date().toISOString(),
            refreshToken: data.session.refresh_token ?? account.refreshToken,
            accessToken: data.session.access_token ?? account.accessToken,
            expiresAt: data.session.expires_at ?? null,
          });
          // Full reload guarantees every user-scoped query refetches under the
          // new session — the Facebook/Instagram account-switch behaviour.
          window.location.assign("/feed");
          return;
        }
        // Exchange failed — a non-retryable error wiped the stored session,
        // so restore the active account before falling back to login. The
        // snapshot's refresh_token is still valid (the failed exchange never
        // consumed it).
        if (prevSession) {
          await supabase.auth.setSession({
            access_token: prevSession.access_token,
            refresh_token: prevSession.refresh_token,
          });
        }
      }
      // No trusted token (or it was rejected) — fall back to an explicit login.
      onOpenChange(false);
      navigate(`/login?email=${encodeURIComponent(account.email)}`);
    } catch {
      onOpenChange(false);
      navigate("/login");
    } finally {
      setSwitching(null);
    }
  };

  const initial = (name?: string | null, email?: string | null) =>
    (name?.trim()?.[0] || email?.trim()?.[0] || "U").toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] sm:w-[360px] p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/40 px-5 py-4">
            <SheetTitle className="text-[17px]">Switch account</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {/* Active account */}
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/70">
              Signed in
            </p>
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
              <Avatar className="zivo-social-avatar-ring h-10 w-10 shrink-0">
                <AvatarImage src={currentAvatar || undefined} />
                <AvatarFallback className="bg-muted text-sm font-medium">
                  {initial(currentName, currentEmail)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-foreground">
                  {currentName || "You"}
                </p>
                {currentEmail && (
                  <p className="truncate text-[12px] text-muted-foreground">{currentEmail}</p>
                )}
              </div>
              <Check className="h-5 w-5 shrink-0 text-emerald-500" aria-label="Active account" />
            </div>

            {/* Other saved accounts */}
            {otherAccounts.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between px-3 pb-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/70">
                    Saved accounts
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditing((v) => !v)}
                    className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {editing ? "Done" : "Edit"}
                  </button>
                </div>
                <div className="space-y-0.5">
                  {otherAccounts.map((account) => {
                    const isSwitching = switching === account.email;
                    return (
                      <div key={account.email} className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={!!switching}
                          onClick={() => handleSwitch(account)}
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                            "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                            switching && !isSwitching && "opacity-50",
                          )}
                        >
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={account.avatarUrl || undefined} />
                            <AvatarFallback className="bg-muted text-sm font-medium">
                              {initial(account.fullName, account.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-medium text-foreground">
                              {account.fullName || account.email}
                            </p>
                            <p className="truncate text-[12px] text-muted-foreground">
                              {account.email}
                            </p>
                          </div>
                          {isSwitching && (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                          )}
                        </button>
                        {editing && !switching && (
                          <button
                            type="button"
                            onClick={() => remove(account.email)}
                            aria-label={`Remove ${account.email}`}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add another account */}
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate("/login");
              }}
              className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-foreground">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-[15px] font-medium text-foreground">Add another account</span>
            </button>
          </div>

          <div className="border-t border-border/40 px-5 py-3">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate("/login");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-[14px] font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Log into another account
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
