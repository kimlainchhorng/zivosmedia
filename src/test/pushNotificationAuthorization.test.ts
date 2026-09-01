import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = readFileSync(
  path.join(root, "supabase/functions/send-push-notification/index.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

function between(start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThan(-1);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("push notification authorization boundary", () => {
  it("authenticates before the service client can resolve any recipient tokens", () => {
    const authIndex = source.indexOf("callerUserId = userData.user.id");
    const authorizationIndex = source.indexOf(
      "const authorized = isServiceCall",
    );
    const tokenIndex = source.indexOf(
      '.from("device_tokens")',
      authorizationIndex,
    );

    expect(authIndex).toBeGreaterThan(-1);
    expect(authorizationIndex).toBeGreaterThan(authIndex);
    expect(tokenIndex).toBeGreaterThan(authorizationIndex);
    expect(source).toMatch(
      /const isServiceCall =\s*!!serviceKey &&\s*authHeader === `Bearer \$\{serviceKey\}`/,
    );
    expect(source).toMatch(/withSecurity\(\s*"send-push-notification"/);
    expect(source).toContain("strictCors: true");
    expect(source).toContain('rateLimit: "api_general"');
    expect(source).toContain('trackNetwork: "suspicious"');
  });

  it("does not let an ordinary caller select a batch or arbitrary device", () => {
    const ordinary = between(
      "async function authorizeUserPush(",
      "function authorizeServicePush(",
    );

    expect(ordinary).toContain(
      "payload.user_ids != null || payload.device_token_id != null",
    );
    expect(ordinary).toContain("Privileged recipient selection required");
    expect(ordinary).toContain("const targetUserId = requireUuid");
    expect(ordinary).toContain("if (targetUserId === actorId)");
    expect(ordinary).toContain("SELF_TEMPLATES[requestedType]");
    expect(source).toContain("new_delivery_driver: {");
    expect(ordinary).toContain("Unsupported self notification template");
    expect(ordinary).toContain("Privileged notification sender required");
    expect(ordinary).not.toContain("title: payload.title");
    expect(ordinary).not.toContain("body: payload.body");
    expect(ordinary).not.toContain("data: payload.data");
  });

  it("derives cross-account recipients and copy from durable relationships", () => {
    const ordinary = between(
      "async function authorizeUserPush(",
      "function authorizeServicePush(",
    );

    for (const evidenceTable of [
      'from("user_followers")',
      'from("friendships")',
      'from("post_likes")',
      'from("post_comments")',
      'from("user_posts")',
      'from("direct_messages")',
      'from("call_signals")',
      'from("jobs")',
    ]) {
      expect(ordinary).toContain(evidenceTable);
    }
    expect(ordinary).toContain('.eq("follower_id", actorId)');
    expect(ordinary).toContain('.eq("following_id", targetUserId)');
    expect(ordinary).toContain('.eq("sender_id", actorId)');
    expect(ordinary).toContain('.eq("receiver_id", targetUserId)');
    expect(ordinary).toContain('.eq("caller_id", actorId)');
    expect(ordinary).toContain('.eq("callee_id", targetUserId)');
    expect(ordinary).toContain('.eq("customer_id", targetUserId)');
    expect(ordinary).toContain('.eq("assigned_driver_id", actorId)');
    expect(ordinary).toContain("Assigned job state required");
    expect(ordinary).toContain("Could not verify follow");
    expect(ordinary).toContain("Could not verify friend relationship");
    expect(ordinary).toContain("Could not verify post");
    expect(ordinary).toContain("Could not verify chat message");
    expect(ordinary).toContain("Could not verify call");
  });

  it("permits privileged batching only with the exact service credential", () => {
    const privileged = between(
      "function authorizeServicePush(",
      "function preferenceAllowsPush(",
    );

    expect(privileged).toContain("Exactly one recipient selector is required");
    expect(privileged).toContain("payload.user_ids.map");
    expect(privileged).toContain("if (payload.user_ids.length > 500)");
    expect(privileged).toContain("Too many recipients");
    expect(privileged).toContain("sanitizeServiceData(payload.data)");
    expect(privileged).toContain("safeHttpsImage(payload.image_url)");
  });

  it("rejects external, scheme-relative, control-character, and backslash routes", () => {
    const navigation = between(
      "function safeNavigationValue(",
      "function sanitizeServiceData(",
    );
    const serviceData = between(
      "function sanitizeServiceData(",
      "function safeHttpsImage(",
    );

    expect(source).toContain('"action_url"');
    expect(source).toContain('"actionUrl"');
    expect(source).toContain('"url"');
    expect(source).toContain('"deepLink"');
    expect(source).toContain('"deep_link"');
    expect(navigation).toContain('value.startsWith("/")');
    expect(navigation).toContain('!value.startsWith("//")');
    expect(navigation).toContain("/[\\\\\\u0000-\\u001f\\u007f]/");
    expect(navigation).toContain(
      'resolved.origin === "https://zivosmedia.com"',
    );
    expect(navigation).toContain("OFFICIAL_EXTERNAL_NAVIGATION_HOSTS.has");
    expect(serviceData).toContain("Unsafe notification destination");
    expect(serviceData).toContain("sanitized[key] = safeValue");
    expect(serviceData).toContain("continue;");
  });

  it("fails closed when token, subscription, or preference reads fail", () => {
    for (const failure of [
      "Could not resolve device recipient",
      "Could not resolve recipients",
      "Could not resolve recipient",
      "Could not resolve web recipient",
      "Could not resolve push preferences",
    ]) {
      expect(source).toContain(failure);
    }
    expect(source).toContain(
      "error instanceof PushRequestError ? error.status : 500",
    );
  });
});
