/**
 * AccountExportPage — Granular data export with format selection.
 * Lets users pick which data categories to include and which format
 * (JSON or CSV ZIP). Counts each category live before export.
 */
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import {
  ArrowLeft, Download, FileText, Image, MessageCircle, Loader2, CheckCircle2,
  Heart, Users, MapPin, Plane, Bookmark, Bell, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ExportCategory {
  id: string;
  label: string;
  desc: string;
  icon: typeof FileText;
  fetch: (userId: string) => Promise<any[]>;
  countQuery?: (userId: string) => Promise<number>;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function objectsToCsv(rows: any[]): string {
  if (!rows || rows.length === 0) return "";
  const keySet = new Set<string>();
  for (const row of rows) Object.keys(row || {}).forEach((k) => keySet.add(k));
  const keys = Array.from(keySet);
  const lines = [keys.join(",")];
  for (const row of rows) {
    const vals = keys.map((k) => {
      const v = row?.[k];
      if (v === null || v === undefined) return "";
      if (typeof v === "object") return csvEscape(JSON.stringify(v));
      return csvEscape(String(v));
    });
    lines.push(vals.join(","));
  }
  return lines.join("\n");
}

const buildCategories = (): ExportCategory[] => [
  {
    id: "profile",
    label: "Profile Information",
    desc: "Name, bio, settings, social links",
    icon: FileText,
    fetch: async () => {
      const { data } = await supabase.rpc("get_my_profile").single();
      return data ? [data] : [];
    },
  },
  {
    id: "posts",
    label: "Posts & Media",
    desc: "Photos, reels, captions, video metadata",
    icon: Image,
    fetch: async (uid) => {
      const { data } = await (supabase as any).from("user_posts").select("*").eq("user_id", uid);
      return data || [];
    },
    countQuery: async (uid) => {
      const { count } = await (supabase as any)
        .from("user_posts").select("*", { count: "exact", head: true }).eq("user_id", uid);
      return count || 0;
    },
  },
  {
    id: "messages",
    label: "Messages",
    desc: "Chat history (up to 500 most recent)",
    icon: MessageCircle,
    fetch: async (uid) => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  },
  {
    id: "follows",
    label: "Followers & Following",
    desc: "Your social graph connections",
    icon: Users,
    fetch: async (uid) => {
      const [{ data: followers }, { data: following }] = await Promise.all([
        (supabase as any).from("follows").select("*").eq("following_id", uid),
        (supabase as any).from("follows").select("*").eq("follower_id", uid),
      ]);
      return [
        ...(followers || []).map((r: any) => ({ ...r, _direction: "follower" })),
        ...(following || []).map((r: any) => ({ ...r, _direction: "following" })),
      ];
    },
    countQuery: async (uid) => {
      const [{ count: a }, { count: b }] = await Promise.all([
        (supabase as any).from("follows").select("*", { count: "exact", head: true }).eq("following_id", uid),
        (supabase as any).from("follows").select("*", { count: "exact", head: true }).eq("follower_id", uid),
      ]);
      return (a || 0) + (b || 0);
    },
  },
  {
    id: "favorites",
    label: "Favorites",
    desc: "Saved restaurants, hotels, items",
    icon: Heart,
    fetch: async (uid) => {
      const { data } = await (supabase as any).from("favorites").select("*").eq("user_id", uid);
      return data || [];
    },
    countQuery: async (uid) => {
      const { count } = await (supabase as any)
        .from("favorites").select("*", { count: "exact", head: true }).eq("user_id", uid);
      return count || 0;
    },
  },
  {
    id: "addresses",
    label: "Saved Addresses",
    desc: "Delivery & saved locations",
    icon: MapPin,
    fetch: async (uid) => {
      const { data } = await (supabase as any).from("saved_locations").select("*").eq("user_id", uid);
      return data || [];
    },
    countQuery: async (uid) => {
      const { count } = await (supabase as any)
        .from("saved_locations").select("*", { count: "exact", head: true }).eq("user_id", uid);
      return count || 0;
    },
  },
  {
    id: "travelers",
    label: "Traveler Profiles",
    desc: "Passenger info & passport details",
    icon: Plane,
    fetch: async (uid) => {
      const { data } = await (supabase as any).from("traveler_profiles").select("*").eq("user_id", uid);
      return data || [];
    },
  },
  {
    id: "bookmarks",
    label: "Bookmarks",
    desc: "Saved posts and content",
    icon: Bookmark,
    fetch: async (uid) => {
      const { data } = await (supabase as any).from("post_bookmarks").select("*").eq("user_id", uid);
      return data || [];
    },
  },
  {
    id: "notifications",
    label: "Notification History",
    desc: "Past notifications you've received",
    icon: Bell,
    fetch: async (uid) => {
      const { data } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  },
  {
    id: "activity",
    label: "Activity Log",
    desc: "Login history & account changes",
    icon: Activity,
    fetch: async (uid) => {
      const { data } = await (supabase as any)
        .from("account_activity_log")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1000);
      return data || [];
    },
  },
];

export default function AccountExportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const categories = useMemo(buildCategories, []);

  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of categories) init[c.id] = true;
    return init;
  });
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [exported, setExported] = useState(false);

  // Live counts (only categories that expose a count query)
  const { data: counts = {} } = useQuery({
    queryKey: ["export-counts", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const out: Record<string, number> = {};
      await Promise.all(
        categories.map(async (c) => {
          if (!c.countQuery) return;
          try {
            out[c.id] = await c.countQuery(user.id);
          } catch {
            // skip on error
          }
        })
      );
      return out;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const toggleAll = (val: boolean) => {
    const next: Record<string, boolean> = {};
    for (const c of categories) next[c.id] = val;
    setSelected(next);
  };

  const handleExport = async () => {
    if (!user) return;
    if (selectedCount === 0) {
      toast.error("Select at least one category");
      return;
    }
    setExporting(true);
    setExported(false);
    try {
      const collected: Record<string, any[]> = {};
      for (const c of categories) {
        if (!selected[c.id]) continue;
        setProgress(`Fetching ${c.label}…`);
        try {
          collected[c.id] = await c.fetch(user.id);
        } catch (e: any) {
          collected[c.id] = [{ _error: e?.message || "Failed to load" }];
        }
      }

      const stamp = new Date().toISOString().slice(0, 10);

      if (format === "json") {
        const payload = {
          exported_at: new Date().toISOString(),
          user_id: user.id,
          email: user.email,
          categories: collected,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `zivo-data-${stamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // CSV: emit one CSV file per category, concatenated with section headers
        const sections: string[] = [];
        sections.push(`# ZIVO Data Export — ${new Date().toISOString()}`);
        sections.push(`# User: ${user.email} (${user.id})`);
        sections.push("");
        for (const c of categories) {
          if (!selected[c.id]) continue;
          const rows = collected[c.id] || [];
          sections.push(`## ${c.label} (${rows.length} record${rows.length === 1 ? "" : "s"})`);
          if (rows.length > 0) sections.push(objectsToCsv(rows));
          sections.push("");
        }
        const blob = new Blob([sections.join("\n")], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `zivo-data-${stamp}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setExported(true);
      toast.success(`Exported ${selectedCount} categor${selectedCount === 1 ? "y" : "ies"}`);
    } catch (err: any) {
      toast.error(err?.message || "Export failed");
    } finally {
      setExporting(false);
      setProgress("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Export Data – ZIVO" description="Download all your personal data in JSON or CSV format. Select which categories to include: messages, posts, bookmarks, notifications, activity log, and more." />
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" aria-label="Back" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Export Data</h1>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Hero */}
        <div className="text-center py-2">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-3">
            <Download className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Download your data</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Get a portable copy of your information in your chosen format. Right under GDPR & CCPA.
          </p>
        </div>

        {/* Server-side audited export — calls the `account-export` edge fn
            which uses the service role to bundle data the user can't read
            directly via RLS, and writes an audit log row for compliance. */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Download className="h-4 w-4 text-primary" />
            Authoritative export (server-side)
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            One JSON bundle of every table that holds your data, generated server-side with full
            scope and recorded in the compliance audit log. Requires re-confirming your identity
            (TOTP) for security.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                const { data, error } = await (supabase as any).functions.invoke("account-export");
                if (error) throw error;
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const stamp = new Date().toISOString().slice(0, 10);
                a.download = `zivo-account-export-${stamp}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                toast.success("Server-side export downloaded.");
              } catch (e: any) {
                const msg = e?.message || "Export failed";
                toast.error(
                  msg.includes("aal2") || msg.includes("AAL2")
                    ? "Re-authenticate with TOTP, then try again."
                    : msg
                );
              }
            }}
            className="w-full mt-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-transform"
          >
            Download authoritative bundle
          </button>
        </div>

        {/* Format selector */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Format</p>
          <div className="grid grid-cols-2 gap-2">
            {(["json", "csv"] as const).map((f) => (
              <button type="button"
                key={f}
                onClick={() => setFormat(f)}
                className={`flex flex-col items-start p-3 rounded-xl border transition-all active:scale-[0.98] text-left ${
                  format === f
                    ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                    : "bg-card border-border/40 hover:bg-accent/40"
                }`}
              >
                <p className="text-sm font-semibold">{f.toUpperCase()}</p>
                <p className="text-[11px] text-muted-foreground">
                  {f === "json" ? "Single file, all categories" : "One section per category"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <div className="flex items-baseline justify-between px-1 mb-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Categories ({selectedCount}/{categories.length} selected)
            </p>
            <div className="flex gap-2 text-[11px]">
              <button type="button" onClick={() => toggleAll(true)} className="text-primary hover:underline">All</button>
              <span className="text-muted-foreground/40">·</span>
              <button type="button" onClick={() => toggleAll(false)} className="text-primary hover:underline">None</button>
            </div>
          </div>
          <div className="space-y-1.5">
            {categories.map((c) => {
              const checked = !!selected[c.id];
              const count = counts[c.id];
              const Icon = c.icon;
              return (
                <button type="button"
                  key={c.id}
                  onClick={() => setSelected((s) => ({ ...s, [c.id]: !s[c.id] }))}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left active:scale-[0.99] ${
                    checked ? "bg-card border-border/40" : "bg-muted/20 border-border/30 opacity-70"
                  }`}
                >
                  <div className="h-9 w-9 min-w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{c.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.desc}</p>
                  </div>
                  {typeof count === "number" && (
                    <span className="text-[10px] font-semibold text-muted-foreground tabular-nums shrink-0">
                      {count.toLocaleString()}
                    </span>
                  )}
                  <Checkbox checked={checked} onCheckedChange={(v) => setSelected((s) => ({ ...s, [c.id]: !!v }))} className="shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Action */}
        <div className="space-y-2">
          <Button
            onClick={handleExport}
            disabled={exporting || selectedCount === 0}
            className="w-full h-11 rounded-xl"
          >
            {exporting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {progress || "Preparing…"}</>
            ) : exported ? (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Export again</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Download {format.toUpperCase()}</>
            )}
          </Button>
          {exported && !exporting && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] text-emerald-500 text-center"
            >
              ✓ File downloaded. Check your downloads folder.
            </motion.p>
          )}
        </div>

        <div className="rounded-xl bg-muted/30 border border-border/30 p-3 space-y-1.5">
          <p className="text-[11px] font-semibold text-foreground">About your export</p>
          <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
            <li>Files are generated in your browser and downloaded directly — nothing is sent to a third party.</li>
            <li>Some categories cap at 500–1000 most recent records. Contact support for a full archive.</li>
            <li>Your data may be retained for legal compliance even after account deletion.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
