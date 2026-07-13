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
  Wrench, ArrowRight,
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
  const handleSmsOpenChange = (open: boolean) => {
    setSmsOpen(open);
    if (!open) setSmsPhone("");
  };
  const sendInfoSms = () => {
    const phone = smsPhone.trim();
    if (!phone) return;
    onRequestInfoSms(phone);
    handleSmsOpenChange(false);
  };
  const handleSearchModeChange = (mode: "estimate" | "invoice") => {
    setSearchMode(mode);
    setSearchQ("");
  };

  return (
    <div className="mx-auto max-w-xl space-y-3 py-2">
      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-0.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e90ff] to-[#1577e0] text-white shadow-lg shadow-[#1e90ff]/25">
          <Wrench className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold leading-tight tracking-tight">Build a Repair Order</h2>
          <p className="text-[11px] text-muted-foreground">Start a fresh estimate or jump back into an open ticket.</p>
        </div>
        {openTickets.length > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-[#16596b]/10 px-3 py-1 text-xs font-semibold text-[#16596b] dark:bg-[#16596b]/20 dark:text-cyan-300">
            {openTickets.length} open
          </span>
        )}
      </div>

      {/* ── Hero: Create New Estimate ── */}
      <button
        type="button"
        onClick={onCreateNew}
        className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#1e90ff] to-[#0f6fd4] p-3.5 text-left text-white shadow-md shadow-[#1e90ff]/25 transition hover:shadow-lg hover:shadow-[#1e90ff]/35"
      >
        {/* decorative glow */}
        <span className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-12 right-12 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <Plus className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold tracking-tight">Create New Estimate</p>
            <p className="text-xs text-white/80">Blank repair order — add customer, vehicle &amp; line items</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-white/80 transition-transform group-hover:translate-x-1" />
        </div>
      </button>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Or identify the customer first</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* ── Customer cards ── */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onExistingCustomer}
          className="group rounded-xl border bg-card p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#3aa76d]/50 hover:shadow-md"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3aa76d]/12 text-[#3aa76d] transition group-hover:bg-[#3aa76d] group-hover:text-white">
            <User className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1.5 text-[13px] font-semibold">Existing Customer</p>
          <p className="text-[10px] leading-tight text-muted-foreground">Search your garage by name, phone or plate</p>
        </button>
        <button
          type="button"
          onClick={onNewCustomer}
          className="group rounded-xl border bg-card p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#f0871e]/50 hover:shadow-md"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0871e]/12 text-[#f0871e] transition group-hover:bg-[#f0871e] group-hover:text-white">
            <UserPlus className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1.5 text-[13px] font-semibold">New Customer</p>
          <p className="text-[10px] leading-tight text-muted-foreground">Capture contact details &amp; vehicle</p>
        </button>
      </div>

      {/* ── Open Tickets ── */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setShowTickets((v) => !v)}
          aria-expanded={showTickets}
          aria-controls="build-ro-open-tickets"
          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-muted/40"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16596b]/10 text-[#16596b] dark:bg-[#16596b]/20 dark:text-cyan-300">
            <RotateCcw className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Open Tickets</p>
            <p className="text-xs text-muted-foreground">Resume an estimate in progress</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold tabular-nums">{openTickets.length}</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${showTickets ? "rotate-180" : ""}`} />
        </button>
        {showTickets && (
          <div id="build-ro-open-tickets" className="max-h-60 space-y-1 overflow-y-auto border-t p-1.5">
            {openTickets.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">No open tickets right now.</p>
            ) : (
              openTickets.map((e: any) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onOpenTicket(e)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-muted"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{e.number}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize ${
                        e.status === "approved" ? "bg-emerald-500/15 text-emerald-600"
                        : e.status === "sent" ? "bg-amber-500/15 text-amber-600"
                        : "bg-muted text-muted-foreground"
                      }`}>{e.status}</span>
                    </span>
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
      </div>

      {/* ── Request customer info via SMS ── */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <button
          type="button"
          onClick={() => handleSmsOpenChange(!smsOpen)}
          aria-expanded={smsOpen}
          aria-controls="build-ro-request-info"
          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-muted/40"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16596b]/10 text-[#16596b] dark:bg-[#16596b]/20 dark:text-cyan-300">
            <Send className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Request Customer Info via Text</p>
            <p className="text-xs text-muted-foreground">Text a secure link to collect their details</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${smsOpen ? "rotate-180" : ""}`} />
        </button>
        {smsOpen && (
          <div id="build-ro-request-info" className="flex items-center gap-2 border-t p-2.5">
            <Input
              className="h-9 flex-1 text-sm"
              type="tel"
              placeholder="Customer mobile number"
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendInfoSms(); }}
            />
            <button
              type="button"
              disabled={!smsPhone.trim()}
              onClick={sendInfoSms}
              className="flex items-center gap-1.5 rounded-lg bg-[#16596b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#124a59] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </div>
        )}
      </div>

      {/* ── Resume last + inventory ── */}
      <div className="space-y-2.5 rounded-xl border bg-card p-3 shadow-sm">
        <button
          type="button"
          disabled={!lastOpened}
          onClick={() => lastOpened && onOpenTicket(lastOpened)}
          className="group flex w-full items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5 text-left transition hover:bg-muted disabled:opacity-60"
        >
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Last opened</span>
            <span className="block truncate text-sm font-medium">
              {lastOpened ? `${lastOpened.number} — ${lastOpened.customer_name || "No customer"}` : "Nothing opened yet"}
            </span>
          </span>
          {lastOpened && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onNavigate?.("ar-parts")}
            className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium text-muted-foreground transition hover:border-foreground/20 hover:bg-muted hover:text-foreground"
          >
            <Package className="h-4 w-4" /> General Inventory
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.("ar-tires")}
            className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium text-muted-foreground transition hover:border-foreground/20 hover:bg-muted hover:text-foreground"
          >
            <CircleDot className="h-4 w-4" /> Tire Inventory
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="flex items-center gap-2 rounded-xl border bg-card p-2 shadow-sm">
        <Select value={searchMode} onValueChange={(v: "estimate" | "invoice") => handleSearchModeChange(v)}>
          <SelectTrigger className="h-10 w-32 shrink-0 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="estimate">Estimate #</SelectItem>
            <SelectItem value="invoice">Invoice #</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-10 pl-9 text-sm"
            placeholder="Search by estimate # or invoice #"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSearch(searchMode, searchQ); }}
          />
        </div>
        <button
          type="button"
          onClick={() => onSearch(searchMode, searchQ)}
          className="rounded-lg bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
        >
          Search
        </button>
      </div>
    </div>
  );
}
