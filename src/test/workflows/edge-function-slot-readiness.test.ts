import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("Edge Function slot readiness", () => {
  it("keeps analytics browser telemetry gated until the live function is deployed", () => {
    const analytics = read("src/lib/analytics.ts");
    const envExample = read(".env.example");
    const deployEnvExample = read(".env.deploy.example");
    const script = read("scripts/qa/edge-function-slot-readiness.mjs");
    const notificationManage = read("src/lib/notifications/notificationManage.ts");
    const socialNotificationManage = read("src/lib/notifications/socialNotificationManage.ts");
    const pushDeviceManage = read("src/lib/notifications/pushDeviceManage.ts");
    const talentInviteNotification = read("src/lib/notifications/talentInviteNotification.ts");
    const adminBroadcastNotification = read("src/lib/notifications/adminBroadcastNotification.ts");
    const liveGap = read("docs/qa/edge-function-live-gap-2026-06-03.json");

    expect(analytics).toContain("VITE_ANALYTICS_EVENT_TRACK_ENABLED");
    expect(analytics).toContain("ANALYTICS_EDGE_ENABLED");
    expect(analytics).toContain("if (!ANALYTICS_EDGE_ENABLED)");
    expect(envExample).toContain("VITE_ANALYTICS_EVENT_TRACK_ENABLED=false");
    expect(deployEnvExample).toContain("VITE_ANALYTICS_EVENT_TRACK_ENABLED=false");
    expect(envExample).toContain("VITE_NOTIFICATION_MANAGE_ENABLED=false");
    expect(deployEnvExample).toContain("VITE_NOTIFICATION_MANAGE_ENABLED=false");
    expect(envExample).toContain("VITE_SOCIAL_NOTIFICATION_MANAGE_ENABLED=false");
    expect(deployEnvExample).toContain("VITE_SOCIAL_NOTIFICATION_MANAGE_ENABLED=false");
    expect(envExample).toContain("VITE_PUSH_DEVICE_MANAGE_ENABLED=false");
    expect(deployEnvExample).toContain("VITE_PUSH_DEVICE_MANAGE_ENABLED=false");
    expect(envExample).toContain("VITE_TALENT_INVITE_NOTIFICATION_ENABLED=false");
    expect(deployEnvExample).toContain("VITE_TALENT_INVITE_NOTIFICATION_ENABLED=false");
    expect(envExample).toContain("VITE_ADMIN_BROADCAST_NOTIFICATION_ENABLED=false");
    expect(deployEnvExample).toContain("VITE_ADMIN_BROADCAST_NOTIFICATION_ENABLED=false");
    // notificationManage now mutates directly under per-user RLS (no browser
    // feature flag); it still surfaces NotificationManageUnavailableError when
    // there is no signed-in user.
    expect(notificationManage).toContain("NotificationManageUnavailableError");
    expect(socialNotificationManage).toContain("VITE_SOCIAL_NOTIFICATION_MANAGE_ENABLED");
    expect(socialNotificationManage).toContain("SocialNotificationManageUnavailableError");
    expect(pushDeviceManage).toContain("VITE_PUSH_DEVICE_MANAGE_ENABLED");
    expect(pushDeviceManage).toContain("PushDeviceManageUnavailableError");
    expect(talentInviteNotification).toContain("VITE_TALENT_INVITE_NOTIFICATION_ENABLED");
    expect(talentInviteNotification).toContain("TalentInviteNotificationUnavailableError");
    expect(adminBroadcastNotification).toContain("VITE_ADMIN_BROADCAST_NOTIFICATION_ENABLED");
    expect(adminBroadcastNotification).toContain("AdminBroadcastNotificationUnavailableError");
    expect(script).toContain("browserFeatureFlag: \"VITE_ANALYTICS_EVENT_TRACK_ENABLED\"");
    expect(script).toContain("browserFeatureFlag: \"VITE_NOTIFICATION_MANAGE_ENABLED\"");
    expect(script).toContain("browserFeatureFlag: \"VITE_SOCIAL_NOTIFICATION_MANAGE_ENABLED\"");
    expect(script).toContain("browserFeatureFlag: \"VITE_PUSH_DEVICE_MANAGE_ENABLED\"");
    expect(script).toContain("browserFeatureFlag: \"VITE_TALENT_INVITE_NOTIFICATION_ENABLED\"");
    expect(script).toContain("browserFeatureFlag: \"VITE_ADMIN_BROADCAST_NOTIFICATION_ENABLED\"");
    expect(script).toContain("knownLiveGapPath");
    expect(script).toContain("local-plus-known-live-gap");
    expect(script).toContain("missingLiveCritical");
    expect(liveGap).toContain('"slug": "analytics-event-track"');
    expect(liveGap).toContain('"liveStatus": "not_found"');
  });

  it("wires the slot-readiness report into deploy QA scripts", () => {
    const packageJson = read("package.json");
    const browserGates = read("scripts/qa/edge-function-browser-gates.mjs");
    expect(packageJson).toContain('"qa:edge-function-slot-readiness"');
    expect(packageJson).toContain("scripts/qa/edge-function-slot-readiness.mjs --write-report");
    expect(packageJson).toContain('"qa:edge-function-browser-gates"');
    expect(packageJson).toContain("scripts/qa/edge-function-browser-gates.mjs");
    expect(packageJson).toContain("qa:edge-function-deploy-contracts && npm run qa:edge-function-slot-readiness");
    expect(packageJson).toContain("qa:edge-function-slot-readiness && npm run qa:edge-function-browser-gates");
    expect(browserGates).toContain("direct browser invoke found");
    expect(browserGates).toContain("VITE_ADMIN_BROADCAST_NOTIFICATION_ENABLED");
  });

  it("stores the known live deployment gap in the generated readiness report", () => {
    const report = JSON.parse(read("docs/qa/edge-function-slot-readiness.json"));
    expect(report.mode).toBe("local-plus-known-live-gap");
    expect(report.counts.missingLiveCritical).toBeGreaterThanOrEqual(1);
    expect(report.missingLiveCritical).toContain("analytics-event-track");
    expect(report.knownLiveGap.path).toBe("docs/qa/edge-function-live-gap-2026-06-03.json");
  });
});
