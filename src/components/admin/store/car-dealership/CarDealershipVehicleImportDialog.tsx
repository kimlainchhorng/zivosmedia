/**
 * CarDealershipVehicleImportDialog — bulk-import vehicles from a CSV.
 *
 * Three-screen flow inside a single dialog:
 *   1. INPUT    — paste CSV or upload a file
 *   2. PREVIEW  — show parsed rows with row-level validation (auto-mapped
 *                  columns, missing-field errors, duplicate warnings)
 *   3. RESULT   — after batch insert, show how many succeeded vs failed
 *
 * Reuses parseVehicleCsv.ts for the CSV → draft transformation.
 */
import { useMemo, useRef, useState } from "react";
import {
  Upload, Download, FileText, AlertCircle, AlertTriangle, CheckCircle2,
  X, Loader2, Sparkles,
} from "lucide-react";
import { saveAs } from "file-saver";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  parseCsv, autoMapColumns, validateRow,
  KNOWN_COLUMNS, SAMPLE_CSV,
  type CanonicalColumn, type ValidatedRow,
} from "@/lib/car-dealership/parseVehicleCsv";
import type {
  DealershipVehicle, DealershipVehicleDraft,
} from "@/hooks/car-dealership/useDealershipInventory";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingVehicles: DealershipVehicle[];
  /** Returns the number of successfully inserted vehicles (or 0 on full failure). */
  onImport: (drafts: DealershipVehicleDraft[]) => Promise<number>;
}

type Screen = "input" | "preview" | "result";

const fmtPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format(cents / 100);

export default function CarDealershipVehicleImportDialog({
  open, onOpenChange, existingVehicles, onImport,
}: Props) {
  const [screen, setScreen] = useState<Screen>("input");
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  /** Rows the user has individually opted out of. */
  const [excludedRowNumbers, setExcludedRowNumbers] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── reset on (re-)open ────────────────────────────────────────────────────
  const reset = () => {
    setScreen("input");
    setCsvText("");
    setImporting(false);
    setImportedCount(0);
    setAttemptedCount(0);
    setExcludedRowNumbers(new Set());
  };
  const handleClose = (o: boolean) => {
    onOpenChange(o);
    if (!o) setTimeout(reset, 200); // wait for the close transition
  };

  // ── parsed + validated rows ───────────────────────────────────────────────
  const parsed = useMemo(() => {
    if (!csvText.trim()) return null;

    const records = parseCsv(csvText);
    if (records.length === 0) {
      return { records, mapping: {}, mappedCount: 0, rows: [] as ValidatedRow[], headers: [] };
    }

    const headers = Object.keys(records[0]);
    const mapping = autoMapColumns(headers);
    const mappedCount = Object.values(mapping).filter(Boolean).length;

    const existingVins = new Set(
      existingVehicles
        .map((v) => v.vin?.trim().toLowerCase())
        .filter((s): s is string => !!s),
    );
    const existingStocks = new Set(
      existingVehicles
        .map((v) => v.stock_number?.trim().toLowerCase())
        .filter((s): s is string => !!s),
    );

    const rows = records.map((rec, idx) =>
      validateRow(rec, mapping, idx + 1, { existingVins, existingStocks }),
    );

    return { records, mapping, mappedCount, rows, headers };
  }, [csvText, existingVehicles]);

  // ── summary ───────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (!parsed) return { ok: 0, warn: 0, error: 0, duplicates: 0, total: 0 };
    let ok = 0, warn = 0, error = 0, duplicates = 0;
    for (const r of parsed.rows) {
      if (r.severity === "error") error++;
      else if (r.severity === "warn") warn++;
      else ok++;
      if (r.duplicateOf) duplicates++;
    }
    return { ok, warn, error, duplicates, total: parsed.rows.length };
  }, [parsed]);

  // Rows that will actually be imported (no errors, not excluded).
  const importableRows = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.filter(
      (r) => r.severity !== "error" && !excludedRowNumbers.has(r.rowNumber),
    );
  }, [parsed, excludedRowNumbers]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please choose a .csv file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large — keep CSV imports under 5 MB.");
      return;
    }
    const text = await file.text();
    setCsvText(text);
  };

  const handleDownloadTemplate = () => {
    // BOM prefix so Excel opens UTF-8 correctly
    saveAs(
      new Blob(["﻿" + SAMPLE_CSV], { type: "text/csv;charset=utf-8" }),
      "vehicle-import-template.csv",
    );
  };

  const handleParse = () => {
    if (!csvText.trim()) {
      toast.error("Paste or upload a CSV first.");
      return;
    }
    if (!parsed || parsed.rows.length === 0) {
      toast.error("Couldn't find any rows in the CSV.");
      return;
    }
    setScreen("preview");
  };

  const handleImport = async () => {
    if (importableRows.length === 0) {
      toast.error("No importable rows.");
      return;
    }
    setImporting(true);
    setAttemptedCount(importableRows.length);
    try {
      const count = await onImport(importableRows.map((r) => r.draft));
      setImportedCount(count);
      setScreen("result");
    } catch (e: any) {
      console.error("[CSV import] failed", e);
      toast.error(e?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const toggleRowExcluded = (rowNumber: number) => {
    setExcludedRowNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90dvh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import vehicles from CSV
            {screen === "input" && (
              <Badge variant="secondary" className="ml-2 text-[10px]">Step 1 of 2</Badge>
            )}
            {screen === "preview" && (
              <Badge variant="secondary" className="ml-2 text-[10px]">Step 2 of 2</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ─── SCREEN 1: INPUT ──────────────────────────────────────────── */}
        {screen === "input" && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste a CSV below or upload a file. The first row must be the column headers —
                we'll auto-detect common formats. <strong>make</strong> and{" "}
                <strong>model</strong> are required. Money values are parsed as dollars (e.g.{" "}
                <code className="rounded bg-muted px-1 text-xs">26995</code> or{" "}
                <code className="rounded bg-muted px-1 text-xs">$26,995</code>).
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />Upload CSV file
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />Download template
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>

              <Textarea
                rows={12}
                className="font-mono text-xs"
                placeholder={"year,make,model,trim,vin,mileage,asking_price\n2023,Toyota,Camry,SE,4T1G..,12500,26995"}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />

              {csvText.trim() && parsed && (
                <Card className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    <span><strong>{parsed.records.length}</strong> row{parsed.records.length !== 1 ? "s" : ""} detected, <strong>{parsed.mappedCount}</strong> of {parsed.headers.length} columns mapped automatically.</span>
                  </div>
                  {parsed.headers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {parsed.headers.map((h) => {
                        const m = parsed.mapping[h];
                        return (
                          <span
                            key={h}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full text-[10px] px-2 py-0.5",
                              m
                                ? "bg-emerald-500/10 text-emerald-700"
                                : "bg-zinc-500/10 text-zinc-600",
                            )}
                            title={m ? `Mapped to ${m}` : "Will be ignored"}
                          >
                            {h}{m ? ` → ${m}` : ""}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Supported columns: {KNOWN_COLUMNS.join(", ")}
                  </p>
                </Card>
              )}
            </div>

            <DialogFooter className="px-6 py-3 border-t shrink-0">
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={handleParse} disabled={!csvText.trim()}>
                Preview →
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ─── SCREEN 2: PREVIEW ────────────────────────────────────────── */}
        {screen === "preview" && parsed && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
              {/* Summary strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Card className="p-2.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Ready</span>
                  </div>
                  <p className="mt-1 text-xl font-bold text-emerald-700">{summary.ok}</p>
                </Card>
                <Card className="p-2.5">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Warnings</span>
                  </div>
                  <p className="mt-1 text-xl font-bold text-amber-700">{summary.warn}</p>
                </Card>
                <Card className="p-2.5">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Errors</span>
                  </div>
                  <p className="mt-1 text-xl font-bold text-red-700">{summary.error}</p>
                </Card>
                <Card className="p-2.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Will import</span>
                  </div>
                  <p className="mt-1 text-xl font-bold">{importableRows.length}</p>
                </Card>
              </div>

              {summary.duplicates > 0 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-800">
                  <strong>{summary.duplicates} row{summary.duplicates !== 1 ? "s" : ""}</strong> match an existing vehicle's VIN or stock number — they're still importable (uncheck the row to skip).
                </div>
              )}

              <Separator />

              {/* Row list */}
              <div className="space-y-1.5">
                {parsed.rows.map((r) => {
                  const excluded = excludedRowNumbers.has(r.rowNumber);
                  const isError = r.severity === "error";
                  return (
                    <div
                      key={r.rowNumber}
                      className={cn(
                        "rounded-lg border p-3 transition-opacity",
                        isError && "border-red-300 bg-red-500/5",
                        r.severity === "warn" && !isError && "border-amber-300 bg-amber-500/5",
                        excluded && "opacity-50",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!isError && (
                          <input
                            type="checkbox"
                            checked={!excluded}
                            onChange={() => toggleRowExcluded(r.rowNumber)}
                            className="mt-1 h-3.5 w-3.5 shrink-0"
                            title="Include this row in the import"
                          />
                        )}
                        {isError && (
                          <AlertCircle className="h-3.5 w-3.5 mt-1 shrink-0 text-red-600" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground font-mono">Row {r.rowNumber}</span>
                            <p className="text-sm font-semibold truncate">
                              {[r.draft.year, r.draft.make, r.draft.model, r.draft.trim].filter(Boolean).join(" ") || "(no vehicle name)"}
                            </p>
                            {r.draft.asking_price_cents > 0 && (
                              <span className="text-xs font-medium text-primary">
                                {fmtPrice(r.draft.asking_price_cents)}
                              </span>
                            )}
                            {r.duplicateOf && (
                              <Badge variant="secondary" className="text-[9px]">
                                Duplicate {r.duplicateOf.replace("_", " ")}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            {r.draft.vin && <span className="font-mono">VIN {r.draft.vin}</span>}
                            {r.draft.stock_number && <span>#{r.draft.stock_number}</span>}
                            {r.draft.mileage != null && <span>{r.draft.mileage.toLocaleString()} {r.draft.mileage_unit}</span>}
                          </div>
                          {r.messages.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {r.messages.map((m, i) => (
                                <li
                                  key={i}
                                  className={cn(
                                    "text-[11px]",
                                    isError ? "text-red-700" : "text-amber-700",
                                  )}
                                >
                                  • {m}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="px-6 py-3 border-t shrink-0 flex-row sm:justify-between gap-2">
              <Button variant="ghost" onClick={() => setScreen("input")} disabled={importing}>
                ← Back
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handleClose(false)} disabled={importing}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={importing || importableRows.length === 0}>
                  {importing ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1" />Importing...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-1" />Import {importableRows.length} vehicle{importableRows.length !== 1 ? "s" : ""}</>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}

        {/* ─── SCREEN 3: RESULT ────────────────────────────────────────── */}
        {screen === "result" && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6 text-center space-y-3">
              {importedCount === attemptedCount ? (
                <>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  <p className="text-2xl font-bold">Imported {importedCount} vehicle{importedCount !== 1 ? "s" : ""}</p>
                  <p className="text-sm text-muted-foreground">
                    All rows landed in your inventory. You can review and edit them now.
                  </p>
                </>
              ) : importedCount > 0 ? (
                <>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-500/15 text-amber-600">
                    <AlertTriangle className="h-9 w-9" />
                  </div>
                  <p className="text-2xl font-bold">Partially imported</p>
                  <p className="text-sm text-muted-foreground">
                    {importedCount} of {attemptedCount} succeeded.
                    {attemptedCount - importedCount} failed — check the inventory for what's missing
                    and try again with a smaller batch.
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-500/15 text-red-600">
                    <X className="h-9 w-9" />
                  </div>
                  <p className="text-2xl font-bold">Nothing imported</p>
                  <p className="text-sm text-muted-foreground">
                    The batch insert failed. Check the browser console for the underlying error.
                  </p>
                </>
              )}
            </div>

            <DialogFooter className="px-6 py-3 border-t shrink-0">
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
