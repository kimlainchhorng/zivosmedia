import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

describe("auto repair Build R.O. workflow contracts", () => {
  it("keeps toolbar popup buttons connected to Build R.O. section dialogs", () => {
    const toolbar = source("src/components/admin/store/autorepair/BuildROIconToolbar.tsx");
    const buildRO = source("src/components/admin/store/autorepair/AutoRepairBuildROSection.tsx");
    const hub = source("src/components/admin/store/autorepair/BuildROHub.tsx");
    const sectionDialog = source("src/components/admin/store/autorepair/BuildROSectionDialog.tsx");
    const css = source("src/index.css");

    expect(toolbar).toContain("popup?: boolean");
    expect(toolbar).toContain('{ label: "Auto Repair Settings", tab: "settings", popup: true }');
    expect(toolbar).toContain("if (s.popup)");
    expect(toolbar).toContain("onNavigate?.(s.tab)");

    expect(buildRO).toContain("const BUILD_RO_POPUP_TABS = new Set");
    expect(buildRO).toContain("const initialPopupTab");
    expect(buildRO).toContain('mode: "push" | "replace" = "replace"');
    expect(buildRO).toContain("window.history.pushState");
    expect(buildRO).toContain('setSectionParam(nextTab, sectionTab === nextTab ? "replace" : "push")');
    expect(buildRO).toContain("setSectionTab((current) => (current === requested ? current : requested))");
    expect(buildRO).toContain("openSectionTab(\"ar-workorders\")");
    expect(buildRO).toContain("openSectionTab(\"ar-invoices\")");
    expect(buildRO).toContain("onNavigate={openSectionTab}");

    expect(sectionDialog).toContain("AutoRepairWarrantySection");
    expect(sectionDialog).toContain('tab === "settings" ? "Auto Repair Settings"');
    expect(sectionDialog).toContain('tab === "ar-warranty"');
    expect(sectionDialog).toContain("ar-section-dialog-content");
    expect(sectionDialog).not.toContain('title || "Open section"');

    expect(css).toContain(".ar-section-dialog-content");
    expect(css).toContain(".ar-section-dialog-frame");

    expect(hub).toContain("aria-expanded={showTickets}");
    expect(hub).toContain('aria-controls="build-ro-open-tickets"');
    expect(hub).toContain('id="build-ro-open-tickets"');
    expect(hub).toContain("aria-expanded={smsOpen}");
    expect(hub).toContain('aria-controls="build-ro-request-info"');
    expect(hub).toContain('id="build-ro-request-info"');
    expect(hub).toContain("const handleSmsOpenChange = (open: boolean) =>");
    expect(hub).toContain("if (!open) setSmsPhone(\"\");");
    expect(hub).toContain("const sendInfoSms = () =>");
    expect(hub).toContain("handleSmsOpenChange(false);");
    expect(hub).toContain("onClick={() => handleSmsOpenChange(!smsOpen)}");
    expect(hub).toContain('onKeyDown={(e) => { if (e.key === "Enter") sendInfoSms(); }}');
    expect(hub).toContain("onClick={sendInfoSms}");
    expect(hub).toContain('const handleSearchModeChange = (mode: "estimate" | "invoice") =>');
    expect(hub).toContain("setSearchMode(mode);");
    expect(hub).toContain('setSearchQ("");');
    expect(hub).toContain('onValueChange={(v: "estimate" | "invoice") => handleSearchModeChange(v)}');
  });

  it("preserves Build R.O. intake, summary, parts, and conversion workflow state", () => {
    const layout = source("src/components/admin/StoreOwnerLayout.tsx");
    const buildRO = source("src/components/admin/store/autorepair/AutoRepairBuildROSection.tsx");
    const bookingLinks = source("src/components/admin/store/autorepair/AutoRepairBookingLinkSection.tsx");
    const bookingPage = source("src/pages/store/ServiceBookingPage.tsx");
    const bookingUrl = source("src/lib/admin/autoRepairBookingUrl.ts");

    expect(layout).toContain('if (isAutoRepair && onTabChange && activeTab && activeTab !== "ar-dashboard")');
    expect(layout).toContain('onTabChange("ar-dashboard")');
    expect(layout).toContain('navigate("/more")');
    expect(layout).toContain("navigate(-1)");

    expect(layout).toContain('sessionStorage.setItem("ar_buildro_intake_type", type)');
    expect(layout).toContain('onTabChange?.("ar-build-ro")');
    expect(layout).toContain('window.dispatchEvent(new CustomEvent("ar-buildro-consume-prefill"))');

    expect(buildRO).toContain('sessionStorage.getItem("ar_buildro_open")');
    expect(buildRO).toContain('.eq("id", raw)\n        .eq("store_id", storeId)\n        .is("deleted_at", null)');
    expect(buildRO).toContain("const consumeBuildROIntakeType");
    expect(buildRO).toContain('window.addEventListener("ar-buildro-consume-prefill", consumeAll)');
    expect(buildRO).toContain("if (!vehicleId || boundVehicle || garage.length === 0) return");
    expect(buildRO).toContain("const gv = garage.find((g) => g.id === vehicleId)");
    expect(buildRO).toContain("setVehicleId(e.vehicle_id)");
    expect(buildRO).toContain("const persistVehicleLink = async (nextVehicleId: string | null)");
    expect(buildRO).toContain('.update({ vehicle_id: nextVehicleId }).eq("id", editId)');
    expect(buildRO).toContain("const clearBoundVehicle = () =>");
    expect((buildRO.match(/void persistVehicleLink\(nextVehicleId\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(buildRO).toContain("void persistVehicleLink(null)");
    expect(buildRO).toContain("const unbind = () => {\n    clearBoundVehicle();\n    void persistVehicleLink(null);");
    expect(buildRO).toContain('setEditId(null);\n    // Prefill the shop');
    expect(buildRO).toContain("clearBoundVehicle();\n    setCustSearch(\"\");");
    expect(buildRO).toContain("setEditId(e.id);\n    clearBoundVehicle();");
    expect(buildRO).toContain('queryKey: ["ar-build-ro-booking-store-slug", storeId]');
    expect(buildRO).toContain("buildAutoRepairBookingUrl({");
    expect(buildRO).toContain('params: { source: "build-ro-sms", phone }');
    expect(buildRO).toContain('document.getElementById("ar-estimate-summary")');
    expect(buildRO).toContain('id="ar-estimate-summary"');
    expect(buildRO).toContain("setCatalogVersion((v) => v + 1)");
    expect(buildRO).toContain("const closeTransientBuildROUi = () =>");
    expect(buildRO).toContain("closeTransientBuildROUi();");
    expect(buildRO).toContain('onHub: () => { closeTransientBuildROUi(); setView("hub"); }');
    expect(buildRO).toContain("const hasActiveWorkLines = useMemo");
    expect(buildRO).toContain('toast.error("Add at least one active line before sharing")');
    expect(buildRO).toContain('throw new Error("Add at least one active line before sending")');
    expect(buildRO).toContain("disabled={!hasActiveWorkLines}");
    expect(buildRO).toContain("disabled={!hasActiveWorkLines || !header.customer_email || sendChannel.isPending}");
    expect(buildRO).toContain("disabled={!hasActiveWorkLines || !header.customer_phone}");
    expect(buildRO).toContain('disabled={save.isPending} onClick={resetAll}');
    expect(buildRO).toContain('disabled={save.isPending} onClick={() => setPrintModalOpen(true)}');
    expect(buildRO).toContain("const persistOrderedLines = async (nextLines: ROLine[])");
    expect(buildRO).toContain("line_items: nextLines.map((l) => ({ ...l, name: l.description }))");
    expect(buildRO).toContain("const nextLines = lines.map((l) => (ids.includes(l.id) ? { ...l, ordered: true } : l))");
    expect(buildRO).toContain("void persistOrderedLines(nextLines)");
    expect(buildRO).toContain("setEpaC((current) => (current === c ? current : c))");
    expect(buildRO).toContain("setSuppliesC((current) => (current === c ? current : c))");
    expect(buildRO).toContain("shopDefaults?.epa, shopDefaults?.supplies, epaTouched, suppliesTouched");
    expect(buildRO).toContain('setPlaceOrderOpen(false)');
    expect(buildRO).toContain('queryKey: ["ar-build-ro-recent"');
    expect(buildRO).toContain('.is("deleted_at", null)');
    expect(buildRO).toContain('const searchAndLoad = async (mode: "estimate" | "invoice", q: string) =>');
    expect(buildRO).toContain('.select("*").eq("store_id", storeId).ilike("number", `%${term}%`)\n        .is("deleted_at", null)');
    expect(buildRO).toContain('.eq("id", inv.estimate_id)\n          .eq("store_id", storeId)\n          .is("deleted_at", null)');

    for (const requiredField of [
      'workflow_stage: "in_progress"',
      "workflow_stage: workflowStage",
      "customer_address: [header.customer_street",
      "vehicle_vin: boundVehicle?.vin",
      "parts: partsUsed",
      "labor: laborUsed",
      "subtotal_cents: t.lineSubtotal",
      "tax_cents: t.tax",
      "total_cents: t.total",
      "customer_notes: header.customer_request",
      "diagnosis_notes: [header.diagnosis, header.recommendation]",
    ]) {
      expect(buildRO).toContain(requiredField);
    }

    expect(bookingUrl).toContain("const pathId = (slug && slug.trim()) || storeId");
    expect(bookingLinks).toContain('queryKey: ["ar-booking-link-store-slug", storeId]');
    expect(bookingLinks).toContain("buildAutoRepairBookingUrl({ origin: window.location.origin, storeId, slug: storeSlug })");
    expect(bookingPage).toContain("const UUID_RE =");
    expect(bookingPage).toContain("if (!storeRow && UUID_RE.test(slug))");
    expect(bookingPage).toContain('const phone = searchParams.get("phone")');
    expect(bookingPage).toContain("customer_phone: phone");
  });

  it("connects technician action buttons to status and technician updates", () => {
    const statusDialog = source("src/components/admin/store/autorepair/BuildROStatusDialog.tsx");

    expect(statusDialog).toContain("const TECH_ACTIONS");
    expect(statusDialog).toContain("const handleTechAction");
    expect(statusDialog).toContain('value === "clock_in"');
    expect(statusDialog).toContain('value === "clock_out"');
    expect(statusDialog).toContain('value === "reassign"');
    expect(statusDialog).toContain('value === "split_labor"');
    expect(statusDialog).toContain('onSetStatus("in_progress")');
    expect(statusDialog).toContain('onSetStatus("on_hold")');
    expect(statusDialog).toContain('onSetTechnician("")');
    expect(statusDialog).toContain('onCommitTechnician?.("")');
    expect(statusDialog).toContain("setTechMode(true)");
    expect(statusDialog).toContain('import { useEffect, useMemo, useRef, useState } from "react"');
    expect(statusDialog).toContain("const resetStatusDialogState = () =>");
    expect(statusDialog).toContain("setTechMode(false);");
    expect(statusDialog).toContain("setMoreOpen(false);");
    expect(statusDialog).toContain("if (open) resetStatusDialogState();");
    expect(statusDialog).toContain("const handleOpenChange = (v: boolean) =>");
    expect(statusDialog).toContain("onOpenChange={handleOpenChange}");
    expect(statusDialog).toContain("onClick={() => handleOpenChange(false)}");
    expect(statusDialog).not.toContain("coming soon");
  });

  it("keeps vehicle dialog photo and Carfax controls connected to persisted data", () => {
    const vehicleDialog = source("src/components/admin/store/autorepair/BuildROVehicleDialog.tsx");

    expect(vehicleDialog).toContain("const [photoFile, setPhotoFile] = useState<File | null>(null)");
    expect(vehicleDialog).toContain("const photoInputRef = useRef<HTMLInputElement | null>(null)");
    expect(vehicleDialog).toContain('accept="image/*"');
    expect(vehicleDialog).toContain("onClick={() => photoInputRef.current?.click()}");
    expect(vehicleDialog).toContain('title={photoFile ? photoFile.name : "Add photo"}');
    expect(vehicleDialog).toContain('from("ar-job-photos")');
    expect(vehicleDialog).toContain(".upload(path, file");
    expect(vehicleDialog).toContain('from("ar_job_photos")');
    expect(vehicleDialog).toContain('photo_type: "vehicle"');
    expect(vehicleDialog).toContain('caption: "Vehicle photo captured from Build R.O."');
    expect(vehicleDialog).toContain('reportCarfax ? "Carfax reporting requested" : ""');
  });

  it("resets the Build R.O. vehicle dialog child state across every close path", () => {
    const vehicleDialog = source("src/components/admin/store/autorepair/BuildROVehicleDialog.tsx");

    expect(vehicleDialog).toContain("const resetVehicleDialogState = () =>");
    expect(vehicleDialog).toContain("setF(blank);");
    expect(vehicleDialog).toContain("setDecoding(false);");
    expect(vehicleDialog).toContain("setReportCarfax(true);");
    expect(vehicleDialog).toContain("setCarfaxOpen(false);");
    expect(vehicleDialog).toContain("setPhotoFile(null);");
    expect(vehicleDialog).toContain('if (photoInputRef.current) photoInputRef.current.value = "";');
    expect(vehicleDialog).toContain("if (open) resetVehicleDialogState();");
    expect(vehicleDialog).toContain("const handleOpenChange = (v: boolean) =>");
    expect(vehicleDialog).toContain("onOpenChange={handleOpenChange}");
    expect(vehicleDialog).toContain("handleOpenChange(false);");
  });

  it("keeps Build R.O. customer rating visible and included in the vehicle handoff memo", () => {
    const customerDialog = source("src/components/admin/store/autorepair/BuildROCustomerDialog.tsx");
    const buildRO = source("src/components/admin/store/autorepair/AutoRepairBuildROSection.tsx");

    expect(customerDialog).toContain("Customer rating");
    expect(customerDialog).toContain("[1, 2, 3, 4, 5].map((rating)");
    expect(customerDialog).toContain("set({ rating: f.rating === rating ? 0 : rating })");
    expect(customerDialog).toContain("aria-pressed={f.rating === rating}");
    expect(customerDialog).toContain('{f.rating ? `${f.rating}/5` : "No rating"}');
    expect(buildRO).toContain('customerDraft.rating ? `Customer rating: ${customerDraft.rating}/5` : ""');
    expect(buildRO).toContain("ownerMemo={customerMemo}");
    expect(buildRO).toContain("const openBlankCustomerDialog = () =>");
    expect(buildRO).toContain("setCustomerDraft(blankCustomer);");
    expect(buildRO).toContain("setPendingVehicleAfterCustomer(false);");
    expect(buildRO).toContain("onNewCustomer={() => { resetAll(); setView(\"builder\"); openBlankCustomerDialog(); }}");
    expect(buildRO).toContain("onClick={openBlankCustomerDialog}");
  });

  it("opens the existing-customer picker without stale search filters", () => {
    const existingCustomerDialog = source("src/components/admin/store/autorepair/BuildROExistingCustomerDialog.tsx");

    expect(existingCustomerDialog).toContain('import { useEffect, useMemo, useState } from "react"');
    expect(existingCustomerDialog).toContain("useEffect(() => {\n    if (open) setQ(\"\");\n  }, [open]);");
    expect(existingCustomerDialog).toContain("value={q}");
    expect(existingCustomerDialog).toContain('onClick={() => setQ("")}');
  });

  it("keeps archived R.O.s out of the drop-off and tow-in queue", () => {
    const intakeQueueDialog = source("src/components/admin/store/autorepair/BuildROIntakeQueueDialog.tsx");

    expect(intakeQueueDialog).toContain('queryKey: ["ar-intake-queue", storeId]');
    expect(intakeQueueDialog).toContain('.eq("store_id", storeId)');
    expect(intakeQueueDialog).toContain('.is("deleted_at", null)');
    expect(intakeQueueDialog).toContain('.in("appointment_type", ["Drop Off", "Towed In"])');
    expect(intakeQueueDialog).toContain("const DONE = new Set");
    expect(intakeQueueDialog).toContain('onClick={() => { onPick(e); onOpenChange(false); }}');
  });

  it("keeps the line composer parts catalog button connected", () => {
    const buildRO = source("src/components/admin/store/autorepair/AutoRepairBuildROSection.tsx");
    const lineComposer = source("src/components/admin/store/autorepair/BuildROLineComposer.tsx");

    expect(buildRO).toContain("onOpenCatalog={() => setOpenCatalog(true)}");
    expect(lineComposer).toContain("onOpenCatalog: () => void");
    expect(lineComposer).toContain("onAdd, onOpenCatalog");
    expect(lineComposer).toContain("onClick={onOpenCatalog}");
    expect(lineComposer).toContain('title="Open parts catalog"');
    expect(lineComposer).toContain("Catalog");
  });

  it("resets the line composer tax toggle after adding a line", () => {
    const lineComposer = source("src/components/admin/store/autorepair/BuildROLineComposer.tsx");

    expect(lineComposer).toContain("const [taxable, setTaxable] = useState(true)");
    expect(lineComposer).toContain("const reset = () =>");
    expect(lineComposer).toContain("setTaxable(true);");
    expect(lineComposer).toContain("reset();");
  });

  it("clears type-specific line composer fields when the line type changes", () => {
    const lineComposer = source("src/components/admin/store/autorepair/BuildROLineComposer.tsx");

    expect(lineComposer).toContain("const changeKind = (nextKind: ComposerKind) =>");
    expect(lineComposer).toContain("setKind(nextKind);");
    expect(lineComposer).toContain('setPartNumber("");');
    expect(lineComposer).toContain('setVendor("");');
    expect(lineComposer).toContain('setTechnician("");');
    expect(lineComposer).toContain('setCost("");');
    expect(lineComposer).toContain('setSell("");');
    expect(lineComposer).toContain("setSellTouched(false);");
    expect(lineComposer).toContain('setQty("1");');
    expect(lineComposer).toContain('setDisc("");');
    expect(lineComposer).toContain('setDiscType("%");');
    expect(lineComposer).toContain("setTaxable(true);");
    expect(lineComposer).toContain("onValueChange={(v: ComposerKind) => changeKind(v)}");
  });

  it("clears type-specific saved row fields when an existing line type changes", () => {
    const buildRO = source("src/components/admin/store/autorepair/AutoRepairBuildROSection.tsx");

    expect(buildRO).toContain("const changeLineKind = (id: string, kind: LineKind) =>");
    expect(buildRO).toContain("...blankLine(l.job, kind)");
    expect(buildRO).toContain("id: l.id");
    expect(buildRO).toContain("description: l.description");
    expect(buildRO).toContain('ordered: kind === "part" || kind === "tire" ? false : l.ordered');
    expect(buildRO).toContain("declined: l.declined");
    expect(buildRO).toContain("taxable: taxableFor(kind)");
    expect(buildRO).toContain("onValueChange={(v: LineKind) => changeLineKind(l.id, v)}");
  });

  it("resets imported parts text and vendor across every close path", () => {
    const importDialog = source("src/components/admin/store/autorepair/BuildROImportPartsDialog.tsx");

    expect(importDialog).toContain('import { useEffect, useMemo, useState } from "react"');
    expect(importDialog).toContain("const resetImportState = () =>");
    expect(importDialog).toContain('setText("");');
    expect(importDialog).toContain('setVendor("AutoZone");');
    expect(importDialog).toContain("if (open) resetImportState();");
    expect(importDialog).toContain("const handleOpenChange = (v: boolean) =>");
    expect(importDialog).toContain("onOpenChange={handleOpenChange}");
    expect(importDialog).toContain('onClick={() => handleOpenChange(false)}');
    expect(importDialog).toContain('onImport(parsed, vendor.trim() || "AutoZone"); handleOpenChange(false);');
  });

  it("resets the parts catalog search and selected supplier on open and close", () => {
    const catalogDialog = source("src/components/admin/store/autorepair/BuildROPartsCatalogDialog.tsx");

    expect(catalogDialog).toContain('import { useEffect, useState } from "react"');
    expect(catalogDialog).toContain("const resetCatalogState = () =>");
    expect(catalogDialog).toContain('setQuery("");');
    expect(catalogDialog).toContain("setSupplier(null);");
    expect(catalogDialog).toContain("if (open) resetCatalogState();");
    expect(catalogDialog).toContain("const handleOpenChange = (v: boolean) =>");
    expect(catalogDialog).toContain("onOpenChange={handleOpenChange}");
    expect(catalogDialog).toContain("open={!!supplier}");
  });

  it("resets the parts matrix scratch cost preview on open and close", () => {
    const matrixDialog = source("src/components/admin/store/autorepair/BuildROPartsMatrixDialog.tsx");

    expect(matrixDialog).toContain("const resetMatrixState = () =>");
    expect(matrixDialog).toContain("setRows(normalizeMatrix(initial));");
    expect(matrixDialog).toContain('setTestCost("");');
    expect(matrixDialog).toContain("if (open) resetMatrixState();");
    expect(matrixDialog).toContain("const handleOpenChange = (v: boolean) =>");
    expect(matrixDialog).toContain("onOpenChange={handleOpenChange}");
    expect(matrixDialog).toContain('onClick={() => handleOpenChange(false)}');
  });

  it("resets Build R.O. print and SMS modal scratch state on every close path", () => {
    const buildRO = source("src/components/admin/store/autorepair/AutoRepairBuildROSection.tsx");

    expect(buildRO).toContain("const handlePrintModalOpenChange = (open: boolean) =>");
    expect(buildRO).toContain("if (!open) setPrintCopies(1);");
    expect(buildRO).toContain("const handleSmsMenuOpenChange = (open: boolean) =>");
    expect(buildRO).toContain('if (!open) setSmsCustomMsg("");');
    expect(buildRO).toContain("handlePrintModalOpenChange(false);");
    expect(buildRO).toContain("handleSmsMenuOpenChange(false);");
    expect(buildRO).toContain("onOpenChange={handlePrintModalOpenChange}");
    expect(buildRO).toContain("onOpenChange={handleSmsMenuOpenChange}");
    expect(buildRO).toContain(
      "const copies = printCopies;\n                for (let i = 0; i < copies; i++) await printRO();\n                handlePrintModalOpenChange(false);",
    );
    expect(buildRO).toContain("const msg = smsCustomMsg;");
    expect(buildRO).toContain("handleSmsMenuOpenChange(false);");
  });

  it("resets the Price Book picker search and category across open and close paths", () => {
    const pickerDialog = source("src/components/admin/store/autorepair/ServiceCatalogPickerDialog.tsx");

    expect(pickerDialog).toContain('import { useEffect, useMemo, useState } from "react"');
    expect(pickerDialog).toContain("const resetPickerState = () =>");
    expect(pickerDialog).toContain('setSearch("");');
    expect(pickerDialog).toContain('setCat("All");');
    expect(pickerDialog).toContain("if (open) resetPickerState();");
    expect(pickerDialog).toContain("const handleOpenChange = (v: boolean) =>");
    expect(pickerDialog).toContain("onOpenChange={handleOpenChange}");
    expect(pickerDialog).toContain("handleOpenChange(false);");
  });

  it("resets the Labor Guide picker search and category across open and close paths", () => {
    const laborGuideDialog = source("src/components/admin/store/autorepair/LaborGuidePickerDialog.tsx");

    expect(laborGuideDialog).toContain('import { useEffect, useMemo, useState } from "react"');
    expect(laborGuideDialog).toContain("const resetGuideState = () =>");
    expect(laborGuideDialog).toContain('setSearch("");');
    expect(laborGuideDialog).toContain('setCat("All");');
    expect(laborGuideDialog).toContain("if (open) resetGuideState();");
    expect(laborGuideDialog).toContain("const handleOpenChange = (v: boolean) =>");
    expect(laborGuideDialog).toContain("onOpenChange={handleOpenChange}");
    expect(laborGuideDialog).toContain("handleOpenChange(false);");
  });

  it("resets the Save as Canned Job draft across open, cancel, and success close paths", () => {
    const cannedDialog = source("src/components/admin/store/autorepair/BuildROSaveCannedDialog.tsx");

    expect(cannedDialog).toContain("const resetCannedState = () =>");
    expect(cannedDialog).toContain('setName("");');
    expect(cannedDialog).toContain('setCategory("general");');
    expect(cannedDialog).toContain("if (open) resetCannedState();");
    expect(cannedDialog).toContain("const handleOpenChange = (v: boolean) =>");
    expect(cannedDialog).toContain("onOpenChange={handleOpenChange}");
    expect(cannedDialog).toContain("handleOpenChange(false);");
    expect(cannedDialog).toContain('<Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>');
  });
});
