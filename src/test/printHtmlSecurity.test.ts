import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8").replace(/\r\n/g, "\n");

describe("same-origin print HTML boundaries", () => {
  it("escapes stored inspection, folio, and voucher text before print-window rendering", () => {
    const inspections = read("src/components/admin/store/autorepair/AutoRepairInspectionsSection.tsx");
    const folio = read("src/components/admin/store/lodging/LodgingFolioSection.tsx");
    const vouchers = read("src/components/admin/store/lodging/LodgingGiftVouchersSection.tsx");

    expect(inspections).toContain('import { escapeHtml } from "@/lib/escapeHtml";');
    expect(inspections).toContain("const summaryText = escapeHtml(i.summary || \"\");");
    expect(inspections).not.toContain('<br>${i.summary}</div>');
    expect(folio).toContain("escapeHtml(lines)");
    expect(vouchers).toContain("escapeHtml(v.message)");
    expect(vouchers).toContain("escapeHtml(v.recipient_name)");
  });
});
