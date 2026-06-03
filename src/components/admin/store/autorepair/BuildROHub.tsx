/**
 * Build R.O. — "Create New Estimate" hub (VSM start screen).
 * The entry point for the Build R.O. tab: create a fresh estimate, identify the
 * customer (existing / new), resume an open ticket, request customer info by SMS,
 * jump to inventory, or search by estimate / invoice number. Each action connects
 * into the builder workflow via the callbacks supplied by AutoRepairBuildROSection.
 */
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, User, UserPlus, RotateCcw, Send, Clock, Package, CircleDot, Search, ChevronDown,
} from "lucide-react";

interface Props {
  storeId: string;
  recent: any[];
  onCreateNew: () => void;
  onExistingCustomer: () => void;
  onNewCustomer: () => void;
  onOpenTicket: (e: any) => void;
  onRequestInfoSms: (phone: string) => void;
  onSearch: (mode: "estimate" | "invoice", q: string) => void;
  onNavigate?: (tab: string) => void;
}

const money = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BuildROHub({
  storeId: _storeId, recent, onCreateNew, onExistingCustomer, onNewCustomer,
  onOpenTicket, onRequestInfoSms, onSearch, onNavigate,
}: Props) {
  const [showTickets, setShowTickets] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [searchMode, setSearchMode] = useState<"estimate" | "invoice">("estimate");
  const [searchQ, setSearchQ] = useState("");

  // "Open tickets" = estimates still in flight (not declined / expired).
  const openTickets = useMemo(
    () => recent.filter((e: any) => ["draft", "sent", "approved"].includes(e.status)),
    [recent],
  );
  const lastOpened = recent[0];

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-2">
      {/* Primary actions card */}
      <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
        <button
          type="button"
          onClick={onCreateNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e90ff] py-5 text-xl font-bold text-white transition hover:bg-[#1577e0]"
        >
          <Plus className="h-6 w-6" /> Create New Estimate
        </button>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">Or start by identifying the customer to create New Estimate</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" onClick={onExistingCustomer}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#3aa76d] py-4 font-semibold text-white transition hover:bg-[#329662]">
            <User className="h-5 w-5" /> Existing Customer
          </button>
          <button type="button" onClick={onNewCustomer}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#f0871e] py-4 font-semibold text-white transition hover:bg-[#dd7a16]">
            <UserPlus className="h-5 w-5" /> New Customer
          </button>
        </div>

        <span className="block h-px bg-border" />

        <div className="space-y-2.5">
          <button type="button" onClick={() => setShowTickets((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16596b] py-3.5 font-semibold text-white transition hover:bg-[#124a59]">
            <RotateCcw className="h-4 w-4" /> Open Tickets ({openTickets.length})
            <ChevronDown className={`h-4 w-4 transition ${showTickets ? "rotate-180" : ""}`} />
          </button>
          {showTickets && (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-1">
              {openTickets.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">No open tickets.</p>
              ) : (
                openTickets.map((e: any) => (
                  <button key={e.id} type="button" onClick={() => onOpenTicket(e)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted">
                    <span className="min-w-0">
                      <span className="font-medium">{e.number}</span>
                      <span className="ml-2 text-xs capitalize text-muted-foreground">{e.status}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {e.customer_name || "No customer"}{e.vehicle_label ? ` · ${e.vehicle_label}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{money(e.total_cents)}</span>
                  </button>
                ))
              )}
            </div>
          )}

          <button type="button" onClick={() => setSmsOpen((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16596b] py-3.5 font-semibold text-white transition hover:bg-[#124a59]">
            <Send className="h-4 w-4" /> Request Customer Information via Text Message
          </button>
          {smsOpen && (
            <div className="flex items-center gap-2 rounded-lg border p-2">
              <Input className="h-9 flex-1 text-sm" type="tel" placeholder="Customer mobile number"
                value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} />
              <button type="button" disabled={!smsPhone.trim()}
                onClick={() => { onRequestInfoSms(smsPhone.trim()); setSmsPhone(""); setSmsOpen(false); }}
                className="rounded-md bg-[#16596b] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                Send
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent + inventory card */}
      <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
        <button type="button" disabled={!lastOpened} onClick={() => lastOpened && onOpenTicket(lastOpened)}
          className="flex w-full items-center gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-left text-sm transition hover:bg-muted disabled:opacity-60">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Last Opened:</span>
          <span className="truncate text-muted-foreground">
            {lastOpened ? `${lastOpened.number} — ${lastOpened.customer_name || "No customer"}` : "— - —"}
          </span>
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onNavigate?.("ar-parts")}
            className="flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted">
            <Package className="h-4 w-4" /> Check General Inventory
          </button>
          <button type="button" onClick={() => onNavigate?.("ar-tires")}
            className="flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted">
            <CircleDot className="h-4 w-4" /> Check Tires Inventory
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 rounded-2xl border bg-card p-2 shadow-sm">
        <Select value={searchMode} onValueChange={(v: "estimate" | "invoice") => setSearchMode(v)}>
          <SelectTrigger className="h-10 w-32 shrink-0 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="estimate">Estimate #</SelectItem>
            <SelectItem value="invoice">Invoice #</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="h-10 pl-9 text-sm" placeholder="Search By Estimate # Or Invoice #"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSearch(searchMode, searchQ); }} />
        </div>
        <button type="button" onClick={() => onSearch(searchMode, searchQ)}
          className="rounded-md bg-foreground px-6 py-2.5 text-sm font-semibold text-background">
          Search
        </button>
      </div>
    </div>
  );
}
