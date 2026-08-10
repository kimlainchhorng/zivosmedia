import { useCallback, useEffect, useState } from "react";

const BASE_STORAGE_KEY = "zivo_saved_accounts";
const MAX_ACCOUNTS = 5;
const SESSION_TOKENS_SUFFIX = ":session-tokens";

export interface SavedAccount {
  email: string;
  fullName: string;
  avatarUrl: string | null;
  lastLoginAt: string;
  role: string | null;
  // ── Session-scoped trusted-device tokens ──────────────────────────────────
  // The refresh token is intentionally not persisted with the account card.
  // useSavedAccounts keeps it only in sessionStorage for the current tab so a
  // compromised persistent localStorage dump cannot restore another account.
  // If absent / invalid / expired, the picker asks for the password.
  refreshToken?: string | null;
  // Ephemeral in-memory compatibility field; never written to storage.
  accessToken?: string | null;
  expiresAt?: number | null;
}

type AccountMetadata = Omit<SavedAccount, "refreshToken" | "accessToken" | "expiresAt">;
type SessionAccountToken = { refreshToken: string; expiresAt?: number | null };

function getStorageKey() {
  if (typeof window === "undefined") return BASE_STORAGE_KEY;
  const host = window.location.hostname.toLowerCase();
  if (host === "zivosoftware.com" || host === "www.zivosoftware.com") {
    return `${BASE_STORAGE_KEY}:software`;
  }
  if (host === "zivoschat.com" || host === "www.zivoschat.com") {
    return `${BASE_STORAGE_KEY}:chat`;
  }
  if (host === "zivosmedia.com" || host === "www.zivosmedia.com") {
    return `${BASE_STORAGE_KEY}:media`;
  }
  return `${BASE_STORAGE_KEY}:${host || "local"}`;
}

function getSessionTokensKey() {
  return `${getStorageKey()}${SESSION_TOKENS_SUFFIX}`;
}

function toAccountMetadata(value: unknown): AccountMetadata | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SavedAccount>;
  const email = typeof candidate.email === "string" ? candidate.email.trim().toLowerCase() : "";
  if (!email) return null;
  return {
    email,
    fullName: typeof candidate.fullName === "string" ? candidate.fullName : email.split("@")[0],
    avatarUrl: typeof candidate.avatarUrl === "string" ? candidate.avatarUrl : null,
    lastLoginAt: typeof candidate.lastLoginAt === "string" ? candidate.lastLoginAt : "",
    role: typeof candidate.role === "string" ? candidate.role : null,
  };
}

function readSessionTokens(): Record<string, SessionAccountToken> {
  try {
    const raw = sessionStorage.getItem(getSessionTokensKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.entries(parsed).reduce<Record<string, SessionAccountToken>>((tokens, [email, value]) => {
      if (!value || typeof value !== "object") return tokens;
      const candidate = value as Partial<SessionAccountToken>;
      if (typeof candidate.refreshToken !== "string" || !candidate.refreshToken) return tokens;
      tokens[email] = {
        refreshToken: candidate.refreshToken,
        expiresAt: typeof candidate.expiresAt === "number" ? candidate.expiresAt : null,
      };
      return tokens;
    }, {});
  } catch {
    return {};
  }
}

function writeSessionTokens(tokens: Record<string, SessionAccountToken>) {
  try {
    const safe = Object.fromEntries(
      Object.entries(tokens).filter(([, token]) => typeof token?.refreshToken === "string" && token.refreshToken),
    );
    if (Object.keys(safe).length > 0) {
      sessionStorage.setItem(getSessionTokensKey(), JSON.stringify(safe));
    } else {
      sessionStorage.removeItem(getSessionTokensKey());
    }
  } catch {
    // Session storage is best-effort; password sign-in remains available.
  }
}

function writeMetadata(accounts: SavedAccount[]) {
  try {
    const safe = accounts
      .map(toAccountMetadata)
      .filter((account): account is AccountMetadata => account !== null)
      .slice(0, MAX_ACCOUNTS);
    localStorage.setItem(getStorageKey(), JSON.stringify(safe));
  } catch {
    // Local storage may be unavailable in private browsing.
  }
}

function read(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const sessionTokens = readSessionTokens();
    let hadLegacyTokenFields = false;
    const metadata = parsed
      .map((value): AccountMetadata | null => {
        const account = toAccountMetadata(value);
        if (!account || !value || typeof value !== "object") return account;
        const legacy = value as Partial<SavedAccount>;
        const hasLegacyFields = ["refreshToken", "accessToken", "expiresAt"]
          .some((field) => Object.prototype.hasOwnProperty.call(legacy, field));
        if (hasLegacyFields) hadLegacyTokenFields = true;
        if (typeof legacy.refreshToken === "string" && legacy.refreshToken && !sessionTokens[account.email]) {
          // One-time migration: move old persistent tokens into session scope,
          // then rewrite localStorage without any credential fields.
          sessionTokens[account.email] = {
            refreshToken: legacy.refreshToken,
            expiresAt: typeof legacy.expiresAt === "number" ? legacy.expiresAt : null,
          };
        }
        return account;
      })
      .filter((account): account is AccountMetadata => account !== null)
      .slice(0, MAX_ACCOUNTS);

    if (hadLegacyTokenFields) {
      writeMetadata(metadata);
      writeSessionTokens(sessionTokens);
    }

    return metadata.map((account) => ({
      ...account,
      ...(sessionTokens[account.email] ?? {}),
    }));
  } catch {
    return [];
  }
}

function write(accounts: SavedAccount[]) {
  const sessionTokens: Record<string, SessionAccountToken> = {};
  accounts.forEach((account) => {
    const metadata = toAccountMetadata(account);
    if (!metadata || typeof account.refreshToken !== "string" || !account.refreshToken) return;
    sessionTokens[metadata.email] = {
      refreshToken: account.refreshToken,
      expiresAt: typeof account.expiresAt === "number" ? account.expiresAt : null,
    };
  });
  writeMetadata(accounts);
  writeSessionTokens(sessionTokens);
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
