import {
  getInternalCronReadinessFailurePayload,
  isAuthorizedInternalCron,
  isInternalCronReadinessProbe,
  type InternalCronAuthDiagnosticEvent,
  type InternalCronAuthFailureStage,
  type InternalCronPurpose,
} from "./internalCronAuth.ts";

const environmentNames = [
  "INTERNAL_CRON_SECRET",
  "INTERNAL_CRON_LEGACY_AUTH_ENABLED",
  "TEST_LEGACY_CRON_SECRET",
] as const;
const encoder = new TextEncoder();

function assertEquals(actual: boolean, expected: boolean, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

async function withCronEnvironment(test: () => Promise<void>): Promise<void> {
  const previous = new Map(
    environmentNames.map((name) => [name, Deno.env.get(name)] as const),
  );

  try {
    for (const name of environmentNames) Deno.env.delete(name);
    await test();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

async function sha256Hex(value: BufferSource): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", value));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(message)),
  );
  return Array.from(signature, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

interface SignedRequestInput {
  secret: string;
  nonce?: string;
  timestamp?: number;
  purpose?: InternalCronPurpose;
  path?: string;
  requestPath?: string;
  body?: string;
  extraHeaders?: Record<string, string>;
}

async function signedRequest({
  secret,
  nonce = crypto.randomUUID(),
  timestamp = Math.floor(Date.now() / 1000),
  purpose = "execute",
  path = "/functions/v1/auto-cancel-stale-orders",
  requestPath = path,
  body = "{}",
  extraHeaders = {},
}: SignedRequestInput): Promise<Request> {
  const bodyHash = await sha256Hex(encoder.encode(body));
  const message = [
    "zivo-cron-v1",
    String(timestamp),
    nonce,
    "POST",
    path,
    purpose,
    bodyHash,
  ].join("\n");
  const signature = await hmacHex(secret, message);
  return new Request(`https://example.test${requestPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-zivo-cron-version": "zivo-cron-v1",
      "x-zivo-cron-timestamp": String(timestamp),
      "x-zivo-cron-nonce": nonce,
      "x-zivo-cron-purpose": purpose,
      "x-zivo-cron-signature": signature,
      ...extraHeaders,
    },
    body,
  });
}

Deno.test(
  "signed internal cron requests bind path, body, purpose, time, and one-use nonce",
  async () => {
    await withCronEnvironment(async () => {
      const secret = "i".repeat(48);
      Deno.env.set("INTERNAL_CRON_SECRET", secret);
      const claimed = new Set<string>();
      const diagnostics: InternalCronAuthDiagnosticEvent[] = [];
      const observedStages: InternalCronAuthFailureStage[] = [];
      const nonceClaimer = async (nonce: string) => {
        if (claimed.has(nonce)) return false;
        claimed.add(nonce);
        return true;
      };
      const options = {
        functionName: "auto-cancel-stale-orders",
        nonceClaimer,
        diagnosticLogger: (event: InternalCronAuthDiagnosticEvent) =>
          diagnostics.push(event),
        diagnosticObserver: (stage: InternalCronAuthFailureStage) =>
          observedStages.push(stage),
      } as const;

      const valid = await signedRequest({ secret });
      assertEquals(
        await isAuthorizedInternalCron(valid, options),
        true,
        "valid signed request",
      );
      assertEquals(
        await isAuthorizedInternalCron(valid, options),
        false,
        "replayed nonce",
      );

      const hostedRewrittenPath = await signedRequest({
        secret,
        requestPath: "/auto-cancel-stale-orders",
      });
      assertEquals(
        await isAuthorizedInternalCron(hostedRewrittenPath, options),
        true,
        "hosted rewritten runtime pathname",
      );

      const readiness = await signedRequest({
        secret,
        purpose: "readiness",
        requestPath: "/auto-cancel-stale-orders",
      });
      assertEquals(
        await isAuthorizedInternalCron(readiness, options),
        true,
        "signed readiness",
      );
      assertEquals(
        isInternalCronReadinessProbe(readiness),
        true,
        "signed readiness purpose",
      );
      const readinessFailurePayload = getInternalCronReadinessFailurePayload(
        readiness,
        "hmac",
      );
      assertEquals(
        JSON.stringify(readinessFailurePayload) ===
          '{"error":"signed_readiness_rejected","stage":"hmac"}',
        true,
        "signed readiness failure payload allowlist",
      );

      const executeWithUnsignedProbe = await signedRequest({
        secret,
        extraHeaders: { "x-cron-probe": "readiness" },
      });
      assertEquals(
        await isAuthorizedInternalCron(executeWithUnsignedProbe, options),
        true,
        "signed execute with irrelevant legacy probe header",
      );
      assertEquals(
        isInternalCronReadinessProbe(executeWithUnsignedProbe),
        false,
        "unsigned probe cannot change signed purpose",
      );
      assertEquals(
        getInternalCronReadinessFailurePayload(
          executeWithUnsignedProbe,
          "hmac",
        ) === null,
        true,
        "signed execute failure remains generic",
      );

      const purposeOnlyReadiness = new Request(
        "https://example.test/functions/v1/auto-cancel-stale-orders",
        {
          method: "POST",
          headers: { "x-zivo-cron-purpose": "readiness" },
          body: "{}",
        },
      );
      assertEquals(
        getInternalCronReadinessFailurePayload(
          purposeOnlyReadiness,
          "envelope",
        ) === null,
        true,
        "purpose-only readiness remains generic",
      );

      const partialReadiness = await signedRequest({
        secret,
        purpose: "readiness",
      });
      partialReadiness.headers.delete("x-zivo-cron-signature");
      assertEquals(
        getInternalCronReadinessFailurePayload(partialReadiness, "envelope") ===
          null,
        true,
        "partial readiness envelope remains generic",
      );

      const queriedReadiness = await signedRequest({
        secret,
        purpose: "readiness",
        requestPath: "/functions/v1/auto-cancel-stale-orders?mode=unexpected",
      });
      assertEquals(
        getInternalCronReadinessFailurePayload(queriedReadiness, "url") ===
          null,
        true,
        "readiness query mismatch remains generic",
      );

      assertEquals(
        await isAuthorizedInternalCron(
          new Request(
            "https://example.test/functions/v1/auto-cancel-stale-orders",
            {
              method: "POST",
              headers: { "x-zivo-cron-version": "zivo-cron-v1" },
              body: "{}",
            },
          ),
          options,
        ),
        false,
        "incomplete envelope",
      );

      const unreadableBody = await signedRequest({ secret });
      Object.defineProperty(unreadableBody, "clone", {
        value: () => {
          throw new Error("synthetic unreadable body");
        },
      });
      assertEquals(
        await isAuthorizedInternalCron(unreadableBody, options),
        false,
        "unreadable body",
      );

      const invalidHmac = await signedRequest({ secret });
      invalidHmac.headers.set("x-zivo-cron-signature", "0".repeat(64));
      assertEquals(
        await isAuthorizedInternalCron(invalidHmac, options),
        false,
        "invalid HMAC",
      );

      assertEquals(
        await isAuthorizedInternalCron(
          await signedRequest({
            secret,
            requestPath: "/auto-cancel-stale-orders?mode=unexpected",
          }),
          options,
        ),
        false,
        "query string",
      );
      assertEquals(
        diagnostics.at(-1)?.stage === "url",
        true,
        "query rejection stage",
      );
      assertEquals(
        await isAuthorizedInternalCron(
          await signedRequest({
            secret,
            path: "/functions/v1/close-trip-call-sessions",
            requestPath: "/auto-cancel-stale-orders",
          }),
          options,
        ),
        false,
        "wrong function path",
      );
      assertEquals(
        diagnostics.at(-1)?.stage === "hmac",
        true,
        "wrong-function signature fails HMAC",
      );
      assertEquals(
        await isAuthorizedInternalCron(
          await signedRequest({
            secret,
            timestamp: Math.floor(Date.now() / 1000) - 241,
          }),
          options,
        ),
        false,
        "expired signature",
      );
      assertEquals(
        await isAuthorizedInternalCron(
          await signedRequest({
            secret,
            timestamp: Math.floor(Date.now() / 1000) + 31,
          }),
          options,
        ),
        false,
        "excessive future timestamp",
      );

      for (const stage of [
        "envelope",
        "timestamp",
        "url",
        "body",
        "hmac",
        "nonce_claim",
      ] as const) {
        assertEquals(
          diagnostics.some((event) => event.stage === stage),
          true,
          `diagnostic stage ${stage}`,
        );
      }
      for (const event of diagnostics) {
        assertEquals(
          Object.keys(event).sort().join(",") === "event,function_name,stage",
          true,
          "diagnostic field allowlist",
        );
      }
      assertEquals(
        observedStages.join(",") ===
          diagnostics.map((event) => event.stage).join(","),
        true,
        "diagnostic observer receives stages only",
      );
    });
  },
);

Deno.test(
  "direct and former cron credentials require the explicit transition switch",
  async () => {
    await withCronEnvironment(async () => {
      const internalSecret = "i".repeat(48);
      const legacySecret = "legacy-test-value";
      Deno.env.set("INTERNAL_CRON_SECRET", internalSecret);
      Deno.env.set("TEST_LEGACY_CRON_SECRET", legacySecret);
      const options = {
        functionName: "auto-cancel-stale-orders",
        legacyBearerEnvNames: ["TEST_LEGACY_CRON_SECRET"],
        legacyHeaderEnvNames: ["TEST_LEGACY_CRON_SECRET"],
      } as const;

      const exactInternal = new Request("https://example.test", {
        method: "POST",
        headers: { "x-cron-secret": internalSecret },
      });
      const exactBearer = new Request("https://example.test", {
        method: "POST",
        headers: { Authorization: `Bearer ${legacySecret}` },
      });
      const legacyUnsignedProbe = new Request("https://example.test", {
        method: "POST",
        headers: {
          "x-cron-secret": internalSecret,
          "x-cron-probe": "readiness",
        },
      });

      assertEquals(
        await isAuthorizedInternalCron(exactInternal, options),
        false,
        "direct secret disabled by default",
      );
      assertEquals(
        await isAuthorizedInternalCron(exactBearer, options),
        false,
        "legacy bearer disabled by default",
      );

      Deno.env.set("INTERNAL_CRON_LEGACY_AUTH_ENABLED", "true");
      assertEquals(
        await isAuthorizedInternalCron(exactInternal, options),
        true,
        "direct secret during cutover",
      );
      assertEquals(
        await isAuthorizedInternalCron(exactBearer, options),
        true,
        "exact legacy bearer during cutover",
      );
      assertEquals(
        await isAuthorizedInternalCron(legacyUnsignedProbe, options),
        true,
        "direct secret with unsigned probe header during cutover",
      );
      assertEquals(
        isInternalCronReadinessProbe(legacyUnsignedProbe),
        false,
        "legacy credentials cannot select no-op readiness",
      );
      assertEquals(
        getInternalCronReadinessFailurePayload(
          legacyUnsignedProbe,
          "envelope",
        ) === null,
        true,
        "legacy or unsigned failure remains generic",
      );
      assertEquals(
        await isAuthorizedInternalCron(
          new Request("https://example.test", {
            method: "POST",
            headers: { Authorization: `Bearer prefix-${legacySecret}` },
          }),
          options,
        ),
        false,
        "prefixed legacy bearer",
      );
      assertEquals(
        await isAuthorizedInternalCron(
          new Request(`https://example.test?secret=${internalSecret}`, {
            method: "POST",
          }),
          options,
        ),
        false,
        "query secret",
      );

      Deno.env.set("INTERNAL_CRON_LEGACY_AUTH_ENABLED", "false");
      assertEquals(
        await isAuthorizedInternalCron(exactInternal, options),
        false,
        "direct secret disabled after cutover",
      );
      assertEquals(
        await isAuthorizedInternalCron(exactBearer, options),
        false,
        "legacy disabled after cutover",
      );

      assertEquals(
        await isAuthorizedInternalCron(
          await signedRequest({ secret: internalSecret }),
          {
            functionName: "auto-cancel-stale-orders",
            nonceClaimer: async () => true,
          },
        ),
        true,
        "signed steady-state request",
      );
    });
  },
);
