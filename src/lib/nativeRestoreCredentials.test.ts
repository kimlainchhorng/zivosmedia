import type { Session, User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  ANDROID_RESTORE_CREDENTIAL_LABEL,
  ANDROID_RESTORE_CREDENTIAL_SUPPRESSION_KEY,
  createNativeRestoreCredentialCoordinator,
  type NativeRestoreCredentialDependencies,
} from "@/lib/nativeRestoreCredentials";

function sessionFor(userId: string) {
  return { user: { id: userId } as User } as Session;
}

function setup(overrides: Partial<NativeRestoreCredentialDependencies> = {}) {
  const userId = "user-1";
  const session = sessionFor(userId);
  const values = new Map<string, string>();
  const order: string[] = [];

  const plugin: NativeRestoreCredentialDependencies["plugin"] = {
    getAvailability: vi.fn(async () => ({
      supported: true,
      androidApi: 36,
      gmsVersion: 24_220_000,
    })),
    create: vi.fn(async () => {
      order.push("native-create");
      return {
        responseJson: JSON.stringify({ id: "registration-response" }),
        cloudBackupEnabled: true,
      };
    }),
    get: vi.fn(async () => ({
      available: true,
      responseJson: JSON.stringify({ id: "authentication-response" }),
    })),
    clear: vi.fn(async () => {
      order.push("native-clear");
      return { cleared: true };
    }),
  };

  const storage: NativeRestoreCredentialDependencies["storage"] = {
    get: vi.fn(async ({ key }) => ({ value: values.get(key) ?? null })),
    set: vi.fn(async ({ key, value }) => {
      order.push(`storage-set:${key}`);
      values.set(key, value);
    }),
    remove: vi.fn(async ({ key }) => {
      order.push(`storage-remove:${key}`);
      values.delete(key);
    }),
  };

  const passkeys: NativeRestoreCredentialDependencies["passkeys"] = {
    startRegistration: vi.fn(async () => ({
      data: {
        challenge_id: "registration-challenge",
        options: { user: { id: "dXNlcg" } },
      },
      error: null,
    })),
    verifyRegistration: vi.fn(async () => {
      order.push("server-verify-registration");
      return { data: { id: "passkey-db-id" }, error: null };
    }),
    startAuthentication: vi.fn(async () => ({
      data: {
        challenge_id: "authentication-challenge",
        options: { rpId: "zivosmedia.com" },
      },
      error: null,
    })),
    verifyAuthentication: vi.fn(async () => ({
      data: { session },
      error: null,
    })),
    list: vi.fn(async () => ({ data: [], error: null })),
    update: vi.fn(async () => ({ data: {}, error: null })),
    delete: vi.fn(async ({ passkeyId }) => {
      order.push(`server-delete:${passkeyId}`);
      return { data: null, error: null };
    }),
  };

  const dependencies: NativeRestoreCredentialDependencies = {
    enabled: true,
    isNativeAndroid: () => true,
    plugin,
    storage,
    passkeys,
    getSession: vi.fn(async () => session),
    operationTimeoutMs: 100,
    ...overrides,
  };

  return {
    coordinator: createNativeRestoreCredentialCoordinator(dependencies),
    dependencies,
    order,
    passkeys,
    plugin,
    session,
    storage,
    userId,
    values,
  };
}

describe("native Android restore credentials", () => {
  it("keeps restoration and provisioning disabled unless explicitly enabled", async () => {
    const test = setup({ enabled: false });

    expect(await test.coordinator.tryRestoreNativeSession()).toBeNull();
    await test.coordinator.provisionNativeRestoreCredential(test.userId);

    expect(test.plugin.getAvailability).not.toHaveBeenCalled();
    expect(test.passkeys.startAuthentication).not.toHaveBeenCalled();
    expect(test.passkeys.startRegistration).not.toHaveBeenCalled();
  });

  it("uses a native restore response to verify and return a Supabase session", async () => {
    const test = setup();

    await expect(test.coordinator.tryRestoreNativeSession()).resolves.toBe(
      test.session,
    );
    expect(test.passkeys.startAuthentication).toHaveBeenCalledOnce();
    expect(test.plugin.get).toHaveBeenCalledWith({
      requestJson: JSON.stringify({ rpId: "zivosmedia.com" }),
    });
    expect(test.passkeys.verifyAuthentication).toHaveBeenCalledWith({
      challengeId: "authentication-challenge",
      credential: { id: "authentication-response" },
    });
    expect([...test.values.values()]).not.toContain(
      JSON.stringify({ id: "authentication-response" }),
    );
  });

  it("provisions and labels one server-backed restore key per local account marker", async () => {
    const test = setup();

    await test.coordinator.provisionNativeRestoreCredential(test.userId);
    await test.coordinator.provisionNativeRestoreCredential(test.userId);

    expect(test.plugin.create).toHaveBeenCalledOnce();
    expect(test.passkeys.verifyRegistration).toHaveBeenCalledWith({
      challengeId: "registration-challenge",
      credential: { id: "registration-response" },
    });
    expect(test.passkeys.update).toHaveBeenCalledWith({
      passkeyId: "passkey-db-id",
      friendlyName: ANDROID_RESTORE_CREDENTIAL_LABEL,
    });
    expect([...test.values.values()]).toEqual(["passkey-db-id"]);
  });

  it("does not recreate a restore key after sign-out until an interactive sign-in", async () => {
    const test = setup();

    await test.coordinator.clearNativeRestoreCredential(test.userId);
    expect(test.values.get(ANDROID_RESTORE_CREDENTIAL_SUPPRESSION_KEY)).toBe(
      "true",
    );
    await expect(
      test.coordinator.tryRestoreNativeSession(),
    ).resolves.toBeNull();
    await test.coordinator.provisionNativeRestoreCredential(test.userId);
    expect(test.passkeys.startRegistration).not.toHaveBeenCalled();

    await test.coordinator.provisionNativeRestoreCredential(test.userId, {
      afterInteractiveSignIn: true,
    });
    expect(test.passkeys.startRegistration).toHaveBeenCalledOnce();
    expect(test.values.has(ANDROID_RESTORE_CREDENTIAL_SUPPRESSION_KEY)).toBe(
      false,
    );
  });

  it("clears the current native key before local sign-out", async () => {
    const test = setup();
    test.values.set(
      `zivo:android-restore-credential:passkey:${test.userId}`,
      "current-passkey",
    );

    await test.coordinator.clearNativeRestoreCredential(test.userId);

    expect(test.passkeys.delete).toHaveBeenCalledWith({
      passkeyId: "current-passkey",
    });
    expect(test.plugin.clear).toHaveBeenCalledOnce();
    expect(test.order[0]).toBe(
      `storage-set:${ANDROID_RESTORE_CREDENTIAL_SUPPRESSION_KEY}`,
    );
    expect([...test.values.keys()]).toEqual([
      ANDROID_RESTORE_CREDENTIAL_SUPPRESSION_KEY,
    ]);
  });

  it("removes every labeled Android restore key during global sign-out", async () => {
    const test = setup();
    test.values.set(
      `zivo:android-restore-credential:passkey:${test.userId}`,
      "current-passkey",
    );
    vi.mocked(test.passkeys.list).mockResolvedValueOnce({
      data: [
        {
          id: "current-passkey",
          friendly_name: ANDROID_RESTORE_CREDENTIAL_LABEL,
        },
        {
          id: "other-device-passkey",
          friendly_name: ANDROID_RESTORE_CREDENTIAL_LABEL,
        },
        { id: "user-passkey", friendly_name: "My phone" },
      ],
      error: null,
    });

    await test.coordinator.clearNativeRestoreCredential(test.userId, {
      allDevices: true,
    });

    expect(test.passkeys.delete).toHaveBeenCalledTimes(2);
    expect(test.passkeys.delete).toHaveBeenCalledWith({
      passkeyId: "current-passkey",
    });
    expect(test.passkeys.delete).toHaveBeenCalledWith({
      passkeyId: "other-device-passkey",
    });
    expect(test.passkeys.delete).not.toHaveBeenCalledWith({
      passkeyId: "user-passkey",
    });
  });

  it("blocks global sign-out when server restore-key cleanup is unavailable", async () => {
    const test = setup();
    vi.mocked(test.passkeys.list).mockResolvedValueOnce({
      data: null,
      error: new Error("offline"),
    });

    await expect(
      test.coordinator.clearNativeRestoreCredential(test.userId, {
        allDevices: true,
      }),
    ).rejects.toThrow("before global sign-out");
    expect(test.plugin.clear).toHaveBeenCalledOnce();
    expect(test.values.get(ANDROID_RESTORE_CREDENTIAL_SUPPRESSION_KEY)).toBe(
      "true",
    );
  });

  it("removes server restore keys during global sign-out from the web", async () => {
    const test = setup({ isNativeAndroid: () => false });
    vi.mocked(test.passkeys.list).mockResolvedValueOnce({
      data: [
        {
          id: "android-passkey",
          friendly_name: ANDROID_RESTORE_CREDENTIAL_LABEL,
        },
      ],
      error: null,
    });

    await test.coordinator.clearNativeRestoreCredential(test.userId, {
      allDevices: true,
    });

    expect(test.passkeys.delete).toHaveBeenCalledWith({
      passkeyId: "android-passkey",
    });
    expect(test.plugin.clear).not.toHaveBeenCalled();
    expect(test.storage.set).not.toHaveBeenCalled();
  });

  it("does not change web global sign-out while the foundation is disabled", async () => {
    const test = setup({
      enabled: false,
      isNativeAndroid: () => false,
    });

    await test.coordinator.clearNativeRestoreCredential(test.userId, {
      allDevices: true,
    });

    expect(test.passkeys.list).not.toHaveBeenCalled();
    expect(test.passkeys.delete).not.toHaveBeenCalled();
    expect(test.storage.set).not.toHaveBeenCalled();
  });
});
