import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("ZIVO Software and Media business handoff", () => {
  it("links existing Media owner businesses to the Software callback flow", () => {
    const handoff = read("supabase/functions/software-media-handoff/index.ts");
    const connectSoftware = read("src/pages/ConnectSoftware.tsx");
    const connectMedia = read("src/pages/ConnectMedia.tsx");
    const wizard = read("src/pages/business/BusinessPageWizard.tsx");
    const planSelection = read("src/lib/software/softwarePlanSelection.ts");

    expect(handoff).toContain('.from("store_profiles")');
    expect(handoff).toContain('.eq("owner_id", mediaUser.id)');
    expect(handoff).toContain('normalizeCategory(store.category) === "auto repair"');
    expect(handoff).toContain("zivo_media_dashboard_url");
    expect(handoff).toContain("media_dashboard_url");
    expect(handoff).toContain("withSecurity");
    expect(handoff).toContain("strictCors: true");
    expect(handoff).toContain('allowedMethods: ["POST"]');

    expect(connectSoftware).toContain("validateMediaDashboardUrl");
    expect(connectSoftware).toContain("finalRedirect = mediaDashboard.toString()");
    expect(connectMedia).toContain("isExternalRedirectTarget(destination)");
    expect(connectMedia).toContain("window.location.assign(destination)");

    expect(wizard).toContain("zivo_media_dashboard_url");
    expect(wizard.match(/window\.location\.assign\(\s*appendSoftwarePlanSelection/g)).toHaveLength(2);
    expect(planSelection).toContain('url.searchParams.set("tab", "subscriptions")');
    expect(planSelection).toContain('url.searchParams.set("plan_id", validPlanId)');
    expect(planSelection).toContain('url.searchParams.set("cycle", cycle)');
    expect(wizard).toContain('normalizeStoreCategory(store.category) === "auto repair"');
    expect(wizard).toContain('!isSoftwareDomain || normalizeStoreCategory(store.category) === "auto repair"');
    expect(wizard).toContain('option.value === "auto-repair"');
    expect(wizard).toContain('.order("created_at", { ascending: false })');
    expect(wizard).not.toContain('.eq("owner_id", user.id)\n        .maybeSingle()');
  });
});
