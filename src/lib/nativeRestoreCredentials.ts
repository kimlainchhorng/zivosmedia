import { Capacitor, registerPlugin } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { Session } from "@supabase/supabase-js";
import { authSupabase } from "@/integrations/supabase/client";

export const ANDROID_RESTORE_CREDENTIAL_LABEL = "ZIVO Android restore key";
export const ANDROID_RESTORE_CREDENTIAL_SUPPRESSION_KEY =
  "zivo:android-restore-credential:suppressed";

const ANDROID_RESTORE_CREDENTIAL_PASSKEY_PREFIX =
  "zivo:android-restore-credential:passkey:";
const DEFAULT_OPERATION_TIMEOUT_MS = 6_000;

interface RestoreCredentialsPlugin {
  getAvailability(): Promise<{
    supported: boolean;
    androidApi: number;
    gmsVersion: number;
  }>;
  create(options: { requestJson: string }): Promise<{
    responseJson: string;
    cloudBackupEnabled: boolean;
  }>;
  get(options: {
    requestJson: string;
  }): Promise<{ available: false } | { available: true; responseJson: string }>;
  clear(): Promise<{ cleared: boolean }>;
}

interface NativeRestoreStorage {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
}

interface PasskeyResult<T> {
  data: T | null;
  error: unknown | null;
}

interface NativeRestorePasskeyApi {
  startRegistration(): Promise<
    PasskeyResult<{ challenge_id: string; options: unknown }>
  >;
  verifyRegistration(params: {
    challengeId: string;
    credential: unknown;
  }): Promise<PasskeyResult<{ id: string }>>;
  startAuthentication(): Promise<
    PasskeyResult<{ challenge_id: string; options: unknown }>
  >;
  verifyAuthentication(params: {
    challengeId: string;
    credential: unknown;
  }): Promise<PasskeyResult<{ session: Session | null }>>;
  list(): Promise<PasskeyResult<Array<{ id: string; friendly_name?: string }>>>;
  update(params: {
    passkeyId: string;
    friendlyName: string;
  }): Promise<PasskeyResult<unknown>>;
  delete(params: { passkeyId: string }): Promise<PasskeyResult<unknown>>;
}

export interface NativeRestoreCredentialDependencies {
  enabled: boolean;
  isNativeAndroid: () => boolean;
  plugin: RestoreCredentialsPlugin;
  storage: NativeRestoreStorage;
  passkeys: NativeRestorePasskeyApi;
  getSession: () => Promise<Session | null>;
  warn?: (operation: string) => void;
  operationTimeoutMs?: number;
}

export interface ProvisionNativeRestoreCredentialOptions {
  afterInteractiveSignIn?: boolean;
}

export interface ClearNativeRestoreCredentialOptions {
  allDevices?: boolean;
}

function passkeyStorageKey(userId: string) {
  return `${ANDROID_RESTORE_CREDENTIAL_PASSKEY_PREFIX}${userId}`;
}

function parseCredentialResponse(responseJson: string): unknown {
  const parsed = JSON.parse(responseJson) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Credential response must be a JSON object");
  }
  return parsed;
}

function withTimeout<T>(
  operation: PromiseLike<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error("Native restore credential operation timed out")),
      timeoutMs,
    );

    Promise.resolve(operation).then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error: unknown) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export function createNativeRestoreCredentialCoordinator(
  dependencies: NativeRestoreCredentialDependencies,
) {
  const timeoutMs =
    dependencies.operationTimeoutMs ?? DEFAULT_OPERATION_TIMEOUT_MS;
  let suppressedForProcess = false;
  let lifecycleQueue: Promise<void> = Promise.resolve();

  const warn = (operation: string) => {
    dependencies.warn?.(operation);
  };

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = lifecycleQueue.then(operation, operation);
    lifecycleQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const readStorage = async (key: string): Promise<string | null> => {
    const result = await withTimeout(
      dependencies.storage.get({ key }),
      timeoutMs,
    );
    return result.value;
  };

  const setStorage = (key: string, value: string) =>
    withTimeout(dependencies.storage.set({ key, value }), timeoutMs);

  const removeStorage = (key: string) =>
    withTimeout(dependencies.storage.remove({ key }), timeoutMs);

  const isAvailable = async () => {
    const availability = await withTimeout(
      dependencies.plugin.getAvailability(),
      timeoutMs,
    );
    return availability.supported;
  };

  const isPersistentlySuppressed = async () =>
    (await readStorage(ANDROID_RESTORE_CREDENTIAL_SUPPRESSION_KEY)) === "true";

  const tryRestoreNativeSession = (): Promise<Session | null> =>
    enqueue(async () => {
      if (
        !dependencies.enabled ||
        !dependencies.isNativeAndroid() ||
        suppressedForProcess
      ) {
        return null;
      }

      try {
        if ((await isPersistentlySuppressed()) || !(await isAvailable())) {
          return null;
        }

        const start = await withTimeout(
          dependencies.passkeys.startAuthentication(),
          timeoutMs,
        );
        if (start.error || !start.data?.challenge_id || !start.data.options) {
          return null;
        }

        const nativeResponse = await withTimeout(
          dependencies.plugin.get({
            requestJson: JSON.stringify(start.data.options),
          }),
          timeoutMs,
        );
        if (!nativeResponse.available || suppressedForProcess) return null;

        const verified = await withTimeout(
          dependencies.passkeys.verifyAuthentication({
            challengeId: start.data.challenge_id,
            credential: parseCredentialResponse(nativeResponse.responseJson),
          }),
          timeoutMs,
        );
        if (verified.error || suppressedForProcess) return null;
        return verified.data?.session ?? null;
      } catch {
        warn("restore");
        return null;
      }
    });

  const provisionNativeRestoreCredential = (
    userId: string,
    options: ProvisionNativeRestoreCredentialOptions = {},
  ): Promise<void> =>
    enqueue(async () => {
      if (!dependencies.enabled || !dependencies.isNativeAndroid() || !userId) {
        return;
      }

      try {
        const persistentlySuppressed = await isPersistentlySuppressed();
        if (
          (suppressedForProcess || persistentlySuppressed) &&
          !options.afterInteractiveSignIn
        ) {
          return;
        }

        if (options.afterInteractiveSignIn) {
          suppressedForProcess = false;
          await removeStorage(ANDROID_RESTORE_CREDENTIAL_SUPPRESSION_KEY);
        }

        if (suppressedForProcess) return;
        const activeSession = await withTimeout(
          dependencies.getSession(),
          timeoutMs,
        );
        if (activeSession?.user.id !== userId || suppressedForProcess) return;

        const key = passkeyStorageKey(userId);
        if (await readStorage(key)) return;
        if (!(await isAvailable()) || suppressedForProcess) return;

        const start = await withTimeout(
          dependencies.passkeys.startRegistration(),
          timeoutMs,
        );
        if (start.error || !start.data?.challenge_id || !start.data.options) {
          throw new Error("Could not start restore credential registration");
        }

        const nativeResponse = await withTimeout(
          dependencies.plugin.create({
            requestJson: JSON.stringify(start.data.options),
          }),
          timeoutMs,
        );
        if (suppressedForProcess) {
          await withTimeout(dependencies.plugin.clear(), timeoutMs);
          return;
        }

        const verified = await withTimeout(
          dependencies.passkeys.verifyRegistration({
            challengeId: start.data.challenge_id,
            credential: parseCredentialResponse(nativeResponse.responseJson),
          }),
          timeoutMs,
        );
        const passkeyId = verified.data?.id;
        if (verified.error || !passkeyId) {
          await withTimeout(dependencies.plugin.clear(), timeoutMs);
          throw new Error("Could not verify restore credential registration");
        }

        if (suppressedForProcess) {
          await Promise.allSettled([
            withTimeout(dependencies.passkeys.delete({ passkeyId }), timeoutMs),
            withTimeout(dependencies.plugin.clear(), timeoutMs),
          ]);
          return;
        }

        const named = await withTimeout(
          dependencies.passkeys.update({
            passkeyId,
            friendlyName: ANDROID_RESTORE_CREDENTIAL_LABEL,
          }),
          timeoutMs,
        );
        if (named.error) {
          await Promise.allSettled([
            withTimeout(dependencies.passkeys.delete({ passkeyId }), timeoutMs),
            withTimeout(dependencies.plugin.clear(), timeoutMs),
          ]);
          throw new Error("Could not label restore credential registration");
        }

        if (suppressedForProcess) {
          await Promise.allSettled([
            withTimeout(dependencies.passkeys.delete({ passkeyId }), timeoutMs),
            withTimeout(dependencies.plugin.clear(), timeoutMs),
          ]);
          return;
        }

        try {
          await setStorage(key, passkeyId);
        } catch {
          await Promise.allSettled([
            withTimeout(dependencies.passkeys.delete({ passkeyId }), timeoutMs),
            withTimeout(dependencies.plugin.clear(), timeoutMs),
          ]);
          throw new Error("Could not persist restore credential ownership");
        }
      } catch {
        warn("provision");
      }
    });

  const clearNativeRestoreCredential = (
    userId?: string,
    options: ClearNativeRestoreCredentialOptions = {},
  ): Promise<void> => {
    suppressedForProcess = true;

    return enqueue(async () => {
      const nativeAndroid = dependencies.isNativeAndroid();
      if (!nativeAndroid && (!options.allDevices || !dependencies.enabled)) {
        return;
      }

      if (nativeAndroid) {
        try {
          await setStorage(ANDROID_RESTORE_CREDENTIAL_SUPPRESSION_KEY, "true");
        } catch {
          warn("suppress");
        }
      }

      const key = nativeAndroid && userId ? passkeyStorageKey(userId) : null;
      let storedPasskeyId: string | null = null;
      if (key) {
        try {
          storedPasskeyId = await readStorage(key);
        } catch {
          warn("read");
        }
      }

      const passkeyIds = new Set<string>();
      const requireGlobalServerCleanup = Boolean(
        options.allDevices && (dependencies.enabled || storedPasskeyId),
      );
      let globalServerCleanupFailed = Boolean(
        requireGlobalServerCleanup && !userId,
      );
      if (storedPasskeyId) passkeyIds.add(storedPasskeyId);

      if (requireGlobalServerCleanup && userId) {
        try {
          const listed = await withTimeout(
            dependencies.passkeys.list(),
            timeoutMs,
          );
          if (listed.error) {
            globalServerCleanupFailed = true;
          } else if (listed.data) {
            for (const passkey of listed.data) {
              if (passkey.friendly_name === ANDROID_RESTORE_CREDENTIAL_LABEL) {
                passkeyIds.add(passkey.id);
              }
            }
          }
        } catch {
          globalServerCleanupFailed = true;
          warn("list");
        }
      }

      const deletionResults = await Promise.allSettled(
        [...passkeyIds].map((passkeyId) =>
          withTimeout(dependencies.passkeys.delete({ passkeyId }), timeoutMs),
        ),
      );
      if (
        requireGlobalServerCleanup &&
        deletionResults.some(
          (result) =>
            result.status === "rejected" || Boolean(result.value.error),
        )
      ) {
        globalServerCleanupFailed = true;
      }

      if (nativeAndroid) {
        try {
          if (await isAvailable()) {
            await withTimeout(dependencies.plugin.clear(), timeoutMs);
          }
        } catch {
          warn("clear");
        }
      }

      if (key) {
        try {
          await removeStorage(key);
        } catch {
          warn("remove");
        }
      }

      if (globalServerCleanupFailed) {
        throw new Error(
          "Could not remove every Android restore key before global sign-out",
        );
      }
    });
  };

  return {
    tryRestoreNativeSession,
    provisionNativeRestoreCredential,
    clearNativeRestoreCredential,
  };
}

const RestoreCredentials =
  registerPlugin<RestoreCredentialsPlugin>("RestoreCredentials");

type RegistrationCredential = Parameters<
  typeof authSupabase.auth.passkey.verifyRegistration
>[0]["credential"];
type AuthenticationCredential = Parameters<
  typeof authSupabase.auth.passkey.verifyAuthentication
>[0]["credential"];

const nativeRestoreCoordinator = createNativeRestoreCredentialCoordinator({
  enabled: import.meta.env.VITE_ANDROID_RESTORE_CREDENTIALS_ENABLED === "true",
  isNativeAndroid: () =>
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android",
  plugin: RestoreCredentials,
  storage: Preferences,
  passkeys: {
    startRegistration: () => authSupabase.auth.passkey.startRegistration(),
    verifyRegistration: ({ challengeId, credential }) =>
      authSupabase.auth.passkey.verifyRegistration({
        challengeId,
        credential: credential as RegistrationCredential,
      }),
    startAuthentication: () => authSupabase.auth.passkey.startAuthentication(),
    verifyAuthentication: ({ challengeId, credential }) =>
      authSupabase.auth.passkey.verifyAuthentication({
        challengeId,
        credential: credential as AuthenticationCredential,
      }),
    list: () => authSupabase.auth.passkey.list(),
    update: (params) => authSupabase.auth.passkey.update(params),
    delete: (params) => authSupabase.auth.passkey.delete(params),
  },
  getSession: async () => {
    const { data, error } = await authSupabase.auth.getSession();
    return error ? null : data.session;
  },
  warn: (operation) => {
    console.warn(
      `[NativeRestoreCredentials] ${operation} was unavailable; continuing with normal sign-in.`,
    );
  },
});

export const tryRestoreNativeSession =
  nativeRestoreCoordinator.tryRestoreNativeSession;
export const provisionNativeRestoreCredential =
  nativeRestoreCoordinator.provisionNativeRestoreCredential;
export const clearNativeRestoreCredential =
  nativeRestoreCoordinator.clearNativeRestoreCredential;
