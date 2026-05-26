/**
 * P&L date range bar — presets + custom range + group-by + compare + export menu.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileDown, FileText, Mail, Printer } from "lucide-react";
import { presetRange, type Preset, type GroupBy, type CompareMode } from "@/lib/admin/pnlCalculations";

interface Props {
  from: string;
  to: string;
  preset: Preset;
  groupBy: GroupBy;
  compareMode: CompareMode;
  onPreset: (p: Preset) => void;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onGroupBy: (g: GroupBy) => void;
  onCompare: (c: CompareMode) => void;
  onExportCsv: () => void;
  onPrint: () => void;
  onEmail: () => void;
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "7 days" },
  { value: "mtd", label: "MTD" },
  { value: "last_month", label: "Last month" },
  { value: "qtd", label: "QTD" },
  { value: "ytd", label: "YTD" },
  { value: "last_12m", label: "12 months" },
];

export default function PnLDateRangeBar(props: Props) {
  return (
    <div className="flex flex-col gap-2 print:hidden">
      <div className="flex items-center gap-1 flex-wrap">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={props.preset === p.value ? "default" : "outline"}
            className="h-7 px-2 text-[11px]"
            onClick={() => { props.onPreset(p.value); const r = presetRange(p.value); props.onFrom(r.from); props.onTo(r.to); }}
          >
            {p.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant={props.preset === "custom" ? "default" : "outline"}
          className="h-7 px-2 text-[11px]"
          onClick={() => props.onPreset("custom")}
        >
          Custom
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Input type="date" value={props.from} onChange={(e) => { props.onPreset("custom"); props.onFrom(e.target.value); }} className="h-8 w-36 text-xs" />
        <span className="text-xs text-muted-foreground">→</span>
        <Input type="date" value={props.to} onChange={(e) => { props.onPreset("custom"); props.onTo(e.target.value); }} className="h-8 w-36 text-xs" />

        <Select value={props.groupBy} onValueChange={(v) => props.onGroupBy(v as GroupBy)}>
          <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">By day</SelectItem>
            <SelectItem value="week">By week</SelectItem>
            <SelectItem value="month">By month</SelectItem>
          </SelectContent>
        </Select>

        <Select value={props.compareMode} onValueChange={(v) => props.onCompare(v as CompareMode)}>
          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No comparison</SelectItem>
            <SelectItem value="previous_period">vs previous period</SelectItem>
            <SelectItem value="previous_year">vs previous year</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 px-2 text-xs">
              <FileDown className="w-3.5 h-3.5 mr-1" /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={props.onExportCsv}><FileText className="w-4 h-4 mr-2" /> CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={props.onPrint}><Printer className="w-4 h-4 mr-2" /> Print / PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={props.onEmail}><Mail className="w-4 h-4 mr-2" /> Email to accountant</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
