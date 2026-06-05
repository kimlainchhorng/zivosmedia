import { useCallback, useEffect, useState } from "react";

const BASE_STORAGE_KEY = "zivo_saved_accounts";
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

function getStorageKey() {
  if (typeof window === "undefined") return BASE_STORAGE_KEY;
  const host = window.location.hostname.toLowerCase();
  if (host === "zivosoftware.com" || host === "www.zivosoftware.com") {
    return `${BASE_STORAGE_KEY}:software`;
  }
  if (host === "zivosmedia.com" || host === "www.zivosmedia.com") {
    return `${BASE_STORAGE_KEY}:media`;
  }
  return `${BASE_STORAGE_KEY}:${host || "local"}`;
}

function read(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? (JSON.parse(raw) as SavedAccount[]) : [];
  } catch {
    return [];
  }
}

function write(accounts: SavedAccount[]) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(accounts));
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
  const storageKey = getStorageKey();

  const refresh = useCallback(() => setAccounts(read()), []);

  useEffect(() => {
    // Sync across tabs
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey) refresh();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refresh, storageKey]);

  const remove = useCallback((email: string) => {
    removeAccount(email);
    refresh();
  }, [refresh]);

  return { accounts, remove, refresh };
}
