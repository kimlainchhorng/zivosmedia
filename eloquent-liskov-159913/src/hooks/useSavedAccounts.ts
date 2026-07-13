import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "zivo_saved_accounts";
const MAX_ACCOUNTS = 5;

export interface SavedAccount {
  email: string;
  fullName: string;
  avatarUrl: string | null;
  lastLoginAt: string;
  role: string | null;
  // ── Trusted-device tokens (Facebook/Instagram-style one-tap login) ──
  // After a successful password login we capture the live Supabase session so
  // the user can tap their avatar next time and resume in one tap. The
  // refresh_token is the long-lived credential. Supabase rotates it on every
  // refresh, so we update this each time refreshSession succeeds.
  // If absent / invalid / expired, the picker asks for the password. Email
  // sign-in stays an explicit fallback button instead of being sent
  // automatically from an account tap.
  refreshToken?: string | null;
  accessToken?: string | null;
  // Unix epoch seconds when the access_token expires. Used as a hint only —
  // setSession() will refresh whatever it can and surface a real error if the
  // refresh_token itself is rejected by the server.
  expiresAt?: number | null;
}

function read(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedAccount[]) : [];
  } catch {
    return [];
  }
}

function write(accounts: SavedAccount[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {}
}

export function saveAccount(account: SavedAccount) {
  const existing = read().filter((a) => a.email !== account.email);
  const updated = [account, ...existing].slice(0, MAX_ACCOUNTS);
  write(updated);
}

export function removeAccount(email: string) {
  write(read().filter((a) => a.email !== email));
}

export function useSavedAccounts() {
  const [accounts, setAccounts] = useState<SavedAccount[]>(() => read());

  const refresh = useCallback(() => setAccounts(read()), []);

  useEffect(() => {
    // Sync across tabs
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refresh]);

  const remove = useCallback((email: string) => {
    removeAccount(email);
    refresh();
  }, [refresh]);

  return { accounts, remove, refresh };
}
