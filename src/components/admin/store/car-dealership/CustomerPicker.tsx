/**
 * CustomerPicker — searchable dropdown backed by the customer book.
 * Selecting a customer auto-fills name/phone/email in parent dialogs.
 */
import { useState, useMemo } from "react";
import { Search, User } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCustomerOptions, type CustomerOption } from "@/hooks/car-dealership/useCustomerOptions";

interface Props {
  storeId: string;
  customerId: string | null;
  customerName: string;
  onSelect: (customer: CustomerOption | null) => void;
  onNameChange: (name: string) => void;
  required?: boolean;
  className?: string;
}

export default function CustomerPicker({
  storeId, customerId, customerName, onSelect, onNameChange, required, className,
}: Props) {
  const { options, loading } = useCustomerOptions(storeId);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"picker" | "manual">("picker");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      o.display_name.toLowerCase().includes(q) ||
      (o.phone?.includes(q)) ||
      (o.email?.toLowerCase().includes(q))
    );
  }, [options, search]);

  const selected = options.find((o) => o.id === customerId) ?? null;

  const handleChange = (value: string) => {
    if (value === "_manual") { setMode("manual"); onSelect(null); return; }
    if (value === "_none") { onSelect(null); return; }
    const customer = options.find((o) => o.id === value);
    if (customer) { setMode("picker"); onSelect(customer); }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>Customer {required && <span className="text-destructive">*</span>}</Label>

      {options.length > 0 && mode === "picker" ? (
        <div className="space-y-1.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search customers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={customerId ?? "_none"} onValueChange={handleChange} disabled={loading}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={loading ? "Loading…" : "— Select customer —"} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="_none">— Select customer —</SelectItem>
              {filtered.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {c.display_name}
                      {c.phone && <span className="ml-1 text-[10px] text-muted-foreground">{c.phone}</span>}
                      {c.total_purchases > 0 && (
                        <span className="ml-1 text-[10px] text-emerald-600">({c.total_purchases}✓)</span>
                      )}
                    </span>
                  </span>
                </SelectItem>
              ))}
              <SelectItem value="_manual">
                <span className="text-muted-foreground italic">✎ New / type manually…</span>
              </SelectItem>
            </SelectContent>
          </Select>
          {selected?.email && (
            <p className="text-[10px] text-muted-foreground pl-1">{selected.email}</p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <Input
            value={customerName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Customer name"
          />
          {options.length > 0 && (
            <button
              type="button"
              className="text-[11px] text-primary hover:underline"
              onClick={() => { setMode("picker"); setSearch(""); }}
            >
              ← Pick from customer book
            </button>
          )}
        </div>
      )}
    </div>
  );
}
