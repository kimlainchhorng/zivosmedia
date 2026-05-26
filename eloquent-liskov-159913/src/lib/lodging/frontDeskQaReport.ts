import { jsPDF } from "jspdf";
import { buildStoreTabUrl } from "@/lib/admin/storeTabRouting";
import type { LodgingQaResult } from "@/lib/lodging/lodgingQa";
import type { FrontDeskOperationalStats } from "@/lib/lodging/frontDeskQa";

export type FrontDeskQaReportInput = {
  storeId: string;
  storeName?: string | null;
  completion: { percent: number; complete: number; total: number };
  qa: LodgingQaResult;
  stats: FrontDeskOperationalStats;
  generatedAt?: Date;
  baseUrl?: string;
};

export function buildFrontDeskQaReport(input: FrontDeskQaReportInput) {
  const generatedAt = input.generatedAt || new Date();
  const systemFailures = input.qa.checks.filter((check) => check.status === "fail" && check.category !== "setup");
  const setupWarnings = input.qa.checks.filter((check) => check.status === "warning" || check.category === "setup");
  const tabs = ["lodge-frontdesk", "lodge-rooms", "lodge-rate-plans", "lodge-reservations", "lodge-guest-requests"];
  return {
    title: "Front Desk QA Report",
    generatedAt: generatedAt.toISOString(),
    storeLabel: input.storeName || input.storeId || "Hotel/Resort",
    stats: input.stats,
    completion: input.completion,
    qa: input.qa,
    systemFailures,
    setupWarnings,
    deepLinks: [...tabs.map((tab) => `${input.baseUrl || ""}${buildStoreTabUrl(input.storeId, tab)}`), `${input.baseUrl || ""}/admin/lodging/qa-checklist`, `${input.baseUrl || ""}/admin/lodging/completion-verification`],
  };
}

export function exportFrontDeskQaPdf(input: FrontDeskQaReportInput) {
  const report = buildFrontDeskQaReport(input);
  const pdf = new jsPDF();
  let y = 18;
  const line = (text: string, x = 14, size = 10) => {
    if (y > 280) { pdf.addPage(); y = 18; }
    pdf.setFontSize(size);
    pdf.text(text.slice(0, 110), x, y);
    y += size > 12 ? 9 : 7;
  };

  line(report.title, 14, 16);
  line(`Store: ${report.storeLabel}`);
  line(`Generated: ${report.generatedAt}`);
  line(`Completion: ${report.completion.percent}% (${report.completion.complete}/${report.completion.total})`);
  line(`QA: ${report.qa.overallStatus} · ${report.qa.passedCount} pass / ${report.qa.failedCount} fail / ${report.qa.warningCount} warning`);
  y += 3;
  line("Operational stats", 14, 12);
  Object.entries(report.stats).forEach(([key, value]) => line(`${key.replace(/([A-Z])/g, " $1")}: ${value}`, 18));
  y += 3;
  line("System failures", 14, 12);
  (report.systemFailures.length ? report.systemFailures : [{ name: "None", detail: "No system failures in latest Front Desk QA." }]).forEach((check: any) => line(`- ${check.name}: ${check.detail}`, 18));
  y += 3;
  line("Setup warnings", 14, 12);
  (report.setupWarnings.length ? report.setupWarnings : [{ name: "None", detail: "No setup warnings." }]).slice(0, 12).forEach((check: any) => line(`- ${check.name}: ${check.detail}`, 18));
  y += 3;
  line("Deep links", 14, 12);
  report.deepLinks.forEach((url) => line(url, 18));
  pdf.save("front-desk-qa-report.pdf");
  return report;
}