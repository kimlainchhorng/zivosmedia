/**
 * Period bar for Payments Received.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Download, FileText, Printer } from "lucide-react";
import {
  paymentsPresetRange,
  type GroupBy,
  type PaymentsPreset,
} from "@/lib/admin/paymentsCalculations";

interface Props {
  from: string;
  to: string;
  groupBy: GroupBy;
  compare: boolean;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onPreset: (preset: PaymentsPreset) => void;
  onGroupBy: (g: GroupBy) => void;
  onCompare: (v: boolean) => void;
  onExportCsv: () => void;
  onPrint: () => void;
}

const PRESETS: { key: PaymentsPreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "7d" },
  { key: "month", label: "30d" },
  { key: "quarter", label: "90d" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "ytd", label: "YTD" },
];

export default function PaymentsPeriodBar(p: Props) {
  const handlePreset = (preset: PaymentsPreset) => {
    const r = paymentsPresetRange(preset);
    p.onFrom(r.from); p.onTo(r.to);
    p.onPreset(preset);
  };
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((opt) => (
          <Button key={opt.key} size="sm" variant="outline" className="h-8 text-xs" onClick={() => handlePreset(opt.key)}>
            {opt.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Label className="text-[11px]">Group</Label>
        {(["day", "week", "month"] as GroupBy[]).map((g) => (
          <Button key={g} size="sm" variant={p.groupBy === g ? "default" : "outline"} className="h-8 px-2 text-xs"
            onClick={() => p.onGroupBy(g)}>{g}</Button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Switch id="pay-compare" checked={p.compare} onCheckedChange={p.onCompare} />
        <Label htmlFor="pay-compare" className="text-[11px]">Compare prev.</Label>
      </div>
      <div className="flex items-center gap-1.5 ml-auto">
        <Label className="text-[11px]">From</Label>
        <Input type="date" value={p.from} onChange={(e) => p.onFrom(e.target.value)} className="h-8 w-36 text-xs" />
        <Label className="text-[11px]">To</Label>
        <Input type="date" value={p.to} onChange={(e) => p.onTo(e.target.value)} className="h-8 w-36 text-xs" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="default" className="h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" />Export</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={p.onExportCsv}><FileText className="w-3.5 h-3.5 mr-2" />CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={p.onPrint}><Printer className="w-3.5 h-3.5 mr-2" />Print</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
