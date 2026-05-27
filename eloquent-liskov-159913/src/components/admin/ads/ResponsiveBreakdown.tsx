/**
 * ResponsiveBreakdown — table on `≥md`, stacked card list on `<md`.
 * Generic column config so it can render any per-creative or per-platform breakdown.
 */
import * as React from "react";
import { useIsMobilePreview } from "./useResponsiveWidth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { mkMeta, mkTableCell, mkTableHeader, mkTableNum } from "./marketing-tokens";

export interface BreakdownColumn<T> {
  key: string;
  label: string;
  /** value rendered into the table cell / card row */
  render: (row: T) => React.ReactNode;
  /** treat as a numeric KPI cell */
  isNumeric?: boolean;
  /** hide on mobile cards (only shown in desktop table) */
  desktopOnly?: boolean;
  /** custom className for the cell */
  className?: string;
}

interface Props<T> {
  rows: T[];
  columns: BreakdownColumn<T>[];
  /** Used as React key for each row */
  rowKey: (row: T) => string;
  /** Title shown at top of mobile cards (e.g. creative name + date) */
  mobileTitle?: (row: T) => React.ReactNode;
  /** Optional CSV export (rows → CSV string) */
  onExportCsv?: () => void;
  emptyState?: React.ReactNode;
  className?: string;
}

function ResponsiveBreakdownInner<T>({
  rows,
  columns,
  rowKey,
  mobileTitle,
  onExportCsv,
  emptyState,
  className,
}: Props<T>) {
  const isMobile = useIsMobilePreview();

  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className={cn("space-y-2", className)}>
      {onExportCsv && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="h-9 sm:h-8" onClick={onExportCsv} aria-label="Export breakdown as CSV">
            <Download className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      )}

      {isMobile ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <Card key={rowKey(row)}>
              <CardContent className="p-3 space-y-2">
                {mobileTitle && <div className="text-sm font-semibold">{mobileTitle(row)}</div>}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {columns
                    .filter((c) => !c.desktopOnly)
                    .map((col) => (
                      <div key={col.key} className="flex flex-col">
                        <span className={mkMeta}>{col.label}</span>
                        <span className={cn("text-[13px] font-medium", col.isNumeric && "tabular-nums")}>
                          {col.render(row)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/40 sticky top-0">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(mkTableCell, mkTableHeader, "text-left", col.isNumeric && "text-right")}
                    scope="col"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={rowKey(row)} className="border-t border-border/40 hover:bg-muted/20 transition">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(mkTableCell, col.isNumeric && mkTableNum, col.className)}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const ResponsiveBreakdown = React.memo(ResponsiveBreakdownInner) as typeof ResponsiveBreakdownInner;
export default ResponsiveBreakdown;
