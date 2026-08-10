import { beforeEach, describe, expect, it } from "vitest";
import { removeAccount, saveAccount } from "./useSavedAccounts";

const account = {
  email: "owner@example.com",
  fullName: "Shop Owner",
  avatarUrl: null,
  lastLoginAt: "2026-08-09T12:00:00.000Z",
  role: "owner",
  refreshToken: "refresh-token-secret",
  accessToken: "access-token-secret",
  expiresAt: 1_800_000_000,
};

function findStorageKey(storage: Storage, suffix = "") {
  return Object.keys(storage).find((key) => key.startsWith("zivo_saved_accounts:") && key.endsWith(suffix));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("saved-account storage", () => {
  it("keeps account-card metadata in localStorage and tokens in sessionStorage only", () => {
    saveAccount(account);

    const metadataKey = findStorageKey(localStorage);
    const tokenKey = findStorageKey(sessionStorage, ":session-tokens");
    expect(metadataKey).toBeTruthy();
    expect(tokenKey).toBeTruthy();

    const metadata = localStorage.getItem(metadataKey!);
    const tokens = sessionStorage.getItem(tokenKey!);
    expect(metadata).toContain("owner@example.com");
    expect(metadata).not.toContain("refresh-token-secret");
    expect(metadata).not.toContain("access-token-secret");
    expect(metadata).not.toContain("expiresAt");
    expect(tokens).toContain("refresh-token-secret");
    expect(tokens).not.toContain("access-token-secret");
  });

  it("migrates legacy localStorage tokens and strips them from persistent storage", () => {
    saveAccount(account);
    const metadataKey = findStorageKey(localStorage)!;
    localStorage.setItem(metadataKey, JSON.stringify([account]));
    sessionStorage.clear();

    saveAccount({
      email: "second@example.com",
      fullName: "Second Owner",
      avatarUrl: null,
      lastLoginAt: "2026-08-09T12:01:00.000Z",
      role: "owner",
    });

    const migrated = localStorage.getItem(metadataKey);
    expect(migrated).not.toContain("refresh-token-secret");
    expect(migrated).not.toContain("access-token-secret");
    expect(sessionStorage.getItem(findStorageKey(sessionStorage, ":session-tokens")!)).toContain("refresh-token-secret");
  });

  it("removes session-scoped tokens when an account is removed", () => {
    saveAccount(account);
    removeAccount(account.email);
    expect(findStorageKey(sessionStorage, ":session-tokens")).toBeUndefined();
  });
});
