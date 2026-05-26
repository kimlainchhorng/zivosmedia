import { describe, expect, it } from "vitest";
import { runLodgingQa } from "./lodgingQa";
import { auditLodgingSidebarTabs, LODGING_EMPTY_STATE_AUDIT } from "./lodgingSidebarAudit";
import { LODGING_TAB_IDS } from "@/lib/admin/storeTabRouting";

const completion = { percent: 80, complete: 8, total: 10, incompleteItems: [{ key: "rates", label: "Base rates", tab: "lodge-rate-plans" as const, ready: false, hint: "Add rates", actionLabel: "Add rates" }] };

describe("lodging QA engine", () => {
  it("returns route, sidebar, data, and empty-state checks", () => {
    const result = runLodgingQa({ storeId: "store-1", storeName: "QA Hotel", completion });
    expect(result.checks.some((check) => check.id === "deep-link-refresh" && check.status === "pass")).toBe(true);
    expect(result.deepLinks).toContain("/admin/stores/store-1?tab=lodge-rate-plans");
    expect(result.warningCount).toBeGreaterThanOrEqual(1);
  });

  it("audits every registered lodging tab for empty-state fix metadata", () => {
    const audit = auditLodgingSidebarTabs();
    expect(audit).toHaveLength(LODGING_TAB_IDS.length);
    expect(LODGING_EMPTY_STATE_AUDIT.map((item) => item.tab).sort()).toEqual([...LODGING_TAB_IDS].sort());
    expect(audit.every((item) => item.passes)).toBe(true);
  });
});