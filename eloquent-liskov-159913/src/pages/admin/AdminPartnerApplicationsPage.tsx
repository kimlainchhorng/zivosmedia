import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Building2,
  MapPin,
  Mail,
  Phone,
  CalendarDays,
  FileText,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PartnerProfile {
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface PartnerApplication {
  id: string;
  user_id: string;
  business_name: string;
  partner_kind: string;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  documents: Record<string, unknown> | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  status: string;
  submitted_at: string;
  profiles: PartnerProfile | null;
}

type TabFilter = "all" | "pending" | "submitted" | "approved" | "rejected";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const KIND_COLORS: Record<string, string> = {
  driver: "bg-sky-500/15 text-sky-700 border-sky-200",
  restaurant: "bg-orange-500/15 text-orange-700 border-orange-200",
  hotel: "bg-purple-500/15 text-purple-700 border-purple-200",
  store: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  employer: "bg-amber-500/15 text-amber-700 border-amber-200",
  agency: "bg-indigo-500/15 text-indigo-700 border-indigo-200",
};

function kindColor(kind: string) {
  return KIND_COLORS[kind.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 border-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="gap-1 bg-red-500/15 text-red-700 border-red-200">
          <XCircle className="h-3 w-3" /> Rejected
        </Badge>
      );
    case "submitted":
      return (
        <Badge className="gap-1 bg-blue-500/15 text-blue-700 border-blue-200">
          <FileText className="h-3 w-3" /> Submitted
        </Badge>
      );
    default:
      return (
        <Badge className="gap-1 bg-amber-500/15 text-amber-700 border-amber-200">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      );
  }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name }: { src: string | null | undefined; name: string | null | undefined }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        className="w-10 h-10 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
      {initials}
    </div>
  );
}

// ─── Application Card ─────────────────────────────────────────────────────────

interface CardProps {
  app: PartnerApplication;
  onAction: () => void;
}

function ApplicationCard({ app, onAction }: CardProps) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [expanded, setExpanded] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState(app.reviewer_notes ?? "");
  const [localNotes, setLocalNotes] = useState(app.reviewer_notes ?? "");
  const [acting, setActing] = useState(false);

  const profile = app.profiles;
  const docs = app.documents as Record<string, unknown> | null;
  const city = (docs?.city ?? docs?.address) as string | undefined;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-partner-applications"] });
    onAction();
  };

  const saveNotes = async (notes: string) => {
    const { error } = await (supabase as any)
      .from("partner_applications")
      .update({ reviewer_notes: notes || null })
      .eq("id", app.id);
    if (error) toast.error(error.message);
  };

  const approve = async () => {
    setActing(true);
    try {
      const now = new Date().toISOString();
      const { error: appErr } = await (supabase as any)
        .from("partner_applications")
        .update({
          status: "approved",
          reviewed_at: now,
          reviewer_notes: localNotes || null,
        })
        .eq("id", app.id);
      if (appErr) throw appErr;

      const { error: profileErr } = await (supabase as any)
        .from("profiles")
        .update({ role: app.partner_kind })
        .eq("id", app.user_id);
      if (profileErr) throw profileErr;

      toast.success(`${app.business_name} approved`);
      invalidate();
    } catch (e: any) {
      toast.error(e.message ?? "Approval failed");
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    if (!rejectReason.trim()) {
      toast.error("A rejection reason is required");
      return;
    }
    setActing(true);
    try {
      const now = new Date().toISOString();
      const { error } = await (supabase as any)
        .from("partner_applications")
        .update({
          status: "rejected",
          reviewed_at: now,
          reviewer_notes: rejectReason.trim(),
        })
        .eq("id", app.id);
      if (error) throw error;

      toast.success(`${app.business_name} rejected`);
      setShowRejectInput(false);
      invalidate();
    } catch (e: any) {
      toast.error(e.message ?? "Rejection failed");
    } finally {
      setActing(false);
    }
  };

  const markPending = async () => {
    setActing(true);
    try {
      const { error } = await (supabase as any)
        .from("partner_applications")
        .update({
          status: "pending",
          reviewed_at: null,
          reviewer_notes: null,
        })
        .eq("id", app.id);
      if (error) throw error;

      toast.success("Reset to pending");
      invalidate();
    } catch (e: any) {
      toast.error(e.message ?? "Reset failed");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="border-b border-border last:border-0">
      {/* Main row */}
      <div className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors">
        <Avatar src={profile?.avatar_url} name={profile?.full_name ?? app.business_name} />

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-semibold text-sm">{app.business_name}</span>
            <Badge
              className={cn(
                "text-[10px] capitalize border",
                kindColor(app.partner_kind)
              )}
            >
              {app.partner_kind}
            </Badge>
            <StatusBadge status={app.status} />
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {(profile?.full_name || profile?.email) && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {profile.full_name ?? ""}{profile.full_name && profile.email ? " · " : ""}{profile.email ?? ""}
              </span>
            )}
            {city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {new Date(app.submitted_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {app.status !== "approved" && (
            <Button
              size="sm"
              disabled={acting}
              onClick={approve}
              className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs"
            >
              {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve
            </Button>
          )}
          {app.status !== "rejected" && (
            <Button
              size="sm"
              variant="outline"
              disabled={acting}
              onClick={() => setShowRejectInput((v) => !v)}
              className="gap-1 text-red-600 border-red-200 hover:bg-red-50 h-8 px-3 text-xs"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>
          )}
          {(app.status === "approved" || app.status === "rejected") && (
            <Button
              size="sm"
              variant="ghost"
              disabled={acting}
              onClick={markPending}
              className="gap-1 text-muted-foreground h-8 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded((v) => !v)}
            className="h-8 w-8 p-0 text-muted-foreground"
            aria-label="Toggle details"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Inline reject input */}
      {showRejectInput && (
        <div className="px-4 pb-3 flex gap-2 items-start">
          <textarea
            className="flex-1 min-h-[72px] rounded-md border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Rejection reason (required)…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button
              size="sm"
              disabled={acting || !rejectReason.trim()}
              onClick={reject}
              className="gap-1 bg-red-600 hover:bg-red-700 text-white h-8 px-3 text-xs"
            >
              {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Confirm Reject
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowRejectInput(false)}
              className="h-8 px-3 text-xs text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs pt-3">
            {app.contact_email && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{app.contact_email}</span>
              </div>
            )}
            {app.contact_phone && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{app.contact_phone}</span>
              </div>
            )}
            {docs?.address && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{String(docs.address)}</span>
              </div>
            )}
            {docs?.city && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-3 w-3 shrink-0" />
                <span>{String(docs.city)}</span>
              </div>
            )}
            {docs?.hours && (
              <div className="flex items-start gap-1.5 text-muted-foreground col-span-full">
                <Clock className="h-3 w-3 shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap">{typeof docs.hours === "string" ? docs.hours : JSON.stringify(docs.hours, null, 2)}</span>
              </div>
            )}
            {(docs?.profileUrl || docs?.coverUrl) && (
              <div className="flex items-center gap-3 col-span-full flex-wrap">
                {docs.profileUrl && (
                  <a
                    href={String(docs.profileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline text-xs"
                  >
                    Profile image
                  </a>
                )}
                {docs.coverUrl && (
                  <a
                    href={String(docs.coverUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline text-xs"
                  >
                    Cover image
                  </a>
                )}
              </div>
            )}
          </div>

          {app.description && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                Description
              </p>
              <p className="text-xs text-foreground leading-relaxed">{app.description}</p>
            </div>
          )}

          {app.reviewed_at && (
            <p className="text-[10px] text-muted-foreground">
              Reviewed {new Date(app.reviewed_at).toLocaleString()}
            </p>
          )}

          {/* Reviewer notes */}
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
              Reviewer Notes
            </p>
            <textarea
              className="w-full min-h-[60px] rounded-md border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Add internal notes… (auto-saves on blur)"
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={() => saveNotes(localNotes)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPartnerApplicationsPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [_refresh, setRefresh] = useState(0);

  const { data: applications = [], isLoading } = useQuery<PartnerApplication[]>({
    queryKey: ["admin-partner-applications"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("partner_applications")
        .select("*, profiles(full_name, avatar_url, email)")
        .order("submitted_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as PartnerApplication[];
    },
  });

  // Tab counts
  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    submitted: applications.filter((a) => a.status === "submitted").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  // Filter by tab
  const tabFiltered =
    activeTab === "all"
      ? applications
      : applications.filter((a) => a.status === activeTab);

  // Filter by search
  const q = search.trim().toLowerCase();
  const filtered = q
    ? tabFiltered.filter(
        (a) =>
          a.business_name.toLowerCase().includes(q) ||
          (a.contact_email ?? "").toLowerCase().includes(q) ||
          (a.profiles?.email ?? "").toLowerCase().includes(q) ||
          (a.profiles?.full_name ?? "").toLowerCase().includes(q) ||
          a.partner_kind.toLowerCase().includes(q)
      )
    : tabFiltered;

  return (
    <div className="container max-w-5xl py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Partner Applications</h1>
        <p className="text-sm text-muted-foreground">
          Review and approve or reject partner applications. {counts.pending + counts.submitted} awaiting review · {counts.all} total.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Pending", count: counts.pending, color: "text-amber-600" },
          { label: "Submitted", count: counts.submitted, color: "text-blue-600" },
          { label: "Approved", count: counts.approved, color: "text-emerald-600" },
          { label: "Rejected", count: counts.rejected, color: "text-red-600" },
        ].map(({ label, count, color }) => (
          <Card key={label}>
            <CardContent className="py-3 px-4">
              <p className={cn("text-2xl font-bold", color)}>{count}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tab pills */}
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {TABS.map(({ key, label }) => (
            <button type="button"
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                activeTab === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              {counts[key] > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full text-[10px] font-semibold px-1.5 min-w-[18px] h-[18px]",
                    activeTab === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  )}
                >
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business name, email…"
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Application list */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No applications match your search." : "No applications in this view."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                onAction={() => setRefresh((n) => n + 1)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
