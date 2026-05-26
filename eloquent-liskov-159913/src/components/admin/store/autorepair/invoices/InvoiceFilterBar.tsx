/**
 * Search + status pills + sort menu for the doc list.
 */
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type StatusFilter = "all" | "draft" | "sent" | "paid" | "partially_paid" | "overdue";
export type SortKey = "newest" | "oldest" | "amount_desc" | "customer_asc";

interface Props {
  query: string;
  onQuery: (s: string) => void;
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
  sort: SortKey;
  onSort: (k: SortKey) => void;
  showOverdue?: boolean;
}

const STATUSES: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "partially_paid", label: "Partial" },
  { key: "paid", label: "Paid" },
  { key: "overdue", label: "Overdue" },
];

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  oldest: "Oldest",
  amount_desc: "Amount: high → low",
  customer_asc: "Customer A → Z",
};

export default function InvoiceFilterBar({
  query, onQuery, status, onStatus, sort, onSort, showOverdue = true,
}: Props) {
  return (
    <div className="space-y-2 mb-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search number, customer, phone, VIN…"
            className="pl-8 h-9 text-sm"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">{SORT_LABELS[sort]}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <DropdownMenuItem key={k} onClick={() => onSort(k)}>
                {SORT_LABELS[k]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUSES.filter((s) => showOverdue || s.key !== "overdue").map((s) => (
          <button type="button"
            key={s.key}
            onClick={() => onStatus(s.key)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition border ${
              status === s.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
