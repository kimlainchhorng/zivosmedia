/**
 * Dealership customer book — list + full 360° profile sheet.
 * Clicking a customer opens a side sheet with their purchase history,
 * test drives, financing, and editable profile.
 */
import { memo, useMemo, useState } from "react";
import {
  Plus, Search, Pencil, Trash2, Users, Phone, Mail, Loader2,
  FileSignature, Car, Banknote, ChevronRight, Calendar,
  MessageCircle, PhoneCall, MailIcon, MessageSquare, DoorOpen,
  Handshake, FileText, CircleDot, ArrowDownLeft, ArrowUpRight, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDealershipCustomers,
  type DealershipCustomer,
  type DealershipCustomerDraft,
} from "@/hooks/car-dealership/useDealershipCustomers";
import { useCustomerProfile } from "@/hooks/car-dealership/useCustomerProfile";
import {
  useDealershipCustomerInteractions,
  type CustomerInteractionType,
  type InteractionDirection,
  type DealershipCustomerInteraction,
} from "@/hooks/car-dealership/useDealershipCustomerInteractions";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-fuchsia-500", "bg-orange-500",
];
const avatarColor = (id: string) =>
  AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

const emptyDraft = (): DealershipCustomerDraft => ({
  user_id: null,
  display_name: "",
  email: null,
  phone: null,
  date_of_birth: null,
  driver_license_number: null,
  driver_license_state: null,
  driver_license_country: null,
  driver_license_expiry: null,
  address: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
  employer: null,
  occupation: null,
  income_band: null,
  preferred_contact: null,
  notes: null,
  tags: [],
});

// ─── sale status colours ──────────────────────────────────────────────────────

const SALE_BADGE: Record<string, string> = {
  quote: "bg-zinc-500/15 text-zinc-700",
  pending: "bg-blue-500/15 text-blue-700",
  completed: "bg-emerald-500/15 text-emerald-700",
  delivered: "bg-emerald-600/15 text-emerald-800",
  cancelled: "bg-red-500/15 text-red-700",
};

const DRIVE_BADGE: Record<string, string> = {
  scheduled: "bg-blue-500/15 text-blue-700",
  confirmed: "bg-emerald-500/15 text-emerald-700",
  completed: "bg-zinc-500/15 text-zinc-700",
  cancelled: "bg-red-500/15 text-red-700",
  no_show: "bg-orange-500/15 text-orange-700",
};

// ─── Comms log timeline + form ───────────────────────────────────────────────

// Type → icon + colour mapping for the timeline bubble.
const INTERACTION_META: Record<
  CustomerInteractionType,
  { icon: typeof MessageCircle; label: string; classes: string }
> = {
  note:    { icon: FileText,      label: "Note",    classes: "bg-zinc-500/15 text-zinc-700" },
  call:    { icon: PhoneCall,     label: "Call",    classes: "bg-blue-500/15 text-blue-700" },
  email:   { icon: MailIcon,      label: "Email",   classes: "bg-violet-500/15 text-violet-700" },
  sms:     { icon: MessageSquare, label: "SMS",     classes: "bg-cyan-500/15 text-cyan-700" },
  visit:   { icon: DoorOpen,      label: "Visit",   classes: "bg-emerald-500/15 text-emerald-700" },
  meeting: { icon: Handshake,     label: "Meeting", classes: "bg-amber-500/15 text-amber-700" },
  letter:  { icon: Send,          label: "Letter",  classes: "bg-indigo-500/15 text-indigo-700" },
  other:   { icon: CircleDot,     label: "Other",   classes: "bg-slate-500/15 text-slate-700" },
};

// Types that support an inbound/outbound direction.
const DIRECTIONAL_TYPES: CustomerInteractionType[] = ["call", "email", "sms", "letter"];

// Relative-time formatter — small inline implementation to avoid adding a dep
// dependency on date-fns just for this component.
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = (now - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface CommsLogProps {
  storeId: string;
  customerId: string;
}

function CustomerCommsLog({ storeId, customerId }: CommsLogProps) {
  const { interactions, loading, saving, log, remove } =
    useDealershipCustomerInteractions(storeId, customerId);

  // Form state
  const [type, setType] = useState<CustomerInteractionType>("note");
  const [direction, setDirection] = useState<InteractionDirection>("outbound");
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [body, setBody] = useState("");
  const [showBody, setShowBody] = useState(false);

  const supportsDirection = DIRECTIONAL_TYPES.includes(type);

  const handleSubmit = async () => {
    if (!summary.trim()) return;
    const ok = await log({
      interaction_type: type,
      direction: supportsDirection ? direction : null,
      summary,
      outcome: outcome.trim() || null,
      body: body.trim() || null,
    });
    if (ok) {
      toast.success("Interaction logged.");
      setSummary("");
      setOutcome("");
      setBody("");
      setShowBody(false);
    } else {
      toast.error("Couldn't save. Try again.");
    }
  };

  const handleDelete = async (i: DealershipCustomerInteraction) => {
    if (!window.confirm(`Delete this ${INTERACTION_META[i.interaction_type].label.toLowerCase()}?`)) return;
    const ok = await remove(i.id);
    if (ok) toast.success("Removed.");
    else toast.error("Couldn't delete.");
  };

  return (
    <div className="space-y-4">
      {/* ── Log-it form ── */}
      <Card className="p-3 space-y-2.5">
        <div className="flex gap-2">
          <Select value={type} onValueChange={(v) => setType(v as CustomerInteractionType)}>
            <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(INTERACTION_META) as CustomerInteractionType[]).map((t) => {
                const meta = INTERACTION_META[t];
                const Icon = meta.icon;
                return (
                  <SelectItem key={t} value={t}>
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />{meta.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {supportsDirection && (
            <Select value={direction} onValueChange={(v) => setDirection(v as InteractionDirection)}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="outbound">
                  <span className="inline-flex items-center gap-2">
                    <ArrowUpRight className="h-3.5 w-3.5" />Outbound
                  </span>
                </SelectItem>
                <SelectItem value="inbound">
                  <span className="inline-flex items-center gap-2">
                    <ArrowDownLeft className="h-3.5 w-3.5" />Inbound
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <Input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={500}
          placeholder="What happened? (e.g. Discussed financing options)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && summary.trim() && !showBody) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
        />

        <Input
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          maxLength={200}
          placeholder="Outcome (optional) — e.g. Left voicemail, scheduled callback"
        />

        {showBody && (
          <Textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            placeholder="Additional details (optional)..."
          />
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowBody((s) => !s)}
          >
            {showBody ? "Hide details" : "+ Add details"}
          </button>
          <Button size="sm" onClick={handleSubmit} disabled={saving || !summary.trim()}>
            {saving ? "Logging..." : "Log it"}
          </Button>
        </div>
      </Card>

      {/* ── Timeline ── */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : interactions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium">No interactions logged yet</p>
          <p className="text-xs text-muted-foreground">
            Use the form above to capture the first call, email, or visit.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {interactions.map((i) => {
            const meta = INTERACTION_META[i.interaction_type];
            const Icon = meta.icon;
            return (
              <div key={i.id} className="group flex items-start gap-3 rounded-lg border p-3">
                <div className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                  meta.classes,
                )}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {meta.label}
                    </span>
                    {i.direction && (
                      <Badge variant="secondary" className="text-[9px] py-0 px-1.5 h-4">
                        {i.direction === "inbound"
                          ? <ArrowDownLeft className="h-2.5 w-2.5 mr-0.5" />
                          : <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />}
                        {i.direction}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">· {relativeTime(i.occurred_at)}</span>
                  </div>
                  <p className="text-sm font-medium">{i.summary}</p>
                  {i.body && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {i.body}
                    </p>
                  )}
                  {i.outcome && (
                    <span className="inline-block mt-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5">
                      → {i.outcome}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                  onClick={() => handleDelete(i)}
                  title="Delete entry"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Customer profile sheet ───────────────────────────────────────────────────

interface ProfileProps {
  storeId: string;
  customer: DealershipCustomer;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: (c: DealershipCustomer) => void;
}

function CustomerProfileSheet({ storeId, customer, open, onOpenChange, onEdit }: ProfileProps) {
  const { sales, testDrives, financing, loading } = useCustomerProfile(
    storeId,
    open ? customer.id : null,
  );

  const totalDeals = sales.length;
  const closedDeals = sales.filter((s) => ["completed", "delivered"].includes(s.status)).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
        {/* ── Profile header ── */}
        <div className="p-6 pb-4 border-b">
          <SheetHeader className="mb-0">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "grid h-14 w-14 shrink-0 place-items-center rounded-full text-white text-lg font-bold",
                  avatarColor(customer.id),
                )}
              >
                {initials(customer.display_name) || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-lg leading-tight">{customer.display_name}</SheetTitle>
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5 hover:text-foreground">
                    <Phone className="h-3 w-3" />{customer.phone}
                  </a>
                )}
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground truncate">
                    <Mail className="h-3 w-3" />{customer.email}
                  </a>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => onEdit(customer)}>
                <Pencil className="h-3.5 w-3.5 mr-1" />Edit
              </Button>
            </div>

            {/* Stats strip */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Purchases", value: customer.total_purchases },
                { label: "Lifetime value", value: fmtPrice(customer.lifetime_value_cents) },
                { label: "Last purchase", value: fmtDate(customer.last_purchase_at) ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-muted/50 p-2.5 text-center">
                  <p className="text-sm font-bold">{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </SheetHeader>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="comms" className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-4 self-start">
            <TabsTrigger value="comms">Comms</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Comms tab — touchpoint log */}
          <TabsContent value="comms" className="flex-1 px-6 pb-6 mt-4">
            <CustomerCommsLog storeId={storeId} customerId={customer.id} />
          </TabsContent>

          {/* Activity tab */}
          <TabsContent value="activity" className="flex-1 px-6 pb-6 mt-4 space-y-5">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Deals */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileSignature className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Deals ({totalDeals}) · {closedDeals} closed
                    </p>
                  </div>
                  {sales.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No deals yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {sales.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">#{s.deal_number}</span>
                              <Badge className={cn("border-0 text-[9px] py-0", SALE_BADGE[s.status] ?? "bg-zinc-500/15 text-zinc-700")}>
                                {s.status.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{s.vehicle_label}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-sm">{fmtPrice(s.total_cents)}</p>
                            {s.sold_at && <p className="text-[10px] text-muted-foreground">{fmtDate(s.sold_at)}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Test drives */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Test drives ({testDrives.length})
                    </p>
                  </div>
                  {testDrives.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No test drives on record.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {testDrives.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{d.vehicle_label}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <Calendar className="h-3 w-3" />
                              {new Date(d.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              <span>· {d.duration_minutes} min</span>
                            </div>
                          </div>
                          <Badge className={cn("border-0 text-[9px] shrink-0", DRIVE_BADGE[d.status] ?? "bg-zinc-500/15 text-zinc-700")}>
                            {d.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {financing.length > 0 && (
                  <>
                    <Separator />
                    {/* Financing */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Financing ({financing.length})
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {financing.map((f) => (
                          <div key={f.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{f.lender_name || "Unspecified lender"}</p>
                              <p className="text-xs text-muted-foreground">
                                {f.term_months} mo · {(f.apr_bps / 100).toFixed(2)}% APR
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-sm">{fmtPrice(f.amount_financed_cents)}</p>
                              <p className="text-[10px] text-muted-foreground">{fmtPrice(f.monthly_payment_cents)}/mo</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* Profile tab */}
          <TabsContent value="profile" className="px-6 pb-6 mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                { label: "Address", value: [customer.address, customer.city, customer.state, customer.postal_code].filter(Boolean).join(", ") },
                { label: "Date of birth", value: fmtDate(customer.date_of_birth) },
                { label: "Driver's license", value: customer.driver_license_number ? `${customer.driver_license_number}${customer.driver_license_state ? ` (${customer.driver_license_state})` : ""}` : null },
                { label: "License expiry", value: fmtDate(customer.driver_license_expiry) },
                { label: "Employer", value: customer.employer },
                { label: "Occupation", value: customer.occupation },
                { label: "Income band", value: customer.income_band },
                { label: "Preferred contact", value: customer.preferred_contact },
                { label: "Customer since", value: fmtDate(customer.created_at) },
              ].filter(({ value }) => !!value).map(({ label, value }) => (
                <div key={label} className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-sm">{value}</p>
                </div>
              ))}
            </div>
            {customer.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
                </div>
              </>
            )}
            {customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customer.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props { storeId: string; }

function CarDealershipCustomersSectionInner({ storeId }: Props) {
  const { customers, loading, saving, create, update, remove } = useDealershipCustomers(storeId);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selected, setSelected] = useState<DealershipCustomer | null>(null);
  const [editing, setEditing] = useState<DealershipCustomer | null>(null);
  const [draft, setDraft] = useState<DealershipCustomerDraft>(emptyDraft());

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter((c) =>
      `${c.display_name} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(term),
    );
  }, [customers, search]);

  const openProfile = (c: DealershipCustomer) => { setSelected(c); setProfileOpen(true); };
  const openAdd = () => { setEditing(null); setDraft(emptyDraft()); setDialogOpen(true); };
  const openEdit = (c: DealershipCustomer) => {
    setEditing(c);
    const {
      id, store_id, created_at, updated_at, total_purchases, lifetime_value_cents, last_purchase_at,
      ...rest
    } = c;
    setDraft(rest);
    setProfileOpen(false);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!draft.display_name.trim()) return;
    if (editing) {
      const ok = await update(editing.id, draft);
      if (ok) { toast.success("Customer updated."); setDialogOpen(false); }
      else toast.error("Couldn't save.");
    } else {
      const created = await create(draft);
      if (created) { toast.success("Customer added."); setDialogOpen(false); }
      else toast.error("Couldn't add customer.");
    }
  };

  const handleDelete = async (c: DealershipCustomer) => {
    if (!window.confirm(`Delete customer "${c.display_name}"?`)) return;
    const ok = await remove(c.id);
    if (ok) { toast.success("Customer removed."); setProfileOpen(false); }
    else toast.error("Couldn't delete.");
  };

  return (
    <div className="space-y-4">
      {/* ── header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Customers</h2>
          <p className="text-sm text-muted-foreground">{customers.length} customers in your book</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add customer</Button>
      </div>

      {/* ── search ── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">{customers.length === 0 ? "No customers yet" : "No matches"}</p>
          {customers.length === 0 && (
            <Button onClick={openAdd} className="mt-4"><Plus className="h-4 w-4 mr-1" />Add customer</Button>
          )}
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left group"
                onClick={() => openProfile(c)}
              >
                {/* Avatar */}
                <div className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full text-white text-sm font-bold",
                  avatarColor(c.id),
                )}>
                  {initials(c.display_name) || "?"}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{c.display_name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{c.email}</span>}
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right text-xs shrink-0">
                  <p className="font-bold">{c.total_purchases} {c.total_purchases === 1 ? "purchase" : "purchases"}</p>
                  <p className="text-muted-foreground">{fmtPrice(c.lifetime_value_cents)} LTV</p>
                </div>

                {/* Row actions — only shown on hover */}
                <div
                  className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(c)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground transition-colors" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ── customer profile sheet ── */}
      {selected && (
        <CustomerProfileSheet
          storeId={storeId}
          customer={selected}
          open={profileOpen}
          onOpenChange={setProfileOpen}
          onEdit={openEdit}
        />
      )}

      {/* ── add / edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={draft.display_name}
                onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={draft.phone ?? ""}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value || null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={draft.email ?? ""}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value || null })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Driver's license #</Label>
                <Input
                  value={draft.driver_license_number ?? ""}
                  onChange={(e) => setDraft({ ...draft, driver_license_number: e.target.value || null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>License state</Label>
                <Input
                  value={draft.driver_license_state ?? ""}
                  onChange={(e) => setDraft({ ...draft, driver_license_state: e.target.value || null })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                value={draft.address ?? ""}
                onChange={(e) => setDraft({ ...draft, address: e.target.value || null })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input
                  value={draft.city ?? ""}
                  onChange={(e) => setDraft({ ...draft, city: e.target.value || null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input
                  value={draft.state ?? ""}
                  onChange={(e) => setDraft({ ...draft, state: e.target.value || null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Zip</Label>
                <Input
                  value={draft.postal_code ?? ""}
                  onChange={(e) => setDraft({ ...draft, postal_code: e.target.value || null })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employer</Label>
                <Input
                  value={draft.employer ?? ""}
                  onChange={(e) => setDraft({ ...draft, employer: e.target.value || null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Occupation</Label>
                <Input
                  value={draft.occupation ?? ""}
                  onChange={(e) => setDraft({ ...draft, occupation: e.target.value || null })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !draft.display_name.trim()}>
              {saving ? "Saving..." : editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CarDealershipCustomersSection = memo(CarDealershipCustomersSectionInner);
export default CarDealershipCustomersSection;
