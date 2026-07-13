import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

test.describe("server and route error fallback contracts", () => {
  test("error boundaries expose support codes and structured client events", async () => {
    const globalBoundary = fs.readFileSync(path.join(root, "src/components/shared/ErrorBoundary.tsx"), "utf8");
    const routeBoundary = fs.readFileSync(path.join(root, "src/components/shared/RouteErrorBoundary.tsx"), "utf8");
    const reporting = fs.readFileSync(path.join(root, "src/lib/security/errorReporting.ts"), "utf8");

    expect(globalBoundary).toContain("reportBoundaryError");
    expect(globalBoundary).toContain("Support code:");
    expect(routeBoundary).toContain("reportBoundaryError");
    expect(routeBoundary).toContain("Support code:");
    expect(reporting).toContain('event_name: "client_error_boundary"');
    expect(reporting).toContain('new CustomEvent("zivo:client-error"');
  });

  test("api observability workflow keeps backend incident ownership documented", async () => {
    const runbook = fs.readFileSync(path.join(root, "docs/api-operations-runbook.md"), "utf8");
    const workflow = fs.readFileSync(path.join(root, "src/test/workflows/api-operations-readiness.test.ts"), "utf8");
    const testPlan = fs.readFileSync(path.join(root, "scripts/qa/workflow-test-plan.mjs"), "utf8");

    expect(runbook).toContain("Function 5xx");
    expect(runbook).toContain("Webhook failure");
    expect(runbook).toContain("Slow query");
    expect(testPlan).toContain("health/error visibility");
    expect(workflow).toContain("function 5xx");
  });
});
