import { STORE_CATEGORY_OPTIONS } from "@/config/groceryStores";
import { getStorePublicPath } from "@/lib/storeLink";
import AdminLayout from "@/components/admin/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Store, Plus, Edit, Trash2, Eye, Upload, Loader2, X, ChevronDown, ChevronUp, Mail, UserPlus, Link2, Copy, Check, Hotel, Search, AlertTriangle, MapPin, Image as ImageIcon, Phone, ArrowUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isLodgingStoreCategory } from "@/hooks/useOwnerStoreProfile";

const DAYS_OF_WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

type DaySchedule = { open: string; close: string; closed: boolean; is24h?: boolean };
type WeeklySchedule = Record<string, DaySchedule>;

const DEFAULT_SCHEDULE: WeeklySchedule = Object.fromEntries(
  DAYS_OF_WEEK.map(d => [d, { open: "8:00 AM", close: "5:00 PM", closed: false }])
);

const FOOD_CATEGORIES = ["restaurant", "food-market", "drink", "grocery", "supermarket"];
const ISSUE_FILTERS = [
  { key: "all", label: "All", icon: Store },
  { key: "no-owner", label: "No owner", icon: UserPlus },
  { key: "missing-media", label: "Missing media", icon: ImageIcon },
  { key: "needs-location", label: "Needs location", icon: MapPin },
  { key: "missing-phone", label: "Missing phone", icon: Phone },
  { key: "inactive", label: "Inactive", icon: AlertTriangle },
  { key: "lodging", label: "Lodging", icon: Hotel },
] as const;

type IssueFilter = typeof ISSUE_FILTERS[number]["key"];
type SortMode = "newest" | "name" | "missing-owner" | "category";
const STORE_FETCH_PAGE_SIZE = 1000;

function parseSchedule(hours: string): WeeklySchedule {
  try {
    const parsed = JSON.parse(hours);
    if (parsed && typeof parsed === "object" && parsed.mon) return parsed;
  } catch {}
  // Legacy "7:00 AM–10:00 PM" format → apply to all days
  const parts = hours?.split("–") || [];
  const open = parts[0]?.trim() || "8:00 AM";
  const close = parts[1]?.trim() || "5:00 PM";
  return Object.fromEntries(DAYS_OF_WEEK.map(d => [d, { open, close, closed: false }]));
}

const emptyStore = {
  name: "", slug: "", description: "", logo_url: "", banner_url: "",
  market: "KH", category: "grocery", address: "", phone: "", hours: JSON.stringify(DEFAULT_SCHEDULE),
  rating: 0, delivery_min: 30, is_active: true,
};

const PROTECTED_THIRD_PARTY_MEDIA_RE = /(^https?:\/\/)?([^/]+\.)?(booking\.com|bstatic\.com)\//i;
const BOOKING_PROFILE_THUMB_RE = /\/xdata\/images\/hotel\/square240\//i;

function mediaRefUrl(entry: unknown): string | null {
  if (!entry) return null;
  if (typeof entry === "string") return entry.trim() || null;
  if (typeof entry !== "object") return null;
  const ref = entry as Record<string, unknown>;
  const value = ref.url || ref.src || ref.public_url || ref.path || ref.file;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mediaUrls(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(mediaRefUrl).filter(Boolean) as string[];
  if (typeof value === "object") return Object.values(value).map(mediaRefUrl).filter(Boolean) as string[];
  const url = mediaRefUrl(value);
  return url ? [url] : [];
}

function usesBrokenThirdPartyProfileMedia(value: unknown) {
  return mediaUrls(value).some((url) => (
    PROTECTED_THIRD_PARTY_MEDIA_RE.test(url) &&
    BOOKING_PROFILE_THUMB_RE.test(url) &&
    !url.includes("?")
  ));
}

async function fetchAllAdminStores() {
  const countQuery = supabase
    .from("store_profiles")
    .select("id", { count: "exact", head: true });
  const firstPageQuery = supabase
    .from("store_profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, STORE_FETCH_PAGE_SIZE - 1);

  const [countResult, firstPageResult] = await Promise.all([countQuery, firstPageQuery]);
  if (countResult.error) throw countResult.error;
  if (firstPageResult.error) throw firstPageResult.error;

  const totalCount = countResult.count ?? firstPageResult.data?.length ?? 0;
  const stores = [...(firstPageResult.data || [])];

  for (let offset = STORE_FETCH_PAGE_SIZE; stores.length < totalCount; offset += STORE_FETCH_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("store_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + STORE_FETCH_PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;
    stores.push(...data);
    if (data.length < STORE_FETCH_PAGE_SIZE) break;
  }

  return stores;
}

function slugifyStoreName(value: string) {
  if (/https?:\/\//i.test(value) || /localhost|127\.0\.0\.1/i.test(value)) return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

export default function AdminStoresPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [form, setForm] = useState(emptyStore);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [ownerDialog, setOwnerDialog] = useState<{ storeId: string; storeName: string } | null>(null);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [assigningOwner, setAssigningOwner] = useState(false);
  const [inviteDialog, setInviteDialog] = useState<{ storeId: string; storeName: string; storeAccountId: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const storeDialogScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dialogOpen) return;
    window.requestAnimationFrame(() => {
      storeDialogScrollRef.current?.scrollTo({ top: 0 });
    });
  }, [dialogOpen, editingStore]);

  const uploadStoreImage = async (file: File, type: "logo" | "banner") => {
    const isLogo = type === "logo";
    isLogo ? setUploadingLogo(true) : setUploadingBanner(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `temp/${type}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("store-assets")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(path);
      updateField(isLogo ? "logo_url" : "banner_url", urlData.publicUrl);
      toast.success(`${isLogo ? "Logo" : "Banner"} uploaded`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      isLogo ? setUploadingLogo(false) : setUploadingBanner(false);
    }
  };

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: fetchAllAdminStores,
  });

  const getStoreAccountId = (id: string) => `CBD${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

  const hasMissingMediaIssue = (store: any) => {
    return !mediaRefUrl(store.logo_url) || usesBrokenThirdPartyProfileMedia(store.logo_url);
  };

  const getIssues = (store: any) => {
    const issues: string[] = [];
    if (!store.owner_id) issues.push("no-owner");
    if (hasMissingMediaIssue(store)) issues.push("missing-media");
    if (!store.address || typeof store.latitude !== "number" || typeof store.longitude !== "number") issues.push("needs-location");
    if (!store.phone) issues.push("missing-phone");
    if (!store.is_active) issues.push("inactive");
    if (isLodgingStoreCategory(store.category)) issues.push("lodging");
    return issues;
  };

  const usedCategories = useMemo(
    () => STORE_CATEGORY_OPTIONS.filter(opt => stores.some((s: any) => s.category === opt.value)),
    [stores],
  );

  const stats = useMemo(() => {
    const needsSetup = stores.filter((s: any) => getIssues(s).some(issue => issue !== "lodging")).length;
    return {
      total: stores.length,
      active: stores.filter((s: any) => s.is_active).length,
      inactive: stores.filter((s: any) => !s.is_active).length,
      noOwner: stores.filter((s: any) => !s.owner_id).length,
      needsSetup,
      lodging: stores.filter((s: any) => isLodgingStoreCategory(s.category)).length,
    };
  }, [stores]);

  const filteredStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const next = stores.filter((s: any) => {
      if (activeCategory !== "all" && s.category !== activeCategory) return false;
      const issues = getIssues(s);
      if (issueFilter !== "all" && !issues.includes(issueFilter)) return false;
      if (!q) return true;
      const categoryLabel = STORE_CATEGORY_OPTIONS.find(o => o.value === s.category)?.label || s.category || "";
      const haystack = [
        s.name,
        s.slug,
        s.id,
        getStoreAccountId(s.id),
        s.market,
        s.address,
        s.phone,
        s.owner_id,
        categoryLabel,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });

    return [...next].sort((a: any, b: any) => {
      if (sortMode === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortMode === "category") return (a.category || "").localeCompare(b.category || "") || (a.name || "").localeCompare(b.name || "");
      if (sortMode === "missing-owner") return Number(!!a.owner_id) - Number(!!b.owner_id) || (a.name || "").localeCompare(b.name || "");
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [stores, activeCategory, issueFilter, searchQuery, sortMode]);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const { id, ...rest } = values as any;
      if (id) {
        const { error } = await supabase.from("store_profiles").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_profiles").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      setDialogOpen(false);
      toast.success(editingStore ? "Store updated" : "Store added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      setDeleteConfirm(null);
      toast.success("Store deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => {
    setEditingStore(null);
    setForm(emptyStore);
    setDialogOpen(true);
  };

  const openEdit = (store: any) => {
    setEditingStore(store);
    setForm({
      name: store.name || "",
      slug: store.slug || "",
      description: store.description || "",
      logo_url: store.logo_url || "",
      banner_url: store.banner_url || "",
      market: store.market || "KH",
      category: store.category || "grocery",
      address: store.address || "",
      phone: store.phone || "",
      hours: store.hours || JSON.stringify(DEFAULT_SCHEDULE),
      rating: store.rating || 0,
      delivery_min: store.delivery_min || 30,
      is_active: store.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const cleanSlug = slugifyStoreName(form.slug);
    const urlLikeName = /https?:\/\//i.test(form.name) || /localhost|127\.0\.0\.1/i.test(form.name);
    if (urlLikeName) {
      toast.error("Store name cannot be a URL");
      return;
    }
    if (!form.name.trim() || !cleanSlug) {
      toast.error("Name and slug are required");
      return;
    }
    const trimmedName = form.name.trim().toLowerCase();
    const duplicate = stores.find(
      (s: any) => s.name?.trim().toLowerCase() === trimmedName && s.id !== editingStore?.id
    );
    if (duplicate) {
      toast.error(`A store named "${duplicate.name}" already exists. Please use a unique name.`);
      return;
    }
    saveMutation.mutate(editingStore ? { ...form, slug: cleanSlug, id: editingStore.id } : { ...form, slug: cleanSlug });
  };

  const updateField = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleAssignOwner = async () => {
    if (!ownerDialog) return;

    const rawEmail = ownerEmail.trim();
    const normalizedEmail = rawEmail.toLowerCase();
    if (!normalizedEmail) return;

    setAssigningOwner(true);
    try {
      let profileData: { id: string | null; user_id: string | null } | null = null;

      for (const email of Array.from(new Set([normalizedEmail, rawEmail]))) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, user_id")
          .eq("email", email)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          profileData = data;
          break;
        }
      }

      const targetUserId = profileData?.user_id || profileData?.id;
      if (!targetUserId) {
        toast.error("No user account found with this email. They need to sign up first.");
        return;
      }

      const { error: updateError } = await supabase
        .from("store_profiles")
        .update({ owner_id: targetUserId })
        .eq("id", ownerDialog.storeId);

      if (updateError) throw updateError;

      // Send invite email with store login link
      const storeAccountId = getStoreAccountId(ownerDialog.storeId);
      const loginUrl = `https://hizivo.com/partner-login?store_id=${storeAccountId}`;
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "partner-store-invite",
            recipientEmail: normalizedEmail,
            idempotencyKey: `partner-invite-${ownerDialog.storeId}-${targetUserId}`,
            templateData: {
              storeName: ownerDialog.storeName,
              storeAccountId,
              loginUrl,
              supportUrl: "https://hizivo.com/help",
            },
          },
        });
      } catch (emailErr) {
        console.error("Failed to send invite email:", emailErr);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      toast.success(`Store "${ownerDialog.storeName}" linked to ${normalizedEmail} — invite email sent!`);
      setOwnerDialog(null);
      setOwnerEmail("");
    } catch (e: any) {
      toast.error(e.message || "Failed to assign owner");
    } finally {
      setAssigningOwner(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!inviteDialog) return;
    const link = `https://hizivo.com/partner-login?store_id=${inviteDialog.storeAccountId}`;
    navigator.clipboard.writeText(link);
    setInviteCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setInviteCopied(false), 2000);
  };

  return (
    <AdminLayout title="Store Accounts">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Store Accounts</h2>
            <p className="text-muted-foreground">Manage store profiles and product catalogs</p>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Add Store
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Store className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Stores</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <UserPlus className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm text-muted-foreground">No Owner</p>
                  <p className="text-2xl font-bold">{stats.noOwner}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Needs Setup</p>
                  <p className="text-2xl font-bold">{stats.needsSetup}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="sticky top-0 z-20 space-y-3 rounded-3xl border border-border bg-background/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search name, slug, ID, owner, phone, city..."
                className="h-11 rounded-2xl bg-background pl-9 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <select
                value={sortMode}
                onChange={e => setSortMode(e.target.value as SortMode)}
                className="h-11 rounded-2xl border border-input bg-background px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Sort stores"
              >
                <option value="newest">Newest first</option>
                <option value="name">A-Z</option>
                <option value="missing-owner">No owner first</option>
                <option value="category">Category</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant={activeCategory === "all" ? "default" : "outline"}
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 rounded-full px-4 ${
                activeCategory === "all"
                  ? "text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All Categories
            </Button>
            {usedCategories.map(cat => (
              <Button
                key={cat.value}
                size="sm"
                variant={activeCategory === cat.value ? "default" : "outline"}
                onClick={() => setActiveCategory(cat.value)}
                className={`shrink-0 rounded-full px-4 ${
                  activeCategory === cat.value
                    ? "text-primary-foreground"
                    : "bg-background text-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {ISSUE_FILTERS.map(filter => {
              const Icon = filter.icon;
              const active = issueFilter === filter.key;
              return (
                <Button
                  key={filter.key}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => setIssueFilter(filter.key)}
                  className={`shrink-0 rounded-full px-3 ${
                    active
                      ? "text-primary-foreground"
                      : "bg-background text-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="mr-1.5 h-3.5 w-3.5" />
                  {filter.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Store List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {activeCategory === "all" ? "All Stores" : STORE_CATEGORY_OPTIONS.find(o => o.value === activeCategory)?.label || activeCategory}
              <span className="ml-2 text-sm font-normal text-muted-foreground">({filteredStores.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading stores...</p>
            ) : filteredStores.length === 0 ? (
              <div className="py-10 text-center">
                <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="font-semibold text-foreground">No stores match these filters</p>
                <p className="mt-1 text-sm text-muted-foreground">Try a different search, category, or issue filter.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredStores.map((store: any) => {
                  const isLodging = isLodgingStoreCategory(store.category);
                  const issues = getIssues(store).filter(issue => issue !== "lodging");
                  return (
                  <div key={store.id} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Store className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{store.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{store.market} · {STORE_CATEGORY_OPTIONS.find(o => o.value === store.category)?.label || store.category} · /{store.slug}</p>
                        <p className="font-mono text-xs text-muted-foreground">ID: {getStoreAccountId(store.id)}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {store.owner_id ? (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                              <Check className="mr-1 h-3 w-3" /> Owner linked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              No owner assigned
                            </Badge>
                          )}
                          {hasMissingMediaIssue(store) ? (
                            <Badge variant="outline" title="Missing or broken profile media" className="border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                              Missing media
                            </Badge>
                          ) : null}
                          {!store.address || typeof store.latitude !== "number" || typeof store.longitude !== "number" ? (
                            <Badge variant="outline" className="border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                              Needs location
                            </Badge>
                          ) : null}
                          {!store.phone ? (
                            <Badge variant="outline" className="border-zinc-300 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                              Missing phone
                            </Badge>
                          ) : null}
                          {isLodging && <Badge variant="secondary" className="gap-1 text-[10px]"><Hotel className="h-3 w-3" /> Hotel Admin Ready</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Badge variant={store.is_active ? "default" : "secondary"}>
                        {store.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {issues.length > 0 && (
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/5 text-destructive">
                          {issues.length} setup issue{issues.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                      <Button size="sm" variant="outline" title="Assign Owner Email" aria-label={`Assign owner for ${store.name}`} onClick={() => { setOwnerDialog({ storeId: store.id, storeName: store.name }); setOwnerEmail(""); }} className="gap-1.5">
                        <Mail className="h-4 w-4" />
                        <span className="hidden xl:inline">Owner</span>
                      </Button>
                      <Button size="sm" variant="outline" title="Invite Partner" aria-label={`Invite partner for ${store.name}`} onClick={() => { setInviteDialog({ storeId: store.id, storeName: store.name, storeAccountId: getStoreAccountId(store.id) }); setInviteEmail(""); setInviteCopied(false); }} className="gap-1.5">
                        <UserPlus className="h-4 w-4" />
                        <span className="hidden xl:inline">Invite</span>
                      </Button>
                      <Button size="sm" variant="outline" title="Edit Store" aria-label={`Edit ${store.name}`} onClick={() => navigate(`/admin/stores/${store.id}`)} className="gap-1.5">
                        <Edit className="h-4 w-4" />
                        <span className="hidden xl:inline">Edit</span>
                      </Button>
                      {isLodging && (
                        <Button size="sm" onClick={() => navigate(`/admin/stores/${store.id}?tab=lodge-overview`)} className="gap-1.5">
                          <Hotel className="h-4 w-4" /> Operations
                        </Button>
                      )}
                      <Button size="sm" variant="outline" title="View Public Store" aria-label={`View public page for ${store.name}`} onClick={() => navigate(getStorePublicPath(store))} className="gap-1.5">
                        <Eye className="h-4 w-4" />
                        <span className="hidden xl:inline">View</span>
                      </Button>
                      <Button size="sm" variant="outline" title="Delete Store" aria-label={`Delete ${store.name}`} className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(store.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );})}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 [&>button.absolute]:z-20 [&>button.absolute]:text-foreground [&>button.absolute]:opacity-100">
          <DialogHeader className="shrink-0 border-b border-border bg-background/95 px-6 pb-4 pt-6 pr-14">
            <DialogTitle className="text-xl font-bold leading-tight text-foreground">
              {editingStore ? "Edit Store" : "Add New Store"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Add the public profile, media, category, and weekly hours for this store.
            </p>
          </DialogHeader>
          <div ref={storeDialogScrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => {
                  const name = e.target.value;
                  updateField("name", name);
                  if (!editingStore) {
                    updateField("slug", slugifyStoreName(name));
                  }
                }} placeholder="Store name" className="bg-background text-foreground placeholder:text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={e => updateField("slug", slugifyStoreName(e.target.value))} placeholder="store-slug" className="bg-background font-mono text-sm text-foreground placeholder:text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => updateField("description", e.target.value)} placeholder="Store description" rows={3} className="bg-background text-foreground placeholder:text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Logo</Label>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadStoreImage(f, "logo"); e.target.value = ""; }} />
                {form.logo_url ? (
                  <div className="relative w-20 h-20 rounded-xl border border-border overflow-hidden group">
                    <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button type="button" onClick={() => logoInputRef.current?.click()} className="h-6 w-6 rounded-full bg-background/80 flex items-center justify-center"><Upload className="h-3 w-3" /></button>
                      <button type="button" onClick={() => updateField("logo_url", "")} className="h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><X className="h-3 w-3" /></button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="h-24 w-24 rounded-xl border-2 border-dashed border-border bg-muted/25 hover:border-primary/40 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                    {uploadingLogo ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-5 w-5" /><span className="text-[10px]">Upload</span></>}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <Label>Banner</Label>
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadStoreImage(f, "banner"); e.target.value = ""; }} />
                {form.banner_url ? (
                  <div className="relative w-full h-20 rounded-xl border border-border overflow-hidden group">
                    <img src={form.banner_url} alt="Banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button type="button" onClick={() => bannerInputRef.current?.click()} className="h-6 w-6 rounded-full bg-background/80 flex items-center justify-center"><Upload className="h-3 w-3" /></button>
                      <button type="button" onClick={() => updateField("banner_url", "")} className="h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><X className="h-3 w-3" /></button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner} className="w-full h-24 rounded-xl border-2 border-dashed border-border bg-muted/25 hover:border-primary/40 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                    {uploadingBanner ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-5 w-5" /><span className="text-[10px]">Upload</span></>}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Market</Label>
                <select
                  value={form.market}
                  onChange={e => updateField("market", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {[
                    { code: "KH", label: "🇰🇭 Cambodia (KH)" },
                    { code: "US", label: "🇺🇸 United States (US)" },
                    { code: "VN", label: "🇻🇳 Vietnam (VN)" },
                    { code: "TH", label: "🇹🇭 Thailand (TH)" },
                    { code: "CN", label: "🇨🇳 China (CN)" },
                    { code: "KR", label: "🇰🇷 South Korea (KR)" },
                    { code: "JP", label: "🇯🇵 Japan (JP)" },
                    { code: "IN", label: "🇮🇳 India (IN)" },
                    { code: "GB", label: "🇬🇧 United Kingdom (GB)" },
                    { code: "AU", label: "🇦🇺 Australia (AU)" },
                    { code: "SG", label: "🇸🇬 Singapore (SG)" },
                    { code: "MY", label: "🇲🇾 Malaysia (MY)" },
                    { code: "PH", label: "🇵🇭 Philippines (PH)" },
                    { code: "ID", label: "🇮🇩 Indonesia (ID)" },
                    { code: "LA", label: "🇱🇦 Laos (LA)" },
                    { code: "MM", label: "🇲🇲 Myanmar (MM)" },
                  ].map(m => (
                    <option key={m.code} value={m.code}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  value={form.category}
                  onChange={e => updateField("category", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {Array.from(new Set(STORE_CATEGORY_OPTIONS.map(o => o.group || "Other"))).map(group => (
                    <optgroup key={group} label={group}>
                      {STORE_CATEGORY_OPTIONS.filter(o => (o.group || "Other") === group).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => updateField("address", e.target.value)} placeholder="Store address" className="bg-background text-foreground placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <div className="flex gap-1">
                <span className="flex h-10 items-center rounded-md border border-input bg-muted px-2 text-sm text-muted-foreground whitespace-nowrap">
                  {{ KH: "+855", US: "+1", VN: "+84", TH: "+66", CN: "+86", KR: "+82", JP: "+81", IN: "+91", GB: "+44", AU: "+61", SG: "+65", MY: "+60", PH: "+63", ID: "+62", LA: "+856", MM: "+95" }[form.market] || "+855"}
                </span>
                <Input value={form.phone} onChange={e => updateField("phone", e.target.value)} placeholder="23 900 888" className="flex-1 bg-background text-foreground placeholder:text-muted-foreground" />
              </div>
            </div>

            {/* Weekly Hours Schedule */}
            <div className="space-y-2">
              <Label>Operating Hours</Label>
              <div className="rounded-xl border border-border bg-muted/20">
                {(() => {
                  const schedule = parseSchedule(form.hours);
                  const timeOptions = Array.from({ length: 48 }, (_, i) => {
                    const h = Math.floor(i / 2);
                    const m = i % 2 === 0 ? "00" : "30";
                    const ampm = h < 12 ? "AM" : "PM";
                    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return `${h12}:${m} ${ampm}`;
                  });
                  const updateDay = (day: string, field: string, value: any) => {
                    const updated = { ...schedule, [day]: { ...schedule[day], [field]: value } };
                    updateField("hours", JSON.stringify(updated));
                  };
                  const toggle24h = (day: string, on: boolean) => {
                    const updated = {
                      ...schedule,
                      [day]: on
                        ? { open: "12:00 AM", close: "11:30 PM", closed: false, is24h: true }
                        : { ...schedule[day], is24h: false, closed: false },
                    };
                    updateField("hours", JSON.stringify(updated));
                  };
                  const toggleClosed = (day: string, isOpen: boolean) => {
                    // Mutually exclusive with 24h: toggling Closed on clears is24h
                    const updated = {
                      ...schedule,
                      [day]: { ...schedule[day], closed: !isOpen, ...(isOpen ? {} : { is24h: false }) },
                    };
                    updateField("hours", JSON.stringify(updated));
                  };
                  return DAYS_OF_WEEK.map((day, idx) => (
                    <div key={day} className={`grid grid-cols-[4.5rem_auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 ${idx > 0 ? "border-t border-border" : ""} ${schedule[day]?.closed ? "bg-muted/50" : "bg-background/60"}`}>
                      <div className="flex-shrink-0">
                        <span className="text-xs font-semibold text-foreground">{DAY_LABELS[day].slice(0, 3)}</span>
                      </div>
                      <label className="flex items-center gap-1.5">
                        <Switch
                          checked={!schedule[day]?.closed}
                          onCheckedChange={(open) => toggleClosed(day, open)}
                          className="scale-75"
                        />
                        <span className="text-[10px] font-medium text-muted-foreground">Open</span>
                      </label>
                      {schedule[day]?.closed ? (
                        <span className="text-xs text-muted-foreground italic flex-1">Closed</span>
                      ) : schedule[day]?.is24h ? (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs font-semibold text-primary">Open 24 hours</span>
                          <div className="flex items-center gap-1 opacity-50 cursor-not-allowed pointer-events-none">
                            <select disabled value="12:00 AM" className="flex h-8 rounded-md border border-input bg-background px-1.5 text-xs text-foreground">
                              <option>12:00 AM</option>
                            </select>
                            <span className="text-xs text-muted-foreground">to</span>
                            <select disabled value="11:30 PM" className="flex h-8 rounded-md border border-input bg-background px-1.5 text-xs text-foreground">
                              <option>11:30 PM</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 flex-1">
                          <select
                            value={schedule[day]?.open || "8:00 AM"}
                            onChange={e => updateDay(day, "open", e.target.value)}
                            className="flex h-8 rounded-md border border-input bg-background px-1.5 text-xs text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span className="text-xs text-muted-foreground">to</span>
                          <select
                            value={schedule[day]?.close || "5:00 PM"}
                            onChange={e => updateDay(day, "close", e.target.value)}
                            className="flex h-8 rounded-md border border-input bg-background px-1.5 text-xs text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      )}
                      {!schedule[day]?.closed && (
                        <label className="flex items-center gap-1 ml-1 cursor-pointer rounded-full bg-muted px-2 py-1">
                          <Switch
                            checked={!!schedule[day]?.is24h}
                            onCheckedChange={(on) => toggle24h(day, on)}
                            className="scale-75"
                          />
                          <span className="text-[10px] font-semibold text-muted-foreground">24h</span>
                        </label>
                      )}
                    </div>
                  ));
                })()}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Toggle <strong>24h</strong> for always-open days. Toggle <strong>Closed</strong> to mark a day off.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rating</Label>
                <Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => updateField("rating", parseFloat(e.target.value) || 0)} />
              </div>
              {FOOD_CATEGORIES.includes(form.category) && (
                <div className="space-y-2">
                  <Label>Delivery Time (minutes)</Label>
                  <Input type="number" value={form.delivery_min} onChange={e => updateField("delivery_min", parseInt(e.target.value) || 0)} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => updateField("is_active", v)} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border bg-background/95 px-6 py-4">
            <Button variant="outline" className="min-w-24 text-foreground" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="min-w-24" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingStore ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Store</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to delete this store? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Owner Dialog */}
      <Dialog open={!!ownerDialog} onOpenChange={() => setOwnerDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Owner to "{ownerDialog?.storeName}"</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Enter the partner's email address. They must have a ZIVO account already.</p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Owner Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="partner@business.com"
                  value={ownerEmail}
                  onChange={e => setOwnerEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOwnerDialog(null)}>Cancel</Button>
            <Button onClick={handleAssignOwner} disabled={assigningOwner || !ownerEmail.trim()} className="gap-2">
              {assigningOwner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {assigningOwner ? "Linking..." : "Link Owner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Partner Dialog */}
      <Dialog open={!!inviteDialog} onOpenChange={() => setInviteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Partner to "{inviteDialog?.storeName}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Store Account ID</p>
              <p className="font-mono font-bold text-foreground">{inviteDialog?.storeAccountId}</p>
            </div>
            <div className="space-y-2">
              <Label>Partner Login Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteDialog ? `https://hizivo.com/partner-login?store_id=${inviteDialog.storeAccountId}` : ""}
                  className="text-xs font-mono"
                />
                <Button size="sm" variant="outline" onClick={handleCopyInviteLink} className="shrink-0 gap-1.5">
                  {inviteCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  {inviteCopied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Share this link with the partner. They can sign in or create an account using this link.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
